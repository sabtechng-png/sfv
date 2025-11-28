// ============================================================
// SFV Tech | Inventory Routes (CommonJS + JWT Protected)
// ============================================================
const express = require("express");
const pool = require("../db");
const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();

// ------------------------------------------------------------
// Helper: Role Filter for Querying Inventory
// ------------------------------------------------------------
const roleFilter = (role) => {
  switch (role) {
    case "admin":
    case "storekeeper":
	case "engineer":
	  
    case "staff":
    case "apprentice":
      return ""; // Full access
  
    
    default:
      return "WHERE FALSE"; // deny unknown roles
  }
};

// ============================================================
// GET /api/inventory?page=&limit=&search=
// Paginated, filtered inventory list
// ============================================================
router.get("/", protect, async (req, res) => {
  const { page = 1, limit = 20, search = "" } = req.query;
  const offset = (page - 1) * limit;
  const role = req.user.role;

  try {
    let where = roleFilter(role);
    const searchClause = search
      ? `${where ? where + " AND" : "WHERE"} (
           LOWER(name) LIKE $1 OR LOWER(type) LIKE $1 OR LOWER(category) LIKE $1
         )`
      : where;

    const values = search ? [`%${search.toLowerCase()}%`] : [];

    const countQuery = `SELECT COUNT(*) AS total FROM inventory ${searchClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / limit);

    const query = `
      SELECT * FROM inventory
      ${searchClause}
      ORDER BY id DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2};
    `;
    const result = await pool.query(query, [...values, limit, offset]);

    res.json({
      items: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total_pages: totalPages,
        total_items: totalItems,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching inventory:", err.message);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// ============================================================
// GET /api/inventory/summary
// Returns inventory summary for dashboard cards
// ============================================================
router.get("/summary", protect, async (req, res) => {
  const role = req.user.role;
  try {
    const filter = roleFilter(role);
    const query = `
      SELECT
        COUNT(*) AS total_items,
        COUNT(*) FILTER (WHERE quantity < 10) AS low_stock,
        COUNT(*) FILTER (WHERE quantity < 5) AS critical_items,
        COUNT(*) FILTER (WHERE condition = 'New') AS new_items,
        COUNT(*) FILTER (WHERE condition != 'New') AS used_items
      FROM inventory
      ${filter};
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Summary error:", err.message);
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// ============================================================
// POST /api/inventory/add
// Add new item (admin & storekeeper) — logs full info
// ============================================================
router.post("/add", protect, authorize("admin", "storekeeper"), async (req, res) => {
  const { name, type, category, size, quantity, condition } = req.body;
  const { email } = req.user;

  try {
    // 1️⃣ Insert item
    const result = await pool.query(
      `INSERT INTO inventory (name, type, category, size, quantity, condition, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, type, category, size, quantity, condition, email]
    );

    const item = result.rows[0];

    // 2️⃣ Log full info
    await pool.query(
      `INSERT INTO inventory_logs (
         inventory_id, action, user_email,
         old_quantity, new_quantity,
         item_name, item_type, category, size, condition, remarks
       )
       VALUES ($1, 'ADD', $2, NULL, $3, $4, $5, $6, $7, $8,
               $9)`,
      [
        item.id,
        email,
        item.quantity,
        item.name,
        item.type,
        item.category,
        item.size,
        item.condition,
        `Added new item '${item.name}' (${item.category}, ${item.size}) with quantity ${item.quantity}`,
      ]
    );

    res.json({ success: true, item });
  } catch (err) {
    console.error("❌ Add error:", err.message);
    res.status(500).json({ error: "Failed to add inventory" });
  }
});

// ============================================================
// PUT /api/inventory/update/:id
// Update existing item — logs both old and new values
// ============================================================
router.put("/update/:id", protect, authorize("admin", "storekeeper"), async (req, res) => {
  const { id } = req.params;
  const { name, type, category, size, quantity, condition } = req.body;
  const { email } = req.user;

  try {
    // 1️⃣ Get old item for logging
    const oldRes = await pool.query("SELECT * FROM inventory WHERE id=$1", [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    const oldItem = oldRes.rows[0];

    // 2️⃣ Update the item
    const result = await pool.query(
      `UPDATE inventory
       SET name=$1, type=$2, category=$3, size=$4, quantity=$5, condition=$6, last_updated=NOW()
       WHERE id=$7 RETURNING *`,
      [name, type, category, size, quantity, condition, id]
    );
    const updatedItem = result.rows[0];

    // 3️⃣ Log full info with old/new quantities
    await pool.query(
      `INSERT INTO inventory_logs (
         inventory_id, action, user_email,
         old_quantity, new_quantity,
         item_name, item_type, category, size, condition, remarks
       )
       VALUES ($1, 'UPDATE', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        updatedItem.id,
        email,
        oldItem.quantity,
        updatedItem.quantity,
        updatedItem.name,
        updatedItem.type,
        updatedItem.category,
        updatedItem.size,
        updatedItem.condition,
        `Updated item '${updatedItem.name}' — quantity changed from ${oldItem.quantity} to ${updatedItem.quantity}`,
      ]
    );

    res.json({ success: true, updated: updatedItem });
  } catch (err) {
    console.error("❌ Update error:", err.message);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// ============================================================
// DELETE /api/inventory/delete/:id
// Logs full item details in structured columns before deletion
// ============================================================
router.delete("/delete/:id", protect, authorize("admin", "storekeeper"), async (req, res) => {
  const { id } = req.params;
  const { email } = req.user;

  try {
    // 1️⃣  Fetch item data
    const itemRes = await pool.query("SELECT * FROM inventory WHERE id=$1", [id]);
    if (itemRes.rows.length === 0)
      return res.status(404).json({ error: "Item not found" });

    const item = itemRes.rows[0];

    // 2️⃣  Insert a complete log before deletion
    await pool.query(
      `INSERT INTO inventory_logs (
         inventory_id, action, user_email,
         old_quantity, new_quantity,
         item_name, item_type, category, size, condition,
         remarks
       )
       VALUES ($1, 'DELETE', $2, $3, NULL,
               $4, $5, $6, $7, $8,
               $9)`,
      [
        item.id,
        email,
        item.quantity,
        item.name,
        item.type,
        item.category,
        item.size,
        item.condition,
        `Deleted item '${item.name}' (${item.category}, ${item.size}) by ${email}`,
      ]
    );

    // 3️⃣  Delete item
    await pool.query("DELETE FROM inventory WHERE id=$1", [id]);

    // 4️⃣  Respond to client
    res.status(200).json({
      success: true,
      message: `Item '${item.name}' deleted successfully`,
    });
  } catch (err) {
    console.error("❌ Delete error:", err.message);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

/// ============================================================
// ENGINEER MATERIAL REQUEST ROUTE (FINAL, NEONDB COMPATIBLE)
// ============================================================
router.post("/request", protect, authorize("admin", "engineer", "staff", "Storekeeper"), async (req, res) => {
  const { inventory_id, requested_qty, purpose } = req.body;
  const { email } = req.user;

  // Validate input
  if (!inventory_id || !requested_qty) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1️⃣ Insert the material request
    const requestResult = await pool.query(
      `INSERT INTO material_requests (engineer_email, inventory_id, requested_qty, purpose)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, inventory_id, requested_qty, purpose || null]
    );

    // 2️⃣ Log the request in inventory_logs (safe insert)
    try {
      await pool.query(
        `INSERT INTO inventory_logs (inventory_id, action, user_email, remarks)
         VALUES ($1, 'REQUEST', $2, $3)`,
        [inventory_id, email, `Engineer requested ${requested_qty} unit(s)`]
      );
    } catch (logErr) {
      console.warn("⚠️ Log insert skipped:", logErr.message);
      // We skip logging error silently so main request still succeeds
    }

    // 3️⃣ Send success response
    res.json({
      success: true,
      message: "Request submitted successfully",
      request: requestResult.rows[0],
    });
  } catch (err) {
    console.error("❌ Material Request Error:", err.message);
    res.status(500).json({ error: "Failed to submit material request" });
  }
});

// ============================================================
// GET /api/inventory/requests
// Storekeeper fetches pending material requests
// ============================================================
router.get("/requests", protect, authorize("storekeeper", "admin"), async (req, res) => {
  try {
    const query = `
      SELECT
        r.id,
        r.engineer_email,
        u.name AS engineer_name,   -- ✅ Get display name
        i.name AS item_name,
        i.category,
        i.size,
        r.requested_qty,
        r.purpose,
        r.status,
        r.remarks,
        r.request_date
      FROM material_requests r
      LEFT JOIN users u ON r.engineer_email = u.email   -- ✅ join with users table
      LEFT JOIN inventory i ON r.inventory_id = i.id
      ORDER BY r.request_date DESC;
    `;
    const result = await pool.query(query);
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    console.error("❌ Fetch Requests Error:", err.message);
    res.status(500).json({ error: "Failed to fetch material requests" });
  }
});
// ============================================================
// PUT /api/inventory/requests/:id/approve
// ============================================================
router.put("/requests/:id/approve", protect, authorize("storekeeper", "admin"), async (req, res) => {
  const { id } = req.params;
  const { email } = req.user;

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const reqRes = await client.query(
      `SELECT r.inventory_id, r.requested_qty, i.quantity
       FROM material_requests r
       JOIN inventory i ON r.inventory_id = i.id
       WHERE r.id = $1 AND r.status = 'Pending'`,
      [id]
    );

    if (!reqRes.rows.length) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Request not found or already processed" });
    }

    const { inventory_id, requested_qty, quantity: oldQty } = reqRes.rows[0];
    const newQty = oldQty - requested_qty;

    if (newQty < 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({ error: "Insufficient stock to approve this request" });
    }

    await client.query("UPDATE inventory SET quantity=$1 WHERE id=$2", [newQty, inventory_id]);
    await client.query("UPDATE material_requests SET status='Approved' WHERE id=$1", [id]);

    await client.query(
      `INSERT INTO inventory_logs (inventory_id, action, old_quantity, new_quantity, user_email, remarks)
       VALUES ($1,'APPROVE_REQUEST',$2,$3,$4,$5)`,
      [inventory_id, oldQty, newQty, email, `Approved material request ID ${id}`]
    );

    await client.query("COMMIT");
    client.release();

    return res.status(200).json({
      success: true,
      message: "Request approved successfully",
      inventory_id,
      updated_quantity: newQty,
    });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
        client.release();
      } catch (_) {}
    }
    console.error("❌ Approve Request Error:", err.message);
    return res.status(500).json({ error: "Failed to approve material request" });
  }
});


// ============================================================
// PUT /api/inventory/requests/:id/deny
// Storekeeper denies a material request with remarks
// ============================================================
router.put("/requests/:id/deny", protect, authorize("storekeeper", "admin"), async (req, res) => {
  const { id } = req.params;
  const { email } = req.user;
  const { remarks } = req.body; // ✅ capture remarks

  try {
    // Update both status and remarks
    await pool.query(
      "UPDATE material_requests SET status='Denied', remarks=$1 WHERE id=$2",
      [remarks, id]
    );

    // Log denial
    await pool.query(
      `INSERT INTO inventory_logs (inventory_id, action, user_email, remarks)
       VALUES (NULL, 'DENY_REQUEST', $1, $2)`,
      [email, `Denied material request ID ${id}: ${remarks}`]
    );

    res.json({ success: true, message: "Request denied with remarks" });
  } catch (err) {
    console.error("❌ Deny Request Error:", err.message);
    res.status(500).json({ error: "Failed to deny material request" });
  }
});

// ============================================================
// GET /api/inventory/my-requests
// Engineer fetches all their submitted material requests
// ============================================================
router.get("/my-requests", protect, authorize("engineer", "admin", "staff", "Storekeeper"), async (req, res) => {
  const { email } = req.user;
  try {
    const query = `
      SELECT 
        r.id,
        i.name AS item_name,
        i.category,
        r.requested_qty,
        r.purpose,
        r.status,
        r.remarks,
        r.request_date
      FROM material_requests r
      LEFT JOIN inventory i ON r.inventory_id = i.id
      WHERE r.engineer_email = $1
      ORDER BY r.request_date DESC;
    `;
    const result = await pool.query(query, [email]);

    // Count pending requests for badge
    const pendingCount = result.rows.filter((r) => r.status === "Pending").length;

    res.json({
      success: true,
      requests: result.rows,
      pendingCount,
    });
  } catch (err) {
    console.error("❌ Fetch My Requests Error:", err.message);
    res.status(500).json({ error: "Failed to fetch your material requests" });
  }
});

// ============================================================
// GET /api/inventory/request-stats/:email
// Returns total and pending request counts for a specific engineer
// ============================================================
router.get("/request-stats/:email", protect, authorize("engineer", "admin", "staff", "Storekeeper"), async (req, res) => {
  const { email } = req.params;

  try {
    const query = `
      SELECT
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status = 'Pending') AS pending_requests
      FROM material_requests
      WHERE engineer_email = $1;
    `;
    const result = await pool.query(query, [email]);
    const { total_requests, pending_requests } = result.rows[0];

    res.json({
      success: true,
      total: Number(total_requests || 0),
      pending: Number(pending_requests || 0),
    });
  } catch (err) {
    console.error("❌ Request Stats Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch request stats" });
  }
});
// ============================================================
// GET /api/inventory/pending-requests-count
// Returns total pending material requests (staff + engineer)
// ============================================================
router.get(
  "/pending-requests-count",
  protect,
  authorize("storekeeper", "admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) AS pending_count
         FROM material_requests
         WHERE status = 'Pending';`
      );
      const pendingCount = Number(result.rows[0].pending_count || 0);
      res.json({ success: true, pendingCount });
    } catch (err) {
      console.error("❌ Pending Requests Count Error:", err.message);
      res.status(500).json({ error: "Failed to fetch pending requests count" });
    }
  }
);


// ===========================
// PUT /api/inventory/requests/:id/cancel
// ===========================
// Engineer cancels own pending request
router.put("/requests/:id/cancel", protect, authorize("engineer", "staff", "admin", "Storekeeper"), async (req, res) => {
  const { id } = req.params;
  const { email } = req.user;
  try {
    // Only cancel if still pending and owned by engineer
    const find = await pool.query(
      "SELECT inventory_id, status FROM material_requests WHERE id=$1 AND engineer_email=$2",
      [id, email]
    );
    if (!find.rows.length)
      return res.status(404).json({ error: "Request not found" });
    if (find.rows[0].status !== "Pending")
      return res.status(400).json({ error: "Only pending requests can be canceled" });

    // Mark as canceled
    await pool.query(
      "UPDATE material_requests SET status='Canceled', remarks=$1 WHERE id=$2",
      ["Engineer canceled request", id]
    );
    // Log
    await pool.query(
      `INSERT INTO inventory_logs (inventory_id, action, user_email, remarks)
       VALUES ($1, 'CANCEL_REQUEST', $2, $3)`,
      [find.rows[0].inventory_id, email, `Engineer canceled request ID ${id}`]
    );
    res.json({ success: true, message: "Request canceled successfully" });
  } catch (err) {
    console.error("❌ Cancel Request Error:", err.message);
    res.status(500).json({ error: "Failed to cancel request" });
  }
});

// ============================================================
// GET /api/inventory/logs
// Returns paginated inventory logs for the standalone Logs Page
// ============================================================
router.get("/logs", protect, authorize("admin", "storekeeper"), async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const countRes = await pool.query("SELECT COUNT(*) AS total FROM inventory_logs");
    const total = parseInt(countRes.rows[0].total, 10);

    const result = await pool.query(
      `SELECT
         id, inventory_id, action, user_email,
         old_quantity, new_quantity,
         item_name, item_type, category, size, condition, remarks, log_date
       FROM inventory_logs
       ORDER BY log_date DESC
       LIMIT $1 OFFSET $2;`,
      [limit, offset]
    );

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Fetch Logs Error:", err.message);
    res.status(500).json({ error: "Failed to fetch inventory logs" });
  }
});





// ============================================================
// 🔍 INVENTORY AUDIT ROUTES
// ============================================================

// ✅ Fetch all inventory items with audit status
router.get(
  "/audits",
  protect,
  authorize("admin", "storekeeper", "staff", "engineer", "apprentice"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const countRes = await pool.query("SELECT COUNT(*) AS total FROM inventory");
      const total = parseInt(countRes.rows[0].total, 10);

      const query = `
        SELECT 
          i.id, i.name, i.type, i.category, i.size, i.quantity, i.condition, i.location,
          i.added_by, i.last_updated,
          COALESCE(a.audit_status, 'Pending') AS audit_status,
          a.note, a.auditor_email, a.created_at AS audit_date
        FROM inventory i
        LEFT JOIN inventory_audits a ON i.id = a.inventory_id
        ORDER BY i.name ASC
        LIMIT $1 OFFSET $2;
      `;
      const result = await pool.query(query, [limit, offset]);

      res.json({
        success: true,
        audits: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total_items: total,
          total_pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("❌ Error fetching inventory audits:", err.message);
      res.status(500).json({ error: "Failed to fetch inventory audits" });
    }
  }
);

// ✅ Add or update audit record for inventory item
router.put(
  "/audit/:id",
  protect,
  authorize("admin", "storekeeper",  "staff", "engineer", "apprentice"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const { email } = req.user;

      const query = `
        INSERT INTO inventory_audits (inventory_id, auditor_email, audit_status, note)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (inventory_id)
        DO UPDATE SET
          audit_status = EXCLUDED.audit_status,
          note = EXCLUDED.note,
          auditor_email = EXCLUDED.auditor_email,
          created_at = NOW();
      `;
      await pool.query(query, [id, email, status, note]);

      res.json({ success: true, message: "Inventory audit updated successfully" });
    } catch (err) {
      console.error("❌ Error updating inventory audit:", err.message);
      res.status(500).json({ error: "Failed to update inventory audit" });
    }
  }
);

// ============================================================
// 📊 INVENTORY AUDIT SUMMARY
// ============================================================
router.get(
  "/audits/summary",
  protect,
  authorize("admin", "storekeeper"),
  async (req, res) => {
    try {
      // Count total inventory
      const totalRes = await pool.query("SELECT COUNT(*) AS total FROM inventory");
      const total = parseInt(totalRes.rows[0].total, 10);

      // Count verified
      const verifiedRes = await pool.query(
        "SELECT COUNT(*) AS count FROM inventory_audits WHERE audit_status = 'Verified'"
      );
      const verified = parseInt(verifiedRes.rows[0].count, 10);

      // Count remarked
      const remarkedRes = await pool.query(
        "SELECT COUNT(*) AS count FROM inventory_audits WHERE audit_status = 'Remarked'"
      );
      const remarked = parseInt(remarkedRes.rows[0].count, 10);

      // Compute pending
      const pending = total - (verified + remarked);

      res.json({
        success: true,
        summary: {
          total,
          verified,
          remarked,
          pending: pending < 0 ? 0 : pending,
        },
      });
    } catch (err) {
      console.error("❌ Error fetching inventory audit summary:", err.message);
      res.status(500).json({ error: "Failed to fetch inventory audit summary" });
    }
  }
);


// ============================================================
// PUT: Reset ALL audits to Pending (Admin only)
// ============================================================
router.put("/audits/reset", protect, authorize("admin"), async (req, res) => {
  try {
    await pool.query(`
      UPDATE inventory_audits
      SET audit_status = 'Pending',
          note = NULL,
          auditor_email = NULL,
          updated_at = NOW();
    `);

    await pool.query(
      `INSERT INTO inventory_logs (action, user_email, remarks)
       VALUES ('RESET_ALL_AUDITS', $1, 'All audit statuses reset to Pending')`,
      [req.user.email]
    );

    res.json({
      success: true,
      message: "✅ All inventory audit statuses have been reset to Pending.",
    });
  } catch (err) {
    console.error("❌ Error resetting audits:", err.message);
    res.status(500).json({ error: "Failed to reset audits" });
  }
});

// ============================================================
// PUT: Reset a single audit to Pending (Admin only)
// ============================================================
router.put("/audit/:id/reset", protect, authorize("admin"), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      UPDATE inventory_audits
      SET audit_status = 'Pending',
          note = NULL,
          auditor_email = NULL,
          updated_at = NOW()
    WHERE inventory_id = $1

      RETURNING *;
      `,
      [id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Material not found." });

    await pool.query(
      `INSERT INTO inventory_logs (action, user_email, remarks)
       VALUES ('RESET_SINGLE_AUDIT', $1, $2)`,
      [req.user.email, `Reset audit for item ID ${id}`]
    );

    res.json({
      success: true,
      message: `Audit for material ID ${id} reset to Pending.`,
      audit: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error resetting single audit:", err.message);
    res.status(500).json({ error: "Failed to reset single audit" });
  }
});

module.exports = router;
