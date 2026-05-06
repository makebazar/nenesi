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

interface AuthRequest extends Request {
  user?: any;
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

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
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

// --- AUTH ---
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone is required" });

  try {
    const result = await pool.query("SELECT * FROM users WHERE phone = $1", [
      phone,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      res.json({ user, token });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Auth error" });
  }
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { phone, name, role, address } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create or get user
    const userRes = await client.query(
      "INSERT INTO users (phone, name, role) VALUES ($1, $2, $3) ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING *",
      [phone, name || "User", role || "client"],
    );
    const user = userRes.rows[0];

    // 2. Create address if provided
    if (address) {
      await client.query(
        `INSERT INTO user_addresses (user_id, jk_id, street, entrance, floor, apartment, intercom)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
            jk_id = EXCLUDED.jk_id, street = EXCLUDED.street,
            entrance = EXCLUDED.entrance, floor = EXCLUDED.floor,
            apartment = EXCLUDED.apartment, intercom = EXCLUDED.intercom`,
        [
          user.id,
          address.jkId || null,
          address.street,
          address.entrance,
          address.floor,
          address.apartment,
          address.intercom,
        ],
      );
    }

    await client.query("COMMIT");
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ user, token });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
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
    } catch (err) {
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
      await pool.query(
        `
      INSERT INTO tariff_votes (user_id, tariff_name)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET tariff_name = EXCLUDED.tariff_name
    `,
        [req.user.id, tariffName],
      );
      res.json({ success: true });
    } catch (err) {
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
      await pool.query(
        `
      INSERT INTO schedule_votes (user_id, vote_option)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET vote_option = EXCLUDED.vote_option
    `,
        [req.user.id, voteOption],
      );
      res.json({ success: true });
    } catch (err) {
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
             ua.street, ua.entrance, ua.floor, ua.apartment, ua.intercom, rc.name as jk_name
      FROM users u
      LEFT JOIN user_addresses ua ON u.id = ua.user_id
      LEFT JOIN residential_complexes rc ON ua.jk_id = rc.id
      ORDER BY u.created_at DESC
    `);
      res.json(result.rows);
    } catch (err) {
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
      ORDER BY (rc.votes + COUNT(ua.user_id)) DESC
    `);
    res.json(result.rows);
  } catch (err) {
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
  } catch (err) {
    console.error("GET /api/tariffs Error:", err);
    res.status(500).json({ error: "DB Error" });
  }
});

app.put(
  "/api/tariffs/:id",
  authenticateToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { tag, title, price, features, is_popular } = req.body;
    try {
      const result = await pool.query(
        "UPDATE tariffs SET tag = $1, title = $2, price = $3, features = $4, is_popular = $5 WHERE id = $6 RETURNING *",
        [tag, title, price, features, is_popular, id],
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("PUT /api/tariffs/:id Error:", err);
      res.status(500).json({ error: "DB Error" });
    }
  },
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
  } catch (err) {
    console.error("Database connection failed on startup:", err);
  }

  try {
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      console.log("Files in dist directory:", files);
    } else {
      console.error("dist directory NOT FOUND at:", distPath);
    }
  } catch (err) {
    console.error("Error reading dist directory:", err);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT} (0.0.0.0)`);
  });
};

start();
