import { useState, useEffect } from "react"
import { Box, Container, Typography, Paper, Grid, CircularProgress } from "@mui/material"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import { apiRequest } from "../api/client"

interface ChainState { blocks: number; authenticated_nodes: number; payload_roots: number; events: number; height: number }

export default function BlockchainDetails() {
  const [state, setState] = useState<ChainState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<ChainState>("sp1d3r", "GET", "/v1/chain/state").then((res: any) => {
      if (res.ok) setState(res.data)
      setLoading(false)
    })
  }, [])

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <AccountTreeIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Blockchain</Typography>
      </Box>
      {loading ? <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box> : state ? (
        <Grid container spacing={1.5}>
          {[
            { label: "Height", value: state.height, color: "primary" },
            { label: "Blocks", value: state.blocks, color: "secondary" },
            { label: "Authenticated Nodes", value: state.authenticated_nodes, color: "success.main" },
            { label: "Payload Roots", value: state.payload_roots, color: "info.main" },
            { label: "Events", value: state.events, color: "warning.main" },
          ].map((item) => (
            <Grid size={{ xs: 6 }} key={item.label}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h3" color={item.color as any}>{item.value}</Typography>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : <Typography color="error">Failed to load chain state</Typography>}
    </Container>
  )
}
