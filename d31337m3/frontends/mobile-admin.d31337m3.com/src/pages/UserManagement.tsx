import { useState, useEffect } from "react"
import {
  Box, Container, Typography, Paper, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
} from "@mui/material"
import PeopleIcon from "@mui/icons-material/People"
import { apiRequest } from "../api/client"

interface User { id: string; username: string; email: string; is_nodeop: boolean; is_admin: boolean; is_super_admin: boolean; signup_date: string }

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    apiRequest<{ items: User[]; total: number }>("cityhall", "GET", "/admin/users").then((res: any) => {
      if (res.ok) setUsers(res.data.items || [])
      setLoading(false)
    })
  }, [])

  const filtered = users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <PeopleIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Users</Typography>
        <Chip label={users.length} size="small" />
      </Box>
      <TextField fullWidth size="small" label="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2 }} />
      {loading ? <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>Username</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell></TableRow></TableHead>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{u.username}</TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell><Chip size="small" label={u.is_nodeop ? "nodeop" : "user"} color={u.is_nodeop ? "primary" : "default"} variant="outlined" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
