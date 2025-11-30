// ============================================================
// SFV Tech | Engineer Dashboard (Blue-Gold Theme v3 Responsive)
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
  useMediaQuery,
} from "@mui/material";

import {
  Dashboard,
  Engineering,
  AccountBalanceWallet,
  BuildCircle,
  BarChart,
  Logout,
  Notifications,
  Description,
  Mail,
  Refresh,
  WarningAmber,
} from "@mui/icons-material";

import HowToRegIcon from "@mui/icons-material/HowToReg";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "notistack";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import logo from "../assets/logo.png";

export default function EngineerDashboard() {
  const { logout, user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:900px)");

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [pendingWitnessCount, setPendingWitnessCount] = useState(0);
  const [requestStats, setRequestStats] = useState({ total: 0, pending: 0 });
  const [greeting, setGreeting] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Greeting
  useEffect(() => {
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening");
  }, []);

  // Fetch summary
  const fetchSummary = async () => {
    try {
      if (!user?.email) return;
      const res = await api.get(`/api/engineer/summary/${user.email}`);
      setSummary(res.data);
      setUnreadMessages(res.data.recentExpenses?.length || 2);
      setNotifications(3);
    } catch {
      setSummary({
        totalImprest: 0,
        totalExpenses: 0,
        totalSent: 0,
        availableBalance: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, [user?.email]);

  // Witness
  useEffect(() => {
    const fetchWitness = async () => {
      try {
        const res = await api.get(`/api/witness/summary/${user.email}`);
        setPendingWitnessCount(Number(res?.data?.pending_count ?? 0));
      } catch {
        setPendingWitnessCount(0);
      }
    };
    fetchWitness();
    const timer = setInterval(fetchWitness, 120000);
    return () => clearInterval(timer);
  }, [user?.email]);

  // Inventory request stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get(`/api/inventory/request-stats/${user.email}`);
        setRequestStats({
          total: res.data.total || 0,
          pending: res.data.pending || 0,
        });
      } catch {
        setRequestStats({ total: 0, pending: 0 });
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const breadcrumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => (
      <Typography
        key={i}
        color={i === arr.length - 1 ? "#f5c400" : "#fff"}
        sx={{ cursor: "pointer", textTransform: "capitalize", fontSize: isMobile ? 12 : 14 }}
        onClick={() => navigate("/" + arr.slice(0, i + 1).join("/"))}
      >
        {seg}
      </Typography>
    ));

  const menuItems = [
    { text: "Dashboard", icon: <Dashboard />, path: "/engineer/dashboard" },
    { text: "Work Management", icon: <Engineering />, path: "/jobs" },
    { text: "My Requests", icon: <BuildCircle />, path: "/engineer/myrequests" },
    { text: "Expenses", icon: <AccountBalanceWallet />, path: "/engineer/expenses" },
    { text: "Witness", icon: <HowToRegIcon />, path: "/engineer/witness" },
    { text: "Quotations", icon: <Description />, path: "/engineer/quotations" },
    { text: "Reports", icon: <BarChart />, path: "/engineer/reports" },
  ];

  const cards = summary
    ? [
        {
          title: "Work Management",
          desc: "Track and assign engineering tasks.",
          gradient: "linear-gradient(135deg, #0b1a33, #014f86)",
          icon: <Engineering sx={{ fontSize: 40, color: "#f5c400" }} />,
          link: "/jobs",
        },
        {
          title: "My Requests",
          desc: "Pending / Total material requests.",
          gradient: "linear-gradient(135deg, #013a63, #0077b6)",
          icon: <BuildCircle sx={{ fontSize: 40, color: "#f5c400" }} />,
          link: "/engineer/myrequests",
        },
        {
          title: "Expenses",
          desc: "Manage project or on-site expenses.",
          gradient: "linear-gradient(135deg, #005f73, #0a9396)",
          icon: <AccountBalanceWallet sx={{ fontSize: 40, color: "#f5c400" }} />,
          link: "/engineer/expenses",
        },
        {
          title: "Quotation System",
          desc: "Prepare quotations for clients or jobs.",
          gradient: "linear-gradient(135deg, #5f0f40, #9a031e)",
          icon: <Description sx={{ fontSize: 40, color: "#f5c400" }} />,
          link: "/engineer/quotations",
        },
        {
          title: "Auditor Page",
          desc: "Restricted section — admin only.",
          gradient: "linear-gradient(135deg, #3c096c, #7b2cbf)",
          icon: <BarChart sx={{ fontSize: 40, color: "#f5c400" }} />,
          link: "/engineer/audit",
        },
        {
          title: "Collected Materials (JK)",
          desc: "Log all materials collected from JK.",
          gradient: "linear-gradient(135deg, #3c096c, #7b2cbf)",
          icon: <BarChart sx={{ fontSize: 40, color: "#f5c400" }} />,
          link: "/engineer/collections",
        },
      ]
    : [];

  return (
    <Box sx={{ minHeight: "100vh", background: "#001f3f", color: "#fff" }}>
      {/* TOP BAR */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(90deg, #0b1a33, #014f86)",
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
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: "#f5c400" }}>
            <Dashboard />
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
            <Typography fontWeight={700} variant="h6" color="#f5c400">
              SFV Engineer Portal
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 2 }}>
          <Tooltip title="Messages">
            <IconButton sx={{ color: "#f5c400", p: isMobile ? 0.5 : 1 }}>
              <Badge badgeContent={unreadMessages} color="error">
                <Mail />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton sx={{ color: "#f5c400", p: isMobile ? 0.5 : 1 }}>
              <Badge badgeContent={notifications} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh">
            <IconButton sx={{ color: "#f5c400", p: isMobile ? 0.5 : 1 }} onClick={fetchSummary}>
              <Refresh />
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <Avatar sx={{ bgcolor: "#f5c400", color: "#0b1a33", fontWeight: 700 }}>
              {user?.name?.charAt(0) || "E"}
            </Avatar>
          )}
        </Box>
      </Box>

      {/* DRAWER */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250, background: "#0b1a33", height: "100%" }}>
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography fontWeight={700} color="#f5c400">
              Engineer Menu
            </Typography>
          </Box>

          <List>
            {menuItems.map((item) => (
              <ListItem disablePadding key={item.text}>
                <ListItemButton onClick={() => navigate(item.path)}>
                  <ListItemIcon sx={{ color: "#f5c400" }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} sx={{ color: "#fff" }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ borderColor: "#1a2b45" }} />

          <ListItemButton
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <ListItemIcon sx={{ color: "#f44336" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" sx={{ color: "#fff" }} />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* BREADCRUMBS + GREETING */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: 2 }}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>

        <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} mt={1}>
          {`${greeting}, ${user?.name || "Engineer"}`} 👋
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

      {/* KPI CARDS */}
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        {card.icon}
                        <Typography fontWeight={700}>{card.title}</Typography>
                      </Box>

                      <Typography variant="body2" sx={{ opacity: 0.85, mt: 1 }}>
                        {card.desc}
                      </Typography>

                      <Button
                        fullWidth={isMobile}
                        variant="contained"
                        sx={{
                          mt: 2,
                          backgroundColor: "#f5c400",
                          color: "#0b1a33",
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

      {/* STATUS WIDGET */}
      <Box sx={{ px: { xs: 2, sm: 4 }, mt: 2 }}>
        <Typography variant="h6" fontWeight={700} mb={1} color="#f5c400">
          🕓 Pending Witness & Requests
        </Typography>

        <Box
          sx={{
            background: "linear-gradient(90deg, #0b1a33, #014f86)",
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
            boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
          }}
        >
          {pendingWitnessCount === 0 && requestStats.pending === 0 ? (
            <Typography textAlign="center" color="#f5c400">
              ✅ No pending witness or material requests.
            </Typography>
          ) : (
            <>
              {pendingWitnessCount > 0 && (
                <Box
                  sx={{
                    mb: 1,
                    p: 2,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(245,196,0,0.15)",
                    flexDirection: isMobile ? "column" : "row",
                    textAlign: isMobile ? "center" : "left",
                  }}
                >
                  <Typography fontWeight={600}>Witness Approvals</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <WarningAmber sx={{ color: "#f5c400" }} />
                    <Typography fontWeight={700}>{pendingWitnessCount} pending</Typography>
                  </Box>
                </Box>
              )}

              {requestStats.pending > 0 && (
                <Box
                  sx={{
                    mb: 1,
                    p: 2,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexDirection: isMobile ? "column" : "row",
                    background: "rgba(0,119,182,0.2)",
                    textAlign: isMobile ? "center" : "left",
                  }}
                >
                  <Typography fontWeight={600}>Material Requests</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <WarningAmber sx={{ color: "#f5c400" }} />
                    <Typography fontWeight={700}>
                      {requestStats.pending} of {requestStats.total} pending
                    </Typography>
                  </Box>
                </Box>
              )}
            </>
          )}

          <Button
            variant="contained"
            sx={{
              mt: 2,
              backgroundColor: "#f5c400",
              color: "#0b1a33",
              fontWeight: 700,
            }}
            onClick={() => navigate("/engineer/witness")}
            fullWidth={isMobile}
          >
            View Details
          </Button>
        </Box>
      </Box>

      {/* FOOTER */}
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          mt: 4,
          background: "#0b1a33",
          color: "#f5c400",
          fontSize: { xs: 12, sm: 14 },
        }}
      >
        © {new Date().getFullYear()} SFV Tech. All Rights Reserved.
        <br />
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          v3.0.0 — Fully responsive dashboard
        </Typography>
      </Box>
    </Box>
  );
}
