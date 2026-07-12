import { useState, useEffect } from "react"
import { Box, Container, Paper, Typography, Alert, Divider, Chip } from "@mui/material"
import SearchPanel from "../../components/SearchPanel"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"

interface UserProfile { username: string; email: string; subscription: { tier: string; status: string; expires_at: number | null }; trial_used: boolean; searches_remaining: number; created_at: number }

export default function UserDashboard() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [trialExhausted, setTrialExhausted] = useState(false)

  useEffect(() => {
    if (!token) return
    apiRequest<UserProfile>("cityhall", "GET", "/v1/users/me", undefined, { Authorization: `Bearer ${token}` })
      .then((res) => { if (res.ok) setProfile(res.data) })
  }, [token])

  const trialUsed = profile?.trial_used ?? false
  const hasActiveSub = profile?.subscription?.status === "active"
  const isTrial = profile?.subscription?.tier === "nodeop_free"

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {profile && isTrial && !hasActiveSub && (
        <Alert severity={trialExhausted ? "error" : "warning"} sx={{ mb: 2 }}>
          {trialExhausted ? "Trial limit reached." : `Trial active — ${profile.searches_remaining ?? 0} searches remaining`}
        </Alert>
      )}

      <SearchPanel
        hasActiveSub={hasActiveSub}
        trialUsed={trialUsed}
        onTrialExhausted={() => setTrialExhausted(true)}
      />

      {profile && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: "monospace", mb: 1 }}>Account</Typography>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body2"><b>Username:</b> {profile.username}</Typography>
            <Typography variant="body2"><b>Email:</b> {profile.email}</Typography>
            <Typography variant="body2">
              <b>Tier:</b>{" "}
              <Chip label={profile.subscription?.tier || "nodeop_free"} size="small" color={hasActiveSub ? "primary" : "default"} variant="outlined" />
            </Typography>
            <Typography variant="body2"><b>Created:</b> {new Date(profile.created_at * 1000).toLocaleDateString()}</Typography>
          </Box>
        </Paper>
      )}
    </Container>
  )
}
