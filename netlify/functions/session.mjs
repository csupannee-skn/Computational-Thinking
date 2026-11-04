// POST /api/session — บันทึกผลการเล่นเกม 1 รอบ พร้อมคะแนนรายด่าน
import {
  db, ensureSchema, json, clean, int, readJson, serverError, STAGE_KEYS,
} from "../lib/db.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readJson(req);
  if (!body) return json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, 400);

  const name = clean(body.player_name, 80);
  if (!name) return json({ error: "กรุณาระบุชื่อผู้เล่น" }, 400);

  const stages = (Array.isArray(body.stages) ? body.stages : [])
    .filter((s) => STAGE_KEYS.includes(s?.stage))
    .slice(0, STAGE_KEYS.length)
    .map((s) => ({
      stage: s.stage,
      score: int(s.score, 0, 1000),
      max_score: int(s.max_score, 0, 1000),
      correct: int(s.correct, 0, 100),
      total: int(s.total, 0, 100),
      attempts: int(s.attempts, 0, 1000),
      duration_sec: int(s.duration_sec, 0, 86400),
    }));

  const total = stages.reduce((a, s) => a + s.score, 0);
  const max = stages.reduce((a, s) => a + s.max_score, 0);
  const percent = max ? Math.round((total / max) * 10000) / 100 : 0;
  const id = crypto.randomUUID();

  try {
    await ensureSchema();
    await db().batch(
      [
        {
          sql: `INSERT INTO game_sessions
                (id, player_name, class_room, student_no, total_score, max_score, percent, duration_sec, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id, name, clean(body.class_room, 30), clean(body.student_no, 10),
            total, max, percent, int(body.duration_sec, 0, 86400),
            clean(req.headers.get("user-agent"), 200),
          ],
        },
        ...stages.map((s) => ({
          sql: `INSERT INTO stage_results
                (session_id, stage, score, max_score, correct, total, attempts, duration_sec)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, s.stage, s.score, s.max_score, s.correct, s.total, s.attempts, s.duration_sec],
        })),
      ],
      "write"
    );
    return json({ ok: true, id, total_score: total, max_score: max, percent });
  } catch (err) {
    return serverError(err);
  }
};

export const config = { path: "/api/session" };
