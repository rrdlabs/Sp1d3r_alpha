import { useState, useEffect } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import SendIcon from "@mui/icons-material/Send"
import EditIcon from "@mui/icons-material/Edit"
import { apiRequest } from "../../api/client"

interface Signature {
  id: string
  label: string
  signature_image: string | null
  signature_text: string | null
  is_default: boolean
  created_at: string
}

interface Document {
  id: string
  broker_id: number | null
  document_type: string
  title: string
  content: string
  status: string
  signature_id: string | null
  recipient_email: string | null
  recipient_address: string | null
  meta: Record<string, unknown>
  created_at: string
}

const DOC_TYPES = [
  { value: "opt_out", label: "Opt-Out Request" },
  { value: "removal_request", label: "Data Removal Request" },
  { value: "ccpa_request", label: "CCPA Request" },
  { value: "gdpr_request", label: "GDPR Request" },
  { value: "custom", label: "Custom Letter" },
]

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "info" | "error"> = {
  draft: "default",
  generated: "info",
  sent: "warning",
  completed: "success",
  failed: "error",
}

export default function UserDocuments() {
  const [docs, setDocs] = useState<Document[]>([])
  const [sigs, setSigs] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)
  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [sigDialogOpen, setSigDialogOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<Document | null>(null)

  const [docType, setDocType] = useState("opt_out")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")

  const [sigText, setSigText] = useState("")
  const [sigLabel, setSigLabel] = useState("default")

  const loadAll = async () => {
    setLoading(true)
    const [docsRes, sigsRes] = await Promise.all([
      apiRequest<Document[]>("cityhall", "GET", "/documents"),
      apiRequest<Signature[]>("cityhall", "GET", "/signatures"),
    ])
    if (docsRes.ok) setDocs(docsRes.data)
    if (sigsRes.ok) setSigs(sigsRes.data)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const openNewDoc = () => {
    setEditDoc(null)
    setDocType("opt_out")
    setTitle("")
    setContent("")
    setRecipientEmail("")
    setRecipientAddress("")
    setDocDialogOpen(true)
  }

  const openEditDoc = (doc: Document) => {
    setEditDoc(doc)
    setDocType(doc.document_type)
    setTitle(doc.title)
    setContent(doc.content)
    setRecipientEmail(doc.recipient_email || "")
    setRecipientAddress(doc.recipient_address || "")
    setDocDialogOpen(true)
  }

  const saveDoc = async () => {
    const defaultSig = sigs.find((s) => s.is_default)
    if (editDoc) {
      await apiRequest("cityhall", "PATCH", `/documents/${editDoc.id}`, {
        title, content, recipient_email: recipientEmail || null, recipient_address: recipientAddress || null,
      })
    } else {
      await apiRequest("cityhall", "POST", "/documents", {
        document_type: docType, title, content,
        signature_id: defaultSig?.id || null,
        recipient_email: recipientEmail || null, recipient_address: recipientAddress || null,
      })
    }
    setDocDialogOpen(false)
    loadAll()
  }

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return
    await apiRequest("cityhall", "DELETE", `/documents/${id}`)
    loadAll()
  }

  const generateDoc = async (id: string) => {
    await apiRequest("cityhall", "POST", `/documents/${id}/generate`)
    loadAll()
  }

  const saveSig = async () => {
    await apiRequest("cityhall", "POST", "/signatures", {
      label: sigLabel, signature_text: sigText, is_default: sigs.length === 0,
    })
    setSigDialogOpen(false)
    setSigText("")
    setSigLabel("default")
    loadAll()
  }

  const deleteSig = async (id: string) => {
    if (!confirm("Delete this signature?")) return
    await apiRequest("cityhall", "DELETE", `/signatures/${id}`)
    loadAll()
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace" }}>
        My Documents
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate opt-out and removal letters for data brokers.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontFamily: "monospace" }}>Documents</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNewDoc} size="small">
                New Document
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {docs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {loading ? "Loading..." : "No documents yet. Create your first opt-out letter."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {docs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell>
                        <Chip size="small" label={DOC_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={doc.status} color={STATUS_COLORS[doc.status] || "default"} />
                      </TableCell>
                      <TableCell>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditDoc(doc)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => generateDoc(doc.id)}><SendIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => deleteDoc(doc.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontFamily: "monospace" }}>Signatures</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setSigDialogOpen(true)} size="small">
                Add
              </Button>
            </Box>
            {sigs.length === 0 && (
              <Alert severity="info" sx={{ mb: 1 }}>
                No signatures yet. Add one to embed in your letters.
              </Alert>
            )}
            {sigs.map((sig) => (
              <Paper key={sig.id} variant="outlined" sx={{ p: 1.5, mb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{sig.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {sig.signature_text || "(image)"}
                  </Typography>
                  {sig.is_default && <Chip size="small" label="default" color="primary" sx={{ ml: 1 }} />}
                </Box>
                <IconButton size="small" onClick={() => deleteSig(sig.id)}><DeleteIcon fontSize="small" /></IconButton>
              </Paper>
            ))}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editDoc ? "Edit Document" : "New Document"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Document Type</InputLabel>
                <Select value={docType} label="Document Type" onChange={(e) => setDocType(e.target.value)} disabled={!!editDoc}>
                  {DOC_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={8} label="Letter Content" value={content} onChange={(e) => setContent(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Recipient Email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Recipient Address" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveDoc}>{editDoc ? "Save" : "Create"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={sigDialogOpen} onClose={() => setSigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Signature</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Label" value={sigLabel} onChange={(e) => setSigLabel(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth multiline minRows={3} label="Signature Text" value={sigText} onChange={(e) => setSigText(e.target.value)} placeholder="Type your name as it should appear on documents" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSigDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSig}>Save Signature</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
