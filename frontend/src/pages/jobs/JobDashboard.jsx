// src/pages/jobs/JobDashboard.jsx
// === Corporate Clean v2 — refreshed UI, exact same logic & features ===
// - No new features, no reductions
// - API calls / routes unchanged
// - Role palettes retained
// - Settings icon removed globally (per instruction)

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  Tooltip,
  Divider,
  Container,
  Skeleton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const ROWS_PER_PAGE = 10;

// ===== Role-based palette =====
const PALETTES = {
  admin: {
    primary: "#263238",
    secondary: "#26A69A",
    chipText: "#fff",
    bg: "#F4F6F8",
    text: "#1A1A1A",
  },
  engineer: {
    primary: "#003366",
    secondary: "#FFD700",
    chipText: "#000",
    bg: "#F5F7FA",
    text: "#1A1A1A",
  },
};
const usePalette = (role) =>
  String(role || "").toLowerCase() === "admin" ? PALETTES.admin : PALETTES.engineer;

function DaysLeftChip({ value }) {
  if (value === null || value === undefined) return <Chip size="small" variant="outlined" label="—" />;
  let color = "success";
  let label = `${value} days`;
  if (value <= 7 && value >= 1) color = "warning";
  if (value === 0) { color = "error"; label = "Due Today"; }
  if (value < 0)  { color = "error"; label = `Overdue (${Math.abs(value)} days)`; }
  return <Chip size="small" color={color} label={label} />;
}

function formatUTC(isoUTC) {
  if (!isoUTC) return "—";
  try {
    const d = new Date(isoUTC);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoUTC;
  }
}

function StatusChip({ value }) {
  const v = String(value || "").toLowerCase();
  const map = {
    ongoing: { label: "Ongoing", color: "info" },
    completed: { label: "Completed", color: "success" },
    cancelled: { label: "Cancelled", color: "default" },
  };
  const conf = map[v] || { label: value || "—", color: "default" };
  return <Chip size="small" label={conf.label} color={conf.color} />;
}

const CARD_DEFS = (palette) => [
  { key: "totalJobs", label: "Total Jobs", icon: <WorkHistoryIcon />, color: palette.primary },
  { key: "ongoing", label: "Ongoing Jobs", icon: <BuildCircleIcon />, color: palette.secondary },
  { key: "completed", label: "Completed", icon: <CheckCircleIcon />, color: "#4CAF50" },
  { key: "dueMaint", label: "Due Maintenance", icon: <AccessTimeIcon />, color: "#FF9800" },
  { key: "jobsThisMonth", label: "Jobs This Month", icon: <CalendarMonthIcon />, color: "#7E57C2" },
  { key: "openIssues", label: "Open Issues", icon: <ErrorOutlineIcon />, color: "#E53935" },
];




export default function JobDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || "engineer").toLowerCase();
  const palette = usePalette(role);

  // ===== State =====
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState(null);

  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentRows, setRecentRows] = useState([]);

  const [loadingDue, setLoadingDue] = useState(true);
  const [dueRows, setDueRows] = useState([]);

  const [search, setSearch] = useState("");

  // ===== Fetchers =====
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/summary`);
      const data = await res.json();
      setSummary(data || { cards: {} });
    } catch (e) {
      console.error(e);
      setSummary({ cards: {} });
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchRecentJobs = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/recent-jobs`);
      const json = await res.json();
      const rows = (json?.jobs || []).map((r, i) => ({
        id: r.job_id || i,
        job_id: r.job_id,
        job_ref: r.job_ref,
        title: r.title,
        client_name: r.client_name,
        status: r.status ?? "ongoing",
        created_at_fmt: r.created_at_fmt,
      }));
      setRecentRows(rows);
    } catch (e) {
      console.error(e);
      setRecentRows([]);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const fetchDueMaintenance = useCallback(async () => {
    setLoadingDue(true);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/due-maintenance`);
      const json = await res.json();
      const dueRowsMapped = (json?.items || []).map((r, i) => ({
        id: r.job_id || i,
        job_id: r.job_id,
        job_ref: r.job_ref,
        title: r.title,
        client_name: r.client_name,
        last_maint_fmt: r.last_maint_fmt,
        next_maint_fmt: r.next_maint_fmt,
        days_left: r.days_left,
      }));
      setDueRows(dueRowsMapped);
    } catch (e) {
      console.error(e);
      setDueRows([]);
    } finally {
      setLoadingDue(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchRecentJobs();
    fetchDueMaintenance();
  }, [fetchSummary, fetchRecentJobs, fetchDueMaintenance]);

  // ===== Search Filters =====
  const searchLower = (search || "").toLowerCase();
  const filteredRecent = useMemo(
    () =>
      recentRows.filter(
        (r) =>
          r.job_ref?.toLowerCase().includes(searchLower) ||
          r.title?.toLowerCase().includes(searchLower) ||
          r.client_name?.toLowerCase().includes(searchLower)
      ),
    [recentRows, searchLower]
  );

  const filteredDue = useMemo(
    () =>
      dueRows.filter(
        (r) =>
          r.job_ref?.toLowerCase().includes(searchLower) ||
          r.title?.toLowerCase().includes(searchLower) ||
          r.client_name?.toLowerCase().includes(searchLower)
      ),
    [dueRows, searchLower]
  );

  const cardDefs = useMemo(() => CARD_DEFS(palette), [palette]);

 

  const handleCardClick = (key) => {
    const map = { ongoing: "status=ongoing", completed: "status=completed" };
    const qs = map[key] ? `?${map[key]}` : "";
    navigate(`/jobs/manage${qs}`);
  };

  // ===== Table Columns =====
  const recentCols = [
    { field: "job_ref", headerName: "Job Ref", flex: 1, minWidth: 130 },
    { field: "title", headerName: "Title", flex: 1.4, minWidth: 180 },
    { field: "client_name", headerName: "Client", flex: 1, minWidth: 140 },
    { field: "status", headerName: "Status", flex: 0.8, minWidth: 120, renderCell: (p) => <StatusChip value={p.value} /> },
    { field: "created_at_fmt", headerName: "Start Date", flex: 1, minWidth: 180 },
  ];

  const dueCols = [
    { field: "job_ref", headerName: "Job Ref", flex: 1.2, minWidth: 150 },
    { field: "title", headerName: "Title", flex: 1.4, minWidth: 160 },
    { field: "client_name", headerName: "Client", flex: 1.2, minWidth: 150 },
    { field: "last_maint_fmt", headerName: "Last Maintenance", flex: 1.3, minWidth: 190 },
    { field: "next_maint_fmt", headerName: "Next Maintenance", flex: 1.1, minWidth: 150 },
    { field: "days_left", headerName: "Days Left", flex: 0.9, minWidth: 130, sortable: true, renderCell: (p) => <DaysLeftChip value={p?.value} /> },
  ];

  // ===== Styles =====
  const cardSx = {
    cursor: "pointer",
    borderRadius: 3,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    transition: "transform 180ms ease, box-shadow 180ms ease",
    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(0,0,0,0.10)" },
  };

  const panelHeaderSx = {
    px: 2, pt: 2, pb: 1.25,
    borderBottom: "1px solid #eee",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  };

  const gridSx = {
    "& .MuiDataGrid-columnHeaders": { height: 46, minHeight: 46 },
    "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, fontSize: 13 },
    "& .MuiDataGrid-cell": { fontSize: 13 },
    "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
    "& .MuiDataGrid-footerContainer": { borderTop: "none" },
  };

  return (
    <Box sx={{ background: palette.bg, minHeight: "100vh" }}>
      {/* App Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: palette.primary,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Toolbar sx={{ minHeight: 64, gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.2 }}>
            SFV Tech | Job Management
          </Typography>

          <TextField
            size="small"
            placeholder="Search (Ref / Title / Client)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              mr: 2,
              background: "#ffffff",
              borderRadius: 1.5,
              width: 320,
              display: { xs: "none", sm: "block" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

       

          {/* Settings removed on request */}

          <Chip
            icon={<PersonIcon />}
            label={String(role).toUpperCase()}
            size="small"
            sx={{
              ml: 1,
              bgcolor: palette.secondary,
              color: palette.chipText,
              fontWeight: 700,
            }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        {/* Top filter on mobile */}
        <Box sx={{ display: { xs: "block", sm: "none" }, mb: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search (Ref / Title / Client)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2}>
          {cardDefs.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.key}>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 250 }}>
                <Card onClick={() => handleCardClick(c.key)} sx={cardSx}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.75,
                          display: "grid",
                          placeItems: "center",
                          background: c.color,
                          color: "#fff",
                        }}
                      >
                        {c.icon}
                      </Box>
                      {loadingSummary ? (
                        <Skeleton variant="text" width={60} height={28} />
                      ) : (
                        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                          {summary?.cards?.[c.key] ?? 0}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="subtitle2" sx={{ mt: 1.25, color: palette.text, fontWeight: 700 }}>
                      {c.label}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Section Divider */}
        <Divider sx={{ my: 2.5 }} />

        {/* Tables */}
        <Grid container spacing={2}>
          {/* Recent Jobs */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: "1px solid rgba(0,0,0,0.06)" }}>
              <Box sx={panelHeaderSx}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
                  Recent Jobs
                </Typography>
                <Button size="small" onClick={() => navigate("/jobs/manage")}>View All</Button>
              </Box>
              <div style={{ height: 430, width: "100%" }}>
                <DataGrid
                  rows={filteredRecent.slice(0, ROWS_PER_PAGE)}
                  columns={recentCols}
                  pageSizeOptions={[ROWS_PER_PAGE]}
                  paginationModel={{ pageSize: ROWS_PER_PAGE, page: 0 }}
                  disableRowSelectionOnClick
                  loading={loadingRecent}
                  onRowClick={(p) => navigate(`/jobs/${p.row.job_id}`)}
                  sx={gridSx}
                />
              </div>
            </Card>
          </Grid>

          {/* Due Maintenance */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: "1px solid rgba(0,0,0,0.06)" }}>
              <Box sx={panelHeaderSx}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
                  Due Maintenance (In 2 weeks)
                </Typography>
                <Button size="small" onClick={() => navigate("/jobs/manage")}>View Due</Button>
              </Box>
              <div style={{ height: 430, width: "100%" }}>
                <DataGrid
                  rows={filteredDue.slice(0, ROWS_PER_PAGE)}
                  columns={dueCols}
                  pageSizeOptions={[ROWS_PER_PAGE]}
                  paginationModel={{ pageSize: ROWS_PER_PAGE, page: 0 }}
                  disableRowSelectionOnClick
                  loading={loadingDue}
                  onRowClick={(p) => navigate(`/jobs/${p.row.job_id}`)}
                  sx={gridSx}
                />
              </div>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Box sx={{ mt: 2.25, display: "flex", gap: 1.25, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            sx={{ bgcolor: palette.secondary, color: palette.chipText, "&:hover": { opacity: 0.9 } }}
            onClick={() => navigate("/jobs/register")}
          >
            Register New Work
          </Button>
          <Button variant="outlined" onClick={() => navigate("/jobs/manage")}>
            View All Jobs
          </Button>
          
        </Box>
      </Container>
    </Box>
  );
}
