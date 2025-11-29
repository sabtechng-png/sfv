// ======================================================================
// SFV Tech — ADMIN USER MANAGEMENT PAGE (Fully Responsive Version)
// Uses backend route: /api/admin-users
// Mobile • Tablet • Laptop • Desktop Optimized
// ======================================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Paper, Grid, TextField, Button, IconButton, Chip,
  Menu, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Typography, Snackbar, Alert,
  FormControl, InputLabel, Select, Divider, useMediaQuery
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

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

export default function UserManagementPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === "admin";

  // Breakpoints for responsiveness
  const isMobile = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");

  // ============================
  // STATE
  // ============================
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [loading, setLoading] = useState(false);

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

  // ============================
  // FETCH USERS
  // ============================
  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", page + 1);
      params.set("limit", PAGE_SIZE);

      if (q.trim()) params.set("q", q.trim());
      if (roleFilter) params.set("role", roleFilter);

      const res = await fetch(`${API_BASE}/api/admin-users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setRows(data.users || []);
      setTotalRows(data.total || 0);
    } catch (err) {
      setToast({ open: true, msg: err.message, sev: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, q, roleFilter, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ============================
  // FORM HANDLING
  // ============================
  const openCreate = () => {
    setEditMode(false);
    setFName("");
    setFEmail("");
    setFRole("engineer");
    setFNickname("");
    setFPassword("");
    setOpenForm(true);
  };

  const openEditUser = () => {
    setEditMode(true);
    setFName(selectedRow?.name);
    setFEmail(selectedRow?.email);
    setFRole(selectedRow?.role);
    setFNickname(selectedRow?.nickname || "");
    setFPassword("");
    setOpenForm(true);
    setMenuAnchor(null);
  };

  const submitForm = async () => {
    try {
      const body = {
        name: fName,
        email: fEmail,
        role: fRole,
        nickname: fNickname,
      };

      if (fPassword.trim()) body.password = fPassword;

      const url = `${API_BASE}/api/admin-users${editMode ? `/${selectedRow.id}` : ""}`;
      const method = editMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setToast({ open: true, msg: editMode ? "User updated" : "User created", sev: "success" });
      setOpenForm(false);
      fetchUsers();
    } catch (err) {
      setToast({ open: true, msg: err.message, sev: "error" });
    }
  };

  // ============================
  // RESET PASSWORD
  // ============================
  const doResetPwd = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/admin-users/${selectedRow.id}/reset-password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ password: resetPassword }),
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setToast({ open: true, msg: "Password reset", sev: "success" });
      setOpenReset(false);
    } catch (err) {
      setToast({ open: true, msg: err.message, sev: "error" });
    }
  };

  // ============================
  // DELETE USER
  // ============================
  const doDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin-users/${selectedRow.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setToast({ open: true, msg: "User deleted", sev: "success" });
      setOpenDelete(false);
      fetchUsers();
    } catch (err) {
      setToast({ open: true, msg: err.message, sev: "error" });
    }
  };

  // ============================
  // EXPORT CSV
  // ============================
  const exportCSV = async () => {
    const params = new URLSearchParams();
    params.set("page", 1);
    params.set("limit", totalRows);

    const res = await fetch(`${API_BASE}/api/admin-users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!data.success) return;

    const csvHeader = "id,name,email,role,nickname,last_login,created_at,updated_at\n";
    const csvRows = data.users.map(u =>
      [u.id, u.name, u.email, u.role, u.nickname, u.last_login, u.created_at, u.updated_at].join(",")
    );

    const blob = new Blob([csvHeader + csvRows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "users.csv";
    a.click();
  };

  // ============================
  // ROLE CHIP
  // ============================
  const RoleChip = ({ value }) => {
    const v = String(value || "").toLowerCase();
    const c = ROLE_COLORS[v] || { bg: "#455a64", fg: "#fff" };
    return <Chip label={v.toUpperCase()} size="small" sx={{ bgcolor: c.bg, color: c.fg }} />;
  };

  // ============================
  // TABLE COLUMNS
  // ============================
  const columns = [
    { field: "name", headerName: "Name", flex: 1.4, minWidth: 140 },
    { field: "email", headerName: "Email", flex: 1.6, minWidth: 160 },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      minWidth: 90,
      renderCell: p => <RoleChip value={p.value} />,
    },
    { field: "nickname", headerName: "Nickname", flex: 1, minWidth: 110 },
    { field: "created_at", headerName: "Created", flex: 1, minWidth: 120 },
    {
      field: "actions",
      headerName: "Actions",
      width: 70,
      renderCell: params => (
        <IconButton
          onClick={e => {
            e.stopPropagation();
            setSelectedRow(params.row);
            setMenuAnchor(e.currentTarget);
          }}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  // ============================
  // SECURITY REDIRECT
  // ============================
  if (!isAdmin) return <Navigate to="/login" replace />;

  // ======================================================================
  // RENDERED UI
  // ======================================================================
  return (
    <Box p={{ xs: 1, sm: 2, md: 3 }}>

      {/* ------------------------------------------- */}
      {/* HEADER (Responsive) */}
      {/* ------------------------------------------- */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={2}
      >
        <Typography variant="h5" fontWeight={800}>
          User Management
        </Typography>

        <Box display="flex" gap={1}>
          <IconButton onClick={fetchUsers}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* ------------------------------------------- */}
      {/* FILTER SECTION (Responsive Grid) */}
      {/* ------------------------------------------- */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Search"
              fullWidth
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1 }} />,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Filter by Role</InputLabel>
              <Select
                value={roleFilter}
                label="Filter by Role"
                onChange={e => {
                  setRoleFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Roles</MenuItem>
                {roleList.map(role => (
                  <MenuItem key={role} value={role}>
                    {role.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* ------------------------------------------- */}
      {/* DATAGRID (Fully Responsive) */}
      {/* ------------------------------------------- */}
      <Paper sx={{ p: { xs: 1, sm: 2 } }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          rowCount={totalRows}
          paginationMode="server"
          pageSizeOptions={[PAGE_SIZE]}
          paginationModel={{ page, pageSize: PAGE_SIZE }}
          onPaginationModelChange={m => setPage(m.page)}
          sx={{
            height: { xs: 450, sm: 520, md: 600, lg: 650 },
            fontSize: { xs: "11px", sm: "13px", md: "14px" },
            "& .MuiDataGrid-columnHeaders": {
              fontSize: { xs: "11px", sm: "13px" },
            },
          }}
        />

        <Divider sx={{ my: 1 }} />

        <Box display="flex" justifyContent="flex-end">
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCSV}>
            Export CSV
          </Button>
        </Box>
      </Paper>

      {/* ------------------------------------------- */}
      {/* ACTION MENU */}
      {/* ------------------------------------------- */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={openEditUser}>
          <EditIcon sx={{ mr: 1 }} /> Edit User
        </MenuItem>

        <MenuItem onClick={() => setOpenReset(true)}>
          <LockResetIcon sx={{ mr: 1 }} /> Reset Password
        </MenuItem>

        <MenuItem sx={{ color: "red" }} onClick={() => setOpenDelete(true)}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete User
        </MenuItem>
      </Menu>

      {/* ------------------------------------------- */}
      {/* ADD / EDIT USER DIALOG */}
      {/* ------------------------------------------- */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            p: { xs: 1, sm: 2 },
            borderRadius: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle>{editMode ? "Edit User" : "Add User"}</DialogTitle>

        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Name" value={fName} onChange={e => setFName(e.target.value)} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" value={fEmail} onChange={e => setFEmail(e.target.value)} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={fRole} label="Role" onChange={e => setFRole(e.target.value)}>
                  {roleList.map(r => (
                    <MenuItem key={r} value={r}>
                      {r.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Nickname" value={fNickname} onChange={e => setFNickname(e.target.value)} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password (optional)"
                type="password"
                value={fPassword}
                onChange={e => setFPassword(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------- */}
      {/* RESET PASSWORD */}
      {/* ------------------------------------------- */}
      <Dialog
        open={openReset}
        onClose={() => setOpenReset(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            p: { xs: 1, sm: 2 },
            borderRadius: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle>Reset Password</DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={resetPassword}
            onChange={e => setResetPassword(e.target.value)}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenReset(false)}>Cancel</Button>
          <Button variant="contained" onClick={doResetPwd}>Reset</Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------- */}
      {/* DELETE CONFIRM */}
      {/* ------------------------------------------- */}
      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            p: { xs: 1, sm: 2 },
            borderRadius: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ color: "error.main" }}>Delete User?</DialogTitle>

        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------- */}
      {/* TOAST NOTIFICATION */}
      {/* ------------------------------------------- */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.sev}
          variant="filled"
          onClose={() => setToast(s => ({ ...s, open: false }))}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
