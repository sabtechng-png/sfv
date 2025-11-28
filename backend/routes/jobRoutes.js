const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Helper to validate UUID
function isUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// ✅ Helper to safely normalize ANY date format into ISO or return null
function normalizeDate(input) {
  if (!input || typeof input !== "string") return null;
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// ✅ Generate unique job reference
async function generateJobRef(client) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  const countRes = await client.query(
    "SELECT COUNT(*)::int AS c FROM jobs WHERE start_date_utc::date = CURRENT_DATE;"
  );
  const seq = String((countRes.rows[0]?.c || 0) + 1).padStart(4, "0");

  return `JOB-${yyyy}${mm}${dd}-${seq}`;
}

//
// ==========================================================
// POST /api/jobs → Register new job
// ==========================================================
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      title,
      job_type,
      location,
      client_name,
      job_condition,
      materials_text,
      team_text,
      created_by,
      created_by_name,
      created_by_email,
      created_by_role
     
    } = req.body;

    if (!title || !job_type)
      return res.status(400).json({ success: false, error: "Missing required fields" });

    await client.query("BEGIN");

    

    // ✅ Handle or create client
    let client_id = null;
    if (client_name) {
      const result = await client.query(
        `INSERT INTO clients (name)
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING client_id;`,
        [client_name]
      );
      client_id = result.rows[0].client_id;
    }

    const job_ref = await generateJobRef(client);
    const safeUUID = isUUID(created_by) ? created_by : null;

    // ✅ Fixed insert query with safe timestamptz cast
    const insertSQL = `
      INSERT INTO jobs (
        job_ref, title, job_type, location, client_id, client_name,
        job_condition, materials_text, team_list,
        created_by, created_by_name, created_by_email, created_by_role

      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10::uuid, $11,$12,$13
       
      )
      RETURNING *;
    `;

    const { rows } = await client.query(insertSQL, [
      job_ref,
      title,
      job_type,
      location || null,
      client_id,
      client_name || null,
      job_condition || null,
      materials_text || null,
      team_text || null,
      safeUUID,
      created_by_name || null,
      created_by_email || null,
      created_by_role || null,
     
    ]);

    const job = rows[0];

    // ✅ Record creation log
    const changerUUID = isUUID(created_by) ? created_by : null;
    await client.query(
      `INSERT INTO job_status_log (job_id, old_status, new_status, changed_by, note)
       VALUES ($1, NULL, 'ongoing', $2::uuid, $3);`,
      [job.job_id, changerUUID, `Job created by ${created_by_name} (${created_by_email})`]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Job registered successfully", job });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error registering job:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

//
// ==========================================================
// GET /api/jobs → Includes open_issues count
// ==========================================================
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
  const offset = (page - 1) * limit;

  const q = (req.query.q || "").trim();
  const status = (req.query.status || "").trim();
  const type = (req.query.type || "").trim();
  const client = (req.query.client || "").trim();

  const where = [];
  const vals = [];
  let i = 1;

  if (q) {
    where.push(`(LOWER(j.title) LIKE $${i} OR LOWER(j.job_ref) LIKE $${i} OR LOWER(j.client_name) LIKE $${i})`);
    vals.push(`%${q.toLowerCase()}%`); i++;
  }
  if (status) { where.push(`LOWER(j.status) = $${i}`); vals.push(status.toLowerCase()); i++; }
  if (type)   { where.push(`LOWER(j.job_type) = $${i}`); vals.push(type.toLowerCase());   i++; }
  if (client) { where.push(`LOWER(j.client_name) LIKE $${i}`); vals.push(`%${client.toLowerCase()}%`); i++; }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const totalSQL = `SELECT COUNT(*)::int AS c FROM jobs j ${whereSQL}`;
    const totalRes = await pool.query(totalSQL, vals);
    const total = totalRes.rows[0]?.c || 0;

    const listSQL = `
      SELECT
        j.job_id,
        j.job_ref,
        j.title,
        j.client_name,
        j.status,
        j.job_type,
        j.created_by_name,
        to_char(j.start_date_utc, 'YYYY-MM-DD HH24:MI') AS start_date_utc,
        to_char(j.updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at,
        COALESCE(ji.open_issues, 0) AS open_issues
      FROM jobs j
      LEFT JOIN (
        SELECT job_id, COUNT(*)::int AS open_issues
        FROM job_issues
        WHERE status = 'open'
        GROUP BY job_id
      ) ji ON ji.job_id = j.job_id
      ${whereSQL}
      ORDER BY j.start_date_utc DESC NULLS LAST
      LIMIT $${i} OFFSET $${i + 1};
    `;
    const listVals = [...vals, limit, offset];
    const listRes = await pool.query(listSQL, listVals);

    res.json({ success: true, jobs: listRes.rows, total });
  } catch (err) {
    console.error("❌ Error fetching jobs:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// ==========================================================
// PATCH /api/jobs/:id → Update job status OR close job
// (future: use normalizeDate for end_date_utc)
// ==========================================================
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { status, end_date_utc } = req.body;

  if (!status) return res.status(400).json({ success: false, error: "Missing status" });

  try {
    const normalizedEndDate = normalizeDate(end_date_utc);

   const result = await pool.query(
  `UPDATE jobs 
     SET status = $1,
         end_date_utc = COALESCE($2::timestamptz, end_date_utc),  -- ✅ $2 always typed
         updated_at = NOW()
   WHERE job_id = $3::uuid                                         -- ✅ safe UUID cast
   RETURNING *;`,
  [status, normalizedEndDate, id]
);
    if (!result.rowCount)
      return res.status(404).json({ success: false, error: "Job not found" });

    res.json({ success: true, message: "Status updated", job: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating job:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// ==========================================================
// DELETE /api/jobs/:id → Delete job
// ==========================================================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM jobs WHERE job_id = $1 RETURNING job_id;`, [id]);
    if (!result.rowCount)
      return res.status(404).json({ success: false, error: "Job not found" });

    res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    console.error("❌ Error deleting job:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// ==========================================================
// GET /api/jobs/:id → Single job details
// ==========================================================
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const isUuid = isUUID(id);
    const lookupColumn = isUuid ? "job_id" : "job_ref";

    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE ${lookupColumn} = $1 LIMIT 1;`,
      [id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    const job = jobResult.rows[0];

    const [maintenanceResult, issuesResult] = await Promise.all([
      pool.query(
        `SELECT * FROM job_maintenance WHERE job_id = $1 ORDER BY date_time DESC;`,
        [job.job_id]
      ),
      pool.query(
        `SELECT * FROM job_issues WHERE job_id = $1 ORDER BY opened_at_utc DESC;`,
        [job.job_id]
      ),
    ]);

    res.json({
      success: true,
      job,
      maintenance: maintenanceResult.rows,
      issues: issuesResult.rows,
    });
  } catch (err) {
    console.error("❌ Error fetching job detail:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

//
// ==========================================================
// SUBROUTES
// ==========================================================
const maintenanceRoutes = require("./maintenanceRoutes");
router.use("/:job_id/maintenance", maintenanceRoutes);

const issuesRoutes = require("./issuesRoutes");
router.use("/:job_id/issues", issuesRoutes);

module.exports = router;
