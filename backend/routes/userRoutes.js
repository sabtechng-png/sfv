// routes/userRoutes.js
const express = require("express");
const router = express.Router();

const {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
} = require("../controllers/userController");

const { protect, authorize } = require("../middleware/authMiddleware");

// ========== USER MANAGEMENT ROUTES (Admin Only) ==========

// Get all users
router.get("/", protect, authorize("admin"), listUsers);

// Create new user
router.post("/", protect, authorize("admin"), createUser);

// Update user details (role, name, nickname, etc.)
router.patch("/:id", protect, authorize("admin"), updateUser);

// Reset password
router.patch("/:id/reset-password", protect, authorize("admin"), resetPassword);

// Delete user
router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
