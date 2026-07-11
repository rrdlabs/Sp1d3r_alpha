import { useState } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material"
import LockIcon from "@mui/icons-material/Lock"
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
    setError("")
    setLoading(true)
    const res = await apiRequest<{ access_token: string; user_id: string; username: string; is_admin: boolean }>(
      "cityhall",
      "POST",
      "/auth/otp/verify",
      { user_id: userId, code, purpose, device_id: deviceId },
    )
    setLoading(false)
    if (res.ok) {
      onSuccess(res.data)
    } else {
      setError("Invalid or expired code")
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResent(false)
    setError("")
    await apiRequest(
      "cityhall",
      "POST",
      `/auth/otp/resend?user_id=${userId}&purpose=${purpose}${deviceId ? `&device_id=${deviceId}` : ""}`,
    )
    setResending(false)
    setResent(true)
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, justifyContent: "center" }}>
          <LockIcon color="primary" />
          <Typography variant="h5" sx={{ fontFamily: "monospace" }}>
            Verification Code
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
          {purpose === "register"
            ? `We sent a 6-digit code to ${emailHint}. Enter it to activate your account.`
            : `New device detected. We sent a 6-digit code to ${emailHint}. Enter it to continue.`}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {resent && <Alert severity="success" sx={{ mb: 2 }}>New code sent!</Alert>}

        <TextField
          fullWidth
          label="6-Digit Code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          margin="normal"
          slotProps={{
            htmlInput: {
              maxLength: 6,
              style: { textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5em", fontFamily: "monospace" },
            },
          }}
          autoFocus
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={loading || code.length !== 6}
          onClick={handleVerify}
          sx={{ mt: 3 }}
        >
          {loading ? <CircularProgress size={24} /> : "Verify"}
        </Button>

        <Button
          fullWidth
          variant="text"
          disabled={resending}
          onClick={handleResend}
          sx={{ mt: 1 }}
        >
          {resending ? "Sending..." : "Resend Code"}
        </Button>
      </Paper>
    </Container>
  )
}
