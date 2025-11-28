import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Box, Paper, Grid, TextField, InputAdornment, Button, IconButton,
  Chip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Pagination, Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import BugReportIcon from "@mui/icons-material/BugReport";
import { useNavigate } from "react-router-dom";
import JobLayoutContainer from "../../layouts/JobLayoutContainer";
import { useAuth } from "../../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const PAGE_SIZE = 10;

// CSV helper
function toCSV(rows) {
  if (!rows?.length) return "";
  const headers = ["job_ref", "title", "client_name", "status", "open_issues", "created_by_name", "start_date_utc"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const row = [
      r.job_ref,
      r.title,
      r.client_name ?? "",
      r.status ?? "",
      r.open_issues ?? 0,
      r.created_by_name ?? "",
      r.start_date_utc ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
    lines.push(row);
  }
  return lines.join("\n");
}

export default function ManageWorkPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || "engineer";
  const isAdmin = role === "admin";

  // state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [client, setClient] = useState("");

  // action menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // dialogs
  const [openClose, setOpenClose] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const pending = useRef(false);

  const buildParams = (overrides = {}) => {
    const params = new URLSearchParams();
    params.set("page", overrides.page ?? page);
    params.set("limit", overrides.limit ?? PAGE_SIZE);
    if ((overrides.q ?? q).trim()) params.set("q", (overrides.q ?? q).trim());
    if (overrides.status ?? status) params.set("status", overrides.status ?? status);
    if (overrides.type ?? type) params.set("type", overrides.type ?? type);
    if (overrides.client ?? client) params.set("client", overrides.client ?? client);
    return params.toString();
  };

  const fetchJobs = async (opts = {}) => {
    setLoading(true);
    try {
      const qs = buildParams(opts);
      const res = await fetch(`${API_BASE}/api/jobs?${qs}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch jobs");
      setRows(data.jobs || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs({ page: 1 });
  }, []);

  useEffect(() => {
    fetchJobs({ page });
  }, [page]);

  const handleApply = () => {
    setPage(1);
    fetchJobs({ page: 1 });
  };

  const handleReset = () => {
    setQ("");
    setStatus("");
    setType("");
    setClient("");
    setPage(1);
    fetchJobs({ q: "", status: "", type: "", client: "", page: 1 });
  };

  const openMenu = (e, row) => {
    setSelectedRow(row);
    setMenuAnchor(e.currentTarget);
  };
  const closeMenu = () => setMenuAnchor(null);

  const handleView = () => {
    closeMenu();
    navigate(`/jobs/${selectedRow.job_id}`);
  };

  const handleCloseJobConfirm = () => {
    closeMenu();
    setOpenClose(true);
  };

  const handleDeleteJobConfirm = () => {
    closeMenu();
    setOpenDelete(true);
  };

  const doCloseJob = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${selectedRow.job_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to close job");
      setOpenClose(false);
      fetchJobs();
    } catch (e) {
      console.error(e);
    } finally {
      pending.current = false;
    }
  };

  const doDeleteJob = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${selectedRow.job_id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete job");
      setOpenDelete(false);
      if (rows.length - 1 <= 0 && page > 1) {
        setPage(page - 1);
        fetchJobs({ page: page - 1 });
      } else {
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      pending.current = false;
    }
  };

  const handleExportCSV = async () => {
    const qs = buildParams({ page: 1, limit: 10000 });
    const res = await fetch(`${API_BASE}/api/jobs?${qs}`);
    const data = await res.json();
    if (!data.success) return;
    const csv = toCSV(data.jobs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const d = new Date();
    a.download = `jobs_export_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const StatusChip = useMemo(
    () => ({ value }) => {
      const v = (value || "").toLowerCase();
      const bg = v === "completed" ? "#2e7d32" : "#1e88e5";
      return <Chip label={v.toUpperCase()} size="small" sx={{ bgcolor: bg, color: "#fff", fontWeight: 700 }} />;
    },
    []
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <JobLayoutContainer
      title={`Manage Work (${total})`}
      role={role}
      showExports
      onExportCSV={handleExportCSV}
     
    >
      {/* FILTERS */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
          </Grid>
          <Grid item xs={6} md={1.5}>
            <Button fullWidth variant="contained" onClick={handleApply}>
              APPLY
            </Button>
          </Grid>
          <Grid item xs={6} md={1.5}>
            <Button fullWidth variant="outlined" onClick={handleReset}>
              RESET
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* TABLE */}
      <Paper sx={{ p: 1 }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={th}>Job Ref</th>
              <th style={th}>Title</th>
              <th style={th}>Client</th>
              <th style={th}>Status</th>
              <th style={th}>Issues</th>
              <th style={th}>Registered By</th>
              <th style={th}>Start Date</th>
              <th style={{ ...th, textAlign: "center", width: 70 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={td}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={td}>No jobs found.</td></tr>
            ) : (
              rows.map((r) => {
                return (
                  <tr key={r.job_id} style={{ cursor: "pointer" }}>
                    <td style={td}>{r.job_ref}</td>
                    <td style={td}>{r.title}</td>
                    <td style={td}>{r.client_name ?? "—"}</td>
                    <td style={td}><StatusChip value={r.status} /></td>

                    {/* ✅ NEW ISSUE BADGE */}
                    <td style={td}>
                      <Tooltip title={`${r.open_issues || 0} open issue(s)`}>
                        <Chip
                          icon={<BugReportIcon sx={{ color: "white !important" }} />}
                          label={r.open_issues || 0}
                          size="small"
                          sx={{
                            bgcolor: r.open_issues > 0 ? "#d32f2f" : "#616161",
                            color: "white",
                            fontWeight: 700,
                          }}
                          onClick={() => navigate(`/jobs/${r.job_id}?tab=issues`)}
                        />
                      </Tooltip>
                    </td>

                    <td style={td}>{r.created_by_name ?? "—"}</td>
                    <td style={td}>{r.start_date_utc ?? "—"}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <IconButton
                        size="small"
                        onClick={(e) => openMenu(e, r)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Box>

        {/* PAGINATION */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            variant="outlined"
            shape="rounded"
          />
        </Box>
      </Paper>

      {/* ACTION MENU */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={handleView}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>

        {/* Close Job only if ongoing */}
        {selectedRow?.status !== "completed" && (
          <MenuItem onClick={handleCloseJobConfirm}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            Close Job
          </MenuItem>
        )}

        {/* Delete only admin */}
        {isAdmin && (
          <MenuItem
            onClick={handleDeleteJobConfirm}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete Job
          </MenuItem>
        )}
      </Menu>

      {/* CLOSE JOB DIALOG */}
      <Dialog open={openClose} onClose={() => setOpenClose(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark as Completed?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            You are about to close <b>{selectedRow?.job_ref}</b>. This will mark the job as
            <b> completed</b>. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClose(false)}>Cancel</Button>
          <Button onClick={doCloseJob} variant="contained" startIcon={<CheckCircleIcon />}>
            Close Job
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE JOB DIALOG */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>Delete Job?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            This will permanently delete <b>{selectedRow?.job_ref}</b> and all associated records
            (maintenance, issues, etc). This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button onClick={doDeleteJob} color="error" variant="contained" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </JobLayoutContainer>
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
