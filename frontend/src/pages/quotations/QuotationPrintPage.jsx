import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Stack,
  CircularProgress,
  Paper,
} from "@mui/material";

import { useParams } from "react-router-dom";
import api from "../../utils/api";

const QuotationPrintPage = () => {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // LOAD QUOTATION
  // -----------------------------
  const loadQuotation = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/quotations/${id}`);
      setQuotation(res.data);

      // Auto Print after short delay
      setTimeout(() => {
        window.print();
      }, 800);
    } catch (err) {
      console.error("Failed to load quotation for printing:", err);
      alert("Could not load quotation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotation();
  }, [id]);

  if (loading || !quotation) {
    return (
      <Box sx={{ p: 5, textAlign: "center" }}>
        <CircularProgress />
        <Typography mt={2}>Preparing printable quotation…</Typography>
      </Box>
    );
  }

  const {
    customer_name,
    customer_address,
    customer_phone,
    customer_email,
    quote_for,
    ref_no,
    created_at,
    items,
    discount_percent,
    discount_amount,
    vat_percent,
    vat_amount,
    total,
  } = quotation;

  return (
    <Box sx={{ p: 5, fontFamily: "Arial, sans-serif" }}>
      {/* PRINT CSS */}
      <style>
        {`
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}
      </style>

      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={700}>
            SFV TECHNOLOGY
          </Typography>
          <Typography fontSize="14px">Ilorin, Kwara State, Nigeria</Typography>
          <Typography fontSize="14px">Phone: +234-803-xxx-xxxx</Typography>
          <Typography fontSize="14px">Email: sfvtech@gmail.com</Typography>
        </Box>

        <Box textAlign="right">
          <Typography variant="h5" fontWeight={700}>
            QUOTATION
          </Typography>
          <Typography>
            <b>Ref No:</b> {ref_no}
          </Typography>
          <Typography>
            <b>Date:</b> {new Date(created_at).toLocaleDateString()}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* CUSTOMER DETAILS */}
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Customer Information
        </Typography>

        <Typography>
          <b>Name:</b> {customer_name}
        </Typography>
        <Typography>
          <b>Address:</b> {customer_address || "—"}
        </Typography>
        <Typography>
          <b>Phone:</b> {customer_phone || "—"}
        </Typography>
        <Typography>
          <b>Email:</b> {customer_email || "—"}
        </Typography>

        <Typography mt={2}>
          <b>Project:</b> {quote_for || "—"}
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* ITEMS TABLE */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Items Breakdown
      </Typography>

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><b>#</b></TableCell>
              <TableCell><b>Description</b></TableCell>
              <TableCell><b>Unit</b></TableCell>
              <TableCell><b>Qty</b></TableCell>
              <TableCell><b>Unit Price (₦)</b></TableCell>
              <TableCell><b>Total (₦)</b></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items?.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.unit}</TableCell>
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

      {/* FINANCIAL SUMMARY */}
      <Box sx={{ mt: 4, width: "350px", ml: "auto" }}>
        <Typography variant="h6" fontWeight={700}>
          Financial Summary
        </Typography>

        <Stack direction="row" justifyContent="space-between" mt={1}>
          <Typography>Subtotal:</Typography>
          <Typography>
            ₦
            {Number(total - vat_amount - discount_amount).toLocaleString()}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" mt={1}>
          <Typography>Discount ({discount_percent}%):</Typography>
          <Typography>-₦{Number(discount_amount).toLocaleString()}</Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" mt={1}>
          <Typography>VAT ({vat_percent}%):</Typography>
          <Typography>₦{Number(vat_amount).toLocaleString()}</Typography>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>
            GRAND TOTAL:
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            ₦{Number(total).toLocaleString()}
          </Typography>
        </Stack>
      </Box>

      {/* SIGNATURE */}
      <Box sx={{ mt: 8 }}>
        <Typography><b>Prepared By:</b> ______________________</Typography>
        <Typography mt={4}><b>Authorized Signature:</b> ______________________</Typography>
      </Box>

      {/* FOOTER */}
      <Box sx={{ mt: 6, textAlign: "center", fontSize: "13px" }}>
        <Divider sx={{ mb: 1 }} />
        <Typography>
          Thank you for choosing <b>SFV Technology</b>. We appreciate your trust.
        </Typography>
      </Box>
    </Box>
  );
};

export default QuotationPrintPage;
