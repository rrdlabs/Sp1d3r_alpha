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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material"
import KeyIcon from "@mui/icons-material/Key"
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import LockResetIcon from "@mui/icons-material/LockReset"
import DeleteForeverIcon from "@mui/icons-material/DeleteForever"
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
  const { fetchProfile, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [wallet, setWallet] = useState("")
  const [keypair, setKeypair] = useState<{ private_key_hex: string; public_key_hex: string; seed_phrase: string } | null>(null)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryPhrase, setRecoveryPhrase] = useState("")
  const [recovering, setRecovering] = useState(false)
  const [recoveryMsg, setRecoveryMsg] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState("")

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

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
    const res = await apiRequest<{ private_key_hex: string; public_key_hex: string; seed_phrase: string }>(
      "cityhall",
      "POST",
      "/users/me/generate-keypair",
    )
    if (res.ok) setKeypair(res.data)
  }

  const handleRecoverKeypair = async () => {
    if (!recoveryPhrase.trim()) return
    setRecovering(true)
    setRecoveryMsg("")
    const res = await apiRequest<{ private_key_hex: string; public_key_hex: string; seed_phrase: string }>(
      "cityhall",
      "POST",
      "/users/me/recover-keypair",
      { seed_phrase: recoveryPhrase.trim() },
    )
    setRecovering(false)
    if (res.ok) {
      setKeypair(res.data)
      setRecoveryMsg("Keypair recovered successfully!")
      setRecoveryOpen(false)
      setRecoveryPhrase("")
    } else {
      setRecoveryMsg((res.data as any)?.detail || "Invalid seed phrase")
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !currentPassword) return
    if (newPassword !== confirmPassword) {
      setPasswordMsg("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg("Password must be at least 8 characters")
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
      setPasswordMsg("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setPasswordMsg((res.data as any)?.detail || "Failed to change password")
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) return
    setDeleting(true)
    setDeleteError("")
    const res = await apiRequest("cityhall", "DELETE", "/users/me", {
      password: deletePassword,
    })
    setDeleting(false)
    if (res.ok) {
      logout()
      window.location.href = "/"
    } else {
      setDeleteError((res.data as any)?.detail || "Failed to delete account")
    }
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
          <LockResetIcon color="primary" />
          <Typography variant="h6">Change Password</Typography>
        </Box>
        {passwordMsg && (
          <Alert severity={passwordMsg.includes("successfully") ? "success" : "error"} sx={{ mb: 2 }}>
            {passwordMsg}
          </Alert>
        )}
        <TextField
          fullWidth
          type="password"
          label="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="password"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleChangePassword}
          disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          startIcon={changingPassword ? <CircularProgress size={16} /> : <LockResetIcon />}
        >
          {changingPassword ? "Changing..." : "Change Password"}
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
          Generate a keypair for blockchain authentication and crawl encryption. A 12-word seed phrase is generated alongside your key — use it to recover a lost keypair.
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={handleGenKeypair}>Generate Keypair</Button>
          <Button variant="outlined" color="warning" onClick={() => setRecoveryOpen(true)}>Recover from Seed</Button>
        </Box>
        {recoveryMsg && !keypair && (
          <Alert severity={recoveryMsg.includes("success") ? "success" : "error"} sx={{ mt: 2 }}>{recoveryMsg}</Alert>
        )}
        {keypair && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Alert severity="warning" sx={{ mb: 1 }}>
              Save your private key and seed phrase securely. They will not be shown again.
            </Alert>
            <Alert severity="info" sx={{ mb: 1 }}>
              <strong>Seed Phrase (12 words):</strong> Write this down offline. It can recover your keypair if you lose your private key.
            </Alert>
            <TextField fullWidth label="Seed Phrase" value={keypair.seed_phrase} slotProps={{ input: { readOnly: true } }} sx={{ mb: 1 }} />
            <TextField fullWidth label="Public Key" value={keypair.public_key_hex} slotProps={{ input: { readOnly: true } }} sx={{ mb: 1 }} />
            <TextField fullWidth label="Private Key" value={keypair.private_key_hex} slotProps={{ input: { readOnly: true } }} multiline />
          </Box>
        )}
      </Paper>

      <Dialog open={recoveryOpen} onClose={() => { setRecoveryOpen(false); setRecoveryPhrase(""); setRecoveryMsg("") }} maxWidth="sm" fullWidth>
        <DialogTitle>Recover Keypair from Seed Phrase</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your 12-word seed phrase to regenerate your keypair. This will replace your current public key.
          </DialogContentText>
          {recoveryMsg && <Alert severity={recoveryMsg.includes("success") ? "success" : "error"} sx={{ mb: 2 }}>{recoveryMsg}</Alert>}
          <TextField
            fullWidth
            label="12-Word Seed Phrase"
            value={recoveryPhrase}
            onChange={(e) => setRecoveryPhrase(e.target.value)}
            placeholder="word1 word2 word3 ... word12"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRecoveryOpen(false); setRecoveryPhrase(""); setRecoveryMsg("") }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRecoverKeypair} disabled={recovering || !recoveryPhrase.trim()}>
            {recovering ? "Recovering..." : "Recover"}
          </Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: 3, mt: 2, borderColor: "error.main" }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <DeleteForeverIcon color="error" />
          <Typography variant="h6" color="error">Danger Zone</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setDeleteDialogOpen(true)}
          startIcon={<DeleteForeverIcon />}
        >
          Delete Account
        </Button>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete your account and all data. This action cannot be undone.
          </DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <TextField
            fullWidth
            type="password"
            label="Enter your password to confirm"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setDeletePassword(""); setDeleteError("") }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteAccount}
            disabled={deleting || !deletePassword}
          >
            {deleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
