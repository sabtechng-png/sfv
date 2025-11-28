import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import PrintIcon from "@mui/icons-material/Print";

const SummaryCard = ({
  subtotal,
  discountPercent,
  vatPercent,
  discountAmount,
  vatAmount,
  grandTotal,
  setDiscountPercent,
  setVatPercent,
  onClear,
  onSave,
  onPrint,
  saving,
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Financial Summary
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Discount (%)"
              type="number"
              fullWidth
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
            <Typography variant="caption">
              Discount: ₦{discountAmount.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="VAT (%)"
              type="number"
              fullWidth
              value={vatPercent}
              onChange={(e) => setVatPercent(e.target.value)}
            />
            <Typography variant="caption">
              VAT: ₦{vatAmount.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="body2">Grand Total</Typography>
              <Typography variant="h6" fontWeight={700}>
                ₦ {grandTotal.toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="flex-end"
        >
          <Button onClick={onClear} variant="outlined" color="inherit">
            Clear All
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Quotation"}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<PrintIcon />}
            onClick={onPrint}
          >
            Print
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
