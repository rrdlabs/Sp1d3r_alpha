import { Box, Container, Typography, Paper } from "@mui/material"
import DescriptionIcon from "@mui/icons-material/Description"

export default function Documents() {
  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <DescriptionIcon color="secondary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Documents</Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
        <DescriptionIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Document generation and management coming soon. Legal templates for GDPR, CCPA, and data removal requests.
        </Typography>
      </Paper>
    </Container>
  )
}
