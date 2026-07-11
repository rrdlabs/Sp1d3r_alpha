import { Link as RouterLink } from "react-router-dom"
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard"
import SecurityIcon from "@mui/icons-material/Security"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch"
import { useAuth } from "../context/AuthContext"

const benefits = [
  {
    icon: CardGiftcardIcon,
    title: "Free Professional Plan",
    description:
      "Node operators receive a complimentary Professional subscription — unlimited crawls, full chain access, priority support.",
  },
  {
    icon: SecurityIcon,
    title: "Strengthen the Network",
    description:
      "Every node adds redundancy, improves crawl coverage, and strengthens P2P consensus across the network.",
  },
  {
    icon: TrendingUpIcon,
    title: "Build Your Reputation",
    description:
      "Your node's uptime and contributions build on-chain reputation, unlocking higher trust tiers and future rewards.",
  },
]

const steps = [
  "Get an enrollment token from an admin (or register as a node operator)",
  "Pull the Docker image: docker pull d31337m3/node-agent",
  "Run the container with your credentials",
  "Your node authenticates, generates a keypair, and joins the chain",
  "It syncs state, participates in P2P gossip, and polls for crawl tasks",
]

const envVars = [
  { variable: "CITYHALL_URL", defaultValue: "http://127.0.0.1:8000", description: "CityHall auth service URL" },
  { variable: "SP1D3R_URL", defaultValue: "http://127.0.0.1:9000", description: "Sp1d3r chain service URL" },
  { variable: "DIRECTOR_URL", defaultValue: "http://127.0.0.1:8400", description: "Director service registry URL" },
  { variable: "AGENT_USERNAME", defaultValue: "\u2014", description: "CityHall username for authentication" },
  { variable: "AGENT_PASSWORD", defaultValue: "\u2014", description: "CityHall password for authentication" },
  { variable: "AGENT_TOKEN", defaultValue: "\u2014", description: "Pre-authenticated JWT (overrides username/password)" },
  { variable: "AGENT_DATA_DIR", defaultValue: "/data", description: "Persistent data directory for keys and state" },
  { variable: "HEARTBEAT_INTERVAL", defaultValue: "30", description: "Seconds between heartbeats to Director" },
  { variable: "SYNC_INTERVAL", defaultValue: "60", description: "Seconds between chain sync checks" },
  { variable: "PEER_URL", defaultValue: "\u2014", description: "Public URL other peers can reach this node" },
]

const whatNodeDoes = [
  "Generates an Ed25519 keypair for identity and signing",
  "Authenticates with CityHall and registers as a peer on the chain",
  "Syncs chain state from seed nodes",
  "Participates in P2P gossip protocol",
  "Polls for crawl tasks and submits content hashes",
  "Sends periodic heartbeats to Director with height/version/status",
  "All payloads are encrypted with X25519 + AES-255-GCM",
]

const dockerCommand = `docker run -d \\
  --name sp1d3r-node \\
  -e CITYHALL_URL=http://your-server:8000 \\
  -e SP1D3R_URL=http://your-server:9000 \\
  -e DIRECTOR_URL=http://your-server:8400 \\
  -e AGENT_USERNAME=your_username \\
  -e AGENT_PASSWORD=your_password \\
  -v sp1d3r-node-data:/data \\
  d31337m3/node-agent`

export default function NodeInfo() {
  const { token } = useAuth()

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ textAlign: "center", mb: 8 }}>
        <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
          Run a Sp1d3r Node
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
          Deploy in minutes. Earn rewards. Secure the network.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680, mx: "auto" }}>
          Sp1d3r nodes are lightweight Python agents that help crawl the web, verify data integrity, and maintain the
          distributed chain. Running a node earns you a free Professional subscription and reputation on the network.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 8 }}>
        {benefits.map((b) => (
          <Grid size={{ xs: 12, md: 4 }} key={b.title}>
            <Paper variant="outlined" sx={{ p: 4, height: "100%", textAlign: "center" }}>
              <b.icon color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                {b.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {b.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        How It Works
      </Typography>
      <Box sx={{ mb: 8 }}>
        {steps.map((step, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, mb: 1.5 }}>
            <Typography
              variant="body1"
              sx={{ fontFamily: "monospace", fontWeight: 700, color: "primary.main", minWidth: 28 }}
            >
              {String(i + 1).padStart(2, "0")}
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: "monospace" }}>
              {step}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Quick Start
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          mb: 8,
          p: 3,
          backgroundColor: "grey.900",
          overflowX: "auto",
        }}
      >
        <Typography
          component="pre"
          sx={{
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "grey.300",
            whiteSpace: "pre",
            m: 0,
          }}
        >
          {dockerCommand}
        </Typography>
      </Paper>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Environment Variables
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 8 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Variable</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Default</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {envVars.map((v) => (
              <TableRow key={v.variable}>
                <TableCell sx={{ fontFamily: "monospace" }}>{v.variable}</TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{v.defaultValue}</TableCell>
                <TableCell>{v.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        What the Node Does
      </Typography>
      <Box component="ul" sx={{ mb: 8, pl: 4 }}>
        {whatNodeDoes.map((item) => (
          <Typography component="li" key={item} variant="body1" sx={{ mb: 1 }}>
            {item}
          </Typography>
        ))}
      </Box>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        System Requirements
      </Typography>
      <Box component="ul" sx={{ mb: 8, pl: 4 }}>
        <Typography component="li" variant="body1" sx={{ mb: 1 }}>
          Docker installed
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 1 }}>
          256MB RAM minimum, 512MB recommended
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 1 }}>
          Stable internet connection
        </Typography>
        <Typography component="li" variant="body1" sx={{ mb: 1 }}>
          Ports: outbound to CityHall (8000), Sp1d3r (9000), Director (8400)
        </Typography>
      </Box>

      <Box sx={{ textAlign: "center", py: 4 }}>
        <Button
          variant="contained"
          size="large"
          component={RouterLink}
          to={token ? "/dashboard" : "/register"}
          startIcon={<RocketLaunchIcon />}
          sx={{ px: 6, py: 1.5 }}
        >
          {token ? "Go to Dashboard" : "Sign Up as Node Operator"}
        </Button>
      </Box>
    </Container>
  )
}
