import { useState, useEffect } from "react"
import { Box, Button, Collapse, IconButton, Typography } from "@mui/material"
import GetAppIcon from "@mui/icons-material/GetApp"
import CloseIcon from "@mui/icons-material/Close"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("sp1d3r_install_dismissed")) { setDismissed(true); return }
    const handler = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); setShow(true) }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === "accepted") { setShow(false); localStorage.setItem("sp1d3r_install_dismissed", "true") }
    setDeferred(null)
  }

  const handleDismiss = () => {
    setShow(false); setDismissed(true)
    localStorage.setItem("sp1d3r_install_dismissed", "true")
  }

  if (dismissed) return null

  return (
    <Collapse in={show}>
      <Box sx={{
        position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 1300,
        bgcolor: "primary.main", color: "black", borderRadius: 2, p: 1.5,
        display: "flex", alignItems: "center", gap: 1, boxShadow: 6,
      }}>
        <GetAppIcon sx={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Install D31337m3</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>Add to home screen for the full experience</Typography>
        </Box>
        <Button variant="contained" size="small" onClick={handleInstall}
          sx={{ bgcolor: "black", color: "primary.main", fontWeight: 700, flexShrink: 0, textTransform: "none" }}>
          Install
        </Button>
        <IconButton size="small" onClick={handleDismiss} sx={{ color: "black", flexShrink: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Collapse>
  )
}
