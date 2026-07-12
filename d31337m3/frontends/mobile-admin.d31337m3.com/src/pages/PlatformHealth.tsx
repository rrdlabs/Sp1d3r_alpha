import { useState, useEffect } from "react"
import {
  Box, Container, Typography, Paper, Grid, Chip, CircularProgress,
} from "@mui/material"
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"


interface HealthResult { service: string; healthy: boolean; latency_ms: number }

export default function PlatformHealth() {
  const [results, setResults] = useState<HealthResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const services = [
      { name: "cityhall", port: 8000 }, { name: "sp1d3r", port: 9000 },
      { name: "banker", port: 8700 }, { name: "director", port: 8400 },
      { name: "historian", port: 8100 }, { name: "lawyer", port: 8200 },
      { name: "inboxer", port: 8300 }, { name: "picaso", port: 8500 },
      { name: "spiderwire", port: 8600 },
    ]
    Promise.all(services.map(async (s) => {
      const start = Date.now()
      try {
        const res = await fetch(`http://127.0.0.1:${s.port}/health`, { signal: AbortSignal.timeout(3000) })
        return { service: s.name, healthy: res.ok, latency_ms: Date.now() - start }
      } catch { return { service: s.name, healthy: false, latency_ms: Date.now() - start } }
    })).then((r) => { setResults(r); setLoading(false) })
  }, [])

  const healthy = results.filter((r) => r.healthy).length

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <HealthAndSafetyIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Health</Typography>
        <Chip label={`${healthy}/${results.length}`} color={healthy === results.length ? "success" : "warning"} size="small" />
      </Box>
      {loading ? <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box> : (
        <Grid container spacing={1.5}>
          {results.map((r) => (
            <Grid size={{ xs: 6 }} key={r.service}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.service}</Typography>
                  {r.healthy ? <CheckCircleIcon color="success" sx={{ fontSize: 18 }} /> : <ErrorIcon color="error" sx={{ fontSize: 18 }} />}
                </Box>
                <Typography variant="caption" color="text.secondary">{r.latency_ms}ms</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
