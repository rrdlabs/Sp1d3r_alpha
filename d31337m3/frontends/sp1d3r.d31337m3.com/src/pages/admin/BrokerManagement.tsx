import { useState, useEffect, useCallback, useRef } from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  Grid,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Pagination,
  LinearProgress,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import RefreshIcon from "@mui/icons-material/Refresh"
import UploadIcon from "@mui/icons-material/Upload"
import DownloadIcon from "@mui/icons-material/Download"
import SearchIcon from "@mui/icons-material/Search"
import { apiRequest } from "../../api/client"
import { useAuth } from "../../context/AuthContext"

interface Broker {
  id: number
  name: string
  display_name: string
  category: string
  website: string
  email: string
  phone: string
  address: string
  country: string
  state: string
  opt_out_url: string
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { value: "data_broker", label: "Data Broker" },
  { value: "people_search", label: "People Search" },
  { value: "social_media", label: "Social Media" },
  { value: "public_records", label: "Public Records" },
  { value: "credit_bureau", label: "Credit Bureau" },
  { value: "other", label: "Other" },
]

const CATEGORY_MAP: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
)

const EMPTY_BROKER: Partial<Broker> = {
  name: "",
  display_name: "",
  category: "data_broker",
  website: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  state: "",
  opt_out_url: "",
  notes: "",
  is_active: true,
}

export default function BrokerManagement() {
  useAuth()
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null)
  const [form, setForm] = useState<Partial<Broker>>({ ...EMPTY_BROKER })
  const [saving, setSaving] = useState(false)

  const [csvOpen, setCsvOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvErrors, setCsvErrors] = useState<string[]>([])
  const [csvResults, setCsvResults] = useState<{ imported: number; skipped: number; errors: { row: number; error: string }[] } | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pageSize = 25

  const loadBrokers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (search) params.set("q", search)
    const [listRes, countRes] = await Promise.all([
      apiRequest<{ items: Broker[] }>("cityhall", "GET", `/admin/brokers?${params.toString()}`),
      apiRequest<{ count: number }>("cityhall", "GET", "/admin/brokers/count"),
    ])
    if (listRes.ok) setBrokers(listRes.data.items || [])
    if (countRes.ok) setTotalCount(countRes.data.count || 0)
    setLoading(false)
  }, [page, search])

  const loadCount = useCallback(async () => {
    const res = await apiRequest<{ count: number }>("cityhall", "GET", "/admin/brokers/count")
    if (res.ok) setTotalCount(res.data.count || 0)
  }, [])

  useEffect(() => {
    loadBrokers()
  }, [loadBrokers])

  useEffect(() => {
    loadCount()
  }, [loadCount])

  const handleRefresh = () => {
    loadBrokers()
    loadCount()
  }

  const handleSearchSubmit = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearchSubmit()
  }

  const openAddDialog = () => {
    setEditingBroker(null)
    setForm({ ...EMPTY_BROKER })
    setDialogOpen(true)
  }

  const openEditDialog = (broker: Broker) => {
    setEditingBroker(broker)
    setForm({
      name: broker.name,
      display_name: broker.display_name,
      category: broker.category,
      website: broker.website,
      email: broker.email,
      phone: broker.phone,
      address: broker.address,
      country: broker.country,
      state: broker.state,
      opt_out_url: broker.opt_out_url,
      notes: broker.notes,
      is_active: broker.is_active,
    })
    setDialogOpen(true)
  }

  const handleFormChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveBroker = async () => {
    if (!form.name?.trim() || !form.display_name?.trim()) {
      setError("Name and Display Name are required")
      return
    }
    setSaving(true)
    setError("")
    let res
    if (editingBroker) {
      res = await apiRequest("cityhall", "PUT", `/admin/brokers/${editingBroker.id}`, form)
    } else {
      res = await apiRequest("cityhall", "POST", "/admin/brokers", form)
    }
    setSaving(false)
    if (res.ok) {
      setMsg(editingBroker ? "Broker updated" : "Broker created")
      setDialogOpen(false)
      loadBrokers()
      loadCount()
    } else {
      setError(editingBroker ? "Failed to update broker" : "Failed to create broker")
    }
  }

  const handleDeleteBroker = async (broker: Broker) => {
    if (!confirm(`Delete broker "${broker.display_name}"?`)) return
    setError("")
    const res = await apiRequest("cityhall", "DELETE", `/admin/brokers/${broker.id}`)
    if (res.ok) {
      setMsg(`Deleted "${broker.display_name}"`)
      loadBrokers()
      loadCount()
    } else {
      setError("Failed to delete broker")
    }
  }

  const downloadTemplate = () => {
    const headers = "name,display_name,category,website,email,phone,address,country,state,opt_out_url,notes"
    const example = "example_broker,Example Broker,data_broker,https://example.com,contact@example.com,+1-555-0100,123 Main St,US,CA,https://example.com/opt-out,Template row — replace with real data"
    const csv = `${headers}\n${example}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "broker_import_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCsv = (text: string) => {
    const lines = text.trim().split("\n")
    if (lines.length < 2) {
      setCsvErrors(["CSV must have a header row and at least one data row"])
      return
    }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"))
    const expected = ["name", "display_name", "category", "website", "email", "phone", "address", "country", "state", "opt_out_url", "notes"]
    const missing = expected.filter((h) => !headers.includes(h))
    if (missing.length) {
      setCsvErrors([`Missing columns: ${missing.join(", ")}`])
      return
    }
    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const values = line.split(",").map((v) => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ""
      })
      rows.push(row)
    }
    setCsvErrors([])
    setCsvRows(rows)
  }

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    setCsvResults(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      parseCsv(text)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = async () => {
    if (!csvRows.length) return
    setCsvImporting(true)
    setError("")
    const brokersPayload = csvRows.map((row) => ({
      name: row.name,
      display_name: row.display_name,
      category: row.category || "other",
      website: row.website,
      email: row.email,
      phone: row.phone,
      address: row.address,
      country: row.country,
      state: row.state,
      opt_out_url: row.opt_out_url,
      notes: row.notes,
    }))
    const res = await apiRequest<{ imported: number; skipped: number; errors: { row: number; error: string }[] }>(
      "cityhall",
      "POST",
      "/admin/brokers/csv",
      { brokers: brokersPayload },
    )
    setCsvImporting(false)
    if (res.ok) {
      setCsvResults({
        imported: res.data.imported || 0,
        skipped: res.data.skipped || 0,
        errors: res.data.errors || [],
      })
      setMsg(`Import complete: ${res.data.imported || 0} imported, ${res.data.skipped || 0} skipped`)
      loadBrokers()
      loadCount()
    } else {
      setError("Failed to import CSV")
    }
  }

  const resetCsvDialog = () => {
    setCsvOpen(false)
    setCsvFile(null)
    setCsvRows([])
    setCsvErrors([])
    setCsvResults(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h4" sx={{ fontFamily: "monospace" }}>
            Broker Management
          </Typography>
          <Chip label={totalCount} size="small" color="primary" />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button startIcon={<DownloadIcon />} onClick={downloadTemplate}>
            Download Template
          </Button>
          <Button startIcon={<UploadIcon />} onClick={() => { resetCsvDialog(); setCsvOpen(true) }}>
            CSV Upload
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Add Broker
          </Button>
        </Box>
      </Box>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{ flexGrow: 1 }}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
              },
            }}
          />
          <Button variant="outlined" onClick={handleSearchSubmit}>
            Search
          </Button>
        </Box>

        {loading && <LinearProgress />}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Website</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {brokers.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {b.display_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {b.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={CATEGORY_MAP[b.category] || b.category} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {b.website ? (
                      <Typography
                        component="a"
                        href={b.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                      >
                        {b.website.replace(/^https?:\/\//, "").slice(0, 30)}
                      </Typography>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{b.country || "—"}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={b.is_active ? "active" : "inactive"}
                      color={b.is_active ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(b)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteBroker(b)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {brokers.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" color="text.secondary">
                    No brokers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: "monospace" }}>
          {editingBroker ? "Edit Broker" : "Add Broker"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Name"
                required
                value={form.name || ""}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Display Name"
                required
                value={form.display_name || ""}
                onChange={(e) => handleFormChange("display_name", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Category"
                value={form.category || "data_broker"}
                onChange={(e) => handleFormChange("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Website"
                value={form.website || ""}
                onChange={(e) => handleFormChange("website", e.target.value)}
                placeholder="https://example.com"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                value={form.email || ""}
                onChange={(e) => handleFormChange("email", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Phone"
                value={form.phone || ""}
                onChange={(e) => handleFormChange("phone", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Address"
                value={form.address || ""}
                onChange={(e) => handleFormChange("address", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Country"
                value={form.country || ""}
                onChange={(e) => handleFormChange("country", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="State"
                value={form.state || ""}
                onChange={(e) => handleFormChange("state", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Opt-out URL"
                value={form.opt_out_url || ""}
                onChange={(e) => handleFormChange("opt_out_url", e.target.value)}
                placeholder="https://example.com/opt-out"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Notes"
                multiline
                rows={2}
                value={form.notes || ""}
                onChange={(e) => handleFormChange("notes", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active ?? true}
                    onChange={(e) => handleFormChange("is_active", e.target.checked)}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveBroker} disabled={saving || !form.name?.trim() || !form.display_name?.trim()}>
            {editingBroker ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={csvOpen} onClose={resetCsvDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: "monospace" }}>CSV Upload</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a CSV file with columns: name, display_name, category, website, email, phone, address, country, state, opt_out_url, notes
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Button size="small" startIcon={<DownloadIcon />} onClick={downloadTemplate} sx={{ mb: 1 }}>
              Download CSV Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              style={{ display: "none" }}
              id="csv-file-input"
            />
            <Button variant="outlined" component="label" htmlFor="csv-file-input" startIcon={<UploadIcon />}>
              {csvFile ? csvFile.name : "Select CSV File"}
            </Button>
          </Box>

          {csvErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {csvErrors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </Alert>
          )}

          {csvRows.length > 0 && !csvResults && (
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle2">
                  Preview ({csvRows.length} rows)
                </Typography>
                <Button variant="contained" size="small" onClick={handleCsvImport} disabled={csvImporting}>
                  Import All
                </Button>
              </Box>
              {csvImporting && <LinearProgress />}
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Display Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Website</TableCell>
                      <TableCell>Email</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvRows.map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.display_name}</TableCell>
                        <TableCell><Chip size="small" label={row.category || "other"} variant="outlined" /></TableCell>
                        <TableCell>{row.website || "—"}</TableCell>
                        <TableCell>{row.email || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {csvResults && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Import Results</Typography>
              <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                <Chip label={`Imported: ${csvResults.imported}`} color="success" size="small" />
                <Chip label={`Skipped: ${csvResults.skipped}`} color="warning" size="small" />
              </Box>
              {csvResults.errors.length > 0 && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {csvResults.errors.map((e, i) => (
                    <div key={i}>Row {e.row}: {e.error}</div>
                  ))}
                </Alert>
              )}
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCsvDialog}>
            {csvResults ? "Close" : "Cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
