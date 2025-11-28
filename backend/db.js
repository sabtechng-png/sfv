// ===============================================
// SFV Tech - PostgreSQL (NeonDB) Connection Setup
// ===============================================
const { Pool } = require("pg");
require("dotenv").config();

// ✅ Connection Pool Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for NeonDB SSL
  },
  max: 10,         // Maximum number of connections
  idleTimeoutMillis: 30000, // Idle timeout (30s)
  connectionTimeoutMillis: 10000, // Connection timeout (10s)
});

// ✅ Test Connection + Set UTC Timezone
(async () => {
  try {
    const client = await pool.connect();
    await client.query("SET TIME ZONE 'UTC';");
	const dbName = await client.query("SELECT current_database();");
console.log("🧩 Connected database name:", dbName.rows[0].current_database);

    console.log("✅ Connected to NeonDB | Timezone set to UTC");
    client.release();
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }
})();

// ✅ Graceful Reconnect (Handles dropped connections)
pool.on("error", (err) => {
  console.error("⚠️  Unexpected database error, attempting reconnect:", err.message);
});

// ✅ Export Pool for Use Across App
module.exports = pool;
