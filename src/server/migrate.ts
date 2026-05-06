import pool from "./db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const sqlPath = path.resolve(__dirname, "../../init.sql");
  console.log("Reading SQL from:", sqlPath);
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = await pool.connect();
  try {
    console.log("Starting migration...");
    // We need to drop tables in correct order if we want a clean slate,
    // or just run the script if it handles IF NOT EXISTS (which it doesn't currently)
    // To make it safe for re-runs, we can wrap in a try-catch or modify init.sql
    await client.query(sql);
    console.log("Schema initialized.");

    // Add Admin user
    const phone = "+7 (996) 305-88-14";
    const name = "Admin";
    const role = "admin";

    await client.query(
      "INSERT INTO users (phone, name, role) VALUES ($1, $2, $3) ON CONFLICT (phone) DO UPDATE SET role = $3",
      [phone, name, role],
    );
    console.log(`User ${phone} set as ${role}.`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
