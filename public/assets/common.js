// ฟังก์ชันที่ใช้ร่วมกันทุกหน้า: ข้อมูลผู้เล่น, เรียก API, คิวสำรองเมื่อออฟไลน์
(function () {
  const PLAYER_KEY = "ct_player";
  const QUEUE_KEY = "ct_queue";

  const store = {
    get(key, storage = localStorage) {
      try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
    },
    set(key, value, storage = localStorage) {
      try { storage.setItem(key, JSON.stringify(value)); } catch { /* ไม่เป็นไร */ }
    },
    remove(key, storage = localStorage) {
      try { storage.removeItem(key); } catch { /* ไม่เป็นไร */ }
    },
  };

  async function request(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: { "content-type": "application/json", ...(options.headers || {}) },
    });
    let data = null;
    try { data = await res.json(); } catch { /* ไม่ใช่ JSON */ }
    if (!res.ok) {
      const err = new Error(data?.error || `เกิดข้อผิดพลาด (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ส่งข้อมูล ถ้าเครือข่ายล่มหรือเซิร์ฟเวอร์ผิดพลาด จะเก็บไว้ในคิวแล้วส่งใหม่ภายหลัง
  async function send(path, body) {
    try {
      return await request(path, { method: "POST", body: JSON.stringify(body) });
    } catch (err) {
      if (err.status && err.status < 500) throw err;
      const q = store.get(QUEUE_KEY) || [];
      q.push({ path, body, at: Date.now() });
      store.set(QUEUE_KEY, q.slice(-50));
      return { queued: true, error: err.message };
    }
  }

  async function flushQueue() {
    const q = store.get(QUEUE_KEY) || [];
    if (!q.length) return 0;
    const left = [];
    for (const item of q) {
      try {
        await request(item.path, { method: "POST", body: JSON.stringify(item.body) });
      } catch (err) {
        if (!err.status || err.status >= 500) left.push(item);
      }
    }
    store.set(QUEUE_KEY, left);
    return q.length - left.length;
  }

  function toast(msg, ms = 2600) {
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  window.CT = {
    store,
    request,
    send,
    flushQueue,
    toast,
    esc,
    getPlayer: () => store.get(PLAYER_KEY),
    setPlayer: (p) => store.set(PLAYER_KEY, p),
    lastSession: () => store.get("ct_last_session", sessionStorage),
    setLastSession: (s) => store.set("ct_last_session", s, sessionStorage),
  };

  // พยายามส่งข้อมูลที่ค้างอยู่ทุกครั้งที่เปิดหน้า
  window.addEventListener("load", () => {
    flushQueue().then((n) => { if (n) toast(`ส่งข้อมูลที่ค้างไว้สำเร็จ ${n} รายการ`); }).catch(() => {});
  });
})();
