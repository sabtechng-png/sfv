// ===========================================================
// SFV Tech | Admin Layout & Dashboard (Carbon–Teal Executive Theme)
// Phase 1 + Phase 2: Layout, Collapsible Sidebar, Topbar, KPIs, Greeting
// ===========================================================

// Usage:
// - Put AdminLayout.jsx under src/layouts
// - Put AdminDashboard.jsx under src/pages
// - Route example:
//   <Route path="/admin" element={<AdminLayout />}> 
//     <Route path="dashboard" element={<AdminDashboard />} />
//   </Route>


// --------------------------- AdminDashboard.jsx ----------------------------
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Avatar,
  Button,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Breadcrumbs,
  Grow,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  PeopleOutline,
  AccountBalanceWallet,
  BuildCircle,
  Inventory2,
  BarChart,
  ReceiptLong,
  Settings,
  Notifications,
  Mail,
  Logout,
  Refresh,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import api from "../utils/api"; // keep consistent with your project
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

// Optional: small helper to format currency
const formatNaira = (n) => {
  if (n == null || isNaN(n)) return "₦0";
  try {
    return `₦${Number(n).toLocaleString()}`;
  } catch {
    return `₦${n}`;
  }
};

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { enqueueSnackbar } = useSnackbar();

  // -------------------- Sidebar open state (persisted) --------------------
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("adminSidebarOpen");
    return saved === null ? !isMobile : JSON.parse(saved);
  });
  useEffect(() => {
    localStorage.setItem("adminSidebarOpen", JSON.stringify(open));
  }, [open]);

  // ---------------------------- Data states -------------------------------
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [notifCount, setNotifCount] = useState(4);
  const [mailCount, setMailCount] = useState(2);
  const [greeting, setGreeting] = useState("");

  // Greeting updater
  useEffect(() => {
    const updateGreeting = () => {
      const hr = new Date().getHours();
      setGreeting(hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening");
    };
    updateGreeting();
    const t = setInterval(updateGreeting, 60000);
    return () => clearInterval(t);
  }, []);

  // Fetch summary (Phase 2)
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/summary");
      const data = res?.data && Object.keys(res.data).length ? res.data : null;
      setSummary(
        data || {
          // Demo fallback
          activeEngineers: 5,
          pendingRequests: 17,
          storeHealthPct: 92,
          pendingWitness: 45,
          totalExpenses: 1200000,
          shops: 3,
          roles: {
            engineers: 7,
            staff: 6,
            storekeepers: 3,
            apprentices: 8,
          },
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (err) {
      enqueueSnackbar("Failed to load admin summary — showing demo data", { variant: "warning" });
      setSummary({
        activeEngineers: 5,
        pendingRequests: 17,
        storeHealthPct: 92,
        pendingWitness: 45,
        totalExpenses: 1200000,
        shops: 3,
        roles: { engineers: 7, staff: 6, storekeepers: 3, apprentices: 8 },
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  fetchSummary();          // Load once
}, []);                     // No auto-refresh


  // ------------------------------ Breadcrumbs ----------------------------
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((seg, i) => {
    const path = "/" + pathSegments.slice(0, i + 1).join("/");
    return (
      <Typography
        key={path}
        color={i === pathSegments.length - 1 ? "#00e5c0" : "#cfd8dc"}
        sx={{ cursor: "pointer", textTransform: "capitalize" }}
        onClick={() => navigate(path)}
      >
        {seg}
      </Typography>
    );
  });

  // ------------------------------ Menu Items -----------------------------
  const menu = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/admin/dashboard" },
    { text: "Manage Users", icon: <PeopleOutline />, path: "/admin/users" },
    { text: "My Expenses", icon: <AccountBalanceWallet />, path: "/admin/expenses" },
	{ text: "Expenses Overview", icon: <AccountBalanceWallet />, path: "/admin/expenses-monitor" },
    { text: "My Requests", icon: <BuildCircle />, path: "/admin/myrequests" },
    { text: "Material in Stock", icon: <Inventory2 />, path: "/admin/inventory" },
    { text: "Auditor Access", icon: <BarChart />, path: "/admin/audit-access" },
    { text: "Logs & Audits", icon: <ReceiptLong />, path: "/admin/audit" },
    { text: "Quotation", icon: <Inventory2 />, path: "/admin/quotations" },
	{ text: "Quotation Settings", icon: <Inventory2 />, path: "/admin/quotation-settings" },
  ];

  // ------------------------------ KPI Cards ------------------------------
  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        title: "Material in Stock",
     
        subtitle: "Materials currently in the store",
      },
	  
	  
	   {
        title: "Price Update",

        subtitle: "Add new materials and price update",
      },
	  
      {
        title: "Pending Requests",
  
        subtitle: "Material request from staff",
      },
      {
        title: "Audit Records",

        subtitle: "Store audit checks and reconciliations.",
      },
      {
        title: "Witness Actions",
   
        subtitle: "Approvals / rejections this week",
      },
      {
        title: "Work/Job Managements",
     
        subtitle: "Company's Job Management",
      },
      {
        title: "Materials Collected from JK",
    
        subtitle: "Material collected (jk & co)",
      },
    ];
  }, [summary]);

  // ----------------------------- Glass Styles ----------------------------
  const glass = {
    backdropFilter: "blur(12px)",
    background: "rgba(0, 191, 166, 0.08)",
    border: "1px solid rgba(0, 191, 166, 0.35)",
    boxShadow: "0 0 0 1px rgba(0, 200, 180, 0.05), 0 6px 24px rgba(0,0,0,0.45)",
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* ------------------------------ Sidebar ------------------------------ */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? 240 : 76,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? 240 : 76,
            overflowX: 'hidden',
            transition: 'width 0.3s ease',
            background: "linear-gradient(180deg, #0d1414, #081010)",
            color: "#cfd8dc",
            borderRight: "1px solid rgba(0, 191, 166, 0.2)",
          },
        }}
      >
        <Toolbar sx={{ ...glass, display: 'flex', justifyContent: open ? 'space-between' : 'center', px: 1, my: 1, borderRadius: 2 }}>
          {open ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <img src={logo} alt="SFV" style={{ height: 26, borderRadius: 6 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#00e5c0">SFV Admin</Typography>
            </Box>
          ) : (
            <img src={logo} alt="SFV" style={{ height: 26, borderRadius: 6 }} />
          )}
          <IconButton onClick={() => setOpen(!open)} sx={{ color: "#00e5c0" }}>
            <MenuIcon />
          </IconButton>
        </Toolbar>

        <Divider sx={{ borderColor: "rgba(0, 191, 166, 0.2)" }} />

        <List>
          {menu.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Tooltip key={item.text} title={!open ? item.text : ""} placement="right">
                <ListItem disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) setOpen(false);
                    }}
                    sx={{
                      minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2,
                      borderLeft: active ? '3px solid #00e5c0' : '3px solid transparent',
                      '&:hover': {
                        background: 'rgba(0, 191, 166, 0.08)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? '#00e5c0' : '#cfd8dc', minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} sx={{ color: active ? '#00e5c0' : '#cfd8dc', opacity: open ? 1 : 0 }} />
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            );
          })}
        </List>

        <Divider sx={{ borderColor: "rgba(0, 191, 166, 0.2)", mt: 'auto' }} />

        <ListItemButton
          onClick={() => { logout?.(); navigate("/"); }}
          sx={{ color: '#ef5350', my: 1, justifyContent: open ? 'initial' : 'center' }}
        >
          <ListItemIcon sx={{ color: '#ef5350', minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center' }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ opacity: open ? 1 : 0 }} />
        </ListItemButton>
      </Drawer>

      {/* ------------------------------ Main ------------------------------ */}
      <Box sx={{ flexGrow: 1 }}>
        {/* Top Bar */}
        <AppBar position="sticky" elevation={0} sx={{ background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(0, 191, 166, 0.2)", backdropFilter: "blur(6px)" }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {isMobile && (
                <IconButton onClick={() => setOpen(true)} sx={{ color: "#00e5c0" }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" fontWeight={800}>Executive Overview</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Messages">
                <IconButton sx={{ color: "#00e5c0" }}>
                  <Badge badgeContent={mailCount} color="error">
                    <Mail />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="Notifications">
                <IconButton sx={{ color: "#00e5c0" }}>
                  <Badge badgeContent={notifCount} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="Refresh">
                <IconButton onClick={fetchSummary} sx={{ color: "#00e5c0" }}>
                  <Refresh />
                </IconButton>
              </Tooltip>

              <Tooltip title="Profile">
                <Avatar sx={{ bgcolor: "#00e5c0", color: "#002b29", fontWeight: 800 }}>
                  {user?.name?.charAt(0) || 'A'}
                </Avatar>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Breadcrumbs + Greeting */}
        <Box sx={{ px: 4, pt: 2 }}>
          <Breadcrumbs separator="›">{breadcrumbs}</Breadcrumbs>
        </Box>
        <Box sx={{ px: 4, pt: 1 }}>
          <Typography variant="h5" fontWeight={800} mb={0.5}>
            {`${greeting}, ${user?.name || 'Admin'}`} 👋
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>

        {/* KPI Grid */}
        <Box sx={{ p: 4 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
              <CircularProgress color="inherit" />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {cards.map((c, i) => (
                <Grow in timeout={400 + i * 120} key={c.title}>
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card sx={{ ...glass, borderRadius: 3, transition: 'transform .25s ease', '&:hover': { transform: 'translateY(-6px)' } }}>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ color: '#b2dfdb' }}>{c.subtitle}</Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#e0f2f1' }}>{c.title}</Typography>
                        <Typography variant="h3" fontWeight={900} sx={{ color: '#00e5c0', mt: 0.5 }}>{c.value}</Typography>
                        <Button
                          size="small"
                          sx={{ mt: 1.5, fontWeight: 700, color: '#002b29', bgcolor: '#00e5c0', '&:hover': { bgcolor: '#1ff0d1' } }}
                          onClick={() => {
                            // Smart deep links based on card
                            const map = {
                              'Material in Stock': '/admin/inventory',
							  'Price Update': '/admin/materials',
                              'Pending Requests': '/admin/requests',
                              'Audit Records': '/admin/audit',
                              'Witness Actions': '/admin/logs',
                              'Work/Job Managements': '/jobs',
                              'Materials Collected from JK': '/admin/collections',
                            };
                            navigate(map[c.title] || '/admin/dashboard');
                          }}
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

        {/* Placeholder panels for Phase 3 charts/logs (kept minimal for Phase 1+2) */}
        <Box sx={{ px: 4, pb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Box sx={{ ...glass, p: 2.5, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={800} mb={1}>System Summary (Charts coming in Phase 3)</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Real-time request & expense trends will appear here.
				  
				  
				  
				  
				  
				  
				  
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ ...glass, p: 2.5, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={800} mb={1}>Role Distribution</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Engineers: {summary?.roles?.engineers ?? '-'}, Staff: {summary?.roles?.staff ?? '-'}, Storekeepers: {summary?.roles?.storekeepers ?? '-'}, Apprentices: {summary?.roles?.apprentices ?? '-'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', py: 2, borderTop: '1px solid rgba(0, 191, 166, 0.2)', color: '#8fbdb8' }}>
          © {new Date().getFullYear()} SFV Tech — Admin Console
          <br />
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            v1.0.0 — Auto-refresh every 30s · Last update: {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default AdminDashboard;
