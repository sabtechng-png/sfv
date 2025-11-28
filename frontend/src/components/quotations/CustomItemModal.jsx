import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";

const CustomItemModal = ({
  open,
  onClose,
  name,
  unit,
  qty,
  price,
  setName,
  setUnit,
  setQty,
  setPrice,
  onAdd,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Custom Item</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Item Name / Description"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                label="Unit"
                fullWidth
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="Qty"
                type="number"
                fullWidth
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="Unit Price"
                type="number"
                fullWidth
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onAdd}>
          Add Item
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomItemModal;
