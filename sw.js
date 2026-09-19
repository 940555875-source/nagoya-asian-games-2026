/* 名古屋亚运观赛页 Service Worker —— 支持离线打开与弱网兜底
 * 策略：
 *   - 页面导航：network-first，失败回退缓存的 index.html（离线也能打开整页）
 *   - /api/badminton*：network-first，失败回退最近一次成功的响应（离线时展示最后一次同步的赛程/赛果）
 *   - 其余同源 GET 静态资源（含 trip-data.json）：stale-while-revalidate（先给缓存，后台更新）
 *   - 跨域请求（翻译 API、Tesseract CDN、地图等）与所有非 GET：直接放行，不拦截不缓存
 * 版本：改任何静态资源后把 CACHE 里的版本号 +1，activate 时自动清掉旧缓存。
 */
const CACHE = "nagoya-2026-v1";
const PRECACHE = [
  "./",
  "index.html",
  "trip-data.json",
  "styles.css",
  "ledger.css",
  "sections.css",
  "app.js",
  "ledger.js",
  "sections.js",
  "live.js",
  "navbar.js",
  "translate.js",
  "site-navigation.js",
  "runtime-storage.js",
  "route-ui.js",
  "overview-map.js",
  "ticket-pdf-preview.js",
  "manifest.webmanifest",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 逐个缓存，单个失败不阻断安装（比如某资源暂时 404）
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: "reload" })); // 绕过 HTTP 缓存拿最新
      } catch (error) { /* 忽略单个资源失败 */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 跨域放行

  // API：network-first + 缓存兜底（离线时展示最后一次同步的数据）
  if (url.pathname.startsWith("/api/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: "offline", offline: true }), {
          status: 503,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }
    })());
    return;
  }

  // 页面导航：network-first，离线回退 index.html（hash 路由由前端处理）
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put("./index.html", response.clone());
        return response;
      } catch (error) {
        return (await cache.match("./index.html")) || (await cache.match("./")) ||
          new Response("离线且无缓存", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  // 其余同源静态资源：stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    const network = fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    }).catch(() => undefined);
    return cached || (await network) || new Response("", { status: 504 });
  })());
});
