import { useState, useEffect } from "react"
import {
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
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

const BADGE_LABELS: Record<string, { label: string; color: "error" | "warning" | "info" | "success" | "default" }> = {
  trusted: { label: "Trusted", color: "success" },
  established: { label: "Established", color: "info" },
  active: { label: "Active", color: "info" },
  newcomer: { label: "Newcomer", color: "warning" },
  unranked: { label: "Unranked", color: "default" },
}

export default function ReputationWidget() {
  const [score, setScore] = useState<ReputationScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<ReputationScore>("cityhall", "GET", "/reputation").then((res) => {
      if (res.ok) setScore(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
        <CircularProgress size={20} />
      </Paper>
    )
  }

  if (!score) return null

  const badge = BADGE_LABELS[score.badges?.[0] || "unranked"] || BADGE_LABELS.unranked

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <StarsIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontFamily: "monospace", fontWeight: 700, flex: 1 }}>
          Reputation
        </Typography>
        <Chip size="small" label={badge.label} color={badge.color} />
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Score</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{score.composite_score}/100</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={score.composite_score}
          color={score.composite_score >= 60 ? "success" : score.composite_score >= 30 ? "warning" : "error"}
          sx={{ height: 6, borderRadius: 1 }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Platform</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main", lineHeight: 1.2 }}>{score.platform_score}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">On-Chain</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "secondary.main", lineHeight: 1.2 }}>{score.onchain_score}</Typography>
        </Box>
      </Box>

      {score.last_calculated && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Updated: {new Date(score.last_calculated).toLocaleDateString()}
        </Typography>
      )}
    </Paper>
  )
}
