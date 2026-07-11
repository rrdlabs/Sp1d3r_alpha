import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import { apiRequest } from "../../api/client"

interface AdminUser {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  is_admin: boolean
  is_nodeop: boolean
  is_user: boolean
  created_at: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [query, setQuery] = useState("")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [msg, setMsg] = useState("")

  const loadUsers = async (q?: string, p = 1) => {
    const path = q
      ? `/admin/users/search?q=${encodeURIComponent(q)}&page=${p}&page_size=20`
      : `/admin/users?page=${p}&page_size=20`
    const res = await apiRequest<{ items: AdminUser[]; total: number }>("cityhall", "GET", path)
    if (res.ok) {
      setUsers(res.data.items)
      setTotal(res.data.total)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleSearch = () => {
    setPage(1)
    loadUsers(query || undefined, 1)
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete user ${user.username}?`)) return
    const res = await apiRequest("cityhall", "DELETE", `/admin/users/${user.id}`)
    if (res.ok) {
      setMsg(`Deleted ${user.username}`)
      loadUsers(query || undefined, page)
    } else {
      setMsg("Delete failed")
    }
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        User Management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {total} total users
      </Typography>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Search users"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />}>
            Search
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.first_name} {u.last_name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  {u.is_admin && <Chip label="admin" size="small" color="secondary" sx={{ mr: 0.5 }} />}
                  {u.is_nodeop && <Chip label="node-op" size="small" color="primary" sx={{ mr: 0.5 }} />}
                  {u.is_user && <Chip label="user" size="small" />}
                </TableCell>
                <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setSelected(u)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(u)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2 }}>
        <Button disabled={page <= 1} onClick={() => { setPage((p) => p - 1); loadUsers(query || undefined, page - 1) }}>
          Prev
        </Button>
        <Typography sx={{ lineHeight: "36px" }}>Page {page}</Typography>
        <Button disabled={users.length < 20} onClick={() => { setPage((p) => p + 1); loadUsers(query || undefined, page + 1) }}>
          Next
        </Button>
      </Box>

      {selected && (
        <Dialog open onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit User: {selected.username}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Full admin editing would go here. User ID: {selected.id}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelected(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  )
}
