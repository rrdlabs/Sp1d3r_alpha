import { useEffect, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Grid,
} from "@mui/material"
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch("/director/nodes")
        const data = await res.json()
        setNodes(data.nodes || [])
      } catch {
        setError("Failed to load nodes")
      } finally {
        setLoading(false)
      }
    }
    fetchNodes()
    const interval = setInterval(fetchNodes, 30000)
    return () => clearInterval(interval)
  }, [token])

  const online = nodes.filter((n) => n.healthy && n.status === "running").length
  const offline = nodes.length - online

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: "bold" }} gutterBottom>
        My Nodes
      </Typography>
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>{nodes.length}</Typography>
              <Typography variant="caption">Total</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "success.main" }}>{online}</Typography>
              <Typography variant="caption">Online</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "error.main" }}>{offline}</Typography>
              <Typography variant="caption">Offline</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {nodes.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>No nodes registered yet.</Alert>
      )}

      {nodes.map((node) => (
        <Card key={node.name} variant="outlined" sx={{ mb: 1.5 }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>{node.name}</Typography>
              <Chip
                size="small"
                icon={node.healthy ? <CheckCircleIcon /> : <ErrorIcon />}
                label={node.healthy ? "Online" : "Offline"}
                color={node.healthy ? "success" : "error"}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              <TimerIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {node.last_seen ? timeSince(node.last_seen) : "never"}
              </Typography>
            </Box>
            {node.pubkey && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", wordBreak: "break-all", mt: 0.5 }}>
                {node.pubkey.slice(0, 24)}...
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
              {node.height !== undefined && (
                <Chip size="small" label={`H: ${node.height}`} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              )}
              {node.version && (
                <Chip size="small" label={`v${node.version}`} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
