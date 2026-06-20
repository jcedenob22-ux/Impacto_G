import "dotenv/config";
import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { Pool } = pkg;
const app = express();
const JWT_SEC = process.env.JWT_SECRET || "impactog_secret_change_in_prod";

app.use(cors());
app.use(express.json());

// ===== DB =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        puntos INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS simulaciones (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        usuario TEXT NOT NULL DEFAULT '',
        objeto TEXT,
        planeta TEXT,
        altura REAL,
        k_aire REAL,
        tiempo TEXT,
        v_final REAL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS puntos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mision_id TEXT,
        puntaje INTEGER DEFAULT 0,
        estrellas INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("DB tables ready");
  } finally {
    client.release();
  }
}

// ===== Auth helpers =====
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SEC, { expiresIn: "7d" });
}
function signRefresh(user) {
  return jwt.sign({ id: user.id, email: user.email, type: "refresh" }, JWT_SEC, { expiresIn: "30d" });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ msg: "No token" });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SEC);
    if (req.user.type === "refresh") return res.status(401).json({ msg: "Use refresh token endpoint" });
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid token" });
  }
}

// ===== Auth routes =====
app.post("/api/auth/v1/token", async (req, res) => {
  try {
    const { grant_type } = req.query;
    if (grant_type === "password") {
      const { email, password } = req.body;
      const r = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
      if (!r.rows.length) return res.status(400).json({ msg: "Credenciales inválidas" });
      const user = r.rows[0];
      if (!(await bcrypt.compare(password, user.password_hash)))
        return res.status(400).json({ msg: "Credenciales inválidas" });
      const token = signToken(user);
      const refresh = signRefresh(user);
      return res.json({
        access_token: token,
        refresh_token: refresh,
        user: { id: user.id, email: user.email },
      });
    }
    if (grant_type === "refresh_token") {
      const { refresh_token } = req.body;
      try {
        const payload = jwt.verify(refresh_token, JWT_SEC);
        const r = await pool.query("SELECT * FROM users WHERE id=$1", [payload.id]);
        if (!r.rows.length) return res.status(400).json({ msg: "Invalid refresh" });
        const user = r.rows[0];
        const token = signToken(user);
        const refresh = signRefresh(user);
        return res.json({
          access_token: token,
          refresh_token: refresh,
          user: { id: user.id, email: user.email },
        });
      } catch {
        return res.status(400).json({ msg: "Invalid refresh token" });
      }
    }
    return res.status(400).json({ msg: "Unsupported grant_type" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.post("/api/auth/v1/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const exist = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exist.rows.length) return res.status(400).json({ msg: "Email ya registrado" });
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, hash]
    );
    const user = r.rows[0];
    const token = signToken(user);
    const refresh = signRefresh(user);
    return res.json({
      access_token: token,
      refresh_token: refresh,
      user: { id: user.id, email: user.email },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.post("/api/auth/v1/logout", (_req, res) => {
  res.json({});
});

// ===== Profiles routes =====
app.get("/api/rest/v1/profiles", authMiddleware, async (req, res) => {
  try {
    const { id, select, order, limit: qLimit } = req.query;
    if (id) {
      const userId = id.replace("eq.", "");
      const r = await pool.query("SELECT id, email, username, puntos, created_at FROM users WHERE id=$1", [userId]);
      return res.json(r.rows.length ? [r.rows[0]] : []);
    }
    if (order) {
      const col = order.split(".")[0];
      const dir = order.split(".")[1] === "asc" ? "ASC" : "DESC";
      const lim = parseInt(qLimit) || 20;
      const r = await pool.query(
        `SELECT ${select || "id, email, username, puntos, created_at"} FROM users ORDER BY ${col} ${dir} LIMIT $1`,
        [lim]
      );
      return res.json(r.rows);
    }
    const r = await pool.query("SELECT id, email, username, puntos, created_at FROM users");
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.post("/api/rest/v1/profiles", authMiddleware, async (req, res) => {
  try {
    const { id, username } = req.body;
    let r;
    if (id) {
      r = await pool.query("UPDATE users SET username=$1 WHERE id=$2 RETURNING id, email, username, puntos", [username, id]);
    } else {
      r = await pool.query("UPDATE users SET username=$1 WHERE id=$2 RETURNING id, email, username, puntos", [username, req.user.id]);
    }
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.patch("/api/rest/v1/profiles", authMiddleware, async (req, res) => {
  try {
    const { id } = req.query;
    const userId = id?.replace("eq.", "") || req.user.id;
    const sets = [];
    const vals = [];
    let i = 1;
    for (const [k, v] of Object.entries(req.body)) {
      sets.push(`${k}=$${i++}`);
      vals.push(v);
    }
    vals.push(userId);
    const r = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id=$${i} RETURNING id, email, username, puntos`,
      vals
    );
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== Simulaciones routes =====
app.post("/api/rest/v1/simulaciones", authMiddleware, async (req, res) => {
  try {
    const { usuario, objeto, planeta, altura, k_aire, tiempo, v_final, user_id } = req.body;
    const r = await pool.query(
      `INSERT INTO simulaciones (user_id, usuario, objeto, planeta, altura, k_aire, tiempo, v_final)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user_id || req.user.id, usuario || "", objeto || "", planeta || "", altura || 0, k_aire || 0, tiempo || "", v_final || 0]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.get("/api/rest/v1/simulaciones", authMiddleware, async (req, res) => {
  try {
    const { user_id, order, limit: qLimit } = req.query;
    const uid = user_id?.replace("eq.", "") || req.user.id;
    const col = order?.split(".")[0] || "id";
    const dir = order?.split(".")[1] === "asc" ? "ASC" : "DESC";
    const lim = parseInt(qLimit) || 60;
    const r = await pool.query(
      `SELECT s.*, u.username as usuario FROM simulaciones s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.user_id=$1 ORDER BY s.${col} ${dir} LIMIT $2`,
      [uid, lim]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.delete("/api/rest/v1/simulaciones", authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.query;
    const uid = user_id?.replace("eq.", "") || req.user.id;
    await pool.query("DELETE FROM simulaciones WHERE user_id=$1", [uid]);
    res.json({});
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===== Puntos routes =====
app.post("/api/rest/v1/puntos", authMiddleware, async (req, res) => {
  try {
    const { user_id, mision_id, puntaje, estrellas } = req.body;
    const r = await pool.query(
      `INSERT INTO puntos (user_id, mision_id, puntaje, estrellas)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id || req.user.id, mision_id, puntaje, estrellas]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

app.get("/api/rest/v1/puntos", authMiddleware, async (req, res) => {
  try {
    const { user_id, select } = req.query;
    const uid = user_id?.replace("eq.", "") || req.user.id;
    const cols = select || "*";
    const r = await pool.query(
      `SELECT ${cols} FROM puntos WHERE user_id=$1`,
      [uid]
    );
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Server error" });
  }
});

export default app;
