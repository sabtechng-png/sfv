const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

// Import your existing helper functions
const {
    getEngineerSummary,
    getStaffSummary,
    getStorekeeperSummary,
    getApprenticeSummary,
    getAdminSummary,
} = require("../controllers/unifiedSummaryController");

// Auto-detect role and return appropriate summary
router.get("/:email", protect, async (req, res) => {
    try {
        const role = req.user.role;

        let result;

        switch (role) {
            case "admin":
                result = await getAdminSummary(req.user.email);
                break;

            case "engineer":
                result = await getEngineerSummary(req.user.email);
                break;

            case "staff":
                result = await getStaffSummary(req.user.email);
                break;

            case "storekeeper":
                result = await getStorekeeperSummary(req.user.email);
                break;

            case "apprentice":
                result = await getApprenticeSummary(req.user.email);
                break;

            default:
                return res.status(400).json({ error: "Invalid user role" });
        }

        return res.json(result);
    } catch (err) {
        console.error("Unified summary error:", err);
        return res.status(500).json({ error: "Server failed to load summary" });
    }
});

module.exports = router;
