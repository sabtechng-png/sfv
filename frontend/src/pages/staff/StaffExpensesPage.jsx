// ======================================================================
// SFV Tech | Staff Expenses Management (Burgundy & Gold Theme)
// Matches StaffDashboard: deep burgundy bg, gold accents
// Includes: Back (one step) + Logout, Add Expense, Return Money, Logs,
// Witness chips (names only), Search/Filter, Pagination.
// Uses unified endpoints: /api/expenses...
// ======================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Grid, Card, CardContent, Typography, Button, IconButton,
  Dialog, CircularProgress, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, Stack,
  AppBar, Toolbar, Slide, TextField, MenuItem, TablePagination, Divider
} from "@mui/material";
import {
  AddCircle, UndoRounded, AccountBalanceWallet, FunctionsRounded,
  Visibility, Close, Logout, ArrowBack, History
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import ExpenseForm from "../../components/ExpenseForm";
import ReturnForm from "../../components/ReturnForm";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function StaffExpensesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // ---------------- State ----------------
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [witnessMap, setWitnessMap] = useState({});
  const [balance, setBalance] = useState({ available: 0, returned: 0, total: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);

  const [openAdd, setOpenAdd] = useState(false);
  const [openReturn, setOpenReturn] = useState(false);
  const [openLogs, setOpenLogs] = useState(false);
  const [activeExpenseId, setActiveExpenseId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const myEmail = user?.email;
  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
  const time = (d) => (d ? new Date(d).toLocaleString() : "—");

  // ------------------------------------------
  // Helpers (names only for witnesses)
  // ------------------------------------------
  const getDisplayName = (email) => {
    const u = users.find((x) => x.email === email);
    return u?.nickname || u?.name || (email ? email.split("@")[0] : "—");
  };

  const statusChipColor = (s) => {
    switch ((s || "").toLowerCase()) {
      case "agreed": return "success";
      case "disagreed": return "error";
      default: return "warning";
    }
  };

  const renderWitnessCell = (exp) => {
    const w = witnessMap[exp.id];
    if (!w)
      return <Typography variant="caption" sx={{ color: "#bbb" }}>—</Typography>;
    return (
      <Stack direction="column" spacing={0.5}>
        {["witness1", "witness2"].map((key, i) => {
          const email = w[`${key}_email`];
          const status = w[`${key}_status`];
          if (!email) return <Chip key={i} size="small" label={`W${i + 1}: —`} sx={{ height: 24 }} />;
          return (
            <Chip
              key={i}
              size="small"
              label={`W${i + 1}: ${getDisplayName(email)} • ${String(status || "pending").toUpperCase()}`}
              color={statusChipColor(status)}
              sx={{ fontWeight: 600, height: 24 }}
            />
          );
        })}
      </Stack>
    );
  };

  // ------------------------------------------
  // Filtering (search + status)
  // ------------------------------------------
  const filteredRows = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    return (expenses ?? [])
      .filter((exp) => {
        const matchSearch =
          exp.purpose?.toLowerCase().includes(q) ||
          exp.sender_email?.toLowerCase().includes(q) ||
          exp.receiver_email?.toLowerCase().includes(q);
        const matchStatus =
          statusFilter === "all" || (exp.status || "").toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses, searchQuery, statusFilter]);

  // ------------------------------------------
  // Fetch Data (unified /api/expenses... endpoints)
  // ------------------------------------------
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    if (!myEmail) return;
    setLoading(true);
    try {
      const [balRes, expRes, usrRes] = await Promise.all([
        api.get(`/api/expenses/balance/${myEmail}`),
        api.get(`/api/expenses/${myEmail}`),
        api.get(`/api/expense-form/users`)
      ]);

      const b = balRes?.data ?? {};
      const available = Number(b.availableBalance ?? 0);
      const returned = Number(b.totalReturned ?? 0);
      const total = Number(b.totalBalance ?? available + returned);
      setBalance({ available, returned, total });

      const list = expRes?.data ?? [];
      setExpenses(list);
      setUsers(usrRes?.data ?? []);
      setLastUpdated(new Date());

      const ids = list.map((e) => e.id);
      if (ids.length) {
        const wRes = await api.get(`/api/witness/batch`, { params: { ids: ids.join(",") } });
        const map = {};
        for (const row of (wRes?.data ?? [])) {
          const prev = map[row.expense_id] || {};
          map[row.expense_id] = {
            ...prev,
            witness1_email: row.witness1_email ?? prev.witness1_email ?? null,
            witness2_email: row.witness2_email ?? prev.witness2_email ?? null,
            witness1_status: row.witness1_status ?? prev.witness1_status ?? null,
            witness2_status: row.witness2_status ?? prev.witness2_status ?? null,
          };
        }
        setWitnessMap(map);
      } else setWitnessMap({});
    } catch (err) {
      enqueueSnackbar("Failed to load staff expenses.", { variant: "error" });
      console.error(err);
      setExpenses([]);
      setWitnessMap({});
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------
  // Logs Modal
  // ------------------------------------------
  async function openLogsFor(expenseId) {
    setActiveExpenseId(expenseId);
    setLogsLoading(true);
    setOpenLogs(true);
    try {
      const res = await api.get(`/api/expenses/logs/${expenseId}`);
      setLogs(res?.data ?? []);
    } catch {
      enqueueSnackbar("Failed to load logs", { variant: "error" });
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  // ------------------------------------------
  // Pagination handlers
  // ------------------------------------------
  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // ------------------------------------------
  // Loading
  // ------------------------------------------
  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8, background: "#2c0a0a", minHeight: "100vh" }}>
        <CircularProgress color="warning" />
      </Box>
    );

  // ------------------------------------------
  // UI (Burgundy & Gold to match StaffDashboard)
  // ------------------------------------------
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: "#2c0a0a", color: "#fff", minHeight: "100vh" }}>
      {/* ===== Top Bar (Back one step + Logout) ===== */}
      <AppBar
        position="static"
        sx={{
          background: "linear-gradient(90deg,#4b0000,#8b0000)",
          color: "#ffcc00",
          mb: 3,
          borderRadius: 2,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <Toolbar>
          <Tooltip title="Go Back">
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Staff Expenses
          </Typography>
          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={logout}>
              <Logout />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* ===== Meta (Last updated) ===== */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.9, mb: 1 }}>
        <History sx={{ fontSize: 18, color: "#ffcc00" }} />
        <Typography variant="caption">
          Last updated: {lastUpdated ? time(lastUpdated) : "—"}
        </Typography>
        <Button
          size="small"
          onClick={loadAll}
          variant="outlined"
          color="inherit"
          sx={{ borderColor: "#ffcc00", color: "#ffcc00" }}
        >
          Refresh
        </Button>
      </Stack>

      {/* ===== Cards ===== */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: "linear-gradient(135deg,#4b0000,#a02020)", color: "#ffcc00", borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccountBalanceWallet />
                <Typography variant="h6" fontWeight={700}>Available</Typography>
              </Box>
              <Typography variant="h5" fontWeight={900} mt={1}>{fmt(balance.available)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: "linear-gradient(135deg,#7b1e3a,#c13b5b)", color: "#fff", borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <UndoRounded />
                <Typography variant="h6" fontWeight={700}>Returned</Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} mt={1}>{fmt(balance.returned)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: "linear-gradient(135deg,#843b62,#e06c9f)", color: "#fff", borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FunctionsRounded />
                <Typography variant="h6" fontWeight={800}>Total</Typography>
              </Box>
              <Typography variant="h5" fontWeight={900} mt={1}>{fmt(balance.total)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ===== Actions ===== */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 2 }}>
        <Button
          startIcon={<UndoRounded />}
          variant="contained"
          sx={{ backgroundColor: "#a02020", color: "#fff", fontWeight: 700, "&:hover": { backgroundColor: "#8b0000" } }}
          onClick={() => setOpenReturn(true)}
        >
          Return Money
        </Button>
        <Button
          startIcon={<AddCircle />}
          variant="contained"
          sx={{ backgroundColor: "#ffcc00", color: "#4b0000", fontWeight: 800, "&:hover": { backgroundColor: "#ffd633" } }}
          onClick={() => setOpenAdd(true)}
        >
          New Expense
        </Button>
      </Box>

      {/* ===== Search & Filter ===== */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
        <TextField
          label="Search by purpose/sender/receiver"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            backgroundColor: "#3a0000",
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ffcc00" },
              "&:hover fieldset": { borderColor: "#ffd633" },
              "&.Mui-focused fieldset": { borderColor: "#ffcc00" },
            },
            "& .MuiInputBase-input": { color: "#ffcc00" },
            "& .MuiInputLabel-root": { color: "#ffcc00" },
          }}
        />
        <TextField
          select
          label="Filter by status"
          variant="outlined"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{
            width: { xs: "100%", sm: 220 },
            backgroundColor: "#3a0000",
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ffcc00" },
              "&:hover fieldset": { borderColor: "#ffd633" },
              "&.Mui-focused fieldset": { borderColor: "#ffcc00" },
            },
            "& .MuiInputBase-input": { color: "#ffcc00" },
            "& .MuiInputLabel-root": { color: "#ffcc00" },
          }}
        >
          {["all", "approved", "pending", "rejected", "returned"].map((s) => (
            <MenuItem key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* ===== Table ===== */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: "auto" }}>
        <Table>
          <TableHead sx={{ background: "#4b0000" }}>
            <TableRow>
              {["Purpose", "From → To", "Amount", "Status", "Witness", "Actions"].map((h) => (
                <TableCell key={h} sx={{ color: "#ffcc00", fontWeight: 800 }}>{h}</TableCell>
              ))}
            </Row>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="#ffcc00">No records found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>{exp.purpose}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {exp.sender_email || "—"} <span style={{ color: "#bbb" }}>→</span> {exp.receiver_email || "—"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#bbb" }}>{time(exp.created_at)}</Typography>
                  </TableCell>
                  <TableCell>{fmt(exp.amount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={(exp.status || "pending").toUpperCase()}
                      color={
                        exp.status === "approved"
                          ? "success"
                          : exp.status === "rejected"
                          ? "error"
                          : exp.status === "returned"
                          ? "info"
                          : "warning"
                      }
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>{renderWitnessCell(exp)}</TableCell>
                  <TableCell>
                    <Tooltip title="View Logs">
                      <IconButton color="warning" onClick={() => openLogsFor(exp.id)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredRows.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            sx={{ color: "#ffcc00" }}
          />
        </Box>
      )}

      {/* ===== Dialogs ===== */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm" TransitionComponent={Transition}>
        <AppBar sx={{ backgroundColor: "#4b0000", color: "#ffcc00" }}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>➕ Add Expense</Typography>
            <IconButton color="inherit" onClick={() => setOpenAdd(false)}><Close /></IconButton>
          </Toolbar>
        </AppBar>
        {openAdd && (
          <ExpenseForm
            users={users}
            user={user}
            balances={balance}
            onClose={() => setOpenAdd(false)}
            onSaved={loadAll}
          />
        )}
      </Dialog>

      <Dialog open={openReturn} onClose={() => setOpenReturn(false)} fullWidth maxWidth="sm" TransitionComponent={Transition}>
        <AppBar sx={{ backgroundColor: "#4b0000", color: "#ffcc00" }}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>↩️ Return Money</Typography>
            <IconButton color="inherit" onClick={() => setOpenReturn(false)}><Close /></IconButton>
          </Toolbar>
        </AppBar>
        {openReturn && (
          <ReturnForm
            users={users}
            user={user}
            balances={balance}
            onClose={() => setOpenReturn(false)}
            onSaved={loadAll}
          />
        )}
      </Dialog>

      <Dialog open={openLogs} onClose={() => setOpenLogs(false)} fullWidth maxWidth="sm">
        <Box sx={{ p: 2, background: "#4b0000", color: "#ffcc00" }}>
          <Typography variant="h6" fontWeight={800}>Expense Logs</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Expense ID: {activeExpenseId ?? "—"}
          </Typography>
        </Box>
        <Box sx={{ p: 2, background: "#2c0a0a", color: "#fff" }}>
          {logsLoading ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <CircularProgress color="warning" />
            </Box>
          ) : logs.length === 0 ? (
            <Typography sx={{ color: "#bbb", textAlign: "center" }}>No logs available.</Typography>
          ) : (
            logs.map((log, i) => (
              <Box key={i}>
                <Typography variant="subtitle2" fontWeight={800}>{log.actor_email}</Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>{log.log_message}</Typography>
                <Typography variant="caption" sx={{ color: "#bbb" }}>{time(log.timestamp)}</Typography>
                <Divider sx={{ my: 1.25, borderColor: "#6b0000" }} />
              </Box>
            ))
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
