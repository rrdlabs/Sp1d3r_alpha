import { useState, useEffect } from "react"
import { Box, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress } from "@mui/material"
import StorefrontIcon from "@mui/icons-material/Storefront"
import { apiRequest } from "../api/client"

interface Broker { id: number; name: string; display_name: string; website: string; is_active: boolean }

export default function BrokerManagement() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<{ items: Broker[] }>("cityhall", "GET", "/admin/brokers").then((res: any) => {
      if (res.ok) setBrokers(res.data.items || [])
      setLoading(false)
    })
  }, [])

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <StorefrontIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Brokers</Typography>
        <Chip label={brokers.length} size="small" />
      </Box>
      {loading ? <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box> : brokers.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}><Typography variant="body2" color="text.secondary">No brokers configured</Typography></Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Website</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
            <TableBody>
              {brokers.map((b) => (
                <TableRow key={b.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{b.display_name || b.name}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{b.website || "—"}</TableCell>
                  <TableCell><Chip size="small" label={b.is_active ? "active" : "inactive"} color={b.is_active ? "success" : "default"} variant="outlined" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
