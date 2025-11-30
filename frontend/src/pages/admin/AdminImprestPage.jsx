import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow,
  Paper, TableContainer, IconButton, Pagination, InputAdornment
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";

export default function AdminImprestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = (user?.role || "").toLowerCase();
  if (role !== "admin") navigate("/login");

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [imprest, setImprest] = useState([]);

  // 📌 New Search + Pagination states
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    user_email: "",
    amount: "",
    remarks: "",
    source: "Admin Allocation",
  });

  async function loadUsers() {
    const res = await api.get("/api/expense-form/users");
    setUsers(res.data || []);
  }

  async function loadImprest() {
    const res = await api.get("/api/imprest");
    setImprest(res.data || []);
  }

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([loadUsers(), loadImprest()]);
      setLoading(false);
    }
    loadAll();
  }, []);

  const handleAdd = async () => {
    try {
      await api.post("/api/imprest", form);
      setOpenAdd(false);
      setForm({ user_email: "", amount: "", remarks: "", source: "Admin Allocation" });
      await loadImprest();
    } catch {
      alert("Error saving imprest");
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/api/imprest/${selected.id}`, {
        amount: selected.amount,
        remarks: selected.remarks,
        source: selected.source,
      });

      setOpenEdit(false);
      setSelected(null);
      await loadImprest();
    } catch {
      alert("Error updating imprest");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this imprest?")) return;

    try {
      await api.delete(`/api/imprest/${id}`);
      await loadImprest();
    } catch {
      alert("Error deleting imprest");
    }
  };

  const fmt = (v) => `₦${Number(v || 0).toLocaleString()}`;

  // ============================================
  // 🔍 SEARCH FILTER LOGIC
  // ============================================
  const filtered = imprest.filter((row) => {
    const t = search.toLowerCase();
    return (
      row.user_email.toLowerCase().includes(t) ||
      String(row.amount).includes(t) ||
      (row.source || "").toLowerCase().includes(t) ||
      (row.remarks || "").toLowerCase().includes(t)
    );
  });

  // ============================================
  // 📄 PAGINATION LOGIC
  // ============================================
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedRows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => setPage(1), [search]); // reset to page 1 when searching

  if (loading)
    return (
      <Box sx={{ mt: 10, textAlign: "center" }}>
        <CircularProgress color="warning" />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" fontWeight={900}>
          💰 Imprest Management (Admin Only)
        </Typography>

        <Button variant="contained" onClick={() => setOpenAdd(true)}>
          + Allocate Imprest
        </Button>
      </Box>

      {/* 🔍 SEARCH BAR */}
      <TextField
        fullWidth
        placeholder="Search imprest (email, amount, source, remarks)..."
        sx={{ mb: 2 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* IMPREST TABLE */}
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ background: "#102a43" }}>
            <TableRow>
              {["User Email", "Amount", "Source", "Remarks", "Created At", "Actions"].map((h) => (
                <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.user_email}</TableCell>
                <TableCell>{fmt(row.amount)}</TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.remarks || "-"}</TableCell>
                <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>

                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => {
                      setSelected(row);
                      setOpenEdit(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>

                  <IconButton color="error" onClick={() => handleDelete(row.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {paginatedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  No matching records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Component */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
        <Typography>
          Showing {paginatedRows.length} of {filtered.length} records
        </Typography>

        <Pagination
          count={totalPages}
          page={page}
          color="primary"
          onChange={(_, v) => setPage(v)}
        />
      </Box>

      {/* ADD MODAL */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
        <DialogTitle>Allocate Imprest</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth select label="Select User" sx={{ my: 1 }}
            value={form.user_email}
            onChange={(e) => setForm({ ...form, user_email: e.target.value })}
          >
            {users.map((u) => (
              <MenuItem key={u.email} value={u.email}>
                {u.nickname || u.email}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth label="Amount" type="number" sx={{ my: 1 }}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <TextField
            fullWidth label="Source" sx={{ my: 1 }}
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />

          <TextField
            fullWidth label="Remarks (Optional)" multiline rows={2} sx={{ my: 1 }}
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>
            Save Allocation
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Imprest</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth label="Amount" type="number" sx={{ my: 1 }}
            value={selected?.amount || ""}
            onChange={(e) => setSelected({ ...selected, amount: e.target.value })}
          />

          <TextField
            fullWidth label="Source" sx={{ my: 1 }}
            value={selected?.source || ""}
            onChange={(e) => setSelected({ ...selected, source: e.target.value })}
          />

          <TextField
            fullWidth label="Remarks" multiline rows={2} sx={{ my: 1 }}
            value={selected?.remarks || ""}
            onChange={(e) => setSelected({ ...selected, remarks: e.target.value })}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
