// ======================================================================
// SFV Tech | Expense Form Routes (Improved v4)
// Rules:
//  • For SPENT or TRANSFER → check only Available (not Returned)
//  • Available = imprest - spent(approved) - transfers(all) + refunds_in(approved)
//  • No "returned pool" or 'return_use' logic
//  • Never allow negative balance
//  • Witness logic preserved
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
  res.json({ ok: true, message: "Expense Form Routes Active (Available-only)" });
});

// ---------------- Users for dropdown ----------------
router.get("/users", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT email, COALESCE(nickname, email) AS nickname FROM public.users ORDER BY nickname ASC;"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ---------------- Validate receiver ----------------
router.get("/validate/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT email FROM public.users WHERE email = $1 LIMIT 1;",
      [email]
    );
    if (!rows.length) return res.status(404).json({ valid: false, message: "Receiver not found" });
    res.json({ valid: true });
  } catch (err) {
    console.error("Error validating receiver:", err);
    res.status(500).json({ error: "Validation failed" });
  }
});

// ---------------- Balance snapshot ----------------
router.get("/balance/:email", async (req, res) => {
  const email = req.params.email;

  const SQL = `
    WITH 
    i AS (
      SELECT COALESCE(SUM(amount),0) AS total_imprest
      FROM public.imprest WHERE user_email = $1
    ),
    s AS (
      SELECT COALESCE(SUM(amount),0) AS total_spent
      FROM public.expenses
      WHERE sender_email = $1 AND expense_type = 'spent' AND status = 'approved'
    ),
    tog AS (
      SELECT COALESCE(SUM(amount),0) AS total_sent_gross
      FROM public.expenses
      WHERE sender_email = $1 AND expense_type = 'transfer'
    ),
    rf AS (
      SELECT COALESCE(SUM(amount),0) AS total_refunds_in
      FROM public.expenses
      WHERE receiver_email = $1 AND expense_type = 'refund' AND status = 'approved'
    )
    SELECT
      i.total_imprest,
      s.total_spent,
      tog.total_sent_gross,
      rf.total_refunds_in,
      (i.total_imprest - s.total_spent - tog.total_sent_gross + rf.total_refunds_in) AS available_balance
    FROM i, s, tog, rf;
  `;

  try {
    const { rows } = await pool.query(SQL, [email]);
    const b = rows[0] || {};
    const available = Number(b.available_balance || 0);

    res.json({
      available,
      returned: 0, // no returned pool anymore
      total: available,
      breakdown: {
        imprest: Number(b.total_imprest || 0),
        spentApproved: Number(b.total_spent || 0),
        transfersAll: Number(b.total_sent_gross || 0),
        refundsIn: Number(b.total_refunds_in || 0),
      },
    });
  } catch (err) {
    console.error("❌ Balance error:", err);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// ---------------- Create Expense (SPENT | TRANSFER) ----------------
router.post("/expenses", async (req, res) => {
  const {
    user_email,
    purpose,
    amount,
    expense_type,
    to_user_email,
    notes,
    category,
    witness1,
    witness2,
  } = req.body;

  if (!user_email || !purpose || !amount || !expense_type)
    return res.status(400).json({ error: "Missing required fields" });

  const amt = Number(amount);
  if (!(amt > 0)) return res.status(400).json({ error: "Amount must be positive" });

  if (expense_type === "transfer" && !to_user_email)
    return res.status(400).json({ error: "Receiver email required for transfer" });

  // Validate witness uniqueness and roles
  if ([to_user_email, witness1, witness2].filter(Boolean).some((e) => e === user_email))
    return res.status(400).json({ error: "Sender cannot be receiver or witness" });
  if (witness1 && witness2 && witness1 === witness2)
    return res.status(400).json({ error: "Witness 1 and 2 must be different" });
  if (to_user_email && (to_user_email === witness1 || to_user_email === witness2))
    return res.status(400).json({ error: "Receiver cannot also be a witness" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch available balance only
    const bal = await client.query(
      `
      WITH 
      i AS (SELECT COALESCE(SUM(amount),0) AS total_imprest FROM public.imprest WHERE user_email=$1),
      s AS (SELECT COALESCE(SUM(amount),0) AS total_spent FROM public.expenses WHERE sender_email=$1 AND expense_type='spent' AND status='approved'),
      tog AS (SELECT COALESCE(SUM(amount),0) AS total_transfers_out FROM public.expenses WHERE sender_email=$1 AND expense_type='transfer'),
      rf AS (SELECT COALESCE(SUM(amount),0) AS total_refunds_in FROM public.expenses WHERE receiver_email=$1 AND expense_type='refund' AND status='approved')
      SELECT (i.total_imprest - s.total_spent - tog.total_transfers_out + rf.total_refunds_in) AS available_balance
      FROM i,s,tog,rf;
      `,
      [user_email]
    );
    const available = Number(bal.rows?.[0]?.available_balance || 0);

    if (amt > available) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient Available balance. ₦${fmt(available)} < ₦${fmt(amt)}.`,
      });
    }

    // --------------------------------------------------------------
    // Main expense record (SPENT = approved | TRANSFER = pending)
    // --------------------------------------------------------------
    const status = expense_type === "spent" ? "approved" : "pending";
    const { rows } = await client.query(
      `INSERT INTO public.expenses
       (sender_email, receiver_email, purpose, amount, expense_type, status, category, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       RETURNING id;`,
      [
        user_email,
        expense_type === "transfer" ? to_user_email : null,
        purpose,
        amt,
        expense_type,
        status,
        category || null,
        notes || null,
      ]
    );
    const expenseId = rows[0].id;

    // --------------------------------------------------------------
    // Witness insertion for both SPENT & TRANSFER
    // --------------------------------------------------------------
    if (witness1 || witness2) {
      await client.query(
        `INSERT INTO public.expense_witnesses
         (expense_id, witness1_email, witness2_email, created_at)
         VALUES ($1,$2,$3,NOW());`,
        [expenseId, witness1 || null, witness2 || null]
      );

      if (witness1) {
        await client.query(
          `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
           VALUES ($1,$2,'witness_request',$3);`,
          [expenseId, user_email, `Requested ${witness1} to witness this ${expense_type}`]
        );
      }
      if (witness2) {
        await client.query(
          `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
           VALUES ($1,$2,'witness_request',$3);`,
          [expenseId, user_email, `Requested ${witness2} to witness this ${expense_type}`]
        );
      }
    }

    // --------------------------------------------------------------
    // Log main creation
    // --------------------------------------------------------------
    const logMsg =
      expense_type === "spent"
        ? `Spent ₦${fmt(amt)} for "${purpose}" (auto-approved)`
        : `Transfer of ₦${fmt(amt)} from ${user_email} to ${to_user_email} logged (pending approval)`;
    await client.query(
      `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message)
       VALUES ($1,$2,'created',$3);`,
      [expenseId, user_email, logMsg]
    );

    await client.query("COMMIT");
    res.status(201).json({ success: true, expense_id: expenseId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving expense:", err.message);
    res.status(500).json({ error: "Failed to record expense" });
  } finally {
    client.release();
  }
});

// ---------------- Return creation ----------------
router.post("/return", async (req, res) => {
  const { sender_email, receiver_email, purpose, amount, notes } = req.body;

  if (!sender_email || !receiver_email || !purpose || !amount)
    return res.status(400).json({ error: "Missing required fields" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO public.expenses
       (sender_email, receiver_email, purpose, amount, expense_type, status, category, notes, created_at)
       VALUES ($1,$2,$3,$4,'return','pending','system',$5,NOW())
       RETURNING id;`,
      [sender_email, receiver_email, purpose, amount, notes || null]
    );
    const expenseId = rows[0].id;

    await client.query(
      `INSERT INTO public.expense_logs (expense_id, actor_email, action, log_message, timestamp)
       VALUES 
        ($1,$2,'return',$3,NOW()),
        ($1,$4,'return_pending',$5,NOW());`,
      [
        expenseId,
        sender_email,
        `Initiated return of ₦${fmt(amount)} to ${receiver_email} for "${purpose}" (awaiting approval)`,
        receiver_email,
        `Pending receipt of ₦${fmt(amount)} returned by ${sender_email} for "${purpose}"`,
      ]
    );

    await client.query("COMMIT");
    res.status(201).json({ success: true, message: "Return recorded and pending approval" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Return route error:", err.message);
    res.status(500).json({ error: "Failed to record return" });
  } finally {
    client.release();
  }
});

module.exports = router;
