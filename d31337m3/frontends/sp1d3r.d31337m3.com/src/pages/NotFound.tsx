import { Box, Button, Container, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"
import BugReportIcon from "@mui/icons-material/BugReport"
import HomeIcon from "@mui/icons-material/Home"
import DashboardIcon from "@mui/icons-material/Dashboard"

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          textAlign: "center",
        }}
      >
        <BugReportIcon sx={{ fontSize: 96, color: "primary.main", mb: 3 }} />
        <Typography variant="h1" sx={{ fontWeight: 700, fontFamily: "monospace", mb: 1 }}>
          404
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
          Page not found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            onClick={() => navigate("/")}
          >
            Home
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<DashboardIcon />}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </Button>
        </Box>
      </Box>
    </Container>
  )
}
