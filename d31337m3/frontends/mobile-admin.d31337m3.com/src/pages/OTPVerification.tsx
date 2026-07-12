import { useState } from "react"
import { Box, Button, Container, TextField, Typography, Alert, Paper, CircularProgress } from "@mui/material"
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser"
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
    <Container maxWidth="sm" sx={{ pt: 6 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <VerifiedUserIcon sx={{ fontSize: 48, color: "secondary.main", mb: 1 }} />
        <Typography variant="h4" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Verify OTP</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {purpose === "register"
            ? `We sent a 6-digit code to ${emailHint}.`
            : `New device detected. We sent a 6-digit code to ${emailHint}.`}
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {resent && <Alert severity="success" sx={{ mb: 2 }}>New code sent!</Alert>}
        <TextField fullWidth label="6-Digit Code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()} sx={{ mb: 3 }} autoFocus
          slotProps={{ htmlInput: { maxLength: 6, style: { textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5em", fontFamily: "monospace" } } }} />
        <Button fullWidth variant="contained" size="large" color="secondary"
          disabled={loading || code.length !== 6} onClick={handleVerify}
          startIcon={loading ? <CircularProgress size={16} /> : <VerifiedUserIcon />}>
          {loading ? "Verifying..." : "Verify"}
        </Button>
        <Button fullWidth variant="text" disabled={resending} onClick={handleResend} sx={{ mt: 1 }}>
          {resending ? "Sending..." : "Resend Code"}
        </Button>
      </Paper>
    </Container>
  )
}
