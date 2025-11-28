// ======================================================================
// SFV Tech | Engineer Expense Routes (Improved v18 + Transfer Witness Fix)
// Rules enforced:
//  1. Transfer/Spent allowed only if Available ≥ amount (no Returned pool).
//  2. Available = imprest - approved spent - all transfers + refunds.
//  3. Available never negative.
//  4. Receiver can Accept/Reject transfers.
//  5. Return approval credits receiver's Available via approved refund.
//  6. Returned balance retained only for backward UI compatibility (always 0).
// ======================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");

// ---------------- Utils ----------------
const fmt = (v) => {
  const n = Number(v ?? 0);
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

// ---------------- Health ----------------
router.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Engineer Expense Routes Active" });
});

// ---------------- Fetch all expenses for a user ----------------
router.get("/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const { rows } = await pool.query(
      `
      SELECT id, sender_email, receiver_email, purpose, amount, expense_type,
             status, category, notes, created_at, updated_at
      FROM public.expenses
      WHERE sender_email = $1 OR receiver_email = $1
      ORDER BY created_at DESC;
      `,
      [email]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch expenses error:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// ---------------- Balance summary ----------------
router.get("/balance/:email", async (req, res) => {
  const { email } = req.params;

  const BALANCE_SQL = `
    WITH 
    imprest AS (
      SELECT COALESCE(SUM(amount),0) AS total_imprest
      FROM public.imprest WHERE user_email = $1
    ),
    spent AS (
      SELECT COALESCE(SUM(amount),0) AS total_spent
      FROM public.expenses
      WHERE sender_email = $1 AND expense_type = 'spent' AND status='approved'
    ),
    transfers_out_gross AS (
      SELECT COALESCE(SUM(amount),0) AS total_transfers_out_gross
      FROM public.expenses
      WHERE sender_email = $1 AND expense_type='transfer'
    ),
    transfers_out_net AS (
      SELECT COALESCE(SUM(amount),0) AS total_transfers_out_net
      FROM public.expenses
      WHERE sender_email = $1 AND expense_type='transfer' AND (status IS NULL OR status <> 'rejected')
    ),
    refunds_in AS (
      SELECT COALESCE(SUM(amount),0) AS total_refunds_in
      FROM public.expenses
      WHERE receiver_email = $1 AND expense_type='refund' AND status='approved'
    )
    SELECT 
      i.total_imprest,
      s.total_spent,
      tog.total_transfers_out_gross,
      ton.total_transfers_out_net,
      rf.total_refunds_in,
      0 AS returned_balance,  -- No returned pool
      (i.total_imprest - s.total_spent - tog.total_transfers_out_gross + rf.total_refunds_in) AS available_balance
    FROM imprest i, spent s, transfers_out_gross tog, transfers_out_net ton, refunds_in rf;
  `;

  try {
    const { rows } = await pool.query(BALANCE_SQL, [email]);
    const b = rows[0] || {};
    const available = Number(b.available_balance || 0);

    res.json({
      engineerEmail: email,
      totalImprest: Number(b.total_imprest || 0),
      totalSpent: Number(b.total_spent || 0),
      totalSentGross: Number(b.total_transfers_out_gross || 0),
      totalSentNet: Number(b.total_transfers_out_net || 0),
      totalRefundsIn: Number(b.total_refunds_in || 0),
      totalReturned: 0,
      availableBalance: available,
      totalUsableForTransfer: available, // usable = available
      totalBalance: available,
    });
  } catch (err) {
    console.error("❌ Balance fetch error:", err);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// ---------------- TRANSFER ----------------
router.post("/transfer", async (req, res) => {
  const { sender_email, receiver_email, purpose, amount, notes } = req.body;
  if (!sender_email || !receiver_email || !purpose || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check Available only (no returned)
    const { rows } = await client.query(
      `
      WITH 
      i AS (SELECT COALESCE(SUM(amount),0) AS total_imprest FROM public.imprest WHERE user_email=$1),
      s AS (SELECT COALESCE(SUM(amount),0) AS total_spent FROM public.expenses WHERE sender_email=$1 AND expense_type='spent' AND status='approved'),
      tog AS (SELECT COALESCE(SUM(amount),0) AS total_transfers_out_gross FROM public.expenses WHERE sender_email=$1 AND expense_type='transfer'),
      rf AS (SELECT COALESCE(SUM(amount),0) AS total_refunds_in FROM public.expenses WHERE receiver_email=$1 AND expense_type='refund' AND status='approved')
      SELECT (i.total_imprest - s.total_spent - tog.total_transfers_out_gross + rf.total_refunds_in) AS available_balance
      FROM i,s,tog,rf;
      `,
      [sender_email]
    );
    const available = Number(rows[0]?.available_balance || 0);

    if (available < Number(amount)) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: `Insufficient Available balance. ₦${fmt(available)} < ₦${fmt(amount)}.` });
    }

    // Record transfer (pending)
    const ins = await client.query(
      `INSERT INTO public.expenses
       (sender_email, receiver_email, purpose, amount, expense_type, status, category, notes, created_at)
       VALUES ($1,$2,$3,$4,'transfer','pending','system',$5,NOW())
       RETURNING id;`,
      [sender_email, receiver_email, purpose, amount, notes || null]
    );

    const expenseId = ins.rows[0].id;

    // --- NEW: Auto-create witness pair for transfer ---
    await client.query(
      `INSERT INTO public.expense_witnesses 
       (expense_id, witness1_email, witness2_email, witness1_status, witness2_status, created_at)
       SELECT $1, w1.email, w2.email, 'pending', 'pending', NOW()
       FROM (SELECT email FROM public.users WHERE role='admin' LIMIT 1) w1,
            (SELECT email FROM public.users WHERE role='auditor' LIMIT 1) w2;`,
      [expenseId]
    );

    // Log action
    await client.query(
      `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
       VALUES ($1,$2,'transfer_init',$3);`,
      [expenseId, sender_email, `Transfer ₦${fmt(amount)} to ${receiver_email} (pending)`]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Transfer recorded with witnesses", expenseId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Transfer error:", err.message);
    res.status(500).json({ error: "Failed to record transfer" });
  } finally {
    client.release();
  }
});

// ---------------- STATUS: Approve / Reject / Return ----------------
router.put("/status/:id", async (req, res) => {
  const { id } = req.params;
  const { status, actor_email } = req.body;
  const valid = ["approved", "rejected", "returned"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT * FROM public.expenses WHERE id=$1;`, [id]);
    if (!rows.length) throw new Error("Expense not found");
    const exp = rows[0];
    const { sender_email, receiver_email, amount, expense_type } = exp;

    // ===== TRANSFER =====
    if (expense_type === "transfer") {
      if (status === "approved") {
        await client.query(`UPDATE public.expenses SET status='approved', updated_at=NOW() WHERE id=$1;`, [id]);
        await client.query(
          `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
           VALUES ($1,$2,'approved',$3);`,
          [id, actor_email, `✅ Transfer ₦${fmt(amount)} approved by ${receiver_email}`]
        );
      } else if (status === "rejected") {
        // Refund sender's Available
        await client.query(`UPDATE public.expenses SET status='rejected', updated_at=NOW() WHERE id=$1;`, [id]);
        await client.query(
          `INSERT INTO public.expenses (sender_email, receiver_email, purpose, amount, expense_type, status, category, notes, created_at)
           VALUES ($1,$2,'Refund for rejected transfer',$3,'refund','approved','system','Refund processed automatically',NOW());`,
          [receiver_email, sender_email, amount]
        );
        await client.query(
          `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
           VALUES ($1,$2,'rejected',$3);`,
          [id, actor_email, `❌ Transfer ₦${fmt(amount)} rejected — refunded to ${sender_email}`]
        );
      } else if (status === "returned") {
        // Allow receiver to initiate return (pending)
        await client.query(`UPDATE public.expenses SET status='returned', updated_at=NOW() WHERE id=$1;`, [id]);
        await client.query(
          `INSERT INTO public.expenses (sender_email, receiver_email, purpose, amount, expense_type, status, category, notes, created_at)
           VALUES ($1,$2,$3,$4,'return','pending','system','Return initiated',NOW());`,
          [receiver_email, sender_email, `Return initiated by ${receiver_email}`, amount]
        );
        await client.query(
          `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
           VALUES ($1,$2,'returned',$3);`,
          [id, actor_email, `↩️ ${receiver_email} initiated return ₦${fmt(amount)} to ${sender_email}`]
        );
      }
    }

    // ===== RETURN =====
    else if (expense_type === "return") {
      if (status === "approved") {
        // Credit receiver's Available via refund
        await client.query(
          `UPDATE public.expenses
           SET status='approved', notes='Return approved (credited to receiver AVAILABLE)', updated_at=NOW()
           WHERE id=$1;`,
          [id]
        );
        await client.query(
          `INSERT INTO public.expenses
           (sender_email, receiver_email, purpose, amount, expense_type, status, category, notes, created_at)
           VALUES ($1,$2,$3,$4,'refund','approved','system','Auto-credit from approved return',NOW());`,
          [actor_email, receiver_email, `Refund from approved return #${id}`, amount]
        );
        await client.query(
          `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
           VALUES ($1,$2,'approved',$3);`,
          [id, actor_email, `✅ Return ₦${fmt(amount)} approved — credited to ${receiver_email}'s Available`]
        );
      } else if (status === "rejected") {
        await client.query(`UPDATE public.expenses SET status='rejected', updated_at=NOW() WHERE id=$1;`, [id]);
        await client.query(
          `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
           VALUES ($1,$2,'rejected',$3);`,
          [id, actor_email, `❌ Return ₦${fmt(amount)} rejected by ${receiver_email}`]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: `Expense ${status} successfully.` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Status update error:", err.message);
    res.status(500).json({ error: err.message || "Failed to update expense status" });
  } finally {
    client.release();
  }
});

// ---------------- Logs ----------------
router.get("/logs/:expense_id", async (req, res) => {
  const { expense_id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT expense_id, actor_email, action, log_message, timestamp
       FROM public.expense_logs
       WHERE expense_id=$1
       ORDER BY timestamp DESC;`,
      [expense_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch logs error:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

module.exports = router;
