/**
 * ============================================================
 *  SFV Tech | Quotations API (v7 — Added project_title support)
 * ============================================================
 */

const express = require("express");
const pool = require("../db");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

/* ------------------------------------------------------------
 * Helper: Generate Ref No
 * ----------------------------------------------------------*/
function generateRefNo() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SFV-${datePart}-${randomPart}`;
}

const canModify = (user, quotation) =>
  user.role && (user.role.toLowerCase() === "admin" || user.email === quotation.created_by);

/* =============================================================
 * 1️⃣ GET ALL Quotations (now includes project_title)
 * ============================================================*/
router.get(
  "/",
  protect,
  authorize("admin", "engineer", "staff", "storekeeper"),
  async (_req, res) => {
    try {
      const sql = `
      SELECT
        q.id,
        q.ref_no,
        q.customer_name,
        q.customer_phone,
        q.customer_address,
        q.quote_for,
        q.project_title,    -- ✅ NEW FIELD
        q.status,
        q.created_by,
        q.notes,
        q.subtotal,
        q.discount_percent,
        q.discount_amount,
        q.vat_percent,
        q.vat_amount,
        q.total,
        q.approved_by,

        TO_CHAR(q.created_at AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,

        TO_CHAR(q.approved_at AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS approved_at,

        COALESCE(SUM(qi.total_price), 0) AS total_amount,
        COUNT(qi.id) AS item_count
      FROM quotations q
      LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
      GROUP BY q.id
      ORDER BY q.id DESC;
      `;

      const { rows } = await pool.query(sql);
      res.json(rows);
    } catch (err) {
      console.error("❌ [GET /quotations]", err.message);
      res.status(500).json({ error: "Server error fetching quotations" });
    }
  }
);

/* =============================================================
 * 2️⃣ GET Single Quotation (now includes project_title)
 * ============================================================*/
router.get(
  "/:id",
  protect,
  authorize("admin", "engineer", "staff", "storekeeper"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid quotation ID" });

    try {
      const quotation = await pool.query(
        `
      SELECT
        q.id,
        q.ref_no,
        q.customer_name,
        q.customer_phone,
        q.customer_address,
        q.quote_for,
        q.project_title,   -- ✅ NEW FIELD
        q.status,
        q.created_by,
        q.notes,
        q.subtotal,
        q.discount_percent,
        q.discount_amount,
        q.vat_percent,
        q.vat_amount,
        q.total,
        q.approved_by,

        TO_CHAR(q.created_at AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,

        TO_CHAR(q.approved_at AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS approved_at

      FROM quotations q
      WHERE q.id = $1;
      `,
        [id]
      );

      if (quotation.rowCount === 0)
        return res.status(404).json({ error: "Quotation not found" });

      const items = await pool.query(
        `
      SELECT
        id,
        material_id,
        material_name,
        material_category,
        material_unit,
        material_unit_price,
        quantity,
        unit_price,
        total_price,
        TO_CHAR(created_at AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
      FROM quotation_items
      WHERE quotation_id = $1
      ORDER BY id ASC;
      `,
        [id]
      );

      res.json({ ...quotation.rows[0], items: items.rows });
    } catch (err) {
      console.error("❌ [GET /quotations/:id]", err.message);
      res.status(500).json({ error: "Server error fetching quotation detail" });
    }
  }
);

/* =============================================================
 * 3️⃣ CREATE Quotation (now supports project_title)
 * ============================================================*/
router.post(
  "/",
  protect,
  authorize("admin", "engineer", "staff", "storekeeper"),
  async (req, res) => {
    const user = req.user;

    const {
      customer_name,
      customer_phone,
      customer_address,
      quote_for,
      project_title,   // ✅ NEW FIELD
      notes,
      subtotal,
      discount_percent,
      discount_amount,
      vat_percent,
      vat_amount,
      total,
      items = [],
    } = req.body;

    if (!customer_name || !quote_for) {
      return res.status(400).json({ error: "Customer name and quote_for are required" });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const refNo = generateRefNo();

      const insertQuotation = `
      INSERT INTO quotations (
        ref_no,
        customer_name,
        customer_phone,
        customer_address,
        quote_for,
        project_title,          -- ✅ NEW FIELD
        notes,
        subtotal,
        discount_percent,
        discount_amount,
        vat_percent,
        vat_amount,
        total,
        status,
        created_by,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Draft',$14,NOW())
      RETURNING
        id,
        ref_no,
        TO_CHAR(created_at AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at;
      `;

      const { rows } = await client.query(insertQuotation, [
        refNo,
        customer_name,
        customer_phone || null,
        customer_address || null,
        quote_for,
        project_title || null,     // ✅ NEW FIELD
        notes || null,
        subtotal || 0,
        discount_percent || 0,
        discount_amount || 0,
        vat_percent || 0,
        vat_amount || 0,
        total || 0,
        user.email,
      ]);

      const quotationId = rows[0].id;

      /* Insert items unchanged… */
      for (const item of items || []) {
        const materialId = item.material_id || null;

        let m = {
          name: item.material_name || "Custom Item",
          category: item.material_category || "N/A",
          unit: item.material_unit || "pcs",
          unit_price: item.unit_price || 0,
        };

        if (materialId) {
          const mat = await client.query(
            "SELECT name, category, unit, unit_price FROM materials WHERE id = $1",
            [materialId]
          );
          if (mat.rows[0]) {
            m = {
              name: mat.rows[0].name,
              category: mat.rows[0].category,
              unit: mat.rows[0].unit,
              unit_price: mat.rows[0].unit_price,
            };
          }
        }

        const unitPrice = Number(item.unit_price ?? m.unit_price ?? 0);
        const quantity = Number(item.quantity ?? item.qty ?? 0);

        await client.query(
          `
        INSERT INTO quotation_items
          (quotation_id, material_id, quantity, unit_price,
           material_name, material_category, material_unit,
           material_unit_price, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW());
        `,
          [
            quotationId,
            materialId,
            quantity,
            unitPrice,
            m.name,
            m.category,
            m.unit,
            unitPrice,
          ]
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        message: "Quotation saved successfully",
        id: quotationId,
        ref_no: rows[0].ref_no,
        created_at: rows[0].created_at,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ [POST /quotations]", err.stack || err.message);
      res.status(500).json({ error: "Failed to save quotation" });
    } finally {
      client.release();
    }
  }
);

/* =============================================================
 * 4️⃣ UPDATE Quotations (supports project_title)
 * ============================================================*/
router.put(
  "/:id",
  protect,
  authorize("admin", "engineer", "staff", "storekeeper"),
  async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    const {
      customer_name,
      customer_phone,
      customer_address,
      quote_for,
      project_title,   // ✅ NEW FIELD
      notes,
      subtotal,
      discount_percent,
      discount_amount,
      vat_percent,
      vat_amount,
      total,
      items = [],
    } = req.body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingRes = await client.query(
        "SELECT created_by, status FROM quotations WHERE id = $1",
        [id]
      );

      if (existingRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Quotation not found" });
      }

      const existing = existingRes.rows[0];

      if (!canModify(user, existing)) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "You can only edit your own quotations (admin can edit all)",
        });
      }

      if (existing.status === "Approved" && user.role.toLowerCase() !== "admin") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Approved quotation can only be edited by admin",
        });
      }

      await client.query(
        `
        UPDATE quotations
        SET
          customer_name = $1,
          customer_phone = $2,
          customer_address = $3,
          quote_for = $4,
          project_title = $5,   -- ✅ NEW FIELD
          notes = $6,
          subtotal = $7,
          discount_percent = $8,
          discount_amount = $9,
          vat_percent = $10,
          vat_amount = $11,
          total = $12
        WHERE id = $13;
      `,
        [
          customer_name,
          customer_phone || null,
          customer_address || null,
          quote_for,
          project_title || null,  // ✅
          notes || null,
          subtotal || 0,
          discount_percent || 0,
          discount_amount || 0,
          vat_percent || 0,
          vat_amount || 0,
          total || 0,
          id,
        ]
      );

      /* Items logic unchanged… */
      await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [id]);

      for (const item of items || []) {
        const materialId = item.material_id || null;

        let m = {
          name: item.material_name || "Custom Item",
          category: item.material_category || "N/A",
          unit: item.material_unit || "pcs",
          unit_price: item.unit_price || 0,
        };

        if (materialId) {
          const mat = await client.query(
            "SELECT name, category, unit, unit_price FROM materials WHERE id = $1",
            [materialId]
          );
          if (mat.rows[0]) {
            m = {
              name: mat.rows[0].name,
              category: mat.rows[0].category,
              unit: mat.rows[0].unit,
              unit_price: mat.rows[0].unit_price,
            };
          }
        }

        const unitPrice = Number(item.unit_price ?? m.unit_price ?? 0);
        const quantity = Number(item.quantity ?? item.qty ?? 0);

        await client.query(
          `
          INSERT INTO quotation_items
            (quotation_id, material_id, quantity, unit_price,
             material_name, material_category, material_unit,
             material_unit_price, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW());
        `,
          [
            id,
            materialId,
            quantity,
            unitPrice,
            m.name,
            m.category,
            m.unit,
            unitPrice,
          ]
        );
      }

      await client.query("COMMIT");

      res.json({ message: "Quotation updated successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ [PUT /quotations/:id]", err.message);
      res.status(500).json({ error: "Failed to update quotation" });
    } finally {
      client.release();
    }
  }
);

/* =============================================================
 * 5️⃣ APPROVE QUOTATION
 * ============================================================*/
router.put(
  "/:id/approve",
  protect,
  authorize("admin", "engineer", "staff"),
  async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    try {
      // Fetch existing quotation
      const existing = await pool.query(
        "SELECT status, created_by FROM quotations WHERE id = $1",
        [id]
      );

      if (existing.rowCount === 0) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      const q = existing.rows[0];

      // Only admin or creator can approve
      if (user.role.toLowerCase() !== "admin" && user.email !== q.created_by) {
        return res.status(403).json({
          error: "You are not allowed to approve this quotation",
        });
      }

      if (q.status === "Approved") {
        return res.status(400).json({ error: "Quotation already approved" });
      }

      // APPROVE IT
      await pool.query(
        `
        UPDATE quotations
        SET status = 'Approved',
            approved_by = $1,
            approved_at = NOW()
        WHERE id = $2
        `,
        [user.email, id]
      );

      res.json({ message: "Quotation approved successfully" });
    } catch (err) {
      console.error("❌ [APPROVE QUOTATION]", err.message);
      res.status(500).json({ error: "Failed to approve quotation" });
    }
  }
);

module.exports = router;
