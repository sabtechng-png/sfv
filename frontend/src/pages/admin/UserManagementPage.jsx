// src/pages/admin/UserManagementPage.jsx
// SFV Tech — Admin-Only User Management (FULL TOKEN PATCH)

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Grid, TextField, Button, IconButton, Chip,
  Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Tooltip, Divider, Snackbar, Alert, FormControl, InputLabel, Select
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";
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
    ];
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

export default function UserManagementPage() {
  // ⭐ IMPORTANT FIX — get JWT token
  const { user, token } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  // State
  const [rows, setRows] = useState([]);
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

  // Build query params
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", page);
    params.set("limit", PAGE_SIZE);
    if (q.trim()) params.set("q", q.trim());
    if (roleFilter) params.set("role", roleFilter);
    return params.toString();
  }, [page, q, roleFilter]);

  // ⭐ FIXED: All fetch calls now include Authorization header
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    try {
      const qs = buildParams();
      const res = await fetch(`${API_BASE}/api/users?${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setRows((data.users || []).map(u => ({ id: u.id, ...u })));
    } catch (e) {
      setToast({ open: true, msg: e.message, sev: "error" });
    } finally {
      setLoading(false);
    }
  }, [buildParams, isAdmin, token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchUsers(); }, [page]);

  if (!isAdmin) return <Navigate to="/login" replace />;

  const openCreate = () => {
    setEditMode(false);
    setFName(""); setFEmail(""); setFRole("engineer"); setFNickname(""); setFPassword("");
    setOpenForm(true);
  };

  const openEdit = () => {
    setEditMode(true);
    setFName(selectedRow?.name || "");
    setFEmail(selectedRow?.email || "");
    setFRole(selectedRow?.role || "engineer");
    setFNickname(selectedRow?.nickname || "");
    setOpenForm(true);
    setMenuAnchor(null);
  };

  // ⭐ FIXED: submitForm includes token
  const submitForm = async () => {
    if (!isAdmin) return;
    pending.current = true;

    try {
      const body = {
        name: fName,
        email: fEmail,
        role: fRole,
        nickname: fNickname,
      };
      if (fPassword) body.password = fPassword;

      const res = await fetch(`${API_BASE}/api/users${editMode ? `/${selectedRow.id}` : ""}`, {
        method: editMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setOpenForm(false);
      setToast({ open: true, msg: editMode ? "User updated" : "User created", sev: "success" });
      fetchUsers();
    } catch (e) {
      setToast({ open: true, msg: e.message, sev: "error" });
    } finally {
      pending.current = false;
    }
  };

  // ⭐ FIXED reset password
  const doResetPwd = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/${selectedRow.id}/reset-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: resetPassword }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setOpenReset(false);
      setToast({ open: true, msg: "Password reset", sev: "success" });
    } catch (e) {
      setToast({ open: true, msg: e.message, sev: "error" });
    }
  };

  // ⭐ FIXED delete user
  const doDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/${selectedRow.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setOpenDelete(false);
      fetchUsers();
      setToast({ open: true, msg: "User deleted", sev: "success" });
    } catch (e) {
      setToast({ open: true, msg: e.message, sev: "error" });
    }
  };

  // ⭐ FIXED CSV export
  const exportCSV = async () => {
    const qs = buildParams();
    const res = await fetch(`${API_BASE}/api/users?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) return;

    const csv = toCSV(data.users);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const RoleChip = ({ value }) => {
    const v = String(value || "").toLowerCase();
    const c = ROLE_COLORS[v] || { bg: "#607d8b", fg: "#fff" };
    return <Chip label={v.toUpperCase()} size="small" sx={{ bgcolor: c.bg, color: c.fg }} />;
  };

  const columns = [
    { field: "name", headerName: "Name", flex: 1.4 },
    { field: "email", headerName: "Email", flex: 1.6 },
    { field: "role", headerName: "Role", flex: 1, renderCell: p => <RoleChip value={p.value} /> },
    { field: "nickname", headerName: "Nickname", flex: 1 },
    { field: "last_login", headerName: "Last Login", flex: 1 },
    { field: "created_at", headerName: "Created At", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 70,
      renderCell: (params) => (
        <IconButton onClick={(e) => { e.stopPropagation(); setSelectedRow(params.row); setMenuAnchor(e.currentTarget); }}>
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={800}>User Management (Admin Only)</Typography>
        <Box display="flex" gap={1}>
          <IconButton onClick={() => fetchUsers()}><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add User</Button>
        </Box>
      </Box>

      <Paper sx={{ p: 1 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[PAGE_SIZE]}
          paginationModel={{ pageSize: PAGE_SIZE, page: page - 1 }}
          onPaginationModelChange={m => setPage(m.page + 1)}
          sx={{ height: 600 }}
        />
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCSV}>
            Export CSV
          </Button>
        </Box>
      </Paper>

      {/* --- ACTION MENU --- */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={openEdit}><EditIcon sx={{ mr: 1 }} /> Edit User</MenuItem>
        <MenuItem onClick={() => setOpenReset(true)}><LockResetIcon sx={{ mr: 1 }} /> Reset Password</MenuItem>
        <MenuItem onClick={() => setOpenDelete(true)} sx={{ color: "red" }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete User
        </MenuItem>
      </Menu>

      {/* --- EDIT DIALOG --- */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Name" fullWidth value={fName} onChange={e => setFName(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Email" fullWidth value={fEmail} onChange={e => setFEmail(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={fRole} label="Role" onChange={e => setFRole(e.target.value)}>
                  {roleList.map(r => <MenuItem key={r} value={r}>{r.toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Nickname" fullWidth value={fNickname} onChange={e => setFNickname(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Password (optional)" type="password" fullWidth value={fPassword} onChange={e => setFPassword(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* RESET PASSWORD */}
      <Dialog open={openReset} onClose={() => setOpenReset(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="New Password" type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReset(false)}>Cancel</Button>
          <Button variant="contained" onClick={doResetPwd}>Reset</Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>Delete User?</DialogTitle>
        <DialogContent><Typography>This cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* TOAST */}
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={toast.sev} onClose={() => setToast(s => ({ ...s, open: false }))} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
