// ===============================
// Generate bcrypt hash for SFV user
// ===============================
const bcrypt = require("bcryptjs");

(async () => {
  const plainPassword = "###admin123"; // 👈 change this to any password
  const saltRounds = 10;
  const hash = await bcrypt.hash(plainPassword, saltRounds);
  console.log("✅ Plain password:", plainPassword);
  console.log("✅ Bcrypt hash:\n", hash);
})();
