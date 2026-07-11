import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import VisibilityIcon from "@mui/icons-material/Visibility"
import { apiRequest } from "../../api/client"

interface Template {
  name: string
  body?: string
}

export default function Documents() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [activeName, setActiveName] = useState("")
  const [editBody, setEditBody] = useState("")
  const [newName, setNewName] = useState("")
  const [newBody, setNewBody] = useState("")

  const load = async () => {
    setError("")
    const res = await apiRequest<{ templates: string[] }>("lawyer", "GET", "/templates")
    if (res.ok) {
      setTemplates((res.data.templates || []).map((n) => ({ name: n })))
    } else {
      setError("Failed to load templates")
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setError("")
    const res = await apiRequest("lawyer", "POST", "/templates", { name: newName.trim(), body: newBody })
    if (res.ok) {
      setMsg(`Template "${newName}" created`)
      setCreateOpen(false)
      setNewName("")
      setNewBody("")
      load()
    } else {
      setError("Failed to create template")
    }
  }

  const handlePreview = async (name: string) => {
    setError("")
    const res = await apiRequest<{ name: string; body: string }>("lawyer", "GET", `/templates/${name}`)
    if (res.ok) {
      setActiveName(name)
      setEditBody(res.data.body || "")
      setPreviewOpen(true)
    } else {
      setError("Failed to load template")
    }
  }

  const handleEdit = async (name: string) => {
    setError("")
    const res = await apiRequest<{ name: string; body: string }>("lawyer", "GET", `/templates/${name}`)
    if (res.ok) {
      setActiveName(name)
      setEditBody(res.data.body || "")
      setEditOpen(true)
    } else {
      setError("Failed to load template")
    }
  }

  const handleSave = async () => {
    setError("")
    const res = await apiRequest("lawyer", "PUT", `/templates/${activeName}`, { body: editBody })
    if (res.ok) {
      setMsg(`Template "${activeName}" saved`)
      setEditOpen(false)
      load()
    } else {
      setError("Failed to save template")
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return
    setError("")
    const res = await apiRequest("lawyer", "DELETE", `/templates/${name}`)
    if (res.ok) {
      setMsg(`Template "${name}" deleted`)
      load()
    } else {
      setError("Failed to delete template")
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
          Document Templates
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Template
        </Button>
      </Box>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Template Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.name} hover>
                <TableCell>
                  <Chip label={t.name} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handlePreview(t.name)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="primary" onClick={() => handleEdit(t.name)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(t.name)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" color="text.secondary">
                  No templates yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: "monospace" }}>New Template</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Template Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            placeholder="e.g. service-agreement"
          />
          <TextField
            fullWidth
            multiline
            rows={12}
            label="Template Body (supports {client_name}, {broker_name}, {broker_details}, {signature})"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: "monospace" }}>
          Preview: {activeName}
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, bgcolor: "grey.900", fontFamily: "monospace", fontSize: "0.85rem", whiteSpace: "pre-wrap", minHeight: 200 }}>
            {editBody || "(empty)"}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: "monospace" }}>
          Edit: {activeName}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={16}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            sx={{ mt: 1, fontFamily: "monospace", fontSize: "0.85rem" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
