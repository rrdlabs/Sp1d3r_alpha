import { useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Divider,
  Chip,
} from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import DashboardIcon from "@mui/icons-material/Dashboard"
import PeopleIcon from "@mui/icons-material/People"
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart"
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import TerminalIcon from "@mui/icons-material/Terminal"
import EmailIcon from "@mui/icons-material/Email"
import WifiIcon from "@mui/icons-material/Wifi"
import StorefrontIcon from "@mui/icons-material/Storefront"
import DescriptionIcon from "@mui/icons-material/Description"
import AttachMoneyIcon from "@mui/icons-material/AttachMoney"
import PaymentsIcon from "@mui/icons-material/Payments"
import LogoutIcon from "@mui/icons-material/Logout"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import { useAuth } from "../context/AuthContext"

const DRAWER_WIDTH = 280

export default function AdminMobileLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { username, logout } = useAuth()

  type NavItem = { label: string; path: string; icon: React.ReactNode }
  type DividerItem = { divider: true; label: string }
  const navItems: (NavItem | DividerItem)[] = [
    { label: "Overview", path: "/admin", icon: <DashboardIcon /> },
    { divider: true, label: "Core" },
    { label: "Users", path: "/admin/users", icon: <PeopleIcon /> },
    { label: "Services", path: "/admin/services", icon: <MonitorHeartIcon /> },
    { label: "Health", path: "/admin/health", icon: <HealthAndSafetyIcon /> },
    { label: "Blockchain", path: "/admin/blockchain", icon: <AccountTreeIcon /> },
    { label: "Logs", path: "/admin/logs", icon: <TerminalIcon /> },
    { divider: true, label: "Management" },
    { label: "Email", path: "/admin/email", icon: <EmailIcon /> },
    { label: "Nodes", path: "/admin/network", icon: <WifiIcon /> },
    { label: "Brokers", path: "/admin/brokers", icon: <StorefrontIcon /> },
    { label: "Documents", path: "/admin/documents", icon: <DescriptionIcon /> },
    { label: "Pricing", path: "/admin/pricing", icon: <AttachMoneyIcon /> },
    { label: "Payments", path: "/admin/payments", icon: <PaymentsIcon /> },
  ]

  const handleNav = (path: string) => {
    setDrawerOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    logout()
    setDrawerOpen(false)
    navigate("/login")
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: 700, color: "primary.main" }}>
              D31337m3
            </Typography>
            <Chip icon={<AdminPanelSettingsIcon />} label="Admin" size="small" color="secondary" />
          </Box>
          {username && (
            <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", color: "white", fontSize: "0.875rem" }}>
              {username[0]?.toUpperCase()}
            </Avatar>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            bgcolor: "background.paper",
            borderRight: 1,
            borderColor: "divider",
          },
        }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: "secondary.main", color: "white" }}>
            {username?.[0]?.toUpperCase() || "A"}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{username}</Typography>
            <Chip label="Admin" size="small" color="secondary" />
          </Box>
        </Box>
        <Divider />
        <List sx={{ px: 1, py: 1 }}>
          {navItems.map((item, i) => {
            if ("divider" in item) {
              return (
                <Box key={`div-${i}`} sx={{ px: 1.5, pt: 2, pb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                    {item.label}
                  </Typography>
                </Box>
              )
            }
            const isActive = location.pathname === item.path
            return (
              <ListItemButton
                key={item.label}
                selected={isActive}
                onClick={() => handleNav(item.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  minHeight: 48,
                  "&.Mui-selected": { bgcolor: "rgba(124, 77, 255, 0.1)" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? "secondary.main" : "text.secondary" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: isActive ? 700 : 400 } } }} />
              </ListItemButton>
            )
          })}
        </List>
        <Divider />
        <List sx={{ px: 1, py: 1 }}>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 1, minHeight: 48 }}>
            <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" slotProps={{ primary: { sx: { color: "error.main" } } }} />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, pt: "64px", pb: 2, px: { xs: 1.5, sm: 2 } }}>
        <Outlet />
      </Box>
    </Box>
  )
}
