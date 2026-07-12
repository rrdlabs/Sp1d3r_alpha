import { useState, useEffect } from "react"
import {
  Box, Button, Container, Typography, Paper, Chip, Divider, CircularProgress, Alert,
} from "@mui/material"
import SubscriptionsIcon from "@mui/icons-material/Subscriptions"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"

interface SubStatus {
  has_active_sub: boolean
  active_subscription: { id: string; status: string; tier_id: string } | null
  is_nodeop?: boolean
  subscription_suspended?: boolean
}

export default function SubscriptionManagement() {
  const { user } = useAuth()
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<SubStatus>("banker", "GET", "/subscription-status?user_id=current").then((res) => {
      if (res.ok) setSubStatus(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) return <Container sx={{ pt: 4, textAlign: "center" }}><CircularProgress /></Container>

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <SubscriptionsIcon color="primary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Subscription</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Status</Typography>
          <Chip icon={subStatus?.has_active_sub ? <CheckCircleIcon /> : <ErrorIcon />}
            label={subStatus?.has_active_sub ? "Active" : "No Active Plan"}
            color={subStatus?.has_active_sub ? "success" : "default"} size="small" />
        </Box>
        {subStatus?.active_subscription && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" color="text.secondary">Plan: {subStatus.active_subscription.tier_id}</Typography>
            <Typography variant="body2" color="text.secondary">Status: {subStatus.active_subscription.status}</Typography>
          </>
        )}
        {subStatus?.is_nodeop && (
          <Alert severity="info" sx={{ mt: 1 }}>Node operator — free Pro subscription</Alert>
        )}
        {subStatus?.subscription_suspended && (
          <Alert severity="warning" sx={{ mt: 1 }}>Subscription suspended — node offline &gt;72h</Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Trial Status</Typography>
        <Typography variant="body2" color="text.secondary">
          Searches used: {(user as any)?.trial_searches_used ?? 0} / 7
        </Typography>
      </Paper>

      {!subStatus?.has_active_sub && (
        <Button fullWidth variant="contained" onClick={() => window.location.href = "/dashboard/subscribe"}>
          Subscribe Now
        </Button>
      )}
    </Container>
  )
}
