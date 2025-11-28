// ===============================================
// SFV Tech – Request Logger Middleware (UTC-safe)
// ===============================================
const pool = require("../db");

/**
 * Logs every incoming request and its response status into the DB.
 *  - Captures user_id & role (if authenticated)
 *  - Measures duration in ms
 *  - Stores UTC timestamp in request_logs table
 */
const requestLogger = async (req, res, next) => {
  const start = Date.now();

  // Run after response is finished
  res.on("finish", async () => {
    const duration = Date.now() - start;
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const ua = req.headers["user-agent"];
    const status = res.statusCode;

    // Use authenticated user info if present (set by protect middleware)
    const user_id = req.user?.id || null;
    const role = req.user?.role || null;

    try {
      await pool.query(
        `
        INSERT INTO request_logs
          (user_id, role, method, path, ip, user_agent, status_code, duration_ms)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [user_id, role, req.method, req.originalUrl, ip, ua, status, duration]
      );
    } catch (err) {
      console.error("⚠️  Request-log insert failed:", err.message);
    }
  });

  next();
};

module.exports = requestLogger;
