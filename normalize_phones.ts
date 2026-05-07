import pool from "./src/server/db.ts";

async function normalizeExistingPhones() {
  console.log("Normalizing existing phone numbers...");
  const client = await pool.connect();
  try {
    // 1. Get all users
    const { rows: users } = await client.query("SELECT id, phone FROM users");

    for (const user of users) {
      const normalized = user.phone.replace(/\D/g, "");
      if (normalized !== user.phone) {
        console.log(`Normalizing ${user.phone} -> ${normalized}`);
        try {
          await client.query("UPDATE users SET phone = $1 WHERE id = $2", [
            normalized,
            user.id,
          ]);
        } catch (err: unknown) {
          if ((err as { code?: string }).code === "23505") {
            // Unique violation
            console.log(
              `Duplicate found for ${normalized}. Merging/Deleting user ${user.id}`,
            );
            // Delete address, votes, and user
            await client.query(
              "DELETE FROM user_addresses WHERE user_id = $1",
              [user.id],
            );
            await client.query(
              "DELETE FROM schedule_votes WHERE user_id = $1",
              [user.id],
            );
            await client.query("DELETE FROM tariff_votes WHERE user_id = $1", [
              user.id,
            ]);
            await client.query("DELETE FROM users WHERE id = $1", [user.id]);
          } else {
            throw err;
          }
        }
      }
    }

    console.log("SUCCESS: Phone normalization complete.");
  } catch (err) {
    console.error("FAILURE during normalization:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}
normalizeExistingPhones();
