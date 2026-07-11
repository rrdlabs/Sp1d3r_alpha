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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
  Grid,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import { apiRequest } from "../../api/client"

interface Tier {
  id: string
  name: string
  price_cents: number
  currency: string
  interval: string
  features: string | Record<string, unknown>
  stripe_price_id: string
  is_active: boolean
  sort_order: number
  created_at: string
}

function formatPrice(cents: number, currency: string): string {
  const dollars = (cents / 100).toFixed(2)
  return currency === "cad" ? `C$${dollars}` : `$${dollars}`
}

const emptyTier: Partial<Tier> = {
  name: "",
  price_cents: 0,
  currency: "usd",
  interval: "monthly",
  features: "",
  stripe_price_id: "",
  is_active: true,
  sort_order: 0,
}

export default function PricingTiers() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Tier | null>(null)
  const [form, setForm] = useState<Partial<Tier>>(emptyTier)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setError("")
    const res = await apiRequest<{ tiers: Tier[] }>("banker", "GET", "/tiers")
    if (res.ok) {
      setTiers(res.data.tiers || [])
    } else {
      setError("Failed to load tiers")
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyTier })
    setDialogOpen(true)
  }

  const openEdit = (tier: Tier) => {
    setEditing(tier)
    setForm({
      name: tier.name,
      price_cents: tier.price_cents,
      currency: tier.currency,
      interval: tier.interval,
      features: typeof tier.features === "string" ? tier.features : JSON.stringify(tier.features || {}, null, 2),
      stripe_price_id: tier.stripe_price_id,
      is_active: tier.is_active,
      sort_order: tier.sort_order,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setError("")
    let featuresParsed: Record<string, unknown> = {}
    try {
      if (form.features && typeof form.features === "string") {
        featuresParsed = JSON.parse(form.features)
      } else if (typeof form.features === "object" && form.features !== null) {
        featuresParsed = form.features as Record<string, unknown>
      }
    } catch {
      setError("Invalid JSON in features field")
      return
    }

    const payload = {
      ...form,
      features: featuresParsed,
      id: editing?.id,
    }

    const res = await apiRequest("banker", "POST", "/tiers", payload)
    if (res.ok) {
      setMsg(editing ? "Tier updated" : "Tier created")
      setDialogOpen(false)
      load()
    } else {
      setError("Failed to save tier")
    }
  }

  const handleDelete = async (tier: Tier) => {
    if (!confirm(`Delete tier "${tier.name}"?`)) return
    const res = await apiRequest("banker", "DELETE", `/tiers/${tier.id}`)
    if (res.ok) {
      setMsg("Tier deleted")
      load()
    } else {
      setError("Failed to delete tier")
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
          Pricing Tiers
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add Tier
        </Button>
      </Box>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Interval</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Features</TableCell>
              <TableCell>Sort Order</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tiers.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{t.name}</TableCell>
                <TableCell>{formatPrice(t.price_cents, t.currency)}</TableCell>
                <TableCell>
                  <Chip label={t.interval} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={t.is_active ? "active" : "inactive"}
                    size="small"
                    color={t.is_active ? "success" : "default"}
                  />
                </TableCell>
                <TableCell>
                  {typeof t.features === "string"
                    ? t.features
                    : JSON.stringify(t.features)}
                </TableCell>
                <TableCell>{t.sort_order}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(t)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(t)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {tiers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" color="text.secondary">
                  No tiers configured
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit Tier" : "Add Tier"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Price (cents)"
                type="number"
                value={form.price_cents || 0}
                onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Currency</InputLabel>
                <Select
                  label="Currency"
                  value={form.currency || "usd"}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <MenuItem value="usd">USD</MenuItem>
                  <MenuItem value="cad">CAD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Interval</InputLabel>
                <Select
                  label="Interval"
                  value={form.interval || "monthly"}
                  onChange={(e) => setForm({ ...form, interval: e.target.value })}
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Sort Order"
                type="number"
                value={form.sort_order || 0}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Stripe Price ID"
                value={form.stripe_price_id || ""}
                onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Features (JSON)"
                multiline
                rows={3}
                value={typeof form.features === "string" ? form.features : JSON.stringify(form.features || {}, null, 2)}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder='{"messages_per_day": 100, "priority_support": true}'
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editing ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
