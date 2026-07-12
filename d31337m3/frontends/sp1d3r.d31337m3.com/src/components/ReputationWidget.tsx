import { useState, useEffect } from "react"
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material"
import StarsIcon from "@mui/icons-material/Stars"
import { apiRequest } from "../api/client"

interface ReputationScore {
  user_id: string
  platform_score: number
  onchain_score: number
  composite_score: number
  badges: string[]
  last_calculated: string | null
}

interface ReputationEvent {
  id: string
  event_type: string
  points: number
  description: string
  attestation_tx_hash: string | null
  created_at: string
}

const BADGE_LABELS: Record<string, { label: string; color: "error" | "warning" | "info" | "success" | "default" }> = {
  trusted: { label: "Trusted", color: "success" },
  established: { label: "Established", color: "info" },
  active: { label: "Active", color: "info" },
  newcomer: { label: "Newcomer", color: "warning" },
  unranked: { label: "Unranked", color: "default" },
}

const EVENT_LABELS: Record<string, string> = {
  search: "Search performed",
  document: "Document generated",
  node_uptime: "Node uptime",
  subscription: "Active subscription",
  account_age: "Account age",
  attestation: "On-chain attestation",
}

export default function ReputationWidget() {
  const [score, setScore] = useState<ReputationScore | null>(null)
  const [events, setEvents] = useState<ReputationEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [scoreRes, eventsRes] = await Promise.all([
        apiRequest<ReputationScore>("cityhall", "GET", "/reputation"),
        apiRequest<ReputationEvent[]>("cityhall", "GET", "/reputation/events"),
      ])
      if (scoreRes.ok) setScore(scoreRes.data)
      if (eventsRes.ok) setEvents(eventsRes.data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress size={24} />
      </Paper>
    )
  }

  if (!score) return null

  const badge = BADGE_LABELS[score.badges?.[0] || "unranked"] || BADGE_LABELS.unranked

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <StarsIcon color="primary" />
        <Typography variant="h6" sx={{ fontFamily: "monospace" }}>Reputation</Typography>
        <Chip size="small" label={badge.label} color={badge.color} sx={{ ml: "auto" }} />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Composite Score</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{score.composite_score}/100</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={score.composite_score}
          color={score.composite_score >= 60 ? "success" : score.composite_score >= 30 ? "warning" : "error"}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Platform</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>{score.platform_score}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">On-Chain</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "secondary.main" }}>{score.onchain_score}</Typography>
        </Box>
      </Box>

      {score.last_calculated && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Last updated: {new Date(score.last_calculated).toLocaleString()}
        </Typography>
      )}

      <Divider sx={{ mb: 2 }} />

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Recent Events</Typography>
      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No events yet.</Typography>
      ) : (
        <List dense disablePadding>
          {events.slice(0, 10).map((ev) => (
            <ListItem key={ev.id} disablePadding sx={{ py: 0.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2">{ev.description}</Typography>
                    <Chip size="small" label={`+${ev.points}`} color="success" variant="outlined" sx={{ ml: 1 }} />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {EVENT_LABELS[ev.event_type] || ev.event_type}
                    {ev.attestation_tx_hash && ` · tx: ${ev.attestation_tx_hash.slice(0, 12)}...`}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  )
}
