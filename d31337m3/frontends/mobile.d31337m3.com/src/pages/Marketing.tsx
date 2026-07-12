import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box, Button, Container, Typography, Paper, Grid, Card, CardContent, Divider, Chip,
} from "@mui/material"
import BugReportIcon from "@mui/icons-material/BugReport"
import LockIcon from "@mui/icons-material/Lock"
import SearchIcon from "@mui/icons-material/Search"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import ComputerIcon from "@mui/icons-material/Computer"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import { useAuth } from "../context/AuthContext"
import { apiRequest } from "../api/client"

interface Tier { id: string; name: string; price_cents: number; interval: string; features: string | string[] }
function parseFeatures(f: string | string[]): string[] { return typeof f === "string" ? (tryParse(f)) : (Array.isArray(f) ? f : []) }
function tryParse(s: string): string[] { try { return JSON.parse(s) } catch { return [] } }

export default function Marketing() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [tiers, setTiers] = useState<Tier[]>([])
  useEffect(() => { apiRequest<{ tiers: Tier[] }>("banker", "GET", "/tiers").then((r) => { if (r.ok) setTiers(r.data.tiers || []) }) }, [])

  return (
    <Box>
      <Box sx={{ py: 6, textAlign: "center", background: "linear-gradient(180deg, rgba(124,77,255,0.12) 0%, transparent 100%)" }}>
        <Chip icon={<LockIcon />} label="E2E Encrypted" color="success" sx={{ mb: 2 }} />
        <Typography variant="h3" sx={{ fontFamily: "monospace", fontWeight: 900, fontSize: "2rem", mb: 1 }}>D31337m3</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>The Decentralized Privacy Platform</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 2 }}>
          Search the web without being tracked. Find your leaked data. Take action against brokers.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate(token ? "/dashboard" : "/register")}>
          {token ? "Go to Dashboard" : "Get Started Free"}
        </Button>
      </Box>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center", mb: 2 }}>Features</Typography>
        <Grid container spacing={1.5}>
          {[
            { icon: <SearchIcon sx={{ fontSize: 36, color: "primary.main" }} />, title: "Encrypted Crawling", desc: "Submit URLs for encrypted crawling." },
            { icon: <AutoAwesomeIcon sx={{ fontSize: 36, color: "primary.main" }} />, title: "Super Search", desc: "Query multiple engines, encrypted." },
            { icon: <LockIcon sx={{ fontSize: 36, color: "success.main" }} />, title: "Zero Knowledge", desc: "Only you can read your results." },
            { icon: <AccountTreeIcon sx={{ fontSize: 36, color: "secondary.main" }} />, title: "Blockchain Verified", desc: "Tamper-proof evidence on-chain." },
            { icon: <ComputerIcon sx={{ fontSize: 36, color: "info.main" }} />, title: "Run a Node", desc: "Earn free Pro subscription." },
            { icon: <BugReportIcon sx={{ fontSize: 36, color: "warning.main" }} />, title: "Threat Monitoring", desc: "Continuous data leak detection." },
          ].map((f) => (
            <Grid size={{ xs: 6 }} key={f.title}>
              <Paper variant="outlined" sx={{ p: 1.5, height: "100%", textAlign: "center" }}>
                <Box sx={{ mb: 0.5 }}>{f.icon}</Box>
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>{f.title}</Typography>
                <Typography variant="caption" color="text.secondary">{f.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ py: 4, bgcolor: "background.paper" }}>
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <AutoAwesomeIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
          <Typography variant="h5" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>Super Search</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Query Google, Bing, and DuckDuckGo simultaneously. Results encrypted end-to-end.
          </Typography>
          <Button variant="contained" onClick={() => navigate(token ? "/dashboard" : "/register")}>Try Super Search</Button>
        </Container>
      </Box>

      {tiers.length > 0 && (
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: 700, textAlign: "center", mb: 2 }}>Pricing</Typography>
          {tiers.map((tier) => {
            const features = parseFeatures(tier.features)
            return (
              <Card key={tier.id} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{tier.name}</Typography>
                  <Typography variant="h4" color="primary" sx={{ my: 1 }}>
                    ${(tier.price_cents / 100).toFixed(2)}
                    <Typography variant="body2" component="span" color="text.secondary">/{tier.interval}</Typography>
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  {features.map((f, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                      <Typography variant="body2">{f}</Typography>
                    </Box>
                  ))}
                  <Button fullWidth variant="contained" sx={{ mt: 1.5 }} onClick={() => navigate(token ? "/dashboard/subscribe" : "/register")}>
                    {token ? "Subscribe" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </Container>
      )}

      <Box sx={{ py: 6, textAlign: "center" }}>
        <BugReportIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
        <Typography variant="h5" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>Take Back Your Privacy</Typography>
        <Button variant="contained" size="large" onClick={() => navigate(token ? "/dashboard" : "/register")}>
          {token ? "Go to Dashboard" : "Get Started Free"}
        </Button>
      </Box>

      <Box component="footer" sx={{ py: 2, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">
          D31337m3.com — Powered by Sp1d3r — a WEB3 Service by{" "}
          <a href="https://rrdlabs.online" target="_blank" rel="noopener">RRDLabs</a>
        </Typography>
      </Box>
    </Box>
  )
}
