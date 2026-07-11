import { useState, useEffect } from "react"
import {
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
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
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

export default function NetworkConfig() {
  const { username } = useAuth()
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")

  const [newIp, setNewIp] = useState("")
  const [newReason, setNewReason] = useState("")
  const [newShared, setNewShared] = useState(true)

  const load = async () => {
    setError("")
    const res = await apiRequest<{ entries: BlacklistEntry[] }>("director", "GET", "/blacklist")
    if (res.ok) {
      setEntries(res.data.entries || [])
    } else {
      setError("Failed to load blacklist")
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async () => {
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
      load()
    } else {
      setError("Failed to add IP to blacklist")
    }
  }

  const handleDelete = async (entry: BlacklistEntry) => {
    if (!confirm(`Remove ${entry.ip_address} from blacklist?`)) return
    const res = await apiRequest("director", "DELETE", `/blacklist/${entry.id}`)
    if (res.ok) {
      setMsg(`Removed ${entry.ip_address}`)
      load()
    } else {
      setError("Failed to remove entry")
    }
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Network Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {entries.length} blacklisted IP{entries.length !== 1 ? "s" : ""}
      </Typography>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>
          Add IP to Blacklist
        </Typography>
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
              onClick={handleAdd}
              disabled={!newIp.trim()}
            >
              Add
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>IP Address</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Added By</TableCell>
              <TableCell>Shared with Nodes</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
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
                  <IconButton size="small" color="error" onClick={() => handleDelete(e)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" color="text.secondary">
                  No blacklisted IPs
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  )
}
