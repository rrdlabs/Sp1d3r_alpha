import { useTheme } from "@mui/material/styles"
import { Box, Button, Container, Divider, Paper, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"

export default function Paywall() {
  const theme = useTheme()
  const navigate = useNavigate()

  const tiers = [
    { name: "nodeop_free", price: "$0/mo", desc: "7-day trial, 1 search/day", cta: "Free Trial", featured: false },
    { name: "nodeop_basic", price: "$10/mo", desc: "100 searches/day, crawl + super search", cta: "Subscribe", featured: true },
    { name: "nodeop_pro", price: "$50/mo", desc: "Unlimited searches, priority crawl", cta: "Subscribe", featured: false },
    { name: "nodeop_ultimate", price: "$200/mo", desc: "Unlimited everything, run a node", cta: "Subscribe", featured: false },
  ]

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ fontFamily: "monospace", fontWeight: 700, mb: 1 }}>Get D31337m3</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Choose the plan that fits your needs</Typography>

      {tiers.map((t) => (
        <Paper key={t.name} variant="outlined" sx={{
          p: 2, mb: 1.5,
          border: t.featured ? `2px solid ${theme.palette.primary.main}` : undefined,
          bgcolor: t.featured ? "rgba(0, 230, 118, 0.05)" : undefined,
        }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t.name}</Typography>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>{t.price}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t.desc}</Typography>
          <Button variant={t.featured ? "contained" : "outlined"} fullWidth size="small" sx={{ fontWeight: 700 }}
            onClick={() => navigate("/login")}>{t.cta}</Button>
        </Paper>
      ))}

      <Divider sx={{ my: 3 }} />
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
          D31337m3.com — Powered by Sp1d3r Decentralized Private Search Engine — a WEB3 Service by RRDLabs
        </Typography>
      </Box>
    </Container>
  )
}
