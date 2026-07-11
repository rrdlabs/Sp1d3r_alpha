import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
} from "@mui/material"
import LinkIcon from "@mui/icons-material/Link"
import PeopleIcon from "@mui/icons-material/People"
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong"
import RefreshIcon from "@mui/icons-material/Refresh"
import { apiRequest } from "../../api/client"

interface ChainState {
  blocks: number
  authenticated_nodes: number
  approved_app_hashes: number
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

export default function BlockchainDetails() {
  const [chain, setChain] = useState<ChainState | null>(null)
  const [peers, setPeers] = useState<Peer[]>([])
  const [syncInfo, setSyncInfo] = useState<{ local_height: number; peers_known: number; gossip_enabled: boolean } | null>(null)
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    const [stateRes, peerRes, syncRes, healthRes] = await Promise.all([
      apiRequest<ChainState>("sp1d3r", "GET", "/v1/chain/state"),
      apiRequest<{ peers: Peer[] }>("sp1d3r", "GET", "/v1/chain/peers"),
      apiRequest<{ local_height: number; peers_known: number; gossip_enabled: boolean }>("sp1d3r", "GET", "/v1/chain/sync"),
      apiRequest<Record<string, unknown>>("sp1d3r", "GET", "/health"),
    ])
    if (stateRes.ok) setChain(stateRes.data)
    else setError("Failed to load chain state — is sp1d3r running?")
    if (peerRes.ok) setPeers(peerRes.data.peers)
    if (syncRes.ok) setSyncInfo(syncRes.data)
    if (healthRes.ok) setHealth(healthRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <Container maxWidth="lg"><CircularProgress sx={{ mt: 4 }} /></Container>

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
          Blockchain Details
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Typography variant="body2" color="text.secondary">Chain Height</Typography>
            <Typography variant="h3" color="primary">{chain?.height ?? "—"}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Typography variant="body2" color="text.secondary">Total Blocks</Typography>
            <Typography variant="h3">{chain?.blocks ?? "—"}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PeopleIcon color="secondary" />
              <Typography variant="body2" color="text.secondary">Nodes</Typography>
            </Box>
            <Typography variant="h3" color="secondary">{chain?.authenticated_nodes ?? "—"}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Typography variant="body2" color="text.secondary">Events</Typography>
            <Typography variant="h3">{chain?.events ?? "—"}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <ReceiptLongIcon color="primary" />
              <Typography variant="h6">Node Health</Typography>
            </Box>
            {health ? (
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {Object.entries(health).map(([key, val]) => (
                      <TableRow key={key}>
                        <TableCell sx={{ fontFamily: "monospace" }}>{key}</TableCell>
                        <TableCell align="right">{String(val)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">No health data</Typography>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <LinkIcon color="primary" />
              <Typography variant="h6">Sync Status</Typography>
            </Box>
            {syncInfo ? (
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Local Height</TableCell>
                      <TableCell align="right">{syncInfo.local_height}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Known Peers</TableCell>
                      <TableCell align="right">{syncInfo.peers_known}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Gossip</TableCell>
                      <TableCell align="right">
                        <Chip label={syncInfo.gossip_enabled ? "enabled" : "disabled"} size="small" color={syncInfo.gossip_enabled ? "success" : "default"} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Payload Roots</TableCell>
                      <TableCell align="right">{chain?.payload_roots ?? 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Approved Hashes</TableCell>
                      <TableCell align="right">{chain?.approved_app_hashes ?? 0}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">No sync data</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }} variant="outlined">
        <Typography variant="h6" gutterBottom>Connected Peers</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>URL</TableCell>
                <TableCell>Public Key</TableCell>
                <TableCell>Height</TableCell>
                <TableCell>Last Seen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {peers.map((p) => (
                <TableRow key={p.url}>
                  <TableCell>{p.url}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{p.pubkey?.slice(0, 20)}...</TableCell>
                  <TableCell>{p.height}</TableCell>
                  <TableCell>{new Date(p.last_seen * 1000).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {!peers.length && (
                <TableRow><TableCell colSpan={4} align="center" color="text.secondary">No peers connected</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  )
}
