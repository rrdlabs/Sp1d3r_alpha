import { useState, useEffect } from "react"
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import PeopleIcon from "@mui/icons-material/People"
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import RefreshIcon from "@mui/icons-material/Refresh"
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

interface AlertEntry {
  service: string
  message: string
  at: number
}

export default function AdminDashboard() {
  const [services, setServices] = useState<Service[]>([])
  const [alerts, setAlerts] = useState<AlertEntry[]>([])
  const [userCount, setUserCount] = useState<number | null>(null)

  const load = async () => {
    const [svcRes, alertRes, userRes] = await Promise.all([
      apiRequest<{ services: Service[] }>("director", "GET", "/services"),
      apiRequest<{ alerts: AlertEntry[] }>("director", "GET", "/alerts"),
      apiRequest<{ total: number }>("cityhall", "GET", "/admin/users?page=1&page_size=1"),
    ])
    if (svcRes.ok) setServices(svcRes.data.services)
    if (alertRes.ok) setAlerts(alertRes.data.alerts)
    if (userRes.ok) setUserCount(userRes.data.total)
  }

  useEffect(() => { load() }, [])

  const healthyCount = services.filter((s) => s.healthy).length
  const degradedCount = services.filter((s) => !s.healthy).length

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
          Admin Dashboard
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PeopleIcon color="primary" />
              <Typography variant="h6">Users</Typography>
            </Box>
            <Typography variant="h3" color="primary">{userCount ?? "—"}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MonitorHeartIcon color="success" />
              <Typography variant="h6">Services</Typography>
            </Box>
            <Typography variant="h3" color="success.main">{healthyCount}</Typography>
            <Typography variant="body2" color="text.secondary">healthy</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <WarningAmberIcon color="warning" />
              <Typography variant="h6">Degraded</Typography>
            </Box>
            <Typography variant="h3" color="warning.main">{degradedCount}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }} variant="outlined">
        <Typography variant="h6" gutterBottom>Service Health</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell>Port</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Failures</TableCell>
                <TableCell>Restarts</TableCell>
                <TableCell>Last Seen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.name}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.url?.split(":").pop()}</TableCell>
                  <TableCell>
                    <Chip
                      label={s.status}
                      size="small"
                      color={s.healthy ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell>{s.failures}</TableCell>
                  <TableCell>{s.restart_count}</TableCell>
                  <TableCell>{new Date(s.last_seen * 1000).toLocaleTimeString()}</TableCell>
                </TableRow>
              ))}
              {!services.length && (
                <TableRow><TableCell colSpan={6} align="center" color="text.secondary">No services registered</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }} variant="outlined">
        <Typography variant="h6" gutterBottom>Recent Alerts</Typography>
        {alerts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No alerts</Typography>
        ) : (
          alerts.slice(-10).reverse().map((a, i) => (
            <Alert key={i} severity="warning" sx={{ mb: 1 }}>
              <strong>{a.service}</strong>: {a.message} &mdash; {new Date(a.at * 1000).toLocaleString()}
            </Alert>
          ))
        )}
      </Paper>
    </Container>
  )
}
