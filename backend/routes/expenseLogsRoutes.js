// ======================================================================
// SFV Tech | Expense Logs Routes (v1.0)
// Purpose: Provide read-only endpoints for expense/audit logs
// Dependencies: PostgreSQL (pool from ../db)
// ======================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");

// --------------------------------------------------------------
// 1️⃣ Get logs for a specific expense
// GET /api/expense-logs/:expense_id
// --------------------------------------------------------------
router.get("/:expense_id", async (req, res) => {
  const { expense_id } = req.params;
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        l.expense_id,
        l.actor_email,
        u.nickname AS actor_name,
        l.action,
        l.log_message,
        l.timestamp
      FROM public.expense_logs l
      LEFT JOIN public.users u ON l.actor_email = u.email
      WHERE l.expense_id = $1
      ORDER BY l.timestamp DESC;
      `,
      [expense_id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "No logs found for this expense." });

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching expense logs:", err.message);
    res.status(500).json({ error: "Failed to fetch expense logs." });
  }
});

// --------------------------------------------------------------
// 2️⃣ Get logs related to a specific user
// GET /api/expense-logs/user/:email
// --------------------------------------------------------------
router.get("/user/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        l.expense_id,
        l.actor_email,
        u.nickname AS actor_name,
        l.action,
        l.log_message,
        l.timestamp
      FROM public.expense_logs l
      LEFT JOIN public.users u ON l.actor_email = u.email
      WHERE 
        l.actor_email = $1 
        OR l.expense_id IN (
          SELECT id FROM public.expenses 
          WHERE sender_email=$1 OR receiver_email=$1
        )
      ORDER BY l.timestamp DESC;
      `,
      [email]
    );

    if (!rows.length)
      return res.status(404).json({ message: "No logs found for this user." });

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching user logs:", err.message);
    res.status(500).json({ error: "Failed to fetch user logs." });
  }
});

// --------------------------------------------------------------
// 3️⃣ Get all logs (Admin or Auditor use)
// GET /api/expense-logs/all
// --------------------------------------------------------------
router.get("/all", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        l.expense_id,
        l.actor_email,
        u.nickname AS actor_name,
        e.sender_email,
        e.receiver_email,
        e.expense_type,
        e.status,
        l.action,
        l.log_message,
        l.timestamp
      FROM public.expense_logs l
      LEFT JOIN public.users u ON l.actor_email = u.email
      LEFT JOIN public.expenses e ON e.id = l.expense_id
      ORDER BY l.timestamp DESC
      LIMIT 500;
      `
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching all logs:", err.message);
    res.status(500).json({ error: "Failed to fetch all logs." });
  }
});

// --------------------------------------------------------------
// 4️⃣ Optional: Filter by date range
// Example: /api/expense-logs/range?start=2025-10-01&end=2025-10-22
// --------------------------------------------------------------
router.get("/range", async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end)
    return res
      .status(400)
      .json({ error: "Both 'start' and 'end' date parameters are required." });

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        l.expense_id,
        l.actor_email,
        u.nickname AS actor_name,
        l.action,
        l.log_message,
        l.timestamp
      FROM public.expense_logs l
      LEFT JOIN public.users u ON l.actor_email = u.email
      WHERE l.timestamp BETWEEN $1 AND $2
      ORDER BY l.timestamp DESC;
      `,
      [start, end]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching logs by date range:", err.message);
    res.status(500).json({ error: "Failed to fetch logs by date range." });
  }
});

// --------------------------------------------------------------
// 5️⃣ Health Check
// --------------------------------------------------------------
router.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Expense Logs route active ✅" });
});

module.exports = router;
