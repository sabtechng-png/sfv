// ===========================================================
// SFV Tech | Staff Layout (Clean, Themed, Minimal Wrapper)
// ===========================================================

import React from "react";
import { Outlet } from "react-router-dom";

/**
 * This layout simply wraps all staff pages (Dashboard, Expenses, etc.)
 * It does NOT render any extra header, sidebar, or React logo.
 * All visual UI is handled directly inside StaffDashboard.jsx or subpages.
 */

export default function StaffLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#2c0a0a", // Burgundy theme background
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* All staff subpages (dashboard, expenses, etc.) render here */}
      <Outlet />
    </div>
  );
}
