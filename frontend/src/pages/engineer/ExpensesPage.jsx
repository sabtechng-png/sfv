// ======================================================================
// SFV Tech | Expenses Management (Role-Themed Responsive)
// - Dynamic theme per role (admin, engineer, staff, storekeeper, apprentice)
// - Retains all logic, features, and dialogs
// ======================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Grid, Card, CardContent, Typography, Button, IconButton,
  Dialog, CircularProgress, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, AppBar,
  Toolbar, Slide, Divider, Stack, TextField, TablePagination
} from "@mui/material";
import {
  AddCircle, UndoRounded, History,
  CheckCircle, Cancel, Visibility, Close
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import ExpenseForm from "../../components/ExpenseForm";
import ReturnForm from "../../components/ReturnForm";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// ---------- Role-Based Themes ----------
const roleThemes = {
  admin: {
    bg: "linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)",
    accent: "#ff6b00",
    cardA: "linear-gradient(135deg,#ff6b00,#993d00)",
    cardB: "linear-gradient(135deg,#ffd740,#a67c00)",
  },
  engineer: {
    bg: "linear-gradient(180deg,#071a2c 0%,#001220 100%)",
    accent: "#f5c400",
    cardA: "linear-gradient(135deg,#0b5d2b,#0d3a20)",
    cardB: "linear-gradient(135deg,#f5c400,#a67c00)",
  },
  staff: {
    bg: "linear-gradient(180deg,#1c0030 0%,#0a0014 100%)",
    accent: "#b84cff",
    cardA: "linear-gradient(135deg,#7a00cc,#3a0066)",
    cardB: "linear-gradient(135deg,#b84cff,#7a00cc)",
  },
  storekeeper: {
    bg: "linear-gradient(180deg,#002a12 0%,#000c06 100%)",
    accent: "#26ff92",
    cardA: "linear-gradient(135deg,#008a3d,#004d24)",
    cardB: "linear-gradient(135deg,#26ff92,#00cc66)",
  },
  apprentice: {
    bg: "linear-gradient(180deg,#001b33 0%,#000a14 100%)",
    accent: "#00c3ff",
    cardA: "linear-gradient(135deg,#007ab8,#003c5c)",
    cardB: "linear-gradient(135deg,#00c3ff,#007ab8)",
  },
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [witnessMap, setWitnessMap] = useState({});
  const [balance, setBalance] = useState({ available: 0, total: 0 });
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
  const role = (user?.role || "engineer").toLowerCase();
  const theme = roleThemes[role] || roleThemes.engineer;

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
  const time = (d) => new Date(d).toLocaleString();

  // ---------- Helpers ----------
  const getDisplayName = (email) => {
    const u = users.find((x) => x.email === email);
    if (!u) return email || "—";
    return u.nickname || u.name || email.split("@")[0];
  };

  const renderWitnessCell = (exp) => {
    const w = witnessMap[exp.id];
    const renderChip = (email, status, label) => {
      if (!email)
        return (
          <Chip
            size="small"
            label={`${label} —`}
            sx={{ height: 24, background: "rgba(255,255,255,0.12)" }}
          />
        );
      const disp = getDisplayName(email);
      const s = (status || "pending").toLowerCase();
      const color = s === "agreed" || s === "approved" ? "success" : s === "rejected" || s === "disagreed" ? "error" : "warning";
      return (
        <Chip
          size="small"
          label={`${label}: ${disp} • ${s.toUpperCase()}`}
          color={color}
          sx={{ height: 24, fontWeight: 600 }}
        />
      );
    };
    return (
      <Stack spacing={0.5}>
        {renderChip(w?.witness1_email, w?.witness1_status, "W1")}
        {renderChip(w?.witness2_email, w?.witness2_status, "W2")}
      </Stack>
    );
  };

  // ---------- Load ----------
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [balRes, expRes, usrRes] = await Promise.all([
        api.get(`/api/expenses/balance/${myEmail}`),
        api.get(`/api/expenses/${myEmail}`),
        api.get(`/api/expense-form/users`),
      ]);
      const b = balRes?.data ?? {};
      const available = Number(b.availableBalance ?? 0);
      const total = Number(b.totalBalance ?? available);
      setBalance({ available, total });
      setExpenses(expRes?.data ?? []);
      setUsers(usrRes?.data ?? []);
      setLastUpdated(new Date());

      const ids = (expRes?.data ?? []).map((e) => e.id);
      if (ids.length) {
        const wRes = await api.get(`/api/witness/batch`, { params: { ids: ids.join(",") } });
        const map = {};
        for (const row of (wRes?.data ?? [])) {
          const prev = map[row.expense_id] || {};
          map[row.expense_id] = {
            expense_id: row.expense_id,
            witness1_email: prev.witness1_email ?? row.witness1_email ?? null,
            witness2_email: prev.witness2_email ?? row.witness2_email ?? null,
            witness1_status: prev.witness1_status ?? row.witness1_status ?? null,
            witness2_status: prev.witness2_status ?? row.witness2_status ?? null,
          };
        }
        setWitnessMap(map);
      } else setWitnessMap({});
    } catch (err) {
      console.error("Load error:", err);
      enqueueSnackbar("Failed to load data", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  // ---------- Actions ----------
  async function handleAction(id, status) {
    try {
      await api.put(`/api/expenses/status/${id}`, {
        status,
        actor_email: myEmail,
      });
      enqueueSnackbar(`Expense ${status} successfully.`, { variant: "success" });
      await loadAll();
    } catch (err) {
      console.error("Action Error:", err);
      enqueueSnackbar(err?.response?.data?.error || "Failed to update status.", { variant: "error" });
    }
  }

  async function openLogsFor(expenseId) {
    setActiveExpenseId(expenseId);
    setLogsLoading(true);
    setOpenLogs(true);
    try {
      const res = await api.get(`/api/expense-logs/${expenseId}`);
      setLogs(res?.data ?? []);
    } catch {
      enqueueSnackbar("Failed to load logs", { variant: "error" });
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  // ---------- Derivations ----------
  function deriveType(exp) {
    const t = exp?.expense_type;
    if (t === "transfer") return exp.sender_email === myEmail ? "TRANSFER" : "RECEIVED";
    if (t === "return") return "RETURN";
    if (t === "refund") return "REFUND";
    return "SPENT";
  }
  function typeColor(t) {
    switch (t) {
      case "TRANSFER": return "secondary";
      case "RECEIVED": return "success";
      case "RETURN": return "primary";
      case "REFUND": return "info";
      default: return "warning";
    }
  }

  const filteredRows = useMemo(() => {
    return (expenses ?? [])
      .filter((exp) => {
        const q = (searchQuery || "").toLowerCase();
        const senderName = getDisplayName(exp.sender_email).toLowerCase();
        const receiverName = getDisplayName(exp.receiver_email).toLowerCase();
        const matchSearch =
          (exp.purpose || "").toLowerCase().includes(q) ||
          (exp.sender_email || "").toLowerCase().includes(q) ||
          (exp.receiver_email || "").toLowerCase().includes(q) ||
          senderName.includes(q) ||
          receiverName.includes(q);
        const matchStatus =
          statusFilter === "all" || (exp.status || "").toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses, searchQuery, statusFilter, users]);

  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const handleBack = () => window.history.back();
  const handleLogout = () => {
    localStorage.clear();
    enqueueSnackbar("Logged out successfully", { variant: "info" });
    window.location.href = "/";
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress color="warning" />
      </Box>
    );

  // ---------- UI ----------
  return (
    <Box sx={{ p: 3, minHeight: "100vh", background: theme.bg, color: "#fff" }}>
      {/* Top bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          p: 1.5,
          borderRadius: 2,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button onClick={handleBack} variant="outlined" color="inherit">Back</Button>
          <Typography variant="h6" fontWeight={800} sx={{ ml: 1 }}>
            💰 Expense Management
          </Typography>
          <Typography variant="caption" sx={{ ml: 1, color: theme.accent }}>
            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <History sx={{ fontSize: 18, opacity: 0.8 }} />
          <Typography variant="caption" sx={{ opacity: 0.8, mr: 1 }}>
            {lastUpdated ? `Updated: ${time(lastUpdated)}` : "—"}
          </Typography>
          <Button size="small" onClick={loadAll} variant="outlined" color="inherit">Refresh</Button>
          <Button
            size="small"
            onClick={handleLogout}
            sx={{ ml: 1, background: theme.accent, color: "#0b1a33", fontWeight: 800, "&:hover": { opacity: 0.9 } }}
          >
            Logout
          </Button>
        </Stack>
      </Box>

      {/* Balance cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: theme.cardA, color: "#fff", borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ opacity: 0.7, letterSpacing: 1 }}>AVAILABLE</Typography>
              <Typography variant="h4" fontWeight={900}>{fmt(balance.available)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: theme.cardB, color: "#0b1a33", borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ opacity: 0.75, letterSpacing: 1 }}>TOTAL (USABLE)</Typography>
              <Typography variant="h4" fontWeight={900}>{fmt(balance.total)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search + Filter */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} mb={2}>
        <TextField
          label="Search (purpose, name, email)"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: 1,
            input: { color: "#fff" },
          }}
          InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <Chip
              key={s}
              label={s.toUpperCase()}
              onClick={() => { setStatusFilter(s); setPage(0); }}
              sx={{
                background: statusFilter === s ? theme.accent : "rgba(255,255,255,0.15)",
                color: statusFilter === s ? "#0b1a33" : "#fff",
                fontWeight: 800,
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
          <Button
            startIcon={<UndoRounded />}
            onClick={() => setOpenReturn(true)}
            sx={{ background: "#133a7c", color: "#fff", fontWeight: 700, "&:hover": { background: "#1a4da3" } }}
          >
            Return Money
          </Button>
          <Button
            startIcon={<AddCircle />}
            onClick={() => setOpenAdd(true)}
            sx={{ background: theme.accent, color: "#0b1a33", fontWeight: 900, "&:hover": { opacity: 0.85 } }}
          >
            New Expense
          </Button>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: "hidden", boxShadow: 2 }}>
        <Table>
          <TableHead sx={{ background: "#0b1a33" }}>
            <TableRow>
              {["Purpose", "From → To", "Type", "Amount", "Status", "Witness Action", "Actions"].map((h) => (
                <TableCell key={h} sx={{ color: theme.accent, fontWeight: 800 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>{exp.purpose}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      <Tooltip title={exp.sender_email}><span>{getDisplayName(exp.sender_email)}</span></Tooltip>
                      {"  →  "}
                      <Tooltip title={exp.receiver_email}><span>{getDisplayName(exp.receiver_email)}</span></Tooltip>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#9aa8bd" }}>
                      {time(exp.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={deriveType(exp)} color={typeColor(deriveType(exp))} size="small" />
                  </TableCell>
                  <TableCell>{fmt(exp.amount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={String(exp.status || "").toUpperCase()}
                      color={
                        exp.status === "approved" ? "success" :
                        exp.status === "rejected" ? "error" :
                        exp.status === "returned" ? "info" : "warning"
                      }
                    />
                  </TableCell>
                  <TableCell>{renderWitnessCell(exp)}</TableCell>
                  <TableCell>
                    {exp.receiver_email === myEmail && exp.status === "pending" && exp.expense_type === "transfer" && (
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Accept Transfer">
                          <IconButton color="success" onClick={() => handleAction(exp.id, "approved")}><CheckCircle /></IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Transfer">
                          <IconButton color="error" onClick={() => handleAction(exp.id, "rejected")}><Cancel /></IconButton>
                        </Tooltip>
                      </Stack>
                    )}

                    {exp.receiver_email === myEmail && exp.status === "pending" && exp.expense_type === "return" && (
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Accept Return">
                          <IconButton color="success" onClick={() => handleAction(exp.id, "approved")}><CheckCircle /></IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Return">
                          <IconButton color="error" onClick={() => handleAction(exp.id, "rejected")}><Cancel /></IconButton>
                        </Tooltip>
                      </Stack>
                    )}

                    {(exp.receiver_email !== myEmail || exp.status !== "pending") && (
                      <Tooltip title="View Logs">
                        <IconButton color="warning" onClick={() => openLogsFor(exp.id)}><Visibility /></IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredRows.length}
        page={page}
        onPageChange={(_e, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        sx={{ color: "#fff" }}
      />

      {/* Dialogs (Return, Add Expense, Logs) */}
      <Dialog open={openReturn} onClose={() => setOpenReturn(false)} fullWidth maxWidth="sm" TransitionComponent={Transition}>
        <AppBar position="relative" sx={{ backgroundColor: "#002b5c", color: "#fff" }}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>↩️ Return Money</Typography>
            <IconButton edge="end" color="inherit" onClick={() => setOpenReturn(false)}><Close /></IconButton>
          </Toolbar>
        </AppBar>
        {openReturn && (
          <ReturnForm users={users} user={user} balances={balance} onClose={() => setOpenReturn(false)} onSaved={loadAll} />
        )}
      </Dialog>

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm" TransitionComponent={Transition}>
        <AppBar position="relative" sx={{ backgroundColor: "#002b5c", color: "#fff" }}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>➕ Add Expense</Typography>
            <IconButton edge="end" color="inherit" onClick={() => setOpenAdd(false)}><Close /></IconButton>
          </Toolbar>
        </AppBar>
        {openAdd && (
          <ExpenseForm users={users} user={user} balances={balance} onClose={() => setOpenAdd(false)} onSaved={loadAll} />
        )}
      </Dialog>

      <Dialog open={openLogs} onClose={() => setOpenLogs(false)} fullWidth maxWidth="sm">
        <Box sx={{ p: 2, background: "#002b5c", color: "#fff" }}>
          <Typography variant="h6" fontWeight={800}>Expense Logs</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>Expense ID: {activeExpenseId ?? "—"}</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {logsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Typography sx={{ color: "gray", textAlign: "center", py: 2 }}>
              No logs available.
            </Typography>
          ) : (
            logs.map((log, idx) => (
              <Box key={log.id ?? `${log.actor_email}-${log.timestamp}-${idx}`}>
                <Typography variant="subtitle2" fontWeight={800}>{log.actor_email}</Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>{log.log_message}</Typography>
                <Typography variant="caption" sx={{ color: "gray" }}>{time(log.timestamp)}</Typography>
                <Divider sx={{ my: 1.25 }} />
              </Box>
            ))
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
