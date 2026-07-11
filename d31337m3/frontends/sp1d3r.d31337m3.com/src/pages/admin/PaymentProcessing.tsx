import { useState, useEffect, useCallback } from "react"
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
  TextField,
  Grid,
  Collapse,
  IconButton,
  Alert,
} from "@mui/material"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp"
import SearchIcon from "@mui/icons-material/Search"
import { apiRequest } from "../../api/client"

interface Subscription {
  id: string
  user_id: string
  tier_name: string
  status: string
  payment_method: string
  failed_attempts: number
  created_at: string
}

interface Payment {
  id: string
  amount_cents: number
  method: string
  status: string
  provider: string
  error_message: string
  created_at: string
}

function statusColor(s: string): "success" | "warning" | "error" | "default" {
  switch (s) {
    case "active":
      return "success"
    case "pending_payment":
      return "warning"
    case "suspended":
      return "error"
    default:
      return "default"
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function SubscriptionRow({ sub }: { sub: Subscription }) {
  const [open, setOpen] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loaded, setLoaded] = useState(false)

  const loadPayments = useCallback(async () => {
    if (loaded) return
    const res = await apiRequest<{ payments: Payment[] }>(
      "banker",
      "GET",
      `/subscriptions/${sub.id}/payments`,
    )
    if (res.ok) {
      setPayments(res.data.payments || [])
    }
    setLoaded(true)
  }, [sub.id, loaded])

  const handleToggle = async () => {
    if (!open) await loadPayments()
    setOpen(!open)
  }

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={handleToggle}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{sub.user_id}</TableCell>
        <TableCell>{sub.tier_name}</TableCell>
        <TableCell>
          <Chip label={sub.status} size="small" color={statusColor(sub.status)} />
        </TableCell>
        <TableCell>{sub.payment_method || "—"}</TableCell>
        <TableCell>{sub.failed_attempts}</TableCell>
        <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, pl: 4 }}>
              <Typography variant="subtitle2" gutterBottom>
                Payment History
              </Typography>
              {payments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No payment records
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Amount</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Provider</TableCell>
                        <TableCell>Error</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{formatCents(p.amount_cents)}</TableCell>
                          <TableCell>{p.method}</TableCell>
                          <TableCell>
                            <Chip
                              label={p.status}
                              size="small"
                              color={p.status === "succeeded" ? "success" : "error"}
                            />
                          </TableCell>
                          <TableCell>{p.provider}</TableCell>
                          <TableCell sx={{ color: "error.main", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.error_message || "—"}
                          </TableCell>
                          <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function PaymentProcessing() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [allSubs, setAllSubs] = useState<Subscription[]>([])
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setError("")
    const res = await apiRequest<{ subscriptions: Subscription[] }>("banker", "GET", "/subscriptions")
    if (res.ok) {
      const list = res.data.subscriptions || []
      setAllSubs(list)
      setSubs(list)
    } else {
      setError("Failed to load subscriptions")
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    let filtered = allSubs
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.user_id.toLowerCase().includes(q) ||
          s.tier_name.toLowerCase().includes(q),
      )
    }
    if (filterStatus) {
      filtered = filtered.filter((s) => s.status === filterStatus)
    }
    setSubs(filtered)
  }, [search, filterStatus, allSubs])

  const totalActive = allSubs.filter((s) => s.status === "active").length
  const totalSuspended = allSubs.filter((s) => s.status === "suspended").length

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Payment Processing
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: "center" }} variant="outlined">
            <Typography variant="h4" color="success.main">{totalActive}</Typography>
            <Typography variant="body2" color="text.secondary">Total Active</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: "center" }} variant="outlined">
            <Typography variant="h4" color="error.main">{totalSuspended}</Typography>
            <Typography variant="body2" color="text.secondary">Total Suspended</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: "center" }} variant="outlined">
            <Typography variant="h4" color="text.primary">{allSubs.length}</Typography>
            <Typography variant="body2" color="text.secondary">Total Subscriptions</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            label="Search by user ID or tier"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            size="small"
            select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ minWidth: 150 }}
            slotProps={{ select: { native: true } }}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </TextField>
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={() => {}}>
            Filter
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>User ID</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment Method</TableCell>
              <TableCell>Failed Attempts</TableCell>
              <TableCell>Created At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subs.map((s) => (
              <SubscriptionRow key={s.id} sub={s} />
            ))}
            {subs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" color="text.secondary">
                  No subscriptions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  )
}
