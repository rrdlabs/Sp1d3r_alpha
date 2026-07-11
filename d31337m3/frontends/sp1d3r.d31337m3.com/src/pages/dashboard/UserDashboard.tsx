import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import BugReportIcon from "@mui/icons-material/BugReport"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import HubIcon from "@mui/icons-material/Hub"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import ComputerIcon from "@mui/icons-material/Computer"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"

interface CrawlResult {
  url: string
  payload_hash: string
  merkle_root: string
}

interface ChainState {
  blocks: number
  authenticated_nodes: number
  payload_roots: number
  events: number
  height: number
}

interface Peer {
  url: string
  pubkey: string
  height: number
  last_seen: number
}

interface LiveNode {
  name: string
  pubkey: string
  height: number
  version: string
  status: string
  healthy: boolean
  last_seen: number
}

export default function UserDashboard() {
  const { username } = useAuth()
  const [urls, setUrls] = useState("")
  const [pubKey, setPubKey] = useState("")
  const [crawling, setCrawling] = useState(false)
  const [crawlResults, setCrawlResults] = useState<CrawlResult[] | null>(null)
  const [crawlError, setCrawlError] = useState("")
  const [chainState, setChainState] = useState<ChainState | null>(null)
  const [peers, setPeers] = useState<Peer[]>([])
  const [liveNodes, setLiveNodes] = useState<LiveNode[]>([])
  const [healthOk, setHealthOk] = useState<boolean | null>(null)

  useEffect(() => {
    const loadChain = async () => {
      const [healthRes, stateRes, peersRes, nodesRes] = await Promise.all([
        apiRequest("sp1d3r", "GET", "/health"),
        apiRequest<ChainState>("sp1d3r", "GET", "/v1/chain/state"),
        apiRequest<{ peers: Peer[] }>("sp1d3r", "GET", "/v1/chain/peers"),
        apiRequest<{ nodes: LiveNode[] }>("director", "GET", "/nodes"),
      ])
      setHealthOk(healthRes.ok)
      if (stateRes.ok) setChainState(stateRes.data)
      if (peersRes.ok) setPeers(peersRes.data.peers || [])
      if (nodesRes.ok) setLiveNodes(nodesRes.data.nodes || [])
    }
    loadChain()
  }, [])

  const handleCrawl = async () => {
    const urlList = urls.split("\n").map((u) => u.trim()).filter(Boolean)
    if (!urlList.length) return
    setCrawling(true)
    setCrawlError("")
    setCrawlResults(null)
    const res = await apiRequest<{ results: CrawlResult[]; failures: { url: string; error: string }[] }>(
      "sp1d3r",
      "POST",
      "/v1/crawl",
      { urls: urlList, recipient_public_key: pubKey },
    )
    setCrawling(false)
    if (res.ok) {
      setCrawlResults(res.data.results || [])
      if (res.data.failures?.length) {
        setCrawlError(`${res.data.failures.length} URL(s) failed`)
      }
    } else {
      setCrawlError("Crawl request failed")
    }
  }

  const onlineNodes = liveNodes.filter((n) => Date.now() / 1000 - n.last_seen < 120).length

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Welcome, {username}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor your reputation, run crawls, and view chain status.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <BugReportIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Sp1d3r Node</Typography>
            </Box>
            <Chip
              icon={healthOk ? <CheckCircleIcon /> : <ErrorIcon />}
              label={healthOk === null ? "Checking..." : healthOk ? "Online" : "Offline"}
              color={healthOk ? "success" : healthOk === null ? "default" : "error"}
              size="small"
            />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <AccountTreeIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Chain Height</Typography>
            </Box>
            <Typography variant="h3" color="primary">{chainState?.height ?? "—"}</Typography>
            <Typography variant="body2" color="text.secondary">{chainState?.blocks ?? 0} blocks</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <HubIcon color="secondary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Network</Typography>
            </Box>
            <Typography variant="h3" color="secondary">{chainState?.authenticated_nodes ?? "—"}</Typography>
            <Typography variant="body2" color="text.secondary">authenticated nodes</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <ComputerIcon color={onlineNodes > 0 ? "success" : "warning"} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Nodes Online</Typography>
            </Box>
            <Typography variant="h3" color={onlineNodes > 0 ? "success.main" : "warning.main"}>
              {onlineNodes}/{liveNodes.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">connected nodes</Typography>
          </Paper>
        </Grid>
      </Grid>

      {liveNodes.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }} variant="outlined">
          <Typography variant="h6" gutterBottom sx={{ fontFamily: "monospace" }}>
            Connected Nodes
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Height</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {liveNodes.map((n) => {
                  const online = Date.now() / 1000 - n.last_seen < 120
                  return (
                    <TableRow key={n.name}>
                      <TableCell sx={{ fontFamily: "monospace" }}>{n.name}</TableCell>
                      <TableCell>{n.height ?? "—"}</TableCell>
                      <TableCell><Chip size="small" label={n.version || "unknown"} variant="outlined" /></TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={online ? "online" : "stale"}
                          color={online ? "success" : "warning"}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {peers.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }} variant="outlined">
          <Typography variant="h6" gutterBottom sx={{ fontFamily: "monospace" }}>
            Chain Peers
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>URL</TableCell>
                  <TableCell>Public Key</TableCell>
                  <TableCell>Height</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {peers.map((p) => {
                  const online = Date.now() / 1000 - p.last_seen < 300
                  return (
                    <TableRow key={p.url}>
                      <TableCell sx={{ fontFamily: "monospace" }}>{p.url}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                        {p.pubkey.slice(0, 16)}...
                      </TableCell>
                      <TableCell>{p.height}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={online ? "online" : "stale"}
                          color={online ? "success" : "warning"}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Paper sx={{ p: 3, mt: 3 }} variant="outlined">
        <Typography variant="h5" gutterBottom sx={{ fontFamily: "monospace" }}>
          Run Crawl
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
        <TextField
          fullWidth
          label="Recipient Public Key (hex)"
          value={pubKey}
          onChange={(e) => setPubKey(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="ed25519 public key in hex"
        />
        <Button variant="contained" onClick={handleCrawl} disabled={crawling || !urls.trim()}>
          {crawling ? "Crawling..." : "Start Crawl"}
        </Button>
        {crawling && <LinearProgress sx={{ mt: 2 }} />}
        {crawlError && <Alert severity="warning" sx={{ mt: 2 }}>{crawlError}</Alert>}
        {crawlResults && crawlResults.length > 0 && (
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>URL</TableCell>
                  <TableCell>Payload Hash</TableCell>
                  <TableCell>Merkle Root</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {crawlResults.map((r) => (
                  <TableRow key={r.url}>
                    <TableCell>{r.url}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {r.payload_hash?.slice(0, 16)}...
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {r.merkle_root?.slice(0, 16)}...
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  )
}
