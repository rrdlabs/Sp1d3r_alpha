import { useState, useEffect } from "react"
import { Link as RouterLink } from "react-router-dom"
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
} from "@mui/material"
import BugReportIcon from "@mui/icons-material/BugReport"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import HubIcon from "@mui/icons-material/Hub"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import ComputerIcon from "@mui/icons-material/Computer"
import DownloadIcon from "@mui/icons-material/Download"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"
import SearchPanel from "../../components/SearchPanel"

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

  const onlineNodes = liveNodes.filter((n) => Date.now() / 1000 - n.last_seen < 120).length

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Welcome, {username}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor your reputation, run crawls, and view chain status.
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          p: 3,
          background: "linear-gradient(135deg, rgba(25,118,210,0.08) 0%, rgba(46,125,50,0.08) 100%)",
          border: 1,
          borderColor: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <DownloadIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Run a Node — Get a Free Professional Subscription
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deploy a Sp1d3r node in minutes with Docker. Help the network, earn reputation, and unlock free platform access.
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" component={RouterLink} to="/nodes" startIcon={<DownloadIcon />}>
          Learn More
        </Button>
      </Paper>

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

      <SearchPanel />
    </Container>
  )
}
