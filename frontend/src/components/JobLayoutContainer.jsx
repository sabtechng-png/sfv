// src/components/JobLayoutContainer.jsx
import React from "react";
import { Box } from "@mui/material";

export default function JobLayoutContainer({ palette, children }) {
  return (
    <Box
      sx={{
        background: palette.bg,
        minHeight: "100vh",
        p: { xs: 2, md: 3 },
        transition: "background 0.3s ease",
      }}
    >
      {children}
    </Box>
  );
}
