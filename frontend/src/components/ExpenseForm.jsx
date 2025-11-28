// ======================================================================
// SFV Tech | Unified Expense Form (Frontend v2.2 - Witness Required)
// Works with: backend /api/expenses (Unified Expense Routes v1.2)
// Handles: SPENT + TRANSFER with strict witness enforcement
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
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    expense_type: "spent",
    receiver_email: "",
    purpose: "",
    amount: "",
    witness1: "",
    witness2: "",
    notes: "",
    confirm: false,
  });

  const available = Number(balances?.available ?? 0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // ---------------- Submit Handler ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      expense_type,
      receiver_email,
      purpose,
      amount,
      witness1,
      witness2,
      notes,
      confirm,
    } = formData;

    // ---------------- Validation ----------------
    if (!confirm)
      return enqueueSnackbar("Please confirm before submitting.", { variant: "warning" });
    if (!purpose)
      return enqueueSnackbar("Purpose is required.", { variant: "error" });
    if (!amount || Number(amount) <= 0)
      return enqueueSnackbar("Enter a valid amount.", { variant: "error" });
    if (Number(amount) > available)
      return enqueueSnackbar(`Insufficient balance: ₦${available.toLocaleString()}`, {
        variant: "error",
      });
    if (expense_type === "transfer" && !receiver_email)
      return enqueueSnackbar("Receiver is required for transfer.", { variant: "error" });

    // Witness Validation (Strict)
    if (!witness1 || !witness2)
      return enqueueSnackbar("Both witnesses are required.", { variant: "error" });
    if (witness1 === witness2)
      return enqueueSnackbar("Witness 1 and Witness 2 must be different.", {
        variant: "error",
      });
    if ([witness1, witness2].includes(user.email))
      return enqueueSnackbar("You cannot select yourself as a witness.", {
        variant: "error",
      });
    if (receiver_email && [witness1, witness2].includes(receiver_email))
      return enqueueSnackbar("Receiver cannot also be a witness.", { variant: "error" });

    // ---------------- API Call ----------------
    setSubmitting(true);
    try {
      await api.post("/api/expenses", {
        sender_email: user.email,
        receiver_email: receiver_email || null,
        purpose,
        amount: Number(amount),
        expense_type,
        notes,
        witness1,
        witness2,
      });
      enqueueSnackbar(
        expense_type === "spent"
          ? "✅ Expense recorded successfully."
          : "📝 Transfer recorded (pending approval).",
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

  const selectableUsers = (exclude = []) =>
    users.filter((u) => !exclude.includes(u.email) && u.email !== user.email);

  // ---------------- UI ----------------
  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        background: "#fff",
        color: "#0b1a33",
        borderRadius: 2,
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      {/* Balance snapshot */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          background: "linear-gradient(90deg, #e0f7fa, #fff3e0)",
          border: "1px solid rgba(0,43,92,0.15)",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Balance Snapshot
        </Typography>
        <Typography variant="body2">
          Available: <b>₦{available.toLocaleString()}</b>
        </Typography>
      </Box>

      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, textAlign: "center", color: "#002b5c" }}
      >
        ➕ Record New Transaction
      </Typography>

      {/* Expense type */}
      <TextField
        select
        label="Transaction Type"
        name="expense_type"
        value={formData.expense_type}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
      >
        <MenuItem value="spent">Spent (Purchase/Use)</MenuItem>
        <MenuItem value="transfer">Transfer to another user</MenuItem>
      </TextField>

      {/* Receiver field for transfers */}
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
          <MenuItem value="">Select Receiver</MenuItem>
          {selectableUsers([]).map((u) => (
            <MenuItem key={u.email} value={u.email}>
              {u.nickname || u.email}
            </MenuItem>
          ))}
        </TextField>
      )}

      {/* Witness fields (required) */}
      <TextField
        select
        label="Witness 1 (Required)"
        name="witness1"
        value={formData.witness1}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        error={!formData.witness1}
        helperText={!formData.witness1 ? "Select Witness 1" : ""}
      >
        <MenuItem value="">Select Witness 1</MenuItem>
        {selectableUsers([formData.receiver_email, formData.witness2]).map((u) => (
          <MenuItem key={u.email} value={u.email}>
            {u.nickname || u.email}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Witness 2 (Required)"
        name="witness2"
        value={formData.witness2}
        onChange={handleChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        error={!formData.witness2}
        helperText={!formData.witness2 ? "Select Witness 2" : ""}
      >
        <MenuItem value="">Select Witness 2</MenuItem>
        {selectableUsers([formData.receiver_email, formData.witness1]).map((u) => (
          <MenuItem key={u.email} value={u.email}>
            {u.nickname || u.email}
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
        placeholder="e.g. Tool purchase, transport, allowance..."
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
        label="I confirm this transaction is correct"
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
