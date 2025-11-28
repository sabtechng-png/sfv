import React, { useState } from "react";
import { Box, Stack, TextField, Button } from "@mui/material";
import { useAuth } from "../../../context/AuthContext"; // ✅ import your auth hook

export default function NewCollectionForm({ theme, onSubmit, onCancel }) {
  const { user } = useAuth(); // ✅ get current user
  const [form, setForm] = useState({
    vendor_name: "",
    material_name: "",
    quantity: "",
    purpose: "",
    project_name: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.vendor_name || !form.material_name || !form.quantity) return;

    // ✅ inject collector_email and collector_role directly
    const payload = {
      vendor_name: form.vendor_name,
      material_name: form.material_name,
      quantity: Number(form.quantity || 0),
      purpose: form.purpose || "",
      project_name: form.project_name || "",
      collector_email: user?.email,   // 👈 critical line
      collector_role: user?.role,     // 👈 critical line
    };

    onSubmit(payload);
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ p: 1, width: 480, maxWidth: "100%" }}>
      <Stack spacing={2}>
        <TextField label="Vendor" value={form.vendor_name} onChange={set("vendor_name")} required />
        <TextField label="Material" value={form.material_name} onChange={set("material_name")} required />
        <TextField
          label="Quantity"
          type="number"
          value={form.quantity}
          onChange={set("quantity")}
          inputProps={{ min: 0 }}
          required
        />
        <TextField label="Purpose" value={form.purpose} onChange={set("purpose")} multiline minRows={2} />
        <TextField label="Project (optional)" value={form.project_name} onChange={set("project_name")} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="submit"
            sx={{
              bgcolor: theme?.accent,
              color: "#fff",
              "&:hover": { bgcolor: theme?.accentDark },
            }}
          >
            Save
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
