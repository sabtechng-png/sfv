// ===============================================================
// SFV Tech | Engineer Dashboard (Fully Integrated – Oct 2025)
// ===============================================================

import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  Tooltip,
  Breadcrumbs,
  Grow,
  CircularProgress,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft,
  Engineering,
  AccountBalanceWallet,
  BuildCircle,
  BarChart,
  Logout,
  Dashboard,
  Notifications,
  Description,
  Mail,
  ErrorOutline,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import api from "../utils/api";
import logo from "../assets/logo.png";

export default function EngineerDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { enqueueSnackbar } = useSnackbar();

  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("engineerSidebarOpen");
    return saved === null ? !isMobile : JSON.parse(saved);
  });
  useEffect(() => {
    localStorage.setItem("engineerSidebarOpen", JSON.stringify(open));
  }, [open]);

  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate("/");
  };

  // === Dynamic greeting ===
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const updateGreeting = () => {
      const hours = new Date().getHours();
      setGreeting(
        hours < 12
          ? "Good Morning"
          : hours < 18
          ? "Good Afternoon"
          : "Good Evening"
      );
    };
    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  // === States ===
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState(0);

  // === Fetch dashboard data ===
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        if (!user?.email) return;
        const res = await api.get(`/api/engineer/summary/${user.email}`);
        console.log("Dashboard Summary:", res.data);
        setSummary(res.data);
        setUnreadMessages(res.data.recentExpenses?.length || 2);
        setNotifications(3);
      } catch (err) {
        console.error("Error fetching summary:", err);
        setError(true);
        enqueueSnackbar("Failed to load dashboard data", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [enqueueSnackbar, user?.email]);

  // === Sidebar menu items ===
  const menuItems = [
    { text: "Dashboard", icon: <Dashboard />, link: "/engineer/dashboard" },
    { text: "Work Management", icon: <Engineering />, link: "/engineer/work" },
    { text: "Material Requests", icon: <BuildCircle />, link: "/engineer/requests" },
    { text: "Expenses", icon: <AccountBalanceWallet />, link: "/engineer/expenses" },
    { text: "Quotations", icon: <Description />, link: "/engineer/quotations" },
    { text: "Reports", icon: <BarChart />, link: "/engineer/reports" },
  ];

  // === Breadcrumbs ===
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, i) => {
    const path = "/" + pathSegments.slice(0, i + 1).join("/");
    return (
      <Typography
        key={path}
        color={i === pathSegments.length - 1 ? "#f5c400" : "#fff"}
        sx={{ cursor: "pointer" }}
        onClick={() => navigate(path)}
      >
        {segment.charAt(0).toUpperCase() + segment.slice(1)}
      </Typography>
    );
  });

  // === Dashboard Cards ===
  const cards = summary
    ? [
        {
          title: "Work Management",
          value: summary.totalImprest || 0,
          description: "Track and assign engineering tasks.",
          icon: <Engineering fontSize="large" />,
          color: "#014f86",
          link: "/engineer/work",
        },
        {
          title: "Material Requests",
          value: summary.totalReceived || 0,
          description: "Request and monitor materials.",
          icon: <BuildCircle fontSize="large" />,
          color: "#0077b6",
          link: "/engineer/requests",
        },
        {
          title: "Expenses Management",
          value: summary.totalExpenses || 0,
          description: "Manage project or on-site expenses.",
          icon: <AccountBalanceWallet fontSize="large" />,
          color: "#0a9396",
          link: "/engineer/expenses",
        },
        {
          title: "Quotation System",
          value: summary.totalSent || 0,
          description: "Prepare quotations for clients or tasks.",
          icon: <Description fontSize="large" />,
          color: "#5f0f40",
          link: "/engineer/quotations",
        },
        {
          title: "Messages",
          value: unreadMessages,
          description: "View all recent communications.",
          icon: <Mail fontSize="large" />,
          color: "#005f73",
          link: "/engineer/messages",
        },
        {
          title: "Reports",
          value: summary.availableBalance || 0,
          description: "Generate daily or weekly reports.",
          icon: <BarChart fontSize="large" />,
          color: "#7b2cbf",
          link: "/engineer/reports",
        },
      ]
    : [];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: "#001f3f", color: "#fff" }}>
      {/* ===== Sidebar ===== */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? 230 : 72,
          "& .MuiDrawer-paper": {
            width: open ? 230 : 72,
            backgroundColor: "#0b1a33",
            color: "#fff",
            transition: "width 0.3s ease",
            boxSizing: "border-box",
            borderRight: "1px solid #1a2b45",
          },
        }}
      >
        {/* === Logo Section === */}
        <Toolbar sx={{ justifyContent: open ? "space-between" : "center", py: 1 }}>
          {open ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <img src={logo} alt="SFV Logo" style={{ height: 28, borderRadius: "6px" }} />
              <Typography variant="h6" fontWeight={700}>
                SFV Tech
              </Typography>
            </Box>
          ) : (
            <Tooltip title="SFV Tech" placement="right">
              <img src={logo} alt="SFV" style={{ height: 28, borderRadius: "6px" }} />
            </Tooltip>
          )}
          <IconButton onClick={() => setOpen(!open)} sx={{ color: "#fff" }}>
            {open ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
        </Toolbar>

        <Divider sx={{ bgcolor: "#1f3b5b" }} />

        <List>
          {menuItems.map((item) => {
            const active = location.pathname === item.link;
            return (
              <Tooltip key={item.text} title={!open ? item.text : ""} placement="right">
                <ListItem disablePadding sx={{ display: "block" }}>
                  <ListItemButton
                    onClick={() => {
                      navigate(item.link);
                      if (isMobile) setOpen(false);
                    }}
                    sx={{
                      minHeight: 48,
                      justifyContent: open ? "initial" : "center",
                      px: 2.5,
                      bgcolor: active ? "#1c2f4a" : "inherit",
                      borderLeft: active ? "4px solid #f5c400" : "4px solid transparent",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        bgcolor: "#1c2f4a",
                        borderLeft: "4px solid #f5c400",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: active ? "#f5c400" : "#fff",
                        minWidth: 0,
                        mr: open ? 2 : "auto",
                        justifyContent: "center",
                        transform: active ? "scale(1.15)" : "scale(1)",
                        transition: "transform 0.3s ease",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        opacity: open ? 1 : 0,
                        color: active ? "#f5c400" : "#fff",
                        fontWeight: active ? 700 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            );
          })}
        </List>

        <Divider sx={{ bgcolor: "#1f3b5b", mt: "auto" }} />

        <ListItemButton
          onClick={handleLogout}
          sx={{ color: "error.main", mt: 2, justifyContent: open ? "initial" : "center" }}
        >
          <ListItemIcon
            sx={{
              color: "#f44336",
              minWidth: 0,
              mr: open ? 2 : "auto",
              justifyContent: "center",
            }}
          >
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ opacity: open ? 1 : 0 }} />
        </ListItemButton>
      </Drawer>

      {/* ===== Main Area ===== */}
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="sticky" sx={{ background: "#0b1a33", boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {isMobile && (
                <IconButton onClick={() => setOpen(true)} sx={{ color: "#fff" }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" fontWeight={700}>
                👷 Engineer Dashboard
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Tooltip title="Messages">
                <IconButton sx={{ color: "#f5c400" }} onClick={() => navigate("/engineer/messages")}>
                  <Badge badgeContent={unreadMessages} color="error">
                    <Mail />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="Notifications">
                <IconButton sx={{ color: "#f5c400" }}>
                  <Badge badgeContent={notifications} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="Profile">
                <IconButton onClick={() => navigate("/engineer/profile")}>
                  <Avatar sx={{ bgcolor: "#f5c400", color: "#0b1a33", fontWeight: 700 }}>
                    {user?.name?.charAt(0) || "E"}
                  </Avatar>
                </IconButton>
              </Tooltip>

              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={() => navigate("/engineer/profile")}>Profile</MenuItem>
                <MenuItem onClick={() => navigate("/engineer/settings")}>Settings</MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Breadcrumbs */}
        <Box sx={{ px: 4, pt: 2 }}>
          <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
        </Box>

        {/* Greeting */}
        <Box sx={{ px: 4, pt: 2 }}>
          <Typography variant="h5" fontWeight={700} mb={1}>
            {`${greeting}, ${user?.name || "Engineer"}`} 👋
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Today is{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            .
          </Typography>
        </Box>

        {/* Dashboard Cards */}
        <Box sx={{ p: 4 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
              <CircularProgress color="warning" size={60} />
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: "center", mt: 6 }}>
              <ErrorOutline sx={{ fontSize: 60, color: "red" }} />
              <Typography variant="h6" mt={2}>
                Couldn’t load dashboard data
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {cards.map((card, i) => (
                <Grow in timeout={500 + i * 150} key={i}>
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card
                      sx={{
                        background: card.color,
                        borderRadius: 3,
                        boxShadow: "0px 5px 18px rgba(0,0,0,0.4)",
                        "&:hover": {
                          transform: "translateY(-6px) scale(1.02)",
                          transition: "all 0.3s ease",
                        },
                      }}
                    >
                      <CardContent sx={{ color: "#fff" }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                          {card.icon}
                          <Typography variant="h6" fontWeight={600} ml={1}>
                            {card.title}
                          </Typography>
                        </Box>
                        <Typography variant="h3" fontWeight={700}>
                          {card.title === "Reports"
                            ? `₦${card.value?.toLocaleString()}`
                            : card.value?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
                          {card.description}
                        </Typography>
                        <Button
                          variant="contained"
                          sx={{
                            backgroundColor: "#f5c400",
                            color: "#0b1a33",
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
      </Box>
    </Box>
  );
}
