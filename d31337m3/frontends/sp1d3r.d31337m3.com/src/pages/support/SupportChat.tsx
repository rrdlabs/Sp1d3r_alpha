import { useState, useEffect, useRef } from "react"
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
  Divider,
  Tab,
  Tabs,
  Chip,
} from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import EmailIcon from "@mui/icons-material/Email"
import ChatIcon from "@mui/icons-material/Chat"
import { apiRequest } from "../../api/client"

interface Message {
  id: number
  channel: string
  sender: string
  recipient: string
  body: string
  metadata: Record<string, unknown>
}

export default function SupportChat() {
  const [tab, setTab] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [channel, setChannel] = useState("general")
  const [body, setBody] = useState("")
  const [recipient, setRecipient] = useState("staff")
  const [chatError, setChatError] = useState("")
  const [chatMsg, setChatMsg] = useState("")
  const [mailTo, setMailTo] = useState("")
  const [mailSubject, setMailSubject] = useState("")
  const [mailBody, setMailBody] = useState("")
  const [mailMsg, setMailMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    setLoading(true)
    setChatError("")
    const res = await apiRequest<{ messages: Message[] }>("inboxer", "GET", `/messages?channel=${channel}`)
    if (res.ok) {
      setMessages(res.data.messages || [])
    } else {
      setChatError("Failed to load messages — is inboxer running?")
      setMessages([])
    }
    setLoading(false)
  }

  useEffect(() => { loadMessages() }, [channel])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const handleSend = async () => {
    if (!body.trim()) return
    setChatError("")
    setChatMsg("")
    const res = await apiRequest<{ status: string }>("inboxer", "POST", "/messages", {
      channel,
      sender: "admin",
      recipient,
      body: body.trim(),
      metadata: {},
    })
    if (res.ok) {
      setChatMsg("Message sent")
      setBody("")
      loadMessages()
    } else {
      setChatError("Failed to send message")
    }
  }

  const handleMail = async () => {
    if (!mailTo || !mailSubject || !mailBody) return
    setMailMsg("")
    const res = await apiRequest<{ status: string }>("inboxer", "POST", "/mail", {
      to_address: mailTo,
      subject: mailSubject,
      body: mailBody,
    })
    if (res.ok) {
      const status = res.data.status || "queued"
      setMailMsg(`Email ${status}`)
      setMailTo("")
      setMailSubject("")
      setMailBody("")
    } else {
      setMailMsg("Failed to send email")
    }
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Support
      </Typography>

      <Paper sx={{ mb: 2 }} variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab icon={<ChatIcon />} label="Messages" iconPosition="start" />
          <Tab icon={<EmailIcon />} label="Email" iconPosition="start" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 2 }} variant="outlined">
          <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
            <TextField
              size="small"
              label="Channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              sx={{ width: 200 }}
            />
            <Button variant="outlined" onClick={loadMessages}>Load</Button>
            {loading && <Chip label="Loading..." size="small" />}
          </Box>

          {chatError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setChatError("")}>{chatError}</Alert>}
          {chatMsg && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setChatMsg("")}>{chatMsg}</Alert>}

          <Paper
            variant="outlined"
            sx={{ height: 400, overflow: "auto", p: 1, mb: 2, bgcolor: "background.default" }}
          >
            <List dense>
              {messages.map((m) => (
                <ListItem key={m.id} alignItems="flex-start" sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        <strong>{m.sender}</strong> to <em>{m.recipient}</em>
                        <Chip label={m.channel} size="small" sx={{ ml: 1, fontSize: "0.65rem" }} />
                      </Typography>
                    }
                    secondary={m.body}
                  />
                </ListItem>
              ))}
              {messages.length === 0 && !loading && (
                <ListItem>
                  <ListItemText secondary="No messages in this channel" />
                </ListItem>
              )}
            </List>
            <div ref={bottomRef} />
          </Paper>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              label="To"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              sx={{ width: 150 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button variant="contained" onClick={handleSend} endIcon={<SendIcon />}>
              Send
            </Button>
          </Box>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3 }} variant="outlined">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <EmailIcon color="primary" />
            <Typography variant="h6">Send Email</Typography>
          </Box>
          {mailMsg && <Alert severity={mailMsg.includes("Failed") ? "error" : "success"} sx={{ mb: 2 }} onClose={() => setMailMsg("")}>{mailMsg}</Alert>}
          <TextField fullWidth size="small" label="To Address" value={mailTo} onChange={(e) => setMailTo(e.target.value)} sx={{ mb: 2 }} placeholder="user@example.com" />
          <TextField fullWidth size="small" label="Subject" value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth multiline rows={4} label="Body" value={mailBody} onChange={(e) => setMailBody(e.target.value)} sx={{ mb: 2 }} />
          <Button variant="contained" onClick={handleMail} endIcon={<SendIcon />}>Send Email</Button>
        </Paper>
      )}
    </Container>
  )
}
