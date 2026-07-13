import { useEffect, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  LinearProgress,
  Chip,
  Alert,
} from "@mui/material"
import ServerIcon from "@mui/icons-material/Dns"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import TimerIcon from "@mui/icons-material/Timer"
import { useAuth } from "../../context/AuthContext"

interface NodeStatus {
  name: string
  status: string
  healthy: boolean
  last_seen: number
  pubkey?: string
  height?: number
  version?: string
  failures?: number
  restart_count?: number
}

interface PlatformHealth {
  platform_status: string
  healthy: number
  degraded: number
  total: number
}

function timeSince(ts: number): string {
  const sec = Math.floor(Date.now() / 1000) - ts
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

export default function NodeDashboard() {
  const { token } = useAuth()
  const [nodes, setNodes] = useState<NodeStatus[]>([])
  const [platform, setPlatform] = useState<PlatformHealth | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const [nodesRes, healthRes] = await Promise.allSettled([
          fetch("/director/nodes"),
          fetch("/director/platform-health"),
        ])
        if (nodesRes.status === "fulfilled") {
          const data = await nodesRes.value.json()
          setNodes(data.nodes || [])
        }
        if (healthRes.status === "fulfilled") {
          const data = await healthRes.value.json()
          setPlatform(data)
        }
      } catch {
        setError("Failed to fetch node status")
      } finally {
        setLoading(false)
      }
    }
    fetchNodes()
    const interval = setInterval(fetchNodes, 30000)
    return () => clearInterval(interval)
  }, [token])

  const onlineNodes = nodes.filter((n) => n.status === "running" && n.healthy)
  const offlineNodes = nodes.filter((n) => !n.healthy || n.status !== "running")

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
        Node Operator Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Monitor your Sp1d3r nodes and network health
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <ServerIcon color="primary" />
                <Typography variant="h6">Total Nodes</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: "bold" }}>{nodes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">Online</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: "bold", color: "success.main" }}>{onlineNodes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <ErrorIcon color="error" />
                <Typography variant="h6">Offline</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: "bold", color: "error.main" }}>{offlineNodes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {platform && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Platform Status</Typography>
            <Chip
              label={platform.platform_status.toUpperCase()}
              color={platform.platform_status === "healthy" ? "success" : platform.platform_status === "degraded" ? "warning" : "error"}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {platform.healthy}/{platform.total} services healthy
            </Typography>
            {platform.degraded > 0 && (
              <Typography variant="body2" color="warning.main">
                {platform.degraded} service(s) degraded
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
        Node List
      </Typography>
      {nodes.length === 0 && !loading && (
        <Alert severity="info">No nodes registered yet. Nodes appear here after enrollment.</Alert>
      )}
      <Grid container spacing={2}>
        {nodes.map((node) => (
          <Grid size={{ xs: 12, md: 6 }} key={node.name}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>{node.name}</Typography>
                  <Chip
                    size="small"
                    icon={node.healthy ? <CheckCircleIcon /> : <ErrorIcon />}
                    label={node.healthy ? "Online" : "Offline"}
                    color={node.healthy ? "success" : "error"}
                  />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <TimerIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Last seen: {node.last_seen ? timeSince(node.last_seen) : "never"}
                  </Typography>
                </Box>
                {node.pubkey && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", wordBreak: "break-all" }}>
                    Key: {node.pubkey.slice(0, 16)}...
                  </Typography>
                )}
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  {node.height !== undefined && (
                    <Chip size="small" label={`Height: ${node.height}`} variant="outlined" />
                  )}
                  {node.version && (
                    <Chip size="small" label={`v${node.version}`} variant="outlined" />
                  )}
                  {(node.failures ?? 0) > 0 && (
                    <Chip size="small" label={`Failures: ${node.failures}`} color="warning" variant="outlined" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}
