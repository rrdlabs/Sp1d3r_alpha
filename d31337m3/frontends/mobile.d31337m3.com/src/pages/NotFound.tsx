import { Box, Container, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
      <Typography variant="h1" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "3rem" }}>404</Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>Page not found</Typography>
      <Box component="button" onClick={() => navigate("/")} sx={{
        background: "none", border: "none", color: "primary.main", cursor: "pointer",
        fontFamily: "monospace", fontWeight: 700, fontSize: "0.875rem", textDecoration: "underline",
      }}>Go Home</Box>
    </Container>
  )
}
