/* 赛程 & 住宿板块渲染 —— 名古屋亚运 2026
 * 赛程数据：优先用官方 results.asiangames2026.org（经 /api/badminton 代理，自动带赛果）
 *          官方未更新或离线版本时，回退到 trip-data.json（原赛程图整理）
 */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const FOCUS_KEYWORDS = ["男子团体", "男子双打"];
  const DISCIPLINE_CLASS = {
    "男团": "team-m", "女团": "team-f",
    "男单": "ms", "女单": "ws",
    "男双": "md", "女双": "wd", "混双": "xd",
    "团体": "team-m", "单项": "ms"
  };
  const OFFICIAL_SITE = "https://results.asiangames2026.org/#/schedule/daily";
  const API_URL = "/api/badminton";
  const AUTO_REFRESH_HOUR = 22;      // 每天 22:00 自动刷新一次
  const AUTO_REFRESH_KEY = "nagoya-schedule-auto-refresh";
  const SILENT_SYNC_MS = 3 * 60 * 1000; // 页面可见时每 3 分钟静默比对一次，官方一更新就重渲染
  const VISIBLE_LIMIT = 8;           // 每个比赛日默认展示场次，其余折叠
  const FINISHED_AFTER_MS = 4 * 3600 * 1000; // 开赛 4 小时后视为已结束（官网未及时更新赛果时也能归档）
  const STATUS_EVAL_MS = 60 * 1000;  // 每分钟重算一次「是否结束」

  const state = {
    filter: "focus", // 默认展示「中国队 / 关注」，看全部再点「全部」
    data: null,
    sessions: [],
    expanded: new Set(),
    live: { status: "idle", data: null, updatedAt: "", error: "", refreshing: false, syncing: false }
  };

  /* ---------- 工具 ---------- */
  function isFocusEvent(event, focusEvents = []) {
    if (event.focus === true || event.chn === true) return true;
    const haystack = `${event.name} ${event.event || ""}`;
    return [...FOCUS_KEYWORDS, ...focusEvents].some((keyword) => keyword && haystack.includes(keyword));
  }

  function toBeijingTime(timeJst) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(timeJst || "").trim());
    if (!match) return "";
    const total = (Number(match[1]) * 60 + Number(match[2]) + 24 * 60 - 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}/${day}`;
  }

  function parseLocalDate(dateString, timeString = "00:00") {
    const [year, month, day] = String(dateString).split("-").map(Number);
    const [hour, minute] = String(timeString).split(":").map(Number);
    return new Date(year, month - 1, day, hour || 0, minute || 0);
  }

  /* 日本当地（JST）日期：跨天后按天刷新官方赛程用 */
  function jstDayKey() {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }

  function startTimestamp(date, timeJst) {
    if (!date || !/^(\d{1,2}):(\d{2})$/.test(String(timeJst || "").trim())) return NaN;
    const parsed = Date.parse(`${date}T${String(timeJst).trim()}:00+09:00`);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  /* 统一判定场次状态：官方状态优先，但时间已过则强制归档为已结束，
     保证「关注」里的比赛打完就自动挪进「已结束」，不用等官网更新。 */
  function deriveStatus(event, date) {
    if (event.status === "cancelled") return "cancelled";
    if (event.status === "finished") return "finished";
    const start = startTimestamp(date, event.timeJst);
    if (!Number.isFinite(start)) return event.status || "upcoming";
    const now = Date.now();
    if (now >= start + FINISHED_AFTER_MS) return "finished";
    if (now >= start) return "live";
    return "upcoming";
  }

  function isDone(event) {
    return event.status === "finished" || event.status === "cancelled";
  }

  function weekdayOf(dateString) {
    const date = parseLocalDate(dateString);
    return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
  }

  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function mapsUrl(target) {
    if (target.geo && Number.isFinite(Number(target.geo.lat)) && Number.isFinite(Number(target.geo.lng))) {
      return `https://www.google.com/maps/search/?api=1&query=${Number(target.geo.lat)},${Number(target.geo.lng)}`;
    }
    const query = target.mapsQuery || target.addressJa || target.addressEn || "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function isPending(value) {
    return /待补充|未設定|pending/i.test(String(value || ""));
  }

  async function copyText(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      try {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      } catch (ignored) {
        /* 环境不支持剪贴板时静默降级 */
      }
    }
    return true;
  }

  /* ---------- 官方赛程接入 ---------- */
  function officialDayUrl(date) {
    return `${OFFICIAL_SITE}/${date || todayKey()}`;
  }

  function formatUpdatedAt(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (value) => String(value).padStart(2, "0");
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /* 官方对阵公布进度：8/196 这种，未公布时提示会持续出现直到官网更新 */
  function rosterText() {
    const live = state.live.data;
    if (!live || !Array.isArray(live.matches)) return "";
    const total = live.total || live.matches.length;
    const published = live.rosterCount || 0;
    if (!published) return " · 对阵待公布";
    return published >= total ? "" : ` · 已公布 ${published}/${total} 场对阵`;
  }

  function setLiveStatus(status) {
    state.live.status = status;
    const label = $("#schedule-status");
    if (!label) return;
    const timeText = state.live.updatedAt ? ` · ${state.live.updatedAt} 更新` : "";
    const roster = rosterText();
    const map = {
      idle: `<span class="dot"></span><span>赛程加载中…</span>`,
      loading: `<span class="dot"></span><span>正在同步官方赛程…</span>`,
      ok: `<span class="dot dot--ok"></span><span>官方赛程${timeText}${roster}</span>`,
      offline: `<span class="dot dot--warn"></span><span>当前为离线版，展示原赛程图信息</span>`,
      error: `<span class="dot dot--warn"></span><span>官方同步失败，展示原赛程图信息</span>`
    };
    label.innerHTML = map[status] || map.idle;
  }

  function showScheduleToast(message) {
    let toast = $("#schedule-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "schedule-toast";
      toast.className = "schedule-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-show");
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => toast.classList.remove("is-show"), 5000);
  }

  /* 静默比对：先请求 <1KB 的指纹端点，指纹没变就到此为止；
     指纹变了才拉全量数据重渲染。官方一旦更新对阵 / 选手 / 比分就立刻同步。 */
  async function silentSync() {
    if (state.live.syncing || state.live.refreshing) return;
    if (!state.live.data || document.hidden) return;
    const previous = state.live.data;
    state.live.syncing = true;
    try {
      const response = await fetch(FP_URL, { headers: { accept: "application/json" } });
      if (!response.ok) return;
      const fp = await response.json();
      // 指纹一致（或服务端还没建缓存）→ 无更新，结束
      if (!fp.fingerprint) return;
      if (fp.fingerprint === previous.fingerprint && (!fp.updatedAt || fp.updatedAt === previous.updatedAt)) return;
      // 指纹变化 → 拉全量（此刻缓存已是新数据，不会触发回源）
      await loadOfficialSchedule(false);
    } catch (error) {
      /* 静默同步失败不打扰用户，等下一次定时或手动刷新 */
    } finally {
      state.live.syncing = false;
    }
  }

  function startAutoSync() {
    window.setInterval(silentSync, SILENT_SYNC_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      reconcileStatuses();   // 切回前台时先归档「后台期间已打完」的比赛
      silentSync();
    });
  }

  async function loadOfficialSchedule(force = false) {
    if (state.live.refreshing) return;
    state.live.refreshing = true;
    setLiveStatus(force ? "loading" : (state.live.data ? "ok" : "idle"));
    const button = $("#schedule-refresh");
    if (button) button.classList.add("is-busy");
    try {
      const response = await fetch(`${API_URL}${force ? "?refresh=1" : ""}`, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.matches) || !data.matches.length) throw new Error("官方暂无数据");
      state.live.data = data;
      state.live.updatedAt = formatUpdatedAt(data.updatedAt);
      state.live.error = "";
      buildSessions();
      setLiveStatus("ok");
      if (force && data.changedCount) showScheduleToast(`已同步官网最新数据：${data.changedCount} 场对阵 / 赛果有更新`);
    } catch (error) {
      state.live.error = error.message;
      // 官方接口不可用（离线版 / 同步失败）时，保留原赛程图信息
      setLiveStatus(state.live.data ? "ok" : (/404|Failed to fetch|NetworkError/.test(error.message) ? "offline" : "error"));
      if (!state.live.data) buildSessions();
    } finally {
      state.live.refreshing = false;
      if (button) button.classList.remove("is-busy");
    }
  }

  function maybeAutoRefresh() {
    const now = new Date();
    if (now.getHours() < AUTO_REFRESH_HOUR) return;
    const key = `${AUTO_REFRESH_KEY}-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, String(Date.now()));
    } catch (error) {
      /* 隐私模式下不记状态，退化为到点即刷新 */
    }
    loadOfficialSchedule(true);
  }

  /* 每分钟跑一次：只靠时间流逝也能把打完的比赛从「关注」挪进「已结束」 */
  function reconcileStatuses(options = {}) {
    if (!state.sessions.length) return;
    let changed = 0;
    let archived = 0;
    state.sessions.forEach((session) => {
      session.events.forEach((event) => {
        const next = deriveStatus(event, session.date);
        if (next === event.status) return;
        if ((event.chn || event.focus) && (next === "finished" || next === "cancelled")) archived += 1;
        event.status = next;
        changed += 1;
      });
    });
    if (!changed) return;
    buildSessions();
    if (archived && !options.silent) {
      showScheduleToast(`${archived} 场关注比赛已结束，赛程与赛果已移至「已结束」`);
    }
  }

  /* 跨入新的比赛日（JST）→ 立刻回源拉一次官方赛程与赛果 */
  let lastJstDay = jstDayKey();
  function maybeDayRolloverRefresh() {
    const key = jstDayKey();
    if (key === lastJstDay) return;
    lastJstDay = key;
    if (!state.data) return;
    showScheduleToast(`已跨入新比赛日（${key}），正在同步官方赛程与赛果…`);
    loadOfficialSchedule(true);
  }

  /* ---------- 赛程数据整合 ---------- */
  function staticEventsOf(session, competition) {
    const focusEvents = competition?.focusEvents || [];
    return (session.events || []).map((event) => {
      const start = Date.parse(`${session.date}T${event.timeJst || "00:00"}:00+09:00`);
      const status = Number.isFinite(start) && Date.now() - start > 4 * 3600 * 1000 ? "finished" : "upcoming";
      return {
        timeJst: event.timeJst || "",
        timeCst: toBeijingTime(event.timeJst),
        discipline: event.discipline || "",
        name: event.name || "",
        stage: event.stage || "",
        medal: Boolean(event.medal),
        focus: Boolean(event.focus) || isFocusEvent(event, focusEvents),
        chn: /中国队|中国 /.test(`${event.name} ${event.stage || ""}`),
        status,
        home: { org: "", name: "", result: "", winner: false },
        away: { org: "", name: "", result: "", winner: false },
        court: "",
        source: "image"
      };
    });
  }

  function liveEventsOf(day) {
    return (day.matches || []).map((match) => ({
      timeJst: match.timeJst || "",
      timeCst: match.timeCst || toBeijingTime(match.timeJst),
      discipline: match.discipline || "",
      name: `${match.eventZh || ""}${match.stage ? ` ${match.stage}` : ""}`.trim(),
      stage: match.stage || "",
      medal: Boolean(match.medal),
      focus: Boolean(match.focus),
      chn: Boolean(match.chn),
      status: match.status || "upcoming",
      home: match.home || { org: "", name: "", result: "", winner: false },
      away: match.away || { org: "", name: "", result: "", winner: false },
      court: match.court || "",
      source: "official"
    }));
  }

  function dayTitle(events) {
    const stages = [...new Set(events.map((event) => event.stage).filter(Boolean))];
    const names = [...new Set(events.map((event) => (event.name || "").split(" ").filter(Boolean)[0] || ""))].filter(Boolean);
    const teamOnly = names.length && names.every((name) => name.includes("团体"));
    const kind = teamOnly ? "团体赛" : (names.some((name) => name.includes("团体")) ? "团体 + 单项" : "单项赛");
    const short = stages.slice(0, 3).join(" / ");
    const rest = stages.length > 3 ? ` 等 ${stages.length} 轮` : "";
    return `${kind}${short ? ` · ${short}` : ""}${rest}`;
  }

  function buildSessions() {
    const data = state.data;
    if (!data) return;
    const competition = data.competition || {};
    const tripStart = data.trip?.startDate || "";
    const tripEnd = data.trip?.endDate || "";
    const live = state.live.data;

    if (live && Array.isArray(live.days) && live.days.length) {
      const staticByDate = {};
      (competition.sessions || []).forEach((session) => { staticByDate[session.date] = session; });

      state.sessions = live.days.map((day) => {
        const events = liveEventsOf(day);
        // 官方当天已公布对阵就完全以官方为准；尚未公布时才用原赛程图的关注场次补齐「时间 + 项目」
        const dayHasRoster = events.some((event) => event.home?.org || event.home?.name || event.away?.org || event.away?.name);
        const extra = dayHasRoster
          ? []
          : staticEventsOf(staticByDate[day.date] || { date: day.date, events: [] }, competition)
            .filter((event) => event.focus || event.chn)
            .filter((event) => !events.some((item) => item.timeJst === event.timeJst && item.discipline === event.discipline));
        const merged = events.concat(extra);
        return {
          date: day.date,
          weekday: day.weekday || weekdayOf(day.date),
          title: dayTitle(merged),
          medalDay: merged.some((event) => event.medal),
          inTrip: Boolean(tripStart && tripEnd && day.date >= tripStart && day.date <= tripEnd),
          events: merged
        };
      });
    } else {
      state.sessions = (competition.sessions || []).map((session) => {
        const events = staticEventsOf(session, competition);
        return {
          date: session.date,
          weekday: session.weekday || weekdayOf(session.date),
          title: session.title || dayTitle(events),
          medalDay: Boolean(session.medalDay) || events.some((event) => event.medal),
          inTrip: Boolean(tripStart && tripEnd && session.date >= tripStart && session.date <= tripEnd),
          events
        };
      });
    }
    /* 统一按「此刻」重算状态：开赛满 4 小时即归档为已结束，
       这样「关注」里打完的比赛会自动挪进「已结束」，不必等官网更新赛果。 */
    state.sessions.forEach((session) => {
      session.events.forEach((event) => { event.status = deriveStatus(event, session.date); });
    });
    renderSchedule();
    renderCountdown();
    renderRange();
  }

  /* ---------- 渲染 ---------- */
  const ORG_ZH = {
    CHN: "中国", JPN: "日本", KOR: "韩国", PRK: "朝鲜", INA: "印尼", MAS: "马来西亚", THA: "泰国",
    IND: "印度", TPE: "中国台北", HKG: "中国香港", MAC: "中国澳门", DEN: "丹麦", SIN: "新加坡",
    VIE: "越南", PHI: "菲律宾", KAZ: "哈萨克斯坦", UZB: "乌兹别克斯坦", MGL: "蒙古", AUS: "澳大利亚",
    ENG: "英格兰", FRA: "法国", GER: "德国", NED: "荷兰", SRI: "斯里兰卡", MYA: "缅甸", IRI: "伊朗",
    PAK: "巴基斯坦", BAN: "孟加拉国", NEP: "尼泊尔", QAT: "卡塔尔", KSA: "沙特", UAE: "阿联酋"
  };

  function hasSide(side) {
    return Boolean(String(side?.org || "").trim() || String(side?.name || "").trim());
  }

  /* 官方 Name 字段有时是国家名（"China"），有时是选手名（"SHI Yuqi"）：
     命中这张表就只显示中文国名，否则按「国名 + 选手名」展示。 */
  const NAME_ZH = {
    "china": "中国", "people's republic of china": "中国", "japan": "日本", "korea": "韩国",
    "republic of korea": "韩国", "south korea": "韩国", "dpr korea": "朝鲜", "indonesia": "印尼",
    "malaysia": "马来西亚", "thailand": "泰国", "india": "印度", "chinese taipei": "中国台北",
    "hong kong, china": "中国香港", "hong kong": "中国香港", "macau, china": "中国澳门",
    "macao, china": "中国澳门", "denmark": "丹麦", "singapore": "新加坡", "vietnam": "越南",
    "viet nam": "越南", "philippines": "菲律宾", "kazakhstan": "哈萨克斯坦", "mongolia": "蒙古",
    "bangladesh": "孟加拉国", "australia": "澳大利亚", "england": "英格兰", "france": "法国",
    "germany": "德国", "netherlands": "荷兰", "sri lanka": "斯里兰卡", "myanmar": "缅甸",
    "iran": "伊朗", "pakistan": "巴基斯坦", "nepal": "尼泊尔", "qatar": "卡塔尔",
    "saudi arabia": "沙特", "united arab emirates": "阿联酋", "uzbekistan": "乌兹别克斯坦",
    "bahrain": "巴林", "kuwait": "科威特", "jordan": "约旦", "timor-leste": "东帝汶",
    "brunei darussalam": "文莱", "cambodia": "柬埔寨", "laos": "老挝", "bhutan": "不丹", "maldives": "马尔代夫"
  };

  function sideLabel(side) {
    if (!side) return "待定";
    const org = String(side.org || "").trim();
    const name = String(side.name || "").trim();
    if (!org && !name) return "待定";
    const zh = ORG_ZH[org.toUpperCase()] || "";
    const nameZh = NAME_ZH[name.toLowerCase()];
    if (nameZh) return nameZh;                       // Name 是国家名 → 直接用中文
    if (!name) return zh || org;
    if (!zh) return name;
    if (name === org) return zh;
    return `${zh} ${name}`;                          // 国名 + 选手名，如「中国 SHI Yuqi」
  }

  /* 未开赛但官方已公布对阵时展示「A vs B」 */
  function matchupHtml(event) {
    const home = event.home || {};
    const away = event.away || {};
    if (!hasSide(home) && !hasSide(away)) return "";
    return `
      <span class="matchup">
        <span class="matchup__side${home.winner ? " is-winner" : ""}">${escapeHtml(sideLabel(home))}</span>
        <span class="matchup__vs">vs</span>
        <span class="matchup__side${away.winner ? " is-winner" : ""}">${escapeHtml(sideLabel(away))}</span>
      </span>`;
  }

  function scoreHtml(event) {
    const home = event.home || {};
    const away = event.away || {};
    if (event.status === "cancelled") return `<span class="result result--muted">已取消</span>`;
    if (event.status !== "finished" && event.status !== "live") return matchupHtml(event);
    if (!home.result && !away.result) {
      const pending = `<span class="result result--pending">${event.status === "finished" ? "赛果待更新" : "进行中"}</span>`;
      return (hasSide(home) || hasSide(away)) ? `${matchupHtml(event)}${pending}` : pending;
    }
    return `
      <span class="result${event.status === "finished" ? " is-final" : ""}">
        <span class="result__side${home.winner ? " is-winner" : ""}"><b>${escapeHtml(sideLabel(home))}</b><em>${escapeHtml(home.result || "")}</em></span>
        <span class="result__vs">:</span>
        <span class="result__side${away.winner ? " is-winner" : ""}"><em>${escapeHtml(away.result || "")}</em><b>${escapeHtml(sideLabel(away))}</b></span>
      </span>`;
  }

  function statusTag(event) {
    if (event.status === "live") return `<span class="tag tag--live">进行中</span>`;
    if (event.status === "finished") return `<span class="tag tag--done">已结束</span>`;
    if (event.status === "cancelled") return `<span class="tag tag--muted">已取消</span>`;
    return "";
  }

  function eventRow(event) {
    const highlight = event.chn || (event.focus && event.status !== "finished");
    return `
      <div class="event-row${highlight ? " is-focus" : ""}${event.medal ? " is-medal" : ""}${event.status === "finished" ? " is-done" : ""}${event.chn ? " is-chn" : ""}">
        <div class="event-main">
          ${event.discipline ? `<span class="disc disc--${escapeHtml(DISCIPLINE_CLASS[event.discipline] || "other")}">${escapeHtml(event.discipline)}</span>` : ""}
          <p class="event-main__name">${escapeHtml(event.name || "")}</p>
          <div class="tag-row">
            ${event.stage ? `<span class="tag">${escapeHtml(event.stage)}</span>` : ""}
            ${event.chn ? `<span class="tag tag--chn">🇨🇳 中国队</span>` : (event.focus ? `<span class="tag tag--focus">★ 关注</span>` : "")}
            ${event.medal ? `<span class="tag tag--medal">金牌赛</span>` : ""}
            ${statusTag(event)}
            ${event.court ? `<span class="tag tag--muted">${escapeHtml(event.court)}</span>` : ""}
            ${event.source === "image" ? `<span class="tag tag--muted">原赛程图</span>` : ""}
          </div>
        </div>
        <div class="event-side">${scoreHtml(event)}</div>
      </div>`;
  }

  /* 关注场次统计：用于「已结束自动归档」提示 */
  function focusTally(sessions = state.sessions) {
    let pending = 0;
    let done = 0;
    sessions.forEach((session) => {
      session.events.forEach((event) => {
        if (!event.chn && !event.focus) return;
        if (isDone(event)) done += 1;
        else pending += 1;
      });
    });
    return { pending, done };
  }

  function filterSessions(sessions) {
    if (state.filter === "focus") {
      /* 只留还没结束的中国队 / 关注场次；打完的自动归档到「已结束」 */
      return sessions
        .map((session) => ({ ...session, events: session.events.filter((event) => (event.chn || event.focus) && !isDone(event)) }))
        .filter((session) => session.events.length);
    }
    if (state.filter === "upcoming") {
      return sessions
        .map((session) => ({ ...session, events: session.events.filter((event) => event.status === "upcoming" || event.status === "live") }))
        .filter((session) => session.events.length);
    }
    if (state.filter === "finished") {
      return sessions
        .map((session) => ({ ...session, events: session.events.filter((event) => isDone(event)) }))
        .filter((session) => session.events.length);
    }
    return sessions;
  }

  function renderSchedule() {
    const data = state.data;
    const root = $("#schedule-body");
    if (!root || !data) return;
    const competition = data.competition || {};
    const venue = competition.venue || {};
    const today = todayKey();

    const toolbar = `
      <div class="schedule-toolbar">
        <div class="schedule-status" id="schedule-status"><span class="dot"></span><span>赛程加载中…</span></div>
        <div class="schedule-toolbar__actions">
          <a class="btn-official" href="${escapeHtml(officialDayUrl())}" target="_blank" rel="noopener noreferrer">官方赛程 ↗</a>
          <button type="button" class="btn-refresh" id="schedule-refresh" title="立即同步官方赛程与赛果">↻ 刷新</button>
        </div>
      </div>`;

    const venueCard = `
      <div class="venue-card">
        <div class="venue-card__icon" aria-hidden="true">🏸</div>
        <div class="venue-card__body">
          <p class="venue-card__name">${escapeHtml(venue.nameZh || "")}</p>
          <p class="venue-card__sub">${escapeHtml(venue.areaJa || venue.areaEn || "")}<br>${escapeHtml(venue.nameEn || "")}</p>
          <a class="venue-card__map" href="${escapeHtml(mapsUrl(venue))}" target="_blank" rel="noopener noreferrer">Google Maps 打开 ↗</a>
        </div>
      </div>`;

    const tally = focusTally();
    const totalCount = state.sessions.reduce((sum, session) => sum + session.events.length, 0);
    const upcomingCount = state.sessions.reduce((sum, session) => sum + session.events.filter((event) => event.status === "upcoming" || event.status === "live").length, 0);
    const finishedCount = state.sessions.reduce((sum, session) => sum + session.events.filter((event) => isDone(event)).length, 0);
    const chip = (filter, label, count) => `
      <button type="button" class="chip${state.filter === filter ? " is-active" : ""}" data-filter="${filter}">${label}${count ? `<span class="chip__count">${count}</span>` : ""}</button>`;

    const chips = `
      <div class="chip-row" id="schedule-chips">
        ${chip("focus", "🇨🇳 中国队 / 关注", tally.pending)}
        ${chip("all", "全部", totalCount)}
        ${chip("upcoming", "即将开始", upcomingCount)}
        ${chip("finished", "已结束", finishedCount)}
      </div>`;

    /* 打完的关注场次不再出现在本列表里，给一句说明 + 一键跳转到赛果 */
    let archiveNotice = "";
    if (state.filter === "focus" && tally.done) {
      archiveNotice = `
        <p class="notice notice--done" style="margin:0 0 12px">
          已结束的 <strong>${tally.done}</strong> 场中国队 / 关注比赛已自动归档 —
          <button type="button" class="link-btn" data-filter-jump="finished">到「已结束」看赛果 →</button>
        </p>`;
    }

    const hasChn = state.sessions.some((session) => session.events.some((event) => event.chn));
    let chnNotice = "";
    if (state.live.data && !hasChn) {
      const live = state.live.data;
      const total = live.total || (Array.isArray(live.matches) ? live.matches.length : 0);
      const published = live.rosterCount || 0;
      chnNotice = published
        ? `<p class="notice notice--warn" style="margin:0 0 12px">官方已公布 ${published}/${total} 场对阵，其中暂未出现中国队（中国队多为种子直接进淘汰赛，对阵公布后本页会自动高亮）。当前「🇨🇳 中国队 / 关注」展示的是原赛程图中的关注场次。</p>`
        : `<p class="notice notice--warn" style="margin:0 0 12px">官方尚未公布对阵名单。官网一旦更新对阵 / 选手，本页会自动同步并高亮中国队；当前「🇨🇳 中国队 / 关注」展示的是原赛程图中的关注场次。</p>`;
    }

    const sessions = filterSessions(state.sessions);
    const sessionsHtml = sessions.length
      ? sessions.map((session) => {
          const date = parseLocalDate(session.date);
          const isToday = session.date === today;
          // 排序：中国队 → 关注 → 未开始 → 已结束（已结束自动归档到当日底部）
          const events = [...session.events].sort((a, b) => {
            const rank = (event) => (event.chn ? 0 : (event.focus ? 1 : (event.status === "finished" ? 3 : 2)));
            if (rank(a) !== rank(b)) return rank(a) - rank(b);
            return String(a.timeJst).localeCompare(String(b.timeJst));
          });
          const visible = events.slice(0, VISIBLE_LIMIT);
          const hidden = events.slice(VISIBLE_LIMIT);
          const open = state.expanded.has(session.date);

          const groupHtml = (list) => {
            const groups = [];
            list.forEach((event) => {
              const key = String(event.timeJst || "");
              let group = groups.find((entry) => entry.timeJst === key);
              if (!group) { group = { timeJst: key, events: [] }; groups.push(group); }
              group.events.push(event);
            });
            groups.sort((a, b) => a.timeJst.localeCompare(b.timeJst));
            return groups.map((group) => `
              <div class="time-group">
                <div class="time-group__head">
                  <strong>${escapeHtml(group.timeJst)}</strong>
                  ${group.timeJst ? `<span>北京 ${escapeHtml(toBeijingTime(group.timeJst))}</span>` : ""}
                </div>
                <div class="time-group__body">${group.events.map(eventRow).join("")}</div>
              </div>`).join("");
          };

          return `
            <div class="session">
              <article class="session-card${session.medalDay ? " is-medal" : ""}${isToday ? " is-today" : ""}">
                <div class="session-head">
                  <div class="session-head__date">
                    <strong>${escapeHtml(formatDate(date))}</strong>
                    <span>${escapeHtml(session.weekday || "")}</span>
                  </div>
                  <div class="session-head__title">
                    <h3>${escapeHtml(session.title || "")}</h3>
                    <p>${session.events.length} 场${isToday ? " · 今天" : ""}${session.inTrip ? " · 行程内" : ""}</p>
                  </div>
                  <div class="session-head__tags">
                    ${session.inTrip ? `<span class="badge-trip">行程内</span>` : ""}
                    ${session.medalDay ? `<span class="badge-gold">金牌日</span>` : ""}
                    <a class="session-head__link" href="${escapeHtml(officialDayUrl(session.date))}" target="_blank" rel="noopener noreferrer" title="在官网查看当日赛程">官网 ↗</a>
                  </div>
                </div>
                <div class="event-list">${groupHtml(visible)}</div>
                ${hidden.length ? `
                  <div class="event-list event-list--more"${open ? "" : " hidden"}>${groupHtml(hidden)}</div>
                  <button type="button" class="more-btn" data-date="${escapeHtml(session.date)}">${open ? "收起" : `展开其余 ${hidden.length} 场`}</button>` : ""}
              </article>
            </div>`;
        }).join("")
      : (state.filter === "focus" && tally.done)
        ? `<p class="schedule-empty">关注场次已全部结束。<br><button type="button" class="link-btn" data-filter-jump="finished">到「已结束」看赛果 →</button></p>`
        : `<p class="schedule-empty">当前筛选下没有场次。</p>`;

    const tzNote = competition.timezoneNote
      ? `<p class="notice notice--warn" style="margin-bottom:16px">${escapeHtml(competition.timezoneNote)}</p>`
      : "";

    root.innerHTML = `${toolbar}${venueCard}${tzNote}${chips}${archiveNotice}${chnNotice}${sessionsHtml}`;
    setLiveStatus(state.live.status);

    /* 加 ?. 兜底：工具栏一旦因数据缺失没渲染，这里抛错会中断后面的展开按钮绑定 */
    $("#schedule-chips")?.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-filter]");
      if (!chip) return;
      state.filter = chip.dataset.filter;
      renderSchedule();
    });

    $("#schedule-refresh")?.addEventListener("click", () => loadOfficialSchedule(true));

    /* root 本身不会被 innerHTML 替换，这里必须用覆盖式绑定：
       addEventListener 会在每次 renderSchedule 时累积，点击一次触发 N 次 toggle，偶数次等于没点 */
    root.onclick = (event) => {
      const jump = event.target.closest("[data-filter-jump]");
      if (jump && jump.dataset.filterJump) {
        state.filter = jump.dataset.filterJump;
        renderSchedule();
        return;
      }
      const more = event.target.closest("[data-date]");
      if (!more) return;
      const date = more.dataset.date;
      if (state.expanded.has(date)) state.expanded.delete(date);
      else state.expanded.add(date);
      renderSchedule();
    };
  }

  function renderCountdown() {
    const target = $("#schedule-countdown");
    if (!target) return;
    if (!state.data) { target.textContent = ""; return; }
    const upcoming = [];
    state.sessions.forEach((session) => {
      session.events.forEach((event) => {
        if (event.status === "finished" || event.status === "cancelled" || !event.timeJst) return;
        if (!event.chn && !event.focus) return;
        const start = Date.parse(`${session.date}T${event.timeJst}:00+09:00`);
        if (Number.isFinite(start) && start > Date.now()) upcoming.push({ when: start, name: event.name, session, chn: event.chn });
      });
    });
    upcoming.sort((a, b) => (Number(b.chn) - Number(a.chn)) || (a.when - b.when));
    if (!upcoming.length) { target.textContent = "关注场次已全部结束。"; return; }
    const next = upcoming[0];
    const diff = next.when - Date.now();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    target.innerHTML = `下一场${next.chn ? "中国队" : "关注"}比赛：<strong>${escapeHtml(next.name)}</strong> · ${escapeHtml(next.session.date)} ${escapeHtml(next.session.weekday || "")} — 还有 <strong>${days} 天 ${hours} 小时 ${minutes} 分</strong>`;
  }

  function renderRange() {
    const range = $("#schedule-range");
    if (!range) return;
    if (!state.sessions.length) { range.textContent = ""; return; }
    const dates = state.sessions.map((session) => session.date).sort();
    const total = state.sessions.reduce((sum, session) => sum + session.events.length, 0);
    const chn = state.sessions.reduce((sum, session) => sum + session.events.filter((event) => event.chn).length, 0);
    range.textContent = `${formatDate(parseLocalDate(dates[0]))} – ${formatDate(parseLocalDate(dates[dates.length - 1]))} · ${total} 场${chn ? ` · 中国队 ${chn} 场` : ""}`;
  }

  /* ---------- 住宿 ---------- */
  function renderStays(data) {
    const root = $("#stay-body");
    if (!root) return;
    const stays = Array.isArray(data.stays) ? data.stays : [];
    if (!stays.length) {
      root.innerHTML = `<p class="schedule-empty">住宿待补充。</p>`;
      return;
    }

    root.innerHTML = stays.map((stay) => {
      const enPending = isPending(stay.addressEn);
      const jaPending = isPending(stay.addressJa);
      const notes = Array.isArray(stay.notes) && stay.notes.length
        ? `<ul class="stay-notes">${stay.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`
        : "";
      return `
        <article class="stay-card" data-stay-id="${escapeHtml(stay.id || "")}">
          <div class="stay-card__top">
            <div>
              <span class="stay-card__source">${escapeHtml(stay.source || "住宿")}</span>
              <h3 class="stay-card__name">${escapeHtml(stay.name || "住宿")}</h3>
              ${stay.nameJa ? `<p class="stay-card__nameJa">${escapeHtml(stay.nameJa)}</p>` : ""}
            </div>
          </div>

          <div class="stay-dates">
            <div class="stay-dates__col">
              <span class="stay-dates__label">CHECK-IN</span>
              <span class="stay-dates__value">${escapeHtml(stay.checkIn || "待补充")}</span>
            </div>
            <div class="stay-dates__col">
              <span class="stay-dates__label">CHECK-OUT</span>
              <span class="stay-dates__value">${escapeHtml(stay.checkOut || "待补充")}</span>
            </div>
            ${stay.nights ? `<span class="stay-dates__nights">${escapeHtml(stay.nights)} 晚</span>` : ""}
          </div>

          <div class="addr-block">
            <div class="addr-block__head">
              <span class="addr-block__lang">ENGLISH</span>
              <button type="button" class="copy-btn" data-copy="${escapeHtml(stay.addressEn || "")}">复制</button>
            </div>
            <p class="addr-block__text${enPending ? " is-pending" : ""}">${escapeHtml(stay.addressEn || "待补充")}</p>
          </div>

          <div class="addr-block">
            <div class="addr-block__head">
              <span class="addr-block__lang">日本語</span>
              <button type="button" class="copy-btn" data-copy="${escapeHtml(stay.addressJa || "")}">复制</button>
            </div>
            <p class="addr-block__text${jaPending ? " is-pending" : ""}">${escapeHtml(stay.addressJa || "未設定")}</p>
          </div>

          <div class="stay-actions">
            <a class="btn-map" href="${escapeHtml(mapsUrl(stay))}" target="_blank" rel="noopener noreferrer">在 Google Maps 打开 ↗</a>
          </div>
          ${notes}
        </article>`;
    }).join("");

    /* 同样用覆盖式绑定，避免重复渲染后复制按钮被多次处理（会残留「已复制」） */
    root.onclick = async (event) => {
      const button = event.target.closest("[data-copy]");
      if (!button) return;
      const text = button.dataset.copy || "";
      if (!text || isPending(text)) return;
      await copyText(text);
      const original = button.textContent;
      button.textContent = "已复制";
      button.classList.add("is-done");
      window.setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-done");
      }, 1600);
    };
  }

  /* ---------- 启动 ---------- */
  function render(data) {
    state.data = data;
    buildSessions();               // 先用本地赛程渲染，保证秒开
    renderStays(data);
    loadOfficialSchedule(false);   // 再拉官方数据覆盖（含赛果）
  }

  document.addEventListener("travel-data-ready", (event) => render(event.detail));
  if (window.TRAVEL_PLAN_DATA) render(window.TRAVEL_PLAN_DATA);

  window.setInterval(() => { if (state.data) renderCountdown(); }, 30000);
  window.setInterval(maybeAutoRefresh, 60000);   // 每晚 22:00 自动刷新一次
  /* 每分钟：跨入新比赛日就回源刷新一次；并按时间把打完的比赛归档到「已结束」 */
  window.setInterval(() => {
    if (!state.data) return;
    maybeDayRolloverRefresh();
    reconcileStatuses();
  }, STATUS_EVAL_MS);
  startAutoSync();                               // 页面可见时每 3 分钟静默比对，官方一更新即同步
})();
