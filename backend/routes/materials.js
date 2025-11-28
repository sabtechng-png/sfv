// ===============================================
// SFV Tech – Materials Routes (UTC-Compliant)
// ===============================================

const express = require("express");
const pool = require("../db");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   GET /api/materials
 * @desc    Get all materials (UTC timestamps)
 * @access  Private
 */
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, category, unit, unit_price,
             TO_CHAR(last_updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_updated
      FROM materials
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching materials:", err.message);
    res.status(500).json({ error: "Server error fetching materials" });
  }
});

/**
 * @route   POST /api/materials
 * @desc    Create new material
 * @access  Private/Admin
 */
router.post("/", protect, authorize("admin"), async (req, res) => {
  const { name, category, unit, unit_price } = req.body;
  try {
    const result = await pool.query(
      `
      INSERT INTO materials (name, category, unit, unit_price, last_updated)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, name, category, unit, unit_price,
                TO_CHAR(last_updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_updated
      `,
      [name, category, unit, unit_price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error adding material:", err.message);
    res.status(500).json({ error: "Failed to create material" });
  }
});

/**
 * @route   PUT /api/materials/:id
 * @desc    Update material
 * @access  Private/Admin
 */
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  const { id } = req.params;
  const { name, category, unit, unit_price } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE materials
      SET name = $1, category = $2, unit = $3, unit_price = $4, last_updated = NOW()
      WHERE id = $5
      RETURNING id, name, category, unit, unit_price,
                TO_CHAR(last_updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_updated
      `,
      [name, category, unit, unit_price, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Material not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating material:", err.message);
    res.status(500).json({ error: "Failed to update material" });
  }
});

/**
 * @route   DELETE /api/materials/:id
 * @desc    Delete material safely (independent of quotations)
 * @access  Private/Admin
 */
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM materials WHERE id = $1", [id]);
    res.json({ message: "Material deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting material:", err.message);
    res.status(500).json({ error: "Failed to delete material" });
  }
});

/**
 * @route   GET /api/materials/count
 * @desc    Return total number of materials
 * @access  Private/Admin
 */
router.get("/count", protect, authorize("admin"), async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) AS count FROM materials");
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("❌ Error fetching materials count:", err.message);
    res.status(500).json({ error: "Failed to fetch materials count" });
  }
});

module.exports = router;
