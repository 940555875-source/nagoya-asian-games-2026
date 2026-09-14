/* 天气预报 + 汇率（实时拉取，带本地缓存与降级） */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const WMO = {
    0: ["晴", "☀️"], 1: ["大部晴朗", "🌤️"], 2: ["局部多云", "⛅"], 3: ["阴", "☁️"],
    45: ["雾", "🌫️"], 48: ["冻雾", "🌫️"],
    51: ["小毛毛雨", "🌦️"], 53: ["毛毛雨", "🌦️"], 55: ["大毛毛雨", "🌧️"],
    56: ["冻毛毛雨", "🌧️"], 57: ["冻毛毛雨", "🌧️"],
    61: ["小雨", "🌧️"], 63: ["中雨", "🌧️"], 65: ["大雨", "🌧️"],
    66: ["冻雨", "🌧️"], 67: ["冻雨", "🌧️"],
    71: ["小雪", "🌨️"], 73: ["中雪", "🌨️"], 75: ["大雪", "❄️"], 77: ["米雪", "🌨️"],
    80: ["小阵雨", "🌦️"], 81: ["中阵雨", "🌧️"], 82: ["强阵雨", "⛈️"],
    85: ["小阵雪", "🌨️"], 86: ["大阵雪", "❄️"],
    95: ["雷阵雨", "⛈️"], 96: ["雷阵雨伴冰雹", "⛈️"], 99: ["雷暴伴冰雹", "⛈️"]
  };

  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weatherCacheKey = "nagoya-2026:weather";
  const fxCacheKey = "nagoya-2026:fx";

  function readCache(key, maxAgeMs) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.at) return null;
      if (Date.now() - Date.parse(parsed.at) > maxAgeMs) return null;
      return parsed;
    } catch { return null; }
  }

  function writeCache(key, payload) {
    try { localStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), payload })); } catch { /* 忽略 */ }
  }

  function shortDate(iso) {
    const [, month, day] = String(iso).split("-");
    return `${Number(month)}/${Number(day)}`;
  }

  function weekdayOf(iso) {
    const [y, m, d] = String(iso).split("-").map(Number);
    return WEEKDAYS[new Date(y, m - 1, d).getDay()];
  }

  function dayDiff(a, b) {
    return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
  }

  /* ---------------- 天气 ---------------- */
  function renderWeatherState(html) {
    const root = $("#weather-body");
    if (root) root.innerHTML = html;
  }

  function weatherSkeleton() {
    renderWeatherState(`<div class="live-loading">正在获取天气预报…</div>`);
  }

  function renderWeather(days, meta) {
    if (!days || !days.length) {
      renderWeatherState(`<div class="live-empty">暂时取不到预报数据。Open-Meteo 只提供未来约 16 天，出发前请刷新页面查看。</div>`);
      return;
    }
    const cards = days.map((day) => {
      const [text, icon] = WMO[day.code] || ["—", "🌡️"];
      const rain = Number.isFinite(day.pop) ? day.pop : null;
      return `
        <div class="wx-card${day.today ? " is-today" : ""}">
          <div class="wx-card__date">
            <strong>${escapeHtml(shortDate(day.date))}</strong>
            <span>${escapeHtml(weekdayOf(day.date))}</span>
          </div>
          <div class="wx-card__icon" aria-hidden="true">${icon}</div>
          <div class="wx-card__desc">${escapeHtml(text)}</div>
          <div class="wx-card__temp">
            <strong>${escapeHtml(String(Math.round(day.max)))}°</strong>
            <span>${escapeHtml(String(Math.round(day.min)))}°</span>
          </div>
          ${rain !== null ? `<div class="wx-card__rain${rain >= 50 ? " is-high" : ""}">降水 ${escapeHtml(String(rain))}%</div>` : ""}
        </div>`;
    }).join("");

    renderWeatherState(`
      <div class="wx-strip">${cards}</div>
      <p class="live-meta">${escapeHtml(meta.label)} · 更新于 ${escapeHtml(meta.updatedAt)} · ${escapeHtml(meta.note)}</p>`);
  }

  async function loadWeather(trip, config) {
    weatherSkeleton();
    const settings = config || {};
    const start = trip.startDate;
    const end = trip.endDate;
    if (!start || !end) {
      renderWeatherState(`<div class="live-empty">缺少行程日期，无法获取预报。</div>`);
      return;
    }

    const cached = readCache(weatherCacheKey, 6 * 3600 * 1000);
    if (cached && cached.payload?.days?.length) {
      renderWeather(cached.payload.days, cached.payload.meta);
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    // Open-Meteo 只提供约 16 天预报，超出范围时按可用区间裁剪
    const limit = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
    const fetchEnd = end > limit ? limit : end;
    const fetchStart = start > todayIso ? start : todayIso;

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(settings.latitude));
    url.searchParams.set("longitude", String(settings.longitude));
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
    url.searchParams.set("timezone", settings.timezone || "Asia/Tokyo");
    url.searchParams.set("start_date", fetchStart);
    url.searchParams.set("end_date", fetchEnd);

    try {
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const times = data?.daily?.time || [];
      const days = times
        .map((date, index) => ({
          date,
          code: data.daily.weather_code?.[index],
          max: data.daily.temperature_2m_max?.[index],
          min: data.daily.temperature_2m_min?.[index],
          pop: data.daily.precipitation_probability_max?.[index],
          today: date === todayIso
        }))
        .filter((day) => day.date >= start && day.date <= end);
      const meta = {
        label: settings.label || "目的地",
        updatedAt: new Date().toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        note: settings.note || ""
      };
      writeCache(weatherCacheKey, { days, meta });
      renderWeather(days, meta);
    } catch (error) {
      console.warn("天气数据获取失败", error);
      const stale = readCache(weatherCacheKey, 7 * 24 * 3600 * 1000);
      if (stale?.payload?.days?.length) {
        renderWeather(stale.payload.days, { ...stale.payload.meta, note: "（离线缓存）" + (stale.payload.meta.note || "") });
      } else {
        renderWeatherState(`<div class="live-empty">天气数据获取失败，请检查网络后刷新页面。</div>`);
      }
    }
  }

  /* ---------------- 汇率 ---------------- */
  function renderFx(html) {
    const root = $("#fx-body");
    if (root) root.innerHTML = html;
  }

  function renderFxState(state) {
    const symbols = state.symbols || ["CNY"];
    const amount = state.baseAmount || 100;
    const main = symbols[0];
    const rows = symbols.map((symbol) => `
      <div class="fx-row">
        <span class="fx-row__pair">${escapeHtml(state.base)} ${escapeHtml(String(amount))} =</span>
        <strong class="fx-row__value">${escapeHtml(String((state.rates[symbol] * amount).toFixed(symbol === "JPY" ? 0 : 2)))} ${escapeHtml(symbol)}</strong>
      </div>`).join("");

    renderFx(`
      <div class="fx-card">
        <div class="fx-card__head">
          <span class="fx-card__badge">T-1</span>
          <span class="fx-card__date">${escapeHtml(state.date)}（${escapeHtml(weekdayOf(state.date))}）</span>
        </div>
        <div class="fx-card__main">
          <span class="fx-card__base">${escapeHtml(state.base)} ${escapeHtml(String(amount))}</span>
          <span class="fx-card__arrow" aria-hidden="true">→</span>
          <strong class="fx-card__quote">${escapeHtml(String((state.rates[main] * amount).toFixed(2)))} ${escapeHtml(main)}</strong>
        </div>
        <div class="fx-card__rows">${rows}</div>
        <div class="fx-converter">
          <label for="fx-input">快速换算</label>
          <div class="fx-converter__row">
            <input id="fx-input" type="number" inputmode="numeric" min="0" step="100" value="10000" aria-label="日元金额">
            <span class="fx-converter__unit">JPY</span>
          </div>
          <div class="fx-converter__out" id="fx-output"></div>
        </div>
        <p class="live-meta">${escapeHtml(state.note)}</p>
      </div>`);

    const input = $("#fx-input");
    const output = $("#fx-output");
    if (!input || !output) return;
    const update = () => {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value <= 0) { output.textContent = ""; return; }
      output.innerHTML = symbols.map((symbol) => {
        const converted = value * state.rates[symbol];
        return `<span><em>${escapeHtml(symbol)}</em>${escapeHtml(converted.toFixed(symbol === "JPY" ? 0 : 2))}</span>`;
      }).join("");
    };
    input.addEventListener("input", update);
    update();
  }

  async function loadFx(config) {
    const settings = config || {};
    const base = settings.base || "JPY";
    const symbols = settings.symbols || ["CNY"];
    const baseAmount = settings.baseAmount || 100;
    const note = settings.note || "";

    renderFx(`<div class="live-loading">正在获取汇率…</div>`);

    const cached = readCache(fxCacheKey, 12 * 3600 * 1000);
    if (cached?.payload?.rates) { renderFxState(cached.payload); return; }

    // T-1：取昨天的日期，Frankfurter 会回落到最近一个工作日
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const build = (path) => `https://api.frankfurter.dev/v1/${path}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbols.join(","))}`;

    try {
      let response = await fetch(build(yesterday));
      if (!response.ok) response = await fetch(build("latest"));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const rates = data?.rates || {};
      if (!symbols.every((symbol) => Number.isFinite(Number(rates[symbol])))) throw new Error("缺少汇率字段");
      const state = { base, symbols, baseAmount, date: String(data.date || yesterday), rates, note };
      writeCache(fxCacheKey, state);
      renderFxState(state);
    } catch (error) {
      console.warn("汇率获取失败", error);
      const stale = readCache(fxCacheKey, 14 * 24 * 3600 * 1000);
      if (stale?.payload?.rates) {
        renderFxState({ ...stale.payload, note: "（离线缓存）" + (stale.payload.note || "") });
      } else {
        renderFx(`<div class="live-empty">汇率获取失败，请检查网络后刷新页面。</div>`);
      }
    }
  }

  /* ---------------- 启动 ---------------- */
  function start(data) {
    const live = data.live || {};
    const range = $("#weather-range");
    if (range && data.trip?.startDate && data.trip?.endDate) {
      range.textContent = `${shortDate(data.trip.startDate)} — ${shortDate(data.trip.endDate)}`;
    }
    if ($("#weather-body")) loadWeather(data.trip || {}, live.weather);
    if ($("#fx-body")) loadFx(live.fx);
  }

  document.addEventListener("travel-data-ready", (event) => start(event.detail));
  if (window.TRAVEL_PLAN_DATA) start(window.TRAVEL_PLAN_DATA);
})();
