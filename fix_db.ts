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

    console.log("SUCCESS: Database is fully fixed and synchronized with code.");
    process.exit(0);
  } catch (err) {
    console.error("FAILURE during DB repair:");
    console.error(err);
    process.exit(1);
  }
}

fix();
