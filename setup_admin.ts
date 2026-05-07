import pool from "./src/server/db.js";
import fs from "fs";
import path from "path";

async function setupAdmin() {
  try {
    const sqlPath = path.resolve(process.cwd(), "init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Creating tables...");
    await pool.query(sql);

    console.log("Checking for user...");
    const checkUser = await pool.query("SELECT * FROM users WHERE phone = $1", ["79963058814"]);

    if (checkUser.rows.length === 0) {
      console.log("User not found. Creating user as admin...");
      await pool.query("INSERT INTO users (phone, name, role) VALUES ($1, $2, $3)", ["79963058814", "Admin", "admin"]);
    } else {
      console.log("User found. Updating to admin...");
      await pool.query("UPDATE users SET role = 'admin' WHERE phone = $1", ["79963058814"]);
    }

    console.log("Success! Tables created and user 79963058814 is now an admin.");
    process.exit(0);
  } catch (err) {
    console.error("Error during setup:", err);
    process.exit(1);
  }
}

setupAdmin();
