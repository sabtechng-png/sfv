// controllers/adminUserController.js
const pool = require("../db");
const bcrypt = require("bcryptjs");

// GET /api/admin-users?page=1&limit=10&q=john&role=engineer
exports.adminListUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const offset = (page - 1) * limit;

    const q = req.query.q ? `%${req.query.q}%` : null;
    const role = req.query.role || null;

    let where = [];
    let params = [];

    if (q) {
      params.push(q);
      where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    if (role) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // COUNT
    const countRes = await pool.query(`SELECT COUNT(*) FROM users ${whereSQL}`, params);
    const total = parseInt(countRes.rows[0].count);

    // FETCH PAGE
    params.push(limit);
    params.push(offset);
    const listRes = await pool.query(
      `SELECT id, name, email, role, nickname, last_login, created_at, updated_at 
       FROM users ${whereSQL}
       ORDER BY id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
       params
    );

    res.json({
      success: true,
      users: listRes.rows,
      total,
      page,
      limit
    });

  } catch (err) {
    console.error("Admin listUsers error:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// CREATE USER
exports.adminCreateUser = async (req, res) => {
  try {
    const { name, email, role, nickname, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, role, nickname, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, name, email, role, nickname, created_at`,
      [name, email, role, nickname, hash]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Admin createUser error:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// UPDATE USER
exports.adminUpdateUser = async (req, res) => {
  try {
    const { name, email, role, nickname, password } = req.body;

    let passwordSQL = "";
    let params = [req.params.id, name, email, role, nickname];

    if (password) {
      passwordSQL = ", password_hash = $" + (params.length + 1);
      params.push(await bcrypt.hash(password, 10));
    }

    const result = await pool.query(
      `UPDATE users 
       SET name=$2, email=$3, role=$4, nickname=$5 ${passwordSQL}, updated_at=NOW()
       WHERE id=$1
       RETURNING id, name, email, role, nickname, updated_at`,
      params
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Admin updateUser error:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// RESET PASSWORD
exports.adminResetPassword = async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);

    await pool.query(
      `UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`,
      [hash, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Admin resetPassword error:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// DELETE USER
exports.adminDeleteUser = async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Admin deleteUser error:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
