import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
} from "@mui/material"
import EmailIcon from "@mui/icons-material/Email"
import SaveIcon from "@mui/icons-material/Save"
import SendIcon from "@mui/icons-material/Send"
import { apiRequest } from "../../api/client"

interface SmtpSettings {
  host: string
  port: string
  username: string
  password: string
  from_address: string
  use_tls: boolean
}

interface MailRecord {
  id: number
  to_address: string
  subject: string
  status: string
}

export default function EmailSettings() {
  const [settings, setSettings] = useState<SmtpSettings>({
    host: "",
    port: "587",
    username: "",
    password: "",
    from_address: "",
    use_tls: true,
  })
  const [mailHistory, setMailHistory] = useState<MailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [testTo, setTestTo] = useState("")
  const [testMsg, setTestMsg] = useState("")

  const load = async () => {
    setLoading(true)
    const [settingsRes, mailRes] = await Promise.all([
      apiRequest<{ settings: SmtpSettings }>("inboxer", "GET", "/settings"),
      apiRequest<{ mailouts: MailRecord[] }>("inboxer", "GET", "/mail/history"),
    ])
    if (settingsRes.ok) setSettings(settingsRes.data.settings)
    if (mailRes.ok) setMailHistory(mailRes.data.mailouts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg("")
    const res = await apiRequest("inboxer", "POST", "/settings", settings)
    setSaving(false)
    if (res.ok) {
      setMsg("SMTP settings saved successfully")
    } else {
      setMsg("Failed to save settings")
    }
  }

  const handleTestEmail = async () => {
    if (!testTo) return
    setTestMsg("")
    const res = await apiRequest("inboxer", "POST", "/mail", {
      to_address: testTo,
      subject: "Sp1d3r Platform — Test Email",
      body: "This is a test email from the d31337m3 admin panel.",
    })
    if (res.ok) {
      setTestMsg("Test email queued successfully")
      setTestTo("")
    } else {
      setTestMsg("Failed to send test email")
    }
  }

  if (loading) return <Container maxWidth="lg"><CircularProgress sx={{ mt: 4 }} /></Container>

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <EmailIcon color="primary" />
        <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
          Email Settings
        </Typography>
      </Box>

      {msg && <Alert severity={msg.includes("Failed") ? "error" : "success"} sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {testMsg && <Alert severity={testMsg.includes("Failed") ? "error" : "success"} sx={{ mb: 2 }} onClose={() => setTestMsg("")}>{testMsg}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Typography variant="h6" gutterBottom>SMTP Configuration</Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField fullWidth size="small" label="SMTP Host" value={settings.host} onChange={(e) => setSettings({ ...settings, host: e.target.value })} sx={{ mb: 2 }} placeholder="smtp.gmail.com" />
            <TextField fullWidth size="small" label="Port" value={settings.port} onChange={(e) => setSettings({ ...settings, port: e.target.value })} sx={{ mb: 2 }} placeholder="587" />
            <TextField fullWidth size="small" label="Username" value={settings.username} onChange={(e) => setSettings({ ...settings, username: e.target.value })} sx={{ mb: 2 }} />
            <TextField fullWidth size="small" label="Password" type="password" value={settings.password} onChange={(e) => setSettings({ ...settings, password: e.target.value })} sx={{ mb: 2 }} />
            <TextField fullWidth size="small" label="From Address" value={settings.from_address} onChange={(e) => setSettings({ ...settings, from_address: e.target.value })} sx={{ mb: 2 }} placeholder="noreply@d31337m3.com" />
            <FormControlLabel control={<Switch checked={settings.use_tls} onChange={(e) => setSettings({ ...settings, use_tls: e.target.checked })} />} label="Use TLS" sx={{ mb: 2 }} />
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
            <Typography variant="h6" gutterBottom>Test Email</Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField fullWidth size="small" label="Send Test To" value={testTo} onChange={(e) => setTestTo(e.target.value)} sx={{ mb: 2 }} placeholder="admin@d31337m3.com" />
            <Button variant="outlined" startIcon={<SendIcon />} onClick={handleTestEmail}>Send Test Email</Button>
          </Paper>

          <Paper sx={{ p: 3 }} variant="outlined">
            <Typography variant="h6" gutterBottom>Recent Mail</Typography>
            <Divider sx={{ mb: 2 }} />
            {mailHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No emails sent yet</Typography>
            ) : (
              mailHistory.slice(0, 20).map((m) => (
                <Box key={m.id} sx={{ mb: 1, pb: 1, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="body2"><strong>{m.to_address}</strong> — {m.subject}</Typography>
                  <Typography variant="caption" color="text.secondary">Status: {m.status}</Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}
