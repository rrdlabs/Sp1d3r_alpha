import { useState, useRef, useCallback } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  Collapse,
} from "@mui/material"

declare global {
  interface Navigator {
    serial?: {
      requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<any>
    }
  }
}
import UsbIcon from "@mui/icons-material/Usb"
import FlashOnIcon from "@mui/icons-material/FlashOn"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import InfoIcon from "@mui/icons-material/Info"
import WifiIcon from "@mui/icons-material/Wifi"
import SettingsIcon from "@mui/icons-material/Settings"
import DownloadIcon from "@mui/icons-material/Download"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"

const FIRMWARE_URL = "/firmware/sp1d3r_node_esp32_v0.1.0.bin"
const FIRMWARE_VERSION = "v0.1.0"

interface TerminalLine {
  text: string
  type: "info" | "error" | "success"
}

interface ProvisionConfig {
  wifi_ssid: string
  wifi_pass: string
  cityhall_url: string
  director_url: string
  sp1d3r_url: string
  device_name: string
}

const defaultProvision: ProvisionConfig = {
  wifi_ssid: "",
  wifi_pass: "",
  cityhall_url: "https://d31337m3.com",
  director_url: "https://d31337m3.com",
  sp1d3r_url: "https://d31337m3.com",
  device_name: "Sp1d3r-Node",
}

export default function Flasher() {
  const [activeStep, setActiveStep] = useState(0)
  const [status, setStatus] = useState<"idle" | "connecting" | "flashing" | "done" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [chipName, setChipName] = useState("")
  const [terminal, setTerminal] = useState<TerminalLine[]>([])
  const [error, setError] = useState("")
  const [firmwareSize, setFirmwareSize] = useState(0)
  const [firmwareData, setFirmwareData] = useState<Uint8Array | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [provision, setProvision] = useState<ProvisionConfig>(defaultProvision)
  const [webSerialSupported] = useState(
    typeof navigator !== "undefined" && "serial" in navigator,
  )
  const abortRef = useRef(false)

  const log = useCallback((text: string, type: TerminalLine["type"] = "info") => {
    setTerminal((prev) => [...prev, { text, type }])
  }, [])

  const loadFirmwareFromServer = async (): Promise<Uint8Array | null> => {
    try {
      log("Fetching firmware from server...")
      const resp = await fetch(FIRMWARE_URL)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const buf = await resp.arrayBuffer()
      const data = new Uint8Array(buf)
      setFirmwareData(data)
      setFirmwareSize(data.length)
      log(`Downloaded firmware: ${(data.length / 1024).toFixed(1)} KB`, "success")
      return data
    } catch (e) {
      log(`Failed to fetch firmware: ${e}`, "error")
      return null
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = new Uint8Array(reader.result as ArrayBuffer)
      setFirmwareData(data)
      setFirmwareSize(data.length)
      log(`Loaded firmware from file: ${(data.length / 1024).toFixed(1)} KB`, "success")
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFlash = async () => {
    abortRef.current = false
    setStatus("connecting")
    setTerminal([])
    setProgress(0)
    setError("")

    try {
      const { ESPLoader, Transport } = await import("esptool-js")

      log("Requesting serial port access...")
      if (!navigator.serial) throw new Error("WebSerial not supported")
      const port = await navigator.serial.requestPort()
      log("Serial port acquired")

      log("Connecting to ESP32 (baud 460800)...")
      const transport = new Transport(port, true)
      const esploader = new ESPLoader({
        transport,
        baudrate: 460800,
        terminal: {
          clean: () => {},
          writeLine: (data: string) => log(data),
          write: (data: string) => log(data),
        },
        debugLogging: false,
      })

      const chip = await esploader.main()
      setChipName(chip)
      log(`Connected: ${chip}`, "success")
      setStatus("flashing")
      setActiveStep(2)

      let data = firmwareData
      if (!data) {
        data = await loadFirmwareFromServer()
        if (!data) throw new Error("Failed to load firmware")
      }

      log("Erasing flash...")
      await esploader.eraseFlash()

      log("Writing firmware...")
      const flashOptions = {
        fileArray: [{ data, address: 0x0 }],
        flashMode: "dio" as const,
        flashFreq: "40m" as const,
        flashSize: "4MB" as const,
        eraseAll: false,
        compress: true,
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          const pct = Math.round((written / total) * 100)
          setProgress(pct)
          if (pct % 10 === 0) log(`Flash progress: ${pct}%`)
        },
      }

      await esploader.writeFlash(flashOptions)
      log("Flash complete!", "success")

      log("Resetting device...")
      await esploader.after("hard_reset")

      await transport.disconnect()
      setStatus("done")
      setActiveStep(3)
      log("Device flashed and rebooted successfully!", "success")
    } catch (e: any) {
      if (e?.name === "NotFoundError") {
        log("No serial port selected", "error")
        setStatus("idle")
      } else {
        const msg = e?.message || String(e)
        log(`Error: ${msg}`, "error")
        setError(msg)
        setStatus("error")
      }
    }
  }

  const steps = [
    {
      label: "Load Firmware",
      description: "Download the latest firmware or upload a local .bin file.",
      content: (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={loadFirmwareFromServer} disabled={!!firmwareData}>
            {firmwareData ? `Firmware loaded (${(firmwareSize / 1024).toFixed(1)} KB)` : `Download Firmware ${FIRMWARE_VERSION}`}
          </Button>
          <Typography variant="body2" color="text.secondary">or upload a local .bin file:</Typography>
          <Button variant="outlined" component="label">
            Upload .bin File
            <input type="file" accept=".bin" hidden onChange={handleFileUpload} />
          </Button>
          {firmwareData && (
            <Alert severity="success">
              Firmware ready: {(firmwareSize / 1024).toFixed(1)} KB
            </Alert>
          )}
        </Box>
      ),
    },
    {
      label: "Connect Device",
      description: "Connect your ESP32-WROOM board via USB and select the serial port.",
      content: (
        <Box>
          {!webSerialSupported ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              WebSerial is not supported in this browser. Use Google Chrome or Microsoft Edge (v89+).
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Connect your ESP32 board via USB, then click "Flash Firmware" to select the serial port.
              The device will be reset automatically.
            </Alert>
          )}
          <List dense>
            <ListItem>
              <ListItemIcon><UsbIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Plug ESP32-WROOM into USB" />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
              <ListItemText primary="Hold BOOT button if connection fails (some boards require this)" />
            </ListItem>
          </List>
        </Box>
      ),
    },
    {
      label: "Flash Firmware",
      description: "Flash the Sp1d3r Node firmware to the device.",
      content: (
        <Box>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<FlashOnIcon />}
            onClick={handleFlash}
            disabled={!webSerialSupported || status === "connecting" || status === "flashing"}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {status === "connecting" ? "Connecting..." : status === "flashing" ? "Flashing..." : "Flash Firmware"}
          </Button>
          {(status === "connecting" || status === "flashing") && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
                {progress}%
              </Typography>
            </Box>
          )}
          {chipName && (
            <Chip label={`Detected: ${chipName}`} color="success" sx={{ mt: 2 }} />
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
          )}
          {status === "done" && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Firmware flashed successfully! The device will reboot into AP mode.
            </Alert>
          )}
        </Box>
      ),
    },
    {
      label: "Provision Device",
      description: "Configure WiFi and server settings after flashing.",
      content: (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            After flashing, the ESP32 boots into AP mode. Connect to WiFi network <strong>"Sp1d3r-Node"</strong> (password: <strong>sp1d3r123</strong>)
            and open <Link href="http://192.168.4.1" target="_blank">http://192.168.4.1</Link> to configure.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            Provisioning Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your settings below. These are for reference — you'll input them on the device's web UI.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <WifiIcon fontSize="small" /> WiFi Settings
              </Typography>
              <TextField
                fullWidth size="small" label="WiFi SSID" placeholder="YourHomeNetwork"
                value={provision.wifi_ssid}
                onChange={(e) => setProvision({ ...provision, wifi_ssid: e.target.value })}
              />
              <TextField
                fullWidth size="small" label="WiFi Password" placeholder="YourPassword" type="password"
                value={provision.wifi_pass}
                onChange={(e) => setProvision({ ...provision, wifi_pass: e.target.value })}
                sx={{ mt: 1 }}
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <SettingsIcon fontSize="small" /> Server URLs
              </Typography>
              <TextField fullWidth size="small" label="CityHall URL" value={provision.cityhall_url}
                onChange={(e) => setProvision({ ...provision, cityhall_url: e.target.value })} />
              <TextField fullWidth size="small" label="Director URL" value={provision.director_url}
                onChange={(e) => setProvision({ ...provision, director_url: e.target.value })} sx={{ mt: 1 }} />
              <TextField fullWidth size="small" label="Sp1d3r URL" value={provision.sp1d3r_url}
                onChange={(e) => setProvision({ ...provision, sp1d3r_url: e.target.value })} sx={{ mt: 1 }} />
              <TextField fullWidth size="small" label="Device Name" value={provision.device_name}
                onChange={(e) => setProvision({ ...provision, device_name: e.target.value })} sx={{ mt: 1 }} />
            </Box>

            <Alert severity="success">
              <strong>After AP setup:</strong> The node will authenticate with CityHall, register as a peer,
              and begin syncing the chain. Monitor status at <Link href="http://192.168.4.1" target="_blank">192.168.4.1</Link> once connected to WiFi.
            </Alert>
          </Box>
        </Box>
      ),
    },
  ]

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          ESP32 Flasher
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Flash and provision your Sp1d3r Node directly from the browser
        </Typography>
        <Chip label={`Firmware ${FIRMWARE_VERSION}`} color="primary" />
      </Box>

      <Paper variant="outlined" sx={{ p: 4, mb: 4 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label} expanded>
              <StepLabel
                optional={
                  index === steps.length - 1 ? (
                    <Typography variant="caption">Final step</Typography>
                  ) : null
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                {step.content}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setActiveStep(index + 1)}
                    disabled={index >= activeStep || (index === 2 && status !== "done")}
                  >
                    {index === steps.length - 1 ? "Finish" : "Continue"}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {status === "done" && (
          <Paper sx={{ p: 3, mt: 2, textAlign: "center" }} variant="outlined">
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              Node Ready!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your Sp1d3r Node is running. Connect to its AP to complete provisioning.
            </Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => { setActiveStep(0); setStatus("idle"); setProgress(0); setFirmwareData(null); setChipName(""); setTerminal([]) }}>
              Flash Another Device
            </Button>
          </Paper>
        )}
      </Paper>

      {terminal.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 4 }}>
          <Box
            sx={{ p: 1.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            onClick={() => setShowTerminal(!showTerminal)}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Console Output ({terminal.length} lines)
            </Typography>
            {showTerminal ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
          <Collapse in={showTerminal}>
            <Box
              sx={{
                p: 2,
                backgroundColor: "grey.950",
                maxHeight: 300,
                overflow: "auto",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                lineHeight: 1.6,
              }}
            >
              {terminal.map((line, i) => (
                <Box
                  key={i}
                  sx={{
                    color:
                      line.type === "error"
                        ? "error.main"
                        : line.type === "success"
                          ? "success.main"
                          : "grey.400",
                  }}
                >
                  {line.text}
                </Box>
              ))}
            </Box>
          </Collapse>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          Requirements
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><UsbIcon /></ListItemIcon>
            <ListItemText primary="ESP32-WROOM-32 board with USB cable" />
          </ListItem>
          <ListItem>
            <ListItemIcon><InfoIcon /></ListItemIcon>
            <ListItemText primary="Google Chrome or Microsoft Edge (v89+) with WebSerial support" />
          </ListItem>
          <ListItem>
            <ListItemIcon><FlashOnIcon /></ListItemIcon>
            <ListItemText primary="USB-to-Serial driver installed (CP2102 or CH340)" />
          </ListItem>
        </List>
      </Paper>
    </Container>
  )
}
