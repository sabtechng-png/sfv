// =============================================================
// SFV Tech | Staff Routes (Dashboard + Summary API)
// =============================================================

const express = require("express");
const router = express.Router();

// ==========================
// 1️⃣  Dashboard Summary API
// ==========================
router.get("/summary", (req, res) => {
  try {
    const summary = {
      expenses: 14,         // verified or pending expense reports
      quotations: 6,        // quotations needing review
      storeItems: 78,       // total items (new + used)
      logs: 21,             // total system log entries
      reports: 4,           // generated or pending reports
      unreadMessages: 3,
      notifications: 4,
    };

    res.status(200).json(summary);
  } catch (err) {
    console.error("Error fetching staff summary:", err);
    res.status(500).json({ message: "Error fetching staff summary" });
  }
});

// ===========================
// 2️⃣  Expenses Management
// ===========================
router.get("/expenses", (req, res) => {
  const expenses = [
    {
      id: 1,
      engineer: "Engr. Musa",
      amount: 25000,
      category: "Diesel Purchase",
      date: "2025-10-14",
      status: "Pending Review",
    },
    {
      id: 2,
      engineer: "Engr. Sodiq",
      amount: 7200,
      category: "Transportation",
      date: "2025-10-13",
      status: "Verified",
    },
  ];
  res.json(expenses);
});

// ===========================
// 3️⃣  Quotation Review
// ===========================
router.get("/quotations", (req, res) => {
  const quotations = [
    {
      id: 101,
      title: "Solar Installation - Client A",
      engineer: "Engr. Bala",
      amount: 455000,
      status: "Awaiting Approval",
      date: "2025-10-10",
    },
    {
      id: 102,
      title: "Battery Replacement - Client B",
      engineer: "Engr. Musa",
      amount: 89000,
      status: "Approved",
      date: "2025-10-09",
    },
  ];
  res.json(quotations);
});

// ===========================
// 4️⃣  Store Record API
// ===========================
router.get("/store", (req, res) => {
  const store = [
    { id: 1, item: "Multimeter", quantity: 5, condition: "New" },
    { id: 2, item: "DC Cables", quantity: 12, condition: "Used" },
    { id: 3, item: "Soldering Iron", quantity: 3, condition: "New" },
  ];
  res.json(store);
});

// ===========================
// 5️⃣  Logs API
// ===========================
router.get("/logs", (req, res) => {
  const logs = [
    {
      id: 1,
      type: "System",
      detail: "Engineer Musa added new expense log",
      timestamp: "2025-10-15 10:30 AM",
    },
    {
      id: 2,
      type: "Audit",
      detail: "Storekeeper verified material issue to Engr. Bala",
      timestamp: "2025-10-15 11:10 AM",
    },
  ];
  res.json(logs);
});

module.exports = router;
