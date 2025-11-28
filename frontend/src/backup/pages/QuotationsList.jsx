import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Typography,
  IconButton,
  Grid,
  CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../utils/api"; // adjust if your api file path differs

const QuotationsList = () => {
  const [quotations, setQuotations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    created_by: "",
    quote_for: "",
    items: [{ material_id: "", quantity: "", unit_price: 0 }],
  });

  /* =====================================================
   * Fetch Quotations + Materials
   * ===================================================== */
  const fetchData = async () => {
    try {
      const [qRes, mRes] = await Promise.all([
        api.get("/api/quotations"),
        api.get("/api/materials"),
      ]);
      setQuotations(qRes.data);
      setMaterials(mRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* =====================================================
   * Item Handlers
   * ===================================================== */
  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { material_id: "", quantity: "", unit_price: 0 }],
    }));
  };

  const handleRemoveItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleChangeItem = (index, field, value) => {
    const updated = [...form.items];
    updated[index][field] = value;

    if (field === "material_id") {
      const mat = materials.find((m) => m.id === parseInt(value));
      if (mat) updated[index].unit_price = mat.unit_price;
    }
    setForm({ ...form, items: updated });
  };

  /* =====================================================
   * Save Quotation
   * ===================================================== */
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/api/quotations", form);
      setOpen(false);
      fetchData();
      setForm({
        customer_name: "",
        customer_phone: "",
        created_by: "",
        quote_for: "",
        items: [{ material_id: "", quantity: "", unit_price: 0 }],
      });
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save quotation");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
   * DataGrid Columns
   * ===================================================== */
  const columns = [
    { field: "id", headerName: "ID", flex: 0.4 },
    { field: "ref_no", headerName: "REF No", flex: 1 },
    { field: "customer_name", headerName: "Client Name", flex: 1.2 },
    { field: "created_by", headerName: "Quoted By", flex: 1 },
    { field: "quote_for", headerName: "Quote For", flex: 1.2 },
    { field: "customer_phone", headerName: "Phone", flex: 1 },
    {
      field: "total_amount",
      headerName: "Total (₦)",
      flex: 1,
      renderCell: (p) => `₦ ${Number(p.value || 0).toLocaleString()}`,
    },
  ];

  /* =====================================================
   * Render UI
   * ===================================================== */
  return (
    <Box sx={{ p: 3 }}>
      {/* ===== Header ===== */}
      <Grid
        container
        justifyContent="space-between"
        alignItems="center"
        sx={{
          mb: 2,
          backgroundColor: "#1976d2",
          color: "#fff",
          p: 2,
          borderRadius: 2,
          boxShadow: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          📄 Quotations Management
        </Typography>
        <Button
          variant="contained"
          sx={{ backgroundColor: "#fff", color: "#1976d2", fontWeight: "bold" }}
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          New Quotation
        </Button>
      </Grid>

      {/* ===== Table ===== */}
      {loading ? (
        <CircularProgress />
      ) : (
        <Box
          sx={{
            height: 520,
            background: "#fff",
            borderRadius: 2,
            boxShadow: 1,
            p: 1,
          }}
        >
          <DataGrid
            rows={quotations}
            columns={columns}
            getRowId={(r) => r.id}
            pageSize={8}
            rowsPerPageOptions={[8, 15, 30]}
          />
        </Box>
      )}

      {/* ===== Dialog: Create New Quotation ===== */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            backgroundColor: "#1976d2",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          Create New Quotation
        </DialogTitle>

        <DialogContent>
          {/* ===== Client Info ===== */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, mt: 1 }}>
            Client Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Client Name"
                fullWidth
                variant="outlined"
                value={form.customer_name}
                onChange={(e) =>
                  setForm({ ...form, customer_name: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Phone Number"
                fullWidth
                variant="outlined"
                value={form.customer_phone}
                onChange={(e) =>
                  setForm({ ...form, customer_phone: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Quoted By (Engineer)"
                fullWidth
                variant="outlined"
                value={form.created_by}
                onChange={(e) =>
                  setForm({ ...form, created_by: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Quote For"
                fullWidth
                variant="outlined"
                value={form.quote_for}
                onChange={(e) =>
                  setForm({ ...form, quote_for: e.target.value })
                }
              />
            </Grid>
          </Grid>

          {/* ===== Items Section ===== */}
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ mt: 3, mb: 1, color: "#1976d2" }}
          >
            Items / Materials
          </Typography>

          {form.items.map((item, i) => (
            <Grid container spacing={1} key={i} alignItems="center" sx={{ mb: 1 }}>
              <Grid item xs={5}>
                <TextField
                  select
                  fullWidth
                  label="Material"
                  value={item.material_id}
                  onChange={(e) =>
                    handleChangeItem(i, "material_id", e.target.value)
                  }
                >
                  {materials.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={2}>
                <TextField
                  label="Qty"
                  type="number"
                  fullWidth
                  value={item.quantity}
                  onChange={(e) =>
                    handleChangeItem(i, "quantity", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={3}>
                <TextField
                  label="Unit Price (₦)"
                  type="number"
                  fullWidth
                  value={item.unit_price}
                  onChange={(e) =>
                    handleChangeItem(i, "unit_price", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={1.5}>
                <Typography fontWeight={500}>
                  ₦{" "}
                  {Number(item.quantity * item.unit_price || 0).toLocaleString()}
                </Typography>
              </Grid>

              <Grid item xs={0.5}>
                <IconButton color="error" onClick={() => handleRemoveItem(i)}>
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Button onClick={handleAddItem} sx={{ mt: 1 }}>
            + Add Another Item
          </Button>
        </DialogContent>

        <DialogActions sx={{ pr: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ fontWeight: "bold" }}
          >
            {saving ? "Saving..." : "Save Quotation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuotationsList;
