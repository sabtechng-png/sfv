// ======================================================================
// SFV Tech | Expenses Management Page (Improved v3 - Available-only)
// Rules:
//  • No returned balance pool
//  • Shows Available and Total (same as available)
//  • Actions (Accept/Reject/Return) work with updated backend
//  • Witness logic and logs preserved
// ======================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Grid, Card, CardContent, Typography, Button, IconButton,
  Dialog, CircularProgress, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, AppBar,
  Toolbar, Slide, Divider, Stack, TextField, MenuItem, TablePagination
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

  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
  const time = (d) => new Date(d).toLocaleString();
  const myEmail = user?.email;

  // ------------------------------------------
  // Helpers for witness display
  // ------------------------------------------
  const getDisplayName = (email) => {
    const u = users.find((x) => x.email === email);
    if (!u) return "—";
    return u.nickname || u.name || email.split("@")[0];
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

  // Always show both witnesses (even if null)
  const renderChip = (email, status, label) => {
    if (!email)
      return (
        <Chip
          size="small"
          label={`${label}: —`}
          sx={{ height: 24, background: "rgba(255,255,255,0.1)" }}
        />
      );

    const dispName = getDisplayName(email);
    const chipLabel = `${label}: ${dispName} • ${(status || "pending").toUpperCase()}`;
    let chipColor = "warning";
    if (status === "agreed" || status === "approved") chipColor = "success";
    if (status === "disagreed" || status === "rejected") chipColor = "error";

    return (
      <Chip
        size="small"
        label={chipLabel}
        color={chipColor}
        sx={{ fontWeight: 600, height: 24 }}
      />
    );
  };

  return (
    <Stack direction="column" spacing={0.5}>
      {renderChip(w?.witness1_email, w?.witness1_status, "W1")}
      {renderChip(w?.witness2_email, w?.witness2_status, "W2")}
    </Stack>
  );
};

  // ------------------------------------------
  // Load data
  // ------------------------------------------
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [balRes, expRes, usrRes] = await Promise.all([
        api.get(`/api/engineer/expenses/balance/${myEmail}`),
        api.get(`/api/engineer/expenses/${myEmail}`),
        api.get(`/api/expense-form/users`)
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

  // ------------------------------------------
  // Actions (Approve/Reject)
  // ------------------------------------------
  async function handleAction(id, status) {
    try {
      await api.put(`/api/engineer/expenses/status/${id}`, {
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
      const res = await api.get(`/api/engineer/expenses/logs/${expenseId}`);
      setLogs(res?.data ?? []);
    } catch {
      enqueueSnackbar("Failed to load logs", { variant: "error" });
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  // ------------------------------------------
  // Filters
  // ------------------------------------------
  const filteredRows = useMemo(() => {
    return (expenses ?? [])
      .filter((exp) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          (exp.purpose || "").toLowerCase().includes(q) ||
          (exp.sender_email || "").toLowerCase().includes(q) ||
          (exp.receiver_email || "").toLowerCase().includes(q);
        const matchStatus =
          statusFilter === "all" || (exp.status || "").toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses, searchQuery, statusFilter]);

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

  if (loading)
    return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
      <CircularProgress color="warning" />
    </Box>;

  // ------------------------------------------
  // UI
  // ------------------------------------------
  return (
    <Box sx={{ p: 4, background: "#001f3f", color: "#fff", minHeight: "100vh" }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>💰 Expense Management</Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.85 }}>
          <History sx={{ fontSize: 18 }} />
          <Typography variant="caption">
            Last updated: {lastUpdated ? time(lastUpdated) : "—"}
          </Typography>
          <Button size="small" onClick={loadAll} variant="outlined" color="inherit">Refresh</Button>
        </Stack>
      </Stack>

      {/* Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: "#003b15", color: "#fff", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>Available Balance</Typography>
              <Typography variant="h5" fontWeight={800}>{fmt(balance.available)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: "#f5c400", color: "#0b1a33", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800}>Total (Usable)</Typography>
              <Typography variant="h5" fontWeight={900}>{fmt(balance.total)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 2 }}>
        <Button startIcon={<UndoRounded />} variant="contained"
          sx={{ backgroundColor: "#2196f3", color: "#fff", fontWeight: 700 }}
          onClick={() => setOpenReturn(true)}>Return Money</Button>
        <Button startIcon={<AddCircle />} variant="contained"
          sx={{ backgroundColor: "#f5c400", color: "#0b1a33", fontWeight: 700 }}
          onClick={() => setOpenAdd(true)}>New Expense</Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ background: "#0b1a33" }}>
            <TableRow>
              {["Purpose", "From → To", "Type", "Amount", "Status", "Witness Action", "Actions"].map((h) => (
                <TableCell key={h} sx={{ color: "#f5c400", fontWeight: 800 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((exp) => (
              <TableRow key={exp.id}>
                <TableCell>{exp.purpose}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {exp.sender_email} → {exp.receiver_email}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#888" }}>{time(exp.created_at)}</Typography>
                </TableCell>
                <TableCell><Chip label={deriveType(exp)} color={typeColor(deriveType(exp))} size="small" /></TableCell>
                <TableCell>{fmt(exp.amount)}</TableCell>
                <TableCell>
                  <Chip label={String(exp.status || "").toUpperCase()} color={
                    exp.status === "approved" ? "success" :
                      exp.status === "rejected" ? "error" :
                        exp.status === "returned" ? "info" : "warning"} />
                </TableCell>
                <TableCell>{renderWitnessCell(exp)}</TableCell>

                {/* Actions */}
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

      {/* Dialogs */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm" TransitionComponent={Transition}>
        <AppBar position="relative" sx={{ backgroundColor: "#002b5c", color: "#fff" }}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>➕ Add Expense</Typography>
            <IconButton edge="end" color="inherit" onClick={() => setOpenAdd(false)}><Close /></IconButton>
          </Toolbar>
        </AppBar>
        {openAdd && <ExpenseForm users={users} user={user} balances={balance} onClose={() => setOpenAdd(false)} onSaved={loadAll} />}
      </Dialog>

      <Dialog open={openReturn} onClose={() => setOpenReturn(false)} fullWidth maxWidth="sm" TransitionComponent={Transition}>
        <AppBar position="relative" sx={{ backgroundColor: "#002b5c", color: "#fff" }}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>↩️ Return Money</Typography>
            <IconButton edge="end" color="inherit" onClick={() => setOpenReturn(false)}><Close /></IconButton>
          </Toolbar>
        </AppBar>
        {openReturn && <ReturnForm users={users} user={user} balances={balance} onClose={() => setOpenReturn(false)} onSaved={loadAll} />}
      </Dialog>

      <Dialog open={openLogs} onClose={() => setOpenLogs(false)} fullWidth maxWidth="sm">
        <Box sx={{ p: 2, background: "#002b5c", color: "#fff" }}>
          <Typography variant="h6" fontWeight={800}>Expense Logs</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>Expense ID: {activeExpenseId ?? "—"}</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {logsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress /></Box>
          ) : logs.length === 0 ? (
            <Typography sx={{ color: "gray", textAlign: "center", py: 2 }}>No logs available.</Typography>
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
