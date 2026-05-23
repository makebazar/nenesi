import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import pool from "./db.js";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

app.use(cors());
app.use(express.json());

// --- LOGGING ---
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- HEALTH CHECK ---
app.get("/health", (_req, res) => {
  res.send("OK");
});

interface UserPayload {
  id: number;
  role: "client" | "worker" | "admin";
}

interface AuthRequest extends Request {
  user?: UserPayload;
}

// --- MIDDLEWARE ---
const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: unknown, user: unknown) => {
    if (err) return res.sendStatus(403);
    req.user = user as UserPayload;
    next();
  });
};

const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

// --- UTILS ---
const normalizePhone = (phone: string) => {
  return phone.replace(/\D/g, "");
};

// --- AUTH ---
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone is required" });
  const cleanPhone = normalizePhone(phone);

  try {
    const result = await pool.query("SELECT * FROM users WHERE phone = $1", [
      cleanPhone,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      res.json({ user, token });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (_err) {
    console.error("Login error:", _err);
    res.status(500).json({ error: "Auth error" });
  }
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { phone, name, role, address, qrCode } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone is required" });
  const cleanPhone = normalizePhone(phone);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 0. Resolve QR ID if qrCode is provided
    let qrId = null;
    if (qrCode) {
      const qrResult = await client.query("SELECT id FROM qr_codes WHERE code = $1", [qrCode]);
      if (qrResult.rows.length > 0) {
        qrId = qrResult.rows[0].id;
      }
    }

    // 1. Create or get user
    const userRes = await client.query(
      "INSERT INTO users (phone, name, role, qr_id) VALUES ($1, $2, $3, $4) ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, qr_id = COALESCE(users.qr_id, EXCLUDED.qr_id) RETURNING *",
      [cleanPhone, name || "User", role || "client", qrId],
    );
    const user = userRes.rows[0];

    // 2. Create address if provided
    if (address) {
      await client.query(
        `INSERT INTO user_addresses (user_id, jk_id, street, entrance, floor, apartment, intercom)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
            jk_id = EXCLUDED.jk_id,
            street = EXCLUDED.street,
            entrance = EXCLUDED.entrance,
            floor = EXCLUDED.floor,
            apartment = EXCLUDED.apartment,
            intercom = EXCLUDED.intercom`,
        [
          user.id,
          address.jkId,
          address.street,
          address.entrance,
          address.floor,
          address.apartment,
          address.intercom,
        ],
      );

      // Increment total votes for the JK on new registration
      await client.query(
        "UPDATE residential_complexes SET votes = votes + 1 WHERE id = $1",
        [address.jkId],
      );
    }
    await client.query("COMMIT");
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ user, token });
  } catch (_err) {
    await client.query("ROLLBACK");
    console.error("Registration error full details:", _err);
    res.status(500).json({
      error: "Registration failed",
      details: _err instanceof Error ? _err.message : String(_err),
    });
  } finally {
    client.release();
  }
});

// --- CLIENT PROFILE & VOTES ---
app.get(
  "/api/users/me",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const result = await pool.query(
        `
      SELECT u.*, ua.*, rc.name as jk_name,
             sv.vote_option as schedule_vote, tv.tariff_name as tariff_vote
      FROM users u
      LEFT JOIN user_addresses ua ON u.id = ua.user_id
      LEFT JOIN residential_complexes rc ON ua.jk_id = rc.id
      LEFT JOIN schedule_votes sv ON u.id = sv.user_id
      LEFT JOIN tariff_votes tv ON u.id = tv.user_id
      WHERE u.id = $1
    `,
        [req.user.id],
      );
      res.json(result.rows[0]);
    } catch {
      res.status(500).json({ error: "Internal error" });
    }
  },
);

app.post(
  "/api/tariff/vote",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const { tariffName } = req.body;
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await pool.query(
        `
      INSERT INTO tariff_votes (user_id, tariff_name)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET tariff_name = EXCLUDED.tariff_name
    `,
        [req.user.id, tariffName],
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "DB Error" });
    }
  },
);

app.post(
  "/api/schedule/vote",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const { voteOption } = req.body;
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await pool.query(
        `
      INSERT INTO schedule_votes (user_id, vote_option)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET vote_option = EXCLUDED.vote_option
    `,
        [req.user.id, voteOption],
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "DB Error" });
    }
  },
);

// --- ADMIN API ---

// All users for Admin
app.get(
  "/api/users",
  authenticateToken,
  isAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT u.id, u.phone, u.name, u.role, u.created_at,
             ua.street, ua.entrance, ua.floor, ua.apartment, ua.intercom, rc.name as jk_name,
             sv.vote_option as schedule_vote, tv.tariff_name as tariff_vote,
             q.name as qr_source
      FROM users u
      LEFT JOIN user_addresses ua ON u.id = ua.user_id
      LEFT JOIN residential_complexes rc ON ua.jk_id = rc.id
      LEFT JOIN schedule_votes sv ON u.id = sv.user_id
      LEFT JOIN tariff_votes tv ON u.id = tv.user_id
      LEFT JOIN qr_codes q ON u.qr_id = q.id
      ORDER BY u.created_at DESC
    `);
      res.json(result.rows);
    } catch {
      res.status(500).json({ error: "DB Error" });
    }
  },
);

app.delete(
  "/api/users/:id",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "DB Error" });
    }
  },
);

// Residential Complexes (JK)
app.get("/api/jk", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT rc.*, rc.votes as fake_votes, COUNT(ua.user_id) as real_votes
      FROM residential_complexes rc
      LEFT JOIN user_addresses ua ON rc.id = ua.jk_id
      GROUP BY rc.id
      ORDER BY real_votes DESC
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "DB Error" });
  }
});

app.post("/api/jk/:id/vote", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE residential_complexes SET votes = votes + 1 WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "JK not found" });
    }
    res.json(result.rows[0]);
  } catch (_err) {
    console.error("JK vote error:", _err);
    res.status(500).json({ error: "DB Error" });
  }
});

app.post(
  "/api/jk",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { name, address, votes, status } = req.body;
    const result = await pool.query(
      "INSERT INTO residential_complexes (name, address, votes, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, address, votes || 0, status || "pending"],
    );
    res.status(201).json(result.rows[0]);
  },
);

app.put(
  "/api/jk/:id",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, address, votes, status } = req.body;
    const result = await pool.query(
      "UPDATE residential_complexes SET name = $1, address = $2, votes = $3, status = $4 WHERE id = $5 RETURNING *",
      [name, address, votes, status, id],
    );
    res.json(result.rows[0]);
  },
);

app.delete(
  "/api/jk/:id",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    await pool.query("DELETE FROM residential_complexes WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  },
);

// Vote stats for Admin
app.get(
  "/api/tariff/votes",
  authenticateToken,
  isAdmin,
  async (_req: AuthRequest, res: Response) => {
    const result = await pool.query(
      "SELECT tariff_name, COUNT(*) as count FROM tariff_votes GROUP BY tariff_name",
    );
    res.json(result.rows);
  },
);

app.get(
  "/api/schedule/votes",
  authenticateToken,
  isAdmin,
  async (_req: AuthRequest, res: Response) => {
    const result = await pool.query(
      "SELECT vote_option, COUNT(*) as count FROM schedule_votes GROUP BY vote_option",
    );
    res.json(result.rows);
  },
);

// --- TARIFFS ---
app.get("/api/tariffs", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM tariffs ORDER BY id");
    res.json(result.rows);
  } catch (_err) {
    console.error("GET /api/tariffs Error:", _err);
    res.status(500).json({ error: "DB Error" });
  }
});

app.put(
  "/api/tariffs/:id",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { tag, subtitle, title, price, features, is_popular } = req.body;
    try {
      const result = await pool.query(
        "UPDATE tariffs SET tag = $1, subtitle = $2, title = $3, price = $4, features = $5, is_popular = $6 WHERE id = $7 RETURNING *",
        [tag, subtitle, title, price, features, is_popular, id],
      );
      res.json(result.rows[0]);
    } catch (_err) {
      console.error("PUT /api/tariffs/:id Error:", _err);
      res.status(500).json({ error: "DB Error" });
    }
  },
);

app.delete(
  "/api/tariffs/:id",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      await pool.query("DELETE FROM tariffs WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (_err) {
      console.error("DELETE /api/tariffs/:id Error:", _err);
      res.status(500).json({ error: "DB Error" });
    }
  },
);

// --- QR CODE TRACKING & MANAGEMENT ---

// GET /qr/:code -> Redirect that increments scan count and sets query param
app.get("/qr/:code", async (req: Request, res: Response) => {
  const code = req.params.code as string;
  try {
    const result = await pool.query(
      "UPDATE qr_codes SET scans_count = scans_count + 1 WHERE code = $1 RETURNING *",
      [code]
    );
    if (result.rows.length > 0) {
      res.redirect(`/?qr=${encodeURIComponent(code)}`);
    } else {
      res.redirect("/");
    }
  } catch (err) {
    console.error("QR Code redirect error:", err);
    res.redirect("/");
  }
});

// GET /api/qr/info/:code -> Fetch public info for pre-filling registration
app.get("/api/qr/info/:code", async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      `SELECT q.*, rc.name as jk_name, rc.address as jk_address
       FROM qr_codes q
       LEFT JOIN residential_complexes rc ON q.jk_id = rc.id
       WHERE q.code = $1`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "QR not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching QR info:", err);
    res.status(500).json({ error: "DB Error" });
  }
});

// GET /api/qr -> List all QR codes with registration counts (Admin only)
app.get(
  "/api/qr",
  authenticateToken,
  isAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT q.*, rc.name as jk_name, COUNT(u.id)::int as registrations_count
         FROM qr_codes q
         LEFT JOIN residential_complexes rc ON q.jk_id = rc.id
         LEFT JOIN users u ON q.id = u.qr_id
         GROUP BY q.id, rc.name
         ORDER BY q.created_at DESC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching QR list:", err);
      res.status(500).json({ error: "DB Error" });
    }
  }
);

// POST /api/qr -> Create a new QR code (Admin only)
app.post(
  "/api/qr",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { name, code, jkId } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    // Generate code if not provided
    let finalCode = code?.trim();
    if (!finalCode) {
      finalCode = Math.random().toString(36).substring(2, 10);
    } else {
      // Normalize code (alphanumeric and underscores/hyphens only)
      finalCode = finalCode.replace(/[^a-zA-Z0-9_-]/g, "");
    }

    try {
      const result = await pool.query(
        `INSERT INTO qr_codes (name, code, jk_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, finalCode, jkId || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating QR code:", err);
      res.status(500).json({ error: "DB Error (code might already exist)" });
    }
  }
);

// DELETE /api/qr/:id -> Delete a QR code (Admin only)
app.delete(
  "/api/qr/:id",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM qr_codes WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting QR code:", err);
      res.status(500).json({ error: "DB Error" });
    }
  }
);

// --- ADMIN WORKERS MANAGEMENT ---

// GET /api/admin/workers -> Get all workers and their profiles (Admin only)
app.get(
  "/api/admin/workers",
  authenticateToken,
  isAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.phone, u.name, u.role, u.created_at,
               coalesce(wp.pay_type, 'task') as pay_type,
               coalesce(wp.rate, 150.00)::float as rate,
               coalesce(wp.status, 'active') as status,
               coalesce(wp.assigned_jk, '') as assigned_jk,
               coalesce(wp.balance, 0.00)::float as balance
        FROM users u
        LEFT JOIN worker_profiles wp ON u.id = wp.user_id
        WHERE u.role = 'worker'
        ORDER BY u.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching workers:", err);
      res.status(500).json({ error: "DB Error" });
    }
  }
);

// POST /api/admin/workers -> Create a new worker and profile (Admin only)
app.post(
  "/api/admin/workers",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { phone, name, payType, rate, status, assignedJK } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone is required" });
    const cleanPhone = normalizePhone(phone);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert or update user as worker
      const userRes = await client.query(
        `INSERT INTO users (phone, name, role) 
         VALUES ($1, $2, 'worker') 
         ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, role = 'worker' 
         RETURNING *`,
        [cleanPhone, name || "Воркер"]
      );
      const user = userRes.rows[0];

      // Insert or update worker profile
      const profileRes = await client.query(
        `INSERT INTO worker_profiles (user_id, pay_type, rate, status, assigned_jk, balance)
         VALUES ($1, $2, $3, $4, $5, 0.00)
         ON CONFLICT (user_id) DO UPDATE SET 
            pay_type = EXCLUDED.pay_type,
            rate = EXCLUDED.rate,
            status = EXCLUDED.status,
            assigned_jk = EXCLUDED.assigned_jk
         RETURNING *`,
        [user.id, payType || "task", rate || 150.00, status || "active", assignedJK || ""]
      );

      await client.query("COMMIT");
      res.status(201).json({
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        pay_type: profileRes.rows[0].pay_type,
        rate: Number(profileRes.rows[0].rate),
        status: profileRes.rows[0].status,
        assigned_jk: profileRes.rows[0].assigned_jk,
        balance: Number(profileRes.rows[0].balance),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error creating worker:", err);
      res.status(500).json({ error: "Failed to create worker" });
    } finally {
      client.release();
    }
  }
);

// PUT /api/admin/workers/:id -> Update worker and profile (Admin only)
app.put(
  "/api/admin/workers/:id",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, phone, payType, rate, status, assignedJK } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone is required" });
    const cleanPhone = normalizePhone(phone);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update user details
      await client.query(
        "UPDATE users SET name = $1, phone = $2 WHERE id = $3",
        [name, cleanPhone, id]
      );

      // Update or insert worker profile
      await client.query(
        `INSERT INTO worker_profiles (user_id, pay_type, rate, status, assigned_jk)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET 
            pay_type = EXCLUDED.pay_type,
            rate = EXCLUDED.rate,
            status = EXCLUDED.status,
            assigned_jk = EXCLUDED.assigned_jk`,
        [id, payType || "task", rate || 150.00, status || "active", assignedJK || ""]
      );

      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error updating worker:", err);
      res.status(500).json({ error: "Failed to update worker" });
    } finally {
      client.release();
    }
  }
);

// POST /api/admin/workers/:id/payout -> Clear worker unpaid balance (Admin only)
app.post(
  "/api/admin/workers/:id/payout",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      await pool.query(
        "UPDATE worker_profiles SET balance = 0.00 WHERE user_id = $1",
        [id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error conducting payout:", err);
      res.status(500).json({ error: "DB Error" });
    }
  }
);

// GET /api/admin/workers/:id/shifts -> Get worker shift history (Admin only)
app.get(
  "/api/admin/workers/:id/shifts",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT s.*, 
                COUNT(ct.id)::int as total_tasks,
                COUNT(CASE WHEN ct.status = 'collected' THEN 1 END)::int as collected_tasks,
                COUNT(CASE WHEN ct.status = 'failed' THEN 1 END)::int as failed_tasks
         FROM shifts s
         LEFT JOIN collection_tasks ct ON s.id = ct.shift_id
         WHERE s.worker_id = $1
         GROUP BY s.id
         ORDER BY s.started_at DESC`,
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching worker shift history:", err);
      res.status(500).json({ error: "DB Error" });
    }
  }
);

// --- WORKER API ---

// Helper middleware for worker role check
const isWorker = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === "worker" || req.user.role === "admin")) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Workers only." });
  }
};

// GET /api/worker/shift/active -> Get active shift and tasks
app.get(
  "/api/worker/shift/active",
  authenticateToken,
  isWorker,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const shiftRes = await pool.query(
        "SELECT * FROM shifts WHERE worker_id = $1 AND status = 'active'",
        [req.user.id]
      );

      if (shiftRes.rows.length === 0) {
        return res.json({ active: false });
      }

      const shift = shiftRes.rows[0];
      const tasksRes = await pool.query(
        `SELECT ct.*, rc.name as jk_name, rc.address as jk_address
         FROM collection_tasks ct
         JOIN residential_complexes rc ON ct.jk_id = rc.id
         WHERE ct.shift_id = $1
         ORDER BY ct.floor DESC, ct.apartment ASC`,
        [shift.id]
      );

      res.json({ active: true, shift, tasks: tasksRes.rows });
    } catch (err) {
      console.error("Error fetching active shift:", err);
      res.status(500).json({ error: "DB Error" });
    }
  }
);

// POST /api/worker/shift/start -> Start shift and auto-generate tasks
app.post(
  "/api/worker/shift/start",
  authenticateToken,
  isWorker,
  async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await client.query("BEGIN");

      // Check if there is already an active shift
      const activeCheck = await client.query(
        "SELECT id FROM shifts WHERE worker_id = $1 AND status = 'active'",
        [req.user.id]
      );

      if (activeCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Shift already active" });
      }

      // Create new shift
      const shiftRes = await client.query(
        "INSERT INTO shifts (worker_id, status) VALUES ($1, 'active') RETURNING *",
        [req.user.id]
      );
      const shift = shiftRes.rows[0];

      // Auto-generate tasks from registered clients with addresses, taking into account their active tariff:
      // - 'Комфорт' (Вынос каждый день) -> всегда на вынос.
      // - 'Эконом' (Вынос через день) -> чередуется в зависимости от четности текущего дня месяца и ID пользователя.
      // - Если тариф не выбран -> по умолчанию считаем как 'Комфорт' (всегда на вынос).
      const currentDay = new Date().getDate();
      const isOddDay = (currentDay % 2 !== 0);

      await client.query(
        `INSERT INTO collection_tasks (shift_id, client_id, jk_id, apartment, floor, entrance, intercom, status)
         SELECT $1, ua.user_id, ua.jk_id, ua.apartment, 
                CAST(coalesce(nullif(regexp_replace(ua.floor, '\\D', '', 'g'), ''), '1') AS INTEGER), 
                ua.entrance, ua.intercom, 'pending'
         FROM user_addresses ua
         JOIN users u ON ua.user_id = u.id
         LEFT JOIN tariff_votes tv ON u.id = tv.user_id
         WHERE u.role = 'client' 
           AND ua.jk_id IS NOT NULL
           AND (
             coalesce(tv.tariff_name, 'Комфорт') != 'Эконом'
             OR (
               ($2 = true AND (u.id % 2 != 0))
               OR ($2 = false AND (u.id % 2 = 0))
             )
           )`,
        [shift.id, isOddDay]
      );


      await client.query("COMMIT");

      // Fetch the generated tasks
      const tasksRes = await pool.query(
        `SELECT ct.*, rc.name as jk_name, rc.address as jk_address
         FROM collection_tasks ct
         JOIN residential_complexes rc ON ct.jk_id = rc.id
         WHERE ct.shift_id = $1
         ORDER BY ct.floor DESC, ct.apartment ASC`,
        [shift.id]
      );

      res.status(201).json({ active: true, shift, tasks: tasksRes.rows });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error starting shift:", err);
      res.status(500).json({ error: "DB Error starting shift" });
    } finally {
      client.release();
    }
  }
);

// POST /api/worker/shift/end -> End active shift
app.post(
  "/api/worker/shift/end",
  authenticateToken,
  isWorker,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const activeCheck = await pool.query(
        "SELECT id FROM shifts WHERE worker_id = $1 AND status = 'active'",
        [req.user.id]
      );

      if (activeCheck.rows.length === 0) {
        return res.status(400).json({ error: "No active shift found" });
      }

      const shiftId = activeCheck.rows[0].id;

      // Count completed tasks to calculate pay
      const completedRes = await pool.query(
        "SELECT COUNT(*)::int as count FROM collection_tasks WHERE shift_id = $1 AND status = 'collected'",
        [shiftId]
      );
      const completedCount = completedRes.rows[0].count;
      const earned = completedCount * 150.00; // 150 RUB per collection

      // Complete shift
      const updatedShift = await pool.query(
        "UPDATE shifts SET status = 'completed', ended_at = NOW(), earned_amount = $1 WHERE id = $2 RETURNING *",
        [earned, shiftId]
      );

      // Increment worker balance in worker_profiles
      await pool.query(
        `INSERT INTO worker_profiles (user_id, balance) 
         VALUES ($1, $2) 
         ON CONFLICT (user_id) DO UPDATE SET balance = worker_profiles.balance + $2`,
        [req.user.id, earned]
      );

      res.json({ success: true, shift: updatedShift.rows[0] });
    } catch (err) {
      console.error("Error ending shift:", err);
      res.status(500).json({ error: "DB Error ending shift" });
    }
  }
);

// POST /api/worker/tasks/:id/collect -> Mark task as collected
app.post(
  "/api/worker/tasks/:id/collect",
  authenticateToken,
  isWorker,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { photoUrl } = req.body;
    try {
      await pool.query(
        "UPDATE collection_tasks SET status = 'collected', photo_url = $1, collected_at = NOW() WHERE id = $2",
        [photoUrl || "captured_img", id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error collecting task:", err);
      res.status(500).json({ error: "DB Error" });
    }
  }
);

// POST /api/worker/tasks/:id/problem -> Mark task as problem
app.post(
  "/api/worker/tasks/:id/problem",
  authenticateToken,
  isWorker,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { problemType, photoUrl } = req.body;
    try {
      await pool.query(
        "UPDATE collection_tasks SET status = 'failed', problem_type = $1, photo_url = $2, collected_at = NOW() WHERE id = $3",
        [problemType || "Пакет не найден", photoUrl || "captured_img", id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error reporting task problem:", err);
      res.status(500).json({ error: "DB Error" });
    }
  }
);

// --- SERVING FRONTEND ---
const distPath = path.join(process.cwd(), "dist");
console.log("Serving frontend from:", distPath);
app.use(express.static(distPath));

app.use((req: Request, res: Response) => {
  if (req.url.startsWith("/api")) {
    res.status(404).json({ error: "API route not found" });
  } else {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res
        .status(404)
        .send(
          `index.html not found at ${indexPath}. Working directory: ${process.cwd()}`,
        );
    }
  }
});

// --- STARTUP ---
const start = async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Database connection successful:", res.rows[0]);
  } catch (_err) {
    console.error("Database connection failed on startup:", _err);
  }

  try {
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      console.log("Files in dist directory:", files);
    } else {
      console.error("dist directory NOT FOUND at:", distPath);
    }
  } catch (_err) {
    console.error("Error reading dist directory:", _err);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT} (0.0.0.0)`);
  });
};

start();
