import { useState, useEffect, useCallback } from "react"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import RefreshIcon from "@mui/icons-material/Refresh"
import ShieldIcon from "@mui/icons-material/Shield"
import LockIcon from "@mui/icons-material/Lock"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import PersonSearchIcon from "@mui/icons-material/PersonSearch"
import KeyIcon from "@mui/icons-material/Key"
import EditNoteIcon from "@mui/icons-material/EditNote"
import { apiRequest } from "../api/client"
import {
  loadOrGenerateKeypair,
  getStoredPublicKeyHex,
  decryptFinding,
} from "../utils/crypto"
import SuperSearchLearnMore from "./SuperSearchLearnMore"
import ProfileCompletion from "./ProfileCompletion"
import { useAuth } from "../context/AuthContext"

interface SearchResult {
  url: string
  payload_hash: string
  merkle_root: string
  ephemeral_public_key: string
  nonce: string
  ciphertext: string
}

interface SuperSearchResultItem {
  rank: number
  title: string
  url: string
  source_engines: string[]
  score: number
  payload_hash: string
  merkle_root: string
  ephemeral_public_key: string
  nonce: string
  ciphertext: string
}

interface SuperSearchResponse {
  search_id: string
  status: string
  query: string
  results: SuperSearchResultItem[]
  created_at: number
  completed_at: number | null
}

interface SearchQuery {
  id: string
  query: string
  urls: string[]
  recipient_pubkey: string
  status: string
  task_ids: string[]
  results: SearchResult[]
  failures: { url: string; error: string }[]
  created_at: number
  completed_at: number | null
}

interface Keyword {
  id: string
  keyword: string
  is_active: boolean
}

interface SearchPanelProps {
  hasActiveSub?: boolean
  trialUsed?: boolean
  searchesRemaining?: number
  onTrialExhausted?: () => void
}

type SearchMode = "profile" | "profile_keywords" | "custom"

const MODE_OPTIONS = [
  { value: "profile" as SearchMode, label: "Profile Search", icon: <PersonSearchIcon />, desc: "Search for your personal data across brokers & leaks" },
  { value: "profile_keywords" as SearchMode, label: "Profile + Keywords", icon: <KeyIcon />, desc: "Combine your profile with tracked keywords" },
  { value: "custom" as SearchMode, label: "Custom Query", icon: <EditNoteIcon />, desc: "Search for any term or phrase" },
]

export default function SearchPanel({ hasActiveSub = true, trialUsed = false, searchesRemaining: _searchesRemaining, onTrialExhausted }: SearchPanelProps) {
  const { user } = useAuth()
  const [searchMode, setSearchMode] = useState<SearchMode>("profile")
  const [customQuery, setCustomQuery] = useState("")
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [superSearch, setSuperSearch] = useState(false)
  const [pubKey, setPubKey] = useState("")
  const [searching, setSearching] = useState(false)
  const [currentSearch, setCurrentSearch] = useState<SearchQuery | null>(null)
  const [searchHistory, setSearchHistory] = useState<SearchQuery[]>([])
  const [decryptedResults, setDecryptedResults] = useState<Map<string, string>>(new Map())
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState("")
  const [keyReady, setKeyReady] = useState(false)
  const [learnMoreOpen, setLearnMoreOpen] = useState(false)
  const [superSearchLearnMoreOpen, setSuperSearchLearnMoreOpen] = useState(false)
  const [superSearchResults, setSuperSearchResults] = useState<SuperSearchResultItem[]>([])
  const [superDecryptedResults, setSuperDecryptedResults] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    loadOrGenerateKeypair()
      .then(({ publicKeyHex }) => { setPubKey(publicKeyHex); setKeyReady(true) })
      .catch((err) => { console.error("Keypair generation failed:", err); setError("Encryption key generation failed. Search requires a modern browser with WebCrypto support."); setKeyReady(true) })
  }, [])

  const loadKeywords = useCallback(async () => {
    const res = await apiRequest<Keyword[]>("cityhall", "GET", "/keywords")
    if (res.ok) setKeywords(res.data.filter((k) => k.is_active))
  }, [])

  const loadHistory = useCallback(async () => {
    const storedKey = getStoredPublicKeyHex()
    if (!storedKey) return
    const res = await apiRequest<{ searches: SearchQuery[] }>(
      "sp1d3r", "GET", "/v1/searches", undefined,
      { "X-Requester-Pubkey": storedKey }
    )
    if (res.ok) setSearchHistory(res.data.searches || [])
  }, [])

  useEffect(() => {
    if (keyReady) { loadHistory(); loadKeywords() }
  }, [keyReady, loadHistory, loadKeywords])

  const buildProfileQuery = (): string => {
    if (!user) return ""
    const parts: string[] = []
    parts.push(`${user.first_name} ${user.last_name}`)
    if (user.email) parts.push(user.email)
    if (user.phone) parts.push(user.phone)
    if (user.address_line1) parts.push(user.address_line1)
    if (user.city) parts.push(user.city)
    if (user.state) parts.push(user.state)
    if (user.zip_code) parts.push(user.zip_code)
    return parts.join(" OR ")
  }

  const buildProfileKeywordsQuery = (): string => {
    const profileQ = buildProfileQuery()
    const kwParts = keywords.map((k) => k.keyword)
    return [profileQ, ...kwParts].join(" OR ")
  }

  const getSearchQuery = (): string => {
    switch (searchMode) {
      case "profile": return buildProfileQuery()
      case "profile_keywords": return buildProfileKeywordsQuery()
      case "custom": return customQuery.trim()
    }
  }

  const handleSearch = async () => {
    const q = getSearchQuery()
    if (!q) return

    if (!pubKey) {
      setError("Encryption key not available. Search requires a modern browser with WebCrypto support.")
      return
    }

    if (!hasActiveSub && trialUsed) {
      setError("Trial exhausted. Please subscribe to continue searching.")
      onTrialExhausted?.()
      return
    }

    setSearching(true)
    setError("")
    setCurrentSearch(null)
    setDecryptedResults(new Map())
    setSuperSearchResults([])
    setSuperDecryptedResults(new Map())

    const token = localStorage.getItem("sp1d3r_token")

    if (superSearch) {
      const res = await apiRequest<SuperSearchResponse>("sp1d3r", "POST", "/v1/super_search", {
        query: q,
        recipient_pubkey: pubKey,
      }, token ? { "Authorization": `Bearer ${token}` } : undefined)

      if (res.ok) {
        setSuperSearchResults(res.data.results || [])
        if (res.data.results?.length > 0) await decryptSuperResults(res.data.results)
      } else if (res.status === 403) {
        const data = res.data as any
        setError(data?.redirect === "/paywall" ? "Super Search requires an active subscription." : (data?.error || "Search forbidden"))
      } else if (res.status === 401) {
        setError("Please sign in to search.")
      } else {
        setError("Search request failed")
      }
    } else {
      const res = await apiRequest<SearchQuery>("sp1d3r", "POST", "/v1/search", {
        query: q,
        urls: [q],
        recipient_pubkey: pubKey,
      }, token ? { "Authorization": `Bearer ${token}` } : undefined)

      if (res.ok) {
        setCurrentSearch(res.data)
        pollSearch(res.data.id)
      } else if (res.status === 403) {
        const data = res.data as any
        if (data?.redirect === "/paywall") {
          setError("Trial search limit reached. Redirecting to subscription page...")
          onTrialExhausted?.()
        } else {
          setError(data?.error || "Search request forbidden")
        }
      } else {
        setError("Search request failed")
      }
    }
    setSearching(false)
  }

  const pollSearch = async (searchId: string) => {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const res = await apiRequest<SearchQuery>(
        "sp1d3r", "GET", `/v1/search/${searchId}`, undefined,
        { "X-Requester-Pubkey": pubKey }
      )
      if (res.ok) {
        setCurrentSearch(res.data)
        if (res.data.status === "completed") {
          await decryptAllResults(res.data)
          loadHistory()
          return
        }
      }
    }
    setError("Search timed out")
  }

  const decryptAllResults = async (search: SearchQuery) => {
    if (!search.results.length) return
    setDecrypting(true)
    try {
      const { privateKey } = await loadOrGenerateKeypair()
      const decrypted = new Map<string, string>()
      for (const r of search.results) {
        try {
          decrypted.set(r.url, await decryptFinding(privateKey, r.ephemeral_public_key, r.nonce, r.ciphertext))
        } catch {
          decrypted.set(r.url, "[decryption failed]")
        }
      }
      setDecryptedResults(decrypted)
    } finally { setDecrypting(false) }
  }

  const decryptSuperResults = async (results: SuperSearchResultItem[]) => {
    setDecrypting(true)
    try {
      const { privateKey } = await loadOrGenerateKeypair()
      const decrypted = new Map<string, string>()
      for (const r of results) {
        try {
          decrypted.set(r.url, await decryptFinding(privateKey, r.ephemeral_public_key, r.nonce, r.ciphertext))
        } catch {
          decrypted.set(r.url, "[decryption failed]")
        }
      }
      setSuperDecryptedResults(decrypted)
    } finally { setDecrypting(false) }
  }

  const handleViewHistory = async (search: SearchQuery) => {
    setCurrentSearch(search)
    setDecryptedResults(new Map())
    setSuperSearchResults([])
    setSuperDecryptedResults(new Map())
    if (search.status === "completed" && search.results.length > 0) {
      await decryptAllResults(search)
    }
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)
  const truncate = (str: string, len: number) => str.length > len ? str.slice(0, len) + "..." : str

  return (
    <Container maxWidth="lg">
      <ProfileCompletion />

      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SearchIcon color="primary" />
            <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
              Encrypted Search
            </Typography>
            <Chip icon={<LockIcon />} label="E2E Encrypted" color="success" size="small" sx={{ ml: 1 }} />
            {superSearch && <Chip icon={<AutoAwesomeIcon />} label="Super" color="primary" size="small" />}
          </Box>
          {hasActiveSub && (
            <FormControlLabel
              control={
                <Switch
                  checked={superSearch}
                  onChange={(e) => { setSuperSearch(e.target.checked); setError("") }}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AutoAwesomeIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Super Search</Typography>
                  <Tooltip title="Learn more">
                    <IconButton size="small" onClick={() => setSuperSearchLearnMoreOpen(true)}>
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {superSearch
            ? "Query Google, Bing & DuckDuckGo simultaneously — results encrypted and combined."
            : "Powered by Sp1d3r — Decentralized Private Search Engine. Results are encrypted with your public key."}
          {" "}
          {!superSearch && (
            <Tooltip title="Learn more about Sp1d3r">
              <IconButton size="small" component="span" onClick={() => setLearnMoreOpen(true)} sx={{ p: 0, verticalAlign: "middle" }}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          {MODE_OPTIONS.map((m) => (
            <Chip
              key={m.value}
              icon={m.icon}
              label={m.label}
              onClick={() => { setSearchMode(m.value); setError("") }}
              color={searchMode === m.value ? "primary" : "default"}
              variant={searchMode === m.value ? "filled" : "outlined"}
              sx={{ cursor: "pointer" }}
            />
          ))}
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          {MODE_OPTIONS.find((m) => m.value === searchMode)?.desc}. Each search counts towards your account's search limit.
        </Alert>

        {searchMode === "custom" && (
          <TextField
            fullWidth
            label="Search Query"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="e.g. john.doe@gmail.com OR john doe data breach"
            onKeyDown={(e) => { if (e.key === "Enter" && !searching && getSearchQuery()) handleSearch() }}
          />
        )}

        {searchMode === "profile" && (
          <Box sx={{ mb: 2, p: 2, bgcolor: "action.hover", borderRadius: 1, border: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Profile query (auto-generated):</Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              {buildProfileQuery() || "Complete your profile to enable profile search."}
            </Typography>
          </Box>
        )}

        {searchMode === "profile_keywords" && (
          <Box sx={{ mb: 2, p: 2, bgcolor: "action.hover", borderRadius: 1, border: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Profile + Keywords query (auto-generated):</Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              {buildProfileKeywordsQuery() || "Complete your profile and add keywords to enable this search."}
            </Typography>
            {keywords.length > 0 && (
              <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {keywords.map((k) => <Chip key={k.id} size="small" label={k.keyword} variant="outlined" />)}
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={searching || !keyReady || !pubKey || !getSearchQuery()}
            startIcon={searching ? <CircularProgress size={16} /> : (superSearch ? <AutoAwesomeIcon /> : <SearchIcon />)}
          >
            {searching ? "Searching..." : (superSearch ? "Super Search" : "Start Search")}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>

      {(superSearch ? superSearchResults.length > 0 : currentSearch) && (
        <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
              {superSearch ? "Super Search Results" : "Search Results"}
            </Typography>
            <Chip
              icon={decrypting ? <CircularProgress size={12} /> : <CheckCircleIcon />}
              label={superSearch ? `${superSearchResults.length} results` : `${currentSearch?.results.length || 0} results`}
              color="success"
            />
          </Box>

          {decrypting && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Decrypting results...</Typography>
            </Box>
          )}

          {superSearch ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }}>#</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Engines</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Preview</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {superSearchResults.map((r) => (
                    <TableRow key={r.url}>
                      <TableCell><Chip size="small" label={r.rank} color="primary" variant="outlined" /></TableCell>
                      <TableCell sx={{ fontWeight: 700, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{truncate(r.title, 40)}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{truncate(r.url, 40)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {r.source_engines.map((eng) => <Chip key={eng} size="small" label={eng} variant="outlined" color="secondary" />)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{r.score}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {decrypting ? <CircularProgress size={12} /> : truncate(superDecryptedResults.get(r.url) || "[encrypted]", 40)}
                      </TableCell>
                      <TableCell>
                        {superDecryptedResults.get(r.url) && (
                          <Tooltip title="Copy decrypted content">
                            <IconButton size="small" onClick={() => copyToClipboard(superDecryptedResults.get(r.url) || "")}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : currentSearch && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Status: {currentSearch.status} | Results: {currentSearch.results.length} | Failures: {currentSearch.failures.length}
              </Typography>
              {currentSearch.status !== "completed" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Searching in progress...</Typography>
                </Box>
              )}
              {currentSearch.results.length > 0 && (
                <TableContainer sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>URL</TableCell>
                        <TableCell>Payload Hash</TableCell>
                        <TableCell>Content Preview</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentSearch.results.map((r) => (
                        <TableRow key={r.url}>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{truncate(r.url, 40)}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{truncate(r.payload_hash, 16)}...</TableCell>
                          <TableCell sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {decrypting ? <CircularProgress size={12} /> : truncate(decryptedResults.get(r.url) || "[encrypted]", 60)}
                          </TableCell>
                          <TableCell>
                            {decryptedResults.get(r.url) && (
                              <Tooltip title="Copy decrypted content">
                                <IconButton size="small" onClick={() => copyToClipboard(decryptedResults.get(r.url) || "")}>
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {currentSearch.failures.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>{currentSearch.failures.length} search target(s) failed</Alert>
              )}
            </>
          )}

          <Box sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Encrypted with public key:
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", wordBreak: "break-all", mt: 0.5 }}>
              {pubKey || "generating..."}
            </Typography>
          </Box>
        </Paper>
      )}

      {searchHistory.length > 0 && (
        <Paper sx={{ p: 3 }} variant="outlined">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: "monospace" }}>Search History</Typography>
            <Tooltip title="Refresh">
              <IconButton onClick={loadHistory} size="small"><RefreshIcon /></IconButton>
            </Tooltip>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Query</TableCell>
                  <TableCell>Results</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchHistory.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{truncate(s.query, 40)}</TableCell>
                    <TableCell>{s.results.length}</TableCell>
                    <TableCell>
                      <Chip size="small" label={s.status} color={s.status === "completed" ? "success" : "default"} />
                    </TableCell>
                    <TableCell>{new Date(s.created_at * 1000).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => handleViewHistory(s)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={learnMoreOpen} onClose={() => setLearnMoreOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: "monospace", fontWeight: 700 }}>About Sp1d3r</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Sp1d3r</strong> is the decentralized private search engine that powers D31337m3's encrypted search.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <LockIcon color="success" sx={{ mt: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>E2E Encryption</Typography>
                <Typography variant="body2" color="text.secondary">Results are encrypted with X25519 + AES-256-GCM. Only you can decrypt them.</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <ShieldIcon color="warning" sx={{ mt: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Zero Knowledge</Typography>
                <Typography variant="body2" color="text.secondary">The platform never sees your plaintext results.</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLearnMoreOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <SuperSearchLearnMore open={superSearchLearnMoreOpen} onClose={() => setSuperSearchLearnMoreOpen(false)} />
    </Container>
  )
}
