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
  Grid,
  Switch,
  FormControlLabel,
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
  is_super_admin: boolean
  is_nodeop: boolean
  is_tech_op: boolean
  is_chat_op: boolean
  is_user: boolean
  is_employee: boolean
  created_at: string
  signup_date: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [query, setQuery] = useState("")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [editFields, setEditFields] = useState<Partial<AdminUser>>({})
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")

  const loadUsers = async (q?: string, p = 1) => {
    setError("")
    const path = q
      ? `/admin/users/search?q=${encodeURIComponent(q)}&page=${p}&page_size=20`
      : `/admin/users?page=${p}&page_size=20`
    const res = await apiRequest<{ items: AdminUser[]; total: number }>("cityhall", "GET", path)
    if (res.ok) {
      setUsers(res.data.items || [])
      setTotal(res.data.total)
    } else {
      setError("Failed to load users")
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleSearch = () => {
    setPage(1)
    loadUsers(query || undefined, 1)
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete user ${user.username}? This cannot be undone.`)) return
    const res = await apiRequest("cityhall", "DELETE", `/admin/users/${user.id}`)
    if (res.ok) {
      setMsg(`Deleted ${user.username}`)
      loadUsers(query || undefined, page)
    } else {
      setError("Delete failed")
    }
  }

  const handleEdit = (user: AdminUser) => {
    setSelected(user)
    setEditFields({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      is_admin: user.is_admin,
      is_super_admin: user.is_super_admin,
      is_nodeop: user.is_nodeop,
      is_tech_op: user.is_tech_op,
      is_chat_op: user.is_chat_op,
      is_employee: user.is_employee,
    })
  }

  const handleSaveEdit = async () => {
    if (!selected) return
    const res = await apiRequest("cityhall", "PUT", `/admin/users/${selected.id}`, editFields)
    if (res.ok) {
      setMsg(`Updated ${selected.username}`)
      setSelected(null)
      loadUsers(query || undefined, page)
    } else {
      setError("Update failed")
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
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

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
                  {u.is_super_admin && <Chip label="super-admin" size="small" color="error" sx={{ mr: 0.5 }} />}
                  {u.is_admin && <Chip label="admin" size="small" color="secondary" sx={{ mr: 0.5 }} />}
                  {u.is_nodeop && <Chip label="node-op" size="small" color="primary" sx={{ mr: 0.5 }} />}
                  {u.is_tech_op && <Chip label="tech" size="small" color="info" sx={{ mr: 0.5 }} />}
                  {u.is_chat_op && <Chip label="chat" size="small" sx={{ mr: 0.5 }} />}
                  {u.is_employee && <Chip label="employee" size="small" color="warning" sx={{ mr: 0.5 }} />}
                </TableCell>
                <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleEdit(u)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(u)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" color="text.secondary">No users found</TableCell></TableRow>
            )}
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
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth size="small" label="First Name" value={editFields.first_name || ""} onChange={(e) => setEditFields({ ...editFields, first_name: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth size="small" label="Last Name" value={editFields.last_name || ""} onChange={(e) => setEditFields({ ...editFields, last_name: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Email" value={editFields.email || ""} onChange={(e) => setEditFields({ ...editFields, email: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>Roles</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControlLabel control={<Switch checked={!!editFields.is_admin} onChange={(e) => setEditFields({ ...editFields, is_admin: e.target.checked })} />} label="Admin" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControlLabel control={<Switch checked={!!editFields.is_super_admin} onChange={(e) => setEditFields({ ...editFields, is_super_admin: e.target.checked })} />} label="Super Admin" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControlLabel control={<Switch checked={!!editFields.is_nodeop} onChange={(e) => setEditFields({ ...editFields, is_nodeop: e.target.checked })} />} label="Node Operator" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControlLabel control={<Switch checked={!!editFields.is_tech_op} onChange={(e) => setEditFields({ ...editFields, is_tech_op: e.target.checked })} />} label="Tech Support" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControlLabel control={<Switch checked={!!editFields.is_chat_op} onChange={(e) => setEditFields({ ...editFields, is_chat_op: e.target.checked })} />} label="Chat Support" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControlLabel control={<Switch checked={!!editFields.is_employee} onChange={(e) => setEditFields({ ...editFields, is_employee: e.target.checked })} />} label="Employee" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  )
}
