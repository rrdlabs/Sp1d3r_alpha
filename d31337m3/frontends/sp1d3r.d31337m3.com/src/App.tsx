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
import NotFound from "./pages/NotFound"
import UserDashboard from "./pages/dashboard/UserDashboard"
import UserSettings from "./pages/dashboard/UserSettings"
import SubscriptionOnboarding from "./pages/dashboard/SubscriptionOnboarding"
import SubscriptionManagement from "./pages/dashboard/SubscriptionManagement"
import AdminDashboard from "./pages/admin/AdminDashboard"
import UserManagement from "./pages/admin/UserManagement"
import ServiceMonitor from "./pages/admin/ServiceMonitor"
import PlatformHealth from "./pages/admin/PlatformHealth"
import BlockchainDetails from "./pages/admin/BlockchainDetails"
import LogViewer from "./pages/admin/LogViewer"
import EmailSettings from "./pages/admin/EmailSettings"
import NodeManagement from "./pages/admin/NodeManagement"
import BrokerManagement from "./pages/admin/BrokerManagement"
import Documents from "./pages/admin/Documents"
import PricingTiers from "./pages/admin/PricingTiers"
import PaymentProcessing from "./pages/admin/PaymentProcessing"
import SupportChat from "./pages/support/SupportChat"
import NodeInfo from "./pages/NodeInfo"
import Paywall from "./pages/Paywall"

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
              <Route path="/dashboard/subscribe" element={<AuthGuard><SubscriptionOnboarding /></AuthGuard>} />
              <Route path="/dashboard/subscription" element={<AuthGuard><SubscriptionManagement /></AuthGuard>} />
              <Route path="/admin" element={<AuthGuard requireAdmin><AdminDashboard /></AuthGuard>} />
              <Route path="/admin/users" element={<AuthGuard requireAdmin><UserManagement /></AuthGuard>} />
              <Route path="/admin/services" element={<AuthGuard requireAdmin><ServiceMonitor /></AuthGuard>} />
              <Route path="/admin/health" element={<AuthGuard requireAdmin><PlatformHealth /></AuthGuard>} />
              <Route path="/admin/blockchain" element={<AuthGuard requireAdmin><BlockchainDetails /></AuthGuard>} />
              <Route path="/admin/logs" element={<AuthGuard requireAdmin><LogViewer /></AuthGuard>} />
              <Route path="/admin/email" element={<AuthGuard requireAdmin><EmailSettings /></AuthGuard>} />
              <Route path="/admin/network" element={<AuthGuard requireAdmin><NodeManagement /></AuthGuard>} />
              <Route path="/admin/brokers" element={<AuthGuard requireAdmin><BrokerManagement /></AuthGuard>} />
              <Route path="/admin/documents" element={<AuthGuard requireAdmin><Documents /></AuthGuard>} />
              <Route path="/admin/pricing" element={<AuthGuard requireAdmin><PricingTiers /></AuthGuard>} />
              <Route path="/admin/payments" element={<AuthGuard requireAdmin><PaymentProcessing /></AuthGuard>} />
              <Route path="/support" element={<AuthGuard><SupportChat /></AuthGuard>} />
              <Route path="/paywall" element={<AuthGuard><Paywall /></AuthGuard>} />
              <Route path="/nodes" element={<NodeInfo />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
