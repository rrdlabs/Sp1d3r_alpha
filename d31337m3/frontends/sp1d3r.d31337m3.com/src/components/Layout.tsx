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
  Divider,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import HomeIcon from "@mui/icons-material/Home"
import DashboardIcon from "@mui/icons-material/Dashboard"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import SupportAgentIcon from "@mui/icons-material/SupportAgent"
import SettingsIcon from "@mui/icons-material/Settings"
import LogoutIcon from "@mui/icons-material/Logout"
import { useAuth } from "../context/AuthContext"
import ThemeToggle from "./ThemeToggle"

const DRAWER_WIDTH = 240

interface Props {
  isDark: boolean
  onThemeToggle: () => void
}

const navItems = [
  { label: "Home", path: "/", icon: <HomeIcon /> },
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon />, auth: true },
  { label: "Admin", path: "/admin", icon: <AdminPanelSettingsIcon />, auth: true },
  { label: "Support", path: "/support", icon: <SupportAgentIcon />, auth: true },
]

export default function Layout({ isDark, onThemeToggle }: Props) {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleNav = (path: string) => {
    navigate(path)
    if (isMobile) setMobileOpen(false)
  }

  const drawer = (
    <Box sx={{ bgcolor: "background.paper", height: "100%" }}>
      <Toolbar>
        <Typography variant="h6" sx={{ color: "primary.main", fontFamily: "monospace", fontWeight: 700 }}>
          d31337m3
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path))}
            onClick={() => handleNav(item.path)}
            sx={{
              "&.Mui-selected": { bgcolor: "rgba(0, 230, 118, 0.1)" },
              "&:hover": { bgcolor: "rgba(0, 230, 118, 0.05)" },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname.startsWith(item.path) ? "primary.main" : "text.secondary" }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontFamily: "monospace", color: "primary.main" }}>
            Sp1d3r Platform
          </Typography>
          <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
          {username && (
            <>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", fontSize: 14 }}>
                  {username[0]?.toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    {username}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { handleNav("/dashboard/settings"); setAnchorEl(null) }}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  Settings
                </MenuItem>
                <MenuItem onClick={() => { logout(); navigate("/"); setAnchorEl(null) }}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}>
          {drawer}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: isMobile ? 0 : `${DRAWER_WIDTH}px`, mt: "64px" }}>
        <Outlet />
      </Box>
    </Box>
  )
}
