// ===============================================
// SFV Tech – Request Logs Routes (Admin Only)
// ===============================================
const express = require("express");
const pool = require("../db");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   GET /api/logs
 * @desc    Fetch recent request logs (UTC timestamps)
 * @access  Admin only
 */
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const role = req.query.role || null;
    const status = req.query.status ? parseInt(req.query.status) : null;

    let query = `
      SELECT 
        l.id,
        COALESCE(u.name, 'Unknown User') AS user_name,
        COALESCE(u.email, '—') AS user_email,
        l.role,
        l.method,
        l.path,
        l.status_code,
        l.duration_ms,
        l.ip,
        l.created_at AT TIME ZONE 'UTC' AS created_at_utc
      FROM request_logs l
      LEFT JOIN users u ON u.id = l.user_id
    `;

    const conditions = [];
    const values = [];

    if (role) {
      values.push(role);
      conditions.push(`l.role = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`l.status_code = $${values.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    values.push(limit);
    query += ` ORDER BY l.id DESC LIMIT $${values.length};`;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching logs:", err.message);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

/**
 * @route   DELETE /api/logs/clear
 * @desc    Delete all request logs (admin-only)
 * @access  Admin only
 */
router.delete("/clear", protect, authorize("admin"), async (req, res) => {
  try {
    const confirm = req.query.confirm;
    if (confirm !== "true") {
      return res.status(400).json({
        error:
          "Confirmation required. Append '?confirm=true' to proceed with log deletion.",
      });
    }

    const result = await pool.query("DELETE FROM request_logs RETURNING id;");
    const deletedCount = result.rowCount;

    res.status(200).json({
      message: `Successfully deleted ${deletedCount} log entries.`,
    });
  } catch (err) {
    console.error("❌ Error clearing logs:", err.message);
    res.status(500).json({ error: "Failed to clear logs" });
  }
});

module.exports = router;
