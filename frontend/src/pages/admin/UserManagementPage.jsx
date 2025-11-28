// src/pages/admin/UserManagementPage.jsx
// SFV Tech — Admin-Only User Management (Hooks fixed + Role-only filter + Redirect non-admins)

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Grid, TextField, InputAdornment, Button, IconButton,
  Chip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Tooltip, Divider, Snackbar, Alert, FormControl, InputLabel, Select
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const PAGE_SIZE = 10;

const ROLE_COLORS = {
  admin: { bg: "#212121", fg: "#fff" },
  engineer: { bg: "#1565c0", fg: "#fff" },
  storekeeper: { bg: "#2e7d32", fg: "#fff" },
  apprentice: { bg: "#ef6c00", fg: "#fff" },
  staff: { bg: "#00897b", fg: "#fff" },
};
const roleList = ["admin", "engineer", "storekeeper", "apprentice", "staff"];

function toCSV(rows) {
  const headers = ["id", "name", "email", "role", "nickname", "last_login", "created_at", "updated_at"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = [
      r.id, r.name ?? "", r.email ?? "", r.role ?? "", r.nickname ?? "",
      r.last_login ?? "", r.created_at ?? "", r.updated_at ?? "",
    ].map(v => String(v).replace(/"/g, '""'));
    lines.push(vals.map(v => (/[",\n]/.test(v) ? `"${v}"` : v)).join(","));
  }
  return lines.join("\n");
}

export default function UserManagementPage() {
  // 🔒 Always call hooks in the same order (first thing)
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  // State (declared unconditionally)
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openForm, setOpenForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openReset, setOpenReset] = useState(false);

  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fRole, setFRole] = useState("engineer");
  const [fNickname, setFNickname] = useState("");
  const [fPassword, setFPassword] = useState("");

  const [resetPassword, setResetPassword] = useState("");

  const [toast, setToast] = useState({ open: false, msg: "", sev: "success" });
  const pending = useRef(false);

  // Build query params (top-level hook; internal guard on isAdmin)
  const buildParams = useCallback((overrides = {}) => {
    const params = new URLSearchParams();
    params.set("page", overrides.page ?? page);
    params.set("limit", overrides.limit ?? PAGE_SIZE);
    if ((overrides.q ?? q).trim()) params.set("q", (overrides.q ?? q).trim());
    if (overrides.role ?? roleFilter) params.set("role", overrides.role ?? roleFilter);
    return params.toString();
  }, [page, q, roleFilter]);

  // Fetch users (top-level hook; early return if not admin)
  const fetchUsers = useCallback(async (opts = {}) => {
    if (!isAdmin) return; // prevent hitting API for non-admin renders
    setLoading(true);
    try {
      const qs = buildParams(opts);
      const res = await fetch(`${API_BASE}/api/users?${qs}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch users");
      setRows((data.users || []).map(u => ({ id: u.id, ...u })));
      setTotal(Number(data.total || 0));
    } catch (e) {
      console.error(e);
      setRows([]); setTotal(0);
      setToast({ open: true, msg: e.message || "Fetch failed", sev: "error" });
    } finally {
      setLoading(false);
    }
	
  }, [buildParams, isAdmin]);

  // Effects (always called; guarded inside)
  useEffect(() => { fetchUsers({ page: 1 }); }, [fetchUsers]);
  useEffect(() => { fetchUsers({ page }); }, [page, fetchUsers]);

  const handleApply = () => { setPage(1); fetchUsers({ page: 1 }); };
  const handleResetFilters = () => {
    setQ(""); setRoleFilter(""); setPage(1);
    fetchUsers({ q: "", role: "", page: 1 });
  };

  // Actions (no hooks inside)
  const openMenu = (e, row) => { setSelectedRow(row); setMenuAnchor(e.currentTarget); };
  const closeMenu = () => setMenuAnchor(null);

  const openCreate = () => {
    setEditMode(false);
    setFName(""); setFEmail(""); setFRole("engineer"); setFNickname(""); setFPassword("");
    setOpenForm(true);
  };

  const openEdit = () => {
    setEditMode(true);
    setFName(selectedRow?.name || "");
    setFEmail(selectedRow?.email || "");
    setFRole((selectedRow?.role || "engineer").toLowerCase());
    setFNickname(selectedRow?.nickname || "");
    setFPassword("");
    setOpenForm(true);
    closeMenu();
  };

  const submitForm = async () => {
    if (pending.current || !isAdmin) return;
    if (!fName || !fEmail || !fRole) {
      setToast({ open: true, msg: "Name, Email, and Role are required.", sev: "warning" });
      return;
    }
    pending.current = true;
    try {
      const body = { name: fName, email: fEmail, role: fRole, nickname: fNickname };
      if (fPassword) body.password = fPassword;
      const res = await fetch(`${API_BASE}/api/users${editMode ? `/${selectedRow.id}` : ""}`, {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");
      setOpenForm(false);
      setToast({ open: true, msg: editMode ? "User updated" : "User created", sev: "success" });
      fetchUsers();
    } catch (e) {
      setToast({ open: true, msg: e.message || "Save failed", sev: "error" });
    } finally { pending.current = false; }
  };

  const openResetPwd = () => { setResetPassword(""); setOpenReset(true); closeMenu(); };
  const doResetPwd = async () => {
    if (!isAdmin) return;
    if (!resetPassword) return setToast({ open: true, msg: "Enter a new password.", sev: "warning" });
    try {
      const res = await fetch(`${API_BASE}/api/users/${selectedRow.id}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Reset failed");
      setOpenReset(false);
      setToast({ open: true, msg: "Password reset", sev: "success" });
    } catch (e) {
      setToast({ open: true, msg: e.message || "Reset failed", sev: "error" });
    }
  };

  const handleDeleteConfirm = () => { setOpenDelete(true); closeMenu(); };
  const doDelete = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${selectedRow.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Delete failed");
      setOpenDelete(false);
      if (rows.length - 1 <= 0 && page > 1) { setPage(page - 1); fetchUsers({ page: page - 1 }); }
      else { fetchUsers(); }
      setToast({ open: true, msg: "User deleted", sev: "success" });
    } catch (e) {
      setToast({ open: true, msg: e.message || "Delete failed", sev: "error" });
    }
  };

  const exportCSV = async () => {
    if (!isAdmin) return;
    const qs = buildParams({ page: 1, limit: 10000 });
    const res = await fetch(`${API_BASE}/api/users?${qs}`);
    const data = await res.json();
    if (!data.success) return;
    const csv = toCSV(data.users || []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url;
    a.download = `users_${d.toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!isAdmin) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const qs = buildParams({ page: 1, limit: 10000 });
      const res = await fetch(`${API_BASE}/api/users?${qs}`);
      const data = await res.json();
      if (!data.success) return;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("SFV Tech — Users", 14, 14);
      doc.autoTable({
        startY: 20,
        head: [["Name", "Email", "Role", "Nickname", "Last Login", "Created At"]],
        body: (data.users || []).map(u => [
          u.name, u.email, (u.role || "").toUpperCase(), u.nickname || "",
          u.last_login || "—", u.created_at || "—",
        ]),
        styles: { fontSize: 9 },
      });
      doc.save(`users_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch {
      alert("Install: npm i jspdf jspdf-autotable");
    }
  };

  // Memoized role chip (top-level)
  const RoleChip = useMemo(() => ({ value }) => {
    const v = (value || "").toLowerCase();
    const c = ROLE_COLORS[v] || { bg: "#607d8b", fg: "#fff" };
    return <Chip label={(v || "").toUpperCase()} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 700 }} />;
  }, []);

  const columns = useMemo(() => ([
    { field: "name", headerName: "Name", flex: 1.4, minWidth: 180 },
    { field: "email", headerName: "Email", flex: 1.6, minWidth: 220 },
    { field: "role", headerName: "Role", flex: 0.9, minWidth: 120, renderCell: p => <RoleChip value={p.value} /> },
    { field: "nickname", headerName: "Nickname", flex: 1.0, minWidth: 160, valuvalueGetter: p => p?.row?.nickname ?? "—"
 },
{
  field: "last_login",
  headerName: "Last Login",
  flex: 1.2,
  // Use renderCell to avoid any version quirks with valueGetter display
  renderCell: (p) => {
    const v = p?.row?.last_login;
    if (!v) return "Never";
    const d = (v instanceof Date) ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? "Never" : d.toLocaleString();
  },
},
{
  field: "created_at",
  headerName: "Created At",
  flex: 1.2,
  renderCell: (p) => {
    const v = p?.row?.created_at;
    if (!v) return "—";
    const d = (v instanceof Date) ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  },
},

    {
      field: "actions", headerName: "Actions", type: "actions", width: 72,
      getActions: params => [
        <IconButton key="menu" size="small" onClick={e => { e.stopPropagation(); openMenu(e, params.row); }}>
          <MoreVertIcon />
        </IconButton>,
      ],
    },
  ]), [RoleChip]);

  const gridSx = {
    "& .MuiDataGrid-columnHeaders": { height: 46, minHeight: 46 },
    "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, fontSize: 13 },
    "& .MuiDataGrid-cell": { fontSize: 13 },
    "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
    "& .MuiDataGrid-footerContainer": { borderTop: "none" },
  };

  // 🚪 Redirect non-admins AFTER hooks (keeps hook order consistent)
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={800}>User Management (Admin Only)</Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh"><IconButton onClick={() => fetchUsers()}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add User</Button>
        </Box>
      </Box>

      {/* FILTERS */}
    

      {/* TABLE */}
      <Paper sx={{ p: 1 }}>
        <Box sx={{ height: 580, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            pageSizeOptions={[PAGE_SIZE]}
            paginationModel={{ pageSize: PAGE_SIZE, page: page - 1 }}
            onPaginationModelChange={m => {
              const next = (m.page || 0) + 1;
              if (next !== page) setPage(next);
            }}
            sx={gridSx}
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* EXPORTS */}
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", p: 1 }}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCSV}>Export CSV</Button>
			  {/* <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportPDF}>Export PDF</Button>*/}
        </Box>
      </Paper>

      {/* ACTION MENU */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={openEdit}><EditIcon fontSize="small" sx={{ mr: 1 }} />Edit User</MenuItem>
        <MenuItem onClick={openResetPwd}><LockResetIcon fontSize="small" sx={{ mr: 1 }} />Reset Password</MenuItem>
        <MenuItem onClick={handleDeleteConfirm} sx={{ color: "error.main" }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />Delete User
        </MenuItem>
      </Menu>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}><TextField label="Name" fullWidth value={fName} onChange={e => setFName(e.target.value)} /></Grid>
            <Grid item xs={12} md={6}><TextField label="Email" type="email" fullWidth value={fEmail} onChange={e => setFEmail(e.target.value)} /></Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select label="Role" value={fRole} onChange={e => setFRole(e.target.value)}>
                  {roleList.map(r => <MenuItem key={r} value={r}>{r.toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField label="Nickname (optional)" fullWidth value={fNickname} onChange={e => setFNickname(e.target.value)} /></Grid>
            <Grid item xs={12}>
              <TextField
                label={editMode ? "New Password (optional)" : "Password (optional)"}
                type="password"
                fullWidth
                value={fPassword}
                onChange={e => setFPassword(e.target.value)}
                placeholder={editMode ? "Leave blank to keep current password" : "Leave blank to auto-generate server-side"}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm}>{editMode ? "Save Changes" : "Create User"}</Button>
        </DialogActions>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={openReset} onClose={() => setOpenReset(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password — <Typography component="span" color="text.secondary">{selectedRow?.email}</Typography></DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label="New Password" type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReset(false)}>Cancel</Button>
          <Button variant="contained" onClick={doResetPwd} startIcon={<LockResetIcon />}>Reset</Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>Delete User?</DialogTitle>
        <DialogContent dividers>
          <Typography>This will permanently delete <b>{selectedRow?.email}</b>. This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete} startIcon={<DeleteIcon />}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* TOAST */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast.sev} variant="filled" onClose={() => setToast(s => ({ ...s, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
