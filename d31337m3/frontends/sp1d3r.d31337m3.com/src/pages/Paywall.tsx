import { useState, useEffect } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Typography,
  Divider,
  Alert,
} from "@mui/material"
import LockIcon from "@mui/icons-material/Lock"
import HubIcon from "@mui/icons-material/Hub"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import SecurityIcon from "@mui/icons-material/Security"
import SpeedIcon from "@mui/icons-material/Speed"
import SupportAgentIcon from "@mui/icons-material/SupportAgent"
import ComputerIcon from "@mui/icons-material/Computer"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import WarningIcon from "@mui/icons-material/Warning"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import { apiRequest } from "../api/client"
import { useAuth } from "../context/AuthContext"

interface Tier {
  id: string
  name: string
  price_cents: number
  interval: string
  features: string | Record<string, unknown>
  is_active: boolean
}

const features = [
  { icon: <LockIcon />, title: "E2E Encrypted Search", desc: "Every search result is encrypted with your X25519 keypair. Only you can read your data." },
  { icon: <HubIcon />, title: "Decentralized Network", desc: "Distributed node architecture — no single point of failure, no central authority." },
  { icon: <AccountTreeIcon />, title: "Immutable Audit Trail", desc: "Every crawl and payload is committed to a tamper-proof chain. Full transparency." },
  { icon: <SecurityIcon />, title: "Zero-Knowledge Design", desc: "The platform never sees your plaintext results. Cryptographic guarantees, not promises." },
  { icon: <SpeedIcon />, title: "Real-Time Monitoring", desc: "Live chain status, node health dashboards, and instant search feedback." },
  { icon: <SupportAgentIcon />, title: "Priority Support", desc: "Direct access to our team for subscribers. Faster response, dedicated help." },
]

export default function Paywall() {
  const { user } = useAuth()
  const [tiers, setTiers] = useState<Tier[]>([])

  useEffect(() => {
    apiRequest<{ tiers: Tier[] }>("banker", "GET", "/tiers").then((res) => {
      if (res.ok) setTiers((res.data.tiers || []).filter((t) => t.is_active))
    })
  }, [])

  const parseFeatures = (f: string | Record<string, unknown>): string[] => {
    if (typeof f === "string") {
      try { return Object.keys(JSON.parse(f)) } catch { return f.split(",").map((s) => s.trim()) }
    }
    return Object.keys(f)
  }

  const trialUsed = (user as any)?.trial_searches_used ?? 0

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Alert severity="info" sx={{ mb: 4 }}>
        You've used {trialUsed} of 7 trial searches. Subscribe to unlock unlimited encrypted searches, or run a node to get Pro free.
      </Alert>

      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>
          Unlock the Full Power of D31337m3
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: "auto" }}>
          End-to-end encrypted web crawling on a decentralized network. Your data, your keys, your privacy. Powered by Sp1d3r.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 8 }}>
        {features.map((f) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
            <Paper variant="outlined" sx={{ p: 3, height: "100%", textAlign: "center" }}>
              <Box sx={{ color: "primary.main", mb: 2 }}>{f.icon}</Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>{f.title}</Typography>
              <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        variant="outlined"
        sx={{
          mb: 6,
          p: 4,
          background: "linear-gradient(135deg, rgba(46,125,50,0.08) 0%, rgba(25,118,210,0.08) 100%)",
          borderColor: "success.main",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <ComputerIcon color="success" sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
              Free for Node Operators
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Run a Sp1d3r node and get a Professional subscription at no cost.
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Deploy a node in minutes with Docker. Help the network, earn reputation, and unlock free platform access permanently.
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button variant="contained" color="success" component={RouterLink} to="/nodes" endIcon={<ArrowForwardIcon />}>
            Set Up a Node
          </Button>
          <Button variant="outlined" component={RouterLink} to="/dashboard" endIcon={<ArrowForwardIcon />}>
            Back to Dashboard
          </Button>
        </Box>
      </Paper>

      {tiers.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
            Subscription Plans
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
            Choose the plan that fits your needs
          </Typography>
          <Grid container spacing={3} sx={{ justifyContent: "center" }}>
            {tiers.map((tier) => {
              const tierFeatures = parseFeatures(tier.features)
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tier.id}>
                  <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>{tier.name}</Typography>
                      <Typography variant="h3" color="primary" gutterBottom>
                        ${(tier.price_cents / 100).toFixed(2)}
                        <Typography variant="body2" component="span" color="text.secondary">
                          /{tier.interval}
                        </Typography>
                      </Typography>
                      {tierFeatures.map((feat) => (
                        <Box key={feat} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                          <Typography variant="body2">{feat}</Typography>
                        </Box>
                      ))}
                    </CardContent>
                    <Button
                      variant="contained"
                      fullWidth
                      component={RouterLink}
                      to="/dashboard/subscribe"
                      sx={{ borderRadius: 0 }}
                    >
                      Subscribe
                    </Button>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Box>
      )}

      <Paper variant="outlined" sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon color="warning" /> Important Notes
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Grandfathered node operators:</strong> Current Pro subscription holders who operate a node will retain their free Pro subscription as long as their node remains operational.
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>72-hour connectivity rule:</strong> If your node goes offline for more than 72 consecutive hours, your free subscription may be temporarily suspended until connectivity is restored.
            </Typography>
          </li>
          <li>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Subject to change:</strong> This free-for-node-operators offer is subject to change as the D31337m3 network evolves and grows. All current active node operators will be grandfathered in with persistent free Pro subscriptions so long as their node remains operational.
            </Typography>
          </li>
        </Box>
      </Paper>

      <Box sx={{ textAlign: "center", py: 4 }}>
        <Button variant="contained" size="large" component={RouterLink} to="/dashboard/subscribe" sx={{ mr: 2 }}>
          Subscribe Now
        </Button>
        <Button variant="outlined" size="large" component={RouterLink} to="/nodes">
          Run a Node Instead
        </Button>
      </Box>
    </Container>
  )
}
