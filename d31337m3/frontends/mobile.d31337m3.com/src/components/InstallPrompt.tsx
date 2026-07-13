import { useState, useEffect, useCallback } from "react"
import { Box, Button, Typography } from "@mui/material"
import { useTheme } from "@mui/material/styles"
import GetAppIcon from "@mui/icons-material/GetApp"
import IosShareIcon from "@mui/icons-material/IosShare"
import AddBoxIcon from "@mui/icons-material/AddBox"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const theme = useTheme()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [isIos, setIsIos] = useState(false)
  const [isAndroidDevice, setIsAndroidDevice] = useState(false)

  useEffect(() => {
    setIsIos(isIOS())
    setIsAndroidDevice(isAndroid())
  }, [])

  const recheck = useCallback(() => {
    if (isStandalone()) setInstalled(true)
  }, [])

  useEffect(() => {
    const onVisChange = () => { if (document.visibilityState === "visible") recheck() }
    document.addEventListener("visibilitychange", onVisChange)
    window.addEventListener("focus", recheck)
    window.addEventListener("appinstalled", () => setInstalled(true))
    return () => {
      document.removeEventListener("visibilitychange", onVisChange)
      window.removeEventListener("focus", recheck)
    }
  }, [recheck])

  useEffect(() => {
    if (installed) return
    const handler = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent) }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [installed])

  const handleInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === "accepted") setInstalled(true)
    setDeferred(null)
  }

  if (installed) return null

  return (
    <Box sx={{
      position: "fixed", inset: 0, zIndex: 9999,
      bgcolor: theme.palette.background.default,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      p: 3, textAlign: "center",
    }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ fontFamily: "monospace", fontWeight: 700, color: theme.palette.primary.main }}>
          D3
        </Typography>
      </Box>

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Install D31337m3
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 320 }}>
        To use D31337m3, install it as an app on your device. This gives you the full experience with offline access and notifications.
      </Typography>

      {isAndroidDevice && deferred && (
        <Button variant="contained" size="large" startIcon={<GetAppIcon />} onClick={handleInstall}
          sx={{ mb: 2, px: 4, textTransform: "none", fontWeight: 700 }}>
          Install App
        </Button>
      )}

      {isAndroidDevice && !deferred && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Tap the menu button (three dots) in your browser and select:
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>Install App</Typography>
          </Box>
        </Box>
      )}

      {isIos && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tap the share button below and select "Add to Home Screen":
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 1 }}>
            <IosShareIcon sx={{ fontSize: 28, color: theme.palette.primary.main }} />
            <Typography variant="body1" sx={{ fontWeight: 700 }}>Share</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <AddBoxIcon sx={{ fontSize: 28, color: theme.palette.primary.main }} />
            <Typography variant="body1" sx={{ fontWeight: 700 }}>Add to Home Screen</Typography>
          </Box>
        </Box>
      )}

      {!isIos && !isAndroidDevice && deferred && (
        <Button variant="contained" size="large" startIcon={<GetAppIcon />} onClick={handleInstall}
          sx={{ mb: 2, px: 4, textTransform: "none", fontWeight: 700 }}>
          Install App
        </Button>
      )}

      {!isIos && !isAndroidDevice && !deferred && (
        <Typography variant="body2" color="text.secondary">
          Use your browser's install option to add D31337m3 to your device.
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 3 }}>
        After installing, open D31337m3 from your home screen.
      </Typography>
    </Box>
  )
}
