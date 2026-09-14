/* 多端同步：把准备事项 / 门票状态编码进链接，任何设备打开同一链接即得到同一状态 */
(() => {
  "use strict";

  const TRIP_ID = "nagoya-asian-games-2026";
  const STORAGE_KEY = `travel-plan:runtime:v1:${encodeURIComponent(TRIP_ID)}`;

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

  /* ---------- 本地快照读写 ---------- */
  function emptySnapshot() {
    return { version: 1, settings: null, bills: [], travelers: [], todos: [], tickets: [], updatedAt: new Date().toISOString() };
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

  function compactState(snapshot) {
    return {
      v: 1,
      u: snapshot.updatedAt || new Date().toISOString(),
      t: (Array.isArray(snapshot.todos) ? snapshot.todos : []).map((todo) => [
        String(todo.id || ""), String(todo.text || ""), todo.completed ? 1 : 0
      ]),
      k: (Array.isArray(snapshot.tickets) ? snapshot.tickets : []).map((ticket) => [String(ticket.id || ""), ticket.completed ? 1 : 0])
    };
  }

  function expandState(state) {
    const snapshot = readSnapshot();
    if (Array.isArray(state.t)) {
      snapshot.todos = state.t.map(([id, text, done]) => ({ id: String(id), text: String(text), completed: Boolean(done) }));
    }
    if (Array.isArray(state.k)) {
      snapshot.tickets = state.k.map(([id, done]) => ({ id: String(id), completed: Boolean(done) }));
    }
    snapshot.version = 1;
    snapshot.updatedAt = String(state.u || new Date().toISOString());
    return snapshot;
  }

  /* ---------- 链接 <-> 状态 ---------- */
  function stateFromUrl() {
    try {
      const code = new URLSearchParams(location.search).get("s");
      if (!code) return null;
      const state = decodeCode(code);
      return state && state.v === 1 ? state : null;
    } catch { return null; }
  }

  function urlForState(state) {
    const url = new URL(location.href);
    url.searchParams.set("s", encodeCode(state));
    url.hash = "";
    return url.toString();
  }

  function applyIncoming() {
    const incoming = stateFromUrl();
    if (!incoming) return;
    const snapshot = readSnapshot();
    const incomingAt = Date.parse(incoming.u || "") || 0;
    const localAt = Date.parse(snapshot.updatedAt || "") || 0;
    if (incomingAt <= localAt && snapshot.todos.length) return;
    writeSnapshot(expandState(incoming));
  }

  /* ---------- 同步栏 UI ---------- */
  function injectBar() {
    const prep = document.querySelector("#prep");
    if (!prep || document.querySelector("#sync-bar")) return;
    const bar = document.createElement("div");
    bar.className = "sync-bar";
    bar.id = "sync-bar";
    bar.innerHTML = `
      <div class="sync-bar__head">
        <span class="sync-bar__title">多端同步</span>
        <span class="sync-bar__state" id="sync-state">链接已包含当前进度</span>
      </div>
      <div class="sync-bar__actions">
        <button type="button" class="sync-btn sync-btn--primary" id="sync-copy">复制同步链接</button>
        <button type="button" class="sync-btn" id="sync-reset">清空进度</button>
      </div>
      <p class="sync-bar__hint">在手机上打开这条链接，准备事项的勾选进度会和这里完全一致。</p>`;
    prep.appendChild(bar);

    bar.querySelector("#sync-copy").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const link = urlForState(compactState(readSnapshot()));
      try {
        await navigator.clipboard.writeText(link);
      } catch {
        const helper = document.createElement("textarea");
        helper.value = link;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      button.textContent = "已复制 ✓";
      window.setTimeout(() => { button.textContent = "复制同步链接"; }, 1800);
    });

    bar.querySelector("#sync-reset").addEventListener("click", () => {
      const snapshot = readSnapshot();
      snapshot.todos = (snapshot.todos || []).map((todo) => ({ ...todo, completed: false }));
      snapshot.tickets = (snapshot.tickets || []).map((ticket) => ({ ...ticket, completed: false }));
      snapshot.updatedAt = new Date().toISOString();
      writeSnapshot(snapshot);
      location.href = "?s=" + encodeCode(compactState(snapshot));
    });
  }

  /* ---------- 状态变化 -> 写入地址栏 ---------- */
  function watchChanges() {
    let signature = "";
    window.setInterval(() => {
      const snapshot = readSnapshot();
      const next = JSON.stringify(compactState(snapshot));
      if (next === signature) return;
      signature = next;
      const url = new URL(location.href);
      url.searchParams.set("s", encodeCode(compactState(snapshot)));
      history.replaceState(history.state, "", url.toString());
    }, 900);
  }

  applyIncoming();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { injectBar(); watchChanges(); });
  } else {
    injectBar();
    watchChanges();
  }
})();
