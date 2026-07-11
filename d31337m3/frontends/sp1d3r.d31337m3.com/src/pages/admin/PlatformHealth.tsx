import { useState, useEffect, useRef, useCallback } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import { apiRequest } from "../../api/client"

interface ServiceHealth {
  name: string
  healthy: boolean
  status: string
  url: string
}

interface PlatformHealthResponse {
  services: Record<string, { healthy: boolean; url: string }>
}

const ALL_SERVICES = [
  "cityhall",
  "director",
  "historian",
  "lawyer",
  "inboxer",
  "picaso",
  "spiderwire",
  "sp1d3r",
  "banker",
] as const

export default function PlatformHealth() {
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    const [dirRes, bankerRes] = await Promise.all([
      apiRequest<PlatformHealthResponse>("director", "GET", "/platform-health"),
      apiRequest<{ status?: string; healthy?: boolean }>("banker", "GET", "/health"),
    ])

    const svcMap: Record<string, ServiceHealth> = {}

    if (dirRes.ok && dirRes.data.services) {
      for (const [name, info] of Object.entries(dirRes.data.services)) {
        svcMap[name] = {
          name,
          healthy: info.healthy,
          status: info.healthy ? "healthy" : "unreachable",
          url: info.url || "",
        }
      }
    }

    for (const name of ALL_SERVICES) {
      if (!svcMap[name]) {
        svcMap[name] = { name, healthy: false, status: "unreachable", url: "" }
      }
    }

    if (bankerRes.ok) {
      const bHealthy = bankerRes.data.healthy !== false
      svcMap["banker"] = {
        name: "banker",
        healthy: bHealthy,
        status: bHealthy ? "healthy" : "unreachable",
        url: svcMap["banker"]?.url || "localhost:8700",
      }
    } else {
      svcMap["banker"] = {
        name: "banker",
        healthy: false,
        status: "unreachable",
        url: svcMap["banker"]?.url || "localhost:8700",
      }
    }

    setServices(ALL_SERVICES.map((n) => svcMap[n]))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 10000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, load])

  const healthyCount = services.filter((s) => s.healthy).length
  const allHealthy = healthyCount === services.length && services.length > 0
  const allDown = services.length > 0 && healthyCount === 0

  const bannerColor = allHealthy ? "success.main" : allDown ? "error.main" : "warning.main"
  const bannerText = allHealthy
    ? "ALL SYSTEMS OPERATIONAL"
    : allDown
      ? "OFFLINE"
      : "DEGRADED"
  const BannerIcon = allHealthy ? CheckCircleIcon : allDown ? ErrorIcon : WarningAmberIcon

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
          Platform Health
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto-refresh (10s)"
          />
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </Box>

      {loading ? (
        <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
      ) : (
        <>
          <Paper
            sx={{
              p: 3,
              mb: 3,
              backgroundColor: bannerColor,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <BannerIcon sx={{ fontSize: 40 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
              {bannerText}
            </Typography>
            <Typography variant="body2" sx={{ ml: "auto" }}>
              {healthyCount}/{services.length} services healthy
            </Typography>
          </Paper>

          <Grid container spacing={2}>
            {services.map((s) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.name}>
                <Paper
                  sx={{
                    p: 2,
                    borderLeft: 4,
                    borderColor: s.healthy ? "success.main" : "error.main",
                  }}
                  variant="outlined"
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {s.name}
                    </Typography>
                    <Chip
                      label={s.healthy ? "healthy" : "unreachable"}
                      size="small"
                      color={s.healthy ? "success" : "error"}
                    />
                  </Box>
                  {s.url && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {s.url}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Container>
  )
}
