import { useState } from "react"
import { useNavigate, Link as RouterLink } from "react-router-dom"
import { Avatar, Box, Button, Container, IconButton, InputAdornment, Link, Paper, TextField, Typography } from "@mui/material"
import { useTheme } from "@mui/material/styles"
import Visibility from "@mui/icons-material/Visibility"
import VisibilityOff from "@mui/icons-material/VisibilityOff"
import { useAuth, getDeviceId } from "../context/AuthContext"
import OTPVerification from "./OTPVerification"
import type { OTPPending } from "../context/AuthContext"

export default function Register() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { register, completeAuth } = useAuth()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpPending, setOtpPending] = useState<OTPPending | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      const result = await register({ username, email, password })
      if (result.ok) navigate("/dashboard")
      else if ("otp" in result) setOtpPending(result.otp)
      else setError("Registration failed")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally { setLoading(false) }
  }

  if (otpPending) {
    return (
      <OTPVerification
        userId={otpPending.user_id}
        purpose={otpPending.purpose}
        emailHint={otpPending.email_hint}
        deviceId={getDeviceId()}
        onSuccess={(data) => { completeAuth(data); navigate("/dashboard") }}
      />
    )
  }

  return (
    <Container maxWidth="xs" sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Paper elevation={0} sx={{ width: "100%", p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, color: "black", width: 48, height: 48, mb: 1 }}>
            <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>D3</Typography>
          </Avatar>
          <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>D31337m3</Typography>
          <Typography variant="body2" color="text.secondary">Create your account</Typography>
        </Box>
        {error && <Box sx={{ mb: 1 }}><Typography color="error" variant="body2">{error}</Typography></Box>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} margin="normal" required size="small" autoFocus />
          <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} margin="normal" required size="small" />
          <TextField fullWidth label="Password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" required size="small"
            slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) } }} />
          <Button fullWidth variant="contained" type="submit" disabled={loading} sx={{ mt: 2, py: 1, fontFamily: "monospace", fontWeight: 700 }}>
            {loading ? "Creating account..." : "Register"}
          </Button>
        </form>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Link component={RouterLink} to="/login" variant="body2">Already have an account? Sign In</Link>
        </Box>
      </Paper>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, fontFamily: "monospace", fontSize: "0.7rem", textAlign: "center" }}>
        D31337m3.com — Powered by Sp1d3r Decentralized Private Search Engine — a WEB3 Service by RRDLabs
      </Typography>
    </Container>
  )
}
