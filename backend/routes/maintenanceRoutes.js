// routes/maintenanceRoutes.js
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

// --- DB Pool (same style as jobRoutes.js) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- helpers ---
function isUUID(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
}
function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

// ==========================================================
// GET /api/jobs/:jobId/maintenance?page=&limit=
// ==========================================================
router.get("/:jobId/maintenance", async (req, res) => {
  const { jobId } = req.params;
  if (!isUUID(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });

  const page = toInt(req.query.page, 1);
  const limit = Math.min(toInt(req.query.limit, 10), 10000);
  const offset = (page - 1) * limit;

  try {
    const countSQL = `SELECT COUNT(*)::int AS c FROM job_maintenance WHERE job_id = $1`;
    const totalRes = await pool.query(countSQL, [jobId]);
    const total = totalRes.rows[0]?.c || 0;

    const listSQL = `
      SELECT
        id, job_id,
        to_char(date_time, 'YYYY-MM-DD HH24:MI') AS date_time,
        performed_by,
        team_members,
        description,
        materials_used,
        to_char(next_date, 'YYYY-MM-DD') AS next_date,
        remarks,
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS created_at_utc,
        to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS updated_at_utc
      FROM job_maintenance
      WHERE job_id = $1
      ORDER BY date_time DESC, created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const listRes = await pool.query(listSQL, [jobId, limit, offset]);

    res.json({ success: true, records: listRes.rows, total });
  } catch (err) {
    console.error("GET maintenance error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================================
// POST /api/jobs/:jobId/maintenance
// body: { date_time, performed_by, team_members, description, materials_used, next_date, remarks }
// ==========================================================
router.post("/:jobId/maintenance", async (req, res) => {
  const { jobId } = req.params;
  if (!isUUID(jobId)) {
    return res.status(400).json({ success: false, error: "Invalid jobId" });
  }

  const {
    date_time,
    performed_by,
    team_members,
    description,
    materials_used,
    next_date,
    remarks,
  } = req.body || {};

  if (!date_time || !performed_by || !description) {
    return res.status(400).json({
      success: false,
      error: "date_time, performed_by and description are required.",
    });
  }

  try {
    // sanitize optional values
    const _materials_used = materials_used && materials_used.trim() !== "" ? materials_used : null;
    const _next_date = next_date && next_date.trim() !== "" ? next_date : null;
    const _remarks = remarks && remarks.trim() !== "" ? remarks : null;
    const _team = team_members && team_members.trim() !== "" ? team_members : "";

    const sql = `
      INSERT INTO job_maintenance
        (id, job_id, date_time, performed_by, team_members, description, materials_used, next_date, remarks, created_at, updated_at)
      VALUES
        (
          gen_random_uuid(),
          $1,
          $2::timestamptz,
          $3,
          $4,
          $5,
          $6,
          $7::date,
          $8,
          NOW(),
          NOW()
        )
      RETURNING
        id, job_id,
        to_char(date_time, 'YYYY-MM-DD HH24:MI') AS date_time,
        performed_by,
        team_members,
        description,
        materials_used,
        to_char(next_date, 'YYYY-MM-DD') AS next_date,
        remarks;
    `;

    const vals = [
      jobId,
      date_time,
      performed_by,
      _team,
      description,
      _materials_used,
      _next_date,   // ✅ always null or yyyy-mm-dd (never undefined)
      _remarks,
    ];

    const result = await pool.query(sql, vals);
    return res.json({ success: true, record: result.rows[0] });

  } catch (err) {
    console.error("POST maintenance error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================================
// PATCH /api/jobs/:jobId/maintenance/:id
// ==========================================================
router.patch("/:jobId/maintenance/:id", async (req, res) => {
  const { jobId, id } = req.params;
  if (!isUUID(jobId) || !isUUID(id)) {
    return res.status(400).json({ success: false, error: "Invalid UUID parameter(s)" });
  }

  const {
    date_time,
    performed_by,
    team_members,
    description,
    materials_used,
    next_date,
    remarks,
  } = req.body || {};

  try {
    // Build dynamic SET clause
    const set = [];
    const vals = [];
    let i = 1;

    if (date_time != null) { set.push(`date_time = $${i++}::timestamptz`); vals.push(date_time); }
    if (performed_by != null) { set.push(`performed_by = $${i++}`); vals.push(performed_by); }
    if (team_members != null) { set.push(`team_members = $${i++}`); vals.push(String(team_members).trim()); }
    if (description != null) { set.push(`description = $${i++}`); vals.push(description); }
    if (materials_used != null) { set.push(`materials_used = $${i++}`); vals.push(materials_used); }
    if (next_date !== undefined) {
      // Allow clearing next_date with empty string / null
      if (next_date === null || next_date === "") {
        set.push(`next_date = NULL`);
      } else {
        set.push(`next_date = $${i++}::date`);
        vals.push(next_date);
      }
    }
    if (remarks != null) { set.push(`remarks = $${i++}`); vals.push(remarks); }

    set.push(`updated_at = NOW()`);

    const sql = `
      UPDATE job_maintenance
      SET ${set.join(", ")}
      WHERE id = $${i++} AND job_id = $${i}
      RETURNING
        id, job_id,
        to_char(date_time, 'YYYY-MM-DD HH24:MI') AS date_time,
        performed_by,
        team_members,
        description,
        materials_used,
        to_char(next_date, 'YYYY-MM-DD') AS next_date,
        remarks;
    `;
    vals.push(id, jobId);

    const { rows } = await pool.query(sql, vals);
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Record not found" });

    res.json({ success: true, record: rows[0] });
  } catch (err) {
    console.error("PATCH maintenance error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================================
// DELETE /api/jobs/:jobId/maintenance/:id  (ADMIN ONLY)
// Expect req.user.role === 'admin' (if you have auth middleware).
// For now, we accept 'x-role' header for quick role gating.
// ==========================================================
router.delete("/:jobId/maintenance/:id", async (req, res) => {
  const { jobId, id } = req.params;
  if (!isUUID(jobId) || !isUUID(id)) {
    return res.status(400).json({ success: false, error: "Invalid UUID parameter(s)" });
  }

  // If you have real auth, replace this with your auth middleware
  const roleHeader = (req.headers["x-role"] || "").toString().toLowerCase();
  if (roleHeader !== "admin") {
    return res.status(403).json({ success: false, error: "Only admin can delete maintenance records." });
  }

  try {
    const delSQL = `DELETE FROM job_maintenance WHERE id = $1 AND job_id = $2 RETURNING id;`;
    const { rows } = await pool.query(delSQL, [id, jobId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Record not found" });
    res.json({ success: true, deleted: rows[0].id });
  } catch (err) {
    console.error("DELETE maintenance error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
