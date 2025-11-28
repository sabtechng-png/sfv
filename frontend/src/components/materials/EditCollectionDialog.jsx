import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";

export default function EditCollectionDialog({
  open,
  record,
  onClose,
  onSubmit,
  theme,
  role,
}) {
  const [form, setForm] = useState({
    vendor_name: "",
    material_name: "",
    quantity: "",
    purpose: "",
    project_name: "",
    status: "pending",
    remarks: "",
  });

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  useEffect(() => {
    if (open && record) {
      setForm({
        vendor_name: record.vendor_name || "",
        material_name: record.material_name || "",
        quantity: String(record.quantity ?? ""),
        purpose: record.purpose || "",
        project_name: record.project_name || "",
        status: (record.status || "pending").toLowerCase(),
        remarks: record.remarks || "",
      });
    }
  }, [open, record]);

  const handleSave = async () => {
    if (!record?.id) return;

    const payload = {
      id: record.id,
      vendor_name: form.vendor_name,
      material_name: form.material_name,
      quantity: Number(form.quantity || 0),
      purpose: form.purpose,
      project_name: form.project_name,
      remarks: form.remarks,
      actor_role: role, // ✅ send role so backend can auto-handle status
    };

    // ✅ Admin can choose status, non-admin cannot
    if (role === "admin") {
      payload.status = form.status;
    }

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900, color: theme?.accentDark }}>
        Edit Material Collection
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Vendor Name"
            value={form.vendor_name}
            onChange={set("vendor_name")}
            fullWidth
          />

          <TextField
            label="Material Name"
            value={form.material_name}
            onChange={set("material_name")}
            fullWidth
          />

          <TextField
            type="number"
            label="Quantity"
            value={form.quantity}
            onChange={set("quantity")}
            fullWidth
          />

          <TextField
            label="Purpose"
            value={form.purpose}
            onChange={set("purpose")}
            fullWidth
            multiline
          />

          <TextField
            label="Project Name"
            value={form.project_name}
            onChange={set("project_name")}
            fullWidth
          />

          {/* ✅ Status field only visible to admin */}
          {role === "admin" && (
            <TextField
              select
              label="Status"
              value={form.status}
              onChange={set("status")}
              fullWidth
            >
              {["pending", "verified", "flagged"].map((s) => (
                <MenuItem key={s} value={s}>
                  {s.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* ❌ Verified By field fully removed */}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ fontWeight: 700 }}>
          Cancel
        </Button>

        <Button
          onClick={handleSave}
          sx={{
            bgcolor: theme?.accent,
            color: "#fff",
            fontWeight: 900,
            "&:hover": { bgcolor: theme?.accentDark },
          }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
