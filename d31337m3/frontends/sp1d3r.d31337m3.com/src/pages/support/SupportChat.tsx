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
} from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import EmailIcon from "@mui/icons-material/Email"
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
  const [messages, setMessages] = useState<Message[]>([])
  const [channel, setChannel] = useState("general")
  const [body, setBody] = useState("")
  const [recipient, setRecipient] = useState("staff")
  const [mailTo, setMailTo] = useState("")
  const [mailSubject, setMailSubject] = useState("")
  const [mailBody, setMailBody] = useState("")
  const [mailMsg, setMailMsg] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    const res = await apiRequest<{ messages: Message[] }>("inboxer", "GET", `/messages?channel=${channel}`)
    if (res.ok) setMessages(res.data.messages)
  }

  useEffect(() => { loadMessages() }, [channel])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!body.trim()) return
    await apiRequest("inboxer", "POST", "/messages", {
      channel,
      sender: "user",
      recipient,
      body: body.trim(),
      metadata: {},
    })
    setBody("")
    loadMessages()
  }

  const handleMail = async () => {
    if (!mailTo || !mailSubject || !mailBody) return
    setMailMsg("")
    const res = await apiRequest("inboxer", "POST", "/mail", {
      to_address: mailTo,
      subject: mailSubject,
      body: mailBody,
    })
    if (res.ok) {
      setMailMsg("Email sent")
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

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            size="small"
            label="Channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            sx={{ width: 200 }}
          />
          <Button variant="outlined" onClick={loadMessages}>Load</Button>
        </Box>

        <Paper
          variant="outlined"
          sx={{ height: 400, overflow: "auto", p: 1, mb: 2, bgcolor: "background.default" }}
        >
          <List dense>
            {messages.map((m) => (
              <ListItem key={m.id} alignItems="flex-start">
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      <strong>{m.sender}</strong> to <em>{m.recipient}</em>
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {new Date().toLocaleTimeString()}
                      </Typography>
                    </Typography>
                  }
                  secondary={m.body}
                />
              </ListItem>
            ))}
          </List>
          <div ref={bottomRef} />
        </Paper>

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

      <Paper sx={{ p: 3 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <EmailIcon color="primary" />
          <Typography variant="h6">Send Email</Typography>
        </Box>
        {mailMsg && <Alert severity={mailMsg.includes("Failed") ? "error" : "success"} sx={{ mb: 2 }}>{mailMsg}</Alert>}
        <TextField fullWidth size="small" label="To Address" value={mailTo} onChange={(e) => setMailTo(e.target.value)} sx={{ mb: 1 }} />
        <TextField fullWidth size="small" label="Subject" value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} sx={{ mb: 1 }} />
        <TextField fullWidth multiline rows={3} label="Body" value={mailBody} onChange={(e) => setMailBody(e.target.value)} sx={{ mb: 2 }} />
        <Button variant="outlined" onClick={handleMail}>Send Email</Button>
      </Paper>
    </Container>
  )
}
