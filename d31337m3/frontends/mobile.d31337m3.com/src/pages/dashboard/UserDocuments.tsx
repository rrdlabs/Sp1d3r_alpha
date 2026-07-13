import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import SendIcon from "@mui/icons-material/Send"
import EditIcon from "@mui/icons-material/Edit"
import DescriptionIcon from "@mui/icons-material/Description"
import SignaturePad from "../../components/SignaturePad"
import { DOC_TEMPLATES, TEMPLATE_CATEGORIES, type DocTemplate } from "../../data/docTemplates"
import { useAuth } from "../../context/AuthContext"
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
  auto_submit: boolean
  meta: Record<string, unknown>
  created_at: string
}

const DOC_TYPES = [
  { value: "opt_out", label: "Opt-Out" },
  { value: "removal_request", label: "Removal" },
  { value: "ccpa_request", label: "CCPA" },
  { value: "gdpr_request", label: "GDPR" },
  { value: "custom", label: "Custom" },
]

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "info" | "error"> = {
  draft: "default",
  generated: "info",
  sent: "warning",
  completed: "success",
  failed: "error",
}

export default function UserDocuments() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<Document[]>([])
  const [sigs, setSigs] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)

  const fillTemplate = (text: string) => {
    const now = new Date()
    const u = user as any
    const fullName = u ? `${u.first_name} ${u.last_name}` : ""
    const fullAddress = u
      ? [u.address_line1, u.address_line2, u.city, u.state, u.zip_code, u.country]
          .filter(Boolean)
          .join(", ")
      : ""
    return text
      .replace(/\[YOUR NAME\]/g, fullName)
      .replace(/\[YOUR EMAIL\]/g, u?.email || "")
      .replace(/\[YOUR PHONE\]/g, u?.phone || "")
      .replace(/\[YOUR ADDRESS\]/g, fullAddress || "[Your Address]")
      .replace(/\[YOUR USERNAME\]/g, u?.username || "")
      .replace(/\[DATE\]/g, now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
      .replace(/\[RECIPIENT NAME\]/g, "[Recipient Name]")
      .replace(/\[RECIPIENT ADDRESS\]/g, "[Recipient Address]")
      .replace(/\[COMPANY ADDRESS\]/g, "[Company Address]")
      .replace(/\[SERVICE PROVIDER \/ HOSTING COMPANY\]/g, "[Service Provider]")
      .replace(/\[ACCOUNT NAME IF APPLICABLE\]/g, "")
      .replace(/\[ACCOUNT NUMBER\]/g, "[Account Number]")
      .replace(/\[WORK TITLE\]/g, "[Work Title]")
      .replace(/\[URL\(S\) OF INFRINGING CONTENT\]/g, "[URLs]")
      .replace(/\[DESCRIBE (?:CONDUCT|STATEMENTS|INACCURATE ITEMS)\]/g, "[Describe here]")
      .replace(/\[EXPLAIN WHY EACH ITEM IS INACCURATE\]/g, "[Explain here]")
      .replace(/\[CITE SPECIFIC STATUTES\]/g, "[Cite applicable statutes]")
      .replace(/\[LAST 4 SSN\]/g, u?.ssn_last4 || "[Last 4 SSN]")
      .replace(/\[DOB\]/g, u?.dob || "[Date of Birth]")
      .replace(/\[PREVIOUS ADDRESS\]/g, "[Previous Address if applicable]")
  }

  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [sigDialogOpen, setSigDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateFilter, setTemplateFilter] = useState("all")
  const [editDoc, setEditDoc] = useState<Document | null>(null)

  const [docType, setDocType] = useState("opt_out")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [autoSubmit, setAutoSubmit] = useState(false)

  const [sigText, setSigText] = useState("")
  const [sigLabel, setSigLabel] = useState("default")
  const [sigImage, setSigImage] = useState<string>("")
  const [sigTab, setSigTab] = useState(0)

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

  const applyTemplate = (tpl: DocTemplate) => {
    setEditDoc(null)
    setDocType(tpl.doc_type)
    setTitle(tpl.name)
    setContent(fillTemplate(tpl.content))
    setRecipientEmail("")
    setRecipientAddress("")
    setTemplateDialogOpen(false)
    setDocDialogOpen(true)
  }

  const openNewBlankDoc = () => {
    setEditDoc(null)
    setDocType("opt_out")
    setTitle("")
    setContent("")
    setRecipientEmail("")
    setRecipientAddress("")
    setTemplateDialogOpen(false)
    setDocDialogOpen(true)
  }

  const openEditDoc = (doc: Document) => {
    setEditDoc(doc)
    setDocType(doc.document_type)
    setTitle(doc.title)
    setContent(doc.content)
    setRecipientEmail(doc.recipient_email || "")
    setRecipientAddress(doc.recipient_address || "")
    setAutoSubmit(doc.auto_submit)
    setDocDialogOpen(true)
  }

  const saveDoc = async () => {
    const defaultSig = sigs.find((s) => s.is_default)
    if (editDoc) {
      await apiRequest("cityhall", "PATCH", `/documents/${editDoc.id}`, {
        title, content, recipient_email: recipientEmail || null, recipient_address: recipientAddress || null,
        auto_submit: autoSubmit,
      })
    } else {
      await apiRequest("cityhall", "POST", "/documents", {
        document_type: docType, title, content,
        signature_id: defaultSig?.id || null,
        recipient_email: recipientEmail || null, recipient_address: recipientAddress || null,
        auto_submit: autoSubmit,
      })
    }
    setDocDialogOpen(false)
    loadAll()
  }

  const deleteDoc = async (id: string) => {
    await apiRequest("cityhall", "DELETE", `/documents/${id}`)
    loadAll()
  }

  const generateDoc = async (id: string) => {
    await apiRequest("cityhall", "POST", `/documents/${id}/generate`)
    loadAll()
  }

  const saveSig = async () => {
    const hasDrawing = sigTab === 0 && sigImage
    await apiRequest("cityhall", "POST", "/signatures", {
      label: sigLabel,
      signature_text: sigTab === 1 ? sigText : null,
      signature_image: hasDrawing ? sigImage : null,
      is_default: sigs.length === 0,
    })
    setSigDialogOpen(false)
    setSigText("")
    setSigLabel("default")
    setSigImage("")
    setSigTab(0)
    loadAll()
  }

  const deleteSig = async (id: string) => {
    await apiRequest("cityhall", "DELETE", `/signatures/${id}`)
    loadAll()
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <DescriptionIcon color="primary" />
        <Typography variant="h5" sx={{ fontFamily: "monospace", fontWeight: 700 }}>Documents</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Generate opt-out and removal letters
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTemplateDialogOpen(true)} size="small">
          New Document
        </Button>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setSigDialogOpen(true)} size="small">
          Signature
        </Button>
      </Box>

      {sigs.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>Signatures</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {sigs.map((sig) => (
              <Chip
                key={sig.id}
                label={sig.label}
                size="small"
                color={sig.is_default ? "primary" : "default"}
                onDelete={() => deleteSig(sig.id)}
                avatar={sig.signature_image ? <Box component="img" src={sig.signature_image} sx={{ width: 24, height: 16, objectFit: "contain", ml: 0.5 }} /> : undefined}
              />
            ))}
          </Box>
        </Paper>
      )}

      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Loading...</Typography>
      ) : docs.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <DescriptionIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
          <Typography variant="body2" color="text.secondary">No documents yet. Create your first letter.</Typography>
        </Paper>
      ) : (
        docs.map((doc) => (
          <Paper key={doc.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{doc.title}</Typography>
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                  <Chip size="small" label={DOC_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type} variant="outlined" />
                  <Chip size="small" label={doc.status} color={STATUS_COLORS[doc.status] || "default"} />
                  {doc.auto_submit && <Chip size="small" label="auto" color="info" variant="outlined" />}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 0 }}>
                <IconButton size="small" onClick={() => openEditDoc(doc)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => generateDoc(doc.id)} color="primary"><SendIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => deleteDoc(doc.id)}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
          </Paper>
        ))
      )}

      <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editDoc ? "Edit Document" : "New Document"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={docType} label="Type" onChange={(e) => setDocType(e.target.value)} disabled={!!editDoc}>
                {DOC_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField fullWidth multiline minRows={6} label="Letter Content" value={content} onChange={(e) => setContent(e.target.value)} />
            <TextField fullWidth size="small" label="Recipient Email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
            <TextField fullWidth size="small" label="Recipient Address" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} size="small" />
              <Typography variant="body2">Auto-submit on generate</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveDoc}>{editDoc ? "Save" : "Create"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={sigDialogOpen} onClose={() => setSigDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Signature</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Label" value={sigLabel} onChange={(e) => setSigLabel(e.target.value)} sx={{ mb: 1 }} />
          <Tabs value={sigTab} onChange={(_, v) => setSigTab(v)} sx={{ mb: 1 }}>
            <Tab label="Draw" />
            <Tab label="Type" />
          </Tabs>
          {sigTab === 0 && <SignaturePad onSignature={setSigImage} existingImage={sigImage || null} />}
          {sigTab === 1 && (
            <TextField fullWidth multiline minRows={3} label="Typed Signature" value={sigText} onChange={(e) => setSigText(e.target.value)} placeholder="Type your name" />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSigDialogOpen(false); setSigImage(""); setSigText(""); setSigTab(0) }}>Cancel</Button>
          <Button variant="contained" onClick={saveSig} disabled={sigTab === 0 && !sigImage && !sigText}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle sx={{ fontFamily: "monospace" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DescriptionIcon color="primary" />
            Choose Template
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", gap: 0.5, mb: 2, flexWrap: "wrap" }}>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.label}
                onClick={() => setTemplateFilter(cat.id)}
                color={templateFilter === cat.id ? "primary" : "default"}
                variant={templateFilter === cat.id ? "filled" : "outlined"}
                size="small"
              />
            ))}
          </Box>
          {DOC_TEMPLATES
            .filter((t) => templateFilter === "all" || t.category === templateFilter)
            .map((tpl) => (
              <Paper
                key={tpl.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 1,
                  cursor: "pointer",
                  transition: "0.2s",
                  "&:hover": { borderColor: "primary.main", bgcolor: "rgba(0, 230, 118, 0.04)" },
                }}
                onClick={() => applyTemplate(tpl)}
              >
                <Chip size="small" label={tpl.category} variant="outlined" sx={{ fontSize: "0.65rem", mb: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{tpl.name}</Typography>
                <Typography variant="caption" color="text.secondary">{tpl.description}</Typography>
              </Paper>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button variant="outlined" onClick={openNewBlankDoc}>Blank</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
