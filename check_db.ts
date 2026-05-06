import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function check() {
  const connectionString = process.env.DATABASE_URL;
  console.log(
    "Checking connection to:",
    connectionString?.replace(/:([^:@]+)@/, ":****@"),
  );

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const res = await pool.query("SELECT NOW()");
    console.log("SUCCESS: Database connected!");
    console.log("Current time from DB:", res.rows[0]);

    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    console.log(
      "Existing tables:",
      tables.rows.map((r) => r.table_name),
    );

    process.exit(0);
  } catch (err) {
    console.error("FAILURE: Could not connect to database.");
    console.error(err);
    process.exit(1);
  }
}

check();
