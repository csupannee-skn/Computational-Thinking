// ตัวช่วยเชื่อมต่อฐานข้อมูล Turso (libSQL) ที่ใช้ร่วมกันทุกฟังก์ชัน
import { createClient } from "@libsql/client/web";

let client = null;
let schemaReady = null;

// โครงสร้างตาราง — สร้างอัตโนมัติเมื่อเรียกใช้งานครั้งแรก (ไม่ต้องรัน SQL เอง)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    class_room TEXT,
    student_no TEXT,
    total_score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 0,
    percent REAL NOT NULL DEFAULT 0,
    duration_sec INTEGER NOT NULL DEFAULT 0,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
  )`,
  `CREATE TABLE IF NOT EXISTS stage_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 0,
    correct INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    duration_sec INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    player_name TEXT,
    class_room TEXT,
    q1 INTEGER, q2 INTEGER, q3 INTEGER, q4 INTEGER, q5 INTEGER,
    q6 INTEGER, q7 INTEGER, q8 INTEGER, q9 INTEGER, q10 INTEGER,
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+7 hours'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_class ON game_sessions(class_room)`,
  `CREATE INDEX IF NOT EXISTS idx_stage_session ON stage_results(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_surveys_class ON surveys(class_room)`,
];

export const STAGE_KEYS = ["decomposition", "pattern", "abstraction", "algorithm"];
export const SURVEY_ITEMS = 10;

export function db() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("ยังไม่ได้ตั้งค่า TURSO_DATABASE_URL ใน Netlify");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db()
      .batch(SCHEMA, "write")
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function clean(value, max = 100) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

export function int(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function rowsToObjects(rs) {
  return rs.rows.map((row) =>
    Object.fromEntries(rs.columns.map((col, i) => [col, row[i]]))
  );
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function serverError(err) {
  console.error(err);
  return json({ error: "เซิร์ฟเวอร์มีปัญหา: " + (err?.message || "unknown") }, 500);
}
