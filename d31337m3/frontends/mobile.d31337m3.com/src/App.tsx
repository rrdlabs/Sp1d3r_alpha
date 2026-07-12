import { useState, useMemo } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { AuthProvider } from "./context/AuthContext"
import { darkTheme, lightTheme } from "./theme/theme"
import MobileLayout from "./components/MobileLayout"
import AuthGuard from "./components/AuthGuard"
import Login from "./pages/Login"
import Register from "./pages/Register"
import NotFound from "./pages/NotFound"
import UserDashboard from "./pages/dashboard/UserDashboard"
import UserSettings from "./pages/dashboard/UserSettings"
import SubscriptionOnboarding from "./pages/dashboard/SubscriptionOnboarding"
import SubscriptionManagement from "./pages/dashboard/SubscriptionManagement"
import Paywall from "./pages/Paywall"
import Marketing from "./pages/Marketing"
import NodeInfo from "./pages/NodeInfo"

export default function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("sp1d3r_theme") !== "light")
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark])
  const toggleTheme = () => { setIsDark((p) => { const n = !p; localStorage.setItem("sp1d3r_theme", n ? "dark" : "light"); return n }) }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<MobileLayout isDark={isDark} onThemeToggle={toggleTheme} />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<AuthGuard><UserDashboard /></AuthGuard>} />
              <Route path="/dashboard/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
              <Route path="/dashboard/subscribe" element={<AuthGuard><SubscriptionOnboarding /></AuthGuard>} />
              <Route path="/dashboard/subscription" element={<AuthGuard><SubscriptionManagement /></AuthGuard>} />
              <Route path="/paywall" element={<AuthGuard><Paywall /></AuthGuard>} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/nodes" element={<NodeInfo />} />
              <Route path="/" element={<Marketing />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
