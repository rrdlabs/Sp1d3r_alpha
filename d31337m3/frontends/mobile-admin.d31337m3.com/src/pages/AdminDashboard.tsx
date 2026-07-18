import { useState, useEffect } from "react"
import {
  Box, Container, Typography, Paper, Grid, Chip,
} from "@mui/material"
import DashboardIcon from "@mui/icons-material/Dashboard"
import PeopleIcon from "@mui/icons-material/People"
import ComputerIcon from "@mui/icons-material/Computer"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import { apiRequest } from "../api/client"

interface ChainState { blocks: number; authenticated_nodes: number; payload_roots: number; height: number }
interface LiveNode { name: string; healthy: boolean; last_seen: number }
interface UserInfo { id: string; username: string }

export default function AdminDashboard() {
  const [chainState, setChainState] = useState<ChainState | null>(null)
  const [nodes, setNodes] = useState<LiveNode[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [healthOk, setHealthOk] = useState<boolean | null>(null)

  useEffect(() => {
    Promise.all([
      apiRequest("sp1d3r", "GET", "/health"),
      apiRequest<ChainState>("sp1d3r", "GET", "/v1/chain/state"),
      apiRequest<{ nodes: LiveNode[] }>("director", "GET", "/nodes"),
      apiRequest<{ items: UserInfo[] }>("cityhall", "GET", "/admin/users"),
    ]).then(([health, chain, nodesRes, usersRes]) => {
      setHealthOk(health.ok)
      if (chain.ok) setChainState(chain.data)
      if (nodesRes.ok) setNodes(nodesRes.data.nodes || [])
      if (usersRes.ok) setUsers(usersRes.data.items || [])
    })
  }, [])

  const onlineNodes = nodes.filter((n) => Date.now() / 1000 - n.last_seen < 120)

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <DashboardIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Admin Overview</Typography>
      </Box>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <PeopleIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Users</Typography>
            </Box>
            <Typography variant="h4" color="primary">{users.length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <ComputerIcon color="success" sx={{ fontSize: 20 }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Nodes</Typography>
            </Box>
            <Typography variant="h4" color="success.main">{onlineNodes.length}/{nodes.length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <AccountTreeIcon color="secondary" sx={{ fontSize: 20 }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Chain Height</Typography>
            </Box>
            <Typography variant="h4" color="secondary">{chainState?.height ?? "—"}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Sp1d3r</Typography>
            </Box>
            <Chip icon={healthOk ? <CheckCircleIcon /> : <ErrorIcon />}
              label={healthOk === null ? "..." : healthOk ? "Online" : "Offline"}
              color={healthOk ? "success" : "error"} size="small" />
          </Paper>
        </Grid>
      </Grid>

      {nodes.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Connected Nodes</Typography>
          {nodes.map((n) => {
            const online = Date.now() / 1000 - n.last_seen < 120
            return (
              <Box key={n.name} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="body2">{n.name}</Typography>
                <Chip size="small" label={online ? "online" : "offline"} color={online ? "success" : "warning"} />
              </Box>
            )
          })}
        </Paper>
      )}
    </Container>
  )
}
