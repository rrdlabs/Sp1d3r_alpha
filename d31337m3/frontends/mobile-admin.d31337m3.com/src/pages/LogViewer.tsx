import { useState, useEffect, useRef } from "react"
import { Box, Container, Typography, Paper, IconButton } from "@mui/material"
import TerminalIcon from "@mui/icons-material/Terminal"
import RefreshIcon from "@mui/icons-material/Refresh"

export default function LogViewer() {
  const [logs, setLogs] = useState<string[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${window.location.protocol}//${window.location.hostname}:8400/logs?lines=100`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.lines || data.log || [])
      }
    } catch { setLogs(["[unable to fetch logs]"]) }
  }

  useEffect(() => { fetchLogs() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [logs])

  return (
    <Container maxWidth="sm" sx={{ pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TerminalIcon color="secondary" />
          <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Logs</Typography>
        </Box>
        <IconButton onClick={fetchLogs} size="small"><RefreshIcon /></IconButton>
      </Box>
      <Paper variant="outlined" sx={{ p: 1.5, maxHeight: "70dvh", overflow: "auto", bgcolor: "background.default" }}>
        {logs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No logs available</Typography>
        ) : logs.map((line, i) => (
          <Typography key={i} variant="caption" sx={{ fontFamily: "monospace", display: "block", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>
            {line}
          </Typography>
        ))}
        <div ref={endRef} />
      </Paper>
    </Container>
  )
}
