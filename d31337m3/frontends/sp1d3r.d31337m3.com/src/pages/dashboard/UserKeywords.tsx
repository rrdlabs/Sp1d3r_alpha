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
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead"
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
    if (!confirm("Delete this keyword and all its matches?")) return
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
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Keywords
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track keywords across the web. Get notified when new results appear.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Keywords are scanned by Sp1d3r crawlers. Results appear here and can optionally be sent to your email.
      </Alert>

      <ProfileCompletion />

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: "monospace" }}>Tracked Keywords</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} size="small">
            Add Keyword
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Keyword</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Dashboard</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Added</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {keywords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {loading ? "Loading..." : "No keywords yet. Add one to start tracking."}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {keywords.map((kw) => (
                <TableRow key={kw.id}>
                  <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{kw.keyword}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={kw.is_active ? "active" : "paused"}
                      color={kw.is_active ? "success" : "default"}
                      onClick={() => toggleKeyword(kw)}
                      clickable
                    />
                  </TableCell>
                  <TableCell>{kw.notify_dashboard ? "On" : "Off"}</TableCell>
                  <TableCell>{kw.notify_email ? "On" : "Off"}</TableCell>
                  <TableCell>{kw.created_at ? new Date(kw.created_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => deleteKeyword(kw.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
            Matches
            {unreadCount > 0 && (
              <Chip size="small" label={`${unreadCount} new`} color="error" sx={{ ml: 1 }} />
            )}
          </Typography>
          {unreadCount > 0 && (
            <Button startIcon={<MarkEmailReadIcon />} onClick={markAllRead} size="small">
              Mark All Read
            </Button>
          )}
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Source</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Snippet</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Found</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {loading ? "Loading..." : "No matches found yet. Results appear as crawlers scan the web."}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {matches.map((m) => {
                const kw = keywords.find((k) => k.id === m.keyword_id)
                return (
                  <TableRow key={m.id} sx={{ bgcolor: m.is_read ? "transparent" : "rgba(25, 118, 210, 0.04)" }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {m.source_name || new URL(m.source_url).hostname}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                        {m.source_url.slice(0, 60)}...
                      </Typography>
                    </TableCell>
                    <TableCell><Chip size="small" label={kw?.keyword || "?"} variant="outlined" /></TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.context_snippet || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{m.relevance_score?.toFixed(1) || "—"}</TableCell>
                    <TableCell>{m.discovered_at ? new Date(m.discovered_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" href={m.source_url} target="_blank" rel="noopener"><OpenInNewIcon fontSize="small" /></IconButton>
                      {!m.is_read && (
                        <IconButton size="small" onClick={() => markRead(m.id)}><MarkEmailReadIcon fontSize="small" /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Keyword</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth autoFocus size="small" label="Keyword or phrase"
            value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControlLabel
            control={<Switch checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />}
            label="Send email notifications for matches"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addKeyword}>Add</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
