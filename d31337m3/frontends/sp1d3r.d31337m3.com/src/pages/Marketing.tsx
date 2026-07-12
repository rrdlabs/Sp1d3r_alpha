import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import BugReportIcon from "@mui/icons-material/BugReport"
import HubIcon from "@mui/icons-material/Hub"
import SearchIcon from "@mui/icons-material/Search"
import LockIcon from "@mui/icons-material/Lock"
import ComputerIcon from "@mui/icons-material/Computer"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import GavelIcon from "@mui/icons-material/Gavel"
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"
import { useAuth } from "../context/AuthContext"
import { apiRequest } from "../api/client"

const problems = [
  { text: "Data brokers sell your personal information to strangers" },
  { text: "Search engines track every query you make" },
  { text: "Your data is scattered across hundreds of websites" },
  { text: "Traditional tools can't remove data once it's been leaked" },
]

const solutions = [
  {
    icon: <SearchIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    title: "Encrypted Crawling",
    desc: "Submit any URL and our decentralized network crawls it — results encrypted with your public key before they leave the server.",
  },
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    title: "Super Search",
    desc: "Query Google, Bing, and DuckDuckGo simultaneously. Results aggregated, deduplicated, and ranked by cross-engine consensus — all encrypted end-to-end.",
  },
  {
    icon: <LockIcon sx={{ fontSize: 48, color: "success.main" }} />,
    title: "Zero Knowledge Architecture",
    desc: "X25519 + AES-256-GCM encryption means even we can't read your search results. Cryptographic guarantees, not trust.",
  },
  {
    icon: <AccountTreeIcon sx={{ fontSize: 48, color: "secondary.main" }} />,
    title: "Blockchain Evidence",
    desc: "Every search result is committed to an immutable chain. Tamper-proof evidence for legal proceedings or personal records.",
  },
  {
    icon: <GavelIcon sx={{ fontSize: 48, color: "warning.main" }} />,
    title: "Automated Removal",
    desc: "Generate legal documents and send takedown requests to data brokers. GDPR, CCPA, and more — automated.",
  },
  {
    icon: <ComputerIcon sx={{ fontSize: 48, color: "info.main" }} />,
    title: "Run a Node, Get Pro Free",
    desc: "Deploy a Sp1d3r node in minutes. Strengthen the network and earn a free Professional subscription.",
  },
]

const stats = [
  { value: "3", label: "Search Engines Combined" },
  { value: "E2E", label: "Encrypted Results" },
  { value: "0", label: "Tracking or Profiling" },
  { value: "24/7", label: "Network Monitoring" },
]

interface Tier {
  id: string
  name: string
  price_cents: number
  interval: string
  features: string | string[]
}

function parseFeatures(features: string | string[]): string[] {
  if (typeof features === "string") {
    try { return JSON.parse(features) } catch { return [] }
  }
  return Array.isArray(features) ? features : []
}

export default function Marketing() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [tiers, setTiers] = useState<Tier[]>([])

  useEffect(() => {
    apiRequest<{ tiers: Tier[] }>("banker", "GET", "/tiers").then((res) => {
      if (res.ok) setTiers(res.data.tiers || [])
    })
  }, [])

  return (
    <Box>
      <Box
        sx={{
          py: 16,
          textAlign: "center",
          background: "linear-gradient(180deg, rgba(124,77,255,0.12) 0%, rgba(0,230,118,0.06) 50%, transparent 100%)",
        }}
      >
        <Container maxWidth="md">
          <Chip
            icon={<LockIcon />}
            label="E2E Encrypted"
            color="success"
            sx={{ mb: 3 }}
          />
          <Typography
            variant="h1"
            sx={{
              fontFamily: "monospace",
              fontWeight: 900,
              fontSize: { xs: "2.5rem", md: "4rem" },
              mb: 2,
            }}
          >
            D31337m3
          </Typography>
          <Typography
            variant="h4"
            color="text.secondary"
            sx={{ mb: 3, fontWeight: 300 }}
          >
            The Decentralized Privacy Platform
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 5, maxWidth: 600, mx: "auto", lineHeight: 1.6 }}
          >
            Search the web without being tracked. Find your leaked data without exposing yourself.
            Take action against data brokers — all from one encrypted platform.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              size="large"
              sx={{ px: 5, py: 1.5 }}
              onClick={() => navigate(token ? "/dashboard" : "/register")}
            >
              {token ? "Go to Dashboard" : "Get Started Free"}
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{ px: 5, py: 1.5 }}
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center", mb: 4 }}>
          The Problem
        </Typography>
        <List sx={{ maxWidth: 500, mx: "auto" }}>
          {problems.map((p, i) => (
            <ListItem key={i}>
              <ListItemIcon>
                <VisibilityOffIcon color="error" />
              </ListItemIcon>
              <ListItemText primary={p.text} />
            </ListItem>
          ))}
        </List>
      </Container>

      <Box sx={{ py: 8, bgcolor: "background.paper" }}>
        <Container maxWidth="lg">
          <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
            The Solution
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 6, textAlign: "center" }}>
            Everything you need to protect your digital identity
          </Typography>
          <Grid container spacing={4}>
            {solutions.map((s) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.title}>
                <Paper
                  sx={{
                    p: 3,
                    height: "100%",
                    transition: "0.2s",
                    "&:hover": { transform: "translateY(-4px)", borderColor: "primary.main" },
                  }}
                  variant="outlined"
                >
                  <Box sx={{ mb: 2 }}>{s.icon}</Box>
                  <Typography variant="h6" gutterBottom>
                    {s.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
          By the Numbers
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 6, textAlign: "center" }}>
          What makes D31337m3 different
        </Typography>
        <Grid container spacing={4} sx={{ justifyContent: "center" }}>
          {stats.map((s) => (
            <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
              <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="h2" color="primary" sx={{ fontFamily: "monospace", fontWeight: 900 }}>
                  {s.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {s.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ py: 8, bgcolor: "background.paper" }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <AutoAwesomeIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            Super Search
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 3, fontWeight: 300 }}>
            The world&apos;s first encrypted private meta-search engine
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: "auto" }}>
            Query Google, Bing, and DuckDuckGo simultaneously. Results are deduplicated,
            ranked by cross-engine consensus, and encrypted with your public key.
            No tracking. No profiling. No compromise.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(token ? "/dashboard" : "/register")}
          >
            Try Super Search
          </Button>
        </Container>
      </Box>

      <Box sx={{ py: 8, bgcolor: "background.paper" }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <LockIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            Your Data, Your Keys
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Every search result is encrypted with X25519 end-to-end encryption.
            Not even we can read your data. Cryptographic proof, not corporate promises.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(token ? "/dashboard" : "/register")}
          >
            {token ? "Start Searching" : "Start Now — It's Free"}
          </Button>
        </Container>
      </Box>

      <Box sx={{ py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <HubIcon sx={{ fontSize: 56, color: "secondary.main", mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            Join the Network
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Run a Sp1d3r node and earn a free Professional subscription
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: "auto" }}>
            Deploy a node with Docker in minutes. Help strengthen the decentralized network,
            earn reputation, and unlock full platform access at no cost.
          </Typography>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate("/nodes")}
          >
            Learn About Nodes
          </Button>
        </Container>
      </Box>

      {tiers.length > 0 && (
        <Box sx={{ py: 8, bgcolor: "background.paper" }}>
          <Container maxWidth="lg">
            <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
              Pricing
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 6, textAlign: "center" }}>
              Choose the plan that fits your needs
            </Typography>
            <Grid container spacing={4} sx={{ justifyContent: "center" }}>
              {tiers.map((tier) => {
                const features = parseFeatures(tier.features)
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tier.id}>
                    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                          {tier.name}
                        </Typography>
                        <Typography variant="h3" color="primary" gutterBottom>
                          ${(tier.price_cents / 100).toFixed(2)}
                          <Typography variant="body2" component="span" color="text.secondary">
                            /{tier.interval}
                          </Typography>
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                          {features.map((feat, i) => (
                            <Box component="li" key={i} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                              <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
                              <Typography variant="body2">{feat}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                      <Box sx={{ p: 2, pt: 0 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          size="large"
                          onClick={() => navigate(token ? "/dashboard/subscribe" : "/register")}
                        >
                          {token ? "Subscribe" : "Get Started"}
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Container>
        </Box>
      )}

      <Box
        sx={{
          py: 12,
          textAlign: "center",
          background: "linear-gradient(180deg, transparent 0%, rgba(124,77,255,0.08) 100%)",
        }}
      >
        <Container maxWidth="md">
          <BugReportIcon sx={{ fontSize: 72, color: "primary.main", mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            Take Back Your Privacy
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Start with a free trial. No credit card required.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ px: 5, py: 1.5 }}
            onClick={() => navigate(token ? "/dashboard" : "/register")}
          >
            {token ? "Go to Dashboard" : "Get Started Free"}
          </Button>
        </Container>
      </Box>

      <Box component="footer" sx={{ py: 4, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          <a href="https://d31337m3.com" style={{ fontFamily: "monospace", fontWeight: 700, color: "inherit", textDecoration: "none" }}>
            D31337m3.com
          </a>
          {" — Powered by "}
          <a href="/nodes" style={{ color: "inherit", textDecoration: "none" }}>
            Sp1d3r Decentralized Private Search Engine
          </a>
          {" — a WEB3 Service by "}
          <a href="https://rrdlabs.online" target="_blank" rel="noopener" style={{ color: "inherit", fontWeight: 700, textDecoration: "none" }}>
            RRDLabs
          </a>
        </Typography>
      </Box>
    </Box>
  )
}
