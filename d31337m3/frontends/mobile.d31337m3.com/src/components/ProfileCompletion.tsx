import { useState } from "react"
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material"
import SecurityIcon from "@mui/icons-material/Security"
import EditIcon from "@mui/icons-material/Edit"
import { apiRequest } from "../api/client"
import { useAuth } from "../context/AuthContext"

interface Props {
  onComplete?: () => void
}

const REQUIRED_FIELDS = [
  { key: "phone", label: "Phone", placeholder: "+1 (555) 123-4567" },
  { key: "address_line1", label: "Street Address", placeholder: "123 Main St" },
  { key: "city", label: "City", placeholder: "San Francisco" },
  { key: "state", label: "State", placeholder: "CA" },
  { key: "zip_code", label: "ZIP Code", placeholder: "94102" },
  { key: "country", label: "Country", placeholder: "US" },
]

function isProfileComplete(user: Record<string, any> | null): boolean {
  if (!user) return false
  return REQUIRED_FIELDS.every((f) => user[f.key]?.trim())
}

export default function ProfileCompletion({ onComplete }: Props) {
  const { user, fetchProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("sp1d3r_profile_prompt_dismissed") === "true"
  })
  const [form, setForm] = useState<Record<string, string>>({})

  const complete = isProfileComplete(user as Record<string, any>)

  if (complete || dismissed) return null

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: Record<string, string> = {}
    for (const f of REQUIRED_FIELDS) {
      if (form[f.key]) payload[f.key] = form[f.key]
    }
    await apiRequest("cityhall", "PUT", "/users/me", payload)
    await fetchProfile()
    setSaving(false)
    setOpen(false)
    onComplete?.()
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem("sp1d3r_profile_prompt_dismissed", "true")
  }

  return (
    <>
      <Alert
        severity="info"
        icon={<SecurityIcon />}
        action={
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Button size="small" variant="outlined" onClick={handleDismiss}>
              Later
            </Button>
            <Button size="small" variant="contained" startIcon={<EditIcon />} onClick={() => setOpen(true)}>
              Complete
            </Button>
          </Box>
        }
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
          Complete your profile for better threat detection
        </Typography>
      </Alert>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: "monospace" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SecurityIcon color="primary" />
            Complete Profile
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Your data is encrypted and never shared with third parties.
          </Alert>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {REQUIRED_FIELDS.map((f) => (
              <TextField
                key={f.key}
                fullWidth
                size="small"
                label={f.label}
                placeholder={f.placeholder}
                value={user?.[f.key as keyof typeof user] || form[f.key] || ""}
                onChange={(e) => handleChange(f.key, e.target.value)}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
