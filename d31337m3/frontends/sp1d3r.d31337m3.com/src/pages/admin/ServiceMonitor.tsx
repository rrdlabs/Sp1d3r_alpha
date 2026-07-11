import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import SpeedIcon from "@mui/icons-material/Speed"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import StopIcon from "@mui/icons-material/Stop"
import { apiRequest } from "../../api/client"

interface Service {
  name: string
  url: string
  status: string
  healthy: boolean
  failures: number
  restart_count: number
  last_seen: number
  kind: string
}

interface TrafficEntry {
  service: string
  requests: number
  last_seen: number
}

export default function ServiceMonitor() {
  const [services, setServices] = useState<Service[]>([])
  const [traffic, setTraffic] = useState<Record<string, TrafficEntry>>({})
  const [reconciled, setReconciled] = useState(false)
  const [actionMsg, setActionMsg] = useState("")
  const [actionError, setActionError] = useState("")

  const load = async () => {
    const [svcRes, trfRes] = await Promise.all([
      apiRequest<{ services: Service[] }>("director", "GET", "/services"),
      apiRequest<{ traffic: Record<string, TrafficEntry> }>("director", "GET", "/traffic/frontend"),
    ])
    if (svcRes.ok) setServices(svcRes.data.services)
    if (trfRes.ok) setTraffic(trfRes.data.traffic)
  }

  useEffect(() => { load() }, [])

  const handleReconcile = async () => {
    const res = await apiRequest("director", "POST", "/reconcile")
    if (res.ok) {
      setReconciled(true)
      load()
    }
  }

  const handleRestart = async (name: string) => {
    setActionMsg("")
    setActionError("")
    const res = await apiRequest("director", "POST", `/services/${name}/restart`)
    if (res.ok) {
      setActionMsg(`${name} is restarting`)
      load()
    } else {
      setActionError(`Failed to restart ${name}`)
    }
  }

  const handleStop = async (name: string) => {
    setActionMsg("")
    setActionError("")
    const res = await apiRequest("director", "POST", `/services/${name}/stop`)
    if (res.ok) {
      setActionMsg(`${name} stopped`)
      load()
    } else {
      setActionError(`Failed to stop ${name}`)
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
          Service Monitor
        </Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={load} sx={{ mr: 1 }}>Refresh</Button>
          <Button variant="outlined" color="warning" onClick={handleReconcile}>
            Reconcile
          </Button>
        </Box>
      </Box>

      {reconciled && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setReconciled(false)}>
          Reconciliation complete. Services with failures above threshold have been restarted.
        </Alert>
      )}
      {actionMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionMsg("")}>{actionMsg}</Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError("")}>{actionError}</Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {services.map((s) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={s.name}>
            <Paper
              sx={{
                p: 2,
                borderLeft: 4,
                borderColor: s.healthy ? "success.main" : "error.main",
              }}
              variant="outlined"
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                <Box>
                  <Tooltip title="Restart">
                    <IconButton size="small" color="warning" onClick={() => handleRestart(s.name)}>
                      <RestartAltIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Stop">
                    <IconButton size="small" color="error" onClick={() => handleStop(s.name)}>
                      <StopIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">{s.url}</Typography>
              <Chip
                label={s.status}
                size="small"
                color={s.healthy ? "success" : "error"}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                Failures: {s.failures} | Restarts: {s.restart_count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last seen: {new Date(s.last_seen * 1000).toLocaleTimeString()}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <SpeedIcon color="primary" />
          <Typography variant="h6">Frontend Traffic</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell>Requests</TableCell>
                <TableCell>Last Seen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(traffic).map((t) => (
                <TableRow key={t.service}>
                  <TableCell>{t.service}</TableCell>
                  <TableCell>{t.requests}</TableCell>
                  <TableCell>{new Date(t.last_seen * 1000).toLocaleTimeString()}</TableCell>
                </TableRow>
              ))}
              {!Object.keys(traffic).length && (
                <TableRow><TableCell colSpan={3} align="center" color="text.secondary">No traffic data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  )
}
