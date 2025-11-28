import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const MaterialSelectorModal = ({
  open,
  onClose,
  materials,
  loading,
  error,
  filteredMaterials,
  search,
  onSearch,
  selectedMaterial,
  onSelectMaterial,
  qty,
  unit,
  unitPrice,
  setQty,
  setUnit,
  setUnitPrice,
  onAdd,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Select Material From Database</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Search materials"
            fullWidth
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ maxHeight: 300, overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="center">Select</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading...</TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No materials found.</TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((m) => (
                    <TableRow key={m.id} hover selected={selectedMaterial?.id === m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell>{m.unit}</TableCell>
                      <TableCell align="right">
                        {Number(m.unit_price || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant={
                            selectedMaterial?.id === m.id ? "contained" : "outlined"
                          }
                          size="small"
                          onClick={() => onSelectMaterial(m)}
                        >
                          {selectedMaterial?.id === m.id ? "Selected" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          {selectedMaterial && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Configure Selected Item
              </Typography>

              <Stack direction="row" spacing={2} mt={1}>
                <TextField
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  sx={{ width: 120 }}
                />

                <TextField
                  label="Qty"
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  sx={{ width: 120 }}
                />

                <TextField
                  label="Unit Price"
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  sx={{ width: 150 }}
                />
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" disabled={!selectedMaterial} onClick={onAdd}>
          Add to Quotation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaterialSelectorModal;
