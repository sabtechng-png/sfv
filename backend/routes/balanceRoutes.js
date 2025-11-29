// ======================================================================
// SFV Tech | Balance Routes (v1.0)
// Purpose: Provide clean balance summaries for users and admin dashboards
// Dependencies: PostgreSQL (pool from ../db)
// ======================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");

// --------------------------------------------------------------
// Helper to format numeric values
// --------------------------------------------------------------
const fmt = (v) => {
  const n = Number(v ?? 0);
  return isNaN(n) ? 0 : Number(n.toFixed(2));
};


// --------------------------------------------------------------
// 2️⃣ All Users Balance Summary
// GET /api/balance/all
// --------------------------------------------------------------
router.get("/all", async (_req, res) => {
  const SQL = `
    SELECT 
      u.email,
      COALESCE(i.total_imprest,0) AS imprest,
      COALESCE(s.total_spent,0) AS spent,
      COALESCE(t.total_transfers,0) AS transfers,
      COALESCE(r.total_refunds,0) AS refunds,
      (COALESCE(i.total_imprest,0) - COALESCE(s.total_spent,0) - COALESCE(t.total_transfers,0) + COALESCE(r.total_refunds,0)) AS available
    FROM public.users u
    LEFT JOIN (
      SELECT user_email, SUM(amount) AS total_imprest FROM public.imprest GROUP BY user_email
    ) i ON i.user_email = u.email
    LEFT JOIN (
      SELECT sender_email, SUM(amount) AS total_spent FROM public.expenses WHERE expense_type='spent' AND status='approved' GROUP BY sender_email
    ) s ON s.sender_email = u.email
    LEFT JOIN (
      SELECT sender_email, SUM(amount) AS total_transfers FROM public.expenses WHERE expense_type='transfer' GROUP BY sender_email
    ) t ON t.sender_email = u.email
    LEFT JOIN (
      SELECT receiver_email, SUM(amount) AS total_refunds FROM public.expenses WHERE expense_type='refund' AND status='approved' GROUP BY receiver_email
    ) r ON r.receiver_email = u.email
    ORDER BY u.email ASC;
  `;

  try {
    const { rows } = await pool.query(SQL);
    const summary = rows.map((x) => ({
      email: x.email,
      imprest: fmt(x.imprest),
      spent: fmt(x.spent),
      transfers: fmt(x.transfers),
      refunds: fmt(x.refunds),
      available: fmt(x.available),
    }));
    res.json(summary);
  } catch (err) {
    console.error("❌ Error fetching all balances:", err.message);
    res.status(500).json({ error: "Failed to fetch all balances" });
  }
});

// --------------------------------------------------------------
// 3️⃣ Health Check
// --------------------------------------------------------------
router.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Balance route active ✅" });
});

// --------------------------------------------------------------
// 1️⃣ Single User Balance Summary
// GET /api/balance/:email
// --------------------------------------------------------------
router.get("/:email", async (req, res) => {
  const { email } = req.params;

  const SQL = `
    WITH 
      i AS (SELECT COALESCE(SUM(amount),0) AS total_imprest FROM public.imprest WHERE user_email=$1),
      s AS (SELECT COALESCE(SUM(amount),0) AS total_spent FROM public.expenses WHERE sender_email=$1 AND expense_type='spent' AND status='approved'),
      t AS (SELECT COALESCE(SUM(amount),0) AS total_transfers FROM public.expenses WHERE sender_email=$1 AND expense_type='transfer'),
      r AS (SELECT COALESCE(SUM(amount),0) AS total_refunds FROM public.expenses WHERE receiver_email=$1 AND expense_type='refund' AND status='approved')
    SELECT 
      i.total_imprest,
      s.total_spent,
      t.total_transfers,
      r.total_refunds,
      (i.total_imprest - s.total_spent - t.total_transfers + r.total_refunds) AS available_balance
    FROM i,s,t,r;
  `;

  try {
    const { rows } = await pool.query(SQL, [email]);
    const b = rows[0] || {};
    res.json({
      email,
      imprest: fmt(b.total_imprest),
      spent: fmt(b.total_spent),
      transfers: fmt(b.total_transfers),
      refunds: fmt(b.total_refunds),
      available: fmt(b.available_balance),
      returned: 0,
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Error fetching balance:", err.message);
    res.status(500).json({ error: "Failed to fetch balance summary" });
  }
});



module.exports = router;
