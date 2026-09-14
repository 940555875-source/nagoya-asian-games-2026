/* 赛程 & 住宿板块渲染 —— 名古屋亚运 2026 */
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
    "单打": "ms"
  };
  const state = { filter: "all", data: null };

  /* ---------- 工具 ---------- */
  function isFocusEvent(event, focusEvents = []) {
    if (event.focus === true) return true;
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

  /* ---------- 赛程 ---------- */
  function renderSchedule(data) {
    const competition = data.competition;
    const root = $("#schedule-body");
    if (!root) return;
    if (!competition || !Array.isArray(competition.sessions) || !competition.sessions.length) {
      root.innerHTML = `<p class="schedule-empty">赛程待补充。</p>`;
      return;
    }

    const range = $("#schedule-range");
    if (range) range.textContent = competition.dateRange || "";

    const venue = competition.venue || {};
    const focusEvents = competition.focusEvents || [];
    const tripStart = data.trip?.startDate || "";
    const tripEnd = data.trip?.endDate || "";
    const outsideTrip = (date) => Boolean(tripStart && tripEnd && (date < tripStart || date > tripEnd));
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    let sessions = competition.sessions;
    if (state.filter === "focus") {
      sessions = sessions
        .map((session) => ({ ...session, events: session.events.filter((event) => isFocusEvent(event, focusEvents)) }))
        .filter((session) => session.events.length);
    } else if (state.filter === "medal") {
      sessions = sessions.filter((session) => session.medalDay);
    } else if (state.filter === "trip") {
      sessions = sessions.filter((session) => !outsideTrip(session.date));
    }

    const venueCard = `
      <div class="venue-card">
        <div class="venue-card__icon" aria-hidden="true">🏸</div>
        <div class="venue-card__body">
          <p class="venue-card__name">${escapeHtml(venue.nameZh || "")}</p>
          <p class="venue-card__sub">${escapeHtml(venue.areaJa || venue.areaEn || "")}<br>${escapeHtml(venue.nameEn || "")}</p>
          <a class="venue-card__map" href="${escapeHtml(mapsUrl(venue))}" target="_blank" rel="noopener noreferrer">Google Maps 打开 ↗</a>
        </div>
      </div>`;

    const sessionsHtml = sessions.length
      ? sessions.map((session) => {
          const date = parseLocalDate(session.date);
          const isToday = session.date === todayKey;
          const isOutside = outsideTrip(session.date);

          // 同一开赛时间下的多场次合并成一个时间组
          const groups = [];
          session.events.forEach((event) => {
            const key = String(event.timeJst || "");
            let group = groups.find((entry) => entry.timeJst === key);
            if (!group) { group = { timeJst: key, events: [] }; groups.push(group); }
            group.events.push(event);
          });
          groups.sort((a, b) => a.timeJst.localeCompare(b.timeJst));

          const eventsHtml = groups.map((group) => {
            const beijing = toBeijingTime(group.timeJst);
            const rows = group.events.map((event) => {
              const ceremony = event.type === "ceremony";
              const focus = !ceremony && isFocusEvent(event, focusEvents);
              return `
                <div class="event-row${focus ? " is-focus" : ""}${event.medal ? " is-medal" : ""}${ceremony ? " is-ceremony" : ""}">
                  <div class="event-main">
                    ${event.discipline ? `<span class="disc disc--${escapeHtml(DISCIPLINE_CLASS[event.discipline] || "other")}">${escapeHtml(event.discipline)}</span>` : ""}
                    <p class="event-main__name">${escapeHtml(event.name || "")}</p>
                    <div class="tag-row">
                      ${event.stage ? `<span class="tag">${escapeHtml(event.stage)}</span>` : ""}
                      ${focus ? `<span class="tag tag--focus">★ 关注</span>` : ""}
                      ${event.medal ? `<span class="tag tag--medal">金牌赛</span>` : ""}
                    </div>
                  </div>
                </div>`;
            }).join("");
            return `
              <div class="time-group">
                <div class="time-group__head">
                  <strong>${escapeHtml(group.timeJst)}</strong>
                  ${beijing ? `<span>北京 ${escapeHtml(beijing)}</span>` : ""}
                </div>
                <div class="time-group__body">${rows}</div>
              </div>`;
          }).join("");

          return `
            <div class="session">
              <article class="session-card${session.medalDay ? " is-medal" : ""}${isToday ? " is-today" : ""}${isOutside ? " is-outside" : ""}">
                <div class="session-head">
                  <div class="session-head__date">
                    <strong>${escapeHtml(formatDate(date))}</strong>
                    <span>${escapeHtml(session.weekday || "")}</span>
                  </div>
                  <div class="session-head__title">
                    <h3>${escapeHtml(session.title || "")}</h3>
                    <p>${session.events.length} 场${isToday ? " · 今天" : ""}${isOutside ? " · 不在行程内" : ""}</p>
                  </div>
                  ${isOutside ? `<span class="badge-outside">行程外</span>` : ""}
                  ${session.medalDay ? `<span class="badge-gold">金牌日</span>` : ""}
                </div>
                <div class="event-list">${eventsHtml}</div>
              </article>
            </div>`;
        }).join("")
      : `<p class="schedule-empty">当前筛选下没有场次。</p>`;

    const tzNote = competition.timezoneNote
      ? `<p class="notice notice--warn" style="margin-bottom:16px">${escapeHtml(competition.timezoneNote)}</p>`
      : "";

    root.innerHTML = `${venueCard}${tzNote}<div class="chip-row" id="schedule-chips">
        <button type="button" class="chip${state.filter === "all" ? " is-active" : ""}" data-filter="all">全部</button>
        <button type="button" class="chip${state.filter === "focus" ? " is-active" : ""}" data-filter="focus">★ 男团 / 男双</button>
        <button type="button" class="chip${state.filter === "medal" ? " is-active" : ""}" data-filter="medal">金牌日</button>
        <button type="button" class="chip${state.filter === "trip" ? " is-active" : ""}" data-filter="trip">我的行程内</button>
      </div>${sessionsHtml}`;

    const chips = $("#schedule-chips");
    chips.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-filter]");
      if (!chip) return;
      state.filter = chip.dataset.filter;
      renderSchedule(state.data);
    });
  }

  function renderCountdown(data) {
    const target = $("#schedule-countdown");
    if (!target) return;
    const competition = data.competition;
    if (!competition) { target.textContent = ""; return; }
    const focusEvents = competition.focusEvents || [];
    const tripStart = data.trip?.startDate || "";
    const tripEnd = data.trip?.endDate || "";
    const inTrip = (date) => !tripStart || !tripEnd || (date >= tripStart && date <= tripEnd);
    const upcoming = [];
    competition.sessions.forEach((session) => {
      session.events.forEach((event) => {
        if (event.type === "ceremony" || !isFocusEvent(event, focusEvents) || !event.timeJst) return;
        const when = parseLocalDate(session.date, event.timeJst);
        if (when.getTime() > Date.now()) upcoming.push({ when, name: event.name, session, inTrip: inTrip(session.date) });
      });
    });
    // 优先倒计时「行程内」的关注场次
    const scoped = upcoming.filter((entry) => entry.inTrip);
    const pool = scoped.length ? scoped : upcoming;
    pool.sort((a, b) => a.when - b.when);
    if (!pool.length) { target.textContent = "关注场次已全部结束。"; return; }
    const next = pool[0];
    const diff = next.when - Date.now();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    target.innerHTML = `下一场关注比赛：<strong>${escapeHtml(next.name)}</strong> · ${escapeHtml(next.session.date)} ${escapeHtml(next.session.weekday)} — 还有 <strong>${days} 天 ${hours} 小时 ${minutes} 分</strong>`;
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

    root.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-copy]");
      if (!button) return;
      const text = button.dataset.copy || "";
      if (!text || isPending(text)) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      const original = button.textContent;
      button.textContent = "已复制";
      button.classList.add("is-done");
      window.setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-done");
      }, 1600);
    });
  }

  /* ---------- 启动 ---------- */
  function render(data) {
    state.data = data;
    renderSchedule(data);
    renderCountdown(data);
    renderStays(data);
  }

  document.addEventListener("travel-data-ready", (event) => render(event.detail));
  if (window.TRAVEL_PLAN_DATA) render(window.TRAVEL_PLAN_DATA);
  window.setInterval(() => { if (state.data) renderCountdown(state.data); }, 30000);
})();
