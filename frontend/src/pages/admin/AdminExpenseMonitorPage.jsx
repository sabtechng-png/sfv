// ======================================================================
// SFV TECH — ADMIN EXPENSE MONITORING DASHBOARD
// Shows: All Users Balances, All Logs, All Spending Activities
// Admin-only access (uses AuthContext)
// ======================================================================

import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Card, CardContent, Grid, Button, IconButton,
  CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, Tooltip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HistoryIcon from "@mui/icons-material/History";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { useNavigate } from "react-router-dom";

export default function AdminExpenseMonitorPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const role = (user?.role || "").toLowerCase();

  // 🔐 Admin only
  if (role !== "admin") {
    navigate("/login");
  }

  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState([]);
  const [logs, setLogs] = useState([]);
  const [openLogs, setOpenLogs] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch all balances
  async function loadBalances() {
    try {
      const res = await api.get("/api/balance/all");
      setBalances(res.data || []);
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  }

  // Fetch all logs
  async function loadLogs() {
    try {
      const res = await api.get("/api/expense-logs/all");
      setLogs(res.data || []);
    } catch (err) {
      console.error("Logs fetch error:", err);
    }
  }

  // Initial Load
  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([loadBalances(), loadLogs()]);
      setLoading(false);
    }
    load();
  }, []);

  const totals = useMemo(() => {
    const sum = (key) =>
      balances.reduce((a, b) => a + Number(b[key] || 0), 0);

    return {
      imprest: sum("imprest"),
      spent: sum("spent"),
      transfers: sum("transfers"),
      refunds: sum("refunds"),
      available: sum("available"),
    };
  }, [balances]);

  const fmt = (v) => `₦${Number(v || 0).toLocaleString()}`;

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress color="warning" />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          alignItems: "center",
        }}
      >
        <Typography variant="h5" fontWeight={900}>
          🧾 Admin Expense Monitoring Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={async () => {
            setLoading(true);
            await Promise.all([loadBalances(), loadLogs()]);
            setLoading(false);
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* ANALYTICS CARDS */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "Total Imprest Issued", value: totals.imprest },
          { label: "Total Spent", value: totals.spent },
          { label: "Total Transfers", value: totals.transfers },
          { label: "Total Refunds", value: totals.refunds },
          { label: "Total Available", value: totals.available },
        ].map((x) => (
          <Grid item xs={12} md={4} lg={2.4} key={x.label}>
            <Card sx={{ borderRadius: 3, background: "#0d1b2a", color: "#fff" }}>
              <CardContent>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {x.label}
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {fmt(x.value)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* USER BALANCE TABLE */}
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
        👥 Users Expense Overview
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 4 }}>
        <Table>
          <TableHead sx={{ background: "#102a43" }}>
            <TableRow>
              {[
                "Email",
                "Imprest",
                "Spent",
                "Transfers",
                "Refunds",
                "Available",
                "Logs",
              ].map((h) => (
                <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {balances.map((b) => (
              <TableRow key={b.email} hover>
                <TableCell>{b.email}</TableCell>
                <TableCell>{fmt(b.imprest)}</TableCell>
                <TableCell>{fmt(b.spent)}</TableCell>
                <TableCell>{fmt(b.transfers)}</TableCell>
                <TableCell>{fmt(b.refunds)}</TableCell>
                <TableCell>
                  <Chip
                    label={fmt(b.available)}
                    color={b.available < 0 ? "error" : "success"}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="View Logs">
                    <IconButton
                      onClick={() => {
                        setSelectedUser(b.email);
                        setOpenLogs(true);
                      }}
                    >
                      <HistoryIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* SYSTEM LOGS BUTTON */}
      <Button
        variant="outlined"
        startIcon={<VisibilityIcon />}
        onClick={() => setOpenLogs(true)}
      >
        View System Expense Logs
      </Button>

      {/* LOGS DIALOG */}
      <Dialog
        open={openLogs}
        onClose={() => {
          setSelectedUser(null);
          setOpenLogs(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          📜 Expense Logs{" "}
          {selectedUser ? `— for ${selectedUser}` : "(System Wide)"}
        </DialogTitle>
        <DialogContent dividers>
          {logs
            .filter((l) =>
              selectedUser
                ? l.actor_email === selectedUser ||
                  l.sender_email === selectedUser ||
                  l.receiver_email === selectedUser
                : true
            )
            .map((log, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Typography fontWeight={700}>{log.actor_email}</Typography>
                <Typography>{log.log_message}</Typography>
                <Typography variant="caption" sx={{ color: "gray" }}>
                  {new Date(log.timestamp).toLocaleString()}
                </Typography>
                <Divider sx={{ my: 1 }} />
              </Box>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogs(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
