const express = require("express");
const router = express.Router();
const pool = require("../db");

// Fetch all imprest allocations
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, user_email, amount, source, remarks, created_at
       FROM public.imprest
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading imprest:", err.message);
    res.status(500).json({ error: "Failed to load imprest data" });
  }
});

// Create imprest allocation
router.post("/", async (req, res) => {
  const { user_email, amount, remarks, source } = req.body;

  if (!user_email || !amount)
    return res.status(400).json({ error: "User & amount required" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO public.imprest 
       (user_email, amount, source, remarks, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [user_email, amount, source || "Admin Allocation", remarks || null]
    );

    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error("❌ Error allocating imprest:", err.message);
    res.status(500).json({ error: "Failed to allocate imprest" });
  }
});

// Update imprest allocation
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { amount, remarks, source } = req.body;

  try {
    await pool.query(
      `UPDATE public.imprest
       SET amount=$1, remarks=$2, source=$3
       WHERE id=$4`,
      [amount, remarks, source, id]
    );

    res.json({ success: true, message: "Imprest updated" });
  } catch (err) {
    console.error("❌ Error updating imprest:", err.message);
    res.status(500).json({ error: "Failed to update imprest" });
  }
});

// Delete imprest
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`DELETE FROM public.imprest WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting imprest:", err.message);
    res.status(500).json({ error: "Failed to delete imprest" });
  }
});

module.exports = router;
