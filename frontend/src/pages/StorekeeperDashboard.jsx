// ============================================================
// SFV Tech | Storekeeper Dashboard (Emerald / Lime Theme v3)
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Divider,
  Breadcrumbs,
  Grow,
  CircularProgress,
} from "@mui/material";
import {
  Dashboard,
  Inventory,
  Assignment,
  Receipt,
  Assessment,
  LocalShipping,
  Logout,
  Notifications,
  Mail,
  Menu as MenuIcon,
  Refresh,
  Inventory2,
  PendingActions,
  CheckCircleOutline,
  ReceiptLong,
  WarningAmber,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "notistack";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import logo from "../assets/logo.png";

export default function StorekeeperDashboard() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unread, setUnread] = useState(3);
  const [notif, setNotif] = useState(1);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening");
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/storekeeper/summary");
      const data =
        res.data && Object.keys(res.data).length
          ? res.data
          : {
              inventory: 120,
              requests: 8,
              dispatch: 32,
              audits: 4,
              expenses: 5,
              inventoryData: [
                { name: "Solar Cable (10mm)", stock: 4 },
                { name: "PVC Conduit 20mm", stock: 11 },
                { name: "MC4 Connector Set", stock: 7 },
                { name: "Fuse Holder 100A", stock: 3 },
                { name: "Earth Rod 2m", stock: 15 },
              ],
            };
      setSummary(data);
    } catch {
      enqueueSnackbar("Failed to load store data (showing sample)", { variant: "warning" });
      setSummary({
        inventory: 120,
        requests: 8,
        dispatch: 32,
        audits: 4,
        expenses: 5,
        inventoryData: [
          { name: "Solar Cable (10mm)", stock: 4 },
          { name: "PVC Conduit 20mm", stock: 11 },
          { name: "MC4 Connector Set", stock: 7 },
          { name: "Fuse Holder 100A", stock: 3 },
          { name: "Earth Rod 2m", stock: 15 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const breadcrumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => (
      <Typography
        key={i}
        color={i === arr.length - 1 ? "#c6ff00" : "#fff"}
        sx={{ cursor: "pointer", textTransform: "capitalize" }}
        onClick={() => navigate("/" + arr.slice(0, i + 1).join("/"))}
      >
        {seg}
      </Typography>
    ));

  const menuItems = [
    { text: "Dashboard", icon: <Dashboard />, path: "/store/dashboard" },
    { text: "Store", icon: <Inventory />, path: "/storekeeper/inventory" },
    { text: "Requests", icon: <Assignment />, path: "/storekeeper/requests" },
    { text: "Dispatch", icon: <LocalShipping />, path: "/storekeeper/dispatch" },
    { text: "Auditor Page", icon: <Assessment />, path: "/storekeeper/audit" },
    { text: "Expenses", icon: <Receipt />, path: "/storekeeper/expenses" },
	{ text: "Witness Page", icon: <Assignment />, path: "/storekeeper/witness" },

  ];

  const cards = summary
    ? [
        {
          title: "Materials in Store",
          value: summary.inventory,
          desc: "All items currently available in store.",
          gradient: "linear-gradient(135deg, #004d40, #26a69a)",
          icon: <Inventory2 sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/inventory",
        },
        {
          title: "Pending Requests",
          value: summary.requests,
          desc: "Requests awaiting approval or fulfillment.",
          gradient: "linear-gradient(135deg, #00796b, #43a047)",
          icon: <PendingActions sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/requests",
        },
        {
          title: "My Requests",
          value: summary.requests,
          desc: "Materials for myself",
          gradient: "linear-gradient(135deg, #1b5e20, #4caf50)",
          icon: <LocalShipping sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/material_request",
        },
        {
          title: "Auditor Page ",
          value: summary.audits,
          desc: "Store audit checks and reconciliations.",
          gradient: "linear-gradient(135deg, #33691e, #76ff03)",
          icon: <CheckCircleOutline sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/audit",
        },
        {
          title: "Manage Expenses",
          value: summary.expenses,
          desc: "Shared expense management section.",
          gradient: "linear-gradient(135deg, #2e7d32, #aeea00)",
          icon: <ReceiptLong sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/expenses",
        },
		
		 {
          title: "Material Collected from JK",
          value: summary.expenses,
          desc: "Materials collected from JK or Other shops",
          gradient: "linear-gradient(135deg, #2e7d32, #aeea00)",
          icon: <ReceiptLong sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/collections",
        },
      ]
    : [];

  return (
    <Box sx={{ minHeight: "100vh", background: "#001f1f", color: "#fff" }}>
      {/* ======= TOP BAR ======= */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(90deg, #003c3c, #009688)",
          py: 1.5,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: "#c6ff00" }}>
            <MenuIcon />
          </IconButton>
          <img src={logo} alt="SFV" style={{ height: 32, borderRadius: 4 }} />
          <Typography fontWeight={700} variant="h6" color="#c6ff00">
            SFV Storekeeper Portal
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Tooltip title="Messages">
            <IconButton sx={{ color: "#c6ff00" }}>
              <Badge badgeContent={unread} color="error">
                <Mail />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton sx={{ color: "#c6ff00" }}>
              <Badge badgeContent={notif} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh">
            <IconButton sx={{ color: "#c6ff00" }} onClick={fetchSummary}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Avatar sx={{ bgcolor: "#c6ff00", color: "#003c3c", fontWeight: 700 }}>
            {user?.name?.charAt(0) || "S"}
          </Avatar>
        </Box>
      </Box>

      {/* ======= SIDE DRAWER ======= */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250, background: "#003c3c", height: "100%" }}>
          <Box sx={{ p: 2, textAlign: "center", borderBottom: "1px solid #00796b" }}>
            <Typography variant="h6" fontWeight={700} color="#c6ff00">
              Store Menu
            </Typography>
          </Box>
          <List>
            {menuItems.map((item) => (
              <ListItem disablePadding key={item.text}>
                <ListItemButton onClick={() => navigate(item.path)}>
                  <ListItemIcon sx={{ color: "#c6ff00" }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} sx={{ color: "#fff" }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ borderColor: "#004d40" }} />
          <ListItemButton onClick={() => navigate("/")}>
            <ListItemIcon sx={{ color: "#c6ff00" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" sx={{ color: "#fff" }} />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* ======= BREADCRUMBS + GREETING ======= */}
      <Box sx={{ px: 4, pt: 2 }}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
        <Typography variant="h5" fontWeight={700} mt={2}>
          {`${greeting}, ${user?.name || "Storekeeper"}`} 👋
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Typography>
      </Box>

      {/* ======= KPI CARDS ======= */}
      <Box sx={{ p: 4 }}>
        {loading ? (
          <Box sx={{ textAlign: "center", mt: 8 }}>
            <CircularProgress color="success" />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {cards.map((card, i) => (
              <Grow in timeout={400 + i * 150} key={i}>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                  <Card
                    sx={{
                      background: card.gradient,
                      borderRadius: 3,
                      color: "#fff",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                      transition: "transform 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-6px)",
                        boxShadow: "0 12px 25px rgba(0,0,0,0.6)",
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        {card.icon}
                        <Typography variant="h6" fontWeight={700}>
                          {card.title}
                        </Typography>
                      </Box>
                      <Typography variant="h3" fontWeight={800} color="#c6ff00" mt={1}>
                        {card.value || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
                        {card.desc}
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: "#c6ff00",
                          color: "#003c3c",
                          fontWeight: 700,
                          "&:hover": { backgroundColor: "#d7ff33" },
                        }}
                        onClick={() => navigate(card.link)}
                      >
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grow>
            ))}
          </Grid>
        )}
      </Box>

      {/* ======= LOW STOCK ALERT WIDGET ======= */}
      {summary && summary.inventoryData && (
        <Box sx={{ px: 4, mt: 1 }}>
          <Typography variant="h6" fontWeight={700} mb={1} color="#c6ff00">
            ⚠️ Low Stock Alerts
          </Typography>
          <Box
            sx={{
              background: "linear-gradient(90deg, #004d40, #00796b)",
              borderRadius: 3,
              p: 2,
              boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
            }}
          >
            {summary.inventoryData.filter((i) => i.stock < 10).length === 0 ? (
              <Typography variant="body2" color="#c6ff00" textAlign="center">
                ✅ All items sufficiently stocked.
              </Typography>
            ) : (
              summary.inventoryData
                .filter((i) => i.stock < 10)
                .map((i, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1,
                      px: 2,
                      mb: 1,
                      borderRadius: 2,
                      background:
                        i.stock < 5
                          ? "rgba(255, 0, 0, 0.25)"
                          : "rgba(255, 235, 59, 0.25)",
                      animation: "pulse 1.5s infinite",
                      "@keyframes pulse": {
                        "0%": { opacity: 0.7 },
                        "50%": { opacity: 1 },
                        "100%": { opacity: 0.7 },
                      },
                    }}
                  >
                    <Typography variant="body1" fontWeight={600}>
                      {i.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <WarningAmber sx={{ color: i.stock < 5 ? "red" : "#ffeb3b" }} />
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: i.stock < 5 ? "red" : "#ffeb3b" }}
                      >
                        {i.stock} left
                      </Typography>
                    </Box>
                  </Box>
                ))
            )}
            <Button
              size="small"
              variant="contained"
              onClick={() => navigate("/store/inventory")}
              sx={{
                mt: 1,
                backgroundColor: "#c6ff00",
                color: "#003c3c",
                fontWeight: 700,
                "&:hover": { backgroundColor: "#d7ff33" },
              }}
            >
              View Inventory
            </Button>
          </Box>
        </Box>
      )}

      {/* ======= FOOTER ======= */}
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          mt: 4,
          borderTop: "1px solid #004d40",
          background: "#002f2f",
          fontSize: 14,
          color: "#c6ff00",
        }}
      >
        © {new Date().getFullYear()} SFV Tech. All Rights Reserved.
        <br />
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          v3.0.0 — Auto-updating inventory monitor active
        </Typography>
      </Box>
    </Box>
  );
}
