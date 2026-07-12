import { useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Avatar, Divider, useTheme,
} from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import HomeIcon from "@mui/icons-material/Home"
import SearchIcon from "@mui/icons-material/Search"
import SubscriptionsIcon from "@mui/icons-material/Subscriptions"
import SettingsIcon from "@mui/icons-material/Settings"
import SupportAgentIcon from "@mui/icons-material/SupportAgent"
import ComputerIcon from "@mui/icons-material/Computer"
import LogoutIcon from "@mui/icons-material/Logout"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import { useAuth } from "../context/AuthContext"

interface MobileLayoutProps { isDark: boolean; onThemeToggle: () => void }

export default function MobileLayout({ isDark: _isDark, onThemeToggle: _onThemeToggle }: MobileLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const { username, isAdmin, logout } = useAuth()

  type NavItem = { label: string; path: string; icon: React.ReactNode }
  type DividerItem = { divider: true }
  const navItems: (NavItem | DividerItem)[] = [
    { label: "Dashboard", path: "/dashboard", icon: <HomeIcon /> },
    { label: "Search", path: "/dashboard#search", icon: <SearchIcon /> },
    { label: "Super Search", path: "/dashboard#super-search", icon: <AutoAwesomeIcon /> },
    { label: "Subscription", path: "/dashboard/subscription", icon: <SubscriptionsIcon /> },
    { label: "Settings", path: "/dashboard/settings", icon: <SettingsIcon /> },
    { label: "Support", path: "/support", icon: <SupportAgentIcon /> },
    { divider: true },
    { label: "Run a Node", path: "/nodes", icon: <ComputerIcon /> },
    ...(isAdmin ? [{ label: "Admin Portal", path: "/admin", icon: <HomeIcon /> }] : []),
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
          <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: 700, color: "primary.main", flexGrow: 1 }}>
            D31337m3
          </Typography>
          {username && (
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", color: "black", fontSize: "0.875rem" }}>
              {username[0]?.toUpperCase()}
            </Avatar>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { width: 280, bgcolor: "background.paper", borderRight: 1, borderColor: "divider" } }}>
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, color: "black" }}>
            {username?.[0]?.toUpperCase() || "U"}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{username || "User"}</Typography>
            <Typography variant="caption" color="text.secondary">User Portal</Typography>
          </Box>
        </Box>
        <Divider />
        <List sx={{ px: 1, py: 1 }}>
          {navItems.map((item, i) => {
            if ("divider" in item) return <Divider key={`d-${i}`} sx={{ my: 1 }} />
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path))
            return (
              <ListItemButton key={item.label} selected={isActive} onClick={() => handleNav(item.path)}
                sx={{ borderRadius: 1, mb: 0.5, minHeight: 48, "&.Mui-selected": { bgcolor: "rgba(0, 230, 118, 0.1)" } }}>
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? "primary.main" : "text.secondary" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: isActive ? 700 : 400 } } }} />
              </ListItemButton>
            )
          })}
        </List>
        <Divider />
        <List sx={{ px: 1, py: 1 }}>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 1, minHeight: 48 }}>
            <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}><LogoutIcon /></ListItemIcon>
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
