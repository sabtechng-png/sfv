import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  Divider,
  Chip,
} from "@mui/material";

import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

import { generateQuotationPDF } from "../../components/pdf/GenerateQuotationPDF";
import { generateInvoicePDF } from "../../components/pdf/GenerateInvoicePDF";
import { generateConsentFormPDF } from "../../components/pdf/GenerateConsentFormPDF";


import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const QuotationViewPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  /** ============================
   * LOAD SETTINGS + QUOTATION
   * ============================ */
  const loadData = async () => {
    try {
      setLoading(true);

      // Load quotation
      const res1 = await api.get(`/api/quotations/${id}`);
      setQuotation(res1.data);

      // Load settings
      const res2 = await api.get("/api/quotation-settings");
      setSettings(res2.data);

    } catch (err) {
      console.error("Error loading data:", err);
      alert("Failed to load quotation or settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  /** ============================
   * APPROVE QUOTATION
   * ============================ */
  const approveQuotation = async () => {
    if (!window.confirm("Approve this quotation?")) return;

    try {
      await api.put(`/api/quotations/${id}/approve`);
      alert("Quotation Approved!");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to approve quotation.");
    }
  };

  if (loading || !quotation || !settings) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading quotation...</Typography>
      </Box>
    );
  }

  const canEdit =
    user.role === "admin" || user.email === quotation.created_by;

  const canApprove = user.role === "admin";

  /** ============================
   * RENDER
   * ============================ */
  return (
    <Box sx={{ p: 3 }}>
      {/* PAGE HEADER */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" fontWeight={700}>
          Quotation Details
        </Typography>

        <Stack direction="row" spacing={2}>
          {/* BACK BUTTON */}
         <Button
  variant="outlined"
  startIcon={<ArrowBackIcon />}
  onClick={() => navigate(-1)}
>
  Back
</Button>


          {/* DOWNLOAD QUOTATION PDF */}
          <Button
            variant="contained"
            color="secondary"
            onClick={() => generateQuotationPDF(quotation, settings)}
          >
            Download PDF
          </Button>
<Button
  variant="contained"
  color="primary"
  onClick={() => generateConsentFormPDF(quotation, settings)}
>
  Download Consent Form
</Button>

          {/* INVOICE BUTTON (only if approved) */}
          {quotation.status === "Approved" && (
            <Button
              variant="contained"
              color="success"
              onClick={() => generateInvoicePDF(quotation, settings)}
            >
              Download Invoice
            </Button>
          )}

          {/* EDIT BUTTON */}
          {canEdit && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<EditIcon />}
             onClick={() => {
  let path = "/";

  if (user.role === "admin") {
    path = `/admin/quotations/edit/${quotation.id}`;
  } else if (user.role === "engineer") {
    path = `/engineer/quotations/edit/${quotation.id}`;
  } else if (user.role === "staff") {
    path = `/staff/quotations/edit/${quotation.id}`;
  }

  navigate(path);
}}

            >
              Edit
            </Button>
          )}

          {/* APPROVE BUTTON */}
          {canApprove && quotation.status !== "Approved" && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={approveQuotation}
            >
              Approve
            </Button>
          )}
        </Stack>
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* QUOTATION SUMMARY CARD */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between">
            {/* CUSTOMER SIDE */}
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {quotation.customer_name}
              </Typography>

              <Typography>
                <b>Address:</b> {quotation.customer_address || "—"}
              </Typography>

              <Typography>
                <b>Phone:</b> {quotation.customer_phone || "—"}
              </Typography>
            </Box>

            {/* PROJECT INFO SIDE */}
            <Box textAlign="right">
              <Typography>
                <b>Ref No:</b> {quotation.ref_no}
              </Typography>

              <Typography>
                <b>Date:</b>{" "}
                {new Date(quotation.created_at).toLocaleDateString()}
              </Typography>

              <Typography>
                <b>Project:</b> {quotation.quote_for || "—"}
              </Typography>

              <Chip
                label={quotation.status}
                color={quotation.status === "Approved" ? "success" : "warning"}
                sx={{ mt: 1 }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* ITEMS TABLE */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Items Summary
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><b>#</b></TableCell>
                  <TableCell><b>Item</b></TableCell>
                  <TableCell><b>Qty</b></TableCell>
                  <TableCell><b>Unit Price (₦)</b></TableCell>
                  <TableCell><b>Total (₦)</b></TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {quotation.items?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.material_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      ₦{Number(item.unit_price).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      ₦{Number(item.total_price).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* FINANCE SUMMARY */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Financial Summary
          </Typography>

          <Stack spacing={1}>
            <Typography>
              <b>Discount:</b> {quotation.discount_percent}% —
              ₦{Number(quotation.discount_amount).toLocaleString()}
            </Typography>

            <Typography>
              <b>VAT:</b> {quotation.vat_percent}% —
              ₦{Number(quotation.vat_amount).toLocaleString()}
            </Typography>

            <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
              Grand Total:
              <span style={{ color: "#0A7E35", marginLeft: 5 }}>
                ₦{Number(quotation.total).toLocaleString()}
              </span>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuotationViewPage;
