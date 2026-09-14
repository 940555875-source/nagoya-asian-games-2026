/* 横向导航栏：滚动高亮 + 当前栏目自动居中 */
(() => {
  "use strict";

  const NAV_IDS = ["flights", "schedule", "stay", "phrase", "weather", "fx", "prep"];
  let frame = 0;

  function navLinks() {
    return Array.from(document.querySelectorAll("#section-nav a[data-nav]"));
  }

  function visibleIds() {
    return NAV_IDS.filter((id) => {
      const section = document.getElementById(id);
      return section && !section.hidden;
    });
  }

  function currentId() {
    if (document.body.dataset.activeView === "ledger") return "ledger";

    const topbar = document.querySelector(".topbar");
    const nav = document.querySelector("#section-nav");
    const line = (topbar?.offsetHeight || 48) + (nav?.offsetHeight || 50) + 20;

    let active = "";
    visibleIds().forEach((id) => {
      const rect = document.getElementById(id).getBoundingClientRect();
      if (rect.top <= line) active = id;
    });

    // 滚到最底部时高亮最后一项
    const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 8;
    const ids = visibleIds();
    if (atBottom && ids.length) active = ids[ids.length - 1];
    return active || (ids.length ? ids[0] : "");
  }

  function apply() {
    if (document.hidden) return;
    const active = currentId();
    navLinks().forEach((link) => {
      const on = link.dataset.nav === active;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });

    const inner = document.querySelector("#section-nav .section-nav__inner");
    const activeLink = navLinks().find((link) => link.classList.contains("is-active"));
    if (inner && activeLink && inner.scrollWidth > inner.clientWidth + 4) {
      const left = activeLink.offsetLeft - (inner.clientWidth - activeLink.offsetWidth) / 2;
      inner.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  }

  function setup() {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", () => window.setTimeout(schedule, 80));
    document.addEventListener("travel-data-ready", () => window.setTimeout(schedule, 150));
    schedule();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
