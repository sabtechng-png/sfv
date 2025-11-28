import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Typography, Button, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid, Pagination, Chip
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useAuth } from "../../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const PAGE_SIZE = 10;

function toCSV(rows) {
  if (!rows?.length) return "";
  const headers = ["opened_at_utc", "title", "description", "status", "resolution_note", "resolved_at_utc"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const line = [
      r.opened_at_utc || "",
      r.title || "",
      r.description || "",
      r.status || "",
      r.resolution_note || "",
      r.resolved_at_utc || "",
    ]
      .map(v => String(v).replace(/"/g, '""'))
      .map(v => /[",\n]/.test(v) ? `"${v}"` : v)
      .join(",");
    lines.push(line);
  }
  return lines.join("\n");
}

export default function IssueTable({ jobId }) {
  const { user } = useAuth();
  const role = (user?.role || "engineer").toLowerCase();
  const isAdmin = role === "admin";
  const canResolve = role === "admin" || role === "engineer";

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Add dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Resolve dialog
  const [openResolve, setOpenResolve] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");

  // Delete dialog
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const pending = useRef(false);

  const fetchIssues = async (opts = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", opts.page ?? page);
      qs.set("limit", PAGE_SIZE);
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/issues?${qs.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch issues");
      setRows(data.records || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIssues({ page: 1 }); /* eslint-disable-next-line */ }, [jobId]);
  useEffect(() => { fetchIssues({ page }); /* eslint-disable-next-line */ }, [page]);

  const openAddDialog = () => { setOpenAdd(true); setTitle(""); setDescription(""); };
  const submitAdd = async () => {
    if (pending.current) return;
    if (!title || !description) return alert("Title and Description are required.");
    pending.current = true;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Create failed");
      setOpenAdd(false);
      await fetchIssues();
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      pending.current = false;
    }
  };

  const openResolveDialog = (rec) => {
    setResolving(rec);
    setResolutionNote(rec.resolution_note || "");
    setOpenResolve(true);
  };
  const submitResolve = async () => {
    if (pending.current) return;
    if (!canResolve) return;
    pending.current = true;
    try {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/issues/${resolving.issue_id}`, {
  method: "PATCH",
  headers: { 
    "Content-Type": "application/json",
    "x-role": role   // ✅ send role to backend
  },
  body: JSON.stringify({ status: "resolved", resolution_note: resolutionNote }),
});

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Resolve failed");
      setOpenResolve(false);
      await fetchIssues();
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      pending.current = false;
    }
  };

  const confirmDelete = (rec) => { setDeleting(rec); setOpenDelete(true); };
  const doDelete = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/issues/${deleting.issue_id}`, {
        method: "DELETE",
        headers: { "x-role": isAdmin ? "admin" : "engineer" },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Delete failed");
      setOpenDelete(false);
      if (rows.length - 1 <= 0 && page > 1) {
        setPage(page - 1);
        await fetchIssues({ page: page - 1 });
      } else {
        await fetchIssues();
      }
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      pending.current = false;
    }
  };

  const exportCSV = async () => {
    const qs = new URLSearchParams({ page: 1, limit: 10000 });
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/issues?${qs.toString()}`);
    const data = await res.json();
    if (!data.success) return;
    const csv = toCSV(data.records || []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job_${jobId}_issues.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const qs = new URLSearchParams({ page: 1, limit: 10000 });
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/issues?${qs.toString()}`);
      const data = await res.json();
      if (!data.success) return;

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text(`Job ${jobId} — Issues (Filtered)`, 14, 14);

      const head = [["Opened At (UTC)", "Title", "Description", "Status", "Resolution Note", "Resolved At (UTC)"]];
      const body = (data.records || []).map(r => [
        r.opened_at_utc || "",
        r.title || "",
        r.description || "",
        r.status || "",
        r.resolution_note || "",
        r.resolved_at_utc || "",
      ]);

      doc.autoTable({ startY: 20, head, body, styles: { fontSize: 9 }, headStyles: { fillColor: [33,33,33] } });
      doc.save(`job_${jobId}_issues.pdf`);
    } catch (e) {
      alert("To export PDF, install: npm i jspdf jspdf-autotable");
      console.error(e);
    }
  };

  const StatusChip = useMemo(() => ({ value }) => {
    const v = (value || "").toLowerCase();
    const color = v === "resolved" ? "#2e7d32" : "#1e88e5";
    return <Chip label={(v || "open").toUpperCase()} size="small" sx={{ bgcolor: color, color: "#fff", fontWeight: 700 }} />;
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>Issue Records</Typography>
        <Box>
         
          <Button variant="contained" startIcon={<AddCircleIcon />} onClick={openAddDialog}>Add Issue</Button>
        </Box>
      </Box>

      {/* Table */}
      <Box component="table" sx={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={th}>Opened At (UTC)</th>
            <th style={th}>Title</th>
            <th style={th}>Description</th>
            <th style={th}>Status</th>
            <th style={th}>Resolution Note</th>
            <th style={{ ...th, textAlign: "center", width: 150 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={td}>Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={6} style={td}>No issues.</td></tr>
          ) : (
            rows.map(r => (
              <tr key={r.issue_id}>
                <td style={td}>{r.opened_at_utc || "—"}</td>
                <td style={td}>{r.title || "—"}</td>
                <td style={td}>{r.description || "—"}</td>
                <td style={td}><StatusChip value={r.status} /></td>
                <td style={td}>{r.resolution_note || "—"}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  {/* Resolve (admin + engineer) */}
                  <Tooltip title="Resolve">
                    <span>
                      <IconButton size="small" onClick={() => openResolveDialog(r)} disabled={!canResolve}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {/* Delete (admin only) */}
                  <Tooltip title={isAdmin ? "Delete" : "Admin only"}>
                    <span>
                      <IconButton size="small" onClick={() => { setDeleting(r); setOpenDelete(true); }} disabled={!isAdmin} sx={{ color: isAdmin ? "error.main" : "action.disabled" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Box>

      {/* Pagination */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
        <Pagination
          count={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          page={page}
          onChange={(_, v) => setPage(v)}
          color="primary"
          variant="outlined"
          shape="rounded"
        />
      </Box>

      {/* Add Issue */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Issue</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button onClick={submitAdd} variant="contained">Add Issue</Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Issue */}
      <Dialog open={openResolve} onClose={() => setOpenResolve(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Issue</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 1, fontWeight: 600 }}>{resolving?.title}</Typography>
          <TextField
            label="Resolution Note"
            fullWidth
            multiline
            minRows={2}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Explain how you resolved this issue"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResolve(false)}>Cancel</Button>
          <Button onClick={submitResolve} variant="contained" startIcon={<CheckCircleIcon />}>Mark Resolved</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Issue */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>Delete Issue?</DialogTitle>
        <DialogContent dividers>
          This will permanently remove the issue. Admin only.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button onClick={doDelete} color="error" variant="contained" startIcon={<DeleteIcon />}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

const th = {
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 700,
  borderBottom: "1px solid #eee",
  textAlign: "left",
  color: "#333",
};
const td = {
  padding: "10px 12px",
  fontSize: 14,
  borderBottom: "1px solid #f1f1f1",
};
