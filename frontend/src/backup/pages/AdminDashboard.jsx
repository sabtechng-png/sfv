import React, { useEffect, useState } from "react";
import { Box, Grid, CircularProgress } from "@mui/material";
import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import DashboardCard from "../components/DashboardCard";
import { setPageTitle } from "../utils/setPageTitle";
import api from "../utils/api";

// --- Icons ---
import ListAltIcon from "@mui/icons-material/ListAlt";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import InventoryIcon from "@mui/icons-material/Inventory";
import EngineeringIcon from "@mui/icons-material/Engineering";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PeopleIcon from "@mui/icons-material/People";
import InsightsIcon from "@mui/icons-material/Insights";

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    logs: null,
    quotations: null,
    materials: null,
    reports: null,
    expenses: null,
    users: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageTitle("Admin Dashboard");

    // 🔹 Fetch summary metrics (placeholder for now, can connect to real endpoints)
    const fetchMetrics = async () => {
      try {
        const logs = await api.get("/api/logs?limit=1");
        const materials = await api.get("/api/materials/count").catch(() => ({ data: { count: 23 } }));
        const quotations = await api.get("/api/quotations/count").catch(() => ({ data: { count: 7 } }));
        const expenses = await api.get("/api/expenses/summary").catch(() => ({ data: { total: 124000 } }));
        const users = await api.get("/api/users?role=engineer").catch(() => ({ data: { count: 5 } }));
        const reports = await api.get("/api/reports/count").catch(() => ({ data: { count: 15 } }));

        setMetrics({
          logs: logs.data?.length || 0,
          materials: materials.data?.count || 0,
          quotations: quotations.data?.count || 0,
          expenses: expenses.data?.total || 0,
          users: users.data?.count || 0,
          reports: reports.data?.count || 0,
        });
      } catch (err) {
        console.error("Error fetching dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", backgroundColor: "#f5f7fa", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <Box sx={{ flexGrow: 1 }}>
        <DashboardHeader />

        <Box sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Request Logs"
                value={metrics.logs}
                subtitle="Logs recorded"
                icon={<ListAltIcon fontSize="large" />}
                color="#1976d2"
                to="/admin/logs"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Quotations"
                value={metrics.quotations}
                subtitle="Active quotations"
                icon={<RequestQuoteIcon fontSize="large" />}
                color="#0288d1"
                to="/admin/quotations"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Engineer Reports"
                value={metrics.reports}
                subtitle="Filed this week"
                icon={<EngineeringIcon fontSize="large" />}
                color="#2e7d32"
                to="/engineer/reports"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Materials"
                value={metrics.materials}
                subtitle="Items in catalog"
                icon={<InventoryIcon fontSize="large" />}
                color="#6a1b9a"
                to="/admin/materials"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Expenses"
                value={`₦ ${metrics.expenses.toLocaleString()}`}
                subtitle="This month"
                icon={<MonetizationOnIcon fontSize="large" />}
                color="#d32f2f"
                to="/admin/expenses"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <DashboardCard
                title="Users"
                value={metrics.users}
                subtitle="Active engineers"
                icon={<PeopleIcon fontSize="large" />}
                color="#7b1fa2"
                to="/admin/users"
              />
            </Grid>

            <Grid item xs={12}>
              <DashboardCard
                title="Analytics"
                value="Overview"
                subtitle="System summary & charts"
                icon={<InsightsIcon fontSize="large" />}
                color="#ff9800"
                to="/admin/analytics"
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
