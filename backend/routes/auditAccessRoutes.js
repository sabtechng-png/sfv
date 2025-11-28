const express = require("express");
const pool = require("../db");
const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();


// ============================================================
// 📋 AUDIT ACCESS MANAGEMENT ROUTES
// ============================================================

// GRANT audit access (Admin only)
router.post("/grant", protect, authorize("admin"), async (req, res) => {
  const { user_email } = req.body;

  if (!user_email)
    return res.status(400).json({ error: "User email is required." });

  try {
    console.log("🔹 Granting audit access to:", user_email);

    // Ensure the user exists
    const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [user_email]);
    if (!userExists.rows.length) {
      return res.status(404).json({ error: "User not found in users table." });
    }

    // Insert or update the audit permission
    const query = `
      INSERT INTO audit_permissions (user_email, is_authorized, granted_by, granted_at)
      VALUES ($1, TRUE, $2, NOW())
      ON CONFLICT (user_email)
      DO UPDATE SET
        is_authorized = TRUE,
        granted_by = EXCLUDED.granted_by,
        granted_at = NOW()
      RETURNING *;
    `;

    const result = await pool.query(query, [user_email, req.user.email]);

    console.log("✅ Grant successful:", result.rows[0]);
    res.json({ success: true, message: `Access granted to ${user_email}`, record: result.rows[0] });
  } catch (err) {
    console.error("❌ Error granting audit access:", err.message);
    res.status(500).json({ error: "Failed to grant audit access" });
  }
});

// 🔹 Revoke audit access (Admin only)
router.post("/revoke", protect, authorize("admin"), async (req, res) => {
  const { user_email } = req.body;

  if (!user_email)
    return res.status(400).json({ error: "User email is required." });

  try {
    const result = await pool.query(
      `
      UPDATE audit_permissions
      SET is_authorized = FALSE, granted_by = $1, granted_at = NOW()
      WHERE user_email = $2;
      `,
      [req.user.email, user_email]
    );

    // Optional: if user wasn’t in the table yet
    if (result.rowCount === 0) {
      await pool.query(
        `
        INSERT INTO audit_permissions (user_email, is_authorized, granted_by)
        VALUES ($1, FALSE, $2);
        `,
        [user_email, req.user.email]
      );
    }

    res.json({ success: true, message: `Audit access revoked from ${user_email}` });
  } catch (err) {
    console.error("❌ Error revoking audit access:", err.message);
    res.status(500).json({ error: "Failed to revoke audit access" });
  }
});
// 🔹 Check audit permission and return role
router.get("/check", protect, async (req, res) => {
  try {
    const email = req.user.email;

    // Get role from users table
    const userQuery = await pool.query(
      "SELECT role FROM users WHERE email = $1",
      [email]
    );

    const role = userQuery.rows.length ? userQuery.rows[0].role : "unknown";

    // Check authorization from audit_permissions
    const permQuery = await pool.query(
      "SELECT is_authorized FROM audit_permissions WHERE user_email = $1",
      [email]
    );

    const allowed =
      permQuery.rows.length && permQuery.rows[0].is_authorized === true;

    res.json({ allowed, role });
  } catch (err) {
    console.error("❌ Error checking audit access:", err.message);
    res.status(500).json({ error: "Failed to check audit access" });
  }
});


// ============================================================
// 🔹 List all users with their audit permission (Admin only)
// ============================================================
router.get("/list", protect, authorize("admin"), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.email AS user_email,
        u.role,
        CASE WHEN a.is_authorized IS TRUE THEN TRUE ELSE FALSE END AS is_authorized,
        a.granted_by,
        a.granted_at
      FROM users u
      LEFT JOIN audit_permissions a ON u.email = a.user_email
      ORDER BY u.email ASC;
    `);

    res.json({ success: true, permissions: result.rows });
  } catch (err) {
    console.error("❌ Error listing audit permissions:", err.message);
    res.status(500).json({ error: "Failed to list audit permissions" });
  }
});


module.exports = router;
