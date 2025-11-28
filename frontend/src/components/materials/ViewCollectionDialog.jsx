// ======================================================================
// ViewCollectionDialog.jsx
// ======================================================================

import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Divider, Grid, Box, Button,
} from "@mui/material";

const fmtDate = (d) => new Date(d).toLocaleString();

/**
 * ViewCollectionDialog
 * @param {boolean} open - Controls visibility
 * @param {object|null} record - The record to view
 * @param {array} returns - Array of all return records
 * @param {function} onClose - Close handler
 * @param {object} theme - Theme colors from parent
 */
export default function ViewCollectionDialog({ open, record, returns = [], onClose, theme }) {
  if (!record) return null;

  const recordReturns = returns.filter((r) => r.parent_id === record.id);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Material Collection Details</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {[
            ["Collector", record.collector_email],
            ["Role", record.collector_role],
            ["Vendor", record.vendor_name],
            ["Material", record.material_name],
            ["Quantity Collected", record.quantity],
            ["Returned", record.returned_quantity || 0],
            [
              "Remaining",
              record.total_after_return ??
                (Number(record.quantity || 0) - Number(record.returned_quantity || 0)),
            ],
            ["Returned %", `${record.returned_percent || 0}%`],
            ["Project", record.project_name || "—"],
            ["Purpose", record.purpose || "—"],
            ["Status", record.status || "—"],
            ["Verified By", record.verified_by || "—"],
            ["Collection Date", fmtDate(record.collection_date)],
          ].map(([label, value]) => (
            <Grid item xs={12} sm={6} key={label}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {label}
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {String(value)}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Return History
        </Typography>

        {recordReturns.length > 0 ? (
          recordReturns.map((r) => (
            <Box key={r.id} sx={{ mb: 1, p: 1, border: `1px solid ${theme.border}`, borderRadius: 1 }}>
              <Typography variant="body2">
                {fmtDate(r.created_at)} — Returned{" "}
                <b>{r.qty}</b> by {r.actor_email}
              </Typography>
              {r.note && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Note: {r.note}
                </Typography>
              )}
            </Box>
          ))
        ) : (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            No return history recorded.
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: theme.accentDark }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
