// ======================================================================
// SFV Tech | Unified Return Form (Frontend v2.0)
// Works with: backend /api/expenses (Unified Expense Routes)
// Handles: Return transactions (pending approval)
// ======================================================================

import React, { useState } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useSnackbar } from "notistack";
import api from "../utils/api";

export default function ReturnForm({ user, users, balances, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    receiver_email: "",
    amount: "",
    purpose: "",
    notes: "",
    confirm: false,
  });

  const available = Number(balances?.available ?? 0);
  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const selectable = users.filter((u) => u.email !== user.email);

  // ----------------------------------------------------------
  // Submit Handler
  // ----------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.confirm)
      return enqueueSnackbar("Please confirm before submitting.", { variant: "warning" });
    if (!form.receiver_email)
      return enqueueSnackbar("Select who will receive the return.", { variant: "error" });
    if (!form.purpose)
      return enqueueSnackbar("Purpose is required.", { variant: "error" });
    if (!form.amount || Number(form.amount) <= 0)
      return enqueueSnackbar("Enter a valid amount.", { variant: "error" });

    const payload = {
      sender_email: user.email,
      receiver_email: form.receiver_email,
      purpose: form.purpose,
      amount: Number(form.amount),
      expense_type: "return",
      notes: form.notes || null,
    };

    try {
      setSubmitting(true);
      await api.post("/api/expenses", payload);
      enqueueSnackbar("↩️ Return recorded successfully (pending approval).", {
        variant: "success",
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to record return.";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------
  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        background: "#fff",
        borderRadius: 2,
        color: "#0b1a33",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
     

      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, textAlign: "center", color: "#002b5c" }}
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
        placeholder="e.g. Returning unused funds"
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
        <MenuItem value="">Select Receiver</MenuItem>
        {selectable.map((u) => (
          <MenuItem key={u.email} value={u.email}>
            {u.nickname || u.email}
          </MenuItem>
        ))}
      </TextField>

      <FormControlLabel
        control={<Checkbox name="confirm" checked={form.confirm} onChange={handleChange} />}
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
