import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  Grid,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import HubIcon from "@mui/icons-material/Hub"
import SecurityIcon from "@mui/icons-material/Security"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"

interface BlacklistEntry {
  id: string
  ip_address: string
  reason: string
  added_by: string
  shared_with_nodes: boolean
  created_at: string
}

interface Peer {
  url: string
  pubkey: string
  height: number
  last_seen: number
}

export default function NodeManagement() {
  const { username } = useAuth()
  const [tab, setTab] = useState(0)
  const [peers, setPeers] = useState<Peer[]>([])
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([])
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")

  const [newIp, setNewIp] = useState("")
  const [newReason, setNewReason] = useState("")
  const [newShared, setNewShared] = useState(true)

  const loadBlacklist = async () => {
    const res = await apiRequest<{ blacklist: BlacklistEntry[] }>("director", "GET", "/blacklist")
    if (res.ok) {
      setBlacklist(res.data.blacklist || [])
    }
  }

  const loadPeers = async () => {
    const res = await apiRequest<{ peers: Peer[] }>("sp1d3r", "GET", "/v1/chain/peers")
    if (res.ok) {
      setPeers(res.data.peers || [])
    }
  }

  useEffect(() => {
    loadBlacklist()
    loadPeers()
  }, [])

  const handleAddBlacklist = async () => {
    if (!newIp.trim()) return
    setError("")
    const res = await apiRequest("director", "POST", "/blacklist", {
      ip_address: newIp.trim(),
      reason: newReason.trim(),
      added_by: username,
      shared_with_nodes: newShared,
    })
    if (res.ok) {
      setMsg(`Added ${newIp} to blacklist`)
      setNewIp("")
      setNewReason("")
      setNewShared(true)
      loadBlacklist()
    } else {
      setError("Failed to add IP to blacklist")
    }
  }

  const handleDeleteBlacklist = async (entry: BlacklistEntry) => {
    if (!confirm(`Remove ${entry.ip_address} from blacklist?`)) return
    const res = await apiRequest("director", "DELETE", `/blacklist/${entry.id}`)
    if (res.ok) {
      setMsg(`Removed ${entry.ip_address}`)
      loadBlacklist()
    } else {
      setError("Failed to remove entry")
    }
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Node Management
      </Typography>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab icon={<HubIcon />} iconPosition="start" label="Peers" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="IP Blacklist" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6">
                Network Peers
                <Chip label={peers.length} size="small" sx={{ ml: 1 }} />
              </Typography>
              <Button startIcon={<HubIcon />} onClick={loadPeers}>Refresh</Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>URL</TableCell>
                    <TableCell>Public Key</TableCell>
                    <TableCell>Height</TableCell>
                    <TableCell>Last Seen</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {peers.map((p) => {
                    const age = Date.now() / 1000 - p.last_seen
                    const online = age < 300
                    return (
                      <TableRow key={p.url} hover>
                        <TableCell sx={{ fontFamily: "monospace" }}>{p.url}</TableCell>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                          {p.pubkey.slice(0, 20)}...
                        </TableCell>
                        <TableCell>{p.height}</TableCell>
                        <TableCell>{new Date(p.last_seen * 1000).toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={online ? "online" : age < 3600 ? "stale" : "offline"}
                            color={online ? "success" : age < 3600 ? "warning" : "error"}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {peers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" color="text.secondary">
                        No peers discovered yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              IP Blacklist
              <Chip label={blacklist.length} size="small" sx={{ ml: 1 }} />
            </Typography>

            <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
              <Grid container spacing={2} sx={{ alignItems: "center" }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="IP Address"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="192.168.1.1"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Reason"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="Suspicious activity"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newShared}
                        onChange={(e) => setNewShared(e.target.checked)}
                      />
                    }
                    label="Share with nodes"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddBlacklist}
                    disabled={!newIp.trim()}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Added By</TableCell>
                    <TableCell>Shared</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blacklist.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ fontFamily: "monospace" }}>{e.ip_address}</TableCell>
                      <TableCell>{e.reason || "—"}</TableCell>
                      <TableCell>{e.added_by}</TableCell>
                      <TableCell>
                        <Chip
                          label={e.shared_with_nodes ? "yes" : "no"}
                          size="small"
                          color={e.shared_with_nodes ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => handleDeleteBlacklist(e)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {blacklist.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" color="text.secondary">
                        No blacklisted IPs
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Container>
  )
}
