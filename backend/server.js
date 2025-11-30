// =========================================
// SFV Tech Backend - Global Entry Point
// =========================================
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");

// === Import Routes ===
const authRoutes = require("./routes/auth"); // Authentication routes
const requestLogger = require("./middleware/requestLogger");
const logRoutes = require("./routes/logs");
const materialsRoutes = require("./routes/materials");
const quotationRoutes = require("./routes/quotations");
const auditAccessRoutes = require("./routes/auditAccessRoutes");
const userRoutes = require("./routes/userRoutes");

const jobRoutes = require("./routes/jobRoutes"); // ✅ Import your job routes
const maintenanceRoutes = require("./routes/maintenanceRoutes");   // ✅ add
const issuesRoutes = require("./routes/issuesRoutes");
const jobdashboardRoutes = require("./routes/jobdashboardRoutes");
const quotationSettingsRoutes = require("./routes/quotationSettingsRoutes");





// === For Engineers===
const engineerRoutes = require("./routes/engineerRoutes");
const expenseFormRoutes = require("./routes/expenseFormRoutes");

// === For  StoreKeeper===
const inventoryRoutes = require("./routes/inventoryRoutes");
const materialCollectionRoutes = require("./routes/materialCollectionRoutes");
const materialReturnRoutes = require("./routes/materialReturnRoutes");

// === Common files===
const witnessRoutes = require("./routes/witnessRoutes");   //Witnesses
const expenseRoutes = require("./routes/expenseRoutes");  // expenses 
const balanceRoutes = require("./routes/balanceRoutes");
const expenseLogsRoutes = require("./routes/expenseLogsRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");



// === For Staff===
const staffRoutes = require("./routes/staffRoutes");


// === For StoreKeeper===


// === Initialize Express ===
const app = express();
const PORT = process.env.PORT || 4000;

// === Middlewares ===
app.use(cors());
app.use(express.json());
app.use(requestLogger); // ✅ log every request




// === Global UTC Time Handling ===
// Always store and handle time in UTC for global consistency
pool.query("SET TIME ZONE 'UTC';")
  .then(() => console.log("🌍 Database timezone set to UTC"))
  .catch(err => console.error("⚠️ Timezone setup failed:", err.message));

// === Root Route (Server Status) ===
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS utc_time");
    res.json({
      message: "✅ SFV Tech Backend Running Successfully",
      utc_time: result.rows[0].utc_time,
    });
  } catch (err) {
    console.error("Root route error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// === API Routes ===
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/audit-access", auditAccessRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/jobs", issuesRoutes);
app.use("/api/dashboard", jobdashboardRoutes);

app.use("/api/admin-users", adminUserRoutes);

app.use("/api/users", userRoutes);
app.use("/api/quotation-settings", quotationSettingsRoutes);
app.use("/api/imprest", require("./routes/imprestRoutes"));



// === For Engineers ===
app.use("/api/expenses", engineerRoutes);
app.use("/api/expense-form", expenseFormRoutes);
app.use("/api/balance", balanceRoutes);
app.use("/api/expense-logs", expenseLogsRoutes);
app.use("/api/expenses", expenseRoutes);

// === For StoreKeeper===
app.use("/api/inventory", inventoryRoutes);
// === Common Api===
app.use("/api/witness", witnessRoutes);  //  Witnesses
app.use("/api/engineer/expenses", expenseRoutes);
app.use("/api/material-collections", materialCollectionRoutes);
app.use("/api/material-returns", materialReturnRoutes);




// === For Staff===
app.use("/api/staff", staffRoutes);

// Routes
app.use("/api/jobs", require("./routes/jobRoutes"));

app.use("/api/jobs", maintenanceRoutes);                           // ✅ mount

app.use("/api/issues", require("./routes/issuesRoutes"));

// === Global Error Handling (Optional Enhancement) ===
app.use((err, req, res, next) => {
  console.error("❌ Unexpected Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// === Start Server ===
// === Debug: List Registered Routes ===
app.on('mount', () => {
  console.log("🧭 Registered routes (on mount):");
});

setTimeout(() => {
  if (app._router && app._router.stack) {
    console.log("🧭 Registered routes:");
    app._router.stack.forEach((r) => {
      if (r.route && r.route.path) {
        console.log(r.route.path);
      } else if (r.name === "router" && r.handle && r.handle.stack) {
        r.handle.stack.forEach((h) => {
          if (h.route && h.route.path) {
            console.log("  ↳", h.route.path);
          }
        });
      }
    });
  } else {
    //console.log("⚠️ app._router not ready yet — no routes to show.");
  }
}, 500); // wait half a second for all routes to load




app.listen(PORT, () => console.log(`🚀 SFV Tech Backend running on port ${PORT}`));
