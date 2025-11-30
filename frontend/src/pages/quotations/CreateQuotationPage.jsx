import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  Grid,
  Divider,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import api from "../../utils/api";
import CustomerForm from "../../components/quotations/CustomerForm";
import MaterialSelectorModal from "../../components/quotations/MaterialSelectorModal";
import CustomItemModal from "../../components/quotations/CustomItemModal";
import ItemsTable from "../../components/quotations/ItemsTable";
import SummaryCard from "../../components/quotations/SummaryCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Local ID generator
const makeLocalId = () =>
  `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const CreateQuotationPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth() || {};

  // ====== TOP BUTTONS: BACK + LOGOUT ======
  const goBackToDashboard = () => {
    if (!user || !user.role) {
      navigate("/");
      return;
    }
    switch (user.role) {
      case "engineer":
        navigate("/engineer/dashboard");
        break;
      case "staff":
        navigate("/staff/dashboard");
        break;
      case "storekeeper":
        navigate("/store/dashboard");
        break;
      case "apprentice":
        navigate("/apprentice/dashboard");
        break;
      default:
        navigate("/admin/dashboard");
        break;
    }
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate("/");
  };

  // ==========================================================
  // CUSTOMER & PROJECT INFO
  // ==========================================================
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: "",
    phone: "",
    address: "",
    project_type: "",
    notes: "",
  });

  const updateCustomerInfo = (field, value) =>
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));

  // ==========================================================
  // PROJECT TITLE UX
  // ==========================================================
  const projectTitle = customerInfo.project_type;
  const charCount = projectTitle.length;

  const titleSuggestions = [
    "Solar Hybrid Inverter Installation",
    "Full Solar Power Installation",
    "CCTV Surveillance System Deployment",
    "Gate Automation Motor Installation",
    "Industrial Electrical Wiring & Load Balancing",
    "Battery Bank Upgrade & Optimization",
    "Solar Inverter Installation with Backup Batteries",
    "Hybrid Solar + Grid System Setup",
  ];

  const titleQuality = (() => {
    if (charCount < 10) return { label: "Too Short", color: "error" };
    if (charCount < 25) return { label: "Okay", color: "warning" };
    return { label: "Good Title", color: "success" };
  })();

  const autoGenerateTitle = () => {
    if (!customerInfo.customer_name.trim()) {
      alert("Enter customer name first.");
      return;
    }
    const name = customerInfo.customer_name.split(" ")[0];
    updateCustomerInfo(
      "project_type",
      `Solar Installation for ${name} — Hybrid Inverter System`
    );
  };

  // ==========================================================
  // MATERIALS LOADING
  // ==========================================================
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialQty, setMaterialQty] = useState("1");
  const [materialUnit, setMaterialUnit] = useState("pcs");
  const [materialUnitPrice, setMaterialUnitPrice] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setMaterialsLoading(true);
        const res = await api.get("/api/materials");
        setMaterials(res.data || []);
      } catch (err) {
        console.error(err);
        setMaterialsError("Failed to load materials.");
      } finally {
        setMaterialsLoading(false);
      }
    };
    load();
  }, []);

  const filteredMaterials = useMemo(() => {
    const term = materialSearch.trim().toLowerCase();
    if (!term) return materials;
    return materials.filter((m) =>
      `${m.name} ${m.category}`.toLowerCase().includes(term)
    );
  }, [materials, materialSearch]);

  const openMaterialSelector = () => setMaterialModalOpen(true);

  const closeMaterialSelector = () => {
    setMaterialModalOpen(false);
    setSelectedMaterial(null);
    setMaterialQty("1");
    setMaterialUnit("pcs");
    setMaterialUnitPrice("");
  };

  const onSelectMaterial = (m) => {
    setSelectedMaterial(m);
    setMaterialQty("1");
    setMaterialUnit(m.unit || "pcs");
    setMaterialUnitPrice(m.unit_price || "");
  };

  const addItemFromMaterial = () => {
    if (!selectedMaterial) return;

    const qty = Number(materialQty);
    const price = Number(materialUnitPrice);

    if (!qty || qty <= 0) {
      alert("Invalid quantity");
      return;
    }
    if (price < 0) {
      alert("Invalid price");
      return;
    }

    const newItem = {
      local_id: makeLocalId(),
      material_id: selectedMaterial.id,
      name: selectedMaterial.name,
      unit: materialUnit,
      qty,
      unit_price: price,
      total_price: qty * price,
      is_custom: false,
    };

    setItems((prev) => [...prev, newItem]);
    closeMaterialSelector();
  };

  // ==========================================================
  // CUSTOM ITEMS
  // ==========================================================
  const [items, setItems] = useState([]);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("job");
  const [customQty, setCustomQty] = useState("1");
  const [customPrice, setCustomPrice] = useState("");

  const addCustomItem = () => {
    const qty = Number(customQty);
    const price = Number(customPrice);

    if (!customName.trim()) {
      alert("Item name required");
      return;
    }
    if (qty <= 0) {
      alert("Invalid quantity");
      return;
    }
    if (price < 0) {
      alert("Invalid price");
      return;
    }

    const newItem = {
      local_id: makeLocalId(),
      material_id: null,
      name: customName,
      unit: customUnit,
      qty,
      unit_price: price,
      total_price: qty * price,
      is_custom: true,
    };

    setItems((prev) => [...prev, newItem]);
    setCustomModalOpen(false);
  };

  const updateItemField = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.local_id !== id) return it;
        const updated = { ...it, [field]: value };
        const qty = Number(field === "qty" ? value : updated.qty);
        const price = Number(
          field === "unit_price" ? value : updated.unit_price
        );
        updated.total_price = qty * price || 0;
        return updated;
      })
    );
  };

  const removeItem = (id) =>
    setItems((prev) => prev.filter((it) => it.local_id !== id));

  // ==========================================================
  // CALCULATIONS
  // ==========================================================
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.total_price) || 0), 0),
    [items]
  );

  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);

  const discountAmount = subtotal * (discountPercent / 100);
  const taxable = subtotal - discountAmount;
  const vatAmount = taxable * (vatPercent / 100);
  const grandTotal = taxable + vatAmount;

  // ==========================================================
  // SAVE & PRINT
  // ==========================================================
  const [saving, setSaving] = useState(false);
  const [savedQuotationId, setSavedQuotationId] = useState(null);

  const handleSaveQuotation = async () => {
    if (!customerInfo.customer_name.trim()) {
      alert("Customer name required");
      return;
    }
    if (!customerInfo.project_type.trim()) {
      alert("Project title required");
      return;
    }
    if (items.length === 0) {
      alert("Add at least one item");
      return;
    }

    try {
      setSaving(true);

const payload = {
  customer_name: customerInfo.customer_name,
  customer_phone: customerInfo.phone,
  customer_address: customerInfo.address,

  // IMPORTANT FIX
  quote_for: customerInfo.project_type,
  project_title: customerInfo.project_type,  // <- NEW FIX

  notes: customerInfo.notes,
  subtotal,
  discount_percent: discountPercent,
  discount_amount: discountAmount,
  vat_percent: vatPercent,
  vat_amount: vatAmount,
  total: grandTotal,
  items: items.map((it) => ({
    material_id: it.material_id,
    material_name: it.name,
    material_unit: it.unit,
    quantity: it.qty,
    unit_price: it.unit_price,
    is_custom: it.is_custom,
  })),
};


      const res = await api.post("/api/quotations", payload);
      setSavedQuotationId(res.data.id);
      alert("Quotation saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save quotation.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!savedQuotationId) {
      alert("Please save the quotation before printing.");
      return;
    }
    window.open(`/quotations/print/${savedQuotationId}`, "_blank");
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <Box
      sx={{
        p: 4,
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #e9eef5, #f8f9fb)",
      }}
    >
      <Box sx={{ maxWidth: 1300, mx: "auto" }}>
        {/* TOP BAR: BACK + LOGOUT */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Button variant="outlined" onClick={goBackToDashboard}>
            ← Back to Dashboard
          </Button>

          <Button variant="contained" color="error" onClick={handleLogout}>
            Logout
          </Button>
        </Stack>

        {/* PAGE TITLE */}
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ mb: 1, color: "#1e293b" }}
        >
          Create New Quotation
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, color: "#475569" }}>
          Enter customer details, define project title, add items, and complete
          your quotation.
        </Typography>

        <Grid container spacing={4}>
          {/* LEFT COLUMN: Project title + Customer info */}
          <Grid item xs={12} md={7}>
            {/* PROJECT TITLE CARD */}
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                mb: 4,
                border: "1px solid #e2e8f0",
                background: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Project Title
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <input
                  type="text"
                  value={projectTitle}
                  placeholder="e.g., Installation of 5kVA Hybrid Solar System..."
                  onChange={(e) =>
                    updateCustomerInfo("project_type", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "16px",
                    outline: "none",
                    background: "#f8fafc",
                  }}
                />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  mt={1}
                  mb={2}
                >
                  <Typography variant="caption" color="text.secondary">
                    {charCount} characters
                  </Typography>
                  <Chip
                    label={titleQuality.label}
                    color={titleQuality.color}
                    size="small"
                  />
                </Stack>

                <Button
                  variant="text"
                  size="small"
                  sx={{ mt: -1 }}
                  onClick={autoGenerateTitle}
                >
                  AUTO-GENERATE USING CUSTOMER NAME
                </Button>

                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mt: 3, mb: 1 }}
                >
                  Suggestions
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {titleSuggestions.map((s, idx) => (
                    <Chip
                      key={idx}
                      label={s}
                      onClick={() => updateCustomerInfo("project_type", s)}
                      sx={{ cursor: "pointer", mb: 1 }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* CUSTOMER INFORMATION */}
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                background: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  Customer Information
                </Typography>
                <Divider sx={{ my: 2 }} />
                <CustomerForm
                  customerInfo={customerInfo}
                  onChange={updateCustomerInfo}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* ITEMS TABLE */}
          <Grid item xs={12}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                background: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    Quotation Items
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={openMaterialSelector}
                    >
                      Add Material
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setCustomModalOpen(true)}
                    >
                      Add Custom Item
                    </Button>
                  </Stack>
                </Stack>

                <ItemsTable
                  items={items}
                  onUpdate={updateItemField}
                  onRemove={removeItem}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* FINANCIAL SUMMARY AT BOTTOM */}
          <Grid item xs={12}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                background: "white",
                mt: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <SummaryCard
                  subtotal={subtotal}
                  discountPercent={discountPercent}
                  vatPercent={vatPercent}
                  discountAmount={discountAmount}
                  vatAmount={vatAmount}
                  grandTotal={grandTotal}
                  setDiscountPercent={setDiscountPercent}
                  setVatPercent={setVatPercent}
                  onSave={handleSaveQuotation}
                  saving={saving}
                  onPrint={handlePrint}
                  onClear={() => {
                    setItems([]);
                    setCustomerInfo({
                      customer_name: "",
                      phone: "",
                      address: "",
                      project_type: "",
                      notes: "",
                    });
                    setDiscountPercent(0);
                    setVatPercent(0);
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* MODALS */}
        <MaterialSelectorModal
          open={materialModalOpen}
          onClose={closeMaterialSelector}
          materials={materials}
          loading={materialsLoading}
          error={materialsError}
          filteredMaterials={filteredMaterials}
          search={materialSearch}
          onSearch={setMaterialSearch}
          selectedMaterial={selectedMaterial}
          onSelectMaterial={onSelectMaterial}
          qty={materialQty}
          unit={materialUnit}
          unitPrice={materialUnitPrice}
          setQty={setMaterialQty}
          setUnit={setMaterialUnit}
          setUnitPrice={setMaterialUnitPrice}
          onAdd={addItemFromMaterial}
        />

        <CustomItemModal
          open={customModalOpen}
          onClose={() => setCustomModalOpen(false)}
          name={customName}
          unit={customUnit}
          qty={customQty}
          price={customPrice}
          setName={setCustomName}
          setUnit={setCustomUnit}
          setQty={setCustomQty}
          setPrice={setCustomPrice}
          onAdd={addCustomItem}
        />
      </Box>
    </Box>
  );
};

export default CreateQuotationPage;
