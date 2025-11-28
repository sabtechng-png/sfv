// ======================================================================
// MaterialCollectionPage.jsx  (Updated with Admin PDF Mode + Returns)
// ======================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Stack,
  Typography,
  Button,
  Tabs,
  Tab,
  Badge,
  Paper,
  TextField,
  MenuItem,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  ArrowBack,
  Logout,
  AddCircle,
  PictureAsPdf,
  Refresh,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAuth } from "../../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import AddCollectionDialog from "../../components/materials/AddCollectionDialog";
import EditCollectionDialog from "../../components/materials/EditCollectionDialog";
import ViewCollectionDialog from "../../components/materials/ViewCollectionDialog";
import ReturnMaterialDialog from "../../components/materials/ReturnMaterialDialog";

import MyCollectionTable from "../../components/materials/tables/MyCollectionTable";
import AllRecordTable from "../../components/materials/tables/AllRecordTable";
import PendingFlaggedTable from "../../components/materials/tables/PendingFlaggedTable";
import NewCollectionForm from "../../components/materials/forms/NewCollectionForm";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

const roleThemes = {
  admin: {
    pageBg: "#fff8f1",
    text: "#2e1a00",
    accent: "#ff6f00",
    accentDark: "#e65100",
    border: "#ffe0b2",
  },
  engineer: {
    pageBg: "#f6f9ff",
    text: "#243b2e",
    accent: "#0057d9",
    accentDark: "#003a8a",
    border: "#dbe4ff",
  },
  staff: {
    pageBg: "#fff7fa",
    text: "#2b0d1c",
    accent: "#c2185b",
    accentDark: "#880e4f",
    border: "#f8bbd0",
  },
  storekeeper: {
    pageBg: "#f5fff8",
    text: "#0d331a",
    accent: "#007e33",
    accentDark: "#004d1a",
    border: "#b9f6ca",
  },
  apprentice: {
    pageBg: "#f3f3ff",
    text: "#1a0f3d",
    accent: "#673ab7",
    accentDark: "#311b92",
    border: "#d1c4e9",
  },
};

const statusToChip = (s) => {
  const t = (s || "").toLowerCase();
  if (t === "verified") return "success";
  if (t === "flagged") return "error";
  if (t === "pending") return "warning";
  return "default";
};
const fmtDate = (d) => new Date(d).toLocaleString();
const fmtISODate = (d = new Date()) => d.toISOString().slice(0, 10);
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export default function MaterialCollectionPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, logout } = useAuth();

  const role = (user?.role || "storekeeper").toLowerCase();
  const theme = roleThemes[role] || roleThemes.storekeeper;
  const myEmail = user?.email || "me@sfv.local";

  const [collections, setCollections] = useState([]);
  const [returns, setReturns] = useState([]);

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(fmtISODate());

  const [openAdd, setOpenAdd] = useState(false);
  const [openView, setOpenView] = useState(null);
  const [openEdit, setOpenEdit] = useState(null);
  const [openReturn, setOpenReturn] = useState(null);

  // ✅ NEW admin report state
  const [openReport, setOpenReport] = useState(false);
  const [reportMode, setReportMode] = useState("self"); // self | user | all
  const [reportUser, setReportUser] = useState("");

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const loadData = async () => {
    try {
      const [collRes, retRes] = await Promise.all([
        fetch(`${API_BASE}/api/material-collections`),
        fetch(`${API_BASE}/api/material-collections/returns`),
      ]);
      const coll = await collRes.json();
      const rets = await retRes.json();
      if (Array.isArray(coll)) setCollections(coll);
      if (Array.isArray(rets)) setReturns(rets);
    } catch (e) {
      enqueueSnackbar("Cannot reach backend.", { variant: "error" });
    }
  };
  useEffect(() => {
    loadData();
  }, []);

  const returnsByParent = useMemo(() => {
    const map = new Map();
    for (const r of returns || []) {
      map.set(r.parent_id, (map.get(r.parent_id) || 0) + Number(r.qty || 0));
    }
    return map;
  }, [returns]);

  const decorated = useMemo(() => {
    return (collections || []).map((c) => {
      const returnedQty =
        Number(c.returned_quantity ?? returnsByParent.get(c.id) ?? 0);
      const totalAfter = Math.max(
        0,
        Number(c.total_after_return ?? Number(c.quantity || 0) - returnedQty)
      );
      const returnedPct = Number(
        c.returned_percent ??
          (Number(c.quantity || 0) > 0
            ? (returnedQty / Number(c.quantity)) * 100
            : 0)
      ).toFixed(1);

      return {
        ...c,
        returned_quantity: returnedQty,
        total_after_return: totalAfter,
        returned_percent: returnedPct,
      };
    });
  }, [collections, returnsByParent]);

  const myRows = useMemo(
    () => decorated.filter((r) => r.collector_email === myEmail),
    [decorated, myEmail]
  );

  const pendingOrFlagged = useMemo(
    () =>
      decorated.filter((r) =>
        ["pending", "flagged"].includes((r.status || "").toLowerCase())
      ),
    [decorated]
  );

  const allVendors = useMemo(
    () => ["all", ...new Set(decorated.map((r) => r.vendor_name).filter(Boolean))],
    [decorated]
  );

  const filterRows = (rows) => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        r.vendor_name?.toLowerCase().includes(q) ||
        r.material_name?.toLowerCase().includes(q) ||
        (r.project_name || "").toLowerCase().includes(q) ||
        (r.purpose || "").toLowerCase().includes(q) ||
        r.collector_email?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (r.status || "").toLowerCase() === statusFilter;

      const matchesVendor =
        vendorFilter === "all" || r.vendor_name === vendorFilter;

      return matchesSearch && matchesStatus && matchesVendor;
    });
  };

  const badgeCount = decorated.filter(
    (r) =>
      ["pending", "flagged"].includes((r.status || "").toLowerCase()) &&
      (role === "admin" || r.collector_email === myEmail)
  ).length;

  const tabRows = useMemo(() => {
    if (tab === 0) return filterRows(myRows);
    if (tab === 1) return filterRows(decorated);
    if (tab === 2) return filterRows(pendingOrFlagged);
    return [];
  }, [tab, myRows, decorated, pendingOrFlagged, search, statusFilter, vendorFilter]);

  useEffect(() => setPage(1), [tab, search, statusFilter, vendorFilter]);

  const paginatedRows = useMemo(
    () => tabRows.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [tabRows, page]
  );

  const onAdd = async (payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/material-collections/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      enqueueSnackbar("New material collection added.", { variant: "success" });
      setOpenAdd(false);
      await loadData();
    } catch (e) {
      enqueueSnackbar(`Add failed: ${e.message}`, { variant: "error" });
    }
  };

  const onEdit = async (patch) => {
    try {
      const res = await fetch(`${API_BASE}/api/material-collections/${patch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      enqueueSnackbar("Record updated successfully.", { variant: "success" });
      setOpenEdit(null);
      await loadData();
    } catch (e) {
      enqueueSnackbar(`Update failed: ${e.message}`, { variant: "error" });
    }
  };

  const handleReturn = async (row, qty, note) => {
    try {
      const res = await fetch(`${API_BASE}/api/material-collections/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: row.id,
          qty,
          note,
          actor_email: myEmail,
          actor_role: role,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      enqueueSnackbar("Return logged successfully.", { variant: "success" });
      setOpenReturn(null);
      await loadData();
    } catch (e) {
      enqueueSnackbar(`Return failed: ${e.message}`, { variant: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/material-collections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      enqueueSnackbar("Record deleted successfully.", { variant: "success" });
      await loadData();
    } catch (e) {
      enqueueSnackbar(`Delete failed: ${e.message}`, { variant: "error" });
    }
  };

  // ===================================================================
  // ✅ PDF EXPORT with Admin Mode and Returns Table
  // ===================================================================
  const exportPdf = (mode = "self", selectedUser = null) => {
    const reportDate = new Date(dateFilter);
    const prettyDate = reportDate.toLocaleDateString();

    // decide filter rule
    const emailMatch =
      mode === "self"
        ? myEmail
        : mode === "user"
        ? selectedUser
        : null; // all users

    // filter collections
    const dayCollections = decorated.filter(
      (r) =>
        sameDay(r.collection_date, reportDate) &&
        (emailMatch ? r.collector_email === emailMatch : true)
    );

    // filter returns
    const dayReturns = (returns || []).filter(
      (r) =>
        sameDay(r.created_at, reportDate) &&
        (emailMatch ? r.collector_email === emailMatch : true)
    );

    const doc = new jsPDF();

    // Header
    doc.setFontSize(14);
    doc.text("SFV Tech — Material Collection Report", 14, 16);
    doc.setFontSize(11);
    doc.text(`Date: ${prettyDate}`, 14, 23);

    let tagLine = "Scope: ";
    if (mode === "all") tagLine += "All Users";
    else if (mode === "user") tagLine += `User: ${selectedUser}`;
    else tagLine += `User: ${myEmail}`;
    doc.text(tagLine, 14, 29);

    // ================== COLLECTION TABLE ==================
    const collHead =
      role === "admin" && mode !== "self"
        ? [
            [
              "User",
              "Vendor",
              "Material",
              "Qty",
              "Returned",
              "Remaining",
              "Returned %",
              "Status",
              "Time",
            ],
          ]
        : [
            [
              "Vendor",
              "Material",
              "Qty",
              "Returned",
              "Remaining",
              "Returned %",
              "Status",
              "Time",
            ],
          ];

    const collBody = dayCollections.map((r) => {
      const row = [
        r.vendor_name,
        r.material_name,
        r.quantity,
        r.returned_quantity || 0,
        r.total_after_return,
        `${r.returned_percent}%`,
        (r.status || "").toUpperCase(),
        new Date(r.collection_date).toLocaleTimeString(),
      ];
      if (role === "admin" && mode !== "self") {
        row.unshift(r.collector_email);
      }
      return row;
    });

    autoTable(doc, {
      startY: 38,
      head: collHead,
      body: collBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 126, 51] },
    });

    const afterCollectionsY =
      (doc.lastAutoTable && doc.lastAutoTable.finalY) || 48;

    // ================== RETURNS TABLE ==================
    const retHead =
      role === "admin" && mode !== "self"
        ? [["User", "Vendor", "Material", "Qty Returned", "Note", "Time"]]
        : [["Vendor", "Material", "Qty Returned", "Note", "Time"]];

    const retBody = dayReturns.map((r) => {
      const row = [
        r.vendor_name,
        r.material_name,
        r.qty,
        r.note || "",
        new Date(r.created_at).toLocaleTimeString(),
      ];
      if (role === "admin" && mode !== "self") {
        row.unshift(r.collector_email);
      }
      return row;
    });

    autoTable(doc, {
      startY: afterCollectionsY + 12,
      head: retHead,
      body: retBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 70, 160] },
    });

    const afterReturnsY =
      (doc.lastAutoTable && doc.lastAutoTable.finalY) ||
      afterCollectionsY + 12;

    doc.setFontSize(10);
    doc.text(
      `Collections: ${collBody.length}   Returns: ${retBody.length}`,
      14,
      afterReturnsY + 8
    );
    doc.text(`Generated: ${new Date().toLocaleString()}`, 120, afterReturnsY + 8);

    let tag = "SELF";
    if (mode === "user")
      tag = `USER_${(selectedUser || "").replace(/[^a-zA-Z0-9]/g, "_")}`;
    if (mode === "all") tag = "ALL";

    doc.save(`Material_Report_${tag}_${dateFilter}.pdf`);
  };

  // ===================================================================
  // ✅ Admin-only PDF dialog logic
  // ===================================================================
  const openReportFlow = () => {
    if (role === "admin") {
      setReportMode("self");
      setReportUser("");
      setOpenReport(true);
    } else {
      exportPdf("self");
    }
  };

  const uniqueUsers = useMemo(
    () =>
      Array.from(
        new Set(
          (decorated || []).map((r) => r.collector_email).filter(Boolean)
        )
      ),
    [decorated]
  );

  return (
    <Box sx={{ minHeight: "100vh", background: theme.pageBg, color: theme.text }}>
      {/* Top Bar */}
      <AppBar
        elevation={0}
        position="sticky"
        sx={{
          background: `linear-gradient(90deg, ${theme.accentDark} 0%, ${theme.accent} 100%)`,
          color: "#fff",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              onClick={() => window.history.back()}
              startIcon={<ArrowBack />}
              sx={{ color: "#fff", fontWeight: 700 }}
            >
              Back
            </Button>
            <Typography variant="h6" fontWeight={900}>
              Material Collection Log
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              type="date"
              size="small"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{ background: "#fff", borderRadius: 1 }}
            />

            {/* ✅ Updated to handle admin report */}
            <Button
              startIcon={<PictureAsPdf />}
              onClick={openReportFlow}
              sx={{
                bgcolor: theme.accent,
                color: "#fff",
                fontWeight: 800,
                "&:hover": { bgcolor: theme.accentDark },
              }}
            >
              Daily Summary
            </Button>

            <Button
              startIcon={<Refresh />}
              onClick={loadData}
              variant="outlined"
              sx={{ borderColor: "#fff", color: "#fff" }}
            >
              Refresh
            </Button>

            <Button
              startIcon={<Logout />}
              onClick={logout}
              sx={{
                bgcolor: "#fff",
                color: theme.accentDark,
                fontWeight: 800,
                "&:hover": { bgcolor: "#f5f5f5" },
              }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Filters + Tabs */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ ".MuiTabs-indicator": { background: theme.accent, height: 3, borderRadius: 2 } }}
        >
          <Tab label="My Collections" />

          {role === "admin" && <Tab label="All Records" />}

          <Tab
            label={
              <Badge color="error" badgeContent={badgeCount}>
                Pending / Flagged
              </Badge>
            }
          />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ background: "#fff", borderRadius: 1 }}
        />

        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ background: "#fff" }}
        >
          {["all", "pending", "verified", "flagged"].map((s) => (
            <MenuItem key={s} value={s}>
              {s.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Vendor"
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          sx={{ background: "#fff" }}
        >
          {allVendors.map((v) => (
            <MenuItem key={v} value={v}>
              {v === "all" ? "All Vendors" : v}
            </MenuItem>
          ))}
        </TextField>

        <Button
          startIcon={<AddCircle />}
          onClick={() => setOpenAdd(true)}
          sx={{
            bgcolor: theme.accent,
            color: "#fff",
            fontWeight: 800,
            "&:hover": { bgcolor: theme.accentDark },
          }}
        >
          New Collection
        </Button>
      </Box>

      {/* TABLE AREA */}
      <Box sx={{ p: 2 }}>
        <Paper sx={{ border: `1px solid ${theme.border}` }}>
          {tab === 0 && (
            <MyCollectionTable
              rows={paginatedRows}
              theme={theme}
              statusToChip={statusToChip}
              fmtDate={fmtDate}
              onView={setOpenView}
              onEdit={setOpenEdit}
              onDelete={handleDelete}
              onReturn={setOpenReturn}
              role={role}
            />
          )}

          {role === "admin" && tab === 1 && (
            <AllRecordTable
              rows={paginatedRows}
              theme={theme}
              statusToChip={statusToChip}
              fmtDate={fmtDate}
              onView={setOpenView}
              onEdit={setOpenEdit}
              onDelete={handleDelete}
              onReturn={setOpenReturn}
              role={role}
            />
          )}

          {((role === "admin" && tab === 2) ||
            (role !== "admin" && tab === 1)) && (
            <PendingFlaggedTable
              rows={paginatedRows}
              theme={theme}
              statusToChip={statusToChip}
              fmtDate={fmtDate}
              onView={setOpenView}
              onEdit={setOpenEdit}
              onDelete={handleDelete}
              onReturn={setOpenReturn}
              role={role}
              userEmail={myEmail}
            />
          )}

          <Box sx={{ my: 2, display: "flex", justifyContent: "center" }}>
            <Pagination
              count={Math.max(1, Math.ceil(tabRows.length / rowsPerPage))}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
            />
          </Box>
        </Paper>
      </Box>

      {/* EXISTING DIALOGS */}
      <AddCollectionDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={onAdd}
        theme={theme}
        renderForm={(p) => <NewCollectionForm {...p} />}
      />

      <EditCollectionDialog
        open={!!openEdit}
        record={openEdit}
        onClose={() => setOpenEdit(null)}
        onSubmit={onEdit}
        theme={theme}
        role={role}
      />

      <ViewCollectionDialog
        open={!!openView}
        record={openView}
        returns={returns}
        onClose={() => setOpenView(null)}
        theme={theme}
      />

      <ReturnMaterialDialog
        open={!!openReturn}
        record={openReturn}
        onClose={() => setOpenReturn(null)}
        onSubmit={(qty, note) => handleReturn(openReturn, qty, note)}
        theme={theme}
      />

      {/* ✅ NEW: ADMIN REPORT DIALOG */}
      <Dialog open={openReport} onClose={() => setOpenReport(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900, color: theme.accentDark }}>
          Generate Report
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="mode">Mode</InputLabel>
              <Select
                labelId="mode"
                value={reportMode}
                label="Mode"
                onChange={(e) => setReportMode(e.target.value)}
              >
                <MenuItem value="self">Self</MenuItem>
                <MenuItem value="user">Specific User</MenuItem>
                <MenuItem value="all">All Users</MenuItem>
              </Select>
            </FormControl>

            {reportMode === "user" && (
              <FormControl fullWidth>
                <InputLabel id="user">User</InputLabel>
                <Select
                  labelId="user"
                  value={reportUser}
                  label="User"
                  onChange={(e) => setReportUser(e.target.value)}
                >
                  {uniqueUsers.map((u) => (
                    <MenuItem key={u} value={u}>
                      {u}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenReport(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (reportMode === "user" && !reportUser) {
                enqueueSnackbar("Select a user to continue.", {
                  variant: "warning",
                });
                return;
              }
              setOpenReport(false);
              exportPdf(reportMode, reportMode === "user" ? reportUser : myEmail);
            }}
            sx={{
              bgcolor: theme.accent,
              color: "#fff",
              fontWeight: 800,
              "&:hover": { bgcolor: theme.accentDark },
            }}
          >
            Generate PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
