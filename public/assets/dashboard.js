// แดชบอร์ดครู: สถิติการเล่น + ผลประเมินความพึงพอใจ (ค่าเฉลี่ย / S.D. / การแปลผล)
(function () {
  const D = window.CT_DATA;
  const { esc } = CT;
  const KEY = "ct_admin_key";
  const $ = (id) => document.getElementById(id);
  const charts = {};
  let data = null;

  const SURVEY_ITEMS = D.survey.flatMap((g) => g.items.map((text) => ({ group: g.group, text })));

  // ---------- คณิตศาสตร์พื้นฐาน ----------
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const sd = (a) => {
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); // S.D. แบบกลุ่มตัวอย่าง (n-1)
  };
  const level = (m) => (m >= 4.51 ? "มากที่สุด" : m >= 3.51 ? "มาก" : m >= 2.51 ? "ปานกลาง" : m >= 1.51 ? "น้อย" : m > 0 ? "น้อยที่สุด" : "–");
  const f2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : "–");
  const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : "–");
  const fmtSec = (s) => { s = Math.round(s || 0); const m = Math.floor(s / 60); return m ? `${m} น. ${s % 60} วิ.` : `${s} วิ.`; };

  // ---------- เข้าสู่ระบบ ----------
  async function load(key) {
    const room = $("classFilter").value;
    const qs = room ? `?class=${encodeURIComponent(room)}` : "";
    return CT.request(`/api/stats${qs}`, { headers: { "x-admin-key": key } });
  }

  async function login(key) {
    $("loginErr").classList.add("hidden");
    try {
      data = await load(key);
      CT.store.set(KEY, key, sessionStorage);
      $("loginView").classList.add("hidden");
      $("dashView").classList.remove("hidden");
      $("logout").classList.remove("hidden");
      render();
    } catch (err) {
      CT.store.remove(KEY, sessionStorage);
      $("loginView").classList.remove("hidden");
      $("loginErr").textContent = err.message;
      $("loginErr").classList.remove("hidden");
    }
  }

  $("loginForm").addEventListener("submit", (e) => { e.preventDefault(); login($("key").value); });
  $("logout").onclick = () => { CT.store.remove(KEY, sessionStorage); location.reload(); };
  $("refresh").onclick = () => login(CT.store.get(KEY, sessionStorage));
  $("classFilter").onchange = () => login(CT.store.get(KEY, sessionStorage));

  const saved = CT.store.get(KEY, sessionStorage);
  if (saved) login(saved);

  // ---------- แสดงผล ----------
  function render() {
    const { sessions, stages, surveys, classes } = data;

    // ตัวกรองห้อง
    const sel = $("classFilter");
    const cur = data.filter || "";
    sel.innerHTML = `<option value="">ทุกห้อง</option>` + classes.map((c) => `<option ${c === cur ? "selected" : ""}>${esc(c)}</option>`).join("");
    $("updated").textContent = `อัปเดตล่าสุด ${new Date().toLocaleString("th-TH")}${cur ? " · กรองเฉพาะห้อง " + cur : ""}`;

    // KPI
    const pcts = sessions.map((s) => Number(s.percent));
    const players = new Set(sessions.map((s) => `${s.player_name}|${s.class_room}`)).size;
    const allAns = surveys.flatMap((s) => SURVEY_ITEMS.map((_, i) => Number(s[`q${i + 1}`])).filter((v) => v >= 1));
    const satMean = mean(allAns);
    const kpis = [
      ["จำนวนครั้งที่เล่น", sessions.length, `ผู้เล่น ${players} คน`],
      ["คะแนนเฉลี่ย", sessions.length ? f1(mean(pcts)) + "%" : "–", sessions.length ? `S.D. ${f1(sd(pcts))} · สูงสุด ${f1(Math.max(...pcts))}%` : ""],
      ["เวลาเล่นเฉลี่ย", sessions.length ? fmtSec(mean(sessions.map((s) => Number(s.duration_sec)))) : "–", "ต่อ 1 รอบ"],
      ["ความพึงพอใจโดยรวม", surveys.length ? f2(satMean) : "–", surveys.length ? `ระดับ${level(satMean)} · ผู้ตอบ ${surveys.length} คน` : "ยังไม่มีผู้ตอบ"],
    ];
    $("kpis").innerHTML = kpis.map(([l, v, s]) => `<div class="stat"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join("");

    // รายด่าน
    const stageAgg = D.stages.map((st) => {
      const rows = stages.filter((r) => r.stage === st.key);
      const p = rows.map((r) => (r.max_score ? (r.score / r.max_score) * 100 : 0));
      return {
        ...st,
        n: rows.length,
        pct: mean(p),
        sd: sd(p),
        correct: mean(rows.map((r) => (r.total ? (r.correct / r.total) * 100 : 0))),
        attempts: mean(rows.map((r) => Number(r.attempts))),
        time: mean(rows.map((r) => Number(r.duration_sec))),
      };
    });
    $("stageTable").innerHTML = `
      <tr><th>องค์ประกอบ</th><th class="num">จำนวนครั้ง</th><th class="num">คะแนนเฉลี่ย (%)</th><th class="num">S.D.</th><th class="num">ตอบถูกสมบูรณ์ (%)</th><th class="num">จำนวนครั้งที่ตอบ/รันเฉลี่ย</th><th class="num">เวลาเฉลี่ย</th></tr>
      ${stageAgg.map((s) => `<tr><td>${s.icon} ${esc(s.name)} <span class="muted">(${s.en})</span></td><td class="num">${s.n}</td><td class="num">${f1(s.pct)}</td><td class="num">${f1(s.sd)}</td><td class="num">${f1(s.correct)}</td><td class="num">${f1(s.attempts)}</td><td class="num">${fmtSec(s.time)}</td></tr>`).join("")}`;

    // รายห้อง
    const byClass = {};
    sessions.forEach((s) => { (byClass[s.class_room || "(ไม่ระบุ)"] ||= []).push(s); });
    $("classTable").innerHTML = `
      <tr><th>ห้อง</th><th class="num">จำนวนครั้งที่เล่น</th><th class="num">ผู้เล่น (คน)</th><th class="num">คะแนนเฉลี่ย (%)</th><th class="num">S.D.</th><th class="num">ผ่านเกณฑ์ 60% ขึ้นไป</th></tr>
      ${Object.entries(byClass).sort().map(([c, rows]) => {
        const p = rows.map((r) => Number(r.percent));
        const pass = p.filter((v) => v >= 60).length;
        return `<tr><td>${esc(c)}</td><td class="num">${rows.length}</td><td class="num">${new Set(rows.map((r) => r.player_name)).size}</td><td class="num">${f1(mean(p))}</td><td class="num">${f1(sd(p))}</td><td class="num">${pass} (${f1((pass / rows.length) * 100)}%)</td></tr>`;
      }).join("") || `<tr><td colspan="6" class="muted">ยังไม่มีข้อมูล</td></tr>`}`;

    // แบบประเมิน
    let html = `<tr><th>รายการประเมิน</th><th class="num">x̄</th><th class="num">S.D.</th><th>ระดับความพึงพอใจ</th></tr>`;
    let qi = 0;
    const itemMeans = [];
    D.survey.forEach((g) => {
      const groupVals = [];
      const rowsHtml = g.items.map((text) => {
        qi++;
        const vals = surveys.map((s) => Number(s[`q${qi}`])).filter((v) => v >= 1);
        groupVals.push(...vals);
        const m = mean(vals);
        itemMeans.push(m);
        return `<tr><td class="wrap">${qi}. ${esc(text)}</td><td class="num">${f2(m)}</td><td class="num">${f2(sd(vals))}</td><td>${level(m)}</td></tr>`;
      }).join("");
      const gm = mean(groupVals);
      html += `<tr class="sum"><td>${esc(g.group)}</td><td class="num">${f2(gm)}</td><td class="num">${f2(sd(groupVals))}</td><td>${level(gm)}</td></tr>` + rowsHtml;
    });
    html += `<tr class="sum"><td>รวมทุกด้าน (n = ${surveys.length})</td><td class="num">${f2(satMean)}</td><td class="num">${f2(sd(allAns))}</td><td>${level(satMean)}</td></tr>`;
    $("surveyTable").innerHTML = html;

    // ข้อเสนอแนะ
    const comments = surveys.filter((s) => s.comment);
    $("comments").innerHTML = comments.length
      ? comments.slice(0, 100).map((s) => `<div class="comment">${esc(s.comment)}<small>${esc(s.player_name || "ไม่ระบุชื่อ")} ${s.class_room ? "· " + esc(s.class_room) : ""} · ${esc(s.created_at)}</small></div>`).join("")
      : `<p class="muted">ยังไม่มีข้อเสนอแนะ</p>`;

    // ตารางประวัติ
    const stageBySession = {};
    stages.forEach((r) => { (stageBySession[r.session_id] ||= {})[r.stage] = r; });
    $("sessionTable").innerHTML = `
      <tr><th>วันเวลา</th><th>ชื่อ</th><th>ห้อง</th><th>เลขที่</th>${D.stages.map((s) => `<th class="num">${s.icon}</th>`).join("")}<th class="num">รวม</th><th class="num">%</th><th class="num">เวลา</th></tr>
      ${sessions.slice(0, 300).map((s) => `<tr><td>${esc(s.created_at)}</td><td>${esc(s.player_name)}</td><td>${esc(s.class_room)}</td><td>${esc(s.student_no)}</td>
        ${D.stages.map((st) => { const r = stageBySession[s.id]?.[st.key]; return `<td class="num">${r ? r.score + "/" + r.max_score : "–"}</td>`; }).join("")}
        <td class="num">${s.total_score}/${s.max_score}</td><td class="num">${f1(Number(s.percent))}</td><td class="num">${fmtSec(s.duration_sec)}</td></tr>`).join("") || `<tr><td colspan="11" class="muted">ยังไม่มีข้อมูลการเล่น</td></tr>`}`;

    drawCharts(stageAgg, pcts, itemMeans);
    $("csvSessions").onclick = () => exportSessions(sessions, stageBySession);
    $("csvSurvey").onclick = () => exportSurveys(surveys);
  }

  // ---------- กราฟ ----------
  function drawCharts(stageAgg, pcts, itemMeans) {
    if (!window.Chart) {
      document.querySelectorAll(".chart-box").forEach((el) => {
        el.style.height = "auto";
        el.innerHTML = `<p class="muted">โหลดไลบรารีกราฟไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต) — ข้อมูลในตารางยังใช้งานได้ตามปกติ</p>`;
      });
      return;
    }
    Chart.defaults.font.family = "Sarabun, sans-serif";
    Chart.defaults.font.size = 13;
    Chart.defaults.color = "#5E6170";
    Object.values(charts).forEach((c) => c.destroy());

    charts.stage = new Chart($("stageChart"), {
      type: "bar",
      data: {
        labels: stageAgg.map((s) => s.name),
        datasets: [{ label: "คะแนนเฉลี่ย (%)", data: stageAgg.map((s) => +s.pct.toFixed(1)), backgroundColor: "#6FBDEB", borderRadius: 8, maxBarThickness: 56 }],
      },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } }, x: { grid: { display: false } } } },
    });

    const bins = ["0–19", "20–39", "40–59", "60–79", "80–100"];
    const counts = [0, 0, 0, 0, 0];
    pcts.forEach((p) => counts[Math.min(4, Math.floor(p / 20))]++);
    charts.dist = new Chart($("distChart"), {
      type: "bar",
      data: { labels: bins.map((b) => b + "%"), datasets: [{ label: "จำนวนครั้ง", data: counts, backgroundColor: "#F6A33B", borderRadius: 8, maxBarThickness: 56 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } },
    });

    charts.survey = new Chart($("surveyChart"), {
      type: "bar",
      data: {
        labels: SURVEY_ITEMS.map((it, i) => `${i + 1}. ${it.text.length > 38 ? it.text.slice(0, 38) + "…" : it.text}`),
        datasets: [{ label: "ค่าเฉลี่ย", data: itemMeans.map((m) => +m.toFixed(2)), backgroundColor: "#2E86C1", borderRadius: 6, maxBarThickness: 22 }],
      },
      options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 5, ticks: { stepSize: 1 } }, y: { grid: { display: false } } } },
    });
  }

  // ---------- ส่งออก CSV (มี BOM เพื่อให้ Excel อ่านภาษาไทยได้) ----------
  function downloadCsv(name, rows) {
    const csv = rows.map((r) => r.map((v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportSessions(sessions, stageBySession) {
    const head = ["วันเวลา", "ชื่อ", "ห้อง", "เลขที่", ...D.stages.map((s) => s.name), "คะแนนรวม", "คะแนนเต็ม", "ร้อยละ", "เวลา (วินาที)", "session_id"];
    const rows = sessions.map((s) => [
      s.created_at, s.player_name, s.class_room, s.student_no,
      ...D.stages.map((st) => stageBySession[s.id]?.[st.key]?.score ?? ""),
      s.total_score, s.max_score, s.percent, s.duration_sec, s.id,
    ]);
    downloadCsv(`game-sessions-${new Date().toISOString().slice(0, 10)}.csv`, [head, ...rows]);
  }

  function exportSurveys(surveys) {
    const head = ["วันเวลา", "ชื่อ", "ห้อง", ...SURVEY_ITEMS.map((_, i) => `ข้อ ${i + 1}`), "ข้อเสนอแนะ", "session_id"];
    const rows = surveys.map((s) => [
      s.created_at, s.player_name, s.class_room, ...SURVEY_ITEMS.map((_, i) => s[`q${i + 1}`]), s.comment, s.session_id,
    ]);
    downloadCsv(`survey-${new Date().toISOString().slice(0, 10)}.csv`, [head, ...rows]);
  }
})();
