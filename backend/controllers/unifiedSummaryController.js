// You already have SQL functions inside jobRoutes, expenseRoutes, materialRoutes etc.
// We simply reuse them here.

const db = require("../db");

// ENGINEER SUMMARY
exports.getEngineerSummary = async (email) => {
    const [[jobs]] = await db.query(
        `SELECT 
            COUNT(*) AS total_jobs,
            SUM(status = 'ongoing') AS ongoing,
            SUM(status = 'completed') AS completed
         FROM jobs WHERE engineer_email = ?`,
        [email]
    );

    const [[expenses]] = await db.query(
        `SELECT 
            SUM(amount) AS spent,
            SUM(approved_amount) AS approved,
            SUM(balance) AS availableBalance
         FROM expenses WHERE engineer_email = ?`,
        [email]
    );

    const [[witnesses]] = await db.query(
        `SELECT 
            SUM(status = 'pending') AS pending,
            COUNT(*) AS total
         FROM witness WHERE engineer_email = ?`,
        [email]
    );

    const [[materials]] = await db.query(
        `SELECT 
            COUNT(*) AS total_collections,
            SUM(quantity) AS total_collected,
            SUM(returned) AS total_returned,
            SUM(quantity - returned) AS total_remaining
         FROM material_collections WHERE engineer_email = ?`,
        [email]
    );

    const [[quotations]] = await db.query(
        `SELECT 
            COUNT(*) AS total,
            SUM(status = 'pending') AS pending
         FROM quotations WHERE staff_email = ?`,
        [email]
    );

    return { jobs, expenses, witnesses, materials, quotations };
};

// OTHER ROLES — You can fill as needed
exports.getStaffSummary = async (email) => ({
    placeholder: true,
    email,
});

exports.getStorekeeperSummary = async (email) => ({
    placeholder: true,
    email,
});

exports.getApprenticeSummary = async (email) => ({
    placeholder: true,
    email,
});

exports.getAdminSummary = async () => ({
    placeholder: true,
});
