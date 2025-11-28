import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Box,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  ListAlt as LogsIcon,
  People as UsersIcon,
  MonetizationOn as ExpensesIcon,
  Inventory as MaterialsIcon,
  Engineering as ReportsIcon,
  RequestQuote as QuotationsIcon,
  Insights as AnalyticsIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png"; // ✅ place your logo file here: src/assets/logo.png

const drawerWidth = 230;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/admin/dashboard" },
    { text: "Request Logs", icon: <LogsIcon />, path: "/admin/logs" },
    { text: "Quotations", icon: <QuotationsIcon />, path: "/admin/quotations" },
    { text: "Materials", icon: <MaterialsIcon />, path: "/admin/materials" },
    { text: "Engineer Reports", icon: <ReportsIcon />, path: "/engineer/reports" },
    { text: "Expenses", icon: <ExpensesIcon />, path: "/admin/expenses" },
    { text: "Users", icon: <UsersIcon />, path: "/admin/users" },
    { text: "Analytics", icon: <AnalyticsIcon />, path: "/admin/analytics" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#0d1b2a",
          color: "#ffffff",
        },
      }}
    >
      {/* ---- Logo Section ---- */}
      <Toolbar
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 2,
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="SFV Tech Logo"
          sx={{ width: 70, height: 70, mb: 1, borderRadius: "50%", objectFit: "cover" }}
        />
        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1rem" }}>
          SFV Tech
        </Typography>
      </Toolbar>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", mb: 1 }} />

      {/* ---- Navigation List ---- */}
      <List>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  color: isActive ? "#1976d2" : "#ffffff",
                  backgroundColor: isActive ? "rgba(25,118,210,0.15)" : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(25,118,210,0.25)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? "#1976d2" : "#ffffff",
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: "0.9rem" }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

      {/* ---- Footer ---- */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
          © {new Date().getFullYear()} SFV Tech
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
