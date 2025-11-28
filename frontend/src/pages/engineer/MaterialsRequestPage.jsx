// ============================================================
// SFV Tech |Engineer Materials Page
// Tabs: [Available Materials] + [My Requests] + Cancel Pending
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box, Grid, Typography, Card, CardContent, Button, TextField, IconButton,
  Tooltip, Table, TableBody, TableCell, TableHead, TableRow, Chip, CircularProgress,
  Grow, Avatar, Stack, Pagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab
} from "@mui/material";
import {
  Refresh, WarningAmber, Layers, Bolt, BatteryChargingFull, Inventory2,
  Search, ArrowBack, Logout, ShoppingCart, Visibility, Cancel
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import Badge from "@mui/material/Badge";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

export default function MaterialsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // ---------- shared -----------
  const token = localStorage.getItem("token");
  const itemsPerPage = 10;
  const [tab, setTab] = useState(0); // 0 = Materials | 1 = My Requests
  const [search, setSearch] = useState("");

  const COLORS = {
    pageBg: "#f6f9ff",
    text: "#243b2e",
    accent: "#0057d9",
    accentDark: "#003a8a",
    border: "#dbe4ff",
  };

  // ---------- inventory data -----------
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ---------- request dialog -----------
  const [openRequest, setOpenRequest] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reqQty, setReqQty] = useState("");
  const [purpose, setPurpose] = useState("");

  // ---------- my requests -----------
  const [myReqLoading, setMyReqLoading] = useState(true);
  const [myRequests, setMyRequests] = useState([]);
  const [myPage, setMyPage] = useState(1);
  const [myTotalPages, setMyTotalPages] = useState(1);
  const [openRemark, setOpenRemark] = useState(false);
  const [remarkText, setRemarkText] = useState("");

  // ------------------------------------------------------------
  // API: INVENTORY
  // ------------------------------------------------------------
  const fetchInventory = async (p = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/inventory?page=${p}&limit=${itemsPerPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(res.data.items || []);
      setTotalPages(res.data.pagination?.total_pages || 1);
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to load materials", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/inventory/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummary(res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------------------------
  // API: MY REQUESTS
  // ------------------------------------------------------------
  const fetchMyRequests = async () => {
    try {
      setMyReqLoading(true);
      // Backend should use req.user to return only this engineer's requests.
      const res = await api.get("/api/inventory/my-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data.requests || [];
      setMyRequests(list);
      setMyTotalPages(Math.ceil(list.length / itemsPerPage) || 1);
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to load your requests", { variant: "error" });
    } finally {
      setMyReqLoading(false);
    }
  };

  // ------------------------------------------------------------
  // EFFECTS
  // ------------------------------------------------------------
  useEffect(() => {
    fetchInventory(page);
    fetchSummary();
  }, [page]);

  useEffect(() => {
    if (tab === 1 && myRequests.length === 0) fetchMyRequests();
  }, [tab]);

  // ------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    enqueueSnackbar("Logged out successfully", { variant: "info" });
    navigate("/");
  };

  const handleBack = () => navigate(-1);

  const handleRequest = async () => {
    if (!reqQty || Number(reqQty) <= 0) {
      enqueueSnackbar("Please enter valid quantity", { variant: "warning" });
      return;
    }
    try {
      await api.post(
        "/api/inventory/request",
        {
          inventory_id: selectedItem.id,
          requested_qty: Number(reqQty),
          purpose,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      enqueueSnackbar("Request submitted successfully", { variant: "success" });
      setOpenRequest(false);
      setReqQty("");
      setPurpose("");
      if (tab === 1) fetchMyRequests();
    } catch (err) {
      enqueueSnackbar("Failed to submit request", { variant: "error" });
    }
  };

  const handleCancel = async (reqId) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) return;
    try {
      await api.put(`/api/inventory/requests/${reqId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Request canceled successfully", { variant: "info" });
      fetchMyRequests();
    } catch (err) {
      enqueueSnackbar("Failed to cancel request", { variant: "error" });
    }
  };

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------
  const filteredInventory = inventory.filter((i) =>
    Object.values(i).join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const getStockColor = (qty) => (qty < 5 ? "error" : qty < 10 ? "warning" : "success");

  const filteredMyReqs = myRequests.filter((r) =>
    [
      r.item_name,
      r.category,
      r.purpose,
      r.status,
      r.remarks,
      new Date(r.request_date || "").toLocaleDateString(),
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const myStart = (myPage - 1) * itemsPerPage;
  const myPageRows = filteredMyReqs.slice(myStart, myStart + itemsPerPage);

  const statusColor = (s) => {
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

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
    <Box sx={{ background: COLORS.pageBg, minHeight: "100vh", p: 3, color: COLORS.text }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Inventory2 sx={{ color: COLORS.accent }} /> Materials Request Portal
        </Typography>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Back">
            <IconButton onClick={handleBack} sx={{ color: COLORS.accentDark }}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton
              onClick={() => {
                if (tab === 0) {
                  fetchInventory(page);
                  fetchSummary();
                } else {
                  fetchMyRequests();
                }
              }}
              sx={{ color: COLORS.accentDark }}
            >
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

      {/* STATS */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {[
          { title: "Total Items", value: summary.total_items, icon: <Layers /> },
          { title: "Low Stock (<10)", value: summary.low_stock, icon: <WarningAmber /> },
          { title: "New Items", value: summary.new_items, icon: <BatteryChargingFull /> },
          { title: "Used Items", value: summary.used_items, icon: <Bolt /> },
        ].map((s, i) => (
          <Grow in timeout={300 + i * 100} key={i}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  border: `1px solid ${COLORS.border}`,
                  background: "#fff",
                  borderRadius: 3,
                  boxShadow: "0 8px 18px rgba(0,0,0,.08)",
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: COLORS.accent, color: "#fff" }}>{s.icon}</Avatar>
                  <Box>
                    <Typography variant="body2">{s.title}</Typography>
                    <Typography variant="h4" fontWeight={800} color={COLORS.accentDark}>
                      {s.value || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grow>
        ))}
      </Grid>

      {/* TABS + SEARCH */}
      <Stack direction="row" alignItems="center" sx={{ mt: 3, mb: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Available Materials" />
          <Tab
            label={
              <Badge
                color="error"
                badgeContent={myRequests.filter((r) => r.status === "Pending").length}
              >
                My Requests
              </Badge>
            }
          />
        </Tabs>
        <Box sx={{ flex: 1 }} />
        <TextField
          placeholder={tab === 0 ? "Search materials..." : "Search your requests..."}
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <Search style={{ marginRight: 8, color: COLORS.accentDark }} />,
          }}
          sx={{ minWidth: 360 }}
        />
      </Stack>

      {/* TAB PANELS */}
      {tab === 0 ? (
        // =================== MATERIALS ===================
        <Box
          sx={{
            mt: 2,
            background: "#fff",
            borderRadius: 3,
            boxShadow: "0 8px 18px rgba(0,0,0,.08)",
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    {["Name", "Type", "Category", "Size", "Quantity", "Condition", "Action"].map(
                      (h) => (
                        <TableCell key={h} sx={{ fontWeight: 700 }}>
                          {h}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>
                        <Chip label={item.quantity} color={getStockColor(item.quantity)} />
                      </TableCell>
                      <TableCell>{item.condition}</TableCell>
                      <TableCell>
                        <Tooltip title="Request Material">
                          <IconButton
                            color="primary"
                            onClick={() => {
                              setSelectedItem(item);
                              setOpenRequest(true);
                            }}
                          >
                            <ShoppingCart />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Stack alignItems="center" sx={{ py: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, val) => setPage(val)}
                  color="primary"
                />
              </Stack>
            </>
          )}
        </Box>
      ) : (
        // =================== MY REQUESTS ===================
        <Box
          sx={{
            mt: 2,
            background: "#fff",
            borderRadius: 3,
            boxShadow: "0 8px 18px rgba(0,0,0,.08)",
          }}
        >
          {myReqLoading ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    {["Item", "Category", "Qty", "Purpose", "Status", "Remarks", "Date", "Action"].map(
                      (h) => (
                        <TableCell key={h} sx={{ fontWeight: 700 }}>
                          {h}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myPageRows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.item_name}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell>{r.requested_qty}</TableCell>
                      <TableCell>{r.purpose}</TableCell>
                      <TableCell>
                        <Chip label={r.status} color={statusColor(r.status)} />
                      </TableCell>
                      <TableCell>
                        {r.remarks ? (
                          <Tooltip title="View Remark">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => {
                                setRemarkText(r.remarks);
                                setOpenRemark(true);
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{fmtDate(r.request_date)}</TableCell>
                      <TableCell>
                        {r.status === "Pending" ? (
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={() => handleCancel(r.id)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Stack alignItems="center" sx={{ py: 2 }}>
                <Pagination
                  count={Math.max(myTotalPages, Math.ceil(filteredMyReqs.length / itemsPerPage) || 1)}
                  page={myPage}
                  onChange={(e, v) => setMyPage(v)}
                  color="primary"
                />
              </Stack>
            </>
          )}
        </Box>
      )}

      {/* REQUEST DIALOG */}
      <Dialog open={openRequest} onClose={() => setOpenRequest(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request Material</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Item: <strong>{selectedItem?.name}</strong>
          </Typography>
          <TextField
            label="Quantity Needed"
            type="number"
            fullWidth
            value={reqQty}
            onChange={(e) => setReqQty(e.target.value)}
            sx={{ mb: 2 }}
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Purpose / Notes"
            multiline
            rows={3}
            fullWidth
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRequest(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRequest} startIcon={<ShoppingCart />}>
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW REMARK DIALOG (My Requests) */}
      <Dialog open={openRemark} onClose={() => setOpenRemark(false)} fullWidth maxWidth="xs">
        <DialogTitle>Remark</DialogTitle>
        <DialogContent>
          <Typography whiteSpace="pre-wrap">{remarkText}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemark(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


