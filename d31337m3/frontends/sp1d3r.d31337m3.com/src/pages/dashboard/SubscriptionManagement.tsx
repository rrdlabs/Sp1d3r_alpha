import { useState, useEffect, useCallback } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material"
import SubscriptionsIcon from "@mui/icons-material/Subscriptions"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CancelIcon from "@mui/icons-material/Cancel"
import PaymentIcon from "@mui/icons-material/Payment"
import AddIcon from "@mui/icons-material/Add"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"

interface Subscription {
  id: string
  user_id: string
  tier_id: string
  status: string
  payment_method: string
  failed_attempts: number
  current_period_start: string
  current_period_end: string
  created_at: string
}

interface Payment {
  id: number
  subscription_id: string
  user_id: string
  amount_cents: number
  currency: string
  payment_method: string
  status: string
  provider: string
  tier_name: string
  created_at: string
}

interface SubData {
  subscriptions: Subscription[]
  payments: Payment[]
}

export default function SubscriptionManagement() {
  const { userId } = useAuth()
  const [subData, setSubData] = useState<SubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const [cancelSuccess, setCancelSuccess] = useState("")

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const res = await apiRequest<SubData>("cityhall", "GET", "/users/me/payments")
    if (res.ok) {
      setSubData(res.data)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCancel = async (subId: string) => {
    setCancelling(true)
    setCancelError("")
    const res = await apiRequest("banker", "POST", `/subscriptions/${subId}/cancel`)
    setCancelling(false)
    if (res.ok) {
      setCancelSuccess("Subscription cancelled successfully")
      setCancelDialogOpen(false)
      loadData()
    } else {
      setCancelError((res.data as any)?.detail || "Failed to cancel subscription")
    }
  }

  const activeSub = subData?.subscriptions?.find((s) => s.status === "active")
  const cancelledSubs = subData?.subscriptions?.filter((s) => s.status === "cancelled") || []
  const payments = subData?.payments || []

  const formatDate = (d: string) => {
    if (!d) return "—"
    try {
      return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return d
    }
  }

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`

  if (loading) return <CircularProgress sx={{ m: 4 }} />

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Subscription
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SubscriptionsIcon color="primary" />
            <Typography variant="h6">Current Plan</Typography>
          </Box>
          {!activeSub && (
            <Button
              variant="contained"
              component={RouterLink}
              to="/dashboard/subscribe"
              startIcon={<AddIcon />}
            >
              Subscribe
            </Button>
          )}
        </Box>

        {activeSub ? (
          <Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <Chip
                icon={<CheckCircleIcon />}
                label="Active"
                color="success"
              />
              <Chip
                label={activeSub.tier_id}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={activeSub.payment_method}
                icon={<PaymentIcon />}
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Subscription ID: {activeSub.id}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Started: {formatDate(activeSub.created_at)}
            </Typography>
            {activeSub.current_period_end && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Next billing: {formatDate(activeSub.current_period_end)}
              </Typography>
            )}
            <Button
              variant="outlined"
              color="error"
              onClick={() => setCancelDialogOpen(true)}
              startIcon={<CancelIcon />}
            >
              Cancel Subscription
            </Button>
          </Box>
        ) : (
          <Alert severity="info">
            You don't have an active subscription. Subscribe to access premium features.
          </Alert>
        )}

        {cancelSuccess && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setCancelSuccess("")}>
            {cancelSuccess}
          </Alert>
        )}
      </Paper>

      {cancelledSubs.length > 0 && (
        <Paper sx={{ p: 3, mt: 2 }} variant="outlined">
          <Typography variant="h6" gutterBottom>Cancelled Plans</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Cancelled</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cancelledSubs.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.tier_id}</TableCell>
                    <TableCell>
                      <Chip size="small" label="Cancelled" color="default" />
                    </TableCell>
                    <TableCell>{formatDate(sub.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Paper sx={{ p: 3, mt: 2 }} variant="outlined">
        <Typography variant="h6" gutterBottom>Payment History</Typography>
        {payments.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
                    <TableCell>{formatAmount(p.amount_cents)}</TableCell>
                    <TableCell>{p.payment_method || p.provider}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.status}
                        color={p.status === "completed" || p.status === "verified" ? "success" : "warning"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No payment history yet.
          </Typography>
        )}
      </Paper>

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.
          </DialogContentText>
          {cancelError && <Alert severity="error" sx={{ mt: 2 }}>{cancelError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Subscription</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => activeSub && handleCancel(activeSub.id)}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling..." : "Cancel Subscription"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
