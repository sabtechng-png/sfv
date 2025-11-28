// routes/jobdashboardRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

// ---------- SUMMARY (cards) ----------
router.get("/summary", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      WITH last_maint AS (
        SELECT
          j.job_id,
          MAX(m.date_time) AS last_date
        FROM jobs j
        LEFT JOIN job_maintenance m ON m.job_id = j.job_id
        GROUP BY j.job_id
      ),
      due AS (
        SELECT j.job_id, MAX(m.next_date) AS next_maint_date
        FROM jobs j
        LEFT JOIN job_maintenance m ON m.job_id = j.job_id
        GROUP BY j.job_id
      )
      SELECT
        (SELECT COUNT(*) FROM jobs)                                                   AS total_jobs,
        (SELECT COUNT(*) FROM jobs WHERE LOWER(status) = 'ongoing')                  AS ongoing_jobs,
        (SELECT COUNT(*) FROM jobs WHERE LOWER(status) = 'completed')                AS completed_jobs,
        (SELECT COUNT(*) FROM jobs
          WHERE DATE_TRUNC('month', created_at_utc) = DATE_TRUNC('month', NOW())
        )                                                                            AS jobs_this_month,
        (SELECT COUNT(*) FROM due
          WHERE next_maint_date IS NOT NULL
            AND next_maint_date <= (CURRENT_DATE + INTERVAL '14 days')
        )                                                                            AS due_maintenance,
        (SELECT COUNT(*) FROM job_issues WHERE LOWER(status) = 'open')               AS open_issues;
    `);

    const r = rows?.[0] || {};
    res.json({
      success: true,
      cards: {
        totalJobs: Number(r.total_jobs) || 0,
        ongoing: Number(r.ongoing_jobs) || 0,
        completed: Number(r.completed_jobs) || 0,
        jobsThisMonth: Number(r.jobs_this_month) || 0,
        dueMaint: Number(r.due_maintenance) || 0,
        openIssues: Number(r.open_issues) || 0,
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/summary error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- RECENT JOBS (latest 5) ----------
router.get("/recent-jobs", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        j.job_id,
        j.job_ref,
        j.title,
        j.client_name,
        LOWER(j.status) AS status,
        TO_CHAR(j.created_at_utc, 'DD Mon YYYY, HH12:MI PM') AS created_at_fmt
      FROM jobs j
      ORDER BY j.created_at_utc DESC
      LIMIT 5;
    `);

    res.json({ success: true, jobs: rows || [] });
  } catch (err) {
    console.error("GET /api/dashboard/recent-jobs error:", err);
    res.status(500).json({ success: false, error: err.message, jobs: [] });
  }
});

// ---------- DUE MAINTENANCE (next_date within 14 days or overdue) ----------
router.get("/due-maintenance", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      WITH maint AS (
        SELECT
          j.job_id,
          j.job_ref,
          j.title,
          j.client_name,
          LOWER(j.status) AS status,
          MAX(m.date_time) AS last_maint_utc,
          MAX(m.next_date) AS next_maint_date
        FROM jobs j
        LEFT JOIN job_maintenance m ON m.job_id = j.job_id
        GROUP BY j.job_id, j.job_ref, j.title, j.client_name, j.status
      )
      SELECT
        job_id,
        job_ref,
        title,
        client_name,
        status,
        CASE
          WHEN last_maint_utc IS NULL THEN 'Never'
          ELSE TO_CHAR(last_maint_utc, 'DD Mon YYYY, HH12:MI PM')
        END AS last_maint_fmt,
        TO_CHAR(next_maint_date, 'DD Mon YYYY') AS next_maint_fmt,
        (next_maint_date::date - CURRENT_DATE) AS days_left
      FROM maint
      WHERE next_maint_date IS NOT NULL
        AND next_maint_date <= (CURRENT_DATE + INTERVAL '14 days')
      ORDER BY next_maint_date ASC NULLS LAST, job_ref DESC
      LIMIT 5;
    `);

    res.json({ success: true, items: rows || [] });
  } catch (err) {
    console.error("GET /api/dashboard/due-maintenance error:", err);
    res.status(500).json({ success: false, error: err.message, items: [] });
  }
});

module.exports = router;
