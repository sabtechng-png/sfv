// ======================================================================
// SFV Tech | Engineer Dashboard Routes
// ======================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");

// ==========================================================
// 0️⃣ Health Check
// ==========================================================
router.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Engineer Dashboard Routes Active" });
});

// ==========================================================
// 1️⃣ Get Dashboard Summary
//    Includes: available balance, total spent, total received,
//              total expenses, and recent expenses.
// ==========================================================
router.get("/summary/:email", async (req, res) => {
  const { email } = req.params;

  try {
    // ----------------------------------------------------------
    // 1. Compute total imprest allocated to this user
    // ----------------------------------------------------------
    const imprestQuery = `
      SELECT COALESCE(SUM(amount), 0) AS total_imprest
      FROM public.imprest
      WHERE user_email = $1
    `;
    const imprestRes = await pool.query(imprestQuery, [email]);
    const totalImprest = parseFloat(imprestRes.rows[0].total_imprest) || 0;

    // ----------------------------------------------------------
    // 2. Compute total spent by this user
    // ----------------------------------------------------------
    const spentQuery = `
      SELECT COALESCE(SUM(amount), 0) AS total_spent
      FROM public.expenses
      WHERE user_email = $1 AND expense_type = 'spent'
    `;
    const spentRes = await pool.query(spentQuery, [email]);
    const totalSpent = parseFloat(spentRes.rows[0].total_spent) || 0;

    // ----------------------------------------------------------
    // 3. Compute total sent (transfer) and received
    // ----------------------------------------------------------
    const sentQuery = `
      SELECT COALESCE(SUM(amount), 0) AS total_sent
      FROM public.expenses
      WHERE user_email = $1 AND expense_type = 'transfer'
    `;
    const sentRes = await pool.query(sentQuery, [email]);
    const totalSent = parseFloat(sentRes.rows[0].total_sent) || 0;

    const receivedQuery = `
      SELECT COALESCE(SUM(amount), 0) AS total_received
      FROM public.expenses
      WHERE to_user_email = $1 AND expense_type = 'transfer'
    `;
    const receivedRes = await pool.query(receivedQuery, [email]);
    const totalReceived = parseFloat(receivedRes.rows[0].total_received) || 0;

    // ----------------------------------------------------------
    // 4. Compute available balance
    // ----------------------------------------------------------
    const availableBalance = totalImprest + totalReceived - totalSpent - totalSent;

    // ----------------------------------------------------------
    // 5. Fetch total expenses (count) and recent activities
    // ----------------------------------------------------------
    const expenseCountQuery = `
      SELECT COUNT(*) AS total_expenses
      FROM public.expenses
      WHERE user_email = $1
    `;
    const expenseCountRes = await pool.query(expenseCountQuery, [email]);
    const totalExpenses = parseInt(expenseCountRes.rows[0].total_expenses, 10) || 0;

    const recentQuery = `
      SELECT id, purpose, amount, expense_type, status, created_at
      FROM public.expenses
      WHERE user_email = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const recentRes = await pool.query(recentQuery, [email]);
    const recentExpenses = recentRes.rows;

    // ----------------------------------------------------------
    // 6. Return dashboard summary
    // ----------------------------------------------------------
    res.json({
      user: email,
      totalImprest,
      totalSpent,
      totalSent,
      totalReceived,
      availableBalance,
      totalExpenses,
      recentExpenses,
    });
  } catch (err) {
    console.error("Error fetching dashboard summary:", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// ==========================================================
// 2️⃣ Get Monthly Summary (Optional Extension)
// ==========================================================
router.get("/monthly/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const q = `
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        SUM(amount) FILTER (WHERE expense_type = 'spent') AS total_spent,
        SUM(amount) FILTER (WHERE expense_type = 'transfer') AS total_transfer,
        SUM(amount) FILTER (WHERE to_user_email = $1 AND expense_type = 'transfer') AS total_received
      FROM public.expenses
      WHERE user_email = $1 OR to_user_email = $1
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `;
    const { rows } = await pool.query(q, [email]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching monthly summary:", err);
    res.status(500).json({ error: "Failed to fetch monthly summary" });
  }
});

module.exports = router;
