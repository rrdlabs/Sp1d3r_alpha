import { useState } from "react"
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Typography } from "@mui/material"
import { useTheme } from "@mui/material/styles"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"

interface KeypairDisplayProps {
  seedPhrase: string
  privateKeyHex: string
  publicKeyHex: string
  onContinue: () => void
}

export default function KeypairDisplay({ seedPhrase, privateKeyHex, publicKeyHex, onContinue }: KeypairDisplayProps) {
  const theme = useTheme()
  const [saved, setSaved] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const words = seedPhrase.split(" ")

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <Box>
      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Save your seed phrase now
        </Typography>
        <Typography variant="body2">
          This is the only time your seed phrase will be shown. If you lose it, you cannot recover your keypair.
        </Typography>
      </Alert>

      <Typography variant="subtitle2" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700 }}>
        Seed Phrase
      </Typography>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: theme.palette.action.hover }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75 }}>
          {words.map((word, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 16, fontSize: "0.65rem" }}>
                {i + 1}.
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.8rem" }}>
                {word}
              </Typography>
            </Box>
          ))}
        </Box>
        <Button size="small" startIcon={<ContentCopyIcon />} sx={{ mt: 1 }} onClick={() => copyToClipboard(seedPhrase, "seed")}>
          {copiedField === "seed" ? "Copied" : "Copy seed phrase"}
        </Button>
      </Paper>

      <Typography variant="caption" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700, display: "block" }}>
        Private Key
      </Typography>
      <Paper variant="outlined" sx={{ p: 1, mb: 1.5, bgcolor: theme.palette.action.hover }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all", flex: 1, mr: 0.5, fontSize: "0.65rem" }}>
            {privateKeyHex}
          </Typography>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(privateKeyHex, "priv")} sx={{ minWidth: "auto" }}>
            {copiedField === "priv" ? "Ok" : "Copy"}
          </Button>
        </Box>
      </Paper>

      <Typography variant="caption" gutterBottom sx={{ fontFamily: "monospace", fontWeight: 700, display: "block" }}>
        Public Key
      </Typography>
      <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: theme.palette.action.hover }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all", flex: 1, mr: 0.5, fontSize: "0.65rem" }}>
            {publicKeyHex}
          </Typography>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(publicKeyHex, "pub")} sx={{ minWidth: "auto" }}>
            {copiedField === "pub" ? "Ok" : "Copy"}
          </Button>
        </Box>
      </Paper>

      <FormControlLabel
        control={<Checkbox checked={saved} onChange={(e) => setSaved(e.target.checked)} size="small" />}
        label={<Typography variant="caption">I have saved my seed phrase and private key</Typography>}
        sx={{ mb: 1.5 }}
      />

      <Button variant="contained" fullWidth disabled={!saved} onClick={onContinue} size="small">
        Continue to Verification
      </Button>
    </Box>
  )
}
