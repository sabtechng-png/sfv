// ===========================================================
// SFV Tech | Storekeeper Layout (Emerald Theme Wrapper)
// ===========================================================

import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Minimal layout for storekeeper routes.
 * Prevents duplication of topbar/sidebar — handled in StorekeeperDashboard.
 */
export default function StorekeeperLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#001f1f", // deep emerald
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* All storekeeper pages (dashboard, inventory, etc.) will render here */}
      <Outlet />
    </div>
  );
}
