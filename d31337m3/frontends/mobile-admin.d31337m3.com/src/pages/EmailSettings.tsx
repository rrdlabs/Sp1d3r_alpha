import { useState } from "react"
import { Box, Container, Typography, Paper, TextField, Button, Alert, CircularProgress } from "@mui/material"
import EmailIcon from "@mui/icons-material/Email"
import SendIcon from "@mui/icons-material/Send"

export default function EmailSettings() {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setResult(null)
    try {
      const res = await fetch(`${window.location.protocol}//${window.location.hostname}:8300/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      })
      if (res.ok) setResult({ ok: true, msg: "Email sent" })
      else setResult({ ok: false, msg: "Failed to send" })
    } catch { setResult({ ok: false, msg: "Connection failed" }) }
    setLoading(false)
  }

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <EmailIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Email</Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <form onSubmit={handleSend}>
          <TextField fullWidth size="small" label="To" value={to} onChange={(e) => setTo(e.target.value)} sx={{ mb: 1.5 }} />
          <TextField fullWidth size="small" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ mb: 1.5 }} />
          <TextField fullWidth multiline rows={4} size="small" label="Body" value={body} onChange={(e) => setBody(e.target.value)} sx={{ mb: 2 }} />
          {result && <Alert severity={result.ok ? "success" : "error"} sx={{ mb: 2 }}>{result.msg}</Alert>}
          <Button fullWidth type="submit" variant="contained" color="secondary" disabled={loading || !to || !subject}
            startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}>
            {loading ? "Sending..." : "Send Test Email"}
          </Button>
        </form>
      </Paper>
    </Container>
  )
}
