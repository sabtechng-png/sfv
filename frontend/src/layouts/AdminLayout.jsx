// ===========================================================
// SFV Tech | Admin Layout (Professional Graphite-Teal Theme)
// ===========================================================

import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Provides a high-contrast, modern executive theme for Admin pages.
 * Neutral graphite background with teal accents, light panels for readability.
 */
export default function AdminLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #0d1117 0%, #1b1f24 100%)", // modern graphite
        color: "#e6f1ef", // soft light text
        fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      <Outlet />
    </div>
  );
}
