import { useState, useEffect } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead"
import KeyIcon from "@mui/icons-material/Key"
import { apiRequest } from "../../api/client"
import ProfileCompletion from "../../components/ProfileCompletion"

interface Keyword {
  id: string
  keyword: string
  is_active: boolean
  notify_dashboard: boolean
  notify_email: boolean
  created_at: string
}

interface Match {
  id: string
  keyword_id: string
  source_url: string
  source_name: string | null
  context_snippet: string | null
  relevance_score: number
  is_read: boolean
  discovered_at: string
}

export default function UserKeywords() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newKeyword, setNewKeyword] = useState("")
  const [notifyEmail, setNotifyEmail] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    const [kwRes, matchRes, unreadRes] = await Promise.all([
      apiRequest<Keyword[]>("cityhall", "GET", "/keywords"),
      apiRequest<Match[]>("cityhall", "GET", "/keywords/matches?unread_only=false"),
      apiRequest<{ count: number }>("cityhall", "GET", "/keywords/matches/unread-count"),
    ])
    if (kwRes.ok) setKeywords(kwRes.data)
    if (matchRes.ok) setMatches(matchRes.data)
    if (unreadRes.ok) setUnreadCount(unreadRes.data.count)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const addKeyword = async () => {
    if (!newKeyword.trim()) return
    await apiRequest("cityhall", "POST", "/keywords", {
      keyword: newKeyword.trim(),
      notify_dashboard: true,
      notify_email: notifyEmail,
    })
    setNewKeyword("")
    setNotifyEmail(false)
    setAddOpen(false)
    loadAll()
  }

  const deleteKeyword = async (id: string) => {
    await apiRequest("cityhall", "DELETE", `/keywords/${id}`)
    loadAll()
  }

  const toggleKeyword = async (kw: Keyword) => {
    await apiRequest("cityhall", "PATCH", `/keywords/${kw.id}`, { is_active: !kw.is_active })
    loadAll()
  }

  const markRead = async (matchId: string) => {
    await apiRequest("cityhall", "POST", `/keywords/matches/${matchId}/read`)
    setUnreadCount((c) => Math.max(0, c - 1))
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, is_read: true } : m))
  }

  const markAllRead = async () => {
    await apiRequest("cityhall", "POST", "/keywords/matches/mark-all-read")
    setUnreadCount(0)
    setMatches((prev) => prev.map((m) => ({ ...m, is_read: true })))
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <KeyIcon color="primary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Keywords</Typography>
        {unreadCount > 0 && <Chip size="small" label={`${unreadCount} new`} color="error" />}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Track keywords across the web
      </Typography>

      <ProfileCompletion />

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Tracked Keywords</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} size="small">
            Add
          </Button>
        </Box>
        {keywords.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
            {loading ? "Loading..." : "No keywords yet"}
          </Typography>
        ) : (
          keywords.map((kw) => (
            <Box key={kw.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, borderBottom: 1, borderColor: "divider" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{kw.keyword}</Typography>
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={kw.is_active ? "active" : "paused"}
                    color={kw.is_active ? "success" : "default"}
                    onClick={() => toggleKeyword(kw)}
                    clickable
                    sx={{ height: 20 }}
                  />
                  {kw.notify_email && <Chip size="small" label="email" variant="outlined" sx={{ height: 20 }} />}
                </Box>
              </Box>
              <IconButton size="small" onClick={() => deleteKeyword(kw.id)}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Matches</Typography>
          {unreadCount > 0 && (
            <Button startIcon={<MarkEmailReadIcon />} onClick={markAllRead} size="small">
              Read All
            </Button>
          )}
        </Box>
        {matches.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
            {loading ? "Loading..." : "No matches found yet"}
          </Typography>
        ) : (
          matches.map((m) => {
            const kw = keywords.find((k) => k.id === m.keyword_id)
            return (
              <Paper
                key={m.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 1,
                  bgcolor: m.is_read ? "transparent" : "rgba(25, 118, 210, 0.04)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {m.source_name || new URL(m.source_url).hostname}
                      </Typography>
                      {!m.is_read && <Chip size="small" label="new" color="error" sx={{ height: 16, fontSize: "0.6rem" }} />}
                    </Box>
                    <Chip size="small" label={kw?.keyword || "?"} variant="outlined" sx={{ height: 18, mb: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {m.context_snippet ? m.context_snippet.slice(0, 80) + (m.context_snippet.length > 80 ? "..." : "") : "---"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                    {!m.is_read && (
                      <Button size="small" onClick={() => markRead(m.id)} sx={{ minWidth: 0, px: 1 }}>
                        Read
                      </Button>
                    )}
                    <IconButton size="small" href={m.source_url} target="_blank" rel="noopener">
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            )
          })
        )}
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: "monospace" }}>Add Keyword</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Keywords are scanned by Sp1d3r crawlers. Results appear here and can optionally be emailed.
          </Alert>
          <TextField
            fullWidth autoFocus label="Keyword" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newKeyword.trim()) addKeyword() }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} size="small" />
            <Typography variant="body2">Email notifications</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addKeyword} disabled={!newKeyword.trim()}>Add</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
