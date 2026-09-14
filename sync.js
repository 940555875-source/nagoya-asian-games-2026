/* 多端同步：把准备事项 / 门票 / 记账账单编码进链接或二维码，
 * 任何设备打开同一链接即得到同一进度；另提供 JSON 导出 / 导入用于换设备搬运。
 */
(() => {
  "use strict";

  const TRIP_ID = "nagoya-asian-games-2026";
  const STORAGE_KEY = `travel-plan:runtime:v1:${encodeURIComponent(TRIP_ID)}`;
  const QR_SRC = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
  const state = { signature: "", qrReady: false, lastSnapshot: null };

  /* ---------- base64url ---------- */
  function encodeCode(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeCode(code) {
    const normalized = String(code || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /* ---------- 本地快照 ---------- */
  function emptySnapshot() {
    return {
      version: 1, settings: null, bills: [], travelers: [], todos: [], tickets: [],
      updatedAt: new Date().toISOString()
    };
  }

  function readSnapshot() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptySnapshot();
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : emptySnapshot();
    } catch { return emptySnapshot(); }
  }

  function writeSnapshot(snapshot) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); return true; }
    catch { return false; }
  }

  /* ---------- 压缩 / 展开（v2 含账单与出行人） ---------- */
  function compactState(snapshot) {
    return {
      v: 2,
      u: snapshot.updatedAt || new Date().toISOString(),
      t: (snapshot.todos || []).map((todo) => [String(todo.id || ""), String(todo.text || ""), todo.completed ? 1 : 0]),
      k: (snapshot.tickets || []).map((ticket) => [String(ticket.id || ""), ticket.completed ? 1 : 0]),
      r: (snapshot.travelers || []).map((traveler) => [String(traveler.id || ""), String(traveler.name || ""), String(traveler.color || "")]),
      b: (snapshot.bills || []).map((bill) => [
        String(bill.id || ""),
        String(bill.note || ""),
        Number(bill.originalAmountCents) || 0,
        Number(bill.baseAmountCents) || 0,
        String(bill.currency || ""),
        String(bill.category || ""),
        String(bill.orderedAt || ""),
        String(bill.payerId || ""),
        (bill.participantIds || []).join(",")
      ]),
      s: snapshot.settings ? { b: snapshot.settings.baseCurrency || "", c: snapshot.settings.commonCurrencies || [] } : null
    };
  }

  function expandState(incoming) {
    const snapshot = readSnapshot();
    if (Array.isArray(incoming.t)) {
      snapshot.todos = incoming.t.map(([id, text, done]) => ({ id: String(id), text: String(text), completed: Boolean(done) }));
    }
    if (Array.isArray(incoming.k)) {
      snapshot.tickets = incoming.k.map(([id, done]) => ({ id: String(id), completed: Boolean(done) }));
    }
    if (Array.isArray(incoming.r)) {
      snapshot.travelers = incoming.r.map(([id, name, color]) => ({ id: String(id), name: String(name), color: String(color || "") }));
    }
    if (Array.isArray(incoming.b)) {
      snapshot.bills = incoming.b.map(([id, note, original, base, currency, category, orderedAt, payerId, participants]) => ({
        id: String(id),
        note: String(note || ""),
        originalAmountCents: Number(original) || 0,
        baseAmountCents: Number(base) || 0,
        currency: String(currency || "JPY"),
        category: String(category || "其他"),
        orderedAt: String(orderedAt || ""),
        payerId: String(payerId || ""),
        participantIds: String(participants || "").split(",").filter(Boolean),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    }
    if (incoming.s && typeof incoming.s === "object") {
      snapshot.settings = {
        ...(snapshot.settings || {}),
        baseCurrency: incoming.s.b || "CNY",
        commonCurrencies: Array.isArray(incoming.s.c) ? incoming.s.c : []
      };
    }
    snapshot.version = 1;
    snapshot.updatedAt = String(incoming.u || new Date().toISOString());
    return snapshot;
  }

  /* ---------- 链接 ---------- */
  function stateFromUrl() {
    try {
      const code = new URLSearchParams(location.search).get("s");
      if (!code) return null;
      const parsed = decodeCode(code);
      return parsed && (parsed.v === 2 || parsed.v === 1) ? parsed : null;
    } catch { return null; }
  }

  function urlForState(compact) {
    const url = new URL(location.href);
    url.searchParams.set("s", encodeCode(compact));
    url.hash = "";
    return url.toString();
  }

  function applyIncoming() {
    const incoming = stateFromUrl();
    if (!incoming) return;
    const snapshot = readSnapshot();
    const incomingAt = Date.parse(incoming.u || "") || 0;
    const localAt = Date.parse(snapshot.updatedAt || "") || 0;
    const localHasData = (snapshot.todos?.length || 0) + (snapshot.bills?.length || 0) > 0;
    if (incomingAt <= localAt && localHasData) return;
    writeSnapshot(expandState(incoming));
  }

  /* ---------- 二维码 ---------- */
  function loadQr() {
    if (window.QRCode || state.qrReady) return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = QR_SRC;
      script.onload = () => { state.qrReady = true; resolve(true); };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function paintQr(link) {
    const host = document.querySelector("#sync-qr");
    if (!host) return;
    const ok = await loadQr();
    if (!ok || !window.QRCode) { host.hidden = true; return; }
    host.hidden = false;
    host.innerHTML = "";
    try {
      new window.QRCode(host, {
        text: link,
        width: 150,
        height: 150,
        colorDark: "#13262f",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel?.M ?? 0
      });
    } catch (error) {
      host.hidden = true;
    }
  }

  /* ---------- 文案 ---------- */
  function relativeTime(iso) {
    const diff = Date.now() - Date.parse(iso);
    if (!Number.isFinite(diff) || diff < 0) return "";
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  }

  function countLabel(snapshot) {
    const parts = [];
    if (snapshot.todos?.length) parts.push(`${snapshot.todos.length} 项准备`);
    if (snapshot.bills?.length) parts.push(`${snapshot.bills.length} 笔账单`);
    if (snapshot.tickets?.length) parts.push(`${snapshot.tickets.length} 张门票`);
    return parts.length ? parts.join(" · ") : "暂无进度";
  }

  /* ---------- 面板渲染 ---------- */
  function renderPanel() {
    const body = document.querySelector("#sync-body");
    if (!body || body.dataset.ready) return;
    body.dataset.ready = "1";
    body.innerHTML = `
      <p class="sync-lead">另一台设备扫码或打开同步链接，就能拿到和这里完全一致的进度（准备事项、门票、记账账单、出行人都会一起同步）。</p>
      <div class="sync-main">
        <div class="sync-qr" id="sync-qr" hidden></div>
        <div class="sync-side">
          <p class="sync-side__count" id="sync-count"></p>
          <div class="sync-actions">
            <button type="button" class="sync-btn sync-btn--primary" id="sync-copy">复制同步链接</button>
            <button type="button" class="sync-btn" id="sync-export">导出进度文件</button>
            <label class="sync-btn" for="sync-import">导入进度文件
              <input type="file" id="sync-import" accept="application/json,.json" hidden>
            </label>
            <button type="button" class="sync-btn" id="sync-reset">清空勾选</button>
          </div>
          <p class="sync-hint" id="sync-hint">进度变化会自动写进地址栏；把地址栏链接发给自己即可换设备继续。</p>
        </div>
      </div>`;
    bindPanel();
  }

  function flash(button, text) {
    if (!button) return;
    const original = button.dataset.label || button.textContent;
    button.dataset.label = original;
    button.textContent = text;
    window.setTimeout(() => { button.textContent = original; }, 1800);
  }

  async function copyLink() {
    const snapshot = readSnapshot();
    const link = urlForState(compactState(snapshot));
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link);
      else throw new Error("no clipboard");
    } catch {
      const helper = document.createElement("textarea");
      helper.value = link;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      try { document.execCommand("copy"); } catch { /* 忽略 */ }
      helper.remove();
    }
    return link;
  }

  function bindPanel() {
    document.querySelector("#sync-copy")?.addEventListener("click", async (event) => {
      await copyLink();
      flash(event.currentTarget, "已复制 ✓");
    });

    document.querySelector("#sync-export")?.addEventListener("click", async (event) => {
      const snapshot = cloudMode ? await fetchCloudSnapshot() : readSnapshot();
      const payload = {
        tripId: TRIP_ID,
        exportedAt: new Date().toISOString(),
        travelers: snapshot.travelers || [],
        settings: snapshot.settings || null,
        bills: snapshot.bills || [],
        todos: snapshot.todos || [],
        tickets: snapshot.tickets || []
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      anchor.href = url;
      anchor.download = `名古屋亚运进度-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      flash(event.currentTarget, "已导出 ✓");
    });

    document.querySelector("#sync-import")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const snapshot = readSnapshot();
        snapshot.travelers = Array.isArray(parsed.travelers) ? parsed.travelers : snapshot.travelers;
        snapshot.bills = Array.isArray(parsed.bills) ? parsed.bills : snapshot.bills;
        snapshot.todos = Array.isArray(parsed.todos) ? parsed.todos : snapshot.todos;
        snapshot.tickets = Array.isArray(parsed.tickets) ? parsed.tickets : snapshot.tickets;
        if (parsed.settings) snapshot.settings = { ...(snapshot.settings || {}), ...parsed.settings };
        snapshot.updatedAt = new Date().toISOString();
        if (cloudMode) {
          await saveCloudSnapshot(snapshot);
          window.location.reload();
        } else {
          writeSnapshot(snapshot);
          window.location.href = `?s=${encodeCode(compactState(snapshot))}`;
        }
      } catch (error) {
        const hint = document.querySelector("#sync-hint");
        if (hint) hint.textContent = "导入失败：文件不是有效的进度 JSON。";
      }
      event.target.value = "";
    });

    document.querySelector("#sync-reset")?.addEventListener("click", () => {
      const snapshot = readSnapshot();
      snapshot.todos = (snapshot.todos || []).map((todo) => ({ ...todo, completed: false }));
      snapshot.tickets = (snapshot.tickets || []).map((ticket) => ({ ...ticket, completed: false }));
      snapshot.updatedAt = new Date().toISOString();
      writeSnapshot(snapshot);
      window.location.href = `?s=${encodeCode(compactState(snapshot))}`;
    });
  }

  /* ---------- 云端模式（D1 自动同步） ---------- */
  let cloudMode = false;

  function renderCloudPanel() {
    const body = document.querySelector("#sync-body");
    if (!body || body.dataset.cloud) return;
    body.dataset.cloud = "1";
    body.innerHTML = `
      <div class="sync-main">
        <div class="sync-side">
          <p class="sync-side__count">☁️ 自动同步已开启</p>
          <p class="sync-lead">这个页面已经连了云端数据库，所有打开它的设备会自动共享进度：勾一项准备、记一笔账，其他设备几秒内就能看到，不用扫码也不用复制链接。</p>
          <div class="sync-actions">
            <button type="button" class="sync-btn" id="sync-export">导出进度文件</button>
            <label class="sync-btn" for="sync-import">导入进度文件
              <input type="file" id="sync-import" accept="application/json,.json" hidden>
            </label>
          </div>
          <p class="sync-hint" id="sync-hint">账单、出行人、准备事项、门票都会实时共享。拿到链接的人都能改，只发给同行的人。</p>
        </div>
      </div>`;
    bindPanel();
  }

  /* ---------- 状态变化 -> 地址栏 + 二维码 ---------- */
  function watchChanges() {
    window.setInterval(() => {
      if (cloudMode) return;
      const snapshot = readSnapshot();
      const compact = compactState(snapshot);
      const next = JSON.stringify(compact);
      if (next === state.signature) return;
      state.signature = next;
      const link = urlForState(compact);
      history.replaceState(history.state, "", link);

      const count = document.querySelector("#sync-count");
      if (count) count.textContent = countLabel(snapshot);
      const updated = document.querySelector("#sync-updated");
      if (updated) updated.textContent = relativeTime(snapshot.updatedAt) ? `${relativeTime(snapshot.updatedAt)}更新` : "";
      const hint = document.querySelector("#sync-hint");
      if (hint && compact.b.length > 40) hint.textContent = "进度较多，链接会变长。换设备建议用「导出进度文件」更稳。";
      paintQr(link);
    }, 1000);
  }

  /* ---------- 云端读写（D1） ---------- */
  async function fetchCloudSnapshot() {
    try {
      const response = await fetch(`/api/trip/${encodeURIComponent(TRIP_ID)}?collections=bills,travelers,todos,tickets`, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      return await response.json();
    } catch { return readSnapshot(); }
  }

  async function saveCloudSnapshot(snapshot) {
    const storage = window.TravelRuntimeStorage;
    if (!storage?.createAdapter) return false;
    const adapter = storage.createAdapter({
      mode: "d1",
      apiBase: "/api/trip",
      tripId: TRIP_ID,
      collections: ["bills", "travelers", "todos", "tickets"]
    });
    await adapter.load();
    await adapter.save(snapshot);
    return true;
  }

  applyIncoming();

  document.addEventListener("travel-data-ready", (event) => {
    const mode = String(event.detail?.config?.persistence?.mode || "").toLowerCase();
    if (mode !== "d1") return;
    cloudMode = true;
    renderCloudPanel();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { renderPanel(); watchChanges(); });
  } else {
    renderPanel();
    watchChanges();
  }
})();
