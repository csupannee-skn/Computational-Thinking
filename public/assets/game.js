// ตัวเกมหลัก: เล่นครบ 4 ด่าน → สรุปผล → บันทึกลง Turso
(function () {
  const D = window.CT_DATA;
  const { esc } = CT;
  const app = document.getElementById("app");
  const tigerSrc = "assets/tiger.svg";

  const player = CT.getPlayer();
  if (!player || !player.name) { location.replace("index.html"); return; }
  document.getElementById("who").textContent = `👤 ${player.name}${player.classRoom ? " · " + player.classRoom : ""}`;

  const state = {
    stageIdx: 0,
    qIdx: 0,
    startedAt: Date.now(),
    stageStart: 0,
    results: {},
    saved: null,
  };

  const PRAISE = ["เก่งมาก! 🎉", "ถูกต้อง! พี่เสือภูมิใจ 🐯", "สุดยอดไปเลย! ⭐", "คิดได้เฉียบมาก! 👏"];
  const CHEER = ["ไม่เป็นไร ลองดูเฉลยแล้วไปต่อกัน 💪", "เกือบแล้ว! ข้อหน้าเอาใหม่ ✌️", "ผิดพลาดคือการเรียนรู้นะ 🌱"];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const totalScoreEl = document.getElementById("score");
  function updateScore() {
    const t = Object.values(state.results).reduce((a, r) => a + r.score, 0);
    totalScoreEl.textContent = `⭐ ${t} คะแนน`;
  }

  function mascot(text, anim = "bounce") {
    return `<div class="mascot"><img src="${tigerSrc}" alt="พี่เสือ" class="${anim}" id="tiger"><div class="bubble" id="say">${text}</div></div>`;
  }
  function say(text, anim) {
    const el = document.getElementById("say");
    const img = document.getElementById("tiger");
    if (el) el.innerHTML = text;
    if (img && anim) { img.className = ""; void img.offsetWidth; img.className = anim; }
  }

  function stageDots() {
    return `<div class="stage-dots">${D.stages
      .map((s, i) => `<span class="${i < state.stageIdx ? "done" : i === state.stageIdx ? "now" : ""}">${s.icon} ${s.name}</span>`)
      .join("")}</div>`;
  }

  const stage = () => D.stages[state.stageIdx];
  const questions = () => D[stage().key];
  const result = () => state.results[stage().key];

  // ---------------- หน้าแนะนำด่าน ----------------
  function stageIntro() {
    const s = stage();
    state.results[s.key] = {
      stage: s.key, score: 0, max_score: questions().length * 10,
      correct: 0, total: questions().length, attempts: 0, duration_sec: 0,
    };
    state.qIdx = 0;
    app.innerHTML = `
      ${stageDots()}
      <div class="card center">
        <div style="font-size:3rem">${s.icon}</div>
        <p class="muted" style="margin:0">ด่านที่ ${state.stageIdx + 1} จาก ${D.stages.length} · ${esc(s.en)}</p>
        <h2>${esc(s.name)}</h2>
        ${mascot(esc(s.intro))}
        <p class="muted">มีทั้งหมด ${questions().length} ข้อ ข้อละ 10 คะแนน</p>
        <div class="actions"><button class="btn orange" id="go">เริ่มด่านนี้ ▶</button></div>
      </div>`;
    document.getElementById("go").onclick = () => { state.stageStart = Date.now(); renderQuestion(); };
    document.getElementById("go").focus();
  }

  function frame(inner) {
    const n = questions().length;
    app.innerHTML = `
      ${stageDots()}
      <div class="card">
        <div class="q-head">
          <span class="pill orange">${stage().icon} ${esc(stage().name)}</span>
          <span class="pill">ข้อ ${state.qIdx + 1} / ${n}</span>
        </div>
        <div class="progress" aria-hidden="true"><i style="width:${(state.qIdx / n) * 100}%"></i></div>
        <div style="margin-top:14px">${inner}</div>
        <div class="feedback" id="fb" role="status"></div>
        <div class="actions" id="act"></div>
      </div>
      <div class="card" style="margin-top:16px">${mascot("ค่อย ๆ คิดนะ พี่เสือเป็นกำลังใจให้ 🐯")}</div>`;
  }

  function finishQuestion(score, isCorrect, explain) {
    const r = result();
    r.score += score;
    r.correct += isCorrect ? 1 : 0;
    updateScore();
    const fb = document.getElementById("fb");
    fb.className = `feedback show ${isCorrect ? "ok" : score > 0 ? "info" : "bad"}`;
    fb.innerHTML = `<b>${isCorrect ? "✅ ถูกต้อง" : score > 0 ? "🟡 ถูกบางส่วน" : "❌ ยังไม่ถูก"}</b> · ได้ ${score}/10 คะแนน<br>${esc(explain || "")}`;
    say(isCorrect ? pick(PRAISE) : pick(CHEER), isCorrect ? "jump" : "shake");
    const last = state.qIdx >= questions().length - 1;
    const act = document.getElementById("act");
    act.innerHTML = `<button class="btn" id="next">${last ? "สรุปด่านนี้ ▶" : "ข้อถัดไป ▶"}</button>`;
    const btn = document.getElementById("next");
    btn.onclick = () => {
      if (last) stageSummary();
      else { state.qIdx++; renderQuestion(); }
    };
    btn.focus();
  }

  function renderQuestion() {
    const q = questions()[state.qIdx];
    ({ decomposition: renderDecomp, pattern: renderPattern, abstraction: renderAbstraction, algorithm: renderMaze })[stage().key](q);
  }

  // ---------------- ด่าน 1: แยกย่อยปัญหา ----------------
  function renderDecomp(q) {
    const order = q.items.map((_, i) => i).sort(() => Math.random() - 0.5);
    const place = q.items.map(() => -1); // -1 = ยังไม่จัด
    let selected = null;
    let locked = false;

    frame(`
      <div class="q-title">${esc(q.title)}</div>
      <p class="muted" style="margin:0">แตะงานย่อย 1 ชิ้น แล้วแตะกล่องหมวดหมู่ที่ต้องการวาง (แตะงานในกล่องเพื่อย้ายใหม่ได้)</p>
      <div class="pool" id="pool" aria-label="งานย่อยที่ยังไม่ได้จัด"></div>
      <div class="cats">${q.categories.map((c, i) => `<div class="cat" data-cat="${i}" tabindex="0" role="button" aria-label="วางในหมวด ${esc(c)}"><h4>${esc(c)}</h4><div class="slot"></div></div>`).join("")}</div>
    `);
    const act = document.getElementById("act");
    act.innerHTML = `<button class="btn orange" id="check" disabled>ตรวจคำตอบ</button>`;

    function draw() {
      const chip = (i) => `<button class="chip ${selected === i ? "selected" : ""}" data-i="${i}">${esc(q.items[i].text)}</button>`;
      document.getElementById("pool").innerHTML =
        order.filter((i) => place[i] === -1).map(chip).join("") ||
        `<span class="muted">จัดครบแล้ว กด “ตรวจคำตอบ” ได้เลย</span>`;
      document.querySelectorAll(".cat").forEach((box) => {
        const c = Number(box.dataset.cat);
        box.querySelector(".slot").innerHTML = order.filter((i) => place[i] === c).map(chip).join("");
        box.classList.toggle("armed", selected !== null);
      });
      document.getElementById("check").disabled = place.some((p) => p === -1);
    }

    app.addEventListener("click", onClick);
    app.addEventListener("keydown", onKey);
    function onKey(e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("cat")) { e.preventDefault(); e.target.click(); }
    }
    function onClick(e) {
      if (locked) return;
      const chipEl = e.target.closest(".chip");
      if (chipEl) {
        e.stopPropagation();
        const i = Number(chipEl.dataset.i);
        const inBox = chipEl.closest(".cat");
        if (selected !== null && selected !== i) {
          // มีงานที่เลือกค้างอยู่ → แตะตรงไหนในกล่องก็วางลงกล่องนั้น
          if (inBox) { place[selected] = Number(inBox.dataset.cat); selected = null; }
          else if (place[selected] !== -1) { place[selected] = -1; selected = null; }
          else selected = i;
        } else {
          selected = selected === i ? null : i;
        }
        draw();
        return;
      }
      const box = e.target.closest(".cat");
      if (box && selected !== null) { place[selected] = Number(box.dataset.cat); selected = null; draw(); return; }
      if (e.target.closest("#pool") && selected !== null) { place[selected] = -1; selected = null; draw(); }
    }

    document.getElementById("check").onclick = () => {
      locked = true;
      app.removeEventListener("click", onClick);
      app.removeEventListener("keydown", onKey);
      result().attempts++;
      let right = 0;
      document.querySelectorAll(".chip").forEach((el) => {
        const i = Number(el.dataset.i);
        const ok = place[i] === q.items[i].cat;
        if (ok) right++;
        el.classList.add(ok ? "ok" : "bad");
        el.disabled = true;
        if (!ok) el.insertAdjacentHTML("beforeend", ` <small>→ ${esc(q.categories[q.items[i].cat])}</small>`);
      });
      const score = Math.round((right / q.items.length) * 10);
      finishQuestion(score, right === q.items.length, `จัดถูก ${right} จาก ${q.items.length} งาน — ${q.explain}`);
    };
    draw();
  }

  // ---------------- ด่าน 2: จดจำรูปแบบ ----------------
  function renderPattern(q) {
    frame(`
      <div class="q-title">อะไรคือตัวถัดไปของรูปแบบนี้?</div>
      <div class="seq">${q.seq.map((s) => `<span>${esc(s)}</span>`).join("")}<span class="q">?</span></div>
      <div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join("")}</div>
    `);
    document.querySelectorAll(".opt").forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.i);
        result().attempts++;
        document.querySelectorAll(".opt").forEach((x) => {
          x.disabled = true;
          if (Number(x.dataset.i) === q.answer) x.classList.add("ok");
        });
        const ok = i === q.answer;
        if (!ok) b.classList.add("bad");
        document.querySelector(".seq .q").textContent = q.options[q.answer];
        finishQuestion(ok ? 10 : 0, ok, q.explain);
      };
    });
  }

  // ---------------- ด่าน 3: คิดเชิงนามธรรม ----------------
  function renderAbstraction(q) {
    const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5);
    frame(`
      <div class="q-title">${esc(q.prompt)}</div>
      <p class="muted">เลือกได้หลายข้อ (แตะอีกครั้งเพื่อยกเลิก)</p>
      <div class="opts list">${order.map((i) => `<button class="opt" data-i="${i}" aria-pressed="false">${esc(q.options[i].text)}</button>`).join("")}</div>
    `);
    const chosen = new Set();
    const act = document.getElementById("act");
    act.innerHTML = `<button class="btn orange" id="check" disabled>ตรวจคำตอบ</button>`;
    const check = document.getElementById("check");
    document.querySelectorAll(".opt").forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.i);
        chosen.has(i) ? chosen.delete(i) : chosen.add(i);
        b.classList.toggle("picked", chosen.has(i));
        b.setAttribute("aria-pressed", chosen.has(i));
        check.disabled = chosen.size === 0;
      };
    });
    check.onclick = () => {
      result().attempts++;
      const needCount = q.options.filter((o) => o.need).length;
      let hit = 0, wrong = 0;
      document.querySelectorAll(".opt").forEach((b) => {
        const i = Number(b.dataset.i);
        const need = q.options[i].need;
        b.disabled = true;
        b.classList.remove("picked");
        if (chosen.has(i) && need) { hit++; b.classList.add("ok"); }
        else if (chosen.has(i) && !need) { wrong++; b.classList.add("bad"); }
        else if (need) { b.classList.add("ok"); b.style.opacity = ".6"; b.insertAdjacentHTML("beforeend", " <small>(ควรเลือก)</small>"); }
      });
      const score = Math.max(0, Math.round(((hit - wrong) / needCount) * 10));
      const exact = hit === needCount && wrong === 0;
      finishQuestion(score, exact, q.explain);
    };
  }

  // ---------------- ด่าน 4: อัลกอริทึม (เขาวงกต) ----------------
  const DIRS = {
    up: { icon: "⬆️", dr: -1, dc: 0, th: "ขึ้น" },
    down: { icon: "⬇️", dr: 1, dc: 0, th: "ลง" },
    left: { icon: "⬅️", dr: 0, dc: -1, th: "ซ้าย" },
    right: { icon: "➡️", dr: 0, dc: 1, th: "ขวา" },
  };

  function renderMaze(q) {
    const rows = q.grid.length, cols = q.grid[0].length;
    let start, goal;
    q.grid.forEach((r, i) => [...r].forEach((c, j) => {
      if (c === "S") start = [i, j];
      if (c === "G") goal = [i, j];
    }));
    const program = [];
    let tries = 0;
    let running = false;

    frame(`
      <div class="q-title">${esc(q.title)}</div>
      <div class="maze-wrap">
        <div>
          <div class="maze" id="maze" style="grid-template-columns:repeat(${cols},1fr);--ratio:${cols}/${rows}">
            ${q.grid.map((r) => [...r].map((c) =>
              `<div class="cell ${c === "#" ? "wall" : c === "G" ? "goal" : ""}">${c === "#" ? "🌳" : c === "G" ? "🥩" : ""}</div>`).join("")).join("")}
            <div class="runner" id="runner"><img src="${tigerSrc}" alt="พี่เสือ"></div>
          </div>
        </div>
        <div>
          <b>บล็อกคำสั่ง</b> <span class="muted">(แตะเพื่อเพิ่มลงโปรแกรม)</span>
          <div class="palette">${Object.entries(DIRS).map(([k, d]) => `<button data-dir="${k}" aria-label="เดิน${d.th}">${d.icon}</button>`).join("")}</div>
          <b>โปรแกรมของฉัน</b> <span class="muted">(แตะบล็อกเพื่อเพิ่มจำนวนก้าว)</span>
          <div class="program" id="program"></div>
          <div class="block-count" id="count"></div>
          <div class="actions" style="justify-content:flex-start;margin-top:6px">
            <button class="btn orange" id="run">▶ รันโปรแกรม</button>
            <button class="btn ghost small" id="clear">ล้าง</button>
          </div>
          <p class="muted" style="margin-top:10px">💡 ${esc(q.hint)}</p>
        </div>
      </div>
    `);

    const runner = document.getElementById("runner");
    const maze = document.getElementById("maze");
    const cellsEls = maze.querySelectorAll(".cell");
    function placeRunner([r, c]) {
      const cell = cellsEls[r * cols + c];
      runner.style.left = cell.offsetLeft + "px";
      runner.style.top = cell.offsetTop + "px";
      runner.style.width = cell.offsetWidth + "px";
      runner.style.height = cell.offsetHeight + "px";
    }
    function resetBoard() {
      cellsEls.forEach((el) => el.classList.remove("trail"));
      placeRunner(start);
    }
    requestAnimationFrame(() => placeRunner(start));
    const onResize = () => { if (!running) placeRunner(start); };
    window.addEventListener("resize", onResize);

    function drawProgram(active = -1) {
      document.getElementById("program").innerHTML = program.length
        ? program.map((b, i) => `<span class="block ${i === active ? "running" : ""}" data-i="${i}" role="button" tabindex="0" aria-label="${DIRS[b.dir].th} ${b.n} ช่อง">
            ${DIRS[b.dir].icon}<span class="n">×${b.n}</span><button class="x" data-x="${i}" aria-label="ลบ">✕</button></span>`).join("")
        : `<span class="muted">ยังไม่มีคำสั่ง — แตะลูกศรด้านบน</span>`;
      document.getElementById("count").textContent = `ใช้ไป ${program.length} / ${q.maxBlocks} บล็อก`;
      document.querySelectorAll(".palette button").forEach((b) => (b.disabled = running || program.length >= q.maxBlocks));
      document.getElementById("run").disabled = running || !program.length;
      document.getElementById("clear").disabled = running;
    }

    document.querySelectorAll(".palette button").forEach((b) => {
      b.onclick = () => { if (program.length < q.maxBlocks) { program.push({ dir: b.dataset.dir, n: 1 }); drawProgram(); } };
    });
    const progEl = document.getElementById("program");
    progEl.onclick = (e) => {
      if (running) return;
      const x = e.target.closest("[data-x]");
      if (x) { program.splice(Number(x.dataset.x), 1); drawProgram(); return; }
      const blk = e.target.closest(".block");
      if (blk) { const b = program[Number(blk.dataset.i)]; b.n = b.n >= 9 ? 1 : b.n + 1; drawProgram(); }
    };
    progEl.onkeydown = (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("block")) { e.preventDefault(); e.target.click(); }
    };
    document.getElementById("clear").onclick = () => { program.length = 0; resetBoard(); drawProgram(); };

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    document.getElementById("run").onclick = async () => {
      running = true;
      tries++;
      result().attempts++;
      resetBoard();
      drawProgram();
      say("กำลังเดินตามคำสั่ง... 🐾");
      await wait(250);
      let [r, c] = start;
      let outcome = "end";
      outer: for (let bi = 0; bi < program.length; bi++) {
        drawProgram(bi);
        const d = DIRS[program[bi].dir];
        for (let k = 0; k < program[bi].n; k++) {
          const nr = r + d.dr, nc = c + d.dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) { outcome = "out"; break outer; }
          if (q.grid[nr][nc] === "#") { outcome = "tree"; break outer; }
          cellsEls[r * cols + c].classList.add("trail");
          r = nr; c = nc;
          placeRunner([r, c]);
          await wait(260);
          if (r === goal[0] && c === goal[1]) { outcome = "goal"; break outer; }
        }
      }
      running = false;
      drawProgram();

      if (outcome === "goal") {
        window.removeEventListener("resize", onResize);
        document.querySelectorAll(".palette button, #run, #clear").forEach((b) => (b.disabled = true));
        progEl.onclick = null;
        const score = Math.max(4, 10 - 2 * (tries - 1));
        finishQuestion(score, tries === 1, `พี่เสือถึงเนื้อแล้ว! ใช้ ${program.length} บล็อก รันไป ${tries} ครั้ง (รันผ่านในครั้งแรกได้เต็ม 10)`);
        return;
      }
      const msg = { out: "โอ๊ะ! เดินออกนอกแผนที่ 😵", tree: "ปัง! ชนต้นไม้ 🌳 ลองแก้โปรแกรมดูนะ", end: "คำสั่งหมดแล้ว แต่ยังไม่ถึงเนื้อ 🥩" }[outcome];
      say(msg + " (แก้บล็อกแล้วกดรันใหม่ได้เลย)", "shake");
      if (tries >= 3 && !document.getElementById("skip")) {
        document.getElementById("act").innerHTML = `<button class="btn ghost" id="skip">ข้ามภารกิจนี้ (0 คะแนน)</button>`;
        document.getElementById("skip").onclick = () => {
          window.removeEventListener("resize", onResize);
          document.querySelectorAll(".palette button, #run, #clear").forEach((b) => (b.disabled = true));
          progEl.onclick = null;
          finishQuestion(0, false, "ข้ามภารกิจนี้ไป ลองกลับมาเล่นใหม่อีกครั้งได้นะ");
        };
      }
    };
    drawProgram();
  }

  // ---------------- สรุปแต่ละด่าน ----------------
  function stageSummary() {
    const r = result();
    r.duration_sec = Math.round((Date.now() - state.stageStart) / 1000);
    const pct = Math.round((r.score / r.max_score) * 100);
    const last = state.stageIdx >= D.stages.length - 1;
    app.innerHTML = `
      ${stageDots()}
      <div class="card center">
        <div style="font-size:3rem">${stage().icon}</div>
        <h2>จบด่าน “${esc(stage().name)}”</h2>
        <div class="big-score">${r.score}<span class="muted" style="font-size:1.4rem"> / ${r.max_score}</span></div>
        <p class="muted">ตอบถูกสมบูรณ์ ${r.correct} จาก ${r.total} ข้อ · ใช้เวลา ${fmtTime(r.duration_sec)}</p>
        ${mascot(pct >= 80 ? "ยอดเยี่ยม! ด่านนี้สบายมากสำหรับเรา 🏆" : pct >= 50 ? "ทำได้ดีเลย! ไปด่านต่อไปกัน 💪" : "ไม่เป็นไรนะ ด่านต่อไปสู้ใหม่! 🌱", "jump")}
        <div class="actions"><button class="btn orange" id="next">${last ? "ดูผลรวมทั้งหมด 🏁" : "ไปด่านถัดไป ▶"}</button></div>
      </div>`;
    const btn = document.getElementById("next");
    btn.onclick = () => {
      if (last) finalResult();
      else { state.stageIdx++; stageIntro(); }
    };
    btn.focus();
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m ? `${m} นาที ${s} วินาที` : `${s} วินาที`;
  }

  // ---------------- ผลรวม + บันทึก ----------------
  async function finalResult() {
    state.stageIdx = D.stages.length;
    const list = D.stages.map((s) => state.results[s.key]);
    const total = list.reduce((a, r) => a + r.score, 0);
    const max = list.reduce((a, r) => a + r.max_score, 0);
    const pct = Math.round((total / max) * 100);
    const stars = pct >= 80 ? 3 : pct >= 60 ? 2 : pct >= 40 ? 1 : 0;
    const duration = Math.round((Date.now() - state.startedAt) / 1000);
    const title = stars === 3 ? "นักคิดเชิงคำนวณระดับเทพ!" : stars === 2 ? "นักคิดเชิงคำนวณฝีมือดี!" : stars === 1 ? "นักคิดเชิงคำนวณฝึกหัด" : "นักผจญภัยมือใหม่";

    app.innerHTML = `
      ${stageDots()}
      <div class="card">
        <div class="center">
          <p class="muted" style="margin:0">ผลการเล่นของ ${esc(player.name)}</p>
          <h2>🏁 ${title}</h2>
          <div class="stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? "" : "off"}">⭐</span>`).join("")}</div>
          <div class="big-score">${total}<span class="muted" style="font-size:1.4rem"> / ${max}</span></div>
          <p class="muted">คิดเป็น ${pct}% · ใช้เวลาทั้งหมด ${fmtTime(duration)}</p>
        </div>
        <h3 style="margin-top:18px">คะแนนแยกตามองค์ประกอบของแนวคิดเชิงคำนวณ</h3>
        ${D.stages.map((s) => {
          const r = state.results[s.key];
          const p = Math.round((r.score / r.max_score) * 100);
          return `<div class="bar-row"><span>${s.icon} ${esc(s.name)}</span><div class="bar"><i style="width:${p}%"></i></div><b class="center">${r.score}/${r.max_score}</b></div>`;
        }).join("")}
        <div id="saveStatus" class="alert info" style="margin-top:18px">⏳ กำลังบันทึกผล...</div>
        ${mascot("ขอบคุณที่มาเล่นกับพี่เสือนะ! ช่วยบอกความรู้สึกของเราผ่านแบบประเมินสั้น ๆ ด้วยน้า 💙", "jump")}
        <div class="actions">
          <a class="btn orange" href="survey.html">📝 ทำแบบประเมินความพึงพอใจ</a>
          <a class="btn ghost" href="game.html">🔁 เล่นอีกครั้ง</a>
        </div>
      </div>`;

    const payload = {
      player_name: player.name,
      class_room: player.classRoom || "",
      student_no: player.studentNo || "",
      duration_sec: duration,
      stages: list,
    };
    const statusEl = document.getElementById("saveStatus");
    try {
      const res = await CT.send("/api/session", payload);
      if (res.queued) {
        statusEl.className = "alert";
        statusEl.textContent = "⚠️ ยังเชื่อมต่อฐานข้อมูลไม่ได้ ระบบเก็บผลไว้ในเครื่องแล้ว และจะส่งให้อัตโนมัติเมื่อเปิดเว็บครั้งถัดไป";
      } else {
        CT.setLastSession({ id: res.id, percent: res.percent });
        statusEl.textContent = "✅ บันทึกผลเรียบร้อยแล้ว";
      }
    } catch (err) {
      statusEl.className = "alert";
      statusEl.textContent = "⚠️ บันทึกไม่สำเร็จ: " + err.message;
    }
  }

  updateScore();
  stageIntro();
})();
