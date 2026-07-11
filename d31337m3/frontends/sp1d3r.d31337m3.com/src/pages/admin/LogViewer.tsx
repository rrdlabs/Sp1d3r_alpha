import { useState, useEffect, useRef } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Chip,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import TerminalIcon from "@mui/icons-material/Terminal"
import { apiRequest } from "../../api/client"

const SERVICES = [
  { name: "cityhall", port: 8000 },
  { name: "historian", port: 8100 },
  { name: "lawyer", port: 8200 },
  { name: "inboxer", port: 8300 },
  { name: "director", port: 8400 },
  { name: "picaso", port: 8500 },
  { name: "spiderwire", port: 8600 },
  { name: "sp1d3r", port: 9000 },
]

export default function LogViewer() {
  const [selected, setSelected] = useState("sp1d3r")
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lineCount, setLineCount] = useState(50)
  const [liveView, setLiveView] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadLogs = async () => {
    setLoading(true)
    setError("")
    const res = await apiRequest<{ lines: string[] }>("director", "GET", `/logs/${selected}?lines=${lineCount}`)
    if (res.ok) {
      setLines(res.data.lines || [])
    } else {
      setError(`Failed to load logs for ${selected}`)
      setLines([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLogs()
    const interval = setInterval(() => {
      loadLogs()
    }, liveView ? 2000 : 15000)
    return () => clearInterval(interval)
  }, [selected, liveView])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [lines])

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TerminalIcon color="primary" />
          <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
            Log Viewer
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Lines</InputLabel>
            <Select value={lineCount} label="Lines" onChange={(e) => setLineCount(Number(e.target.value))}>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
            </Select>
          </FormControl>
          <Button startIcon={<RefreshIcon />} onClick={loadLogs}>Refresh</Button>
          <FormControlLabel
            control={<Switch size="small" checked={liveView} onChange={(e) => setLiveView(e.target.checked)} />}
            label="Live View"
          />
          {liveView && <Chip label="Auto-refreshing" size="small" color="success" variant="outlined" />}
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {SERVICES.map((s) => (
            <Button
              key={s.name}
              variant={selected === s.name ? "contained" : "outlined"}
              size="small"
              onClick={() => setSelected(s.name)}
              sx={{ fontFamily: "monospace" }}
            >
              {s.name}
              <Typography variant="caption" sx={{ ml: 0.5, opacity: 0.6 }}>:{s.port}</Typography>
            </Button>
          ))}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: "#0d1117",
          height: 500,
          overflow: "auto",
          fontFamily: "monospace",
          fontSize: "0.75rem",
          lineHeight: 1.6,
          color: "#c9d1d9",
        }}
      >
        {loading ? (
          <CircularProgress size={24} />
        ) : lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No logs available</Typography>
        ) : (
          lines.map((line, i) => (
            <Box key={i} sx={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {line}
            </Box>
          ))
        )}
        <div ref={bottomRef} />
      </Paper>
    </Container>
  )
}
