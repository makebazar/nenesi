import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("FATAL: DATABASE_URL is not defined in environment variables!");
} else {
  // Mask password in logs for safety
  const masked = connectionString.replace(/:([^:@]+)@/, ":****@");
  console.log("Connecting to database:", masked);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("localhost")
    ? false
    : {
        rejectUnauthorized: false, // Common for cloud DBs
      },
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
