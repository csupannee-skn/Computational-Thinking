// POST /api/survey — บันทึกแบบประเมินความพึงพอใจ (มาตราส่วน 5 ระดับ 10 ข้อ)
import {
  db, ensureSchema, json, clean, readJson, serverError, SURVEY_ITEMS,
} from "../lib/db.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readJson(req);
  if (!body) return json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, 400);

  const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];
  if (
    answers.length !== SURVEY_ITEMS ||
    !answers.every((v) => Number.isInteger(v) && v >= 1 && v <= 5)
  ) {
    return json({ error: `กรุณาตอบให้ครบทั้ง ${SURVEY_ITEMS} ข้อ` }, 400);
  }

  const id = crypto.randomUUID();
  const cols = answers.map((_, i) => `q${i + 1}`).join(", ");
  const marks = answers.map(() => "?").join(", ");

  try {
    await ensureSchema();
    await db().execute({
      sql: `INSERT INTO surveys (id, session_id, player_name, class_room, ${cols}, comment)
            VALUES (?, ?, ?, ?, ${marks}, ?)`,
      args: [
        id,
        clean(body.session_id, 60) || null,
        clean(body.player_name, 80),
        clean(body.class_room, 30),
        ...answers,
        clean(body.comment, 1000),
      ],
    });
    return json({ ok: true, id });
  } catch (err) {
    return serverError(err);
  }
};

export const config = { path: "/api/survey" };
