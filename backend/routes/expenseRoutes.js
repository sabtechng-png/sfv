// ======================================================================
// SFV Tech | Unified Expense Routes (v3.1)
// Handles: SPENT, TRANSFER, RETURN, REFUND, and Witness Integration
// Updated Return Logic: No balance check; receiver must accept/reject.
// ======================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");

const num = (v) => Number(v ?? 0);

// --------------------------------------------------------------
// 💰 CREATE SPENT / TRANSFER / RETURN / REFUND
// --------------------------------------------------------------
router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      sender_email,
      receiver_email,
      purpose,
      amount,
      expense_type,
      notes,
      witness1,
      witness2,
    } = req.body;

    if (!sender_email || !expense_type || !amount)
      return res.status(400).json({ error: "Missing required fields." });

    await client.query("BEGIN");

    // ------------------------------------------------------
    // Insert new expense record
    // ------------------------------------------------------
    const insertExpense = `
      INSERT INTO public.expenses
        (sender_email, receiver_email, purpose, amount, expense_type, status, notes, created_at)
      VALUES ($1,$2,$3,$4,$5,'pending',$6,NOW())
      RETURNING id;
    `;

    const { rows } = await client.query(insertExpense, [
      sender_email,
      receiver_email || null,
      purpose || "",
      num(amount),
      expense_type,
      notes || null,
    ]);

    const expenseId = rows[0]?.id;
    if (!expenseId) throw new Error("Failed to create expense record.");

    // ------------------------------------------------------
    // Witness insertion for SPENT & TRANSFER only
    // ------------------------------------------------------
    if ((expense_type === "spent" || expense_type === "transfer") && (witness1 || witness2)) {
      await client.query(
        `
        INSERT INTO public.expense_witnesses
          (expense_id, witness1_email, witness2_email, created_at)
        VALUES ($1,$2,$3,NOW());
        `,
        [expenseId, witness1 || null, witness2 || null]
      );
    }

    // ------------------------------------------------------
    // Auto-approve REFUND; RETURN stays pending for receiver decision
    // ------------------------------------------------------
    if (expense_type === "refund") {
      await client.query(
        `UPDATE public.expenses SET status='approved', updated_at=NOW() WHERE id=$1;`,
        [expenseId]
      );
    }

    // ------------------------------------------------------
    // Log creation
    // ------------------------------------------------------
    const actionLabel =
      expense_type === "spent"
        ? "💸 Spent"
        : expense_type === "transfer"
        ? "🔁 Transfer"
        : expense_type === "refund"
        ? "♻️ Refund"
        : "↩️ Return";

    await client.query(
      `
      INSERT INTO public.expense_logs
        (expense_id, actor_email, action, log_message, timestamp)
      VALUES ($1,$2,'created',$3,NOW());
      `,
      [
        expenseId,
        sender_email,
        `${actionLabel} ₦${num(amount).toLocaleString()} initiated by ${sender_email}${
          receiver_email ? " to " + receiver_email : ""
        } for '${purpose || "N/A"}'`,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      expense_id: expenseId,
      message: `${expense_type.toUpperCase()} recorded successfully.`,
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Expense creation error:", err.message);
    res.status(500).json({ error: "Failed to record expense." });
  } finally {
    client.release();
  }
});

// --------------------------------------------------------------
// 📊 BALANCE SUMMARY
// /api/engineer/expenses/balance/:email
// --------------------------------------------------------------
router.get("/balance/:email", async (req, res) => {
  const { email } = req.params;

  const SQL = `
    WITH 
      i AS (SELECT COALESCE(SUM(amount),0) AS total_imprest FROM public.imprest WHERE user_email=$1),
      s AS (SELECT COALESCE(SUM(amount),0) AS total_spent FROM public.expenses WHERE sender_email=$1 AND expense_type='spent' AND status='approved'),
      t AS (SELECT COALESCE(SUM(amount),0) AS total_transfers FROM public.expenses WHERE sender_email=$1 AND expense_type='transfer'),
      r AS (SELECT COALESCE(SUM(amount),0) AS total_refunds FROM public.expenses WHERE receiver_email=$1 AND expense_type='refund' AND status='approved'),
      ret AS (SELECT COALESCE(SUM(amount),0) AS total_returned FROM public.expenses WHERE receiver_email=$1 AND expense_type='return' AND status='approved')
    SELECT 
      i.total_imprest,
      s.total_spent,
      t.total_transfers,
      r.total_refunds,
      ret.total_returned,
      (i.total_imprest - s.total_spent - t.total_transfers + r.total_refunds + ret.total_returned) AS available_balance
    FROM i,s,t,r,ret;
  `;

  try {
    const { rows } = await pool.query(SQL, [email]);
    const b = rows[0] || {};

    res.json({
      email,
      availableBalance: num(b.available_balance),
      totalBalance: num(b.available_balance),
      imprest: num(b.total_imprest),
      spent: num(b.total_spent),
      transfers: num(b.total_transfers),
      refunds: num(b.total_refunds),
      returned: num(b.total_returned),
    });
  } catch (err) {
    console.error("❌ Error fetching balance summary:", err.message);
    res.status(500).json({ error: "Failed to fetch balance summary." });
  }
});

// --------------------------------------------------------------
// 📜 FETCH ALL EXPENSES (SENT OR RECEIVED)
// --------------------------------------------------------------
router.get("/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        id, sender_email, receiver_email, purpose, amount, expense_type,
        status, notes, created_at, updated_at
      FROM public.expenses
      WHERE sender_email=$1 OR receiver_email=$1
      ORDER BY created_at DESC;
      `,
      [email]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch expenses error:", err.message);
    res.status(500).json({ error: "Failed to load expenses." });
  }
});

// --------------------------------------------------------------
// ⚙️ UPDATE EXPENSE STATUS (general use for approvals)
// --------------------------------------------------------------
router.put("/status/:id", async (req, res) => {
  const { id } = req.params;
  const { status, actor_email } = req.body;

  if (!status)
    return res.status(400).json({ error: "Missing status field." });

  try {
    await pool.query(
      `UPDATE public.expenses SET status=$1, updated_at=NOW() WHERE id=$2;`,
      [status, id]
    );

    await pool.query(
      `
      INSERT INTO public.expense_logs
        (expense_id, actor_email, action, log_message, timestamp)
      VALUES ($1,$2,$3,$4,NOW());
      `,
      [
        id,
        actor_email,
        status,
        `Expense ${id} marked as ${status.toUpperCase()} by ${actor_email}`,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating expense status:", err.message);
    res.status(500).json({ error: "Failed to update status." });
  }
});

// --------------------------------------------------------------
// ↩️ RETURN DECISION (Receiver Accept / Reject)
// --------------------------------------------------------------
router.put("/return/decision/:id", async (req, res) => {
  const { id } = req.params;
  const { decision, actor_email } = req.body; // "accept" | "reject"

  try {
    const { rows } = await pool.query(
      `SELECT * FROM public.expenses WHERE id=$1 AND expense_type='return';`,
      [id]
    );
    const exp = rows[0];
    if (!exp) return res.status(404).json({ error: "Return not found." });

    if (decision === "accept") {
      // Mark approved so it reflects in receiver balance
      await pool.query(
        `UPDATE public.expenses SET status='approved', updated_at=NOW() WHERE id=$1;`,
        [id]
      );

      // Log acceptance
      await pool.query(
        `
        INSERT INTO public.expense_logs
          (expense_id, actor_email, action, log_message, timestamp)
        VALUES ($1,$2,'accepted',$3,NOW());
        `,
        [
          id,
          actor_email,
          `Return ₦${exp.amount.toLocaleString()} accepted by ${actor_email}`,
        ]
      );

      res.json({ success: true, message: "Return accepted and credited." });
    } else if (decision === "reject") {
      await pool.query(
        `UPDATE public.expenses SET status='rejected', updated_at=NOW() WHERE id=$1;`,
        [id]
      );

      await pool.query(
        `
        INSERT INTO public.expense_logs
          (expense_id, actor_email, action, log_message, timestamp)
        VALUES ($1,$2,'rejected',$3,NOW());
        `,
        [
          id,
          actor_email,
          `Return ₦${exp.amount.toLocaleString()} rejected by ${actor_email}`,
        ]
      );

      res.json({ success: true, message: "Return rejected (no refund)." });
    } else {
      res.status(400).json({ error: "Invalid decision value." });
    }
  } catch (err) {
    console.error("❌ Return decision error:", err.message);
    res.status(500).json({ error: "Failed to process return decision." });
  }
});

// --------------------------------------------------------------
// 🩺 HEALTH CHECK
// --------------------------------------------------------------
router.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Expense route active ✅" });
});

module.exports = router;
