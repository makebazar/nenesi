-- SQL script to initialize the database
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'worker', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Address info (optional for now, but good to have based on frontend fields)
CREATE TABLE IF NOT EXISTS residential_complexes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    jk_id INTEGER,
    street TEXT,
    entrance TEXT,
    floor TEXT,
    apartment TEXT,
    intercom TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

ALTER TABLE user_addresses DROP CONSTRAINT IF EXISTS user_addresses_jk_id_fkey;
ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_jk_id_fkey FOREIGN KEY (jk_id) REFERENCES residential_complexes(id) ON DELETE SET NULL;

-- Ensure unique constraint for upsert
DO $$ BEGIN
    ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_user_id_key UNIQUE (user_id);
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- Insert some initial data if not already present
INSERT INTO residential_complexes (name, address, votes, status)
SELECT 'ЖК Сердце Каспия', 'Наб. Приволжского затона, 20', 84, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM residential_complexes WHERE name = 'ЖК Сердце Каспия');

INSERT INTO residential_complexes (name, address, votes, status)
SELECT 'ЖК Лазурный', 'ул. Латышева, 3б', 32, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM residential_complexes WHERE name = 'ЖК Лазурный');

INSERT INTO residential_complexes (name, address, votes, status)
SELECT 'ЖК Прогресс', 'ул. Савушкина, 6', 62, 'connected'
WHERE NOT EXISTS (SELECT 1 FROM residential_complexes WHERE name = 'ЖК Прогресс');

CREATE TABLE IF NOT EXISTS schedule_votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vote_option VARCHAR(10) NOT NULL, -- 'morning' or 'evening'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- Each user can only vote once
);

CREATE TABLE IF NOT EXISTS tariff_votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tariff_name VARCHAR(50) NOT NULL, -- e.g., 'Эконом' or 'Комфорт'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- Each user can only vote once
);
