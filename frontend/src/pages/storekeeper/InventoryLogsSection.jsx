// ============================================================
// SFV Tech | Inventory Logs Page (Standalone + Auto Load)
// ============================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Pagination,
} from "@mui/material";
import { useSnackbar } from "notistack";
import api from "../../utils/api";

export default function InventoryLogsSection({ role = "storekeeper" }) {
  const { enqueueSnackbar } = useSnackbar();
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const COLORS = {
    pageBg: "#f6fff8",
    text: "#243b2e",
    accent: "#00c896",
    accentDark: "#00806a",
    border: "#b9fbc0",
  };

  // === Fetch logs on mount ===
  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const token = localStorage.getItem("token");
     const res = await api.get(`/api/inventory/logs?page=${page}&limit=${rowsPerPage}`, {
  headers: { Authorization: `Bearer ${token}` },
});
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error("❌ Failed to fetch logs:", err);
      enqueueSnackbar("Failed to load logs", { variant: "error" });
    } finally {
      setLogsLoading(false);
    }
  };

useEffect(() => {
  fetchLogs();
}, [page]);

  // === CSV export ===
  const exportCSV = () => {
    if (!logs.length) {
      enqueueSnackbar("No logs available for export", { variant: "warning" });
      return;
    }
    const csvData = logs.map((l) => ({
      Action: l.action,
      Name: l.item_name,
      Category: l.category,
      Size: l.size,
      Old_Qty: l.old_quantity ?? "",
      New_Qty: l.new_quantity ?? "",
      User: l.user_email,
      Date: new Date(l.log_date).toLocaleString(),
	  Time: "",
    }));
    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((r) => Object.values(r).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_logs.csv";
    a.click();
  };

  // === Filtering ===
  const filteredLogs = useMemo(() => {
    return logs
      .filter(
        (l) =>
          (logFilter === "All" || l.action === logFilter) &&
          Object.values(l)
            .join(" ")
            .toLowerCase()
            .includes(logSearch.toLowerCase())
      )
      .filter((l) => {
        if (dateFrom && new Date(l.log_date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(l.log_date) > new Date(dateTo)) return false;
        return true;
      });
  }, [logs, logFilter, logSearch, dateFrom, dateTo]);

  // === Pagination slice ===
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <Box
      sx={{
        background: COLORS.pageBg,
        minHeight: "100vh",
        p: 3,
        color: COLORS.text,
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h5" fontWeight={800} color={COLORS.accentDark}>
          📜 Inventory Logs
        </Typography>
        <Button
          variant="contained"
          sx={{
            background: COLORS.accentDark,
            fontWeight: 600,
            color: "#fff",
            px: 3,
            "&:hover": { background: COLORS.accent },
          }}
          onClick={exportCSV}
        >
          ⬇️ Export CSV
        </Button>
      </Stack>

      {/* Filters */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <TextField
          label="Search"
          placeholder="Search by item, user..."
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <TextField
          select
          label="Action"
          size="small"
          value={logFilter}
          onChange={(e) => setLogFilter(e.target.value)}
          sx={{ width: 150 }}
        >
          {["All", "ADD", "UPDATE", "DELETE"].map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          label="From"
          InputLabelProps={{ shrink: true }}
          size="small"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          sx={{ width: 150 }}
        />
        <TextField
          type="date"
          label="To"
          InputLabelProps={{ shrink: true }}
          size="small"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          sx={{ width: 150 }}
        />
      </Stack>

      {/* Table */}
      <Box
        sx={{
          background: "#fff",
          borderRadius: 3,
          boxShadow: "0 6px 15px rgba(0,0,0,.08)",
          p: 2.5,
        }}
      >
        {logsLoading ? (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CircularProgress color="success" />
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {[
                    "Action",
                    "Item Name",
                    "Category",
                    "Size",
                    "Old Qty",
                    "New Qty",
                    "User",
                    "Date",
                  ].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedLogs.map((log, i) => (
                  <TableRow
                    key={i}
                    hover
                    sx={{
                      backgroundColor:
                        log.action === "ADD"
                          ? "#e8f5e9"
                          : log.action === "UPDATE"
                          ? "#fff8e1"
                          : "#ffebee",
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={log.action}
                        color={
                          log.action === "ADD"
                            ? "success"
                            : log.action === "UPDATE"
                            ? "warning"
                            : "error"
                        }
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>{log.item_name}</TableCell>
                    <TableCell>{log.category}</TableCell>
                    <TableCell>{log.size}</TableCell>
                    <TableCell>{log.old_quantity ?? "-"}</TableCell>
                    <TableCell>{log.new_quantity ?? "-"}</TableCell>
                    <TableCell>{log.user_email}</TableCell>
                    <TableCell>
                       {log.log_date ? new Date(log.log_date).toLocaleString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                color="primary"
                onChange={(e, val) => setPage(val)}
                showFirstButton
                showLastButton
              />
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}
