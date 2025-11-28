// =============================================================
// SFV Tech – PrivateRoute for Role-Based Protected Routes
// =============================================================
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ allowedRoles }) => {
  const { user, token, loading } = useAuth();

  // ⏳ Wait until AuthContext finishes loading
  if (loading) return null;

  // 🚫 Not logged in
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 🧩 Role-based restriction
  const role = user?.role?.toLowerCase();
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  // ✅ Authorized → render nested route
  return <Outlet />;
};

export default PrivateRoute;
