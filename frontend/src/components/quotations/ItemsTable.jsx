import React from "react";
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const ItemsTable = ({ items, onUpdate, onRemove }) => {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>#</TableCell>
          <TableCell>Item</TableCell>
          <TableCell>Unit</TableCell>
          <TableCell align="right">Qty</TableCell>
          <TableCell align="right">Unit Price</TableCell>
          <TableCell align="right">Total</TableCell>
          <TableCell align="center">Action</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {items.map((it, idx) => (
          <TableRow key={it.local_id}>
            <TableCell>{idx + 1}</TableCell>

            <TableCell>
              <TextField
                variant="standard"
                fullWidth
                value={it.name}
                onChange={(e) => onUpdate(it.local_id, "name", e.target.value)}
              />
            </TableCell>

            <TableCell width={90}>
              <TextField
                variant="standard"
                fullWidth
                value={it.unit}
                onChange={(e) => onUpdate(it.local_id, "unit", e.target.value)}
              />
            </TableCell>

            <TableCell align="right" width={100}>
              <TextField
                variant="standard"
                type="number"
                value={it.qty}
                onChange={(e) => onUpdate(it.local_id, "qty", e.target.value)}
              />
            </TableCell>

            <TableCell align="right" width={130}>
              <TextField
                variant="standard"
                type="number"
                value={it.unit_price}
                onChange={(e) => onUpdate(it.local_id, "unit_price", e.target.value)}
              />
            </TableCell>

            <TableCell align="right" width={130}>
              {Number(it.total_price || 0).toLocaleString()}
            </TableCell>

            <TableCell align="center" width={80}>
              <IconButton color="error" onClick={() => onRemove(it.local_id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ItemsTable;
