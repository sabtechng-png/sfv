const pool = require("./db");

(async () => {
  try {
    const result = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type='BASE TABLE';
    `);
    console.log("📋 All tables visible to this connection:", result.rows);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    process.exit(0);
  }
})();
