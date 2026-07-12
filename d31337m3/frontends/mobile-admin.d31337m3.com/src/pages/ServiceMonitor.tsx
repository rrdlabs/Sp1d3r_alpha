import { useState, useEffect } from "react"
import {
  Box, Container, Typography, Paper, Grid, Chip, CircularProgress,
} from "@mui/material"
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import { apiRequest } from "../api/client"

interface Service { name: string; url: string; healthy: boolean; kind: string }

export default function ServiceMonitor() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<{ services: Service[] }>("director", "GET", "/services").then((res: any) => {
      if (res.ok) setServices(res.data.services || [])
      setLoading(false)
    })
  }, [])

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <MonitorHeartIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Services</Typography>
      </Box>
      {loading ? <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box> : (
        <Grid container spacing={1.5}>
          {services.map((s) => (
            <Grid size={{ xs: 6 }} key={s.name}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", display: "block", mb: 0.5 }}>{s.url}</Typography>
                <Chip icon={s.healthy ? <CheckCircleIcon /> : <ErrorIcon />}
                  label={s.healthy ? "healthy" : "unhealthy"} color={s.healthy ? "success" : "error"} size="small" />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
