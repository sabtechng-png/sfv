import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
} from "@mui/material";

export default function ReturnMaterialDialog({
  open,
  record,
  onClose,
  onSubmit,
  theme,
}) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) {
      const baseQty = Number(record.quantity) || 0;
      const alreadyReturned = Number(record.returned_quantity || 0);
      const rem = Math.max(0, baseQty - alreadyReturned);

      setRemaining(rem);
      setQty(rem > 0 ? rem : ""); // prefill with remaining if > 0
      setNote("");
      setError(rem > 0 ? "" : "No quantity remaining to return");
    } else {
      setRemaining(0);
      setQty("");
      setNote("");
      setError("");
    }
  }, [record]);

  const handleQtyChange = (e) => {
    const raw = e.target.value;

    // Allow temporary empty input, treat as invalid until user types a number
    if (raw === "" || raw === null) {
      setQty("");
      setError("Return quantity must be greater than 0");
      return;
    }

    // Coerce to number safely
    const val = Number(raw);

    // NaN or non-positive
    if (!Number.isFinite(val) || val <= 0) {
      setQty(val);
      setError("Return quantity must be greater than 0");
      return;
    }

    // Upper bound check
    if (val > remaining) {
      setQty(val);
      setError(`Cannot return more than remaining (${remaining})`);
      return;
    }

    // All good
    setQty(val);
    setError("");
  };

  const handleSubmit = () => {
    const q = Number(qty);
    if (!error && Number.isFinite(q) && q > 0 && q <= remaining) {
      onSubmit(q, note);
    }
  };

  const disabled = !!error || !(Number.isFinite(Number(qty)) && Number(qty) > 0) || remaining <= 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800, color: theme?.accentDark }}>
        Return Material
      </DialogTitle>

      <DialogContent dividers>
        {record && (
          <Stack spacing={2}>
            <Typography fontWeight={700}>
              {record.material_name} — {record.vendor_name}
            </Typography>

            <Typography variant="body2">
              Original Qty: <b>{record.quantity}</b>
              <br />
              Returned: <b>{record.returned_quantity || 0}</b>
              <br />
              Remaining: <b>{remaining}</b>
            </Typography>

            <TextField
              type="number"
              label="Quantity to Return"
              value={qty}
              onChange={handleQtyChange}
              fullWidth
              inputProps={{ min: 1, max: remaining }}
              error={!!error}
              helperText={error || " "}
            />

            <TextField
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          disabled={disabled}
          onClick={handleSubmit}
          sx={{
            bgcolor: theme?.accent,
            color: "#fff",
            fontWeight: 800,
            "&:hover": { bgcolor: theme?.accentDark },
          }}
        >
          Submit Return
        </Button>
      </DialogActions>
    </Dialog>
  );
}
