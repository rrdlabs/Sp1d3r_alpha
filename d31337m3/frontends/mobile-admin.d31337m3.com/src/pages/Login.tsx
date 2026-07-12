import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Container, TextField, Typography, Alert, Paper, CircularProgress } from "@mui/material"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import { useAuth, getDeviceId } from "../context/AuthContext"
import OTPVerification from "./OTPVerification"
import type { OTPPending } from "../context/AuthContext"

export default function Login() {
  const navigate = useNavigate()
  const { login, completeAuth } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpPending, setOtpPending] = useState<OTPPending | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      const result = await login(username, password)
      if (result.ok) navigate("/admin")
      else if ("otp" in result) setOtpPending(result.otp)
      else setError("Invalid credentials")
    } catch { setError("Connection failed") } finally { setLoading(false) }
  }

  if (otpPending) {
    return (
      <OTPVerification
        userId={otpPending.user_id}
        purpose={otpPending.purpose}
        emailHint={otpPending.email_hint}
        deviceId={getDeviceId()}
        onSuccess={(data) => { completeAuth(data); navigate("/admin") }}
      />
    )
  }

  return (
    <Container maxWidth="sm" sx={{ pt: 6 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <AdminPanelSettingsIcon sx={{ fontSize: 48, color: "secondary.main", mb: 1 }} />
        <Typography variant="h4" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Admin Portal</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>D31337m3 Platform Management</Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 2 }} autoFocus />
          <TextField fullWidth type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }} />
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Button fullWidth type="submit" variant="contained" size="large" color="secondary"
            disabled={loading || !username || !password} startIcon={loading ? <CircularProgress size={16} /> : <AdminPanelSettingsIcon />}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Paper>
    </Container>
  )
}
