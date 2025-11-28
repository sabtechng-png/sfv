import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  InputAdornment,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  TablePagination,
  Stack,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { Search, PictureAsPdf, CheckCircle, Delete, Refresh } from "@mui/icons-material";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --------------------------------------------------------------
// SFV Tech | Work Management Page (Engineer/Admin)
// Blue–Gold theme aligned with EngineerDashboard
// --------------------------------------------------------------

const statusOptions = ["Active", "Completed", "Under Maintenance"];

function generateJobRef(prefix = "SFV") {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${y}${m}${d}${hh}${mm}${ss}-${rand}`;
}

export default function WorkManagementPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = (user?.role || "engineer").toLowerCase();
  const isAdmin = role === "admin";

  const [form, setForm] = useState({
    job_ref: generateJobRef(),
    customer_name: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    team_csv: "",
    materials_text: "",
    status: "Active",
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sorted = rows.slice().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (!needle) return sorted;
    return sorted.filter((r) =>
      [r.job_ref, r.customer_name, r.description, r.team_csv, r.status]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [rows, q]);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const handleChange = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/work");
      setRows(res.data || []);
    } catch (err) {
      enqueueSnackbar("Failed to load jobs", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const timer = setInterval(fetchJobs, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleCreate = async () => {
    if (!form.customer_name || !form.description) {
      enqueueSnackbar("Customer name and description required", { variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, created_by: user?.email };
      const res = await api.post("/api/work", payload);
      enqueueSnackbar("Job created successfully", { variant: "success" });
      setForm({
        job_ref: generateJobRef(),
        customer_name: "",
        description: "",
        date: new Date().toISOString().slice(0, 10),
        team_csv: "",
        materials_text: "",
        status: "Active",
      });
      setRows((prev) => [res.data, ...prev]);
    } catch (err) {
      enqueueSnackbar("Failed to create job", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (job) => {
    try {
      const res = await api.patch(`/api/work/${job.id}/verify`, { verified: !job.verified });
      enqueueSnackbar(res.data.verified ? "Job verified" : "Verification removed", { variant: "success" });
      setRows((prev) => prev.map((r) => (r.id === job.id ? { ...r, verified: res.data.verified } : r)));
    } catch {
      enqueueSnackbar("Failed to update verification", { variant: "error" });
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete job ${job.job_ref}?`)) return;
    try {
      await api.delete(`/api/work/${job.id}`);
      enqueueSnackbar("Job deleted", { variant: "success" });
      setRows((prev) => prev.filter((r) => r.id !== job.id));
    } catch {
      enqueueSnackbar("Failed to delete job", { variant: "error" });
    }
  };

  const goMaintenance = (job) => navigate(`/work/${encodeURIComponent(job.job_ref)}`);

  const pdfForJob = (job) => {
    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    doc.setFontSize(16);
    doc.text("SFV Tech — Job Summary", 40, 40);
    doc.setFontSize(11);

    const lines = [
      `Job Ref: ${job.job_ref}`,
      `Customer: ${job.customer_name}`,
      `Date: ${job.date}`,
      `Status: ${job.status}${job.verified ? " (Verified)" : ""}`,
      `Created By: ${job.created_by || "—"}`,
    ];
    lines.forEach((t, i) => doc.text(t, 40, 70 + i * 16));

    autoTable(doc, {
      startY: 170,
      head: [["Description"]],
      body: [[job.description || "—"]],
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [245, 196, 0], textColor: 11 },
    });

    const materials = job.materials_text?.trim() || "No materials recorded.";
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["Materials"]],
      body: [[materials]],
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [245, 196, 0], textColor: 11 },
    });

    const team = job.team_csv?.trim() || "—";
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["Team"]],
      body: [[team]],
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [245, 196, 0], textColor: 11 },
    });

    doc.setFontSize(9);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(`Generated on ${new Date().toLocaleString()}`, 40, pageH - 30);
    doc.save(`${job.job_ref}.pdf`);
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#001f3f", color: "#fff", p: 3 }}>
      <Grid container spacing={3}>
        {/* LEFT FORM */}
        <Grid item xs={12} md={5}>
          <Card sx={{ background: "linear-gradient(135deg, #0b1a33, #014f86)", borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" color="#f5c400" fontWeight={800}>Register New Job</Typography>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => setForm({ ...form, job_ref: generateJobRef() })} sx={{ color: "#f5c400" }}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Grid container spacing={2} mt={1}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Job Ref" value={form.job_ref} fullWidth size="small" InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField type="date" label="Date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Customer Name" value={form.customer_name} onChange={(e) => handleChange("customer_name", e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Job Description" value={form.description} onChange={(e) => handleChange("description", e.target.value)} fullWidth size="small" multiline minRows={3} placeholder="e.g. Installation of 10HP Pump..." />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Team (comma-separated)" value={form.team_csv} onChange={(e) => handleChange("team_csv", e.target.value)} fullWidth size="small" placeholder="yinka@sfv.com, ade@sfv.com" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Materials (simple list)" value={form.materials_text} onChange={(e) => handleChange("materials_text", e.target.value)} fullWidth size="small" multiline minRows={3} placeholder="One item per line..." />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select label="Status" value={form.status} onChange={(e) => handleChange("status", e.target.value)} fullWidth size="small">
                    {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Created By" value={user?.email || ""} fullWidth size="small" InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="contained" onClick={handleCreate} disabled={submitting} sx={{ bgcolor: "#f5c400", color: "#0b1a33", fontWeight: 800 }}>
                      {submitting ? "Saving…" : "Save & Generate Ref"}
                    </Button>
                    <Button variant="outlined" onClick={() => setForm({ ...form, job_ref: generateJobRef() })} sx={{ borderColor: "#f5c400", color: "#f5c400", fontWeight: 700 }}>
                      Clear
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT TABLE */}
        <Grid item xs={12} md={7}>
          <Card sx={{ background: "#0b1a33", borderRadius: 3 }}>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems="center" justifyContent="space-between">
                <Typography variant="h6" color="#f5c400" fontWeight={800}>Jobs</Typography>
                <TextField
                  placeholder="Search jobs, customers, team, status…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  size="small"
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
                  sx={{ maxWidth: 360, background: "#01264e", borderRadius: 1 }}
                />
              </Stack>

              <Divider sx={{ my: 2, borderColor: "#014f86" }} />

              {loading ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <CircularProgress color="warning" />
                </Box>
              ) : (
                <>
                  <TableContainer component={Paper} sx={{ background: "#01264e" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {["Job Ref", "Customer", "Date", "Status", "Verified", "Actions"].map((h) => (
                            <TableCell key={h} sx={{ color: "#f5c400", fontWeight: 800 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paged.map((r) => (
                          <TableRow key={r.id || r.job_ref} hover>
                            <TableCell sx={{ color: "#fff" }}>
                              <Chip label={r.job_ref} size="small" sx={{ bgcolor: "#013a63", color: "#f5c400" }} />
                            </TableCell>
                            <TableCell sx={{ color: "#fff" }}>{r.customer_name}</TableCell>
                            <TableCell sx={{ color: "#fff" }}>{r.date}</TableCell>
                            <TableCell sx={{ color: "#fff" }}>
                              <Chip label={r.status} size="small" sx={{ bgcolor: r.status === "Completed" ? "#1b5e20" : r.status === "Under Maintenance" ? "#6a1b9a" : "#01579b", color: "#fff" }} />
                            </TableCell>
                            <TableCell sx={{ color: "#fff" }}>
                              {r.verified ? <Chip color="success" label="Yes" size="small" /> : <Chip color="warning" label="No" size="small" />}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Maintenance">
                                <Button size="small" variant="contained" onClick={() => goMaintenance(r)} sx={{ mr: 1, bgcolor: "#f5c400", color: "#0b1a33", fontWeight: 800 }}>
                                  Maintenance
                                </Button>
                              </Tooltip>
                              <Tooltip title="PDF">
                                <IconButton onClick={() => pdfForJob(r)} sx={{ color: "#f5c400" }}>
                                  <PictureAsPdf />
                                </IconButton>
                              </Tooltip>
                              {isAdmin && (
                                <>
                                  <Tooltip title={r.verified ? "Unverify" : "Verify"}>
                                    <IconButton onClick={() => handleVerify(r)} sx={{ color: "#66bb6a" }}>
                                      <CheckCircle />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton onClick={() => handleDelete(r)} sx={{ color: "#ef5350" }}>
                                      <Delete />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {paged.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ textAlign: "center", color: "#fff", py: 4 }}>
                              No jobs found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={filtered.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[5, 10, 25]}
                    sx={{ color: "#fff" }}
                  />
                </>
              )}
            </CardContent>
          </Card>
          <Box textAlign="center" mt={2}>
            <Typography variant="caption" color="#f5c400">
              Blue–Gold theme • Shared by Engineer & Admin (Admin-only: verify & delete)
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
