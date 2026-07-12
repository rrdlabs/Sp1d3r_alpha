import { useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
  { key: "phone", label: "Phone Number", placeholder: "+1 (555) 123-4567" },
  { key: "address_line1", label: "Street Address", placeholder: "123 Main St" },
  { key: "city", label: "City", placeholder: "San Francisco" },
  { key: "state", label: "State / Province", placeholder: "CA" },
  { key: "zip_code", label: "ZIP / Postal Code", placeholder: "94102" },
  { key: "country", label: "Country", placeholder: "US" },
]

const SENSITIVE_FIELDS = [
  { key: "ssn_last4", label: "SSN (last 4 digits)", placeholder: "1234", maxLength: 4 },
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
    for (const f of [...REQUIRED_FIELDS, ...SENSITIVE_FIELDS]) {
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
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="outlined" onClick={handleDismiss}>
              Later
            </Button>
            <Button size="small" variant="contained" startIcon={<EditIcon />} onClick={() => setOpen(true)}>
              Complete Profile
            </Button>
          </Box>
        }
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Enhance your threat detection accuracy
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Adding your address and contact details allows D31337m3 to provide more accurate and comprehensive leak detection,
          automated document generation, and personalized privacy reports. Your data is encrypted at rest and never shared with third parties.
        </Typography>
      </Alert>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SecurityIcon color="primary" />
            Complete Your Profile
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Accurate and reputable leak detection relies on complete profile data. All information entered in D31337m3
            is encrypted at rest, processed locally, and never sold or shared with third parties.
          </Alert>

          <Typography variant="subtitle2" sx={{ mb: 1, mt: 2, fontWeight: 700 }}>Contact & Address</Typography>
          <Grid container spacing={2}>
            {REQUIRED_FIELDS.map((f) => (
              <Grid key={f.key} size={{ xs: 12, sm: f.key === "state" || f.key === "zip_code" ? 6 : 12 }}>
                <TextField
                  fullWidth size="small" label={f.label} placeholder={f.placeholder}
                  value={user?.[f.key as keyof typeof user] || form[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
              </Grid>
            ))}
          </Grid>

          <Typography variant="subtitle2" sx={{ mb: 1, mt: 2, fontWeight: 700 }}>
            Identity Verification
            <Chip size="small" label="Optional" sx={{ ml: 1 }} />
          </Typography>
          <Alert severity="warning" sx={{ mb: 1 }}>
            SSN last 4 digits are used solely for identity verification in automated removal requests.
            They are stored encrypted and are never transmitted in plain text.
          </Alert>
          <Grid container spacing={2}>
            {SENSITIVE_FIELDS.map((f) => (
              <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label={f.label} placeholder={f.placeholder}
                  value={user?.[f.key as keyof typeof user] || form[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value.slice(0, f.maxLength || 500))}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
