// ===========================================================
// SFV Tech | Staff Dashboard (Royal Burgundy & Gold Theme)
// Distinct from Engineer dashboard
// ===========================================================

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
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Breadcrumbs,
  Grow,
  CircularProgress,
} from "@mui/material";
import {
  Dashboard,
  Description,
  Store,
  ReceiptLong,
  Assessment,
  Mail,
  Notifications,
  Menu as MenuIcon,
  Logout,
  Refresh,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "notistack";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import logo from "../assets/logo.png";

export default function StaffDashboard() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(3);
  const [notifications, setNotifications] = useState(2);

  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening");
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/staff/summary");
      setSummary(res.data);
    } catch (error) {
      enqueueSnackbar("Failed to load summary", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((seg, i) => {
    const path = "/" + pathSegments.slice(0, i + 1).join("/");
    return (
      <Typography
        key={path}
        color={i === pathSegments.length - 1 ? "#ffcc00" : "#f0f0f0"}
        sx={{ cursor: "pointer", textTransform: "capitalize" }}
        onClick={() => navigate(path)}
      >
        {seg}
      </Typography>
    );
  });

  const menuItems = [
    { text: "Dashboard", icon: <Dashboard />, path: "/staff/dashboard" },
    { text: "Expenses", icon: <ReceiptLong />, path: "/staff/expenses" },
    { text: "Quotations", icon: <Description />, path: "/staff/quotations" },
    { text: "Store", icon: <Store />, path: "/staff/store" },
    { text: "Reports", icon: <Assessment />, path: "/staff/reports" },
    { text: "Logs", icon: <ReceiptLong />, path: "/staff/logs" },
  ];

  const cards = summary
    ? [
        {
          title: "Expense Oversight",
          value: summary.expenses || 0,
          desc: "Verify and approve expenses.",
          gradient: "linear-gradient(135deg, #4b0000, #a02020)",
          link: "/staff/expenses",
        },
        {
          title: "Quotation Reviews",
          value: summary.quotations || 0,
          desc: "Review quotations from engineers.",
          gradient: "linear-gradient(135deg, #7b1e3a, #c13b5b)",
          link: "/staff/quotations",
        },
        {
          title: "Store Items",
          value: summary.storeItems || 0,
          desc: "Track used and available materials.",
          gradient: "linear-gradient(135deg, #5a1d1d, #a13b3b)",
          link: "/staff/store",
        },
        {
          title: "Reports",
          value: summary.reports || 0,
          desc: "Generate operational reports.",
          gradient: "linear-gradient(135deg, #843b62, #e06c9f)",
          link: "/staff/reports",
        },
      ]
    : [];

  return (
    <Box sx={{ background: "#2c0a0a", minHeight: "100vh", color: "#fff" }}>
      {/* ======= TOP BAR ======= */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(90deg, #400000, #8b0000)",
          py: 1.5,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => setOpen(true)} sx={{ color: "#ffcc00" }}>
            <MenuIcon />
          </IconButton>
          <img src={logo} alt="SFV" style={{ height: 32, borderRadius: 4 }} />
          <Typography fontWeight={700} variant="h6" color="#ffcc00">
            SFV Staff Portal
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Tooltip title="Messages">
            <IconButton sx={{ color: "#ffcc00" }}>
              <Badge badgeContent={unread} color="error">
                <Mail />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton sx={{ color: "#ffcc00" }}>
              <Badge badgeContent={notifications} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh">
            <IconButton sx={{ color: "#ffcc00" }} onClick={fetchSummary}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Avatar sx={{ bgcolor: "#ffcc00", color: "#3a0000", fontWeight: 700 }}>
            {user?.name?.charAt(0) || "S"}
          </Avatar>
        </Box>
      </Box>

      {/* ======= SIDE DRAWER ======= */}
      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 250, background: "#400000", height: "100%" }}>
          <Box sx={{ p: 2, textAlign: "center", borderBottom: "1px solid #661414" }}>
            <Typography variant="h6" fontWeight={700} color="#ffcc00">
              Staff Menu
            </Typography>
          </Box>
          <List>
            {menuItems.map((item) => (
              <ListItem disablePadding key={item.text}>
                <ListItemButton onClick={() => navigate(item.path)}>
                  <ListItemIcon sx={{ color: "#ffcc00" }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} sx={{ color: "#fff" }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ borderColor: "#661414" }} />
          <ListItemButton onClick={() => navigate("/")}>
            <ListItemIcon sx={{ color: "#ffcc00" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" sx={{ color: "#fff" }} />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* ======= BREADCRUMBS ======= */}
      <Box sx={{ px: 4, pt: 2 }}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
        <Typography variant="h5" fontWeight={700} mt={2}>
          {`${greeting}, ${user?.name || "Staff"}`} 👋
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
            <CircularProgress color="warning" />
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
                      <Typography variant="h6" fontWeight={700} mb={1}>
                        {card.title}
                      </Typography>
                      <Typography variant="h3" fontWeight={800} color="#ffcc00">
                        {card.value || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                        {card.desc}
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: "#ffcc00",
                          color: "#3a0000",
                          fontWeight: 700,
                          "&:hover": { backgroundColor: "#ffd633" },
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

      {/* ======= FOOTER ======= */}
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          mt: 4,
          borderTop: "1px solid #5e1a1a",
          background: "#3a0000",
          fontSize: 14,
          color: "#ffcc00",
        }}
      >
        © {new Date().getFullYear()} SFV Tech. All Rights Reserved.  
        <br />
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          v2.0.1 — Last sync: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
}
