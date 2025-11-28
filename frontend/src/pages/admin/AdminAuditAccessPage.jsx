import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


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
  AppBar,
  Toolbar,
 
  CircularProgress,
} from "@mui/material";
import { ArrowBack, Logout, CheckCircle, Block } from "@mui/icons-material";
import api from "../../utils/api"; // adjust based on your structure

const AdminAuditAccessPage = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/audit-access/list");
      setPermissions(res.data.permissions || []);
    } catch (err) {
      console.error("Error loading audit permissions:", err);
    } finally {
      setLoading(false);
    }
  };

 const handleGrant = async (email) => {
  try {
    const res = await api.post("/api/audit-access/grant", { user_email: email });
    toast.success(res.data.message || "Access granted successfully");
    fetchPermissions();
  } catch (err) {
    console.error("Error granting access:", err);
    toast.error(err.response?.data?.error || "Grant failed");
  }
};

const handleRevoke = async (email) => {
  try {
    const res = await api.post("/api/audit-access/revoke", { user_email: email });
    toast.warn(res.data.message || "Access revoked");
    fetchPermissions();
  } catch (err) {
    console.error("Error revoking access:", err);
    toast.error(err.response?.data?.error || "Revoke failed");
  }
};


  const handleBack = () => window.history.back();
  const handleLogout = () => (window.location.href = "/");

  useEffect(() => {
    fetchPermissions();
	 // toast.configure();
  }, []);

  const paginated = permissions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "#f7fff7", minHeight: "100vh" }}>
      {/* === Header === */}
      <AppBar
        position="static"
        elevation={0}
        sx={{ bgcolor: "#006b4f", borderRadius: 2, mb: 3 }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: "bold" }}>
            🔐 Audit Access Management
          </Typography>
          <Box>
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

      {/* === Main Content === */}
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography
          variant="subtitle1"
          sx={{ mb: 2, fontWeight: "bold", color: "#004d40" }}
        >
          Manage user permissions for inventory auditing
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: "center", mt: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead sx={{ bgcolor: "#e8f5e9" }}>
                <TableRow>
                  <TableCell><b>User Email</b></TableCell>
                  <TableCell><b>Audit Status</b></TableCell>
                  <TableCell><b>Granted By</b></TableCell>
                  <TableCell><b>Granted At</b></TableCell>
                  <TableCell><b>Actions</b></TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginated.map((u, index) => (
                  <TableRow key={index}>
                    <TableCell>{u.user_email}</TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          bgcolor: u.is_authorized ? "#c8f7c5" : "#f0f0f0",
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          display: "inline-block",
                          fontSize: 13,
                        }}
                      >
                        {u.is_authorized ? "Authorized" : "Locked"}
                      </Typography>
                    </TableCell>
                    <TableCell>{u.granted_by || "-"}</TableCell>
                    <TableCell>
                      {u.granted_at
                        ? new Date(u.granted_at).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {u.is_authorized ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<Block />}
                          onClick={() => handleRevoke(u.user_email)}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleGrant(u.user_email)}
                        >
                          Grant
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={permissions.length}
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
    </Box>
  );
  
  
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

};

export default AdminAuditAccessPage;
