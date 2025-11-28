// ==========================================================
// JobLayoutContainer.jsx
// Shared layout for all Job module pages (Register, Manage, Detail)
// Handles role-based theme, header title, export buttons, etc.
// ==========================================================

import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Chip,
  Box,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useNavigate } from "react-router-dom";

const ROLE_PALETTES = {
  admin: {
    primary: "#263238", // dark grey/navy
    accent: "#26A69A", // teal
    chipText: "#fff",
    exportBg: "#26A69A",
    exportText: "#fff",
  },
  engineer: {
    primary: "#003366", // deep blue
    accent: "#FFD700", // gold
    chipText: "#000",
    exportBg: "#003366",
    exportText: "#FFD700",
  },
};

export default function JobLayoutContainer({
  title = "Job Page",
  role = "engineer",
  children,
  showExports = false,
  onExportCSV,
  onExportPDF,
}) {
  const navigate = useNavigate();
  const palette =
    ROLE_PALETTES[String(role).toLowerCase()] || ROLE_PALETTES.engineer;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F5F7FA", display: "flex", flexDirection: "column" }}>
      {/* Header Bar */}
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: palette.primary }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>

          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.5 }}
          >
            {title}
          </Typography>

          {/* ===== EXPORT BUTTONS (optional) ===== */}
          {showExports && (
            <>
              {onExportCSV && (
                <Tooltip title="Export CSV (filtered)">
                  <IconButton
                    onClick={onExportCSV}
                    sx={{
                      bgcolor: palette.exportBg,
                      color: palette.exportText,
                      ml: 1,
                      "&:hover": { opacity: 0.85 },
                    }}
                  >
                    <FileDownloadIcon />
                  </IconButton>
                </Tooltip>
              )}

              {onExportPDF && (
                <Tooltip title="Export PDF (filtered)">
                  <IconButton
                    onClick={onExportPDF}
                    sx={{
                      bgcolor: palette.exportBg,
                      color: palette.exportText,
                      ml: 1,
                      "&:hover": { opacity: 0.85 },
                    }}
                  >
                    <PictureAsPdfIcon />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}

          {/* ===== ROLE BADGE ===== */}
          <Chip
            label={String(role).toUpperCase()}
            size="small"
            sx={{
              ml: 1,
              bgcolor: palette.accent,
              color: palette.chipText,
              fontWeight: 800,
            }}
          />
        </Toolbar>
      </AppBar>

      {/* ===== PAGE CONTENT ===== */}
      <Box sx={{ flex: 1, p: 2 }}>{children}</Box>
    </Box>
  );
}
