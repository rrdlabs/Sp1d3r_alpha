import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  Divider,
  CircularProgress,
} from "@mui/material"
import KeyIcon from "@mui/icons-material/Key"
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"

interface UserProfile {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  bio: string
  avatar_url: string | null
  wallet_address: string | null
  is_nodeop: boolean
  is_tech_op: boolean
  is_chat_op: boolean
}

export default function UserSettings() {
  const { fetchProfile } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [wallet, setWallet] = useState("")
  const [keypair, setKeypair] = useState<{ private_key_hex: string; public_key_hex: string } | null>(null)

  useEffect(() => {
    apiRequest<UserProfile>("cityhall", "GET", "/users/me").then((res) => {
      if (res.ok) {
        setProfile(res.data)
        setWallet(res.data.wallet_address || "")
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setMsg("")
    const res = await apiRequest("cityhall", "PUT", "/users/me", {
      first_name: profile.first_name,
      last_name: profile.last_name,
      bio: profile.bio,
      wallet_address: wallet || null,
    })
    setSaving(false)
    if (res.ok) {
      setMsg("Profile updated")
      fetchProfile()
    } else {
      setMsg("Update failed")
    }
  }

  const handleGenKeypair = async () => {
    const res = await apiRequest<{ private_key_hex: string; public_key_hex: string }>(
      "cityhall",
      "POST",
      "/users/me/generate-keypair",
    )
    if (res.ok) setKeypair(res.data)
  }

  if (loading) return <CircularProgress sx={{ m: 4 }} />

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        Settings
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }} variant="outlined">
        <Typography variant="h6" gutterBottom>Profile</Typography>
        {msg && <Alert severity={msg.includes("failed") ? "error" : "success"} sx={{ mb: 2 }}>{msg}</Alert>}
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField label="First Name" value={profile?.first_name || ""} onChange={(e) => setProfile((p) => p ? { ...p, first_name: e.target.value } : p)} fullWidth />
          <TextField label="Last Name" value={profile?.last_name || ""} onChange={(e) => setProfile((p) => p ? { ...p, last_name: e.target.value } : p)} fullWidth />
        </Box>
        <TextField label="Email" value={profile?.email || ""} disabled fullWidth sx={{ mb: 2 }} />
        <TextField label="Bio" multiline rows={3} value={profile?.bio || ""} onChange={(e) => setProfile((p) => p ? { ...p, bio: e.target.value } : p)} fullWidth sx={{ mb: 2 }} />
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mt: 2 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <AccountBalanceWalletIcon color="primary" />
          <Typography variant="h6">Wallet</Typography>
        </Box>
        <TextField
          fullWidth
          label="Wallet Address"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="0x..."
          sx={{ mb: 2 }}
        />
        <Button variant="outlined" onClick={handleSave}>Link Wallet</Button>
      </Paper>

      <Paper sx={{ p: 3, mt: 2 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <KeyIcon color="secondary" />
          <Typography variant="h6">Ed25519 Keypair</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Generate a keypair for blockchain authentication and crawl encryption.
        </Typography>
        <Button variant="outlined" onClick={handleGenKeypair}>Generate Keypair</Button>
        {keypair && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Alert severity="warning" sx={{ mb: 1 }}>
              Save your private key securely. It will not be shown again.
            </Alert>
            <TextField fullWidth label="Public Key" value={keypair.public_key_hex} slotProps={{ input: { readOnly: true } }} sx={{ mb: 1 }} />
            <TextField fullWidth label="Private Key" value={keypair.private_key_hex} slotProps={{ input: { readOnly: true } }} multiline />
          </Box>
        )}
      </Paper>
    </Container>
  )
}
