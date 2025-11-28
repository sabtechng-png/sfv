// ===============================================================
// SFV Tech | Unified Multi-Role Login (Admin / Engineer / Staff / Others)
// ===============================================================
import React, { useState } from "react";
import {
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Box,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import api from "../utils/api"; // ✅ Ensure baseURL points to backend (http://localhost:4000)
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // Handle Login Submission
  // ==========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🔹 Sending login request to /api/auth/login...");
      const res = await api.post("/api/auth/login", { email, password });
      console.log("✅ Login response:", res.data);

      const { token, user } = res.data;

      if (token && user) {
        // ✅ AuthContext handles role-based redirect automatically
        login(user, token);
      } else {
        console.warn("⚠️ Unexpected server response:", res.data);
        setError("Invalid server response. Please try again.");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Login failed. Please check your credentials or server connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Render
  // ==========================================================
  return (
    <Container
      maxWidth="xs"
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(180deg, #001f3f 0%, #0b1a33 50%, #13294b 100%)",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          width: "100%",
          textAlign: "center",
          background:
            "linear-gradient(180deg,#0b1a33 0%,#0f274a 60%,#13294b 100%)",
          color: "#fff",
        }}
      >
        {/* ===== Logo + Header ===== */}
        <Box sx={{ mb: 2 }}>
          <img
            src={logo}
            alt="SFV Tech Logo"
            style={{
              height: 60,
              marginBottom: 8,
              borderRadius: "8px",
              backgroundColor: "#fff",
              padding: 4,
            }}
          />
          <Typography variant="h5" fontWeight={700}>
            SFV Tech Portal Login
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Sign in to continue
          </Typography>
        </Box>

        {/* ===== Login Form ===== */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            variant="filled"
            margin="dense"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              backgroundColor: "#fff",
              borderRadius: 1,
              input: { color: "#000" },
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            variant="filled"
            margin="dense"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    sx={{ color: "#0b1a33" }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              backgroundColor: "#fff",
              borderRadius: 1,
              mt: 2,
              input: { color: "#000" },
            }}
          />

          {/* ===== Error Message ===== */}
          {error && (
            <Typography
              color="error"
              variant="body2"
              sx={{ mt: 1, textAlign: "left" }}
            >
              ⚠️ {error}
            </Typography>
          )}

          {/* ===== Submit Button ===== */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 3,
              py: 1.2,
              fontWeight: 700,
              backgroundColor: "#f5c400",
              color: "#0b1a33",
              fontSize: "1rem",
              "&:hover": { backgroundColor: "#ffd633" },
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>

        {/* ===== Footer ===== */}
        <Typography
          variant="caption"
          sx={{ mt: 3, display: "block", opacity: 0.6 }}
        >
          © {new Date().getFullYear()} SFV Tech. All Rights Reserved.
        </Typography>
      </Paper>
    </Container>
  );
}
