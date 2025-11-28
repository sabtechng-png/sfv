import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  IconButton,
  Paper,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const QuotationDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quotations, setQuotations] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/quotations");
        setQuotations(res.data || []);
      } catch (err) {
        console.error("Failed to load quotations");
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    return {
      total: quotations.length,
      draft: quotations.filter((q) => q.status === "Draft").length,
      approved: quotations.filter((q) => q.status === "Approved").length,
      sent: quotations.filter((q) => q.status === "Sent").length,
    };
  }, [quotations]);

  // ---------------------------------------------
  // BACK BUTTON → Role-Based Navigation
  // ---------------------------------------------
  const goBackToRoleDashboard = () => {
    if (!user) return navigate("/");

    if (user.role === "admin") navigate("/admin/dashboard");
    else if (user.role === "engineer") navigate("/engineer/dashboard");
    else if (user.role === "staff") navigate("/staff/dashboard");
    else navigate("/"); // fallback
  };

  return (
    <Box sx={{ p: 3 }}>

      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={goBackToRoleDashboard}
        variant="outlined"
        sx={{ mb: 3 }}
      >
        Back to Dashboard
      </Button>

      <Typography variant="h4" fontWeight={800} mb={1}>
        Quotation Management
      </Typography>

      <Typography variant="body1" color="text.secondary" mb={4}>
        Prepare, manage and print professional quotations for Solar, Fabrication,
        CCTV, and Gate Automation projects.
      </Typography>

     {/* COMPACT STAT CARDS */}
<Grid container spacing={2} mb={4}>
  {[ 
    { label: "Total Quotations", value: stats.total },
    { label: "Draft", value: stats.draft },
    { label: "Approved", value: stats.approved },
   
  ].map((item, idx) => (
    <Grid item xs={6} sm={3} md={3} key={idx}>
      <Card
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          background: "#111827",
          border: "1px solid #1f2937",
          transition: "0.25s",
          cursor: "pointer",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            borderColor: "#374151",
          },
        }}
        onClick={() => navigate("/quotations/list")}
      >
        <Typography 
          variant="body2" 
          sx={{ color: "#9ca3af", fontWeight: 500 }}
        >
          {item.label}
        </Typography>

        <Typography 
          variant="h5" 
          sx={{ color: "#f9fafb", fontWeight: 700, mt: 0.5 }}
        >
          {item.value}
        </Typography>
      </Card>
    </Grid>
  ))}
</Grid>

{/* ACTION BUTTONS */}
<Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
  <Button
    variant="contained"
    size="large"
    startIcon={<AddIcon />}
    onClick={() => {
      let path = "/";

      if (user.role === "admin") {
        path = "/admin/quotations/create";
      } else if (user.role === "engineer") {
        path = "/engineer/quotations/create";
      } else if (user.role === "staff") {
        path = "/staff/quotations/create";
      }

      navigate(path);
    }}
  >
    New Quotation
  </Button>

  <Button
    variant="outlined"
    size="large"
    endIcon={<ArrowForwardIcon />}
    onClick={() => {
      let path = "/";

      if (user.role === "admin") {
        path = "/admin/quotations/list";
      } else if (user.role === "engineer") {
        path = "/engineer/quotations/list";
      } else if (user.role === "staff") {
        path = "/staff/quotations/list";
      }

      navigate(path);
    }}
  >
    View All Quotations
  </Button>
</Stack>


      {/* RECENT QUOTATIONS */}
      <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Recent Quotations
          </Typography>

          {quotations.length === 0 ? (
            <Typography>No quotations available.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f7f7f7" }}>
                    <TableCell><b>Ref No</b></TableCell>
                    <TableCell><b>Customer</b></TableCell>
                    <TableCell><b>Project</b></TableCell>
                    <TableCell><b>Total (₦)</b></TableCell>
                    <TableCell><b>Status</b></TableCell>
                    <TableCell><b>Date</b></TableCell>
                    <TableCell align="center"><b>Action</b></TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {quotations.slice(0, 5).map((q) => (
                    <TableRow hover key={q.id}>
                      <TableCell>{q.ref_no}</TableCell>
                      <TableCell>{q.customer_name}</TableCell>
                      <TableCell>{q.quote_for || "-"}</TableCell>
                      <TableCell>₦{Number(q.total).toLocaleString()}</TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={q.status}
                          color={
                            q.status === "Approved"
                              ? "success"
                              : q.status === "Sent"
                              ? "primary"
                              : "warning"
                          }
                        />
                      </TableCell>

                      <TableCell>
                        {new Date(q.created_at).toLocaleDateString()}
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          color="primary"
                       onClick={() => {
  let path = "/";

  if (user.role === "admin") {
    path = `/admin/quotations/view/${q.id}`;
  } else if (user.role === "engineer") {
    path = `/engineer/quotations/view/${q.id}`;
  } else if (user.role === "staff") {
    path = `/staff/quotations/view/${q.id}`;
  }

  navigate(path);
}}

                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuotationDashboard;
