// ======================================================================
// SFV TECH — ADMIN IMPREST MANAGEMENT PAGE
// Admin can: View imprest history + Allocate new imprest to any user
// ======================================================================

import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, CardContent, Grid, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, Table, TableBody, TableCell, TableHead,
  TableRow, Paper, TableContainer
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";

export default function AdminImprestPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const role = (user?.role || "").toLowerCase();
  if (role !== "admin") navigate("/login");

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [imprest, setImprest] = useState([]);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    user_email: "",
    amount: "",
    remarks: "",
    source: "Admin Allocation",
  });

  // Load users for dropdown
  async function loadUsers() {
    const res = await api.get("/api/expense-form/users");
    setUsers(res.data || []);
  }

  // Load imprest history
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

  const handleSubmit = async () => {
    try {
      await api.post("/api/imprest", form);
      setOpen(false);
      setForm({ user_email: "", amount: "", remarks: "", source: "Admin Allocation" });
      await loadImprest();
    } catch (err) {
      console.error(err);
      alert("Error saving imprest");
    }
  };

  const fmt = (v) => `₦${Number(v || 0).toLocaleString()}`;

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

        <Button variant="contained" onClick={() => setOpen(true)}>
          + Allocate Imprest
        </Button>
      </Box>

      {/* IMPREST TABLE */}
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ background: "#102a43" }}>
            <TableRow>
              {["User Email", "Amount", "Source", "Remarks", "Created At"].map((h) => (
                <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {imprest.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.user_email}</TableCell>
                <TableCell>{fmt(row.amount)}</TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.remarks || "-"}</TableCell>
                <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ALLOCATION MODAL */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
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
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Save Allocation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
