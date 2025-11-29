// routes/adminUserRoutes.js
const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware");
const {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminResetPassword,
  adminDeleteUser,
} = require("../controllers/adminUserController");

// PREFIX: /api/admin-users

router.get("/", protect, authorize("admin"), adminListUsers);
router.post("/", protect, authorize("admin"), adminCreateUser);
router.patch("/:id", protect, authorize("admin"), adminUpdateUser);
router.patch("/:id/reset-password", protect, authorize("admin"), adminResetPassword);
router.delete("/:id", protect, authorize("admin"), adminDeleteUser);

module.exports = router;
