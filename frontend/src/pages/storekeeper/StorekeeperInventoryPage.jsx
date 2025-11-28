// ============================================================
// SFV Tech | Storekeeper Inventory Page (Improved + Stable)
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Grow,
  TablePagination,
  Avatar,
  Stack,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Refresh,
  WarningAmber,
  Layers,
  Bolt,
  BatteryChargingFull,
  Inventory2,
  Search,
  ArrowBack,
  Logout,
  ListAlt,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import api from "../../utils/api"; // ✅ Backend instance

export default function StorekeeperInventoryPage({ role = "storekeeper" }) {

  const { enqueueSnackbar } = useSnackbar();

  // ================== STATES ==================
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  // Pagination (10 per page)
const [page, setPage] = useState(0);          // MUI uses 0-based page index
const [rowsPerPage, setRowsPerPage] = useState(10);
const [totalItems, setTotalItems] = useState(0);
  
  
  const [form, setForm] = useState({
    name: "",
    type: "",
    category: "",
    size: "",
    quantity: "",
    condition: "New",
  });

  const token = localStorage.getItem("token");

  const COLORS = {
    pageBg: "#f6fff8",
    text: "#243b2e",
    accent: "#00c896",
    accentDark: "#00806a",
    border: "#b9fbc0",
  };

  // ============================================================
  // FETCH DATA FROM BACKEND
  // ============================================================
 const fetchInventory = async () => {
  try {
    setLoading(true);
    const qPage = page + 1;        // convert 0-based (MUI) → 1-based (API)
    const qLimit = rowsPerPage;    // 10

    const res = await api.get(`/api/inventory?page=${qPage}&limit=${qLimit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setInventory(res.data.items || []);

    // try common shapes for total count (fallback to length)
    const total =
      res?.data?.pagination?.total_items ??
      res?.data?.total ??
      res?.data?.count ??
      (res.data.items ? res.data.items.length : 0);

    setTotalItems(Number(total));
  } catch (err) {
    console.error(err);
    enqueueSnackbar("Failed to fetch inventory", { variant: "error" });
  } finally {
    setLoading(false);
  }
};


  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/inventory/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchSummary();
  }, [page, rowsPerPage]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleAdd = async () => {
    try {
      await api.post("/api/inventory/add", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Item added successfully", { variant: "success" });
      setOpenAdd(false);
      setForm({
        name: "",
        type: "",
        category: "",
        size: "",
        quantity: "",
        condition: "New",
      });
      fetchInventory();
      fetchSummary();
    } catch (err) {
      enqueueSnackbar("Failed to add item", { variant: "error" });
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/api/inventory/update/${editItem.id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Item updated", { variant: "success" });
      setOpenEdit(false);
      fetchInventory();
      fetchSummary();
    } catch (err) {
      enqueueSnackbar("Failed to update item", { variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/api/inventory/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      enqueueSnackbar(res.data.message || "Item deleted successfully", {
        variant: "success",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });

      setOpenDelete(false);
      fetchInventory();
      fetchSummary();
    } catch (err) {
      console.error("❌ Delete error:", err.response?.data || err.message);
      enqueueSnackbar("Failed to delete item", {
        variant: "error",
        anchorOrigin: { vertical: "top", horizontal: "right" },
      });
    }
	
	// adjust page if we deleted the last item on the last page
const newTotal = Math.max(totalItems - 1, 0);
const lastPageIndex = Math.max(Math.ceil(newTotal / rowsPerPage) - 1, 0);

if (page > lastPageIndex) {
  setPage(lastPageIndex);  // triggers fetch via useEffect
} else {
  fetchInventory();
  fetchSummary();
}

  };

  const openEditDialog = (item) => {
    setEditItem(item);
    setForm(item);
    setOpenEdit(true);
  };

  const getStockColor = (qty) => (qty < 5 ? "error" : qty < 10 ? "warning" : "success");

  const handleBack = () => window.history.back();
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

 const handleNavigateLogs = () => {
  if (role === "admin") {
    window.location.href = "/admin/inventory-logs";
  } else {
    window.location.href = "/storekeeper/inventory-logs";
  }
};


  // ============================================================
  // UI
  // ============================================================
  return (
    <Box sx={{ background: COLORS.pageBg, minHeight: "100vh", p: 3, color: COLORS.text }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Inventory2 sx={{ color: COLORS.accent }} /> Inventory Management
        </Typography>

        <Stack direction="row" spacing={1}>
          {/* BACK */}
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleBack}
            sx={{ borderColor: COLORS.accentDark, color: COLORS.accentDark }}
          >
            Back
          </Button>

          {/* LOGOUT */}
          <Button
            variant="outlined"
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{ borderColor: COLORS.accentDark, color: COLORS.accentDark }}
          >
            Logout
          </Button>

          {/* REFRESH */}
          <Tooltip title="Refresh">
            <IconButton onClick={() => { fetchInventory(); fetchSummary(); }} sx={{ color: COLORS.accentDark }}>
              <Refresh />
            </IconButton>
          </Tooltip>

        {/* ✅ INVENTORY LOGS LINK (Visible only to Admin) */}
{role.toLowerCase() === "admin" && (
  <Button
    startIcon={<ListAlt />}
    variant="contained"
    onClick={handleNavigateLogs}
    sx={{
      background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentDark})`,
      fontWeight: 800,
      borderRadius: 2,
      px: 2.5,
    }}
  >
    Inventory Logs
  </Button>
)}


          {/* ADD ITEM */}
          <Button
            startIcon={<Add />}
            variant="contained"
            sx={{
              background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentDark})`,
              fontWeight: 800,
              borderRadius: 2,
              px: 2.5,
            }}
            onClick={() => setOpenAdd(true)}
          >
            Add Item
          </Button>
        </Stack>
      </Stack>

      {/* STATS */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {[
          { title: "Total Items", value: summary.total_items, icon: <Layers /> },
          { title: "Low Stock (<10)", value: summary.low_stock, icon: <WarningAmber /> },
          { title: "New Items", value: summary.new_items, icon: <BatteryChargingFull /> },
          { title: "Used Items", value: summary.used_items, icon: <Bolt /> },
        ].map((s, i) => (
          <Grow in timeout={300 + i * 100} key={i}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  border: `1px solid ${COLORS.border}`,
                  background: "#fff",
                  borderRadius: 3,
                  boxShadow: "0 8px 18px rgba(0,0,0,.08)",
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: COLORS.accent, color: "#fff" }}>{s.icon}</Avatar>
                  <Box>
                    <Typography variant="body2">{s.title}</Typography>
                    <Typography variant="h4" fontWeight={800} color={COLORS.accentDark}>
                      {s.value || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grow>
        ))}
      </Grid>

      {/* SEARCH */}
      <Box sx={{ mt: 3 }}>
        <TextField
          placeholder="Search by name, type, or category..."
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <Search style={{ marginRight: 8, color: COLORS.accentDark }} />,
          }}
        />
      </Box>

      {/* TABLE */}
      <Box sx={{ mt: 3, background: "#fff", borderRadius: 3, boxShadow: "0 8px 18px rgba(0,0,0,.08)" }}>
        {loading ? (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <CircularProgress color="success" />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                {["Name", "Type", "Category", "Size", "Quantity", "Condition", "Status", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory
                .filter((i) =>
                  Object.values(i).join(" ").toLowerCase().includes(search.toLowerCase())
                )
                .map((item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>
                      <Chip label={item.quantity} color={getStockColor(item.quantity)} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.condition}
                        sx={{
                          bgcolor:
                            item.condition === "New"
                              ? "#16a34a"
                              : item.condition === "Used"
                              ? "#9e9e9e"
                              : "#0288d1",
                          color: "#fff",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {item.quantity < 5 ? (
                        <Chip icon={<WarningAmber />} label="Critical" color="error" />
                      ) : item.quantity < 10 ? (
                        <Chip icon={<WarningAmber />} label="Low" color="warning" />
                      ) : (
                        <Chip label="OK" color="success" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="success" onClick={() => openEditDialog(item)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setEditItem(item);
                              setOpenDelete(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
		  
		  
        )}
		
<TablePagination
  component="div"
  count={totalItems}
  page={page}
  onPageChange={(_, newPage) => setPage(newPage)}
  rowsPerPage={rowsPerPage}
  onRowsPerPageChange={(e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0); // reset to first page on page-size change
  }}
  rowsPerPageOptions={[10]}   // fixed at 10 per page
/>
		
		
		
      </Box>

      {/* ADD ITEM DIALOG */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {["name", "type", "category", "size", "quantity"].map((f) => (
              <Grid item xs={12} sm={6} key={f}>
                <TextField
                  label={f.charAt(0).toUpperCase() + f.slice(1)}
                  fullWidth
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Condition"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              >
                <MenuItem value="New">New</MenuItem>
                <MenuItem value="Used">Used</MenuItem>
                <MenuItem value="Refurbished">Refurbished</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" color="success">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {["name", "type", "category", "size", "quantity"].map((f) => (
              <Grid item xs={12} sm={6} key={f}>
                <TextField
                  label={f.charAt(0).toUpperCase() + f.slice(1)}
                  fullWidth
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Condition"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              >
                <MenuItem value="New">New</MenuItem>
                <MenuItem value="Used">Used</MenuItem>
                <MenuItem value="Refurbished">Refurbished</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button onClick={handleEdit} variant="contained" color="success">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete <strong>{editItem?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(editItem.id)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
