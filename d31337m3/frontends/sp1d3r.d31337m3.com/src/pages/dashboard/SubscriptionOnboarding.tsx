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
} from "@mui/material"
import CreditCardIcon from "@mui/icons-material/CreditCard"
import PaymentIcon from "@mui/icons-material/Payment"
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
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

  useEffect(() => {
    setLoading(true)
    apiRequest<{ tiers: Tier[] }>("banker", "GET", "/tiers").then((res) => {
      if (res.ok) setTiers(res.data.tiers || [])
      else setError("Failed to load subscription tiers")
      setLoading(false)
    }).catch(() => { setError("Failed to load tiers"); setLoading(false) })
  }, [])

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
      setActiveStep(3)
    } else {
      setError("Failed to create subscription")
    }
  }

  const renderChoosePlan = () => {
    if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
    if (tiers.length === 0) return <Alert severity="info">No subscription tiers available.</Alert>
    return (
      <Grid container spacing={3}>
        {tiers.map((tier) => {
          const isSelected = selectedTier?.id === tier.id
          const features = parseFeatures(tier.features)
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tier.id}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%", display: "flex", flexDirection: "column",
                  borderColor: isSelected ? "primary.main" : undefined,
                  borderWidth: isSelected ? 2 : 1, boxShadow: isSelected ? 4 : 0,
                  cursor: "pointer", "&:hover": { boxShadow: 2 },
                }}
                onClick={() => setSelectedTier(tier)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{tier.name}</Typography>
                    {isSelected && <CheckCircleIcon color="primary" />}
                  </Box>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {"$" + (tier.price_cents / 100).toFixed(2)}/{tier.interval}
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
        <Alert severity="info" sx={{ whiteSpace: "pre-line" }}>
          {`Send an Interac e-Transfer to:\n\n`}
          <strong>{result.interac_email}</strong>
          {`\n\nAmount: $${selectedTier ? (selectedTier.price_cents / 100).toFixed(2) : "—"}`}
          {`\nSubscription ID: ${result.subscription_id ?? "—"}`}
          {`\n\nPlease include your subscription ID in the message field.`}
        </Alert>
      )
    }
    if (result?.wallet_address) {
      return (
        <Alert severity="info" sx={{ whiteSpace: "pre-line" }}>
          {`Send crypto payment to:\n\n`}
          <strong>{result.wallet_address}</strong>
          {`\n\nNetworks: ${result.networks?.join(", ") ?? "Polygon, Base"}`}
          {`\nToken: ${result.token ?? "ERC20 USDC/USDT"}`}
          {`\nSubscription ID: ${result.subscription_id ?? "—"}`}
          {`\n\nSend the exact amount in ERC20 tokens to the address above.`}
        </Alert>
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
        {selectedMethod === "crypto" && <Alert severity="info" sx={{ mb: 2 }}>You will be shown a wallet address and network details after confirming.</Alert>}
        {selectedMethod === "interac" && <Alert severity="info" sx={{ mb: 2 }}>You will receive Interac e-Transfer instructions after confirming.</Alert>}
      </>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, fontFamily: "monospace" }}>Subscribe</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Choose a plan and payment method to get started.</Typography>
      <Stepper activeStep={Math.min(activeStep, steps.length - 1)} sx={{ mb: 4 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      <Box sx={{ mb: 4 }}>
        {activeStep === 0 && renderChoosePlan()}
        {activeStep === 1 && renderPaymentMethod()}
        {activeStep === 2 && renderConfirm()}
      </Box>
      {activeStep >= 3 ? (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>You're all set!</Typography>
          <Typography variant="body2">Your subscription has been created. You will receive a confirmation shortly.</Typography>
        </Alert>
      ) : (
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>Back</Button>
          {activeStep < steps.length - 1 ? (
            <Button variant="contained" disabled={(activeStep === 0 && !selectedTier) || loading} onClick={() => setActiveStep((s) => s + 1)}>Next</Button>
          ) : (
            <Button variant="contained" disabled={submitting || !selectedTier} onClick={handleConfirm}>
              {submitting ? <CircularProgress size={24} /> : "Confirm & Pay"}
            </Button>
          )}
        </Box>
      )}
    </Container>
  )
}
