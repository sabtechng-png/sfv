// ============================================================
// SFV Tech | Apprentice Dashboard (Royal Blue / Silver Theme)
// Enhanced: Added Witness Page link + Witness Portal card
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
  LinearProgress,
  Chip,
} from "@mui/material";
import {
  Dashboard,
  Receipt,
  School,
  Report,
  Notifications,
  Mail,
  Logout,
  Menu as MenuIcon,
  DoneAll,
  PendingActions,
  Refresh,
  Assignment,
  WorkspacePremium,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "notistack";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import logo from "../assets/logo.png";

export default function ApprenticeDashboard() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unread, setUnread] = useState(2);
  const [notif, setNotif] = useState(1);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening");
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/apprentice/summary");
      const data =
        res.data && Object.keys(res.data).length
          ? res.data
          : {
              pendingExpenses: 3,
              witnessedExpenses: 18,
              flaggedExpenses: 1,
              progress: 75,
              mentor: "Engr. A. A. Sulaiman",
              modules: [
                { name: "Electrical Safety", progress: 100 },
                { name: "Solar Installation Basics", progress: 85 },
                { name: "IoT Device Setup", progress: 60 },
              ],
            };
      setSummary(data);
    } catch {
      enqueueSnackbar("Network error — using demo data", { variant: "warning" });
      setSummary({
        pendingExpenses: 3,
        witnessedExpenses: 18,
        flaggedExpenses: 1,
        progress: 75,
        mentor: "Engr. A. A. Sulaiman",
        modules: [
          { name: "Electrical Safety", progress: 100 },
          { name: "Solar Installation Basics", progress: 85 },
          { name: "IoT Device Setup", progress: 60 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const breadcrumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => (
      <Typography
        key={i}
        color={i === arr.length - 1 ? "#80d8ff" : "#fff"}
        sx={{ cursor: "pointer", textTransform: "capitalize" }}
        onClick={() => navigate("/" + arr.slice(0, i + 1).join("/"))}
      >
        {seg}
      </Typography>
    ));

  // =================== Sidebar Items ===================
  const menuItems = [
    { text: "Dashboard", icon: <Dashboard />, path: "/apprentice/dashboard" },
    { text: "Witness Expenses", icon: <Receipt />, path: "/apprentice/expenses" },
  
    { text: "Training & Mentorship", icon: <School />, path: "#" },
    { text: "Reports", icon: <Report />, path: "#" },
  ];

  // =================== Dashboard KPI Cards ===================
  const cards = summary
    ? [
        {
          title: "Manage Expenses",
          value: summary.pendingExpenses,
          desc: "Expenses awaiting your confirmation.",
          gradient: "linear-gradient(135deg, #001a33, #004c99)",
          icon: <PendingActions sx={{ fontSize: 38, color: "#80d8ff" }} />,
          link: "/apprentice/expenses",
        },
        {
          title: "Witnessed Expenses",
          value: summary.witnessedExpenses,
          desc: "Expenses you’ve reviewed and confirmed.",
          gradient: "linear-gradient(135deg, #003366, #0066cc)",
          icon: <DoneAll sx={{ fontSize: 38, color: "#80d8ff" }} />,
          link: "/apprentice/witness",
        },

    
		
		 {
          title: "Auditor Page", // <-- NEW CARD
          value: summary.flaggedExpenses,
          desc: "Admin permission is required.",
          gradient: "linear-gradient(135deg, #002b55, #0059b3)",
          icon: <Assignment sx={{ fontSize: 38, color: "#80d8ff" }} />,
           link: "/apprentice/audit",
        },

      ]
    : [];

  return (
    <Box sx={{ minHeight: "100vh", background: "#001a33", color: "#fff" }}>
      {/* ======= TOP BAR ======= */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(90deg, #002b55, #004c99)",
          py: 1.5,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: "#80d8ff" }}>
            <MenuIcon />
          </IconButton>
          <img src={logo} alt="SFV" style={{ height: 32, borderRadius: 4 }} />
          <Typography fontWeight={700} variant="h6" color="#80d8ff">
            SFV Apprentice Portal
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Tooltip title="Messages">
            <IconButton sx={{ color: "#80d8ff" }}>
              <Badge badgeContent={unread} color="error">
                <Mail />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton sx={{ color: "#80d8ff" }}>
              <Badge badgeContent={notif} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh">
            <IconButton sx={{ color: "#80d8ff" }} onClick={fetchSummary}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Avatar sx={{ bgcolor: "#80d8ff", color: "#001a33", fontWeight: 700 }}>
            {user?.name?.charAt(0) || "A"}
          </Avatar>
        </Box>
      </Box>

      {/* ======= SIDE DRAWER ======= */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250, background: "#002b55", height: "100%" }}>
          <Box sx={{ p: 2, textAlign: "center", borderBottom: "1px solid #004c99" }}>
            <Typography variant="h6" fontWeight={700} color="#80d8ff">
              Apprentice Menu
            </Typography>
          </Box>
          <List>
            {menuItems.map((item) => (
              <ListItem disablePadding key={item.text}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    setDrawerOpen(false);
                  }}
                >
                  <ListItemIcon sx={{ color: "#80d8ff" }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} sx={{ color: "#fff" }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ borderColor: "#003366" }} />
          <ListItemButton onClick={() => navigate("/")}>
            <ListItemIcon sx={{ color: "#80d8ff" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" sx={{ color: "#fff" }} />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* ======= GREETING ======= */}
      <Box sx={{ px: 4, pt: 2 }}>
        <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
        <Typography variant="h5" fontWeight={700} mt={2}>
          {`${greeting}, ${user?.name || "Apprentice"}`} 👋
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
            <CircularProgress color="info" />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {cards.map((card, i) => (
              <Grow in timeout={400 + i * 150} key={i}>
                <Grid item xs={12} sm={6} md={4}>
                  <Card
                    sx={{
                      background: card.gradient,
                      borderRadius: 3,
                      color: "#fff",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                      transition: "transform 0.3s ease",
                      "&:hover": { transform: "translateY(-6px)" },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        {card.icon}
                        <Typography variant="h6" fontWeight={700}>
                          {card.title}
                        </Typography>
                      </Box>
                      <Typography variant="h3" fontWeight={800} color="#80d8ff" mt={1}>
                        {card.value || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
                        {card.desc}
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: "#80d8ff",
                          color: "#001a33",
                          fontWeight: 700,
                          "&:hover": { backgroundColor: "#99e1ff" },
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

      {/* ======= TRAINING & MENTORSHIP ======= */}
      {summary && (
        <Box sx={{ px: 4, mb: 2 }}>
          <Typography variant="h6" fontWeight={700} color="#80d8ff" mb={1}>
            🎓 Training & Mentorship Progress
          </Typography>
          <Box
            sx={{
              background: "linear-gradient(90deg, #002b55, #003f7f)",
              borderRadius: 3,
              p: 3,
              boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
            }}
          >
            <Typography variant="body1" fontWeight={600}>
              Mentor: <span style={{ color: "#80d8ff" }}>{summary.mentor}</span>
            </Typography>
            {summary.modules.map((m, i) => (
              <Box key={i} sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  {m.name}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={m.progress}
                  sx={{
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: "#001a33",
                    "& .MuiLinearProgress-bar": { backgroundColor: "#80d8ff" },
                  }}
                />
              </Box>
            ))}
            <Chip
              icon={<WorkspacePremium />}
              label={`Overall Progress: ${summary.progress}%`}
              sx={{
                mt: 3,
                backgroundColor: "#80d8ff",
                color: "#001a33",
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>
      )}

      {/* ======= FOOTER ======= */}
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          mt: 3,
          borderTop: "1px solid #003366",
          background: "#002244",
          fontSize: 14,
          color: "#80d8ff",
        }}
      >
        © {new Date().getFullYear()} SFV Tech. Empowering Growth through Learning.
        <br />
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          v1.0 — Apprentice Transparency Portal
        </Typography>
      </Box>
    </Box>
  );
}
