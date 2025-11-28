import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Grid,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../utils/api";
import { setPageTitle } from "../utils/setPageTitle";

const MaterialsList = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    category: "",
    unit: "pcs",
    unit_price: "",
  });
  const [saving, setSaving] = useState(false);

  // Fetch all materials
  const fetchMaterials = async () => {
    try {
      const res = await api.get("/api/materials");
      setMaterials(res.data);
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPageTitle("Materials Management");
    fetchMaterials();
  }, []);

  // Handle open dialog
  const handleOpen = (material = null) => {
    if (material) {
      setFormData(material);
    } else {
      setFormData({ id: null, name: "", category: "", unit: "pcs", unit_price: "" });
    }
    setOpen(true);
  };

  // Handle close dialog
  const handleClose = () => {
    setOpen(false);
  };

  // Handle input change
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Add or update material
  const handleSave = async () => {
    setSaving(true);
    try {
      if (formData.id) {
        await api.put(`/api/materials/${formData.id}`, formData);
      } else {
        await api.post("/api/materials", formData);
      }
      await fetchMaterials();
      setOpen(false);
    } catch (err) {
      console.error("Error saving material:", err);
      alert("Failed to save material.");
    } finally {
      setSaving(false);
    }
  };

  // Delete material (fixed version)
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      try {
        await api.delete(`/api/materials/${id}`);
        setMaterials((prev) => prev.filter((m) => m.id !== id)); // ✅ update state locally
      } catch (err) {
        console.error("Error deleting material:", err);
        alert("Failed to delete material.");
      }
    }
  };

  // Columns for DataGrid
  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Material Name", flex: 1 },
    { field: "category", headerName: "Category", flex: 1 },
    { field: "unit", headerName: "Unit", width: 100 },
    {
      field: "unit_price",
      headerName: "Unit Price (₦)",
      width: 150,
      renderCell: (params) => `₦ ${Number(params.value).toLocaleString()}`,
    },
    {
      field: "last_updated",
      headerName: "Last Updated (UTC)",
      flex: 1,
      valueFormatter: (params) =>
        new Date(params.value).toLocaleString("en-GB", { timeZone: "UTC" }),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handleOpen(params.row)} color="primary" size="small">
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => handleDelete(params.row.id)}
            color="error"
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* ======= Top Header Section ======= */}
        <Grid
          container
          justifyContent="space-between"
          alignItems="center"
          sx={{
            mb: 3,
            backgroundColor: "#1976d2",
            color: "#fff",
            p: 2,
            borderRadius: 2,
            boxShadow: 2,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            🧱 Materials Management
          </Typography>

          <Box>
            <Button
              variant="outlined"
              sx={{ mr: 2, color: "white", borderColor: "white" }}
              onClick={() => window.history.back()}
            >
              ← Back
            </Button>
            <Button
              variant="outlined"
              sx={{ mr: 2, color: "white", borderColor: "white" }}
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/";
              }}
            >
              Logout
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              Add Material
            </Button>
          </Box>
        </Grid>

        {/* ======= Data Table ======= */}
        {loading ? (
          <CircularProgress />
        ) : (
          <Box
            sx={{
              height: 500,
              backgroundColor: "#fafafa",
              borderRadius: 3,
              boxShadow: 3,
              p: 2,
            }}
          >
            <DataGrid
              rows={materials}
              columns={columns}
              getRowId={(row) => row.id}
              pageSize={8}
              rowsPerPageOptions={[8, 15, 30]}
              disableSelectionOnClick
              sx={{
                border: "none",
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  fontWeight: "bold",
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "#e3f2fd",
                },
              }}
            />
          </Box>
        )}

        {/* ======= Add/Edit Material Dialog ======= */}
        <Dialog open={open} onClose={handleClose}>
          <DialogTitle sx={{ backgroundColor: "#1976d2", color: "white" }}>
            {formData.id ? "Edit Material" : "Add New Material"}
          </DialogTitle>
          <DialogContent sx={{ mt: 1 }}>
            <TextField
              margin="dense"
              name="name"
              label="Material Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              name="category"
              label="Category"
              fullWidth
              variant="outlined"
              value={formData.category}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              name="unit"
              label="Unit"
              fullWidth
              variant="outlined"
              value={formData.unit}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              name="unit_price"
              label="Unit Price (₦)"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.unit_price}
              onChange={handleChange}
            />
          </DialogContent>
          <DialogActions sx={{ pr: 3, pb: 2 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default MaterialsList;
