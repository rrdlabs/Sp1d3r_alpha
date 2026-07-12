import { useState, useEffect } from "react"
import { Box, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button } from "@mui/material"
import AttachMoneyIcon from "@mui/icons-material/AttachMoney"
import { apiRequest } from "../api/client"

interface Tier { id: string; name: string; price_cents: number; interval: string; features: string | string[] }

export default function PricingTiers() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<{ tiers: Tier[] }>("banker", "GET", "/tiers").then((res: any) => {
      if (res.ok) setTiers(res.data.tiers || [])
      setLoading(false)
    })
  }, [])

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <AttachMoneyIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Pricing Tiers</Typography>
        <Chip label={tiers.length} size="small" />
      </Box>
      {loading ? <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box> : tiers.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">No tiers configured</Typography>
          <Button variant="contained" sx={{ mt: 1 }} color="secondary">Create Tier</Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Price</TableCell><TableCell>Interval</TableCell></TableRow></TableHead>
            <TableBody>
              {tiers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{t.name}</TableCell>
                  <TableCell color="primary">${(t.price_cents / 100).toFixed(2)}</TableCell>
                  <TableCell>{t.interval}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
