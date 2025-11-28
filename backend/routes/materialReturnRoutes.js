const express = require("express");
const router = express.Router();
const pool = require("../db");

// =============================================================
// 1️⃣ Record a return
// =============================================================
router.post("/add", async (req, res) => {
  const client = await pool.connect();
  try {
    const { parent_id, qty, note, actor_email, actor_role } = req.body;
    await client.query("BEGIN");

    // Insert return record
    const insertReturn = await client.query(
      `INSERT INTO material_returns
       (parent_id, qty, note, actor_email, actor_role)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [parent_id, qty, note, actor_email, actor_role]
    );

    // Update parent totals
    await client.query(
      `
      UPDATE material_collection
      SET 
        returned_quantity = GREATEST(
            0,
            COALESCE((SELECT SUM(qty) FROM material_returns WHERE parent_id=$1), 0)
        ),
        total_after_return = GREATEST(
            0,
            quantity - COALESCE((SELECT SUM(qty) FROM material_returns WHERE parent_id=$1), 0)
        ),
        last_return_date = NOW(),
        updated_at = NOW()
      WHERE id=$1
      `,
      [parent_id]
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      return_id: insertReturn.rows[0].id,
      message: "Return recorded successfully.",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error recording material return:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// =============================================================
// 2️⃣ Fetch all returns or by parent_id
// =============================================================
router.get("/", async (req, res) => {
  try {
    const { parent_id } = req.query;
    const sql = parent_id
      ? `SELECT * FROM material_returns WHERE parent_id=$1 ORDER BY created_at DESC`
      : `SELECT * FROM material_returns ORDER BY created_at DESC`;

    const result = parent_id
      ? await pool.query(sql, [parent_id])
      : await pool.query(sql);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching returns:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =============================================================
// 3️⃣ Summaries (Daily, Weekly, Monthly) from vw_material_summary
// =============================================================

// --- DAILY Summary ---
router.get("/summary/daily", async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const day = targetDate.toISOString().slice(0, 10);

    const result = await pool.query(
      `
      SELECT *
      FROM vw_material_summary
      WHERE DATE(collection_date) = $1
      ORDER BY collection_date DESC
      `,
      [day]
    );

    res.json({
      success: true,
      type: "daily",
      date: day,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching daily summary:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- WEEKLY Summary ---
router.get("/summary/weekly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('week', collection_date) AS week_start,
        COUNT(collection_id) AS total_records,
        SUM(qty_collected) AS total_collected,
        SUM(qty_returned) AS total_returned,
        SUM(total_after_return) AS total_remaining,
        ROUND(
          (SUM(qty_returned)::numeric / NULLIF(SUM(qty_collected), 0)) * 100, 2
        ) AS returned_percent
      FROM vw_material_summary
      GROUP BY week_start
      ORDER BY week_start DESC;
    `);

    res.json({
      success: true,
      type: "weekly",
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching weekly summary:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- MONTHLY Summary ---
router.get("/summary/monthly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', collection_date), 'YYYY-MM') AS month,
        COUNT(collection_id) AS total_records,
        SUM(qty_collected) AS total_collected,
        SUM(qty_returned) AS total_returned,
        SUM(total_after_return) AS total_remaining,
        ROUND(
          (SUM(qty_returned)::numeric / NULLIF(SUM(qty_collected), 0)) * 100, 2
        ) AS returned_percent
      FROM vw_material_summary
      GROUP BY month
      ORDER BY month DESC;
    `);

    res.json({
      success: true,
      type: "monthly",
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching monthly summary:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
