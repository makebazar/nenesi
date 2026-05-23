import pool from "./src/server/db.ts";

async function fix() {
  console.log("Starting DB repair...");
  try {
    // 1. Types
    await pool.query(`
      DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('client', 'worker', 'admin');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 2. Users Table & Constraint
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          phone VARCHAR(20) NOT NULL,
          name VARCHAR(100),
          role user_role NOT NULL DEFAULT 'client',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await pool.query(
        "ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone)",
      );
      console.log("Added UNIQUE constraint to users(phone)");
    } catch {
      // Ignore if already exists
    }

    // 3. JK Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS residential_complexes (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT NOT NULL,
          votes INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3.5 QR Codes Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          jk_id INTEGER REFERENCES residential_complexes(id) ON DELETE SET NULL,
          scans_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add qr_id column to users table if not exists
    try {
      await pool.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS qr_id INTEGER REFERENCES qr_codes(id) ON DELETE SET NULL"
      );
      console.log("Added qr_id column to users table.");
    } catch {
      // Ignore if already exists
    }

    // 4. Addresses Table & Constraint
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          jk_id INTEGER REFERENCES residential_complexes(id) ON DELETE SET NULL,
          street TEXT,
          entrance TEXT,
          floor TEXT,
          apartment TEXT,
          intercom TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await pool.query(
        "ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_user_id_key UNIQUE (user_id)",
      );
      console.log("Added UNIQUE constraint to user_addresses(user_id)");
    } catch {
      // Ignore if already exists
    }

    // 5. Votes Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_votes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          vote_option VARCHAR(10) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tariff_votes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          tariff_name VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
      );
    `);

    // 6. Tariffs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tariffs (
          id SERIAL PRIMARY KEY,
          tag VARCHAR(50),
          subtitle VARCHAR(100),
          title VARCHAR(100) NOT NULL,
          price INTEGER NOT NULL,
          features TEXT[] DEFAULT '{}',
          is_popular BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await pool.query(
        "ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS subtitle VARCHAR(100)",
      );
    } catch {
      // Ignore if already exists
    }
    console.log("Tariffs table verified.");

    // 7. Seed Data & Normalization
    await pool.query(`
      -- Fix old names if they exist
      UPDATE tariffs SET title = 'Эконом' WHERE title = 'Через день';
      UPDATE tariff_votes SET tariff_name = 'Эконом' WHERE tariff_name = 'Через день';

      INSERT INTO tariffs (tag, title, price, features, is_popular)
      SELECT 'Выгодно', 'Эконом', 790, ARRAY['Вынос через день', 'Пакеты в подарок', 'Поддержка 24/7'], false
      WHERE NOT EXISTS (SELECT 1 FROM tariffs WHERE title = 'Эконом');

      INSERT INTO tariffs (tag, title, price, features, is_popular)
      SELECT 'Популярно', 'Комфорт', 990, ARRAY['Вынос каждый день', 'Пакеты в подарок', 'Приоритетное обслуживание'], true
      WHERE NOT EXISTS (SELECT 1 FROM tariffs WHERE title = 'Комфорт');
    `);

    // 8. Admin setup
    await pool.query(`
      INSERT INTO users (phone, name, role)
      VALUES ('79963058814', 'Admin', 'admin')
      ON CONFLICT (phone) DO UPDATE SET role = 'admin';
    `);

    // 9. Shifts Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shifts (
          id SERIAL PRIMARY KEY,
          worker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          ended_at TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20) DEFAULT 'active',
          earned_amount NUMERIC(10, 2) DEFAULT 0.00
      );
    `);
    console.log("Shifts table verified.");

    // 10. Collection Tasks Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_tasks (
          id SERIAL PRIMARY KEY,
          shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
          client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          jk_id INTEGER REFERENCES residential_complexes(id) ON DELETE CASCADE,
          apartment VARCHAR(20) NOT NULL,
          floor INTEGER NOT NULL,
          entrance VARCHAR(10) NOT NULL,
          intercom TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          problem_type VARCHAR(50),
          photo_url TEXT,
          collected_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Collection tasks table verified.");

    // 11. Seed Clients and Addresses
    console.log("Seeding client data...");
    
    // Client 1
    await pool.query(`
      INSERT INTO users (phone, name, role)
      VALUES ('79992223344', 'Иван Иванов', 'client')
      ON CONFLICT (phone) DO NOTHING;
    `);
    await pool.query(`
      INSERT INTO user_addresses (user_id, jk_id, street, entrance, floor, apartment, intercom)
      SELECT u.id, rc.id, 'Наб. Приволжского затона, 20, к. 1', '1', '12', '101', '1234'
      FROM users u, residential_complexes rc
      WHERE u.phone = '79992223344' AND rc.name = 'ЖК Сердце Каспия'
      ON CONFLICT (user_id) DO NOTHING;
    `);

    // Client 2
    await pool.query(`
      INSERT INTO users (phone, name, role)
      VALUES ('79993334455', 'Мария Смирнова', 'client')
      ON CONFLICT (phone) DO NOTHING;
    `);
    await pool.query(`
      INSERT INTO user_addresses (user_id, jk_id, street, entrance, floor, apartment, intercom)
      SELECT u.id, rc.id, 'Наб. Приволжского затона, 20, к. 1', '1', '10', '85', '1234'
      FROM users u, residential_complexes rc
      WHERE u.phone = '79993334455' AND rc.name = 'ЖК Сердце Каспия'
      ON CONFLICT (user_id) DO NOTHING;
    `);

    // Client 3
    await pool.query(`
      INSERT INTO users (phone, name, role)
      VALUES ('79994445566', 'Дмитрий Кузнецов', 'client')
      ON CONFLICT (phone) DO NOTHING;
    `);
    await pool.query(`
      INSERT INTO user_addresses (user_id, jk_id, street, entrance, floor, apartment, intercom)
      SELECT u.id, rc.id, 'Наб. Приволжского затона, 20, к. 2', '1', '14', '204', '99#99'
      FROM users u, residential_complexes rc
      WHERE u.phone = '79994445566' AND rc.name = 'ЖК Сердце Каспия'
      ON CONFLICT (user_id) DO NOTHING;
    `);

    // Client 4
    await pool.query(`
      INSERT INTO users (phone, name, role)
      VALUES ('79995556677', 'Елена Петрова', 'client')
      ON CONFLICT (phone) DO NOTHING;
    `);
    await pool.query(`
      INSERT INTO user_addresses (user_id, jk_id, street, entrance, floor, apartment, intercom)
      SELECT u.id, rc.id, 'ул. Латышева, 3б', '2', '8', '64', 'К42'
      FROM users u, residential_complexes rc
      WHERE u.phone = '79995556677' AND rc.name = 'ЖК Лазурный'
      ON CONFLICT (user_id) DO NOTHING;
    `);
    console.log("Client data seeding completed successfully.");

    // 12. Worker Profiles Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_profiles (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          pay_type VARCHAR(10) DEFAULT 'task',
          rate NUMERIC(10, 2) DEFAULT 150.00,
          status VARCHAR(20) DEFAULT 'active',
          assigned_jk VARCHAR(255),
          balance NUMERIC(10, 2) DEFAULT 0.00
      );
    `);
    console.log("Worker profiles table verified.");

    // Seed worker profile for the test worker +79991112233
    await pool.query(`
      INSERT INTO worker_profiles (user_id, pay_type, rate, status, assigned_jk, balance)
      SELECT id, 'task', 150.00, 'active', 'ЖК Сердце Каспия', 0.00
      FROM users
      WHERE phone = '79991112233'
      ON CONFLICT (user_id) DO NOTHING;
    `);
    console.log("Worker profile seeded.");

    console.log("SUCCESS: Database is fully fixed and synchronized with code.");
    process.exit(0);
  } catch (err) {
    console.error("FAILURE during DB repair:");
    console.error(err);
    process.exit(1);
  }
}

fix();

