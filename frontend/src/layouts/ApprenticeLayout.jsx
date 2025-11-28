// ===========================================================
// SFV Tech | Apprentice Layout (Royal Blue Theme Wrapper)
// ===========================================================

import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Provides a consistent blue-silver theme background for
 * all apprentice pages (dashboard, expenses, training, etc.)
 * No duplicate nav — visuals handled in individual pages.
 */
export default function ApprenticeLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#001a33",
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Outlet />
    </div>
  );
}
