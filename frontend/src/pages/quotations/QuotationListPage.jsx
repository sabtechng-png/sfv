import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Pagination,
  Stack,
  Button,
  Tooltip,
  LinearProgress,
  Paper,
  Divider,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

import api from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 


const QuotationListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [onlyMine, setOnlyMine] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // LOAD QUOTATIONS
  const loadQuotations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/quotations");
      setQuotations(res.data || []);
    } catch (err) {
      console.error("Failed to load quotations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  // SORTING HANDLER
  const handleSort = (column) => {
    if (column === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // STATUS CHIP COLOR
  const statusColor = (status) => {
    switch (status) {
      case "Approved":
        return "success";
      case "Sent":
        return "info";
      default:
        return "warning";
    }
  };

  // FILTER + SEARCH + SORT
  const processedData = useMemo(() => {
    let data = [...quotations];

    if (searchText.trim() !== "") {
      const t = searchText.toLowerCase();
      data = data.filter(
        (q) =>
          q.customer_name?.toLowerCase().includes(t) ||
          (q.quote_for || "").toLowerCase().includes(t) ||
          (q.ref_no || "").toLowerCase().includes(t)
      );
    }

    if (statusFilter !== "All") {
      data = data.filter((q) => q.status === statusFilter);
    }

    if (onlyMine && user.role !== "admin") {
      data = data.filter((q) => q.created_by === user.email);
    }

    data.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      return sortOrder === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return data;
  }, [quotations, searchText, statusFilter, onlyMine, sortBy, sortOrder]);

  const pageCount = Math.ceil(processedData.length / PAGE_SIZE) || 1;
  const paginated = processedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // APPROVE QUOTATION
  const handleApprove = async (id, createdBy) => {
    if (user.role !== "admin" && user.email !== createdBy) {
      alert("You can only approve quotations you created.");
      return;
    }

    if (!window.confirm("Approve this quotation?")) return;

    try {
      await api.put(`/api/quotations/${id}/approve`);

      alert("Quotation approved successfully.");
      loadQuotations();
    } catch (err) {
      console.error(err);
      alert("Failed to approve quotation.");
    }
  };

  // DELETE QUOTATION
  const handleDelete = async (id) => {
    if (user.role !== "admin") {
      alert("Only admin can delete quotations.");
      return;
    }

    if (!window.confirm("Delete this quotation? This cannot be undone.")) return;

    try {
      await api.delete(`/api/quotations/${id}`);
      loadQuotations();
    } catch (err) {
      console.error(err);
      alert("Failed to delete quotation.");
    }
  };

  // ROLE-BASED BACK
  const goBackToDashboard = () => {
    const role = (user.role || "").toLowerCase();

    if (role === "admin") navigate("/admin/dashboard");
    else if (role === "engineer") navigate("/engineer/dashboard");
    else if (role === "staff") navigate("/staff/dashboard");
    else navigate("/");
  };

  // EXPORT EXCEL
  const exportToExcel = () => {
    const XLSX = require("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");
    XLSX.writeFile(workbook, "quotations.xlsx");
  };

  // EXPORT PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.text("Quotations Export", 14, 15);

    const tableData = processedData.map((q) => [
      q.ref_no,
      q.customer_name,
      q.quote_for,
      q.total,
      q.status,
      q.created_by,
      new Date(q.created_at).toLocaleDateString(),
    ]);

    doc.autoTable({
      head: [["Ref No", "Customer", "Project", "Total", "Status", "Created By", "Date"]],
      body: tableData,
      startY: 20,
    });

    doc.save("quotations.pdf");
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={goBackToDashboard}
          >
            Back
          </Button>

          <Typography variant="h5" fontWeight={700}>
            Quotation Records
          </Typography>
        </Stack>

        {/* TOP RIGHT BUTTONS */}
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            color="secondary"
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

          <Button variant="contained" color="success" onClick={exportToExcel}>
            Export Excel
          </Button>

         
        </Stack>
      </Stack>

      {/* SEARCH + FILTER BAR */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          {/* SEARCH FIELD – Professional Look */}
          <TextField
            placeholder="Search by Ref No, Customer, Project..."
            variant="outlined"
            fullWidth
            size="small"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            sx={{
              backgroundColor: "white",
              borderRadius: "10px",
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
              },
            }}
          />

          {/* STATUS FILTER */}
          <TextField
            select
            label="Status"
            size="small"
            sx={{ width: 200 }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Sent">Sent</MenuItem>
          </TextField>

          {/* ONLY MY QUOTATIONS */}
          {user.role !== "admin" && (
            <Button
              variant={onlyMine ? "contained" : "outlined"}
              color="secondary"
              onClick={() => setOnlyMine(!onlyMine)}
              sx={{ whiteSpace: "nowrap" }}
            >
              {onlyMine ? "Showing: Mine" : "Only My Quotations"}
            </Button>
          )}
        </Stack>
      </Card>

      {/* TABLE CARD */}
      <Card sx={{ borderRadius: 3 }}>
        {loading && <LinearProgress />}

        <CardContent>
          {/* TABLE */}
          <TableContainer component={Paper}>
            <Table size="small" sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                  {[
                    { key: "ref_no", label: "Ref No" },
                    { key: "customer_name", label: "Customer" },
                    { key: "quote_for", label: "Project" },
                    { key: "total", label: "Total (₦)" },
                    { key: "status", label: "Status" },
                    { key: "created_by", label: "Created By" },
                    { key: "created_at", label: "Date" },
                  ].map((col) => (
                    <TableCell
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      sx={{
                        cursor: "pointer",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.label}
                      {sortBy === col.key &&
                        (sortOrder === "asc" ? (
                          <ArrowUpwardIcon sx={{ fontSize: 16, ml: 0.5 }} />
                        ) : (
                          <ArrowDownwardIcon sx={{ fontSize: 16, ml: 0.5 }} />
                        ))}
                    </TableCell>
                  ))}

                  <TableCell align="center">
                    <b>Actions</b>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginated.map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell>{q.ref_no}</TableCell>
                    <TableCell>{q.customer_name}</TableCell>
                    <TableCell>{q.quote_for}</TableCell>
                    <TableCell>₦{Number(q.total).toLocaleString()}</TableCell>

                    <TableCell>
                      <Chip
                        label={q.status}
                        size="small"
                        color={statusColor(q.status)}
                      />
                    </TableCell>

                    <TableCell>{q.created_by}</TableCell>

                    <TableCell>
                      {new Date(q.created_at).toLocaleDateString()}
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="View">
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
                      </Tooltip>

                      {(user.role === "admin" || user.email === q.created_by) && (
                        <Tooltip title="Edit">
                          <IconButton
                            color="warning"
                            onClick={() => {
  let path = "/";

  if (user.role === "admin") {
    path = `/admin/quotations/edit/${q.id}`;
  } else if (user.role === "engineer") {
    path = `/engineer/quotations/edit/${q.id}`;
  } else if (user.role === "staff") {
    path = `/staff/quotations/edit/${q.id}`;
  }

  navigate(path);
}}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      {(user.role === "admin" || user.email === q.created_by) &&
                        q.status !== "Approved" && (
                          <Tooltip title="Approve">
                            <IconButton
                              color="success"
                              onClick={() =>
                                handleApprove(q.id, q.created_by)
                              }
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                      {user.role === "admin" && (
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(q.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* PAGINATION */}
          <Stack alignItems="center" mt={2}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(e, val) => setPage(val)}
              color="primary"
            />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuotationListPage;
