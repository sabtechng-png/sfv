// ======================================================================
// SFV Tech | Return Form (Improved v2)
// Updated for "Available-only" rule:
//  • Balance snapshot shows Available only (Returned=0, Total=Available)
//  • No returned pool referenced
//  • UI, styling, and validation preserved
// ======================================================================

import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useSnackbar } from "notistack";
import api from "../utils/api";

export default function ReturnForm({ user, users, balances, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();

  const [form, setForm] = useState({
    amount: "",
    purpose: "",
    notes: "",
    receiver_email: "",
    confirm: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [snapshot, setSnapshot] = useState({ available: 0, total: 0 });

  // keep balance snapshot updated
  useEffect(() => {
    if (balances)
      setSnapshot({
        available: Number(balances.available ?? 0),
        total: Number(balances.available ?? 0),
      });
  }, [balances]);

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.confirm)
      return enqueueSnackbar("Please confirm before submitting.", { variant: "warning" });
    if (!form.amount || Number(form.amount) <= 0)
      return enqueueSnackbar("Enter a valid amount.", { variant: "error" });
    if (!form.purpose)
      return enqueueSnackbar("Purpose is required.", { variant: "error" });
    if (!form.receiver_email)
      return enqueueSnackbar("Select who will receive the return.", { variant: "error" });

    const payload = {
      sender_email: user.email,
      receiver_email: form.receiver_email,
      purpose: form.purpose,
      amount: Number(form.amount),
      expense_type: "return",
      notes: form.notes,
    };

    try {
      setSubmitting(true);
      await api.post("/api/expense-form/return", payload);
      enqueueSnackbar("Return recorded successfully (pending approval).", { variant: "success" });
      onSaved?.();
      onClose?.();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "Failed to record return.", {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ p: 3, background: "#fff", borderRadius: 2, color: "#0b1a33" }}
    >
      {/* Balance Snapshot */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          border: "1px solid rgba(0,43,92,0.2)",
          background:
            "linear-gradient(90deg, rgba(0,43,92,0.08), rgba(245,196,0,0.12))",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Balance Snapshot
        </Typography>
        <Typography variant="body2">
          Available: <b>{fmt(snapshot.available)}</b> &nbsp;•&nbsp;
          Total Usable: <b>{fmt(snapshot.total)}</b>
        </Typography>
      </Box>

      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, color: "#002b5c", textAlign: "center" }}
      >
        ↩️ Record Return Transaction
      </Typography>

      <TextField
        label="Amount (₦)"
        name="amount"
        type="number"
        value={form.amount}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />

      <TextField
        label="Purpose"
        name="purpose"
        value={form.purpose}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        placeholder="e.g. returning unused funds"
      />

      <TextField
        label="Notes (optional)"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        fullWidth
        multiline
        rows={2}
        sx={{ mb: 2 }}
      />

      <TextField
        select
        label="Return To"
        name="receiver_email"
        value={form.receiver_email}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
      >
        {Array.isArray(users) && users.length > 0 ? (
          users.map((u) => (
            <MenuItem key={u.email} value={u.email}>
              {u.nickname ? `${u.nickname} (${u.email})` : u.email}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No users available</MenuItem>
        )}
      </TextField>

      <FormControlLabel
        control={
          <Checkbox name="confirm" checked={form.confirm} onChange={handleChange} />
        }
        label="I confirm this return transaction is correct"
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          sx={{
            backgroundColor: "#2196f3",
            color: "#fff",
            fontWeight: 700,
            "&:hover": { backgroundColor: "#1976d2" },
          }}
        >
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Submit"}
        </Button>
      </Box>
    </Box>
  );
}
