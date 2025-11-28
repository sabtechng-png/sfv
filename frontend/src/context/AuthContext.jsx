// =============================================================
// SFV Tech – Global Auth Context (with JWT Expiry + Role Redirect)
// =============================================================
import React, { createContext, useState, useEffect, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------
  // Logout Function
  // ----------------------------------------------
  const handleLogout = (redirect = true) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    if (redirect) navigate("/");
  };

  // ----------------------------------------------
  // Initialize from LocalStorage on Mount
  // ----------------------------------------------
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        const decoded = jwtDecode(storedToken);
        const now = Math.floor(Date.now() / 1000);

        if (decoded.exp && decoded.exp > now) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } else {
          console.warn("🔒 Token expired – auto logout triggered");
          handleLogout(false);
        }
      } catch (err) {
        console.error("❌ Token decode error:", err);
        handleLogout(false);
      }
    }
    setLoading(false);
  }, []);

  // ----------------------------------------------
  // Login Function
  // ----------------------------------------------
  const handleLogin = (userData, jwtToken) => {
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setToken(jwtToken);

    // 🚀 Role-based Redirect Map
    const redirectMap = {
      admin: "/admin/dashboard",
      engineer: "/engineer/dashboard",
      staff: "/staff/dashboard",
      storekeeper: "/store/dashboard",
      apprentice: "/apprentice/dashboard",
    };

    const role = userData.role?.toLowerCase();
    navigate(redirectMap[role] || "/");
  };

  // ----------------------------------------------
  // Context Value
  // ----------------------------------------------
  const value = {
    user,
    token,
    loading,
    login: handleLogin,
    logout: handleLogout,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
