import React from "react";
import {
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Stack, Tooltip, IconButton
} from "@mui/material";
import { Visibility, Edit, Delete, Replay } from "@mui/icons-material";

export default function PendingFlaggedTable({
  rows = [],
  theme,
  statusToChip,
  fmtDate,
  onView,
  onEdit,
  onDelete,
  onReturn,
  role,         // "admin" | others
  userEmail,    // logged-in email (myEmail)
}) {
  // Show only my records for non-admin; admins see all
const visibleRows = rows.filter((r) =>
  ["pending", "flagged"].includes((r.status || "").toLowerCase()) &&
  (role === "admin" || (r.collector_email || "").toLowerCase() === (userEmail || "").toLowerCase())
);

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {/* User column only for admin */}
            {role === "admin" && (
              <TableCell sx={{ fontWeight: 800, color: theme.accentDark }}>User</TableCell>
            )}
            {["Vendor", "Material", "Qty", "Returned", "Remaining", "Returned %", "Status", "Date", "Actions"].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 800, color: theme.accentDark }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {visibleRows.map((r) => (
            <TableRow
              key={r.id}
              hover
              sx={{
                cursor: "pointer",
                borderLeft: `6px solid ${
                  r.status?.toLowerCase() === "verified" ? "#2e7d32" :
                  r.status?.toLowerCase() === "flagged" ? "#c62828" :
                  r.status?.toLowerCase() === "pending" ? "#f9a825" :
                  "#e0e0e0"
                }`
              }}
              onClick={() => onReturn(r)}
            >
              {/* User column only for admin */}
              {role === "admin" && <TableCell>{r.collector_email}</TableCell>}

              <TableCell>{r.vendor_name}</TableCell>
              <TableCell>{r.material_name}</TableCell>
              <TableCell>{r.quantity}</TableCell>
              <TableCell>{r.returned_quantity || 0}</TableCell>
              <TableCell>{r.total_after_return}</TableCell>
              <TableCell>{r.returned_percent}%</TableCell>

              <TableCell>
                <span
                  className={`MuiChip-root MuiChip-color${statusToChip(r.status)}`}
                  style={{ fontWeight: 600 }}
                >
                  {(r.status || "").toUpperCase()}
                </span>
              </TableCell>

              <TableCell>{fmtDate(r.collection_date)}</TableCell>

              <TableCell onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="View"><IconButton onClick={() => onView(r)}><Visibility /></IconButton></Tooltip>
                  <Tooltip title="Edit"><IconButton onClick={() => onEdit(r)}><Edit /></IconButton></Tooltip>

                  {/* Delete only for admin */}
                  {role === "admin" && (
                    <Tooltip title="Delete">
                      <IconButton onClick={() => onDelete(r.id)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Return always visible */}
                  <Tooltip title="Return Some / All"><IconButton onClick={() => onReturn(r)}><Replay /></IconButton></Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}

          {visibleRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={role === "admin" ? 10 : 9} align="center" sx={{ py: 4 }}>
                No matching records
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
