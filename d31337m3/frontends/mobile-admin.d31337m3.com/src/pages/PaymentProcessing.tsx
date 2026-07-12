import { Box, Container, Typography, Paper } from "@mui/material"
import PaymentsIcon from "@mui/icons-material/Payments"

export default function PaymentProcessing() {
  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <PaymentsIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Payments</Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
        <PaymentsIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Payment history and processing dashboard coming soon. Stripe integration for subscription management.
        </Typography>
      </Paper>
    </Container>
  )
}
