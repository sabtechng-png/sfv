// routes/issuesRoutes.js
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function isUUID(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
}
function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

// --- Ensure resolution_note column exists (safe migration at runtime)
pool.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_issues' AND column_name = 'resolution_note'
  ) THEN
    ALTER TABLE job_issues ADD COLUMN resolution_note TEXT;
  END IF;
END$$;
`).catch(() => { /* ignore */ });

/**
 * GET /api/jobs/:jobId/issues?page=&limit=
 * Paginated list of issues for a job
 */
router.get("/:jobId/issues", async (req, res) => {
  const { jobId } = req.params;
  if (!isUUID(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });

  const page = toInt(req.query.page, 1);
  const limit = Math.min(toInt(req.query.limit, 10), 1000);
  const offset = (page - 1) * limit;

  try {
    const { rows: crows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM job_issues WHERE job_id = $1`,
      [jobId]
    );
    const total = crows[0]?.c || 0;

    const { rows } = await pool.query(
      `
      SELECT
        issue_id,
        job_id,
        title,
        description,
        status,
        resolution_note,
        to_char(opened_at_utc AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') AS opened_at_utc,
        to_char(resolved_at_utc AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') AS resolved_at_utc
      FROM job_issues
      WHERE job_id = $1
      ORDER BY opened_at_utc DESC NULLS LAST, issue_id DESC
      LIMIT $2 OFFSET $3
      `,
      [jobId, limit, offset]
    );

    res.json({ success: true, records: rows, total });
  } catch (err) {
    console.error("GET issues error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:jobId/issues
 * body: { title, description }
 * Creates issue with status='open'
 */
router.post("/:jobId/issues", async (req, res) => {
  const { jobId } = req.params;
  if (!isUUID(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });

  const { title, description } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({ success: false, error: "title and description are required." });
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO job_issues
        (issue_id, job_id, title, description, status, opened_at_utc)
      VALUES
        (gen_random_uuid(), $1, $2, $3, 'open', NOW())
      RETURNING
        issue_id, job_id, title, description, status, resolution_note,
        to_char(opened_at_utc AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') AS opened_at_utc,
        to_char(resolved_at_utc AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') AS resolved_at_utc
      `,
      [jobId, title, description]
    );
    res.json({ success: true, record: rows[0] });
  } catch (err) {
    console.error("POST issues error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/jobs/:jobId/issues/:issueId
 * body: { title?, description?, status?, resolution_note? }
 * - Admin + Engineer can resolve (role via x-role header)
 * - If status='resolved' → requires non-empty resolution_note, sets resolved_at_utc = NOW()
 */
router.patch("/:jobId/issues/:issueId", async (req, res) => {
  const { jobId, issueId } = req.params;
  if (!isUUID(jobId) || !isUUID(issueId)) {
    return res.status(400).json({ success: false, error: "Invalid UUID parameter(s)" });
  }

  const role = (req.headers["x-role"] || "").toString().toLowerCase();
  const { title, description, status, resolution_note } = req.body || {};

  // Enforce role for resolving
  if (status && String(status).toLowerCase() === "resolved") {
    if (!(role === "admin" || role === "engineer")) {
      return res.status(403).json({ success: false, error: "Only admin or engineer can resolve issues." });
    }
    if (!resolution_note || !String(resolution_note).trim()) {
      return res.status(400).json({ success: false, error: "resolution_note is required to resolve an issue." });
    }
  }

  try {
    const set = [];
    const vals = [];
    let i = 1;

    if (title != null) { set.push(`title = $${i++}`); vals.push(title); }
    if (description != null) { set.push(`description = $${i++}`); vals.push(description); }
    if (status != null) { set.push(`status = $${i++}`); vals.push(status); }
    if (resolution_note != null) { set.push(`resolution_note = $${i++}`); vals.push(resolution_note); }

    // If resolving, set timestamp
    if (status && String(status).toLowerCase() === "resolved") {
      set.push(`resolved_at_utc = NOW()`);
    }

    // If re-opening (optional behavior): clear resolved_at_utc
    if (status && String(status).toLowerCase() === "open") {
      set.push(`resolved_at_utc = NULL`);
    }

    if (!set.length) return res.json({ success: true, updated: 0 });

    const sql = `
      UPDATE job_issues
      SET ${set.join(", ")}
      WHERE issue_id = $${i++} AND job_id = $${i}
      RETURNING
        issue_id, job_id, title, description, status, resolution_note,
        to_char(opened_at_utc AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') AS opened_at_utc,
        to_char(resolved_at_utc AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') AS resolved_at_utc
    `;
    vals.push(issueId, jobId);

    const { rows } = await pool.query(sql, vals);
    if (!rows.length) return res.status(404).json({ success: false, error: "Issue not found" });

    res.json({ success: true, record: rows[0] });
  } catch (err) {
    console.error("PATCH issues error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/jobs/:jobId/issues/:issueId
 * Admin only (via x-role header)
 */
router.delete("/:jobId/issues/:issueId", async (req, res) => {
  const { jobId, issueId } = req.params;
  if (!isUUID(jobId) || !isUUID(issueId)) {
    return res.status(400).json({ success: false, error: "Invalid UUID parameter(s)" });
  }

  const role = (req.headers["x-role"] || "").toString().toLowerCase();
  if (role !== "admin") {
    return res.status(403).json({ success: false, error: "Only admin can delete issues." });
  }

  try {
    const { rows } = await pool.query(
      `DELETE FROM job_issues WHERE issue_id = $1 AND job_id = $2 RETURNING issue_id`,
      [issueId, jobId]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: "Issue not found" });
    res.json({ success: true, deleted: rows[0].issue_id });
  } catch (err) {
    console.error("DELETE issues error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs/issues/open-count?job_ids=uuid,uuid,...
 * Returns map of job_id -> open issues count
 */
router.get("/issues/open-count", async (req, res) => {
  const raw = String(req.query.job_ids || "").trim();
  if (!raw) return res.json({ success: true, counts: {} });

  const list = raw.split(",").map(s => s.trim()).filter(isUUID);
  if (!list.length) return res.json({ success: true, counts: {} });

  try {
    const { rows } = await pool.query(
      `
      SELECT job_id, COUNT(*)::int AS open_count
      FROM job_issues
      WHERE status = 'open' AND job_id = ANY($1::uuid[])
      GROUP BY job_id
      `,
      [list]
    );
    const out = {};
    for (const r of rows) out[r.job_id] = r.open_count;
    res.json({ success: true, counts: out });
  } catch (err) {
    console.error("open-count error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
