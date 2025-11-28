import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Button,
  Divider,
  Stack,
} from "@mui/material";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const QuotationSettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  const loadSettings = async () => {
    try {
      const res = await api.get("/api/quotation-settings");
      setSettings(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load settings");
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await api.put("/api/quotation-settings", settings);
      alert("Settings updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const disabled = user.role !== "admin";

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Quotation & Invoice Settings
      </Typography>

      <Card elevation={2}>
        <CardContent>
          {/* ================= COMPANY INFORMATION ================= */}
          <Typography variant="h6" fontWeight={600} mb={1}>
            Company Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Name"
                fullWidth
                value={settings.company_name || ""}
                onChange={(e) => handleChange("company_name", e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Company Email"
                fullWidth
                value={settings.company_email || ""}
                onChange={(e) => handleChange("company_email", e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Company Phone"
                fullWidth
                value={settings.company_phone || ""}
                onChange={(e) => handleChange("company_phone", e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Company Website"
                fullWidth
                value={settings.company_website || ""}
                onChange={(e) => handleChange("company_website", e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Company Address"
                fullWidth
                multiline
                rows={2}
                value={settings.company_address || ""}
                onChange={(e) =>
                  handleChange("company_address", e.target.value)
                }
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Company RC Number"
                fullWidth
                value={settings.company_rc || ""}
                onChange={(e) => handleChange("company_rc", e.target.value)}
                disabled={disabled}
              />
            </Grid>
          </Grid>

          {/* ================= FINANCIAL DEFAULTS ================= */}
          <Typography variant="h6" fontWeight={600} mt={4} mb={1}>
            Financial Defaults
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Default VAT (%)"
                type="number"
                fullWidth
                value={settings.default_vat || ""}
                onChange={(e) => handleChange("default_vat", e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Default Discount (%)"
                type="number"
                fullWidth
                value={settings.default_discount || ""}
                onChange={(e) =>
                  handleChange("default_discount", e.target.value)
                }
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Footer Note (Quotation & Invoice)"
                fullWidth
                multiline
                rows={2}
                value={settings.footer_note || ""}
                onChange={(e) => handleChange("footer_note", e.target.value)}
                disabled={disabled}
              />
            </Grid>
          </Grid>

          {/* ================= BANK DETAILS ================= */}
          <Typography variant="h6" fontWeight={600} mt={4} mb={1}>
            Bank Details (Invoice)
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Bank Name"
                fullWidth
                value={settings.bank_name || ""}
                onChange={(e) => handleChange("bank_name", e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Account Name"
                fullWidth
                value={settings.bank_account_name || ""}
                onChange={(e) =>
                  handleChange("bank_account_name", e.target.value)
                }
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Account Number"
                fullWidth
                value={settings.bank_account_number || ""}
                onChange={(e) =>
                  handleChange("bank_account_number", e.target.value)
                }
                disabled={disabled}
              />
            </Grid>
          </Grid>

          {/* ================= DOCUMENT CONTENT ================= */}
          <Typography variant="h6" fontWeight={600} mt={4} mb={1}>
            Document Content
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Terms & Conditions"
                fullWidth
                multiline
                rows={4}
                value={settings.terms || ""}
                onChange={(e) => handleChange("terms", e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Payment Terms (Invoice)"
                fullWidth
                multiline
                rows={3}
                value={settings.payment_terms || ""}
                onChange={(e) =>
                  handleChange("payment_terms", e.target.value)
                }
                disabled={disabled}
              />
            </Grid>
          </Grid>

          {/* ================= PDF CUSTOMIZATION ================= */}
          <Typography variant="h6" fontWeight={600} mt={4} mb={1}>
            PDF Customization
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="PDF Watermark Text"
                fullWidth
                value={settings.watermark_text || ""}
                onChange={(e) =>
                  handleChange("watermark_text", e.target.value)
                }
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Signature Footer Text"
                fullWidth
                multiline
                rows={2}
                value={settings.signature_footer_text || ""}
                onChange={(e) =>
                  handleChange("signature_footer_text", e.target.value)
                }
                disabled={disabled}
              />
            </Grid>
          </Grid>

          {/* ================= SAVE BUTTON ================= */}
          <Stack direction="row" justifyContent="flex-end" mt={4}>
            <Button
              variant="contained"
              color="primary"
              onClick={saveSettings}
              disabled={disabled || loading}
            >
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuotationSettingsPage;
