// GET /api/stats — ข้อมูลสถิติสำหรับหน้าครู (ต้องส่งรหัส ADMIN_KEY ใน header x-admin-key)
import { createHash, timingSafeEqual } from "node:crypto";
import { db, ensureSchema, json, clean, rowsToObjects, serverError } from "../lib/db.mjs";

const hash = (s) => createHash("sha256").update(String(s)).digest();

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return json({ error: "ยังไม่ได้ตั้งค่า ADMIN_KEY ใน Netlify" }, 500);
  const given = req.headers.get("x-admin-key") || "";
  if (!timingSafeEqual(hash(given), hash(adminKey))) {
    return json({ error: "รหัสผ่านไม่ถูกต้อง" }, 401);
  }

  const room = clean(new URL(req.url).searchParams.get("class"), 30);
  const where = room ? "WHERE g.class_room = ?" : "";
  const args = room ? [room] : [];

  try {
    await ensureSchema();
    const c = db();
    const [sessions, stages, surveys, classes] = await c.batch(
      [
        { sql: `SELECT g.* FROM game_sessions g ${where} ORDER BY g.created_at DESC LIMIT 3000`, args },
        {
          sql: `SELECT s.session_id, s.stage, s.score, s.max_score, s.correct, s.total, s.attempts, s.duration_sec
                FROM stage_results s JOIN game_sessions g ON g.id = s.session_id ${where}`,
          args,
        },
        {
          sql: `SELECT * FROM surveys ${room ? "WHERE class_room = ?" : ""} ORDER BY created_at DESC LIMIT 3000`,
          args,
        },
        {
          sql: `SELECT class_room FROM game_sessions WHERE class_room <> ''
                UNION SELECT class_room FROM surveys WHERE class_room <> '' ORDER BY 1`,
          args: [],
        },
      ],
      "read"
    );

    return json({
      ok: true,
      filter: room || null,
      classes: rowsToObjects(classes).map((r) => r.class_room),
      sessions: rowsToObjects(sessions),
      stages: rowsToObjects(stages),
      surveys: rowsToObjects(surveys),
    });
  } catch (err) {
    return serverError(err);
  }
};

export const config = { path: "/api/stats" };
