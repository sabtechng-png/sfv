// ======================================================================
// SFV Tech | Expense Form (Unified v4 — Witness Fix)
// Rules:
//  • Both SPENT and TRANSFER use the same endpoint (/api/expense-form/expenses)
//  • Witness1 & Witness2 always recorded
//  • Available balance validation preserved
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
  Divider,
} from "@mui/material";
import { useSnackbar } from "notistack";
import api from "../utils/api";

export default function ExpenseForm({ users, user, balances, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    purpose: "",
    amount: "",
    receiver_email: "",
    expense_type: "spent",
    witness1: "",
    witness2: "",
    notes: "",
    confirm: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const available = Number(balances?.available ?? 0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      purpose,
      amount,
      receiver_email,
      expense_type,
      confirm,
      witness1,
      witness2,
      notes,
    } = formData;

    if (!confirm)
      return enqueueSnackbar("Please confirm before submission.", { variant: "warning" });
    if (!purpose)
      return enqueueSnackbar("Purpose is required.", { variant: "error" });
    if (!amount || Number(amount) <= 0)
      return enqueueSnackbar("Enter a valid amount.", { variant: "error" });

    // Guard with Available only
    if (Number(amount) > available)
      return enqueueSnackbar(
        `Insufficient Available balance. ₦${available.toLocaleString()} < ₦${Number(amount).toLocaleString()}.`,
        { variant: "error" }
      );

    // Prevent invalid witness selections
    if ([receiver_email, witness1, witness2].filter(Boolean).some((e) => e === user.email))
      return enqueueSnackbar("You cannot choose yourself as receiver or witness.", {
        variant: "error",
      });
    if (witness1 && witness2 && witness1 === witness2)
      return enqueueSnackbar("Witness 1 and 2 must be different.", { variant: "error" });
    if (receiver_email && (receiver_email === witness1 || receiver_email === witness2))
      return enqueueSnackbar("A receiver cannot also be a witness.", { variant: "error" });

    if (expense_type === "transfer" && !receiver_email)
      return enqueueSnackbar("Receiver email is required for transfer.", { variant: "error" });

    setSubmitting(true);
    try {
      // ✅ Unified backend route for both SPENT and TRANSFER
      await api.post("/api/expense-form/expenses", {
        user_email: user.email,
        to_user_email: receiver_email || null,
        purpose,
        amount: Number(amount),
        expense_type,
        notes: notes || null,
        witness1: witness1 || null,
        witness2: witness2 || null,
      });

      enqueueSnackbar(
        expense_type === "transfer"
          ? "Transfer created (pending receiver approval)."
          : "Expense recorded successfully.",
        { variant: "success" }
      );

      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to record expense.";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectable = (excludeList = []) =>
    users.filter((u) => u.email !== user.email && !excludeList.includes(u.email));

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ p: 3, background: "#fff", color: "#0b1a33", borderRadius: 2 }}
    >
      {/* Balance Banner */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          background:
            "linear-gradient(90deg, rgba(0,43,92,0.12), rgba(245,196,0,0.12))",
          border: "1px solid rgba(0,43,92,0.2)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Balance Snapshot
        </Typography>
        <Typography variant="body2">
          Available: <b>₦{available.toLocaleString()}</b>
        </Typography>
      </Box>

      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, color: "#002b5c", textAlign: "center" }}
      >
        ➕ Record New Expense
      </Typography>

      <TextField
        select
        label="Expense Type"
        name="expense_type"
        value={formData.expense_type}
        onChange={handleChange}
        fullWidth
        sx={{ mb: 2 }}
      >
        <MenuItem value="spent">Spent (Purchase/Use)</MenuItem>
        <MenuItem value="transfer">Transfer (Trace-only)</MenuItem>
      </TextField>

      {formData.expense_type === "transfer" && (
        <TextField
          select
          label="Select Receiver"
          name="receiver_email"
          value={formData.receiver_email}
          onChange={handleChange}
          fullWidth
          required
          sx={{ mb: 2 }}
        >
          {selectable().map((u) => (
            <MenuItem key={u.email} value={u.email}>
              <span style={{ fontWeight: 600 }}>{u.nickname || "Unnamed"}</span>
              <span style={{ color: "#555", fontSize: "0.85em" }}> ({u.email})</span>
            </MenuItem>
          ))}
        </TextField>
      )}

      {/* Witnesses */}
      <TextField
        select
        label="Select Witness 1"
        name="witness1"
        value={formData.witness1}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
      >
        {selectable([formData.receiver_email]).map((u) => (
          <MenuItem key={u.email} value={u.email}>
            <span style={{ fontWeight: 600 }}>{u.nickname || "Unnamed"}</span>
            <span style={{ color: "#555", fontSize: "0.85em" }}> ({u.email})</span>
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Select Witness 2"
        name="witness2"
        value={formData.witness2}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
      >
        {selectable([formData.receiver_email, formData.witness1]).map((u) => (
          <MenuItem key={u.email} value={u.email}>
            <span style={{ fontWeight: 600 }}>{u.nickname || "Unnamed"}</span>
            <span style={{ color: "#555", fontSize: "0.85em" }}> ({u.email})</span>
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Purpose"
        name="purpose"
        value={formData.purpose}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        placeholder="e.g. Tool purchase, repair, transport..."
      />

      <TextField
        label="Amount (₦)"
        name="amount"
        type="number"
        value={formData.amount}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        inputProps={{ min: 0 }}
      />

      <TextField
        label="Notes (optional)"
        name="notes"
        value={formData.notes}
        onChange={handleChange}
        fullWidth
        multiline
        rows={2}
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 1 }} />

      <FormControlLabel
        control={
          <Checkbox
            name="confirm"
            checked={formData.confirm}
            onChange={handleChange}
          />
        }
        label="I confirm that this expense information is correct"
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          sx={{
            backgroundColor: "#f5c400",
            color: "#0b1a33",
            fontWeight: 700,
            "&:hover": { backgroundColor: "#e6b800" },
          }}
          disabled={submitting}
        >
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Submit"}
        </Button>
      </Box>
    </Box>
  );
}
