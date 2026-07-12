import { useState, useMemo } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { AuthProvider } from "./context/AuthContext"
import { darkTheme, lightTheme } from "./theme/theme"
import AdminMobileLayout from "./components/AdminMobileLayout"
import AuthGuard from "./components/AuthGuard"
import Login from "./pages/Login"
import AdminDashboard from "./pages/AdminDashboard"
import UserManagement from "./pages/UserManagement"
import ServiceMonitor from "./pages/ServiceMonitor"
import PlatformHealth from "./pages/PlatformHealth"
import BlockchainDetails from "./pages/BlockchainDetails"
import LogViewer from "./pages/LogViewer"
import EmailSettings from "./pages/EmailSettings"
import NodeManagement from "./pages/NodeManagement"
import BrokerManagement from "./pages/BrokerManagement"
import Documents from "./pages/Documents"
import PricingTiers from "./pages/PricingTiers"
import PaymentProcessing from "./pages/PaymentProcessing"

export default function App() {
  const [isDark] = useState(() => localStorage.getItem("sp1d3r_theme") !== "light")
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<AdminMobileLayout />}>
              <Route path="/login" element={<Login />} />
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
              <Route path="/" element={<AuthGuard requireAdmin><AdminDashboard /></AuthGuard>} />
              <Route path="*" element={<AuthGuard requireAdmin><AdminDashboard /></AuthGuard>} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
