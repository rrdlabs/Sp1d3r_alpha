import { useState, useEffect } from "react"
import {
  Box, Container, Typography, Paper, Chip, Grid, CircularProgress, Alert,
} from "@mui/material"
import ComputerIcon from "@mui/icons-material/Computer"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import { apiRequest } from "../api/client"

interface LiveNode { name: string; pubkey: string; height: number; version: string; status: string; healthy: boolean; last_seen: number }

export default function NodeInfo() {
  const [nodes, setNodes] = useState<LiveNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<{ nodes: LiveNode[] }>("director", "GET", "/nodes").then((res) => {
      if (res.ok) setNodes(res.data.nodes || [])
      setLoading(false)
    })
  }, [])

  const onlineNodes = nodes.filter((n) => Date.now() / 1000 - n.last_seen < 120)

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <ComputerIcon color="primary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Sp1d3r Nodes</Typography>
      </Box>

      <Paper variant="outlined" sx={{
        p: 2, mb: 2,
        background: "linear-gradient(135deg, rgba(46,125,50,0.08) 0%, rgba(25,118,210,0.08) 100%)",
        borderColor: "success.main",
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Free Pro Subscription</Typography>
        <Typography variant="body2" color="text.secondary">
          Deploy a Sp1d3r node and earn a free Professional subscription. Help strengthen the decentralized network.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Visit d31337m3.com/nodes on desktop for setup instructions and firmware.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Network Status</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="h4" color="primary">{loading ? "—" : onlineNodes.length}</Typography>
            <Typography variant="caption" color="text.secondary">Nodes Online</Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="h4" color="secondary">{loading ? "—" : nodes.length}</Typography>
            <Typography variant="caption" color="text.secondary">Total Nodes</Typography>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
      ) : nodes.length === 0 ? (
        <Alert severity="info">No nodes connected yet. Be the first!</Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Connected Nodes</Typography>
          {nodes.map((n) => {
            const online = Date.now() / 1000 - n.last_seen < 120
            return (
              <Box key={n.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, borderBottom: 1, borderColor: "divider" }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{n.name}</Typography>
                  <Typography variant="caption" color="text.secondary">v{n.version || "?"} — Height: {n.height ?? "—"}</Typography>
                </Box>
                <Chip icon={online ? <CheckCircleIcon /> : <ErrorIcon />} label={online ? "online" : "offline"}
                  color={online ? "success" : "warning"} size="small" />
              </Box>
            )
          })}
        </Paper>
      )}
    </Container>
  )
}
