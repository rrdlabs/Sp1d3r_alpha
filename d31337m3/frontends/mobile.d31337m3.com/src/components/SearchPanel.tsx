import { useState, useEffect } from "react"
import {
  Box, Button, Chip, CircularProgress, Container, Divider, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography, Alert, IconButton, Tooltip,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import { apiRequest } from "../api/client"
import { loadOrGenerateKeypair, decryptFinding } from "../utils/crypto"
import SuperSearchLearnMore from "./SuperSearchLearnMore"

interface SearchResult { url: string; payload_hash: string; merkle_root: string; ephemeral_public_key: string; nonce: string; ciphertext: string }
interface SuperSearchResultItem { rank: number; title: string; url: string; source_engines: string[]; score: number; payload_hash: string; merkle_root: string; ephemeral_public_key: string; nonce: string; ciphertext: string }
interface SearchQuery { id: string; query: string; urls: string[]; recipient_pubkey: string; status: string; task_ids: string[]; results: SearchResult[]; failures: { url: string; error: string }[]; created_at: number; completed_at: number | null }
interface SuperSearchResponse { search_id: string; status: string; query: string; results: SuperSearchResultItem[]; created_at: number; completed_at: number | null }
interface SearchPanelProps { hasActiveSub?: boolean; trialUsed?: boolean; searchesRemaining?: number; onTrialExhausted?: () => void }

export default function SearchPanel({ hasActiveSub = true, trialUsed = false, onTrialExhausted }: SearchPanelProps) {
  const [urls, setUrls] = useState("")
  const [query, setQuery] = useState("")
  const [pubKey, setPubKey] = useState("")
  const [searching, setSearching] = useState(false)
  const [currentSearch, setCurrentSearch] = useState<SearchQuery | null>(null)
  const [decryptedResults, setDecryptedResults] = useState<Map<string, string>>(new Map())
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState("")
  const [keyReady, setKeyReady] = useState(false)
  const [superMode, setSuperMode] = useState(false)
  const [superResults, setSuperResults] = useState<SuperSearchResultItem[]>([])
  const [superDecrypted, setSuperDecrypted] = useState<Map<string, string>>(new Map())
  const [superLearnOpen, setSuperLearnOpen] = useState(false)

  useEffect(() => { loadOrGenerateKeypair().then(({ publicKeyHex }) => { setPubKey(publicKeyHex); setKeyReady(true) }) }, [])
  const truncate = (s: string, l: number) => s.length > l ? s.slice(0, l) + "..." : s

  const handleSearch = async () => {
    const urlList = urls.split("\n").map((u) => u.trim()).filter(Boolean)
    if (!urlList.length) return
    if (!hasActiveSub && trialUsed) { setError("Trial exhausted."); onTrialExhausted?.(); return }
    setSearching(true); setError(""); setCurrentSearch(null); setDecryptedResults(new Map())
    const token = localStorage.getItem("sp1d3r_token")
    const res = await apiRequest<SearchQuery>("sp1d3r", "POST", "/v1/search", { query: urlList.join(", "), urls: urlList, recipient_pubkey: pubKey }, token ? { Authorization: `Bearer ${token}` } : undefined)
    if (res.ok) { setCurrentSearch(res.data); pollSearch(res.data.id) }
    else if (res.status === 403) { setError("Trial limit reached."); onTrialExhausted?.() }
    else setError("Search failed")
    setSearching(false)
  }

  const pollSearch = async (id: string) => {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const res = await apiRequest<SearchQuery>("sp1d3r", "GET", `/v1/search/${id}`, undefined, { "X-Requester-Pubkey": pubKey })
      if (res.ok && res.data.status === "completed") { setCurrentSearch(res.data); await decryptAll(res.data); return }
    }
    setError("Search timed out")
  }

  const decryptAll = async (search: SearchQuery) => {
    if (!search.results.length) return
    setDecrypting(true)
    const { privateKey } = await loadOrGenerateKeypair()
    const decrypted = new Map<string, string>()
    for (const r of search.results) {
      try { decrypted.set(r.url, await decryptFinding(privateKey, r.ephemeral_public_key, r.nonce, r.ciphertext)) }
      catch { decrypted.set(r.url, "[decryption failed]") }
    }
    setDecryptedResults(decrypted); setDecrypting(false)
  }

  const handleSuperSearch = async () => {
    if (!query.trim()) return
    setSearching(true); setError(""); setSuperResults([]); setSuperDecrypted(new Map())
    const token = localStorage.getItem("sp1d3r_token")
    const res = await apiRequest<SuperSearchResponse>("sp1d3r", "POST", "/v1/super_search", { query: query.trim(), recipient_pubkey: pubKey }, token ? { Authorization: `Bearer ${token}` } : undefined)
    if (res.ok) { setSuperResults(res.data.results || []); if (res.data.results?.length) await decryptSuper(res.data.results) }
    else if (res.status === 403) setError("Super Search requires subscription.")
    else if (res.status === 401) setError("Please sign in.")
    else setError("Super search failed")
    setSearching(false)
  }

  const decryptSuper = async (results: SuperSearchResultItem[]) => {
    setDecrypting(true)
    const { privateKey } = await loadOrGenerateKeypair()
    const decrypted = new Map<string, string>()
    for (const r of results) {
      try { decrypted.set(r.url, await decryptFinding(privateKey, r.ephemeral_public_key, r.nonce, r.ciphertext)) }
      catch { decrypted.set(r.url, "[decryption failed]") }
    }
    setSuperDecrypted(decrypted); setDecrypting(false)
  }

  return (
    <Container maxWidth="sm" id="search">
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {superMode ? <AutoAwesomeIcon color="primary" /> : <SearchIcon color="primary" />}
            <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1rem" }}>
              {superMode ? "Super Search" : "Encrypted Search"}
            </Typography>
          </Box>
          {hasActiveSub && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title="Learn about Super Search">
                <IconButton size="small" onClick={() => setSuperLearnOpen(true)}><InfoOutlinedIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Chip label={superMode ? "Super" : "Crawl"} size="small" color={superMode ? "primary" : "default"}
                onClick={() => { setSuperMode(!superMode); setError(""); setSuperResults([]); setSuperDecrypted(new Map()) }} clickable />
            </Box>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        {superMode ? (
          <TextField fullWidth label="Search Query" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ mb: 2 }}
            placeholder="e.g. privacy laws 2026" size="small"
            onKeyDown={(e) => { if (e.key === "Enter" && !searching && query.trim()) handleSuperSearch() }} />
        ) : (
          <TextField fullWidth multiline rows={2} label="URLs (one per line)" value={urls} onChange={(e) => setUrls(e.target.value)} sx={{ mb: 2 }}
            placeholder={"https://example.com\nhttps://example.org"} size="small" />
        )}
        <TextField fullWidth label="Public Key (hex)" value={pubKey} slotProps={{ input: { readOnly: true } }} sx={{ mb: 2 }} size="small"
          helperText="Auto-generated. Only you can decrypt." />
        <Button fullWidth variant="contained" onClick={superMode ? handleSuperSearch : handleSearch}
          disabled={searching || !keyReady || (superMode ? !query.trim() : !urls.trim())}
          startIcon={searching ? <CircularProgress size={16} /> : (superMode ? <AutoAwesomeIcon /> : <SearchIcon />)}>
          {searching ? "Searching..." : (superMode ? "Super Search" : "Search")}
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      {superMode && superResults.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Results</Typography>
            <Chip icon={<CheckCircleIcon />} label={`${superResults.length} results`} color="success" size="small" />
          </Box>
          {decrypting && <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}><CircularProgress size={14} /><Typography variant="caption">Decrypting...</Typography></Box>}
          {superResults.map((r) => (
            <Paper key={r.url} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Chip label={r.rank} size="small" color="primary" variant="outlined" sx={{ minWidth: 28 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {truncate(r.title, 35)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", display: "block", mb: 0.5 }}>
                {truncate(r.url, 45)}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
                {r.source_engines.map((e) => <Chip key={e} label={e} size="small" variant="outlined" />)}
                <Chip label={`score: ${r.score}`} size="small" variant="outlined" color="secondary" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {decrypting ? "..." : truncate(superDecrypted.get(r.url) || "[encrypted]", 80)}
              </Typography>
              {superDecrypted.get(r.url) && (
                <IconButton size="small" onClick={() => navigator.clipboard.writeText(superDecrypted.get(r.url) || "")}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              )}
            </Paper>
          ))}
        </Paper>
      )}

      {!superMode && currentSearch && (
        <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
          <Typography variant="subtitle1" sx={{ fontFamily: "monospace", fontWeight: 700, mb: 1 }}>Results</Typography>
          <Chip size="small" label={currentSearch.status} color={currentSearch.status === "completed" ? "success" : "warning"} sx={{ mb: 1 }} />
          {currentSearch.results.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>URL</TableCell><TableCell>Preview</TableCell></TableRow></TableHead>
                <TableBody>
                  {currentSearch.results.map((r) => (
                    <TableRow key={r.url}>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{truncate(r.url, 30)}</TableCell>
                      <TableCell>{decrypting ? "..." : truncate(decryptedResults.get(r.url) || "[encrypted]", 40)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      <SuperSearchLearnMore open={superLearnOpen} onClose={() => setSuperLearnOpen(false)} />
    </Container>
  )
}
