// ======================================================================
// AddCollectionDialog.jsx  ✅ Updated to support external form component
// ======================================================================

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Stack
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Props:
 *  - open (bool)
 *  - onClose()
 *  - onSubmit(payload)
 *  - theme
 *  - renderForm({ theme, onSubmit, onCancel })  <-- injected form renderer
 */
export default function AddCollectionDialog({
  open,
  onClose,
  onSubmit,
  theme,
  renderForm
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        New Material Collection
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {renderForm ? (
          renderForm({
            theme,
            onSubmit,
            onCancel: onClose
          })
        ) : (
          <Stack alignItems="center" sx={{ p: 4, opacity: 0.6 }}>
            ⚠️ No form provided!
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
