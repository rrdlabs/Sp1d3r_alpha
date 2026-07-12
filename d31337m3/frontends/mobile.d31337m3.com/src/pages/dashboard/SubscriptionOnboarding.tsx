import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box, Button, Container, Typography, Card, CardContent, Grid, Divider, CircularProgress, Alert,
} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import SubscriptionsIcon from "@mui/icons-material/Subscriptions"
import { apiRequest } from "../../api/client"

interface Tier { id: string; name: string; price_cents: number; interval: string; features: string | string[] }
function parseFeatures(f: string | string[]): string[] { return typeof f === "string" ? (tryParse(f)) : (Array.isArray(f) ? f : []) }
function tryParse(s: string): string[] { try { return JSON.parse(s) } catch { return [] } }

export default function SubscriptionOnboarding() {
  const navigate = useNavigate()
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<{ tiers: Tier[] }>("banker", "GET", "/tiers").then((res) => {
      if (res.ok) setTiers(res.data.tiers || [])
      setLoading(false)
    })
  }, [])

  const handleSubscribe = async (tierId: string) => {
    setSubscribing(tierId)
    // TODO: integrate payment flow
    navigate("/dashboard/subscription")
  }

  if (loading) return <Container sx={{ pt: 4, textAlign: "center" }}><CircularProgress /></Container>

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <SubscriptionsIcon color="primary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Subscribe</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Choose a plan that fits your needs.</Typography>

      <Grid container spacing={2}>
        {tiers.map((tier) => {
          const features = parseFeatures(tier.features)
          return (
            <Grid size={{ xs: 12 }} key={tier.id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{tier.name}</Typography>
                  <Typography variant="h4" color="primary" sx={{ my: 1 }}>
                    ${(tier.price_cents / 100).toFixed(2)}
                    <Typography variant="body2" component="span" color="text.secondary">/{tier.interval}</Typography>
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    {features.map((f, i) => (
                      <Box component="li" key={i} sx={{ mb: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                        <Typography variant="body2">{f}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={() => handleSubscribe(tier.id)}
                    disabled={subscribing === tier.id}>
                    {subscribing === tier.id ? "Processing..." : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>
      {tiers.length === 0 && <Alert severity="info">No plans available yet.</Alert>}
    </Container>
  )
}
