// quotationSettingsRoutes.js (FINAL UPGRADED VERSION)

const express = require("express");
const router = express.Router();
const db = require("../db");
const { protect } = require("../middleware/authMiddleware");

async function ensureDefaultSettings() {
  const result = await db.query("SELECT * FROM quotation_settings LIMIT 1");

  if (result.rows.length === 0) {
    await db.query(
      `INSERT INTO quotation_settings 
      (company_name, company_address, company_phone, company_email,
       default_vat, default_discount, footer_note,
       bank_name, bank_account_name, bank_account_number,
       terms, payment_terms, company_website, company_rc,
       watermark_text, signature_footer_text)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        "SFV TECHNOLOGY",
        "Sample Address, Ilorin, Kwara State, Nigeria",
        "+234-800-000-0000",
        "sfvtech@gmail.com",
        0,
        0,
        "Thank you for choosing SFV Technology.",
        "Sample Bank",
        "SFV TECHNOLOGY LTD",
        "0000000000",
        "Goods sold in good condition are not returnable.",
        "70% upfront, 30% on completion.",
        "www.sfvtech.com",
        "RC 0000000",
        "SFV TECH",  // watermark
        "This document is system-generated and requires no signature."
      ]
    );
  }
}

// GET SETTINGS
router.get("/", protect, async (req, res) => {
  try {
    await ensureDefaultSettings();
    const result = await db.query("SELECT * FROM quotation_settings LIMIT 1");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error retrieving settings." });
  }
});

// UPDATE SETTINGS
router.put("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can update settings." });
    }

    const {
      company_name, company_address, company_phone, company_email,
      default_vat, default_discount, footer_note,
      bank_name, bank_account_name, bank_account_number,
      terms, payment_terms, company_website, company_rc,
      watermark_text, signature_footer_text
    } = req.body;

    await db.query(
      `UPDATE quotation_settings SET
        company_name = $1,
        company_address = $2,
        company_phone = $3,
        company_email = $4,
        default_vat = $5,
        default_discount = $6,
        footer_note = $7,
        bank_name = $8,
        bank_account_name = $9,
        bank_account_number = $10,
        terms = $11,
        payment_terms = $12,
        company_website = $13,
        company_rc = $14,
        watermark_text = $15,
        signature_footer_text = $16
      WHERE id = (SELECT id FROM quotation_settings LIMIT 1)`,
      [
        company_name, company_address, company_phone, company_email,
        default_vat, default_discount, footer_note,
        bank_name, bank_account_name, bank_account_number,
        terms, payment_terms, company_website, company_rc,
        watermark_text, signature_footer_text
      ]
    );

    res.json({ message: "Settings updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error updating settings." });
  }
});

module.exports = router;
