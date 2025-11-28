// witnessRoutes.js — CLEAN ORDER

const express = require("express");
const router = express.Router();
const pool = require("../db");

// 0) Health
router.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Witness routes active" });
});

// 1) Batch fetch (used by ExpensesPage)  <<— must be before :email
router.get("/batch", async (req, res) => {
  try {
    const ids = (req.query.ids || "")
      .split(",")
      .map(x => parseInt(x.trim(), 10))
      .filter(x => !isNaN(x));

    if (!ids.length) return res.json([]);

    const sql = `
      SELECT expense_id,
             witness1_email, witness2_email,
             witness1_status, witness2_status,
             witness1_remarks, witness2_remarks
      FROM public.expense_witnesses
      WHERE expense_id = ANY($1::int[])
    `;
    const { rows } = await pool.query(sql, [ids]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Batch witness fetch error:", err.message);
    res.status(500).json({ error: "Failed to load witness data" });
  }
});

// 2) Summary counts
router.get("/summary/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const sql = `
      SELECT
        COUNT(*) FILTER (
          WHERE (witness1_email = $1 AND witness1_status='pending')
             OR (witness2_email = $1 AND witness2_status='pending')
        ) AS pending_count,
        COUNT(*) FILTER (
          WHERE (witness1_email = $1 AND witness1_status='agreed')
             OR (witness2_email = $1 AND witness2_status='agreed')
        ) AS agreed_count,
        COUNT(*) FILTER (
          WHERE (witness1_email = $1 AND witness1_status='disagreed')
             OR (witness2_email = $1 AND witness2_status='disagreed')
        ) AS disagreed_count
      FROM public.expense_witnesses;
    `;
    const { rows } = await pool.query(sql, [email]);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Witness summary error:", err.message);
    res.status(500).json({ error: "Failed to fetch witness summary" });
  }
});

// 3) Respond (agree/disagree)
router.put("/respond/:expense_id", async (req, res) => {
  const { expense_id } = req.params;
  const { witness_email, status, remarks } = req.body;
  const valid = ["agreed", "disagreed"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status. Use agreed or disagreed." });

  try {
    const check = await pool.query(
      `SELECT witness1_email, witness2_email FROM public.expense_witnesses WHERE expense_id=$1`,
      [expense_id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: "No witness record found" });

    const { witness1_email, witness2_email } = check.rows[0];
    const isW1 = witness_email === witness1_email;
    const isW2 = witness_email === witness2_email;
    if (!isW1 && !isW2) return res.status(403).json({ error: "You are not a witness for this expense" });

    const updateSql = isW1
      ? `UPDATE public.expense_witnesses SET witness1_status=$1, witness1_remarks=$2, updated_at=NOW() WHERE expense_id=$3`
      : `UPDATE public.expense_witnesses SET witness2_status=$1, witness2_remarks=$2, updated_at=NOW() WHERE expense_id=$3`;

    await pool.query(updateSql, [status, remarks || null, expense_id]);

    // (Optional) log
    try {
      await pool.query(
        `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
         VALUES ($1, $2, $3, $4)`,
        [expense_id, witness_email, `witness_${status}`, `Witness ${witness_email} marked as ${status}`]
      );
    } catch (e) {
      console.warn("⚠️ Log insert skipped:", e.message);
    }

    res.json({ message: `Witness ${witness_email} marked as ${status}` });
  } catch (err) {
    console.error("❌ Witness respond error:", err.message);
    res.status(500).json({ error: "Failed to update witness status" });
  }
});

// 4) Fetch all witness items for a user (generic)  <<— keep LAST
router.get("/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const sql = `
      SELECT 
        e.id AS expense_id,
        e.purpose,
        e.amount,
        e.expense_type,
        e.sender_email,
        e.receiver_email,
        e.status AS expense_status,
        e.created_at AS expense_date,
        ew.witness1_email,
        ew.witness2_email,
        ew.witness1_status,
        ew.witness2_status,
        ew.created_at AS witness_created_at
      FROM public.expenses e
      JOIN public.expense_witnesses ew ON e.id = ew.expense_id
      WHERE ew.witness1_email = $1 OR ew.witness2_email = $1
      ORDER BY e.created_at DESC
    `;
    const { rows } = await pool.query(sql, [email]);
    res.json(rows);
  } catch (err) {
    console.error("❌ Witness fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch witness records" });
  }
});

module.exports = router;
