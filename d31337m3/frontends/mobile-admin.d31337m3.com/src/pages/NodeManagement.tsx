import { useState, useEffect } from "react"
import { Box, Container, Typography, Paper, Grid, Chip, CircularProgress } from "@mui/material"
import WifiIcon from "@mui/icons-material/Wifi"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import { apiRequest } from "../api/client"

interface LiveNode { name: string; pubkey: string; height: number; version: string; status: string; healthy: boolean; last_seen: number }

export default function NodeManagement() {
  const [nodes, setNodes] = useState<LiveNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<{ nodes: LiveNode[] }>("director", "GET", "/nodes").then((res: any) => {
      if (res.ok) setNodes(res.data.nodes || [])
      setLoading(false)
    })
  }, [])

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <WifiIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Nodes</Typography>
        <Chip label={nodes.length} size="small" />
      </Box>
      {loading ? <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box> : nodes.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">No nodes connected</Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {nodes.map((n) => {
            const online = Date.now() / 1000 - n.last_seen < 120
            return (
              <Grid size={{ xs: 12 }} key={n.name}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{n.name}</Typography>
                    <Chip icon={online ? <CheckCircleIcon /> : <ErrorIcon />} label={online ? "online" : "offline"} color={online ? "success" : "warning"} size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", display: "block" }}>
                    v{n.version || "?"} — Height: {n.height ?? "—"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", display: "block" }}>
                    {n.pubkey?.slice(0, 16)}...
                  </Typography>
                </Paper>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Container>
  )
}
