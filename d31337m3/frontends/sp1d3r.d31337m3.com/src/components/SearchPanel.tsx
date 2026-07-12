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
  Link,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import RefreshIcon from "@mui/icons-material/Refresh"
import LockIcon from "@mui/icons-material/Lock"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import HubIcon from "@mui/icons-material/Hub"
import SecurityIcon from "@mui/icons-material/Security"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import SpeedIcon from "@mui/icons-material/Speed"
import { apiRequest } from "../api/client"
import {
  loadOrGenerateKeypair,
  getStoredPublicKeyHex,
  decryptFinding,
} from "../utils/crypto"
import SuperSearchLearnMore from "./SuperSearchLearnMore"


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

interface SearchPanelProps {
  hasActiveSub?: boolean
  trialUsed?: boolean
  searchesRemaining?: number
  onTrialExhausted?: () => void
}

export default function SearchPanel({ hasActiveSub = true, trialUsed = false, searchesRemaining: _searchesRemaining, onTrialExhausted }: SearchPanelProps) {
  const [urls, setUrls] = useState("")
  const [query, setQuery] = useState("")
  const [pubKey, setPubKey] = useState("")
  const [searching, setSearching] = useState(false)
  const [currentSearch, setCurrentSearch] = useState<SearchQuery | null>(null)
  const [searchHistory, setSearchHistory] = useState<SearchQuery[]>([])
  const [decryptedResults, setDecryptedResults] = useState<Map<string, string>>(new Map())
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState("")
  const [keyReady, setKeyReady] = useState(false)
  const [learnMoreOpen, setLearnMoreOpen] = useState(false)
  const [superSearchMode, setSuperSearchMode] = useState(false)
  const [superSearchLearnMoreOpen, setSuperSearchLearnMoreOpen] = useState(false)
  const [superSearchResults, setSuperSearchResults] = useState<SuperSearchResultItem[]>([])
  const [superDecryptedResults, setSuperDecryptedResults] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const init = async () => {
      const { publicKeyHex } = await loadOrGenerateKeypair()
      setPubKey(publicKeyHex)
      setKeyReady(true)
    }
    init()
  }, [])

  const loadHistory = useCallback(async () => {
    const storedKey = getStoredPublicKeyHex()
    if (!storedKey) return
    const res = await apiRequest<{ searches: SearchQuery[] }>(
      "sp1d3r",
      "GET",
      "/v1/searches",
      undefined,
      { "X-Requester-Pubkey": storedKey }
    )
    if (res.ok) {
      setSearchHistory(res.data.searches || [])
    }
  }, [])

  useEffect(() => {
    if (keyReady) loadHistory()
  }, [keyReady, loadHistory])

  const handleSearch = async () => {
    const urlList = urls.split("\n").map((u) => u.trim()).filter(Boolean)
    if (!urlList.length) return
    if (!hasActiveSub && !trialUsed) {
    } else if (!hasActiveSub && trialUsed) {
      setError("Trial exhausted. Please subscribe to continue searching.")
      onTrialExhausted?.()
      return
    }
    setSearching(true)
    setError("")
    setCurrentSearch(null)
    setDecryptedResults(new Map())

    const token = localStorage.getItem("sp1d3r_token")
    const res = await apiRequest<SearchQuery>("sp1d3r", "POST", "/v1/search", {
      query: urlList.join(", "),
      urls: urlList,
      recipient_pubkey: pubKey,
    }, token ? { "Authorization": `Bearer ${token}` } : undefined)

    if (res.ok) {
      setCurrentSearch(res.data)
      const trialInfo = (res.data as any)._trial_info
      if (trialInfo?.reason === "trial" && onTrialExhausted) {
        onTrialExhausted()
      }
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
    setSearching(false)
  }

  const pollSearch = async (searchId: string) => {
    const maxAttempts = 60
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const res = await apiRequest<SearchQuery>(
        "sp1d3r",
        "GET",
        `/v1/search/${searchId}`,
        undefined,
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
      for (const result of search.results) {
        try {
          const plaintext = await decryptFinding(
            privateKey,
            result.ephemeral_public_key,
            result.nonce,
            result.ciphertext
          )
          decrypted.set(result.url, plaintext)
        } catch {
          decrypted.set(result.url, "[decryption failed]")
        }
      }
      setDecryptedResults(decrypted)
    } finally {
      setDecrypting(false)
    }
  }

  const handleViewHistory = async (search: SearchQuery) => {
    setCurrentSearch(search)
    setDecryptedResults(new Map())
    if (search.status === "completed" && search.results.length > 0) {
      await decryptAllResults(search)
    }
  }

  const handleSuperSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError("")
    setSuperSearchResults([])
    setSuperDecryptedResults(new Map())

    const token = localStorage.getItem("sp1d3r_token")
    const res = await apiRequest<SuperSearchResponse>("sp1d3r", "POST", "/v1/super_search", {
      query: query.trim(),
      recipient_pubkey: pubKey,
    }, token ? { "Authorization": `Bearer ${token}` } : undefined)

    if (res.ok) {
      setSuperSearchResults(res.data.results || [])
      if (res.data.results?.length > 0) {
        await decryptSuperResults(res.data.results)
      }
    } else if (res.status === 403) {
      const data = res.data as any
      if (data?.redirect === "/paywall") {
        setError("Super Search requires an active subscription.")
      } else {
        setError(data?.error || "Super search forbidden")
      }
    } else if (res.status === 401) {
      setError("Please sign in to use Super Search.")
    } else {
      setError("Super search request failed")
    }
    setSearching(false)
  }

  const decryptSuperResults = async (results: SuperSearchResultItem[]) => {
    setDecrypting(true)
    try {
      const { privateKey } = await loadOrGenerateKeypair()
      const decrypted = new Map<string, string>()
      for (const result of results) {
        try {
          const plaintext = await decryptFinding(
            privateKey,
            result.ephemeral_public_key,
            result.nonce,
            result.ciphertext
          )
          decrypted.set(result.url, plaintext)
        } catch {
          decrypted.set(result.url, "[decryption failed]")
        }
      }
      setSuperDecryptedResults(decrypted)
    } finally {
      setDecrypting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const truncate = (str: string, len: number) =>
    str.length > len ? str.slice(0, len) + "..." : str

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {superSearchMode ? (
              <AutoAwesomeIcon color="primary" />
            ) : (
              <SearchIcon color="primary" />
            )}
            <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
              {superSearchMode ? "Super Search" : "Encrypted Search"}
            </Typography>
            <Chip
              icon={<LockIcon />}
              label="E2E Encrypted"
              color="success"
              size="small"
              sx={{ ml: 1 }}
            />
            {superSearchMode && (
              <Chip
                icon={<AutoAwesomeIcon />}
                label="Multi-Engine"
                color="primary"
                size="small"
              />
            )}
          </Box>
          {hasActiveSub && (
            <FormControlLabel
              control={
                <Switch
                  checked={superSearchMode}
                  onChange={(e) => {
                    setSuperSearchMode(e.target.checked)
                    setError("")
                    setSuperSearchResults([])
                    setSuperDecryptedResults(new Map())
                  }}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Super</Typography>
                  <Tooltip title="Learn more about Super Search">
                    <IconButton size="small" onClick={() => setSuperSearchLearnMoreOpen(true)}>
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {superSearchMode
              ? "Query Google, Bing & DuckDuckGo simultaneously — results encrypted and combined."
              : "Powered by "}
            {!superSearchMode && <strong>Sp1d3r</strong>}
            {!superSearchMode && " — Decentralized Private Search Engine"}
          </Typography>
          {!superSearchMode && (
            <Tooltip title="Learn more about Sp1d3r">
              <IconButton size="small" onClick={() => setLearnMoreOpen(true)}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {superSearchMode ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter a search query. Results from multiple search engines are aggregated, deduplicated, and ranked by cross-engine consensus.
            </Typography>
            <TextField
              fullWidth
              label="Search Query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="e.g. privacy laws 2026"
              onKeyDown={(e) => { if (e.key === "Enter" && !searching && query.trim()) handleSuperSearch() }}
            />
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Submit URLs to crawl. Results are encrypted with your X25519 public key and can only be decrypted by you.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="URLs (one per line)"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              sx={{ mb: 2 }}
              placeholder={"https://example.com\nhttps://example.org"}
            />
          </>
        )}

        <TextField
          fullWidth
          label="Your X25519 Public Key (hex)"
          value={pubKey}
          slotProps={{ input: { readOnly: true } }}
          sx={{ mb: 2 }}
          helperText="Auto-generated. Only you can decrypt results with your private key."
        />
        <Button
          variant="contained"
          onClick={superSearchMode ? handleSuperSearch : handleSearch}
          disabled={searching || !keyReady || (superSearchMode ? !query.trim() : !urls.trim())}
          startIcon={searching ? <CircularProgress size={16} /> : (superSearchMode ? <AutoAwesomeIcon /> : <SearchIcon />)}
        >
          {searching
            ? (superSearchMode ? "Searching engines..." : "Searching...")
            : (superSearchMode ? "Super Search" : "Start Encrypted Search")}
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      {superSearchMode && superSearchResults.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
              Super Search Results
            </Typography>
            <Chip
              icon={<CheckCircleIcon />}
              label={`${superSearchResults.length} results`}
              color="success"
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Query: &quot;{query}&quot; — Ranked by cross-engine consensus
          </Typography>

          {decrypting && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Decrypting results...</Typography>
            </Box>
          )}

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
                    <TableCell>
                      <Chip size="small" label={r.rank} color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {truncate(r.title, 40)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {truncate(r.url, 40)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {r.source_engines.map((eng) => (
                          <Chip key={eng} size="small" label={eng} variant="outlined" color="secondary" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {r.score}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {decrypting ? (
                        <CircularProgress size={12} />
                      ) : (
                        truncate(superDecryptedResults.get(r.url) || "[encrypted]", 40)
                      )}
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
        </Paper>
      )}

      {!superSearchMode && currentSearch && (
        <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
              Search Results
            </Typography>
            <Chip
              icon={
                currentSearch.status === "completed" ? <CheckCircleIcon /> :
                currentSearch.status === "failed" ? <ErrorIcon /> :
                <HourglassEmptyIcon />
              }
              label={currentSearch.status}
              color={
                currentSearch.status === "completed" ? "success" :
                currentSearch.status === "failed" ? "error" :
                "warning"
              }
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Search ID: {truncate(currentSearch.id, 16)}...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            URLs: {currentSearch.urls.length} | Results: {currentSearch.results.length} | Failures: {currentSearch.failures.length}
          </Typography>

          {currentSearch.status !== "completed" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Crawling in progress...</Typography>
            </Box>
          )}

          {decrypting && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Decrypting results...</Typography>
            </Box>
          )}

          {currentSearch.results.length > 0 && (
            <TableContainer sx={{ mt: 2 }}>
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
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {truncate(r.url, 40)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                        {truncate(r.payload_hash, 16)}...
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {decrypting ? (
                          <CircularProgress size={12} />
                        ) : (
                          truncate(decryptedResults.get(r.url) || "[encrypted]", 60)
                        )}
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
            <Alert severity="warning" sx={{ mt: 2 }}>
              {currentSearch.failures.length} URL(s) failed to crawl
            </Alert>
          )}
        </Paper>
      )}

      {!superSearchMode && searchHistory.length > 0 && (
        <Paper sx={{ p: 3 }} variant="outlined">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
              Search History
            </Typography>
            <Tooltip title="Refresh">
              <IconButton onClick={loadHistory} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Query</TableCell>
                  <TableCell>URLs</TableCell>
                  <TableCell>Results</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchHistory.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{truncate(s.query, 30)}</TableCell>
                    <TableCell>{s.urls.length}</TableCell>
                    <TableCell>{s.results.length}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.status}
                        color={s.status === "completed" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(s.created_at * 1000).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => handleViewHistory(s)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={learnMoreOpen} onClose={() => setLearnMoreOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: "monospace", fontWeight: 700 }}>
          About Sp1d3r
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            <strong>Sp1d3r</strong> is the decentralized private search engine that powers D31337m3's encrypted crawling capabilities.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <SearchIcon color="primary" sx={{ mt: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Decentralized Crawling</Typography>
                <Typography variant="body2" color="text.secondary">Search tasks are distributed across a network of nodes — no single point of failure.</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <LockIcon color="success" sx={{ mt: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>E2E Encryption</Typography>
                <Typography variant="body2" color="text.secondary">Results are encrypted with X25519 + AES-256-GCM. Only you can decrypt them.</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <AccountTreeIcon color="primary" sx={{ mt: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Blockchain Verified</Typography>
                <Typography variant="body2" color="text.secondary">Every crawl is committed to an immutable chain for tamper-proof audit trails.</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <HubIcon color="secondary" sx={{ mt: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Peer-to-Peer Network</Typography>
                <Typography variant="body2" color="text.secondary">Nodes communicate via gossip protocol for resilient, censorship-resistant operation.</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <SecurityIcon color="warning" sx={{ mt: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Zero Knowledge</Typography>
                <Typography variant="body2" color="text.secondary">The platform never sees your plaintext results. Cryptographic guarantees, not promises.</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <SpeedIcon color="info" sx={{ mt: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Open & Auditable</Typography>
                <Typography variant="body2" color="text.secondary">Run your own node to verify the network independently. Full transparency.</Typography>
              </Box>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Want to contribute?{" "}
            <Link href="/nodes" onClick={() => setLearnMoreOpen(false)}>Run a Sp1d3r node</Link>
            {" "}and get a free Pro subscription.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLearnMoreOpen(false)}>Close</Button>
          <Button variant="contained" href="https://rrdlabs.online" target="_blank" rel="noopener">
            RRDLabs
          </Button>
        </DialogActions>
      </Dialog>

      <SuperSearchLearnMore open={superSearchLearnMoreOpen} onClose={() => setSuperSearchLearnMoreOpen(false)} />
    </Container>
  )
}
