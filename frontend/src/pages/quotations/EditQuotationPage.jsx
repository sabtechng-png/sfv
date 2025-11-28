import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Stack, Typography, Button, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";

// Reuse your modular components
import CustomerForm from "../../components/quotations/CustomerForm";
import MaterialSelectorModal from "../../components/quotations/MaterialSelectorModal";
import CustomItemModal from "../../components/quotations/CustomItemModal";
import ItemsTable from "../../components/quotations/ItemsTable";
import SummaryCard from "../../components/quotations/SummaryCard";

// Utility for generating local item IDs
const makeLocalId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const EditQuotationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // -----------------------------
  // CUSTOMER INFO
  // -----------------------------
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: "",
    phone: "",
    address: "",
    project_type: "",
    project_title: "",   // ⭐ ADDED
    notes: "",
  });

  const updateCustomerInfo = (field, value) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
  };

  // -----------------------------
  // ITEMS
  // -----------------------------
  const [items, setItems] = useState([]);

  // -----------------------------
  // MATERIALS (for selector modal)
  // -----------------------------
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialQty, setMaterialQty] = useState("1");
  const [materialUnit, setMaterialUnit] = useState("pcs");
  const [materialUnitPrice, setMaterialUnitPrice] = useState("");

  // -----------------------------
  // CUSTOM ITEM MODAL
  // -----------------------------
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("job");
  const [customQty, setCustomQty] = useState("1");
  const [customPrice, setCustomPrice] = useState("");

  // -----------------------------
  // FINANCIALS
  // -----------------------------
  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.total_price) || 0), 0),
    [items]
  );

  const discountAmount = subtotal * (Number(discountPercent) / 100);
  const taxable = subtotal - discountAmount;
  const vatAmount = taxable * (Number(vatPercent) / 100);
  const grandTotal = taxable + vatAmount;

  const [saving, setSaving] = useState(false);

  // =============================
  // LOAD MATERIALS (for selector)
  // =============================
  useEffect(() => {
    const loadMaterials = async () => {
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
    loadMaterials();
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

    if (!qty || qty <= 0) return alert("Invalid quantity");
    if (price < 0) return alert("Invalid price");

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

  const addCustomItem = () => {
    const qty = Number(customQty);
    const price = Number(customPrice);

    if (!customName.trim()) return alert("Name required");
    if (qty <= 0) return alert("Invalid quantity");
    if (price < 0) return alert("Invalid price");

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
        const price = Number(field === "unit_price" ? value : updated.unit_price);
        updated.total_price = qty * price || 0;
        return updated;
      })
    );
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.local_id !== id));
  };

  // =============================
  // LOAD EXISTING QUOTATION
  // =============================
  useEffect(() => {
    const loadQuotation = async () => {
      try {
        const res = await api.get(`/api/quotations/${id}`);
        const q = res.data;

        // Customer info
        setCustomerInfo({
          customer_name: q.customer_name || "",
          phone: q.customer_phone || "",
          address: q.customer_address || "",
          project_type: q.quote_for || "",
          project_title: q.project_title || "",  // ⭐ ADDED
          notes: q.notes || "",
        });

        if (q.discount_percent != null) setDiscountPercent(q.discount_percent);
        if (q.vat_percent != null) setVatPercent(q.vat_percent);

        // Items → map DB fields to local fields
        const mappedItems =
          (q.items || []).map((it) => ({
            local_id: makeLocalId() + "_" + it.id,
            material_id: it.material_id,
            name: it.material_name,
            unit: it.material_unit,
            qty: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price,
            is_custom: it.material_id ? false : true,
          })) || [];

        setItems(mappedItems);
      } catch (err) {
        console.error("Failed to load quotation:", err);
        alert("Failed to load quotation for editing.");
      }
    };

    loadQuotation();
  }, [id]);

  // =============================
  // SAVE (UPDATE) QUOTATION
  // =============================
  const handleUpdateQuotation = async () => {
    if (!customerInfo.customer_name.trim()) {
      return alert("Customer name required");
    }
    if (!customerInfo.project_type.trim()) {
      return alert("Project type / quote_for is required");
    }
    if (items.length === 0) {
      return alert("Add at least one item.");
    }

    try {
      setSaving(true);

      const payload = {
        customer_name: customerInfo.customer_name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,

        quote_for: customerInfo.project_type,
        project_title: customerInfo.project_title,  // ⭐ ADDED

        notes: customerInfo.notes,

        subtotal,
        discount_percent: Number(discountPercent),
        discount_amount: discountAmount,
        vat_percent: Number(vatPercent),
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

      await api.put(`/api/quotations/${id}`, payload);

      alert("Quotation updated successfully.");
      navigate(`/quotations/view/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update quotation.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (!window.confirm("Clear all fields and items?")) return;
    setCustomerInfo({
      customer_name: "",
      phone: "",
      address: "",
      project_type: "",
      project_title: "",  // ⭐ ADDED
      notes: "",
    });
    setItems([]);
    setDiscountPercent(0);
    setVatPercent(0);
  };

  // =============================
  // RENDER
  // =============================
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Edit Quotation
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/quotations")}>
          Back to List
        </Button>
      </Stack>

      <Stack spacing={3}>
        {/* Customer Info */}
        <CustomerForm customerInfo={customerInfo} onChange={updateCustomerInfo} />

        {/* ⭐ PROJECT TITLE FIELD */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Project Title / Description
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="e.g. Installation of a 3kVA inverter with batteries for Mr. Sulaiman"
              value={customerInfo.project_title}
              onChange={(e) => updateCustomerInfo("project_title", e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>
                Quotation Items
              </Typography>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={openMaterialSelector}
                >
                  Add From Materials
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

            <ItemsTable items={items} onUpdate={updateItemField} onRemove={removeItem} />
          </CardContent>
        </Card>

        {/* Summary Card */}
        <SummaryCard
          subtotal={subtotal}
          discountPercent={discountPercent}
          vatPercent={vatPercent}
          discountAmount={discountAmount}
          vatAmount={vatAmount}
          grandTotal={grandTotal}
          setDiscountPercent={setDiscountPercent}
          setVatPercent={setVatPercent}
          onSave={handleUpdateQuotation}
          onPrint={() => navigate(`/quotations/print/${id}`)}
          onClear={handleClear}
          saving={saving}
        />
      </Stack>

      {/* Material Selector Modal */}
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

      {/* Custom Item Modal */}
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
  );
};

export default EditQuotationPage;
