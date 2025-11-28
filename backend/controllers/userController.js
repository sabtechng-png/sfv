// controllers/userController.js
const bcrypt = require("bcryptjs"); // ✅ Windows-safe
const SALT_ROUNDS = 10;

const pool = require("../db"); // <-- make sure this points to your pg pool

// Restrict valid roles
const ALLOWED_ROLES = ["admin", "engineer", "storekeeper", "apprentice", "staff"];

function isValidRole(role) {
  return ALLOWED_ROLES.includes(String(role || "").toLowerCase());
}

function cleanUser(u) {
  if (!u) return u;
  const { password_hash, ...safe } = u;
  return safe;
}

// ─────────────────────────────────────────────
// GET /api/users   (list + pagination + filters)
// ─────────────────────────────────────────────
async function listUsers(req, res) {
  try {
    let { page = 1, limit = 10, q = "", role = "" } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (q.trim()) {
      values.push(`%${q.trim()}%`);
      conditions.push(
        `(name ILIKE $${values.length} OR email ILIKE $${values.length} OR nickname ILIKE $${values.length})`
      );
    }

    if (role && isValidRole(role)) {
      values.push(role.toLowerCase());
      conditions.push(`role = $${values.length}`);
    }

    const whereSQL = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSQL = `SELECT COUNT(*)::int AS total FROM users ${whereSQL}`;
    const countRes = await pool.query(countSQL, values);
    const total = countRes.rows[0]?.total || 0;

    const dataSQL = `
      SELECT id, name, email, role, nickname, created_at, updated_at, last_login
      FROM users
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const dataRes = await pool.query(dataSQL, values);

    return res.json({ success: true, total, users: dataRes.rows });
  } catch (err) {
    console.error("listUsers ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
}

// ─────────────────────────────────────────────
// POST /api/users   (create user)
// ─────────────────────────────────────────────
async function createUser(req, res) {
  try {
    const { name, email, role, password, nickname } = req.body || {};

    if (!name || !email || !role) {
      return res.status(400).json({ success: false, error: "name, email, and role are required" });
    }
    if (!isValidRole(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    const passwordHash = await bcrypt.hash(
      password && password.length > 0 ? password : `TEMP-${Date.now()}-${Math.random()}`,
      SALT_ROUNDS
    );

    const sql = `
      INSERT INTO users (name, email, password_hash, role, nickname, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, name, email, role, nickname, created_at, updated_at, last_login
    `;

    const params = [name.trim(), email.trim().toLowerCase(), passwordHash, role.toLowerCase(), nickname || null];
    const result = await pool.query(sql, params);

    return res.status(201).json({ success: true, user: cleanUser(result.rows[0]) });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ success: false, error: "Email already exists" });
    }
    console.error("createUser ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/users/:id   (update user)
// ─────────────────────────────────────────────
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, nickname, password } = req.body || {};

    const updates = [];
    const values = [];
    let i = 1;

    if (name) { updates.push(`name = $${i}`); values.push(name.trim()); i++; }
    if (email) { updates.push(`email = $${i}`); values.push(email.trim().toLowerCase()); i++; }
    if (nickname !== undefined) { updates.push(`nickname = $${i}`); values.push(nickname || null); i++; }

    if (role !== undefined) {
      if (!isValidRole(role)) return res.status(400).json({ success: false, error: "Invalid role" });
      updates.push(`role = $${i}`); values.push(role.toLowerCase()); i++;
    }

    if (password && password.length > 0) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      updates.push(`password_hash = $${i}`); values.push(hash); i++;
    }

    if (!updates.length) {
      return res.json({ success: true, user: await getUser(id) });
    }

    updates.push(`updated_at = NOW()`);

    const sql = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${i}
      RETURNING id, name, email, role, nickname, created_at, updated_at, last_login
    `;

    values.push(id);
    const result = await pool.query(sql, values);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, user: cleanUser(result.rows[0]) });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ success: false, error: "Email already exists" });
    }
    console.error("updateUser ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/users/:id/reset-password
// ─────────────────────────────────────────────
async function resetPassword(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!password || password.length === 0) {
      return res.status(400).json({ success: false, error: "Password is required" });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const sql = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `;

    const result = await pool.query(sql, [hash, id]);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("resetPassword ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/users/:id
// ─────────────────────────────────────────────
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Optional: prevent self deletion
    // if (String(req.user?.id) === String(id)) {
    //   return res.status(400).json({ success: false, error: "You cannot delete your own account" });
    // }

    const sql = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const result = await pool.query(sql, [id]);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("deleteUser ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
}

// ─────────────────────────────────────────────
// Helper (not exported)
// ─────────────────────────────────────────────
async function getUser(id) {
  const sql = `
    SELECT id, name, email, role, nickname,
           created_at, updated_at, last_login
    FROM users WHERE id = $1
  `;
  const res = await pool.query(sql, [id]);
  return cleanUser(res.rows[0] || null);
}

// ─────────────────────────────────────────────
// ✅ FINAL EXPORT (prevents undefined handlers)
// ─────────────────────────────────────────────
module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
};
