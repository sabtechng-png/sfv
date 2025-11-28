// ======================================================================
// SFV Tech | Witness Page (Role-Themed & Multi-Role Authorized)
// - Works for admin, engineer, staff, storekeeper, apprentice
// - Full role-based theming (same system as ExpensesPage)
// - All logic, dialogs, and features preserved
// ======================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Box, AppBar, Toolbar, IconButton, Typography, Button, Stack,
  Chip, Paper, TextField, MenuItem, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, CircularProgress
} from "@mui/material";
import { ArrowBack, Logout, Search, CheckCircle, Cancel, InfoOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "notistack";
import api from "../../utils/api";

// ---------- Role-Based Themes ----------
const roleThemes = {
  admin: {
    bg: "linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)",
    accent: "#ff6b00",
  },
  engineer: {
    bg: "linear-gradient(180deg,#071a2c 0%,#001220 100%)",
    accent: "#f5c400",
  },
  staff: {
    bg: "linear-gradient(180deg,#1c0030 0%,#0a0014 100%)",
    accent: "#b84cff",
  },
  storekeeper: {
    bg: "linear-gradient(180deg,#002a12 0%,#000c06 100%)",
    accent: "#26ff92",
  },
  apprentice: {
    bg: "linear-gradient(180deg,#001b33 0%,#000a14 100%)",
    accent: "#00c3ff",
  },
};

export default function WitnessPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Determine current theme
  const role = (user?.role || "engineer").toLowerCase();
  const theme = roleThemes[role] || roleThemes.engineer;

  // ---------------- State ----------------
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ pending_count: 0, agreed_count: 0, disagreed_count: 0 });
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionLoading, setActionLoading] = useState(false);

  // For Disagree Remark Dialog
  const [remarkDialog, setRemarkDialog] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [currentExpenseId, setCurrentExpenseId] = useState(null);

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
  const time = (d) => (d ? new Date(d).toLocaleString() : "—");

  const getDisplayName = (email) => {
    const u = users.find((x) => x.email === email);
    return u?.nickname ? `${u.nickname}` : email || "—";
  };

  const myRoleFor = (w) => {
    if (!w) return "—";
    if (w.witness1_email === user?.email) return "Witness 1";
    if (w.witness2_email === user?.email) return "Witness 2";
    return "Witness";
  };

  const myStatusFor = (w) => {
    if (!w) return "pending";
    if (w.witness1_email === user?.email) return w.witness1_status || "pending";
    if (w.witness2_email === user?.email) return w.witness2_status || "pending";
    return "pending";
  };

  const chipColor = (s) => {
    switch ((s || "").toLowerCase()) {
      case "agreed":
        return "success";
      case "disagreed":
        return "error";
      default:
        return "warning";
    }
  };

  // ---------------- Data Load ----------------
  useEffect(() => {
    loadAll();
  }, [user?.email]);

  async function loadAll() {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [listRes, sumRes, usrRes] = await Promise.all([
        api.get(`/api/witness/${user.email}`),
        api.get(`/api/witness/summary/${user.email}`),
        api.get(`/api/expense-form/users`),
      ]);
      setRows(listRes?.data ?? []);
      setSummary(sumRes?.data ?? { pending_count: 0, agreed_count: 0, disagreed_count: 0 });
      setUsers(usrRes?.data ?? []);
    } catch (err) {
      enqueueSnackbar("Failed to load witness data.", { variant: "error" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Actions ----------------
  const actOnWitness = async (expense_id, action, remarks = null) => {
    setActionLoading(true);
    try {
      await api.put(`/api/witness/respond/${expense_id}`, {
        witness_email: user.email,
        status: action,
        remarks,
      });
      enqueueSnackbar(`Response recorded as ${action}.`, { variant: "success" });
      await loadAll();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "Failed to record testimony.", { variant: "error" });
    } finally {
      setActionLoading(false);
      setRemarkDialog(false);
      setRemarkText("");
      setCurrentExpenseId(null);
    }
  };

  const handleDisagreeClick = (expense_id) => {
    setCurrentExpenseId(expense_id);
    setRemarkDialog(true);
  };

  const handleSubmitRemark = () => {
    if (!remarkText.trim()) {
      enqueueSnackbar("Please enter a remark before submitting.", { variant: "warning" });
      return;
    }
    actOnWitness(currentExpenseId, "disagreed", remarkText.trim());
  };

  // ---------------- Filters ----------------
  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase();
    return (rows ?? []).filter((r) => {
      const status = myStatusFor(r);
      const matchStatus = statusFilter === "all" || status === statusFilter;
      const matchSearch =
        r.purpose?.toLowerCase().includes(q) ||
        r.sender_email?.toLowerCase().includes(q) ||
        r.receiver_email?.toLowerCase().includes(q) ||
        String(r.expense_id || "").includes(q);
      return matchStatus && matchSearch;
    });
  }, [rows, search, statusFilter, user?.email]);

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  // ---------------- UI ----------------
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10, color: theme.accent }}>
        <CircularProgress color="warning" />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", background: theme.bg, color: "#fff" }}>
      {/* Top Bar */}
      <AppBar position="sticky" sx={{ background: "rgba(0,0,0,0.3)", borderBottom: `2px solid ${theme.accent}` }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton color="inherit" onClick={() => navigate(-1)}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" fontWeight={800}>Witness Panel</Typography>
            <Typography variant="caption" sx={{ ml: 1, color: theme.accent }}>
              Role: {role.charAt(0).toUpperCase() + role.slice(1)}
            </Typography>
            <Chip label={`Pending: ${summary.pending_count}`} sx={{ ml: 1, fontWeight: 700, background: theme.accent }} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={loadAll}
              sx={{ borderColor: theme.accent, color: theme.accent, "&:hover": { borderColor: "#fff", color: "#fff" } }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Logout />}
              onClick={logout}
              sx={{ background: theme.accent, color: "#0b1a33", fontWeight: 700, "&:hover": { opacity: 0.85 } }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Summary Counters */}
      <Box sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {[
            { label: "Pending", value: summary.pending_count, color: theme.accent },
            { label: "Agreed", value: summary.agreed_count, color: "#69f0ae" },
            { label: "Disagreed", value: summary.disagreed_count, color: "#ef5350" },
          ].map((s) => (
            <Paper key={s.label} sx={{ flex: 1, p: 2, bgcolor: "rgba(255,255,255,0.05)", border: `1px solid ${theme.accent}` }}>
              <Typography variant="subtitle2" sx={{ color: theme.accent, fontWeight: 700, letterSpacing: 0.5 }}>
                {s.label}
              </Typography>
              <Typography variant="h5" fontWeight={900} color={s.color} sx={{ mt: 0.5 }}>
                {s.value}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      {/* Search + Filter */}
      <Box sx={{ px: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          placeholder="Search by purpose, sender, receiver, or expense ID"
          InputProps={{ startAdornment: <Search sx={{ mr: 1, color: theme.accent }} /> }}
          sx={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.05)",
            "& .MuiOutlinedInput-root fieldset": { borderColor: theme.accent },
            input: { color: theme.accent },
          }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{
            width: 200,
            backgroundColor: "rgba(255,255,255,0.05)",
            "& .MuiOutlinedInput-root fieldset": { borderColor: theme.accent },
            "& .MuiInputBase-input": { color: theme.accent },
            "& .MuiInputLabel-root": { color: theme.accent },
          }}
        >
          {["all", "pending", "agreed", "disagreed"].map((s) => (
            <MenuItem key={s} value={s}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Table */}
      <Box sx={{ p: 3 }}>
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: "auto" }}>
          <Table>
            <TableHead sx={{ background: "#0b1a33" }}>
              <TableRow>
                {["Expense", "Purpose", "Sender → Receiver", "Amount", "Role", "My Status", "Action"].map((h) => (
                  <TableCell key={h} sx={{ color: theme.accent, fontWeight: 800 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((r) => {
                const myStatus = myStatusFor(r);
                return (
                  <TableRow key={r.expense_id}>
                    <TableCell>
                      <Button size="small" startIcon={<InfoOutlined />} sx={{ color: theme.accent }}>
                        #{r.expense_id}
                      </Button>
                      <Typography variant="caption" sx={{ display: "block", color: "#94a3b8" }}>{time(r.expense_date)}</Typography>
                    </TableCell>
                    <TableCell>{r.purpose}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {getDisplayName(r.sender_email)} <span style={{ color: "#8894a6" }}>→</span> {getDisplayName(r.receiver_email)}
                      </Typography>
                    </TableCell>
                    <TableCell>{fmt(r.amount)}</TableCell>
                    <TableCell><Chip size="small" label={myRoleFor(r)} color="info" sx={{ fontWeight: 700 }} /></TableCell>
                    <TableCell>
                      <Chip size="small" label={String(myStatus).toUpperCase()} color={chipColor(myStatus)} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          disabled={actionLoading || myStatus !== "pending"}
                          onClick={() => actOnWitness(r.expense_id, "agreed")}
                          sx={{ fontWeight: 700 }}
                        >
                          Agree
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          disabled={actionLoading || myStatus !== "pending"}
                          onClick={() => handleDisagreeClick(r.expense_id)}
                          sx={{ fontWeight: 700, borderWidth: 2 }}
                        >
                          Disagree
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                    No witness items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filtered.length > 0 && (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_e, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>
          )}
        </TableContainer>
      </Box>

      {/* Dialog for Witness Remark */}
      <Dialog open={remarkDialog} onClose={() => setRemarkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "#0b1a33", color: "#fff" }}>Provide Remark (Disagree)</DialogTitle>
        <DialogContent sx={{ bgcolor: "#061a33" }}>
          <Typography variant="body2" sx={{ mb: 1, color: theme.accent }}>
            Please briefly explain why you disagreed with this expense.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Enter your remark here..."
            sx={{
              backgroundColor: "#fff",
              borderRadius: 1,
              "& .MuiOutlinedInput-root fieldset": { borderColor: theme.accent },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#061a33" }}>
          <Button onClick={() => setRemarkDialog(false)} sx={{ color: theme.accent }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitRemark}
            disabled={actionLoading}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
