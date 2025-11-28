// ===============================================
// SFV Tech – JWT Authentication & Role Middleware
// ===============================================
const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * @desc Protect routes - verifies JWT token from Authorization header
 * @usage app.use("/api/dashboard", protect)
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1️⃣ Ensure token is provided
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authorized, token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 2️⃣ Verify token with secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Attach decoded user info to request object
    req.user = decoded;

    next(); // proceed to next middleware / route
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * @desc Restrict access by role(s)
 * @usage router.get("/admin", protect, authorize("admin"), handler)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (
      !req.user ||
      !req.user.role ||
      !allowedRoles.map((r) => r.toLowerCase()).includes(req.user.role.toLowerCase())
    ) {
      return res.status(403).json({ error: "Access denied: insufficient permissions" });
    }
    next();
  };
};


module.exports = { protect, authorize };
