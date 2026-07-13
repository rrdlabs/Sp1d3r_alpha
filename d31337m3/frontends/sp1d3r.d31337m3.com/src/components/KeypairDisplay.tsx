import { useState } from "react"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Typography,
} from "@mui/material"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"

interface KeypairDisplayProps {
  seedPhrase: string
  privateKeyHex: string
  publicKeyHex: string
  onContinue: () => void
}

export default function KeypairDisplay({ seedPhrase, privateKeyHex, publicKeyHex, onContinue }: KeypairDisplayProps) {
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
      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Save your seed phrase now
        </Typography>
        <Typography variant="body2">
          This is the only time your seed phrase will be shown. If you lose it, you will not be able to recover your keypair.
        </Typography>
      </Alert>

      <Typography variant="h6" gutterBottom sx={{ fontFamily: "monospace" }}>
        Seed Phrase
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
          {words.map((word, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 18 }}>
                {i + 1}.
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                {word}
              </Typography>
            </Box>
          ))}
        </Box>
        <Button
          size="small"
          startIcon={<ContentCopyIcon />}
          sx={{ mt: 1.5 }}
          onClick={() => copyToClipboard(seedPhrase, "seed")}
        >
          {copiedField === "seed" ? "Copied" : "Copy seed phrase"}
        </Button>
      </Paper>

      <Typography variant="subtitle2" gutterBottom sx={{ fontFamily: "monospace" }}>
        Private Key
      </Typography>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "action.hover" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all", flex: 1, mr: 1 }}>
            {privateKeyHex}
          </Typography>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(privateKeyHex, "priv")}>
            {copiedField === "priv" ? "Copied" : "Copy"}
          </Button>
        </Box>
      </Paper>

      <Typography variant="subtitle2" gutterBottom sx={{ fontFamily: "monospace" }}>
        Public Key
      </Typography>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 3, bgcolor: "action.hover" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all", flex: 1, mr: 1 }}>
            {publicKeyHex}
          </Typography>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(publicKeyHex, "pub")}>
            {copiedField === "pub" ? "Copied" : "Copy"}
          </Button>
        </Box>
      </Paper>

      <FormControlLabel
        control={<Checkbox checked={saved} onChange={(e) => setSaved(e.target.checked)} />}
        label="I have saved my seed phrase and private key"
        sx={{ mb: 2 }}
      />

      <Button variant="contained" fullWidth disabled={!saved} onClick={onContinue}>
        Continue to Verification
      </Button>
    </Box>
  )
}
