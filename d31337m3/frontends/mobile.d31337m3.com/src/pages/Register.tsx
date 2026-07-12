import { useState } from "react"
import { useNavigate, Link as RouterLink } from "react-router-dom"
import { Avatar, Box, Button, Container, IconButton, InputAdornment, Link, Paper, Step, StepLabel, Stepper, TextField, Typography } from "@mui/material"
import { useTheme } from "@mui/material/styles"
import Visibility from "@mui/icons-material/Visibility"
import VisibilityOff from "@mui/icons-material/VisibilityOff"
import { useAuth, getDeviceId } from "../context/AuthContext"
import OTPVerification from "./OTPVerification"
import type { OTPPending } from "../context/AuthContext"

const steps = ["Account", "Profile"]

export default function Register() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { register, completeAuth } = useAuth()
  const [active, setActive] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpPending, setOtpPending] = useState<OTPPending | null>(null)
  const [form, setForm] = useState({
    username: "", email: "", password: "", confirm_password: "",
    first_name: "", last_name: "", dob: "",
  })

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const canNext = () => {
    if (active === 0) return form.username && form.email && form.password.length >= 8 && form.password === form.confirm_password
    return form.first_name && form.last_name
  }

  const handleSubmit = async () => {
    setError(""); setLoading(true)
    try {
      const result = await register(form)
      if (result.ok) navigate("/dashboard")
      else if ("otp" in result) setOtpPending(result.otp)
      else setError("Registration failed. Username or email may already be taken.")
    } catch { setError("Registration failed") } finally { setLoading(false) }
  }

  if (otpPending) {
    return (
      <OTPVerification userId={otpPending.user_id} purpose={otpPending.purpose} emailHint={otpPending.email_hint}
        deviceId={getDeviceId()} onSuccess={(data) => { completeAuth(data); navigate("/dashboard") }} />
    )
  }

  return (
    <Container maxWidth="xs" sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Paper elevation={0} sx={{ width: "100%", p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 1 }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, color: "black", width: 48, height: 48, mb: 1 }}>
            <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>D3</Typography>
          </Avatar>
          <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Register</Typography>
        </Box>
        <Stepper activeStep={active} sx={{ mb: 2 }}>
          {steps.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>
        {error && <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>}

        {active === 0 && (
          <Box>
            <TextField fullWidth label="Username" value={form.username} onChange={(e) => update("username", e.target.value)} margin="normal" required size="small" autoFocus />
            <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} margin="normal" required size="small" />
            <TextField fullWidth label="Password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} margin="normal" required size="small"
              slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) } }} />
            <TextField fullWidth label="Confirm Password" type="password" value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} margin="normal" required size="small" />
            {form.password && form.confirm_password && form.password !== form.confirm_password && (
              <Typography color="warning.main" variant="caption">Passwords do not match</Typography>
            )}
          </Box>
        )}

        {active === 1 && (
          <Box>
            <TextField fullWidth label="First Name" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} margin="normal" required size="small" autoFocus />
            <TextField fullWidth label="Last Name" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} margin="normal" required size="small" />
            <TextField fullWidth label="Date of Birth" type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} margin="normal" size="small"
              slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Button disabled={active === 0} onClick={() => setActive((a) => a - 1)} size="small">Back</Button>
          {active < steps.length - 1 ? (
            <Button variant="contained" disabled={!canNext()} onClick={() => setActive((a) => a + 1)} size="small">Next</Button>
          ) : (
            <Button variant="contained" disabled={loading} onClick={handleSubmit} size="small">
              {loading ? "Creating..." : "Create Account"}
            </Button>
          )}
        </Box>
        <Box sx={{ mt: 1.5, textAlign: "center" }}>
          <Link component={RouterLink} to="/login" variant="body2">Already have an account? Sign In</Link>
        </Box>
      </Paper>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, fontFamily: "monospace", fontSize: "0.7rem", textAlign: "center" }}>
        D31337m3.com — Powered by Sp1d3r Decentralized Private Search Engine — a WEB3 Service by RRDLabs
      </Typography>
    </Container>
  )
}
