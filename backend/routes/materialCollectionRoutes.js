// ======================================================================
// materialCollectionRoutes.js
// Backend API routes for Material Collection Management (ROLE: TRUST)
// ======================================================================

const express = require("express");
const router = express.Router();
const pool = require("../db");

// Small helpers
const pick = (obj, keys) =>
  Object.fromEntries(Object.entries(obj || {}).filter(([k]) => keys.includes(k)));

// ---------------------------------------------------------------------
// GET /api/material-collections
// Returns all collections with computed return aggregates
// ---------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { email } = req.query; // optional filter

    const sql = `
      SELECT
        mc.id,
        mc.collector_email,
        mc.collector_role,
        mc.vendor_name,
        mc.material_name,
        mc.quantity,
        mc.purpose,
        mc.project_name,
        mc.status,
        mc.remarks,
        mc.verified_by,
        mc.collection_date,
        mc.updated_at,
        COALESCE(SUM(mr.qty), 0) AS returned_quantity,
        GREATEST(mc.quantity - COALESCE(SUM(mr.qty), 0), 0) AS total_after_return,
        ROUND(
          (COALESCE(SUM(mr.qty), 0)::numeric / NULLIF(mc.quantity, 0)) * 100,
          1
        ) AS returned_percent
      FROM material_collection mc
      LEFT JOIN material_returns mr ON mr.parent_id = mc.id
      ${email ? "WHERE mc.collector_email = $1" : ""}
      GROUP BY mc.id
      ORDER BY mc.collection_date DESC
    `;

    const q = email ? await pool.query(sql, [email]) : await pool.query(sql);
    res.json(q.rows);
  } catch (err) {
    console.error("GET /material-collections error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------------------------------------------------------------------
// GET /api/material-collections/returns
// Returns all individual returns with parent details (used by PDF/UI)
// ---------------------------------------------------------------------
router.get("/returns", async (_req, res) => {
  try {
    const sql = `
      SELECT
        mr.id,
        mr.parent_id,
        mr.qty,
        mr.note,
        mr.actor_email,
        mr.actor_role,
        mr.created_at,
        mc.vendor_name,
        mc.material_name,
        mc.collector_email  AS collector_email
      FROM material_returns mr
      JOIN material_collection mc ON mc.id = mr.parent_id
      ORDER BY mr.created_at DESC
    `;
    const q = await pool.query(sql);
    res.json(q.rows);
  } catch (err) {
    console.error("GET /material-collections/returns error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------------------------------------------------------------------
// POST /api/material-collections/add
// ROLE: TRUST → we require collector_email & collector_role in BODY
// ---------------------------------------------------------------------
router.post("/add", async (req, res) => {
  try {
    const {
      collector_email,
      collector_role,
      vendor_name,
      material_name,
      quantity,
      purpose = "",
      project_name = "",
    } = req.body || {};

    // Strict validation — do NOT default to "unknown@sfv.local"
    if (
      !collector_email ||
      !collector_role ||
      !vendor_name ||
      !material_name ||
      !Number.isFinite(Number(quantity))
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields." });
    }

    await pool.query(
      `INSERT INTO material_collection
         (collector_email, collector_role, vendor_name, material_name, quantity, purpose, project_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        collector_email,
        collector_role,
        vendor_name,
        material_name,
        Number(quantity),
        purpose,
        project_name,
      ]
    );

    res.json({ success: true, message: "Material collection recorded." });
  } catch (err) {
    console.error("POST /material-collections/add error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------------------------------------------------------------------
// PATCH /api/material-collections/:id  (EDIT + auto-reset to pending)
// ---------------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const allowed = [
      "vendor_name",
      "material_name",
      "quantity",
      "purpose",
      "project_name"
    ];

    const body = pick(req.body, allowed);
    const entries = Object.entries(body);

    if (entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields sent for update.",
      });
    }

    const sets = [];
    const values = [];
    entries.forEach(([k, v], i) => {
      sets.push(`${k} = $${i + 1}`);
      values.push(k === "quantity" ? Number(v) : v);
    });

    // ✅ force reset status + clear verification
    sets.push(`status = 'pending'`);
    sets.push(`verified_by = NULL`);
    sets.push(`remarks = NULL`);
    sets.push(`updated_at = NOW()`);

    values.push(id);

    const sql = `
      UPDATE material_collection
      SET ${sets.join(", ")}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const q = await pool.query(sql, values);
    if (!q.rows.length) {
      return res.status(404).json({ success: false, error: "Record not found." });
    }

    res.json({
      success: true,
      message: "Collection updated and reset to pending.",
      record: q.rows[0],
    });
  } catch (err) {
    console.error("PATCH /material-collections/:id error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------------------------------------------------------------------
// POST /api/material-collections/return
// Logs a return against a parent collection
// ---------------------------------------------------------------------
router.post("/return", async (req, res) => {
  try {
    const { parent_id, qty, note = "", actor_email, actor_role } = req.body || {};

    if (!parent_id || !Number.isFinite(Number(qty))) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid parent_id or qty." });
    }

    await pool.query(
      `INSERT INTO material_returns
         (parent_id, qty, note, actor_email, actor_role)
       VALUES ($1,$2,$3,$4,$5)`,
      [parent_id, Number(qty), note, actor_email || null, actor_role || null]
    );

    res.json({ success: true, message: "Return recorded." });
  } catch (err) {
    console.error("POST /material-collections/return error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------------------------------------------------------------------
// PATCH /api/material-collections/:id/verify (optional)
// ---------------------------------------------------------------------
router.patch("/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verified_by, remarks } = req.body || {};
    await pool.query(
      `UPDATE material_collection
       SET status=$1, verified_by=$2, remarks=$3, updated_at=NOW()
       WHERE id=$4`,
      [status || "verified", verified_by || null, remarks || null, id]
    );
    res.json({ success: true, message: "Verification updated." });
  } catch (err) {
    console.error("PATCH /material-collections/:id/verify error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------------------------------------------------------------------
// DELETE /api/material-collections/:id
// Removes the record; returns are cascade-deleted (or we delete explicitly)
// ---------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM material_returns WHERE parent_id = $1", [id]);
    await pool.query("DELETE FROM material_collection WHERE id = $1", [id]);
    res.json({ success: true, message: "Record deleted." });
  } catch (err) {
    console.error("DELETE /material-collections/:id error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
