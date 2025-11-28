// ============================================================
// SFV Tech | Storekeeper Requests Page (Final Enhanced)
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box, Typography, Stack, IconButton, Tooltip, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Pagination
} from "@mui/material";
import {
  Refresh, Logout, ArrowBack, Done, Close, Visibility, Search
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

export default function StorekeeperRequestsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openApprove, setOpenApprove] = useState(false);
  const [openDeny, setOpenDeny] = useState(false);
  const [openViewRemark, setOpenViewRemark] = useState(false);
  const [remark, setRemark] = useState("");

  const token = localStorage.getItem("token");

  const COLORS = {
    pageBg: "#f8faff",
    text: "#1d2b36",
    accent: "#004aad",
    accentDark: "#002b67",
    border: "#d6e4ff",
  };

  // ============================================================
  // FETCH REQUESTS
  // ============================================================
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/inventory/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data.requests || []);
    } catch (err) {
      enqueueSnackbar("Failed to load requests", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // ============================================================
  // ACTION HANDLERS
  // ============================================================
  const handleApprove = async () => {
    try {
      await api.put(
        `/api/inventory/requests/${selectedRequest.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      enqueueSnackbar("Request approved successfully", { variant: "success" });
      setOpenApprove(false);
      fetchRequests();
    } catch {
      enqueueSnackbar("Failed to approve request", { variant: "error" });
    }
  };

  const handleDeny = async () => {
    try {
      await api.put(
        `/api/inventory/requests/${selectedRequest.id}/deny`,
        { remarks: remark },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      enqueueSnackbar("Request denied with remark", { variant: "info" });
      setOpenDeny(false);
      setRemark("");
      fetchRequests();
    } catch {
      enqueueSnackbar("Failed to deny request", { variant: "error" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    enqueueSnackbar("Logged out", { variant: "info" });
    navigate("/");
  };

  const handleBack = () => navigate(-1);

  // ============================================================
  // HELPERS
  // ============================================================
  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

  const getStatusColor = (s) => {
    switch (s) {
      case "Approved":
        return "success";
      case "Denied":
        return "error";
      case "Canceled":
        return "default";
      default:
        return "warning"; // Pending
    }
  };

  const filtered = requests.filter((r) =>
    [
      r.engineer_name || r.engineer_email,
      r.item_name,
      r.category,
      r.size,
      r.purpose,
      r.status,
      r.remarks,
      formatDate(r.request_date),
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalPages = Math.max(Math.ceil(filtered.length / itemsPerPage), 1);
  const start = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Box sx={{ background: COLORS.pageBg, minHeight: "100vh", p: 3, color: COLORS.text }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={800}>
          📦 Storekeeper — Material Requests
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Back">
            <IconButton onClick={handleBack}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchRequests}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} sx={{ color: "red" }}>
              <Logout />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* SEARCH */}
      <Box sx={{ mt: 3 }}>
        <TextField
          placeholder="Search by engineer, item, or status..."
          fullWidth
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // reset page when filtering
          }}
          InputProps={{
            startAdornment: (
              <Search style={{ marginRight: 8, color: COLORS.accentDark }} />
            ),
          }}
        />
      </Box>

      {/* TABLE */}
      <Box
        sx={{
          mt: 3,
          background: "#fff",
          borderRadius: 3,
          boxShadow: "0 8px 18px rgba(0,0,0,.08)",
        }}
      >
        {loading ? (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  {[
                    "Engineer",
                    "Item",
                    "Category",
                    "Size",
                    "Qty",
                    "Purpose",
                    "Date",
                    "Status",
                    "Remarks",
                    "Action",
                  ].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.engineer_name || r.engineer_email}</TableCell>
                    <TableCell>{r.item_name}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.size}</TableCell>
                    <TableCell>{r.requested_qty}</TableCell>
                    <TableCell>{r.purpose}</TableCell>
                    <TableCell>{formatDate(r.request_date)}</TableCell>
                    <TableCell>
                      <Chip label={r.status} color={getStatusColor(r.status)} />
                    </TableCell>
                    <TableCell>
                      {r.remarks ? (
                        <Tooltip title="View Remark">
                          <IconButton
                            color="info"
                            onClick={() => {
                              setSelectedRequest(r);
                              setOpenViewRemark(true);
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {r.status === "Pending" ? (
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Approve">
                            <IconButton
                              color="success"
                              onClick={() => {
                                setSelectedRequest(r);
                                setOpenApprove(true);
                              }}
                            >
                              <Done />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deny">
                            <IconButton
                              color="error"
                              onClick={() => {
                                setSelectedRequest(r);
                                setOpenDeny(true);
                              }}
                            >
                              <Close />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ) : (
                        "-" // actions disabled for Approved/Denied/Canceled
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Stack alignItems="center" sx={{ py: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, v) => setPage(v)}
              />
            </Stack>
          </>
        )}
      </Box>

      {/* APPROVE DIALOG */}
      <Dialog
        open={openApprove}
        onClose={() => setOpenApprove(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Approve Request</DialogTitle>
        <DialogContent>
          <Typography>
            Approve material request from{" "}
            <b>
              {selectedRequest?.engineer_name || selectedRequest?.engineer_email}
            </b>{" "}
            for <b>{selectedRequest?.item_name}</b> (
            {selectedRequest?.requested_qty} units)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApprove(false)}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* DENY DIALOG (REQUIRES REMARK) */}
      <Dialog
        open={openDeny}
        onClose={() => setOpenDeny(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Deny Request</DialogTitle>
        <DialogContent>
          <Typography mb={2}>
            Deny request from{" "}
            <b>
              {selectedRequest?.engineer_name || selectedRequest?.engineer_email}
            </b>{" "}
            for <b>{selectedRequest?.item_name}</b>?
          </Typography>
          <TextField
            label="Remarks (required)"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeny(false)}>Cancel</Button>
          <Button
            onClick={handleDeny}
            variant="contained"
            color="error"
            disabled={!remark.trim()}
          >
            Submit Denial
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW REMARK DIALOG */}
      <Dialog
        open={openViewRemark}
        onClose={() => setOpenViewRemark(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Request Remark</DialogTitle>
        <DialogContent>
          <Typography whiteSpace="pre-wrap">
            {selectedRequest?.remarks || "No remarks available"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewRemark(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
