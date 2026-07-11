import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  TextField,
  MenuItem,
} from "@mui/material"
import CreditCardIcon from "@mui/icons-material/CreditCard"
import PaymentIcon from "@mui/icons-material/Payment"
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import SendIcon from "@mui/icons-material/Send"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"

interface Tier {
  id: string
  name: string
  price_cents: number
  interval: string
  features: string | string[]
}

interface SubscriptionResponse {
  subscription?: { id: string; status: string }
  checkout_url?: string
  subscription_id?: string
  interac_email?: string
  interac_message?: string
  wallet_address?: string
  networks?: string[]
  token?: string
  amount_cents?: number
  nodeop_free?: boolean
  message?: string
}

interface VerifyResponse {
  status: string
  subscription?: { id: string; status: string }
  failed_attempts?: number
  suspended?: boolean
  error?: string
  message?: string
}

interface SubStatus {
  is_nodeop: boolean
  has_active_sub: boolean
  active_subscription: { id: string; status: string; tier_id: string } | null
  pending_subscription: { id: string; status: string } | null
}

const steps = ["Choose Plan", "Payment Method", "Confirm & Pay"]

const paymentMethods = [
  { id: "stripe", label: "Stripe", icon: <CreditCardIcon />, description: "Pay with credit/debit card via Stripe" },
  { id: "interac", label: "Interac e-Transfer", icon: <PaymentIcon />, description: "Send e-transfer to payments@d31337m3.com" },
  { id: "crypto", label: "Crypto", icon: <CurrencyBitcoinIcon />, description: "Pay with ERC20 tokens on Polygon or Base" },
]

function parseFeatures(features: string | string[]): string[] {
  if (typeof features === "string") {
    try { return JSON.parse(features) } catch { return [] }
  }
  return Array.isArray(features) ? features : []
}

export default function SubscriptionOnboarding() {
  const { userId } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null)
  const [selectedMethod, setSelectedMethod] = useState("stripe")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubscriptionResponse | null>(null)
  const [paid, setPaid] = useState(false)

  const [txHash, setTxHash] = useState("")
  const [txNetwork, setTxNetwork] = useState("polygon")
  const [interacConfirmation, setInteracConfirmation] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null)

  const [nodeOpStatus, setNodeOpStatus] = useState<SubStatus | null>(null)
  const [checkingNodeOp, setCheckingNodeOp] = useState(true)

  useEffect(() => {
    if (!userId) return
    setCheckingNodeOp(true)
    apiRequest<SubStatus>("banker", "GET", `/subscription-status?user_id=${userId}`).then((res) => {
      if (res.ok) {
        setNodeOpStatus(res.data)
        if (res.data.has_active_sub) {
          setPaid(true)
        }
      }
      setCheckingNodeOp(false)
    }).catch(() => setCheckingNodeOp(false))
  }, [userId])

  useEffect(() => {
    setLoading(true)
    apiRequest<{ tiers: Tier[] }>("banker", "GET", "/tiers").then((res) => {
      if (res.ok) setTiers(res.data.tiers || [])
      else setError("Failed to load subscription tiers")
      setLoading(false)
    }).catch(() => { setError("Failed to load tiers"); setLoading(false) })
  }, [])

  const handleNodeopSubscribe = async () => {
    if (!userId || !nodeOpStatus) return
    const proTier = tiers.find((t) => t.name.toLowerCase().includes("pro") || t.name.toLowerCase().includes("professional"))
    if (!proTier) {
      setError("Professional tier not found")
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await apiRequest<SubscriptionResponse>("banker", "POST", "/subscriptions/create", {
      user_id: userId,
      tier_id: proTier.id,
      payment_method: "nodeop_free",
    })
    setSubmitting(false)
    if (res.ok && res.data.nodeop_free) {
      setPaid(true)
      setResult(res.data)
    } else {
      setError(res.data.message || "Failed to activate node operator subscription")
    }
  }

  const handleConfirm = async () => {
    if (!selectedTier || !userId) return
    setSubmitting(true)
    setError(null)
    const res = await apiRequest<SubscriptionResponse>("banker", "POST", "/subscriptions/create", {
      user_id: userId,
      tier_id: selectedTier.id,
      payment_method: selectedMethod,
    })
    setSubmitting(false)
    if (res.ok) {
      setResult(res.data)
      if (res.data.checkout_url) { window.location.href = res.data.checkout_url; return }
      if (res.data.nodeop_free) { setPaid(true); return }
    } else {
      setError("Failed to create subscription")
    }
  }

  const handleVerifyCrypto = async () => {
    if (!txHash.trim() || !result?.subscription_id) return
    setVerifying(true)
    setVerifyResult(null)
    setError(null)
    const res = await apiRequest<VerifyResponse>("banker", "POST", "/payments/verify", {
      subscription_id: result.subscription_id,
      provider: "crypto",
      tx_hash: txHash.trim(),
      network: txNetwork,
    })
    setVerifying(false)
    if (res.ok) {
      setVerifyResult(res.data)
      if (res.data.status === "verified") {
        setPaid(true)
      } else {
        setError(
          res.data.suspended
            ? "Payment verification failed. Account suspended after 3 failed attempts."
            : `Verification failed. ${res.data.failed_attempts ?? 0}/3 attempts used. ${res.data.message || ""}`
        )
      }
    } else {
      setError("Failed to verify payment")
    }
  }

  const handleVerifyInterac = async () => {
    if (!interacConfirmation.trim() || !result?.subscription_id) return
    setVerifying(true)
    setVerifyResult(null)
    setError(null)
    const res = await apiRequest<VerifyResponse>("banker", "POST", "/payments/verify", {
      subscription_id: result.subscription_id,
      provider: "interac",
      confirmation: interacConfirmation.trim(),
    })
    setVerifying(false)
    if (res.ok) {
      setVerifyResult(res.data)
      if (res.data.status === "verified") {
        setPaid(true)
      } else {
        setError(
          res.data.suspended
            ? "Payment verification failed. Account suspended after 3 failed attempts."
            : `Verification failed. ${res.data.failed_attempts ?? 0}/3 attempts used.`
        )
      }
    } else {
      setError("Failed to verify payment")
    }
  }

  const renderNodeOpBanner = () => {
    if (!nodeOpStatus?.is_nodeop) return null
    if (nodeOpStatus.has_active_sub) {
      return (
        <Alert severity="success" icon={<AccountTreeIcon />} sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Node Operator Active</Typography>
          <Typography variant="body2">
            You're an active node operator. Your Professional subscription is complimentary.
          </Typography>
          {nodeOpStatus.active_subscription && (
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              Subscription ID: {nodeOpStatus.active_subscription.id}
            </Typography>
          )}
        </Alert>
      )
    }
    return (
      <Alert severity="info" icon={<AccountTreeIcon />} sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Node Operator Benefit</Typography>
        <Typography variant="body2">
          As an active node operator, you're eligible for a complimentary Professional subscription.
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          startIcon={submitting ? <CircularProgress size={20} /> : <AccountTreeIcon />}
          onClick={handleNodeopSubscribe}
          disabled={submitting}
        >
          {submitting ? "Activating..." : "Activate Free Pro Subscription"}
        </Button>
      </Alert>
    )
  }

  const renderChoosePlan = () => {
    if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
    if (tiers.length === 0) return <Alert severity="info">No subscription tiers available.</Alert>
    return (
      <Grid container spacing={3}>
        {tiers.map((tier) => {
          const isSelected = selectedTier?.id === tier.id
          const features = parseFeatures(tier.features)
          const isPro = nodeOpStatus?.is_nodeop && (tier.name.toLowerCase().includes("pro") || tier.name.toLowerCase().includes("professional"))
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tier.id}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%", display: "flex", flexDirection: "column",
                  borderColor: isSelected ? "primary.main" : isPro ? "success.main" : undefined,
                  borderWidth: isSelected ? 2 : isPro ? 2 : 1,
                  boxShadow: isSelected ? 4 : isPro ? 2 : 0,
                  cursor: "pointer", "&:hover": { boxShadow: 2 },
                  position: "relative",
                }}
                onClick={() => setSelectedTier(tier)}
              >
                {isPro && (
                  <Alert severity="success" sx={{ borderRadius: 0, fontSize: "0.75rem" }}>
                    Free for node operators
                  </Alert>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{tier.name}</Typography>
                    {isSelected && <CheckCircleIcon color="primary" />}
                  </Box>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {nodeOpStatus?.is_nodeop && isPro ? (
                      <><s style={{ opacity: 0.5 }}>{"$" + (tier.price_cents / 100).toFixed(2)}</s> $0.00</>
                    ) : (
                      "$" + (tier.price_cents / 100).toFixed(2)
                    )}/{tier.interval}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    {features.map((feat, i) => (
                      <Box component="li" key={i} sx={{ mb: 0.5 }}>
                        <Typography variant="body2">{feat}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button fullWidth variant={isSelected ? "contained" : "outlined"} onClick={(e) => { e.stopPropagation(); setSelectedTier(tier) }}>
                    {isSelected ? "Selected" : "Select"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    )
  }

  const renderPaymentMethod = () => (
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend" sx={{ mb: 2 }}>
        <Typography variant="h6">Select a payment method</Typography>
      </FormLabel>
      <RadioGroup value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
        {paymentMethods.map((pm) => (
          <Paper
            key={pm.id}
            variant="outlined"
            sx={{
              mb: 2, p: 2, cursor: "pointer",
              borderColor: selectedMethod === pm.id ? "primary.main" : undefined,
              borderWidth: selectedMethod === pm.id ? 2 : 1,
              "&:hover": { bgcolor: "action.hover" },
            }}
            onClick={() => setSelectedMethod(pm.id)}
          >
            <FormControlLabel
              value={pm.id}
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  {pm.icon}
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{pm.label}</Typography>
                    <Typography variant="body2" color="text.secondary">{pm.description}</Typography>
                  </Box>
                </Box>
              }
              sx={{ m: 0, width: "100%" }}
            />
          </Paper>
        ))}
      </RadioGroup>
    </FormControl>
  )

  const renderConfirm = () => {
    if (submitting) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>

    if (result?.interac_email) {
      return (
        <Box>
          <Alert severity="info" sx={{ whiteSpace: "pre-line", mb: 3 }}>
            {`Send an Interac e-Transfer to:\n\n`}
            <strong>{result.interac_email}</strong>
            {`\n\nAmount: $${selectedTier ? (selectedTier.price_cents / 100).toFixed(2) : "—"}`}
            {`\nSubscription ID: ${result.subscription_id ?? "—"}`}
            {`\n\nPlease include your subscription ID in the message field.`}
          </Alert>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Submit Proof of Payment</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the Interac confirmation code or reference from your e-transfer receipt.
            </Typography>
            <TextField
              fullWidth
              label="Interac Confirmation Code"
              value={interacConfirmation}
              onChange={(e) => setInteracConfirmation(e.target.value)}
              placeholder="e.g. R1234567890"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              startIcon={verifying ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={handleVerifyInterac}
              disabled={verifying || !interacConfirmation.trim()}
            >
              {verifying ? "Verifying..." : "Submit & Verify"}
            </Button>
            {verifyResult?.status === "verified" && (
              <Alert severity="success" sx={{ mt: 2 }}>Payment verified successfully!</Alert>
            )}
          </Paper>
        </Box>
      )
    }

    if (result?.wallet_address) {
      return (
        <Box>
          <Alert severity="info" sx={{ whiteSpace: "pre-line", mb: 3 }}>
            {`Send crypto payment to:\n\n`}
            <strong>{result.wallet_address}</strong>
            {`\n\nNetworks: ${result.networks?.join(", ") ?? "Polygon, Base"}`}
            {`\nToken: ${result.token ?? "ERC20 USDC/USDT"}`}
            {`\nAmount: $${selectedTier ? (selectedTier.price_cents / 100).toFixed(2) : "—"}`}
            {`\nSubscription ID: ${result.subscription_id ?? "—"}`}
            {`\n\nSend the exact amount in ERC20 tokens to the address above.`}
          </Alert>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Submit Transaction Hash</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              After sending the payment, paste your transaction hash below to verify.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Network"
                  value={txNetwork}
                  onChange={(e) => setTxNetwork(e.target.value)}
                  size="small"
                >
                  {(result.networks?.length ? result.networks : ["polygon", "base"]).map((n) => (
                    <MenuItem key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  label="Transaction Hash"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  sx={{ fontFamily: "monospace" }}
                />
              </Grid>
            </Grid>
            <Button
              variant="contained"
              startIcon={verifying ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={handleVerifyCrypto}
              disabled={verifying || !txHash.trim()}
              sx={{ mt: 2 }}
            >
              {verifying ? "Verifying..." : "Submit & Verify"}
            </Button>
            {verifyResult?.status === "verified" && (
              <Alert severity="success" sx={{ mt: 2 }}>Payment verified successfully!</Alert>
            )}
          </Paper>
        </Box>
      )
    }

    const methodLabel = paymentMethods.find((pm) => pm.id === selectedMethod)?.label ?? selectedMethod
    return (
      <>
        <Typography variant="h6" gutterBottom>Order Summary</Typography>
        <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>Plan</Typography>
            <Typography variant="body1">{selectedTier?.name}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>Price</Typography>
            <Typography variant="body1">
              {"$" + (selectedTier ? (selectedTier.price_cents / 100).toFixed(2) : "0.00") + "/" + (selectedTier?.interval ?? "mo")}
            </Typography>
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>Payment Method</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {paymentMethods.find((pm) => pm.id === selectedMethod)?.icon}
              <Typography variant="body1">{methodLabel}</Typography>
            </Box>
          </Box>
        </Paper>
        {selectedMethod === "crypto" && <Alert severity="info" sx={{ mb: 2 }}>You will be shown a wallet address and asked for your transaction hash after confirming.</Alert>}
        {selectedMethod === "interac" && <Alert severity="info" sx={{ mb: 2 }}>You will receive Interac e-Transfer instructions and asked for your confirmation code after confirming.</Alert>}
      </>
    )
  }

  const showSuccess = paid || (activeStep >= 3)

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, fontFamily: "monospace" }}>Subscribe</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Choose a plan and payment method to get started.</Typography>
      {checkingNodeOp ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {renderNodeOpBanner()}
          {!paid && (
            <Stepper activeStep={Math.min(activeStep, steps.length - 1)} sx={{ mb: 4 }}>
              {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>
          )}
          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
          <Box sx={{ mb: 4 }}>
            {!paid && activeStep === 0 && renderChoosePlan()}
            {!paid && activeStep === 1 && renderPaymentMethod()}
            {!paid && activeStep === 2 && renderConfirm()}
          </Box>
          {showSuccess ? (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>You're all set!</Typography>
              <Typography variant="body2">
                {nodeOpStatus?.is_nodeop
                  ? "Your complimentary node operator subscription is active."
                  : "Your subscription has been created. You will receive a confirmation shortly."}
              </Typography>
            </Alert>
          ) : (
            !paid && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>Back</Button>
                {activeStep < steps.length - 1 ? (
                  <Button variant="contained" disabled={(activeStep === 0 && !selectedTier) || loading} onClick={() => setActiveStep((s) => s + 1)}>Next</Button>
                ) : (
                  !result && (
                    <Button variant="contained" disabled={submitting || !selectedTier} onClick={handleConfirm}>
                      {submitting ? <CircularProgress size={24} /> : "Confirm & Pay"}
                    </Button>
                  )
                )}
              </Box>
            )
          )}
        </>
      )}
    </Container>
  )
}
