// ======================================================================
// SFV Tech | Expenses Management Page (Full Rebuild • Pagination + Filter)
// - Unified schema (sender_email / receiver_email)
// - Search + filter + pagination
// - Hydration with balance cards
// - Clean modals for add, return, and logs
// ======================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  CircularProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  AppBar,
  Toolbar,
  Slide,
  Divider,
  Stack,
  TextField,
  MenuItem,
  TablePagination,
} from "@mui/material";
import {
  AddCircle,
  UndoRounded,
  AccountBalanceWallet,
  FunctionsRounded,
  CheckCircle,
  Cancel,
  Visibility,
  Close,
  History,
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
  const [balance, setBalance] = useState({ available: 0, returned: 0, total: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);

  const [openAdd, setOpenAdd] = useState(false);
  const [openReturn, setOpenReturn] = useState(false);

  // Logs modal
  const [openLogs, setOpenLogs] = useState(false);
  const [activeExpenseId, setActiveExpenseId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Helpers
  const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
  const time = (d) => new Date(d).toLocaleString();
  const myEmail = user?.email;

  // ------------------------------------------
  // Data filtering (search + filter)
  // ------------------------------------------
  const filteredRows = useMemo(() => {
    return (expenses ?? [])
      .filter((exp) => {
        const matchSearch =
          exp.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.sender_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.receiver_email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus =
          statusFilter === "all" || exp.status?.toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [expenses, searchQuery, statusFilter]);

  // Map expense to display type
  function deriveType(exp) {
    const t = exp?.expense_type;
    if (t === "transfer") return exp.sender_email === myEmail ? "TRANSFER" : "RECEIVED";
    if (t === "return") return "RETURN";
    if (t === "refund") return "REFUND";
    return "SPENT";
  }

  function typeColor(t) {
    switch (t) {
      case "TRANSFER":
        return "secondary";
      case "RECEIVED":
        return "success";
      case "RETURN":
        return "primary";
      case "REFUND":
        return "info";
      default:
        return "warning";
    }
  }

  // ------------------------------------------
  // Hydration
  // ------------------------------------------
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [balRes, expRes, usrRes] = await Promise.all([
        api.get(`/api/engineer/expenses/balance/${myEmail}`),
        api.get(`/api/engineer/expenses/${myEmail}`),
        api.get(`/api/expense-form/users`),
      ]);

     const b = balRes?.data ?? {};
const available = Number(b.availableBalance ?? 0);
const returned = Number(b.totalReturned ?? 0);
const total = Number(b.totalBalance ?? available + returned);


      setBalance({ available, returned, total });
      setExpenses(expRes?.data ?? []);
      setUsers(usrRes?.data ?? []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Hydration error:", err?.response?.data || err.message);
      enqueueSnackbar("Failed to load data", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------
  // Approve / Reject
  // ------------------------------------------
  async function handleApprove(id) {
    try {
      await api.put(`/api/engineer/expenses/status/${id}`, {
        status: "approved",
        actor_email: myEmail,
      });
      enqueueSnackbar("Expense approved", { variant: "success" });
      await loadAll();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "Approval failed", { variant: "error" });
    }
  }

  async function handleReject(id) {
    try {
      await api.put(`/api/engineer/expenses/status/${id}`, {
        status: "rejected",
        actor_email: myEmail,
      });
      enqueueSnackbar("Expense rejected (refund logged to sender)", { variant: "info" });
      await loadAll();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "Rejection failed", { variant: "error" });
    }
  }

  // ------------------------------------------
  // Logs
  // ------------------------------------------
  async function openLogsFor(expenseId) {
    setActiveExpenseId(expenseId);
    setLogsLoading(true);
    setOpenLogs(true);
    try {
      const res = await api.get(`/api/engineer/expenses/logs/${expenseId}`);
      setLogs(res?.data ?? []);
    } catch (err) {
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
  // UI RENDER
  // ------------------------------------------
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress color="warning" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, background: "#001f3f", color: "#fff", minHeight: "100vh" }}>
      {/* Header */}
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          💰 Expense Management
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.85 }}>
          <History sx={{ fontSize: 18 }} />
          <Typography variant="caption">
            Last updated: {lastUpdated ? time(lastUpdated) : "—"}
          </Typography>
          <Button size="small" onClick={loadAll} sx={{ ml: 1 }} variant="outlined" color="inherit">
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* BALANCE CARDS */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: "#003b15", color: "#fff", borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccountBalanceWallet fontSize="large" color="success" />
                <Typography variant="h6" fontWeight={700}>
                  Available
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} mt={1}>
                {fmt(balance.available)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: "#002b5c", color: "#fff", borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <UndoRounded fontSize="large" color="info" />
                <Typography variant="h6" fontWeight={700}>
                  Returned
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} mt={1}>
                {fmt(balance.returned)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: "#f5c400", color: "#0b1a33", borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FunctionsRounded fontSize="large" />
                <Typography variant="h6" fontWeight={800}>
                  Total Balance
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={900} mt={1}>
                {fmt(balance.total)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ACTION BUTTONS */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 2 }}>
        <Button
          startIcon={<UndoRounded />}
          variant="contained"
          sx={{
            backgroundColor: "#2196f3",
            color: "#fff",
            fontWeight: 700,
            "&:hover": { backgroundColor: "#1976d2" },
          }}
          onClick={() => setOpenReturn(true)}
        >
          Return Money
        </Button>

        <Button
          startIcon={<AddCircle />}
          variant="contained"
          sx={{
            backgroundColor: "#f5c400",
            color: "#0b1a33",
            fontWeight: 700,
            "&:hover": { backgroundColor: "#e6b800" },
          }}
          onClick={() => setOpenAdd(true)}
        >
          New Expense
        </Button>
      </Box>

      {/* SEARCH + FILTER */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
        }}
      >
        <TextField
          label="Search expenses..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: "100%", sm: "60%", md: "40%" } }}
        />
        <TextField
          select
          label="Filter by status"
          variant="outlined"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: { xs: "100%", sm: "35%", md: "25%" } }}
        >
          {["all", "approved", "pending", "rejected", "returned"].map((status) => (
            <MenuItem key={status} value={status}>
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* TABLE */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: "auto", background: "#fff" }}>
        <Table>
          <TableHead sx={{ background: "#0b1a33" }}>
            <TableRow>
              {["Purpose", "From → To", "Type", "Amount", "Status", "Actions"].map((h) => (
                <TableCell key={h} sx={{ color: "#f5c400", fontWeight: 800 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((exp) => {
                const t = deriveType(exp);
                const approvable = exp.receiver_email === myEmail && exp.status === "pending";
                return (
                  <TableRow key={exp.id}>
                    <TableCell>{exp.purpose}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {exp.sender_email || "—"}
                        <span style={{ color: "#999", fontWeight: 400 }}> → </span>
                        {exp.receiver_email || "—"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#777" }}>
                        {time(exp.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={t} color={typeColor(t)} size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>{fmt(exp.amount)}</TableCell>
                    <TableCell>
                      <Chip
                        label={String(exp.status || "").toUpperCase()}
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
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {approvable && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton color="success" onClick={() => handleApprove(exp.id)}>
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject (refund to sender)">
                              <IconButton color="error" onClick={() => handleReject(exp.id)}>
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="View Logs">
                          <IconButton color="warning" onClick={() => openLogsFor(exp.id)}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        {filteredRows.length === 0 && (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">No expenses found.</Alert>
          </Box>
        )}

        {/* Pagination */}
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
            />
          </Box>
        )}
      </TableContainer>

      {/* ADD EXPENSE MODAL */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm" TransitionComponent={Transition}>
        <AppBar position="relative" sx={{ backgroundColor: "#002b5c", color: "#fff", borderBottom: "2px solid #f5c400" }}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              ➕ Add Expense
            </Typography>
            <IconButton edge="end" color="inherit" onClick={() => setOpenAdd(false)}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        {openAdd && <ExpenseForm users={users} user={user} balances={balance} onClose={() => setOpenAdd(false)} onSaved={loadAll} />}
      </Dialog>

      {/* RETURN MONEY MODAL */}
      <Dialog open={openReturn} onClose={() => setOpenReturn(false)} fullWidth maxWidth="sm" TransitionComponent={Transition}>
        <AppBar position="relative" sx={{ backgroundColor: "#002b5c", color: "#fff", borderBottom: "2px solid #2196f3" }}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              ↩️ Return Money
            </Typography>
            <IconButton edge="end" color="inherit" onClick={() => setOpenReturn(false)}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        {openReturn && <ReturnForm users={users} user={user} balances={balance} onClose={() => setOpenReturn(false)} onSaved={loadAll} />}
      </Dialog>

      {/* LOGS MODAL */}
      <Dialog open={openLogs} onClose={() => setOpenLogs(false)} fullWidth maxWidth="sm">
        <Box sx={{ p: 2, background: "#002b5c", color: "#fff" }}>
          <Typography variant="h6" fontWeight={800}>
            Expense Logs
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Expense ID: {activeExpenseId ?? "—"}
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {logsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Typography sx={{ color: "gray", textAlign: "center", py: 2 }}>No logs available.</Typography>
          ) : (
            logs.map((log) => (
              <Box key={log.id ?? `${log.actor_email}-${log.timestamp}`}>
                <Typography variant="subtitle2" fontWeight={800}>
                  {log.actor_email}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {log.log_message}
                </Typography>
                <Typography variant="caption" sx={{ color: "gray" }}>
                  {time(log.timestamp)}
                </Typography>
                <Divider sx={{ my: 1.25 }} />
              </Box>
            ))
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
