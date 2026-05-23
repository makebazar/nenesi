import pool from "./src/server/db.ts";

async function seedWorker() {
  const phone = "79991112233"; // Phone number for logging in as a worker
  const name = "Александр Петров";
  const role = "worker";

  try {
    console.log(`Checking for worker with phone: ${phone}...`);
    const checkUser = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);

    if (checkUser.rows.length === 0) {
      console.log("Worker not found. Creating...");
      await pool.query("INSERT INTO users (phone, name, role) VALUES ($1, $2, $3)", [phone, name, role]);
      console.log(`Successfully created worker!`);
    } else {
      console.log("User found. Updating role to worker...");
      await pool.query("UPDATE users SET role = $1, name = $2 WHERE phone = $3", [role, name, phone]);
      console.log(`Successfully updated user to worker!`);
    }
    
    console.log("\n=============================================");
    console.log("ИНСТРУКЦИЯ ДЛЯ ВХОДА:");
    console.log(`1. Перейдите на страницу входа (/login)`);
    console.log(`2. Введите номер телефона: +7 (999) 111-22-33`);
    console.log(`3. Нажмите 'Продолжить' - система автоматически`);
    console.log(`   авторизует вас как воркера и перенаправит`);
    console.log(`   в кабинет сотрудника (/worker)`);
    console.log("=============================================\n");
    
    process.exit(0);
  } catch (err) {
    console.error("Error during seeding worker:", err);
    process.exit(1);
  }
}

seedWorker();
