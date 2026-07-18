import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Container,
  Grid,
  Link,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  Chip,
} from "@mui/material"
import BugReportIcon from "@mui/icons-material/BugReport"
import SecurityIcon from "@mui/icons-material/Security"
import HubIcon from "@mui/icons-material/Hub"
import VisibilityIcon from "@mui/icons-material/Visibility"
import SearchIcon from "@mui/icons-material/Search"
import LockIcon from "@mui/icons-material/Lock"
import ComputerIcon from "@mui/icons-material/Computer"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch"
import GroupsIcon from "@mui/icons-material/Groups"
import KeyIcon from "@mui/icons-material/Key"
import DeviceHubIcon from "@mui/icons-material/DeviceHub"
import { useAuth } from "../context/AuthContext"
import { apiRequest } from "../api/client"

const features = [
  {
    icon: <BugReportIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    title: "Crawl & Discover",
    desc: "Automated web crawling to find your data across brokers and public records.",
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 48, color: "secondary.main" }} />,
    title: "Blockchain Secured",
    desc: "All findings are encrypted and committed to a tamper-proof distributed chain.",
  },
  {
    icon: <HubIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    title: "P2P Network",
    desc: "Decentralized node network strengthens data integrity and availability.",
  },
  {
    icon: <VisibilityIcon sx={{ fontSize: 48, color: "secondary.main" }} />,
    title: "Threat Monitoring",
    desc: "Continuous monitoring for identity threats, data leaks, and broker exposure.",
  },
  {
    icon: <SearchIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    title: "Encrypted Search",
    desc: "Submit URLs for crawling with X25519 end-to-end encryption. Only you can read the results.",
  },
  {
    icon: <ComputerIcon sx={{ fontSize: 48, color: "secondary.main" }} />,
    title: "Run a Node",
    desc: "Deploy a node to strengthen the network and earn a free Professional subscription.",
  },
]

const steps = [
  { num: "1", title: "Sign Up", desc: "Create your account in seconds with email verification." },
  { num: "2", title: "Subscribe", desc: "Choose a plan that fits your needs. Node operators get Pro for free." },
  { num: "3", title: "Search & Monitor", desc: "Submit URLs for encrypted crawling and monitor your digital footprint." },
  { num: "4", title: "Take Action", desc: "Generate legal documents and send removal requests to data brokers." },
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

export default function Landing() {
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
          py: 12,
          textAlign: "center",
          background: "linear-gradient(180deg, rgba(124,77,255,0.08) 0%, transparent 100%)",
        }}
      >
        <Container maxWidth="md">
          <BugReportIcon sx={{ fontSize: 72, color: "primary.main", mb: 2 }} />
          <Typography variant="h2" gutterBottom sx={{ fontFamily: "monospace" }}>
            D31337m3
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
            The Decentralized Privacy Management & Crawling Search Platform
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: "auto" }}>
            Find where your data lives on the web. Powered by Sp1d3r — our decentralized search engine with encrypted crawling, blockchain-secured evidence, and automated removal requests.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            {token ? (
              <Button variant="contained" size="large" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="contained" size="large" onClick={() => navigate("/register")}>
                  Get Started Free
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            background: "linear-gradient(135deg, rgba(0,230,118,0.06) 0%, rgba(124,77,255,0.06) 100%)",
            borderColor: "primary.main",
            borderStyle: "solid",
            borderWidth: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <RocketLaunchIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
              v0.5.0 Public Beta
            </Typography>
            <Chip label="NEW" color="primary" size="small" sx={{ fontWeight: 700 }} />
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 800 }}>
            The platform is live. Multi-node peer operation, end-to-end encrypted search, PEX key exchange,
            and blockchain-secured evidence — all operational and open for early access.
          </Typography>
          <Grid container spacing={3}>
            {[
              { icon: <GroupsIcon sx={{ fontSize: 28, color: "primary.main" }} />, title: "Multi-Node Network", desc: "Run your own node and strengthen the decentralized peer network" },
              { icon: <KeyIcon sx={{ fontSize: 28, color: "secondary.main" }} />, title: "E2E Encrypted Search", desc: "X25519 key exchange — only you can read your results" },
              { icon: <DeviceHubIcon sx={{ fontSize: 28, color: "primary.main" }} />, title: "PEX Key Exchange", desc: "Privacy-Enhanced Exchange with browser-native cryptography" },
              { icon: <SecurityIcon sx={{ fontSize: 28, color: "secondary.main" }} />, title: "Blockchain Evidence", desc: "Tamper-proof chain secures every finding and action" },
            ].map((item) => (
              <Grid size={{ xs: 12, sm: 6 }} key={item.title}>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Box sx={{ mt: 0.5 }}>{item.icon}</Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="contained" size="medium" onClick={() => navigate(token ? "/dashboard" : "/register")}>
              {token ? "Go to Dashboard" : "Join the Beta"}
            </Button>
            <Button variant="outlined" size="medium" onClick={() => navigate("/nodes")}>
              View Network Nodes
            </Button>
          </Box>
        </Paper>
      </Container>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
          Features
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 6, textAlign: "center" }}>
          Everything you need to protect your digital identity
        </Typography>
        <Grid container spacing={4}>
          {features.map((f) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
              <Paper
                sx={{
                  p: 3,
                  height: "100%",
                  textAlign: "center",
                  transition: "0.2s",
                  "&:hover": { transform: "translateY(-4px)", borderColor: "primary.main" },
                }}
                variant="outlined"
              >
                <Box sx={{ mb: 2 }}>{f.icon}</Box>
                <Typography variant="h6" gutterBottom>
                  {f.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {f.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ py: 8, bgcolor: "background.paper" }}>
        <Container maxWidth="md">
          <Typography variant="h3" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
            How It Works
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 6, textAlign: "center" }}>
            Get started in four simple steps
          </Typography>
          <Grid container spacing={4}>
            {steps.map((s) => (
              <Grid size={{ xs: 12, sm: 6 }} key={s.num}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.2rem",
                      flexShrink: 0,
                    }}
                  >
                    {s.num}
                  </Box>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                      {s.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.desc}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {tiers.length > 0 && (
        <Container maxWidth="lg" sx={{ py: 8 }}>
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
      )}

      <Box sx={{ py: 8, bgcolor: "background.paper" }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <LockIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            Your Data, Your Keys
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            All search results are encrypted with X25519 end-to-end encryption.
            Only you can decrypt and read your data — not even we can access it.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(token ? "/dashboard" : "/register")}
          >
            {token ? "Start Searching" : "Start Now"}
          </Button>
        </Container>
      </Box>

      <Box component="footer" sx={{ py: 4, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          <Link href="https://d31337m3.com" color="inherit" sx={{ fontFamily: "monospace", fontWeight: 700 }}>D31337m3.com</Link>
          {" — Powered by "}
          <Link href="/nodes" color="inherit">Sp1d3r Decentralized Private Search Engine</Link>
          {" — a WEB3 Service by "}
          <Link href="https://rrdlabs.online" target="_blank" rel="noopener" color="inherit" sx={{ fontWeight: 700 }}>RRDLabs</Link>
        </Typography>
      </Box>
    </Box>
  )
}
