// src/layouts/EngineerLayout.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import ErrorBoundary from "../components/ErrorBoundary";
import EngineerDashboard from "../pages/EngineerDashboard";

export default function EngineerLayout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/engineer/dashboard";

  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={3000} // 🕒 Auto-dismiss after 3 seconds
      preventDuplicate
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      TransitionProps={{
        direction: "left", // slide-in direction
      }}
      style={{
        zIndex: 1500,
      }}
    >
      <ErrorBoundary>
        {isDashboard ? <EngineerDashboard /> : <Outlet />}
      </ErrorBoundary>
    </SnackbarProvider>
  );
}
