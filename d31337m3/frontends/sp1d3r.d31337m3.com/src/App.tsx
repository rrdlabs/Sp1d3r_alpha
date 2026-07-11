import { useState, useMemo } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { AuthProvider } from "./context/AuthContext"
import { darkTheme, lightTheme } from "./theme/theme"
import Layout from "./components/Layout"
import AuthGuard from "./components/AuthGuard"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Register from "./pages/Register"
import UserDashboard from "./pages/dashboard/UserDashboard"
import UserSettings from "./pages/dashboard/UserSettings"
import AdminDashboard from "./pages/admin/AdminDashboard"
import UserManagement from "./pages/admin/UserManagement"
import ServiceMonitor from "./pages/admin/ServiceMonitor"
import BlockchainDetails from "./pages/admin/BlockchainDetails"
import LogViewer from "./pages/admin/LogViewer"
import EmailSettings from "./pages/admin/EmailSettings"
import SupportChat from "./pages/support/SupportChat"

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("sp1d3r_theme") !== "light"
  })

  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem("sp1d3r_theme", next ? "dark" : "light")
      return next
    })
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout isDark={isDark} onThemeToggle={toggleTheme} />}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<AuthGuard><UserDashboard /></AuthGuard>} />
              <Route path="/dashboard/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
              <Route path="/admin" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
              <Route path="/admin/users" element={<AuthGuard><UserManagement /></AuthGuard>} />
              <Route path="/admin/services" element={<AuthGuard><ServiceMonitor /></AuthGuard>} />
              <Route path="/admin/blockchain" element={<AuthGuard><BlockchainDetails /></AuthGuard>} />
              <Route path="/admin/logs" element={<AuthGuard><LogViewer /></AuthGuard>} />
              <Route path="/admin/email" element={<AuthGuard><EmailSettings /></AuthGuard>} />
              <Route path="/support" element={<AuthGuard><SupportChat /></AuthGuard>} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
