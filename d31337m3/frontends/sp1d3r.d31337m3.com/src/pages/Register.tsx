import { useState } from "react"
import { useNavigate, Link as RouterLink } from "react-router-dom"
import {
  Box,
  Button,
  Container,
  Alert,
  TextField,
  Typography,
  Link,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material"
import { useAuth } from "../context/AuthContext"

const steps = ["Account", "Profile", "Enrollment"]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    dob: "",
    bio: "",
    volunteer_node_op: false,
    volunteer_tech_support: false,
    volunteer_chat_support: false,
    has_high_speed_connection: false,
    always_on_available: false,
    founder_subscript: false,
    referral_code: "",
  })

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const canNext = () => {
    if (active === 0) return form.username && form.email && form.password && form.password === form.confirm_password
    if (active === 1) return form.first_name && form.last_name
    return true
  }

  const handleSubmit = async () => {
    setError("")
    setLoading(true)
    const ok = await register(form)
    setLoading(false)
    if (ok) navigate("/dashboard")
    else setError("Registration failed. Username or email may already be taken.")
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 4 }} variant="outlined">
        <Typography variant="h4" gutterBottom sx={{ fontFamily: "monospace", textAlign: "center" }}>
          Register
        </Typography>
        <Stepper activeStep={active} sx={{ mb: 3 }}>
          {steps.map((s) => (
            <Step key={s}><StepLabel>{s}</StepLabel></Step>
          ))}
        </Stepper>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {active === 0 && (
          <Box>
            <TextField fullWidth label="Username" value={form.username} onChange={(e) => update("username", e.target.value)} margin="normal" required />
            <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} margin="normal" required />
            <TextField fullWidth label="Password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} margin="normal" required />
            <TextField fullWidth label="Confirm Password" type="password" value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} margin="normal" required />
            {form.password && form.confirm_password && form.password !== form.confirm_password && (
              <Alert severity="warning" sx={{ mt: 1 }}>Passwords do not match</Alert>
            )}
          </Box>
        )}

        {active === 1 && (
          <Box>
            <TextField fullWidth label="First Name" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} margin="normal" required />
            <TextField fullWidth label="Last Name" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} margin="normal" required />
            <TextField fullWidth label="Date of Birth" type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} margin="normal" slotProps={{ inputLabel: { shrink: true } }} />
            <TextField fullWidth label="Bio" multiline rows={3} value={form.bio} onChange={(e) => update("bio", e.target.value)} margin="normal" />
          </Box>
        )}

        {active === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select your volunteer roles and network capabilities.
            </Typography>
            <FormGroup>
              <FormControlLabel control={<Checkbox checked={form.volunteer_node_op} onChange={(e) => update("volunteer_node_op", e.target.checked)} />} label="Volunteer Node Operator" />
              <FormControlLabel control={<Checkbox checked={form.volunteer_tech_support} onChange={(e) => update("volunteer_tech_support", e.target.checked)} />} label="Volunteer Tech Support" />
              <FormControlLabel control={<Checkbox checked={form.volunteer_chat_support} onChange={(e) => update("volunteer_chat_support", e.target.checked)} />} label="Volunteer Chat Support" />
              <FormControlLabel control={<Checkbox checked={form.has_high_speed_connection} onChange={(e) => update("has_high_speed_connection", e.target.checked)} />} label="High-Speed Connection" />
              <FormControlLabel control={<Checkbox checked={form.always_on_available} onChange={(e) => update("always_on_available", e.target.checked)} />} label="Always-On Available" />
              <FormControlLabel control={<Checkbox checked={form.founder_subscript} onChange={(e) => update("founder_subscript", e.target.checked)} />} label="Founder Subscription" />
            </FormGroup>
            <TextField fullWidth label="Referral Code" value={form.referral_code} onChange={(e) => update("referral_code", e.target.value)} margin="normal" />
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          <Button disabled={active === 0} onClick={() => setActive((a) => a - 1)}>
            Back
          </Button>
          {active < steps.length - 1 ? (
            <Button variant="contained" disabled={!canNext()} onClick={() => setActive((a) => a + 1)}>
              Next
            </Button>
          ) : (
            <Button variant="contained" disabled={loading} onClick={handleSubmit}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          )}
        </Box>
      </Paper>
      <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
        Already have an account?{" "}
        <Link component={RouterLink} to="/login">Sign in</Link>
      </Typography>
    </Container>
  )
}
