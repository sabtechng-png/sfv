import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useParams, useNavigate } from "react-router-dom";
import JobLayoutContainer from "../../layouts/JobLayoutContainer";
import { useAuth } from "../../context/AuthContext";

import MaintenanceTable from "../../components/jobs/MaintenanceTable";
import IssueTable from "../../components/jobs/IssueTable";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || "engineer";
  const isAdmin = role === "admin";

  const [job, setJob] = useState(null);
  const [maintenance, setMaintenance] = useState([]);    // ✅ keep maintenance for PDF
  const [issues, setIssues] = useState([]);              // ✅ keep issues for PDF
  const [loading, setLoading] = useState(true);

  // dialogs
  const [openClose, setOpenClose] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch job");
      setJob(data.job || null);
      setMaintenance(Array.isArray(data.maintenance) ? data.maintenance : []);
      setIssues(Array.isArray(data.issues) ? data.issues : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (loading) {
    return <JobLayoutContainer title="Loading…" role={role} />;
  }
  if (!job) {
    return <JobLayoutContainer title="Job Not Found" role={role} />;
  }

  const isCompleted = (job.status || "").toLowerCase() === "completed";

  const StatusChip = ({ value }) => {
    const v = (value || "").toLowerCase();
    const bg = v === "completed" ? "#2e7d32" : "#1e88e5";
    return (
      <Chip
        label={(v || "—").toUpperCase()}
        size="small"
        sx={{ bgcolor: bg, color: "#fff", fontWeight: 700 }}
      />
    );
  };

  // ----- Actions -----
  const handleCloseJob = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to close job");
      setOpenClose(false);
      fetchJob();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJob = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete job");
      setOpenDelete(false);
      navigate("/jobs/manage");
    } catch (e) {
      console.error(e);
    }
  };

 // ===== PDF EXPORT (Overview → Issues → Maintenance) =====
const exportFullReport = async () => {
  try {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const marginX = 40;
    let cursorY = 50;

    // ----- Placeholder Header -----
    doc.setFontSize(18);
    doc.text("SFV TECH", marginX, cursorY);
    cursorY += 20;
    doc.setFontSize(14);
    doc.text("Job Report", marginX, cursorY);
    cursorY += 10;
    doc.setDrawColor(0);
    doc.line(marginX, cursorY, 555, cursorY);
    cursorY += 25;

    // ----- Overview Block -----
    const overview = [
      ["Job Reference", job.job_ref || "—"],
      ["Title", job.title || "—"],
      ["Client", job.client_name || "—"],
      ["Type", job.type || job.job_type || "—"],
      ["Status", (job.status || "—").toUpperCase()],
      ["Registered By", job.created_by_name || "—"],
      ["Start Date (UTC)", job.start_date_utc || "—"],
      ["Last Update (UTC)", job.updated_at_utc || job.updated_at || "—"],
    ];

    doc.setFontSize(12);
    overview.forEach(([k, v]) => {
      doc.setFont(undefined, "bold");
      doc.text(`${k}:`, marginX, cursorY);
      doc.setFont(undefined, "normal");
      doc.text(String(v), marginX + 160, cursorY);
      cursorY += 18;
    });

    cursorY += 15;
    const newPageIfNeeded = () => {
      if (cursorY > 750) {
        doc.addPage();
        cursorY = 40;
      }
    };

    // ===== ISSUES SECTION =====
    newPageIfNeeded();
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text("Issues", marginX, cursorY);
    cursorY += 12;
    doc.setFont(undefined, "normal");

    if (!issues?.length) {
      cursorY += 16;
      doc.text("No issues recorded.", marginX, cursorY);
      cursorY += 20;
    } else {
      autoTable(doc, {
        startY: cursorY + 4,
        head: [["Opened At (UTC)", "Title", "Description", "Status", "Resolution Note"]],
        body: issues.map((r) => [
          r.opened_at_utc || "—",
          r.title || "—",
          r.description || "—",
          (r.status || "—").toUpperCase(),
          r.resolution_note || "—",
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [33, 150, 243] }, // blue
        margin: { left: marginX, right: marginX },
      });
      cursorY = doc.lastAutoTable.finalY + 25;
    }

    // ===== MAINTENANCE SECTION =====
    newPageIfNeeded();
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text("Maintenance", marginX, cursorY);
    cursorY += 12;
    doc.setFont(undefined, "normal");

    if (!maintenance?.length) {
      cursorY += 16;
      doc.text("No maintenance records.", marginX, cursorY);
    } else {
      autoTable(doc, {
        startY: cursorY + 4,
        head: [["Date / Time (UTC)", "Performed By", "Team", "Description", "Materials Used", "Next Date (UTC)"]],
        body: maintenance.map((m) => [
          m.date_time || m.date_time_utc || "—",
          m.performed_by || "—",
          m.team || m.team_name || "—",
          m.description || "—",
          m.materials_used || m.materials || "—",
          m.next_date || m.next_date_utc || "—",
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [76, 175, 80] }, // green
        margin: { left: marginX, right: marginX },
      });
    }

    // ===== FILE NAME FORMAT =====
    const fileName = `job_REPORT_${(job.job_ref || "JOB").replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
  } catch (err) {
    alert("click EXPORT FULL REPORT");
    console.error(err);
  }
};


  return (
    <JobLayoutContainer title={`${job.job_ref} — Details`} role={role}>
      {/* ===== Overview Card ===== */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Overview
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} md={6}>
            <DetailItem label="Job Reference" value={job.job_ref} />
            <DetailItem label="Title" value={job.title} />
            <DetailItem label="Client" value={job.client_name || "—"} />
            <DetailItem label="Type" value={job.type || "—"} />
          </Grid>
          <Grid item xs={12} md={6}>
            <DetailItem label="Status" value={<StatusChip value={job.status} />} />
            <DetailItem label="Registered By" value={job.created_by_name || "—"} />
            <DetailItem label="Start Date" value={job.start_date_utc || "—"} />
            <DetailItem label="Last Update" value={job.updated_at_utc || "—"} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* ===== Action Buttons (ALWAYS enabled) ===== */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => navigate(`/jobs/${jobId}/add-maintenance`)}
          >
            Add Maintenance
          </Button>

          <Button
            variant="outlined"
            startIcon={<AddCircleIcon />}
            onClick={() => navigate(`/jobs/${jobId}/add-issue`)}
          >
            Add Issue
          </Button>

          {/* Close Job is visible ONLY when status is NOT completed */}
          {!isCompleted && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => setOpenClose(true)}
            >
              Close Job
            </Button>
          )}

          {/* Delete is visible for Admin ALWAYS (even if completed) */}
          {isAdmin && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setOpenDelete(true)}
            >
              Delete Job
            </Button>
          )}

          {/* ===== NEW: Export Full Report ===== */}
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={exportFullReport}
            sx={{ ml: "auto" }}
          >
            Export Full Report
          </Button>
        </Box>
      </Paper>

      {/* ===== Maintenance Section ===== */}
      <Paper sx={{ p: 0, mb: 2, bgcolor: "transparent", boxShadow: "none" }}>
        <MaintenanceTable jobId={jobId} />
      </Paper>

      {/* ===== Issues Section ===== */}
      <Paper sx={{ p: 0, bgcolor: "transparent", boxShadow: "none" }}>
        <IssueTable jobId={jobId} />
      </Paper>

      {/* ===== CLOSE JOB DIALOG ===== */}
      <Dialog open={openClose} onClose={() => setOpenClose(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark as Completed?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            You are about to close <b>{job.job_ref}</b>. This will mark the job as
            <b> completed</b>. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClose(false)}>Cancel</Button>
          <Button onClick={handleCloseJob} variant="contained" startIcon={<CheckCircleIcon />}>
            Close Job
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== DELETE JOB DIALOG ===== */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>Delete Job?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            This will permanently delete <b>{job.job_ref}</b> and all associated records
            (maintenance, issues, etc). This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button onClick={handleDeleteJob} color="error" variant="contained" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </JobLayoutContainer>
  );
}

function DetailItem({ label, value }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        {label}
      </Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
}
