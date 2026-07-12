import { useState, useEffect } from "react"
import { Box, Button, Container, Divider, Paper, TextField, Typography } from "@mui/material"
import { useAuth } from "../../context/AuthContext"
import { apiRequest } from "../../api/client"

interface UserProfile { username: string; email: string; subscription: { tier: string; status: string; expires_at: number | null }; created_at: number }

export default function UserSettings() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!token) return
    apiRequest<UserProfile>("cityhall", "GET", "/v1/users/me", undefined, { Authorization: `Bearer ${token}` })
      .then((res) => {
        if (res.ok) { setProfile(res.data); setUsername(res.data.username); setEmail(res.data.email) }
      })
  }, [token])

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700, mb: 2 }}>Settings</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <TextField fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} margin="normal" size="small" />
        <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} margin="normal" size="small" />
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button variant="contained" onClick={handleSave} size="small">{saved ? "Saved!" : "Save"}</Button>
        </Box>
      </Paper>

      {profile && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Subscription</Typography>
          <Typography variant="body2"><b>Tier:</b> {profile.subscription?.tier || "nodeop_free"}</Typography>
          <Typography variant="body2"><b>Status:</b> {profile.subscription?.status || "none"}</Typography>
        </Paper>
      )}
    </Container>
  )
}
