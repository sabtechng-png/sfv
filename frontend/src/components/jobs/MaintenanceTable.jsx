import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Typography, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, Tooltip, Pagination, Stack
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const PAGE_SIZE = 10;

function toCSV(rows) {
  if (!rows?.length) return "";
  const headers = [
    "date_time",
    "performed_by",
    "team_members",
    "description",
    "materials_used",
    "next_date",
    "remarks",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const line = [
      r.date_time || "",
      r.performed_by || "",
      Array.isArray(r.team_members)
        ? r.team_members.join("; ")
        : (r.team_members || ""),
      r.description || "",
      r.materials_used || "",
      r.next_date || "",
      r.remarks || "",
    ]
      .map(v => String(v).replace(/"/g, '""'))
      .map(v => /[",\n]/.test(v) ? `"${v}"` : v)
      .join(",");
    lines.push(line);
  }
  return lines.join("\n");
}

export default function MaintenanceTable({ jobId }) {
  const { user } = useAuth();
  const role = (user?.role || "engineer").toLowerCase();
  const isAdmin = role === "admin";

  // table state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // dialogs + form state
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null); // record or null
  const [openDelete, setOpenDelete] = useState(false);

  const [dateTime, setDateTime] = useState("");
  const [performedBy, setPerformedBy] = useState(user?.name || "");
  const [teamMembers, setTeamMembers] = useState(""); // comma-separated
  const [description, setDescription] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const pending = useRef(false);

  const resetForm = () => {
    setDateTime(dayjs().format("YYYY-MM-DD HH:mm"));
    setPerformedBy(user?.name || "");
    setTeamMembers("");
    setDescription("");
    setMaterialsUsed("");
    setNextDate("");
    setRemarks("");
  };

  const buildParams = (overrides = {}) => {
    const params = new URLSearchParams();
    params.set("page", overrides.page ?? page);
    params.set("limit", overrides.limit ?? PAGE_SIZE);
    return params.toString();
  };

  const fetchMaintenance = async (opts = {}) => {
    setLoading(true);
    try {
      const qs = buildParams(opts);
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/maintenance?${qs}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch maintenance");
      setRows(data.records || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    fetchMaintenance({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // --- CRUD handlers ---
  const openAdd = () => {
    setEditing(null);
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (rec) => {
    setEditing(rec);
    setDateTime(rec.date_time || "");
    setPerformedBy(rec.performed_by || "");
    setTeamMembers(
      Array.isArray(rec.team_members)
        ? rec.team_members.join(", ")
        : (rec.team_members || "")
    );
    setDescription(rec.description || "");
    setMaterialsUsed(rec.materials_used || "");
    setNextDate(rec.next_date || "");
    setRemarks(rec.remarks || "");
    setOpenForm(true);
  };

  const submitForm = async () => {
    if (pending.current) return;
    // Validate minimal fields
    if (!dateTime || !performedBy || !description) {
      alert("Please fill Date/Time, Performed By, and Description.");
      return;
    }
    pending.current = true;
    try {
      const body = {
        date_time: dateTime,
        performed_by: performedBy,
        team_members: teamMembers, // server will store as TEXT or JSON
        description,
        materials_used: materialsUsed,
        next_date: nextDate,
        remarks,
      };

      let res, data;
      if (editing) {
        res = await fetch(`${API_BASE}/api/jobs/${jobId}/maintenance/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API_BASE}/api/jobs/${jobId}/maintenance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");

      setOpenForm(false);
      await fetchMaintenance();
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to save record");
    } finally {
      pending.current = false;
    }
  };

  const confirmDelete = (rec) => {
    setEditing(rec);
    setOpenDelete(true);
  };

  const doDelete = async () => {
    if (!isAdmin) return; // safety
    if (pending.current) return;
    pending.current = true;
    try {
     const res = await fetch(`${API_BASE}/api/jobs/${jobId}/maintenance/${editing.id}`, {
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
    "x-role": user?.role || ""
  }
});

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Delete failed");
      setOpenDelete(false);
      // If last row on page removed, go back one page if possible
      if (rows.length - 1 <= 0 && page > 1) {
        setPage(page - 1);
        await fetchMaintenance({ page: page - 1 });
      } else {
        await fetchMaintenance();
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to delete record");
    } finally {
      pending.current = false;
    }
  };

  // --- Export handlers (ALL filtered, not just current page) ---
  const exportCSV = async () => {
    const qs = buildParams({ page: 1, limit: 10000 });
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/maintenance?${qs}`);
    const data = await res.json();
    if (!data.success) return;
    const csv = toCSV(data.records || []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url;
    a.download = `job_${jobId}_maintenance_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const qs = buildParams({ page: 1, limit: 10000 });
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/maintenance?${qs}`);
      const data = await res.json();
      if (!data.success) return;

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text(`Job ${jobId} — Maintenance (Filtered)`, 14, 14);
      const head = [[
        "Date/Time",
        "Performed By",
        "Team Members",
        "Description",
        "Materials Used",
        "Next Date",
        "Remarks",
      ]];
      const body = (data.records || []).map(r => [
        r.date_time || "",
        r.performed_by || "",
        Array.isArray(r.team_members) ? r.team_members.join("; ") : (r.team_members || ""),
        r.description || "",
        r.materials_used || "",
        r.next_date || "",
        r.remarks || "",
      ]);
      doc.autoTable({
        startY: 20,
        head,
        body,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [33, 33, 33] },
      });

      const d = new Date();
      doc.save(`job_${jobId}_maintenance_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}.pdf`);
    } catch (e) {
      alert("Click export above");
      console.error(e);
    }
  };

  const TeamChips = useMemo(() => ({ value }) => {
    const list = Array.isArray(value)
      ? value
      : (value ? String(value).split(",").map(s => s.trim()).filter(Boolean) : []);
    if (!list.length) return <Typography sx={{ opacity: 0.6 }}>—</Typography>;
    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {list.map((name, i) => (
          <Chip key={`${name}-${i}`} label={name} size="small" />
        ))}
      </Stack>
    );
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>Maintenance Records</Typography>
        <Box>
         
          
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={openAdd}
          >
            Add Maintenance
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Box component="table" sx={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={th}>Date / Time</th>
            <th style={th}>Performed By</th>
            <th style={th}>Team</th>
            <th style={th}>Description</th>
            <th style={th}>Materials Used</th>
            <th style={th}>Next Date</th>
            <th style={{ ...th, textAlign: "center", width: 120 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={td}>Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={7} style={td}>No maintenance records.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.date_time || "—"}</td>
                <td style={td}>{r.performed_by || "—"}</td>
                <td style={td}>
                  <TeamChips value={r.team_members} />
                </td>
                <td style={td}>{r.description || "—"}</td>
                <td style={td}>{r.materials_used || "—"}</td>
                <td style={td}>{r.next_date || "—"}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  {/* Admin + Engineer can edit */}
                  <IconButton size="small" onClick={() => openEdit(r)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {/* Admin only can delete */}
                  <IconButton
                    size="small"
                    onClick={() => confirmDelete(r)}
                    disabled={!isAdmin}
                    sx={{ color: isAdmin ? "error.main" : "action.disabled" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
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

      {/* Add/Edit Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit Maintenance" : "Add Maintenance"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Date / Time (YYYY-MM-DD HH:mm)"
                fullWidth
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                placeholder="2025-10-31 14:30"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Performed By"
                fullWidth
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder="Engr. Abdulrasheed Issa"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Team Members (comma-separated)"
                fullWidth
                value={teamMembers}
                onChange={(e) => setTeamMembers(e.target.value)}
                placeholder="Ridwan, Ibrahim, Maryam"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description / Work Done"
                fullWidth
                multiline
                minRows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Replaced blown capacitor & cleaned panel"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Materials Used"
                fullWidth
                multiline
                minRows={1}
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
                placeholder="2× 10µF cap, 1× relay"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Next Maintenance Date (YYYY-MM-DD)"
                fullWidth
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                placeholder="2025-11-30"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Remarks"
                fullWidth
                multiline
                minRows={1}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Client satisfied; follow-up in 30 days"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button onClick={submitForm} variant="contained">
            {editing ? "Save Changes" : "Add Maintenance"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>Delete Maintenance?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            This will permanently delete the selected maintenance record. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button onClick={doDelete} color="error" variant="contained" startIcon={<DeleteIcon />}>
            Delete
          </Button>
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
