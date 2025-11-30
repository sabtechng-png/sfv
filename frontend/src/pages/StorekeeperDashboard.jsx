// =======================================================================
// SFV Tech | Storekeeper Dashboard (Emerald / Lime Theme v3 - Responsive)
// =======================================================================

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
  useMediaQuery,
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

  const isMobile = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unread, setUnread] = useState(3);
  const [notif, setNotif] = useState(1);
  const [greeting, setGreeting] = useState("");

  // Greeting
  useEffect(() => {
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening");
  }, []);

  // Summary fetch
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
      enqueueSnackbar("Failed to load store data (showing sample)", {
        variant: "warning",
      });

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
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const breadcrumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => (
      <Typography
        key={i}
        color={i === arr.length - 1 ? "#c6ff00" : "#fff"}
        sx={{
          cursor: "pointer",
          textTransform: "capitalize",
          fontSize: isMobile ? 12 : 14,
        }}
        onClick={() => navigate("/" + arr.slice(0, i + 1).join("/"))}
      >
        {seg}
      </Typography>
    ));

  const menuItems = [
    { text: "Dashboard", icon: <Dashboard />, path: "/store/dashboard" },
    { text: "Store", icon: <Inventory />, path: "/storekeeper/inventory" },
    { text: "Requests", icon: <Assignment />, path: "/storekeeper/requests" },
    { text: "Auditor Page", icon: <Assessment />, path: "/storekeeper/audit" },
    { text: "Expenses", icon: <Receipt />, path: "/storekeeper/expenses" },
    { text: "Witness Page", icon: <Assignment />, path: "/storekeeper/witness" },
  ];

  const cards = summary
    ? [
        {
          title: "Materials in Store",
          desc: "All items currently available.",
          gradient: "linear-gradient(135deg, #004d40, #26a69a)",
          icon: <Inventory2 sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/inventory",
        },
        {
          title: "Pending Requests",
         
          desc: "Requests awaiting processing.",
          gradient: "linear-gradient(135deg, #00796b, #43a047)",
          icon: <PendingActions sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/requests",
        },
        {
          title: "My Requests",
          desc: "Request material personally.",
          gradient: "linear-gradient(135deg, #1b5e20, #4caf50)",
          icon: <LocalShipping sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/material_request",
        },
        {
          title: "Auditor Page",
         
          desc: "Audit checks and reviews.",
          gradient: "linear-gradient(135deg, #33691e, #76ff03)",
          icon: <CheckCircleOutline sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/audit",
        },
        {
          title: "Manage Expenses",
          desc: "Shared expense section.",
          gradient: "linear-gradient(135deg, #2e7d32, #aeea00)",
          icon: <ReceiptLong sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/expenses",
        },
        {
          title: "Collected from JK",
          desc: "Materials from JK shop.",
          gradient: "linear-gradient(135deg, #2e7d32, #9ccc00)",
          icon: <ReceiptLong sx={{ fontSize: 40, color: "#c6ff00" }} />,
          link: "/storekeeper/collections",
        },
      ]
    : [];

  return (
    <Box sx={{ minHeight: "100vh", background: "#001f1f", color: "#fff" }}>
      {/* ==================== TOP BAR ==================== */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(90deg, #003c3c, #009688)",
          py: 1.5,
          px: { xs: 1.5, sm: 3 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: "#c6ff00" }}>
            <MenuIcon />
          </IconButton>

          <img
            src={logo}
            alt="SFV"
            style={{
              height: isMobile ? 26 : 32,
              borderRadius: 4,
            }}
          />

          {!isMobile && (
            <Typography fontWeight={700} variant="h6" color="#c6ff00">
              SFV Storekeeper Portal
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 2 }}>
          <Tooltip title="Messages">
            <IconButton sx={{ color: "#c6ff00", p: isMobile ? 0.5 : 1 }}>
              <Badge badgeContent={unread} color="error">
                <Mail />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton sx={{ color: "#c6ff00", p: isMobile ? 0.5 : 1 }}>
              <Badge badgeContent={notif} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh">
            <IconButton sx={{ color: "#c6ff00", p: isMobile ? 0.5 : 1 }} onClick={fetchSummary}>
              <Refresh />
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <Avatar sx={{ bgcolor: "#c6ff00", color: "#003c3c", fontWeight: 700 }}>
              {user?.name?.charAt(0) || "S"}
            </Avatar>
          )}
        </Box>
      </Box>

      {/* ==================== SIDE DRAWER ==================== */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250, background: "#003c3c", height: "100%" }}>
          <Box sx={{ p: 2, textAlign: "center" }}>
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

          <Divider />

          <ListItemButton onClick={() => navigate("/")}>
            <ListItemIcon sx={{ color: "#c6ff00" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" sx={{ color: "#fff" }} />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* ==================== BREADCRUMBS + GREETING ==================== */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: 2 }}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>

        <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} mt={1}>
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

      {/* ==================== KPI CARDS ==================== */}
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 3 }}>
        {loading ? (
          <Box sx={{ textAlign: "center", mt: 6 }}>
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
                      height: "100%",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                      "&:hover": {
                        transform: "translateY(-6px)",
                        transition: "0.3s",
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        {card.icon}
                        <Typography fontWeight={700}>{card.title}</Typography>
                      </Box>

                      {card.value && (
                        <Typography variant="h3" fontWeight={800} color="#c6ff00" mt={1}>
                          {card.value}
                        </Typography>
                      )}

                      <Typography variant="body2" sx={{ opacity: 0.85, mt: 1 }}>
                        {card.desc}
                      </Typography>

                      <Button
                        variant="contained"
                        fullWidth={isMobile}
                        sx={{
                          mt: 2,
                          backgroundColor: "#c6ff00",
                          color: "#003c3c",
                          fontWeight: 700,
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

      {/* ==================== LOW STOCK ALERT ==================== */}
      {summary && summary.inventoryData && (
        <Box sx={{ px: { xs: 2, sm: 4 }, mt: 1 }}>
          <Typography variant="h6" fontWeight={700} color="#c6ff00" mb={1}>
            ⚠️ Low Stock Alerts
          </Typography>

          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              background: "linear-gradient(90deg, #004d40, #00796b)",
              borderRadius: 3,
              boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
            }}
          >
            {summary.inventoryData.filter((i) => i.stock < 10).length === 0 ? (
              <Typography textAlign="center" color="#c6ff00">
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
                      flexDirection: isMobile ? "column" : "row",
                      textAlign: isMobile ? "center" : "left",
                      py: 1,
                      px: 2,
                      mb: 1,
                      borderRadius: 2,
                      background: i.stock < 5 ? "rgba(255,0,0,0.25)" : "rgba(255,235,59,0.25)",
                    }}
                  >
                    <Typography fontWeight={600}>{i.name}</Typography>

                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <WarningAmber sx={{ color: i.stock < 5 ? "red" : "#ffeb3b" }} />
                      <Typography
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
              variant="contained"
              fullWidth={isMobile}
              sx={{
                mt: 2,
                backgroundColor: "#c6ff00",
                color: "#003c3c",
                fontWeight: 700,
              }}
              onClick={() => navigate("/storekeeper/inventory")}
            >
              View Inventory
            </Button>
          </Box>
        </Box>
      )}

      {/* ==================== FOOTER ==================== */}
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          mt: 4,
          background: "#002f2f",
          color: "#c6ff00",
          fontSize: { xs: 12, sm: 14 },
        }}
      >
        © {new Date().getFullYear()} SFV Tech. All Rights Reserved.
        <br />
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          v3.0.0 — Responsive Store Dashboard Active
        </Typography>
      </Box>
    </Box>
  );
}
