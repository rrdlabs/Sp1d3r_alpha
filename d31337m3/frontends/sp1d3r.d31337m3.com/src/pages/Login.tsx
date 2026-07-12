import { useState } from "react"
import { useNavigate, Link as RouterLink } from "react-router-dom"
import {
  Box,
  Button,
  Container,
  Alert,
  TextField,
  Typography,
  Link,
  Paper,
} from "@mui/material"
import { useAuth, getDeviceId } from "../context/AuthContext"
import OTPVerification from "./OTPVerification"
import type { OTPPending } from "../context/AuthContext"

export default function Login() {
  const { login, completeAuth } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpPending, setOtpPending] = useState<OTPPending | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await login(username, password)
      if (result.ok) {
        navigate("/dashboard")
      } else if ("otp" in result) {
        setOtpPending(result.otp)
      } else {
        setError("Invalid credentials")
      }
    } catch (err) {
      setError("Connection failed — please try again")
    } finally {
      setLoading(false)
    }
  }

  if (otpPending) {
    return (
      <OTPVerification
        userId={otpPending.user_id}
        purpose={otpPending.purpose}
        emailHint={otpPending.email_hint}
        deviceId={getDeviceId()}
        onSuccess={(data) => {
          completeAuth(data)
          navigate("/dashboard")
        }}
      />
    )
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }} variant="outlined">
        <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace", textAlign: "center" }}>
          Sign In
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
          Access your D31337m3 dashboard
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
            autoFocus
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
          />
          <Button
            fullWidth
            variant="contained"
            type="submit"
            size="large"
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          Don't have an account?{" "}
          <Link component={RouterLink} to="/register">
            Register
          </Link>
        </Typography>
      </Paper>
    </Container>
  )
}
