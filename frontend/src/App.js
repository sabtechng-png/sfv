// ===============================================================
// SFV Tech – Unified Multi-Role Routing (Admin / Engineer / Staff / Storekeeper / Apprentice)
// Updated & Cleaned Routing Structure
// ===============================================================

import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Login from "./pages/Login.jsx";

// ==== Admin Pages ====
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminAuditAccessPage from "./pages/admin/AdminAuditAccessPage.jsx";
import MaterialsList from "./pages/MaterialsList.jsx";
import UserManagementPage from "./pages/admin/UserManagementPage.jsx";

import CreateQuotationPage from "./pages/quotations/CreateQuotationPage.jsx";
import QuotationListPage from "./pages/quotations/QuotationListPage.jsx";
import QuotationDashboard from "./pages/quotations/QuotationDashboard.jsx";
import QuotationPrintPage from "./pages/quotations/QuotationPrintPage.jsx";
import QuotationViewPage from "./pages/quotations/QuotationViewPage.jsx";
import QuotationSettingsPage from "./pages/quotations/QuotationSettingsPage.jsx";
import EditQuotationPage from "./pages/quotations/EditQuotationPage";

// ==== Engineer Pages ====
import EngineerLayout from "./layouts/EngineerLayout.jsx";
import EngineerDashboard from "./pages/EngineerDashboard.jsx";
import WorkPage from "./pages/engineer/WorkPage.jsx";
import ExpensesPage from "./pages/engineer/ExpensesPage.jsx";
import MyRequests from "./pages/engineer/MaterialsRequestPage.jsx";
import MaintenancePage from "./pages/engineer/MaintenancePage.jsx";
import ReportsPage from "./pages/engineer/ReportsPage.jsx";
import MessagesPage from "./pages/engineer/MessagesPage.jsx";
import WitnessPage from "./pages/engineer/WitnessPage.jsx";

// ==== Staff Pages ====
import StaffLayout from "./layouts/StaffLayout.jsx";
import StaffDashboard from "./pages/StaffDashboard.jsx";
import StaffQuotations from "./pages/staff/StaffQuotations.jsx";
import StaffStore from "./pages/staff/StaffStore.jsx";
import StaffLogs from "./pages/staff/StaffLogs.jsx";

// ==== Storekeeper Pages ====
import StorekeeperLayout from "./layouts/StorekeeperLayout.jsx";
import StorekeeperDashboard from "./pages/StorekeeperDashboard.jsx";
import StorekeeperInventoryPage from "./pages/storekeeper/StorekeeperInventoryPage.jsx";
import StorekeeperRequestsPage from "./pages/storekeeper/StorekeeperRequestsPage.jsx";
import InventoryLogsSection from "./pages/storekeeper/InventoryLogsSection.jsx";
import MaterialAuditPage from "./pages/storekeeper/MaterialAuditPage.jsx";
import MaterialCollectionPage from "./pages/storekeeper/MaterialCollectionPage.jsx";

// ==== Apprentice Pages ====
import ApprenticeLayout from "./layouts/ApprenticeLayout.jsx";
import ApprenticeDashboard from "./pages/ApprenticeDashboard.jsx";

// ==== Shared Job Pages (Admin + Engineer) ====
import JobDashboard from "./pages/jobs/JobDashboard.jsx";
import RegisterWorkPage from "./pages/jobs/RegisterWorkPage.jsx";
import ManageWorkPage from "./pages/jobs/ManageWorkPage.jsx";
import JobDetailPage from "./pages/jobs/JobDetailPage.jsx";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ============================================================= */}
        {/* PUBLIC ROUTE */}
        {/* ============================================================= */}
        <Route path="/" element={<Login />} />

        {/* ============================================================= */}
        {/* ADMIN ROUTES */}
        {/* ============================================================= */}
        <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/materials" element={<MaterialsList />} />
            <Route path="/admin/users" element={<UserManagementPage />} />

            {/* Inventory */}
            <Route path="/admin/inventory" element={<StorekeeperInventoryPage role="admin" />} />
            <Route path="/admin/inventory-logs" element={<InventoryLogsSection />} />

            {/* Audit */}
            <Route path="/admin/audit" element={<MaterialAuditPage />} />
            <Route path="/admin/audit-access" element={<AdminAuditAccessPage />} />

            {/* Material Requests / Collection */}
            <Route path="/admin/myrequests" element={<MyRequests />} />
            <Route path="/admin/collections" element={<MaterialCollectionPage />} />

            {/* Quotations */}
			
            <Route path="/admin/quotations" element={<QuotationDashboard />} />
    <Route path="/admin/quotations/list" element={<QuotationListPage />} />
    <Route path="/admin/quotations/create" element={<CreateQuotationPage />} />
    <Route path="/admin/quotations/view/:id" element={<QuotationViewPage />} />
    <Route path="/admin/quotations/edit/:id" element={<EditQuotationPage />} />
    <Route path="/admin/quotations/print/:id" element={<QuotationPrintPage />} />

            {/* Quotation Settings (ADMIN ONLY) */}
          <Route path="/admin/quotation-settings" element={<QuotationSettingsPage />} />
          </Route>
        </Route>

        {/* ============================================================= */}
        {/* ENGINEER ROUTES */}
        {/* ============================================================= */}
        <Route element={<PrivateRoute allowedRoles={["engineer"]} />}>
          <Route element={<EngineerLayout />}>
            <Route path="/engineer/dashboard" element={<EngineerDashboard />} />
            <Route path="/engineer/work" element={<WorkPage />} />
            <Route path="/engineer/expenses" element={<ExpensesPage />} />
            <Route path="/engineer/myrequests" element={<MyRequests />} />
            <Route path="/engineer/maintenance" element={<MaintenancePage />} />
            <Route path="/engineer/reports" element={<ReportsPage />} />
            <Route path="/engineer/messages" element={<MessagesPage />} />
            <Route path="/engineer/witness" element={<WitnessPage />} />
            <Route path="/engineer/audit" element={<MaterialAuditPage />} />
            <Route path="/engineer/collections" element={<MaterialCollectionPage />} />
					
            {/* Quotations */}
             <Route path="/engineer/quotations" element={<QuotationDashboard />} />
    <Route path="/engineer/quotations/list" element={<QuotationListPage />} />
    <Route path="/engineer/quotations/create" element={<CreateQuotationPage />} />
    <Route path="/engineer/quotations/view/:id" element={<QuotationViewPage />} />
    <Route path="/engineer/quotations/edit/:id" element={<EditQuotationPage />} />
    <Route path="/engineer/quotations/print/:id" element={<QuotationPrintPage />} />
			
			
           
          </Route>
        </Route>

        {/* ============================================================= */}
        {/* STAFF ROUTES */}
        {/* ============================================================= */}
        <Route element={<PrivateRoute allowedRoles={["staff"]} />}>
          <Route element={<StaffLayout />}>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/witness" element={<WitnessPage />} />
            <Route path="/staff/myrequests" element={<MyRequests />} />
            <Route path="/staff/audit" element={<MaterialAuditPage />} />
            <Route path="/staff/expenses" element={<ExpensesPage />} />
            <Route path="/staff/collections" element={<MaterialCollectionPage />} />
            <Route path="/staff/store" element={<StaffStore />} />
            <Route path="/staff/logs" element={<StaffLogs />} />
		
            {/* Quotations */}
    <Route path="/staff/quotations" element={<QuotationDashboard />} />
    <Route path="/staff/quotations/list" element={<QuotationListPage />} />
    <Route path="/staff/quotations/create" element={<CreateQuotationPage />} />
    <Route path="/staff/quotations/view/:id" element={<QuotationViewPage />} />
    <Route path="/staff/quotations/edit/:id" element={<EditQuotationPage />} />
    <Route path="/staff/quotations/print/:id" element={<QuotationPrintPage />} />
			
          </Route>
        </Route>

        {/* ============================================================= */}
        {/* STOREKEEPER ROUTES */}
        {/* ============================================================= */}
        <Route element={<PrivateRoute allowedRoles={["storekeeper"]} />}>
          <Route element={<StorekeeperLayout />}>
            <Route path="/store/dashboard" element={<StorekeeperDashboard />} />
            <Route path="/storekeeper/witness" element={<WitnessPage />} />
            <Route path="/storekeeper/inventory" element={<StorekeeperInventoryPage role="storekeeper" />} />
            <Route path="/storekeeper/requests" element={<StorekeeperRequestsPage />} />
            <Route path="/storekeeper/material_request" element={<MyRequests />} />
            <Route path="/storekeeper/inventory-logs" element={<InventoryLogsSection />} />
            <Route path="/storekeeper/audit" element={<MaterialAuditPage />} />
            <Route path="/storekeeper/collections" element={<MaterialCollectionPage />} />
          </Route>
        </Route>

        {/* ============================================================= */}
        {/* APPRENTICE ROUTES */}
        {/* ============================================================= */}
        <Route element={<PrivateRoute allowedRoles={["apprentice"]} />}>
          <Route element={<ApprenticeLayout />}>
            <Route path="/apprentice/dashboard" element={<ApprenticeDashboard />} />
            <Route path="/apprentice/witness" element={<WitnessPage />} />
            <Route path="/apprentice/audit" element={<MaterialAuditPage />} />
            <Route path="/apprentice/expenses" element={<ExpensesPage />} />
          </Route>
        </Route>

        {/* ============================================================= */}
        {/* SHARED JOB ROUTES (Admin + Engineer) */}
        {/* ============================================================= */}
        <Route element={<PrivateRoute allowedRoles={["admin", "engineer"]} />}>
          <Route path="/jobs" element={<JobDashboard />} />
          <Route path="/jobs/register" element={<RegisterWorkPage />} />
          <Route path="/jobs/manage" element={<ManageWorkPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        </Route>

        {/* ============================================================= */}
        {/* GLOBAL PUBLIC PRINT ROUTE */}
        {/* ============================================================= */}
        <Route path="/print/quotation/:id" element={<QuotationPrintPage />} />

      </Routes>
    </AuthProvider>
  );
}

export default App;
