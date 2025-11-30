// =======================================================================
// SFV Tech | Staff Dashboard (Royal Burgundy & Gold Theme - Responsive v3)
// =======================================================================

import React, { useState, useEffect } from "react";
import {
  Box, Grid, Typography, Card, CardContent, Button, IconButton, Tooltip,
  Divider, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Badge, Avatar, Breadcrumbs, Grow, CircularProgress, useMediaQuery
} from "@mui/material";

import {
  Assignment, Dashboard, Description, Store, ReceiptLong,
  Assessment, Mail, Notifications, Menu as MenuIcon,
  Logout, Refresh, BuildCircle
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

  const isMobile = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(3);
  const [notifications, setNotifications] = useState(2);
  const [greeting, setGreeting] = useState("");

  const [requestStats, setRequestStats] = useState({ total: 0, pending: 0 });

  // Greeting
  useEffect(() => {
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening");
  }, []);

  // Summary fetch
  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/staff/summary");
      setSummary(res.data);
    } catch {
      enqueueSnackbar("Failed to load summary", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Request stats
  useEffect(() => {
    if (!user?.email) return;

    const fetchRequestStats = async () => {
      try {
        const res = await api.get(`/api/inventory/staff-request-stats/${user.email}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });

        setRequestStats({
          total: res.data.total || 0,
          pending: res.data.pending || 0
        });

      } catch (err) {
        console.error("❌ Error fetching staff request stats:", err.message);
      }
    };

    fetchRequestStats();
    const interval = setInterval(fetchRequestStats, 60000);
    return () => clearInterval(interval);

  }, [user?.email]);

  // Breadcrumbs
  const segments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    return (
      <Typography
        key={path}
        sx={{
          cursor: "pointer",
          textTransform: "capitalize",
          fontSize: isMobile ? 12 : 14
        }}
        color={i === segments.length - 1 ? "#ffcc00" : "#fff"}
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
    { text: "Price Update", icon: <Store />, path: "/staff/materials" },
    { text: "My Requests", icon: <BuildCircle />, path: "/staff/myrequests" },
    { text: "Auditor Page", icon: <Assessment />, path: "/staff/audit" },
    { text: "Witness Page", icon: <Assignment />, path: "/staff/witness" },
  ];

  // KPI Cards
  const cards = summary
    ? [
        {
          title: "Manage Expenses",
          desc: "Spend, verify and approve expenses.",
          gradient: "linear-gradient(135deg, #4b0000, #a02020)",
          link: "/staff/expenses",
        },
        {
          title: "My Requests",
          desc: `Pending / Total staff requests`,
          gradient:
            requestStats.pending > 0
              ? "linear-gradient(135deg, #a00020, #ff3366)"
              : "linear-gradient(135deg, #5a1d1d, #a13b3b)",
          link: "/staff/myrequests",
        },
        {
          title: "Quotation Reviews",
          desc: "Review quotations from engineers.",
          gradient: "linear-gradient(135deg, #7b1e3a, #c13b5b)",
          link: "/staff/quotations",
        },
        {
          title: "Price Update",
          desc: "Track used and available materials.",
          gradient: "linear-gradient(135deg, #5a1d1d, #a13b3b)",
          link: "/staff/materials",
        },
        {
          title: "Auditor Page",
          desc: "Admin authorization required.",
          gradient: "linear-gradient(135deg, #843b62, #e06c9f)",
          link: "/staff/audit",
        },
        {
          title: "Materials Collected",
          desc: "Materials collected from other shops.",
          gradient: "linear-gradient(135deg, #843b62, #e06c9f)",
          link: "/staff/collections",
        },
      ]
    : [];

  return (
    <Box sx={{ background: "#2c0a0a", minHeight: "100vh", color: "#fff" }}>

      {/* ===================== TOP BAR ===================== */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(90deg, #400000, #8b0000)",
          py: 1.5,
          px: { xs: 1.5, sm: 3 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        {/* Left side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => setOpen(true)} sx={{ color: "#ffcc00" }}>
            <MenuIcon />
          </IconButton>

          <img
            src={logo}
            alt="SFV"
            style={{ height: isMobile ? 26 : 32, borderRadius: 4 }}
          />

          {!isMobile && (
            <Typography fontWeight={700} variant="h6" color="#ffcc00">
              SFV Staff Portal
            </Typography>
          )}
        </Box>

        {/* Right side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 2 }}>
          <Tooltip title="Messages">
            <IconButton sx={{ color: "#ffcc00", p: isMobile ? 0.5 : 1 }}>
              <Badge badgeContent={unread} color="error">
                <Mail />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton sx={{ color: "#ffcc00", p: isMobile ? 0.5 : 1 }}>
              <Badge badgeContent={notifications} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh">
            <IconButton sx={{ color: "#ffcc00", p: isMobile ? 0.5 : 1 }} onClick={fetchSummary}>
              <Refresh />
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <Avatar sx={{ bgcolor: "#ffcc00", color: "#3a0000", fontWeight: 700 }}>
              {user?.name?.charAt(0) || "S"}
            </Avatar>
          )}
        </Box>
      </Box>

      {/* ===================== SIDE DRAWER ===================== */}
      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 250, background: "#400000", height: "100%" }}>
          <Box sx={{ p: 2, textAlign: "center" }}>
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

          <Divider />

          <ListItemButton onClick={() => navigate("/")}>
            <ListItemIcon sx={{ color: "#ffcc00" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" sx={{ color: "#fff" }} />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* ===================== BREADCRUMBS + GREETING ===================== */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: 2 }}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>

        <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} mt={1}>
          {`${greeting}, ${user?.name || "Staff"}`} 👋
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })}
        </Typography>
      </Box>

      {/* ===================== KPI CARDS ===================== */}
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 3 }}>
        {loading ? (
          <Box sx={{ textAlign: "center", mt: 6 }}>
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
                      height: "100%",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                      "&:hover": {
                        transform: "translateY(-6px)",
                        transition: "0.3s",
                      },
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" fontWeight={700}>
                        {card.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{ opacity: 0.85, mt: 1 }}
                      >
                        {card.desc}
                      </Typography>

                      <Button
                        variant="contained"
                        fullWidth={isMobile}
                        sx={{
                          mt: 2,
                          backgroundColor: "#ffcc00",
                          color: "#3a0000",
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

      {/* ===================== FOOTER ===================== */}
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          mt: 4,
          background: "#3a0000",
          color: "#ffcc00",
          fontSize: { xs: 12, sm: 14 },
        }}
      >
        © {new Date().getFullYear()} SFV Tech. All Rights Reserved.
        <br />
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          v2.1.0 — Auto-sync active
        </Typography>
      </Box>

    </Box>
  );
}
