import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material"
import LockIcon from "@mui/icons-material/Lock"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import SpeedIcon from "@mui/icons-material/Speed"
import PublicIcon from "@mui/icons-material/Public"
import CompareArrowsIcon from "@mui/icons-material/CompareArrows"
import FilterListIcon from "@mui/icons-material/FilterList"
import { useNavigate } from "react-router-dom"

interface SuperSearchLearnMoreProps {
  open: boolean
  onClose: () => void
}

export default function SuperSearchLearnMore({ open, onClose }: SuperSearchLearnMoreProps) {
  const navigate = useNavigate()

  const capabilities = [
    {
      icon: <PublicIcon color="primary" sx={{ mt: 0.3 }} />,
      title: "Multi-Engine Aggregation",
      desc: "Queries Google, Bing, and DuckDuckGo simultaneously. Results from every major search engine, combined into one view.",
    },
    {
      icon: <CompareArrowsIcon color="secondary" sx={{ mt: 0.3 }} />,
      title: "Cross-Engine Deduplication",
      desc: "Smart URL normalization removes duplicates across engines. Each result appears once, ranked by how many engines agree on its relevance.",
    },
    {
      icon: <FilterListIcon color="success" sx={{ mt: 0.3 }} />,
      title: "Intelligent Ranking",
      desc: "Results scored by cross-engine frequency and position. If Google, Bing, and DuckDuckGo all agree a result matters, it ranks higher.",
    },
    {
      icon: <LockIcon color="warning" sx={{ mt: 0.3 }} />,
      title: "E2E Encrypted Results",
      desc: "Every result is encrypted with X25519 + AES-256-GCM before it reaches you. Your search queries and results stay private.",
    },
    {
      icon: <AccountTreeIcon color="info" sx={{ mt: 0.3 }} />,
      title: "Blockchain Verified",
      desc: "Each aggregated result set is committed to the distributed chain. Tamper-proof audit trail for every super search.",
    },
    {
      icon: <SpeedIcon color="primary" sx={{ mt: 0.3 }} />,
      title: "Parallel Execution",
      desc: "All search engines are queried in parallel. The combined top 20 results returned in seconds, not minutes.",
    },
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: "monospace", fontWeight: 700 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          Super Search
          <Chip icon={<LockIcon />} label="Subscribers Only" color="primary" size="small" />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 3 }}>
          <strong>Super Search</strong> is a decentralized private meta-search engine. It combines results from
          every major search engine into a single encrypted response — giving you the full web without the tracking.
        </Typography>

        <Box sx={{ mb: 3, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            How it works:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            1. You enter a search query
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            2. We query Google, Bing, and DuckDuckGo in parallel
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            3. Results are deduplicated, ranked by cross-engine consensus, and top 20 selected
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            4. Each result is encrypted with your public key
          </Typography>
          <Typography variant="body2" color="text.secondary">
            5. Encrypted results committed to blockchain and delivered to you
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Capabilities
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {capabilities.map((cap) => (
            <Box key={cap.title} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              {cap.icon}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {cap.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {cap.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Why not just use Google directly?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Google tracks every search. Bing builds an advertising profile on you. DuckDuckGo only covers one engine.
            Super Search gives you results from all of them, encrypted end-to-end, with no tracking, no profiling,
            and no data left behind.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            It&apos;s the web search you deserve — private, comprehensive, and verifiable.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => {
            onClose()
            navigate("/dashboard/subscribe")
          }}
        >
          Subscribe Now
        </Button>
      </DialogActions>
    </Dialog>
  )
}
