import { useState, useEffect } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from "@mui/material"
import LockResetIcon from "@mui/icons-material/LockReset"
import DeleteForeverIcon from "@mui/icons-material/DeleteForever"
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
  phone: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  country: string
  ssn_last4: string
  avatar_url: string | null
  wallet_address: string | null
  is_nodeop: boolean
}

export default function UserSettings() {
  const { fetchProfile, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState("")

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const [keypair, setKeypair] = useState<{ private_key_hex: string; public_key_hex: string; seed_phrase: string } | null>(null)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryPhrase, setRecoveryPhrase] = useState("")
  const [recovering, setRecovering] = useState(false)
  const [recoveryMsg, setRecoveryMsg] = useState("")

  useEffect(() => {
    apiRequest<UserProfile>("cityhall", "GET", "/users/me").then((res) => {
      if (res.ok) setProfile(res.data)
      setLoading(false)
    })
  }, [])

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    setMsg("")
    const res = await apiRequest("cityhall", "PUT", "/users/me", {
      first_name: profile.first_name,
      last_name: profile.last_name,
      bio: profile.bio,
      phone: profile.phone,
      address_line1: profile.address_line1,
      address_line2: profile.address_line2,
      city: profile.city,
      state: profile.state,
      zip_code: profile.zip_code,
      country: profile.country,
      wallet_address: profile.wallet_address || null,
    })
    setSaving(false)
    if (res.ok) {
      setMsg("Profile updated")
      fetchProfile()
    } else {
      setMsg("Update failed")
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !currentPassword) return
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg("Min 8 characters")
      return
    }
    setChangingPassword(true)
    setPasswordMsg("")
    const res = await apiRequest("cityhall", "POST", "/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    })
    setChangingPassword(false)
    if (res.ok) {
      setPasswordMsg("Password changed")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setPasswordMsg((res.data as any)?.detail || "Failed")
    }
  }

  const handleGenKeypair = async () => {
    const res = await apiRequest<{ private_key_hex: string; public_key_hex: string; seed_phrase: string }>(
      "cityhall", "POST", "/users/me/generate-keypair",
    )
    if (res.ok) setKeypair(res.data)
  }

  const handleRecoverKeypair = async () => {
    if (!recoveryPhrase.trim()) return
    setRecovering(true)
    setRecoveryMsg("")
    const res = await apiRequest<{ private_key_hex: string; public_key_hex: string; seed_phrase: string }>(
      "cityhall", "POST", "/users/me/recover-keypair", { seed_phrase: recoveryPhrase.trim() },
    )
    setRecovering(false)
    if (res.ok) {
      setKeypair(res.data)
      setRecoveryMsg("Keypair recovered!")
      setRecoveryOpen(false)
      setRecoveryPhrase("")
    } else {
      setRecoveryMsg((res.data as any)?.detail || "Invalid seed phrase")
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) return
    setDeleting(true)
    setDeleteError("")
    const res = await apiRequest("cityhall", "DELETE", "/users/me", { password: deletePassword })
    setDeleting(false)
    if (res.ok) {
      logout()
      window.location.href = "/"
    } else {
      setDeleteError((res.data as any)?.detail || "Failed")
    }
  }

  const updateField = (key: keyof UserProfile, value: string) => {
    setProfile((p) => p ? { ...p, [key]: value } : p)
  }

  if (loading) return <CircularProgress sx={{ m: 4 }} />

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700, mb: 2 }}>Settings</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700, mb: 1 }}>Profile</Typography>
        {msg && <Alert severity={msg.includes("failed") ? "error" : "success"} sx={{ mb: 1 }}>{msg}</Alert>}
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField size="small" label="First Name" value={profile?.first_name || ""} onChange={(e) => updateField("first_name", e.target.value)} fullWidth />
          <TextField size="small" label="Last Name" value={profile?.last_name || ""} onChange={(e) => updateField("last_name", e.target.value)} fullWidth />
        </Box>
        <TextField size="small" label="Email" value={profile?.email || ""} disabled fullWidth sx={{ mb: 1 }} />
        <TextField size="small" label="Bio" multiline rows={2} value={profile?.bio || ""} onChange={(e) => updateField("bio", e.target.value)} fullWidth sx={{ mb: 1 }} />
        <TextField size="small" label="Phone" value={profile?.phone || ""} onChange={(e) => updateField("phone", e.target.value)} fullWidth sx={{ mb: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>Address</Typography>
        <TextField size="small" label="Street" value={profile?.address_line1 || ""} onChange={(e) => updateField("address_line1", e.target.value)} fullWidth sx={{ mb: 1 }} />
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField size="small" label="City" value={profile?.city || ""} onChange={(e) => updateField("city", e.target.value)} fullWidth />
          <TextField size="small" label="State" value={profile?.state || ""} onChange={(e) => updateField("state", e.target.value)} sx={{ width: 80 }} />
        </Box>
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField size="small" label="ZIP" value={profile?.zip_code || ""} onChange={(e) => updateField("zip_code", e.target.value)} sx={{ width: 100 }} />
          <TextField size="small" label="Country" value={profile?.country || ""} onChange={(e) => updateField("country", e.target.value)} sx={{ width: 80 }} />
        </Box>
        <Button variant="contained" onClick={handleSaveProfile} disabled={saving} size="small">
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <LockResetIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Change Password</Typography>
        </Box>
        {passwordMsg && <Alert severity={passwordMsg.includes("changed") ? "success" : "error"} sx={{ mb: 1 }}>{passwordMsg}</Alert>}
        <TextField fullWidth size="small" type="password" label="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} sx={{ mb: 1 }} />
        <TextField fullWidth size="small" type="password" label="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} sx={{ mb: 1 }} />
        <TextField fullWidth size="small" type="password" label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} sx={{ mb: 1 }} />
        <Button variant="contained" onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword} size="small" startIcon={changingPassword ? <CircularProgress size={14} /> : <LockResetIcon />}>
          {changingPassword ? "Changing..." : "Change Password"}
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Wallet</Typography>
        </Box>
        <TextField fullWidth size="small" label="Wallet Address" value={profile?.wallet_address || ""} onChange={(e) => updateField("wallet_address", e.target.value)} placeholder="0x..." sx={{ mb: 1 }} />
        <Button variant="outlined" onClick={handleSaveProfile} size="small">Link Wallet</Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <KeyIcon color="secondary" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Keypair</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Generate for blockchain authentication. A 12-word seed phrase is included for recovery.
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <Button variant="outlined" onClick={handleGenKeypair} size="small">Generate</Button>
          <Button variant="outlined" color="warning" onClick={() => setRecoveryOpen(true)} size="small">Recover</Button>
        </Box>
        {recoveryMsg && !keypair && <Alert severity={recoveryMsg.includes("success") ? "success" : "error"} sx={{ mb: 1 }}>{recoveryMsg}</Alert>}
        {keypair && (
          <Box>
            <Alert severity="warning" sx={{ mb: 1 }}>Save these. They won't be shown again.</Alert>
            <Alert severity="info" sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Seed Phrase:</Typography> {keypair.seed_phrase}
            </Alert>
            <TextField fullWidth size="small" label="Public Key" value={keypair.public_key_hex} slotProps={{ input: { readOnly: true } }} sx={{ mb: 0.5 }} />
            <TextField fullWidth size="small" label="Private Key" value={keypair.private_key_hex} slotProps={{ input: { readOnly: true } }} />
          </Box>
        )}
      </Paper>

      <Dialog open={recoveryOpen} onClose={() => { setRecoveryOpen(false); setRecoveryPhrase(""); setRecoveryMsg("") }} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: "monospace" }}>Recover from Seed</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your 12-word seed phrase to regenerate your keypair.
          </Typography>
          {recoveryMsg && <Alert severity={recoveryMsg.includes("success") ? "success" : "error"} sx={{ mb: 1 }}>{recoveryMsg}</Alert>}
          <TextField
            fullWidth size="small" multiline rows={2}
            label="Seed Phrase"
            value={recoveryPhrase}
            onChange={(e) => setRecoveryPhrase(e.target.value)}
            placeholder="word1 word2 ... word12"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRecoveryOpen(false); setRecoveryPhrase(""); setRecoveryMsg("") }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRecoverKeypair} disabled={recovering || !recoveryPhrase.trim()}>
            {recovering ? "Recovering..." : "Recover"}
          </Button>
        </DialogActions>
      </Dialog>

      <Paper variant="outlined" sx={{ p: 2, borderColor: "error.main", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <DeleteForeverIcon color="error" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle2" color="error" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Danger Zone</Typography>
        </Box>
        <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)} size="small" startIcon={<DeleteForeverIcon />}>
          Delete Account
        </Button>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will permanently delete your account and all data.
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert>}
          <TextField fullWidth size="small" type="password" label="Confirm password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setDeletePassword(""); setDeleteError("") }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
