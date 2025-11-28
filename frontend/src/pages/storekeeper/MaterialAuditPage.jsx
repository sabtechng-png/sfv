import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  AppBar,
  Toolbar,
  CircularProgress,
  Chip,
  Tooltip,
} from "@mui/material";
import { ArrowBack, Logout } from "@mui/icons-material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../utils/api";

const MaterialAuditPage = () => {
  // ---------------------------
  // STATES
  // ---------------------------
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("guest");
  const [audits, setAudits] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    verified: 0,
    remarked: 0,
    pending: 0,
  });

  // ---------------------------
  // LOAD USER INFO
  // ---------------------------
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      setRole(storedUser.role ? storedUser.role.toLowerCase() : "guest");
    }
  }, []);

  // ---------------------------
  // VERIFY ACCESS
  // ---------------------------
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const res = await api.get("/api/audit-access/check");
        setAuthorized(res.data.allowed);
      } catch (err) {
        console.error("Error verifying audit permission:", err);
      } finally {
        setChecked(true);
      }
    };
    verifyAccess();
  }, []);

  // ---------------------------
  // LOAD SUMMARY + AUDITS
  // ---------------------------
  const loadSummary = async () => {
    try {
      const res = await api.get("/api/inventory/audits/summary");
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error("Error loading summary:", err);
    }
  };

  const loadAudits = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/api/inventory/audits?page=${page + 1}&limit=${rowsPerPage}`
      );
      setAudits(res.data.audits || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      console.error("Error loading audits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      loadAudits();
      loadSummary();
    }
  }, [page, rowsPerPage, authorized]);

  // ---------------------------
  // VERIFY / REMARK / RESET LOGIC
  // ---------------------------
  const handleVerify = async (id) => {
    try {
      await api.put(`/api/inventory/audit/${id}`, {
        status: "Verified",
        note: "",
      });
      toast.success("Material verified successfully");
      loadAudits();
      loadSummary();
    } catch (err) {
      toast.error("Failed to verify material");
    }
  };

  const handleRemarkSubmit = async () => {
    try {
      await api.put(`/api/inventory/audit/${selectedMaterial.id}`, {
        status: "Remarked",
        note: remark,
      });
      setOpenDialog(false);
      setRemark("");
      toast.warn("Material remarked");
      loadAudits();
      loadSummary();
    } catch (err) {
      toast.error("Failed to submit remark");
    }
  };

  const handleSingleReset = async (id) => {
    if (!window.confirm("Reset this item’s audit status to Pending?")) return;
    try {
      const res = await api.put(`/api/inventory/audit/${id}/reset`);
      toast.info(res.data.message || "Item reset to Pending.");
      loadAudits();
      loadSummary();
    } catch {
      toast.error("Failed to reset item.");
    }
  };

  // ---------------------------
  // RESET ALL HANDLER (Admin Only)
  // ---------------------------
  const handleResetAll = async () => {
    if (role !== "admin") return;
    if (!window.confirm("Are you sure you want to reset all audits to Pending?"))
      return;

    try {
      const res = await api.put("/api/inventory/audits/reset");
      toast.success(res.data.message || "✅ All audits reset successfully!");
      loadAudits();
      loadSummary();
    } catch (err) {
      toast.error("Failed to reset audits.");
    }
  };

  // ---------------------------
  // NAVIGATION
  // ---------------------------
  const handleBack = () => window.history.back();
  const handleLogout = () => (window.location.href = "/");

  // ---------------------------
  // RENDER
  // ---------------------------
  if (!checked)
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Checking authorization...
        </Typography>
      </Box>
    );

  if (!authorized)
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <Typography variant="h6" color="error">
          🚫 You are not authorized to audit materials.
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          Role: <strong>{role}</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Please contact the administrator to request audit access.
        </Typography>
        <Button
          onClick={handleBack}
          variant="contained"
          sx={{ mt: 3, bgcolor: "#006b4f" }}
        >
          Back
        </Button>
      </Box>
    );

  const totalItems = pagination.total_items || 0;
  const verified = audits.filter((i) => i.audit_status === "Verified").length;
  const remarked = audits.filter((i) => i.audit_status === "Remarked").length;
  const pending = totalItems - (verified + remarked);

  return (
    <Box sx={{ p: 3, backgroundColor: "#f9fdf9", minHeight: "100vh" }}>
      <AppBar position="static" sx={{ bgcolor: "#006b4f", borderRadius: 2, mb: 3 }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            🧾 Material Audit Page
          </Typography>
          <Box>
            {role === "admin" && (
              <Button
                variant="contained"
                color="warning"
                sx={{ mr: 1 }}
                onClick={handleResetAll}
              >
                🔁 RESET
              </Button>
            )}
            <Button
              startIcon={<ArrowBack />}
              onClick={handleBack}
              sx={{
                mr: 1,
                bgcolor: "#fff",
                color: "#006b4f",
                "&:hover": { bgcolor: "#e8f5e9" },
              }}
              variant="contained"
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<Logout />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#e8f5e9",
        }}
      >
        <Typography variant="subtitle1">
          👤 <strong>Role:</strong> {role}
        </Typography>
        <Chip label="✅ Access Granted" sx={{ bgcolor: "#00c853", color: "white" }} />
      </Paper>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
          Audit Summary
        </Typography>
        <Typography>Total: {totalItems}</Typography>
        <Typography>Verified: {verified}</Typography>
        <Typography>Remarked: {remarked}</Typography>
        <Typography>Pending: {pending}</Typography>
      </Paper>

      {/* === Table === */}
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ textAlign: "center", mt: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead sx={{ bgcolor: "#e8f5e9" }}>
                <TableRow>
                  <TableCell><b>Material</b></TableCell>
                  <TableCell><b>Type</b></TableCell>
				  <TableCell><b>Size</b></TableCell>
                  <TableCell><b>Quantity</b></TableCell>
                  <TableCell><b>Status</b></TableCell>
				   {role === "admin" && (   // ✅ Only admin sees this
  <TableCell><b>Remark/Note</b></TableCell>
)}
                  <TableCell><b>Action</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {audits.map((i, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.type}</TableCell>
					<TableCell>{i.size}</TableCell>   {/* ✅ NEW */}
                    <TableCell>{i.quantity}</TableCell>
                    <TableCell>{i.audit_status || "Pending"}</TableCell>
					{role === "admin" && (   // ✅ Only admin sees this
  <TableCell>{i.note || "-"}</TableCell>
)}
                    <TableCell>
                      {i.audit_status === "Verified" ? (
                        <>
                          <Typography color="green">✔ Verified</Typography>
                          {role === "admin" && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              sx={{ ml: 1 }}
                              onClick={() => handleSingleReset(i.id)}
                            >
                              Reset
                            </Button>
                          )}
                        </>
                      ) : i.audit_status === "Remarked" ? (
                        <>
                          <Typography color="orange">⚠ Remarked</Typography>
                          {role === "admin" && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              sx={{ ml: 1 }}
                              onClick={() => handleSingleReset(i.id)}
                            >
                              Reset
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleVerify(i.id)}
                            sx={{ mr: 1 }}
                          >
                            Verify
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            onClick={() => {
                              setSelectedMaterial(i);
                              setOpenDialog(true);
                            }}
                          >
                            Remark
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={pagination.total_items || audits.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 20]}
            />
          </>
        )}
      </Paper>

      {/* === Remark Dialog === */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth>
        <DialogTitle>Remark Material</DialogTitle>
        <DialogContent>
          <TextField
            label="Remark Note"
            fullWidth
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            multiline
            rows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleRemarkSubmit} variant="contained" color="warning">
            Submit Remark
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </Box>
  );
};

export default MaterialAuditPage;
