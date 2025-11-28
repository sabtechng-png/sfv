// src/pages/jobs/RegisterWorkPage.jsx
import React, { useState } from "react";
import {
  AppBar, Toolbar, Typography, IconButton, TextField, MenuItem,
  Box, Button, Grid, Snackbar, Alert, Chip, Tooltip, CircularProgress
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // ✅ same as ExpensesPage
import JobLayoutContainer from "../../components/JobLayoutContainer";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

const PALETTES = {
  admin: { primary: "#263238", secondary: "#26A69A", bg: "#F4F6F8" },
  engineer: { primary: "#003366", secondary: "#FFD700", bg: "#F5F7FA" },
};
const usePalette = (role) =>
  String(role || "").toLowerCase() === "admin" ? PALETTES.admin : PALETTES.engineer;

export default function RegisterWorkPage({ role: roleProp }) {
  const navigate = useNavigate();
  const { user } = useAuth(); // ✅ get logged user
  const role = roleProp || user?.role || "Engineer";
  const palette = usePalette(role);

  const [form, setForm] = useState({
    title: "",
    job_type: "Installation",
    location: "",
    client_name: "",
    job_condition: "",
    materials_text: "",
    team_text: "",
    start_date_utc: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        created_by: user?.user_id || null,
        created_by_name: user?.name || user?.displayName || "System User",
        created_by_email: user?.email || "unknown@sfvtech.com",
        created_by_role: user?.role || "Engineer",
        start_date_utc: form.start_date_utc || new Date().toISOString(),
      };

      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (data.success) {
        setSnack({ open: true, message: "✅ Job registered successfully!", severity: "success" });
        setForm({
          title: "",
          job_type: "Installation",
          location: "",
          client_name: "",
          job_condition: "",
          materials_text: "",
          team_text: "",
          start_date_utc: new Date().toISOString().slice(0, 16),
        });
      } else {
        throw new Error(data.error || "Registration failed");
      }
    } catch (err) {
      console.error("❌ Job registration error:", err);
      setSnack({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <JobLayoutContainer palette={palette}>
      <AppBar position="sticky" sx={{ bgcolor: palette.primary }}>
        <Toolbar>
          <Tooltip title="Back to Dashboard">
            <IconButton edge="start" color="inherit" onClick={() => navigate("/jobs")}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Register New Work
          </Typography>
          <Chip
            icon={<PersonIcon />}
            label={String(role).toUpperCase()}
            size="small"
            sx={{ bgcolor: palette.secondary, color: "#000", fontWeight: 700 }}
          />
        </Toolbar>
      </AppBar>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 3,
          mt: 3,
          mx: "auto",
          maxWidth: 800,
          bgcolor: "#fff",
          borderRadius: 3,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="Job Title" name="title" required fullWidth value={form.title} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Job Type" name="job_type" fullWidth value={form.job_type} onChange={handleChange}>
              {["Installation", "Repair", "Maintenance", "Inspection", "Others"].map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Location" name="location" fullWidth value={form.location} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Client Name" name="client_name" required fullWidth value={form.client_name} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Start Date (UTC)" type="datetime-local" name="start_date_utc" fullWidth value={form.start_date_utc} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Job Condition / Notes" name="job_condition" fullWidth multiline minRows={2} value={form.job_condition} onChange={handleChange} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Materials Used" name="materials_text" fullWidth multiline minRows={2} value={form.materials_text} onChange={handleChange} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Team Members" name="team_text" placeholder="e.g., Engr. Musa, Engr. Tola" fullWidth multiline minRows={2} value={form.team_text} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sx={{ textAlign: "center", mt: 2 }}>
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{
                bgcolor: palette.secondary,
                color: "#000",
                fontWeight: 700,
                px: 5,
                "&:hover": { opacity: 0.9 },
              }}
            >
              {loading ? <CircularProgress size={22} /> : "Register Work"}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </JobLayoutContainer>
  );
}
