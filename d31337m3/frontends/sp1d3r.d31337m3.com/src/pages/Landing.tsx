import { Box, Button, Container, Grid, Paper, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"
import BugReportIcon from "@mui/icons-material/BugReport"
import SecurityIcon from "@mui/icons-material/Security"
import HubIcon from "@mui/icons-material/Hub"
import VisibilityIcon from "@mui/icons-material/Visibility"
import { useAuth } from "../context/AuthContext"

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
]

export default function Landing() {
  const navigate = useNavigate()
  const { token } = useAuth()

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
            Sp1d3r
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Decentralized reputation management & threat discovery platform
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            {token ? (
              <Button variant="contained" size="large" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="contained" size="large" onClick={() => navigate("/register")}>
                  Get Started
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          {features.map((f) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={f.title}>
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

      <Box component="footer" sx={{ py: 4, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          d31337m3_ORM_alpha &mdash; Built for the decentralized web
        </Typography>
      </Box>
    </Box>
  )
}
