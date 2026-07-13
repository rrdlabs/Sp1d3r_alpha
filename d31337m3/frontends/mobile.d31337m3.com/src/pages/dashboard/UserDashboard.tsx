import { useState, useEffect } from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  CircularProgress,
} from "@mui/material"
import SubscriptionsIcon from "@mui/icons-material/Subscriptions"
import SettingsIcon from "@mui/icons-material/Settings"
import ComputerIcon from "@mui/icons-material/Computer"
import DescriptionIcon from "@mui/icons-material/Description"
import KeyIcon from "@mui/icons-material/Key"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import HubIcon from "@mui/icons-material/Hub"
import DownloadIcon from "@mui/icons-material/Download"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"
import SearchPanel from "../../components/SearchPanel"
import ReputationWidget from "../../components/ReputationWidget"
import ProfileCompletion from "../../components/ProfileCompletion"

interface ChainState {
  blocks: number
  authenticated_nodes: number
  payload_roots: number
  events: number
  height: number
}

interface LiveNode {
  name: string
  pubkey: string
  height: number
  version: string
  status: string
  healthy: boolean
  last_seen: number
}

interface SubStatus {
  has_active_sub: boolean
  active_subscription: { id: string; status: string; tier_id: string } | null
  is_nodeop?: boolean
  subscription_suspended?: boolean
}

export default function UserDashboard() {
  const { username, user } = useAuth()
  const navigate = useNavigate()
  const [chainState, setChainState] = useState<ChainState | null>(null)
  const [liveNodes, setLiveNodes] = useState<LiveNode[]>([])
  const [healthOk, setHealthOk] = useState<boolean | null>(null)
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null)
  const [trialExhausted] = useState(false)

  useEffect(() => {
    const loadChain = async () => {
      const [healthRes, stateRes, nodesRes] = await Promise.all([
        apiRequest("sp1d3r", "GET", "/health"),
        apiRequest<ChainState>("sp1d3r", "GET", "/v1/chain/state"),
        apiRequest<{ nodes: LiveNode[] }>("director", "GET", "/nodes"),
      ])
      setHealthOk(healthRes.ok)
      if (stateRes.ok) setChainState(stateRes.data)
      if (nodesRes.ok) setLiveNodes(nodesRes.data.nodes || [])
    }
    loadChain()
  }, [])

  useEffect(() => {
    apiRequest<SubStatus>("banker", "GET", "/subscription-status?user_id=current").then((res) => {
      if (res.ok) setSubStatus(res.data)
    })
  }, [])

  const hasActiveSub = subStatus?.has_active_sub ?? false
  const trialSearchesUsed = (user as any)?.trial_searches_used ?? 0
  const trialUsed = trialSearchesUsed >= 7
  const searchesRemaining = Math.max(0, 7 - trialSearchesUsed)
  const onlineNodes = liveNodes.filter((n) => Date.now() / 1000 - n.last_seen < 120)

  const handleTrialExhausted = () => {
    navigate("/paywall")
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700, mb: 0.5 }}>
        Welcome, {username}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Monitor your account, run crawls, and view chain status.
      </Typography>

      <ProfileCompletion />

      {!hasActiveSub && (
        <Alert
          severity={trialExhausted ? "error" : "warning"}
          sx={{ mb: 2 }}
          action={
            !trialExhausted ? undefined : undefined
          }
        >
          {trialExhausted
            ? "Trial limit reached. Subscribe to continue."
            : `Trial — ${searchesRemaining} search${searchesRemaining !== 1 ? "es" : ""} remaining`}
        </Alert>
      )}

      {subStatus?.subscription_suspended && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Subscription suspended:</strong> Node offline 72h+.
        </Alert>
      )}

      {!hasActiveSub && (
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            p: 1.5,
            background: "linear-gradient(135deg, rgba(25,118,210,0.08) 0%, rgba(46,125,50,0.08) 100%)",
            borderColor: "primary.main",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <DownloadIcon color="primary" sx={{ fontSize: 32 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
              Run a Node — Get Free Pro
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Deploy a Sp1d3r node, earn free platform access.
            </Typography>
          </Box>
          <Button variant="contained" component={RouterLink} to="/nodes" size="small">
            Learn
          </Button>
        </Paper>
      )}

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6 }}>
          <Paper
            component={RouterLink}
            to="/dashboard/subscription"
            sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1, textDecoration: "none" }}
            variant="outlined"
          >
            <SubscriptionsIcon color={subStatus?.has_active_sub ? "success" : "primary"} sx={{ fontSize: 20 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.2 }}>
                {subStatus?.has_active_sub ? "Active Plan" : "Subscribe"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                {subStatus?.has_active_sub ? subStatus.active_subscription?.tier_id || "Active" : "Choose a plan"}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Paper
            component={RouterLink}
            to="/dashboard/settings"
            sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1, textDecoration: "none" }}
            variant="outlined"
          >
            <SettingsIcon color="primary" sx={{ fontSize: 20 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.2 }}>Settings</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Profile & keys</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Paper
            component={RouterLink}
            to="/dashboard/documents"
            sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1, textDecoration: "none" }}
            variant="outlined"
          >
            <DescriptionIcon color="primary" sx={{ fontSize: 20 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.2 }}>Documents</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Opt-out letters</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Paper
            component={RouterLink}
            to="/dashboard/keywords"
            sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1, textDecoration: "none" }}
            variant="outlined"
          >
            <KeyIcon color="primary" sx={{ fontSize: 20 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.2 }}>Keywords</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Track terms</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid size={{ xs: 4 }}>
          <Paper sx={{ p: 1.5, textAlign: "center" }} variant="outlined">
            <Typography variant="h6" color={healthOk ? "success.main" : "warning.main"} sx={{ lineHeight: 1 }}>
              {healthOk === null ? <CircularProgress size={16} /> : healthOk ? "ON" : "OFF"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Sp1d3r Node</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Paper sx={{ p: 1.5, textAlign: "center" }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
              <AccountTreeIcon color="primary" sx={{ fontSize: 16 }} />
              <Typography variant="h6" color="primary" sx={{ lineHeight: 1 }}>{chainState?.height ?? "—"}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Chain Height</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Paper sx={{ p: 1.5, textAlign: "center" }} variant="outlined">
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
              <HubIcon color="secondary" sx={{ fontSize: 16 }} />
              <Typography variant="h6" color="secondary" sx={{ lineHeight: 1 }}>{chainState?.authenticated_nodes ?? "—"}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Network</Typography>
          </Paper>
        </Grid>
      </Grid>

      {liveNodes.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <ComputerIcon color={onlineNodes.length > 0 ? "success" : "warning"} sx={{ fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
              Nodes ({onlineNodes.length}/{liveNodes.length} online)
            </Typography>
          </Box>
          {liveNodes.slice(0, 5).map((n) => {
            const online = Date.now() / 1000 - n.last_seen < 120
            return (
              <Box key={n.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.5, borderBottom: 1, borderColor: "divider" }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{n.name}</Typography>
                  <Typography variant="caption" color="text.secondary">v{n.version || "?"} · H:{n.height ?? "—"}</Typography>
                </Box>
                <Chip size="small" label={online ? "online" : "stale"} color={online ? "success" : "warning"} sx={{ height: 20 }} />
              </Box>
            )
          })}
        </Paper>
      )}

      <ReputationWidget />

      <Box sx={{ mt: 2 }}>
        <SearchPanel
          hasActiveSub={hasActiveSub}
          trialUsed={trialUsed}
          searchesRemaining={searchesRemaining}
          onTrialExhausted={handleTrialExhausted}
        />
      </Box>
    </Container>
  )
}
