import { useState } from "react"
import { Button, Container, Paper, TextField, Typography, Alert, CircularProgress } from "@mui/material"
import { apiRequest } from "../api/client"

interface Props {
  userId: string
  purpose: string
  emailHint: string
  deviceId: string
  onSuccess: (data: { access_token: string; user_id: string; username: string; is_admin: boolean }) => void
}

export default function OTPVerification({ userId, purpose, emailHint, deviceId, onSuccess }: Props) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [resent, setResent] = useState(false)

  const handleVerify = async () => {
    if (code.length !== 6) return
    setError(""); setLoading(true)
    const res = await apiRequest<{ access_token: string; user_id: string; username: string; is_admin: boolean }>(
      "cityhall", "POST", "/auth/otp/verify",
      { user_id: userId, code, purpose, device_id: deviceId },
    )
    setLoading(false)
    if (res.ok) onSuccess(res.data)
    else setError("Invalid or expired code")
  }

  const handleResend = async () => {
    setResending(true); setResent(false); setError("")
    await apiRequest("cityhall", "POST", `/auth/otp/resend?user_id=${userId}&purpose=${purpose}${deviceId ? `&device_id=${deviceId}` : ""}`)
    setResending(false); setResent(true)
  }

  return (
    <Container maxWidth="xs" sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Paper elevation={0} sx={{ width: "100%", p: 3 }}>
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center", mb: 1 }}>Verify OTP</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: "center" }}>
          {purpose === "register"
            ? `We sent a 6-digit code to ${emailHint}. Enter it to activate your account.`
            : `New device detected. We sent a 6-digit code to ${emailHint}. Enter it to continue.`}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {resent && <Alert severity="success" sx={{ mb: 1 }}>New code sent!</Alert>}
        <TextField fullWidth label="6-Digit Code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()} margin="normal" autoFocus
          slotProps={{ htmlInput: { maxLength: 6, style: { textAlign: "center", fontSize: "1.25rem", letterSpacing: "0.25em", fontFamily: "monospace" } } }} />
        <Button fullWidth variant="contained" disabled={loading || code.length !== 6} onClick={handleVerify} sx={{ mt: 2, py: 1, fontFamily: "monospace", fontWeight: 700 }}>
          {loading ? <CircularProgress size={20} /> : "Verify"}
        </Button>
        <Button fullWidth variant="text" disabled={resending} onClick={handleResend} sx={{ mt: 1 }}>
          {resending ? "Sending..." : "Resend Code"}
        </Button>
      </Paper>
    </Container>
  )
}
