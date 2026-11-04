// GET /api/health — ตรวจว่าเชื่อมต่อ Turso ได้หรือไม่ (เปิดในเบราว์เซอร์เพื่อทดสอบหลัง deploy)
import { db, ensureSchema, json, serverError } from "../lib/db.mjs";

export default async () => {
  try {
    await ensureSchema();
    const rs = await db().execute("SELECT COUNT(*) AS n FROM game_sessions");
    return json({ ok: true, database: "connected", sessions: Number(rs.rows[0][0]) });
  } catch (err) {
    return serverError(err);
  }
};

export const config = { path: "/api/health" };
