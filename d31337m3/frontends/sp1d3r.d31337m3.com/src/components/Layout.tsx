import { useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import {
  AppBar,
  Box,
  Collapse,
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
import ExpandLess from "@mui/icons-material/ExpandLess"
import ExpandMore from "@mui/icons-material/ExpandMore"
import PeopleIcon from "@mui/icons-material/People"
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart"
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin"
import TerminalIcon from "@mui/icons-material/Terminal"
import EmailIcon from "@mui/icons-material/Email"
import SecurityIcon from "@mui/icons-material/Security"
import PaymentsIcon from "@mui/icons-material/Payments"
import CreditCardIcon from "@mui/icons-material/CreditCard"
import HealingIcon from "@mui/icons-material/Healing"
import ComputerIcon from "@mui/icons-material/Computer"
import SubscriptionsIcon from "@mui/icons-material/Subscriptions"
import DescriptionIcon from "@mui/icons-material/Description"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import { useAuth } from "../context/AuthContext"
import ThemeToggle from "./ThemeToggle"

const DRAWER_WIDTH = 240

interface Props {
  isDark: boolean
  onThemeToggle: () => void
}

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  auth?: boolean
  adminOnly?: boolean
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: "Home", path: "/", icon: <HomeIcon /> },
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon />, auth: true },
  { label: "Subscription", path: "/dashboard/subscription", icon: <SubscriptionsIcon />, auth: true },
  { label: "Run a Node", path: "/nodes", icon: <ComputerIcon /> },
  {
    label: "Admin",
    path: "/admin",
    icon: <AdminPanelSettingsIcon />,
    auth: true,
    adminOnly: true,
    children: [
      { label: "Overview", path: "/admin", icon: <DashboardIcon /> },
      { label: "Users", path: "/admin/users", icon: <PeopleIcon /> },
      { label: "Brokers", path: "/admin/brokers", icon: <AccountTreeIcon /> },
      { label: "Services", path: "/admin/services", icon: <MonitorHeartIcon /> },
      { label: "Platform Health", path: "/admin/health", icon: <HealingIcon /> },
      { label: "Blockchain", path: "/admin/blockchain", icon: <CurrencyBitcoinIcon /> },
      { label: "Logs", path: "/admin/logs", icon: <TerminalIcon /> },
      { label: "Email", path: "/admin/email", icon: <EmailIcon /> },
      { label: "Node Management", path: "/admin/network", icon: <SecurityIcon /> },
      { label: "Documents", path: "/admin/documents", icon: <DescriptionIcon /> },
      { label: "Pricing Tiers", path: "/admin/pricing", icon: <PaymentsIcon /> },
      { label: "Payments", path: "/admin/payments", icon: <CreditCardIcon /> },
    ],
  },
  { label: "Support", path: "/support", icon: <SupportAgentIcon />, auth: true },
]

export default function Layout({ isDark, onThemeToggle }: Props) {
  const { username, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith("/admin"))

  const handleNav = (path: string) => {
    navigate(path)
    if (isMobile) setMobileOpen(false)
  }

  const drawer = (
    <Box sx={{ bgcolor: "background.paper", height: "100%" }}>
      <Toolbar>
        <Typography variant="h6" sx={{ color: "primary.main", fontFamily: "monospace", fontWeight: 700 }}>
          D31337m3
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          if (item.children) {
            const isActive = location.pathname.startsWith("/admin")
            return (
              <Box key={item.path}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => setAdminOpen(!adminOpen)}
                  sx={{
                    "&.Mui-selected": { bgcolor: "rgba(0, 230, 118, 0.1)" },
                    "&:hover": { bgcolor: "rgba(0, 230, 118, 0.05)" },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? "primary.main" : "text.secondary" }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                  {adminOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={adminOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        selected={location.pathname === child.path}
                        onClick={() => handleNav(child.path)}
                        sx={{ pl: 4 }}
                      >
                        <ListItemIcon sx={{ color: location.pathname === child.path ? "primary.main" : "text.secondary", minWidth: 36 }}>
                          {child.icon}
                        </ListItemIcon>
                        <ListItemText primary={child.label} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Box>
            )
          }
          return (
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
          )
        })}
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
            D31337m3 Platform
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
