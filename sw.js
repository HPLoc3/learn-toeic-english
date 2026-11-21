/* sw.js - service worker của Từng Bước English.
 * Chỉ lưu file của chính trang này vào bộ nhớ đệm của trình duyệt để học được khi không có mạng.
 * Không gửi dữ liệu đi đâu, không đụng request khác nguồn, không đụng localStorage.
 * Mỗi lần deploy có file precache đổi: sửa VERSION rồi chạy `node tools/check-sw.mjs --write`.
 */
// content-hash: 33@bcae4638ade7996e
"use strict";

var VERSION = "33";
var PREFIX = "tb-";
var CACHE = PREFIX + VERSION;
var NAV_TIMEOUT = 3000;

/* Danh sách precache (đường dẫn tương đối so với thư mục gốc của site). tools/check-sw.mjs so khớp với đĩa. */
/* Gồm khung trang và mọi unit available:true trong data/catalog.js (data, game, data/<id>-anim.js khi anim:true, hình). check-sw.mjs sinh/kiểm theo catalog. */
var PRECACHE = [
  "404.html",
  "assets/css/backup.css",
  "assets/css/game.css",
  "assets/css/home-extra.css",
  "assets/css/hud.css",
  "assets/css/learn.css",
  "assets/css/mascot.css",
  "assets/css/nav.css",
  "assets/css/pwa.css",
  "assets/css/review.css",
  "assets/css/site.css",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/icon.svg",
  "assets/img/l01/pic/focus-800.webp",
  "assets/img/l01/pic/mc1-800.webp",
  "assets/img/l01/mc2.svg",
  "assets/img/l01/mc3.svg",
  "assets/img/l01/mc4.svg",
  "assets/img/l01/scene/duo-cafe-800.webp",
  "assets/img/l01/scene/hanh-point-800.webp",
  "assets/img/l01/scene/hanh-wear-800.webp",
  "assets/img/l01/scene/mai-look-800.webp",
  "assets/img/l01/scene/mai-type-800.webp",
  "assets/img/l01/scene/nam-pour-800.webp",
  "assets/img/l01/scene/nam-wipe-800.webp",
  "assets/img/l01/tf1.svg",
  "assets/img/l01/tf2.svg",
  "assets/img/l02/mc2.svg",
  "assets/img/l02/mc3.svg",
  "assets/img/l02/scene/duo-flowers-800.webp",
  "assets/img/l02/scene/duo-meeting-800.webp",
  "assets/img/l02/scene/duo-shake-800.webp",
  "assets/img/l02/scene/duo-walk-800.webp",
  "assets/img/l02/scene/group-outro-800.webp",
  "assets/img/l02/scene/nam-serve-800.webp",
  "assets/img/l02/scene/trio-line-800.webp",
  "assets/img/l02/tf1.svg",
  "assets/img/l03/focus.svg",
  "assets/img/l03/mc1.svg",
  "assets/img/l03/mc2.svg",
  "assets/img/l03/mc3.svg",
  "assets/img/l03/mc4.svg",
  "assets/img/l03/scene/obj-bike-800.webp",
  "assets/img/l03/scene/obj-books-800.webp",
  "assets/img/l03/scene/obj-boxes-800.webp",
  "assets/img/l03/scene/obj-cars-800.webp",
  "assets/img/l03/scene/obj-lamp-800.webp",
  "assets/img/l03/scene/obj-outro-800.webp",
  "assets/img/l03/scene/obj-table-800.webp",
  "assets/img/l03/tf1.svg",
  "assets/img/l03/tf2.svg",
  "assets/img/l04/focus.svg",
  "assets/img/l04/mc1.svg",
  "assets/img/l04/mc2.svg",
  "assets/img/l04/mc3.svg",
  "assets/img/l04/mc4.svg",
  "assets/img/l04/scene/scn-boat-800.webp",
  "assets/img/l04/scene/scn-bridge-800.webp",
  "assets/img/l04/scene/scn-harbor-800.webp",
  "assets/img/l04/scene/scn-mountains-800.webp",
  "assets/img/l04/scene/scn-outro-800.webp",
  "assets/img/l04/scene/scn-road-800.webp",
  "assets/img/l04/scene/scn-trees-800.webp",
  "assets/img/l04/tf1.svg",
  "assets/img/l04/tf2.svg",
  "assets/js/anim-cast.js",
  "assets/js/anim-engine.js",
  "assets/js/anim-rig.js",
  "assets/js/anim-scenes.js",
  "assets/js/backup.js",
  "assets/js/core.js",
  "assets/js/flashcards.js",
  "assets/js/fx.js",
  "assets/js/game.js",
  "assets/js/home.js",
  "assets/js/lesson.js",
  "assets/js/loader.js",
  "assets/js/mascot.js",
  "assets/js/pwa.js",
  "assets/js/quiz.js",
  "assets/js/review.js",
  "assets/js/srs.js",
  "data/catalog.js",
  "data/l01-anim.js",
  "data/l01-game.js",
  "data/l01.js",
  "data/l02-anim.js",
  "data/l02-game.js",
  "data/l02.js",
  "data/l03-anim.js",
  "data/l03-game.js",
  "data/l03.js",
  "data/l04-anim.js",
  "data/l04-game.js",
  "data/l04.js",
  "favicon.ico",
  "index.html",
  "manifest.webmanifest",
  "review.html",
  "unit.html"
];

/* Tên trang chuẩn: mọi cách gọi (/, /unit, /unit.html?u=l01 ...) quy về một khóa. */
var PAGES = {
  "": "index.html",
  "index": "index.html",
  "index.html": "index.html",
  "unit": "unit.html",
  "unit.html": "unit.html",
  "review": "review.html",
  "review.html": "review.html",
  "404.html": "404.html"
};

function scopeUrl() {
  try { return new URL(self.registration.scope); } catch (e) { return new URL(self.location.href); }
}
function scopePath() {
  var p = scopeUrl().pathname;
  return p.charAt(p.length - 1) === "/" ? p : p.replace(/[^\/]*$/, "");
}
function abs(rel) { return new URL(rel, scopeUrl().origin + scopePath()).href; }

/* Trả về tên trang chuẩn (index.html ...) hoặc null nếu không phải trang đã biết. Bỏ query/hash. */
function pageName(url) {
  var base = scopePath();
  var p = url.pathname;
  if (p.indexOf(base) !== 0) return null;
  var rest = p.slice(base.length);
  return Object.prototype.hasOwnProperty.call(PAGES, rest) ? PAGES[rest] : null;
}

function inScope(url) {
  return url.origin === scopeUrl().origin && url.pathname.indexOf(scopePath()) === 0;
}

function header(res, name) {
  try { return (res.headers.get(name) || "").toLowerCase(); } catch (e) { return ""; }
}
function isHtml(res) { return header(res, "content-type").indexOf("text/html") >= 0; }

/* Response đã qua redirect không được dùng để trả lời navigation: dựng lại bản "sạch". */
async function clean(res) {
  if (!res.redirected) return res;
  var body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: new Headers(res.headers) });
}

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(function () { resolve(undefined); }, ms); });
}

async function precacheAll() {
  var jobs = PRECACHE.map(async function (rel) {
    var res = await fetch(abs(rel), { cache: "reload" });
    if (!(res.ok && res.type === "basic")) throw new Error("precache: " + rel + " -> " + res.status + " " + res.type);
    return [abs(rel), await clean(res)];
  });
  var all = await Promise.all(jobs); /* một file hỏng thì cả lượt cài hủy, chưa ghi gì */
  var cache = await caches.open(CACHE);
  for (var i = 0; i < all.length; i++) await cache.put(all[i][0], all[i][1]);
}

async function purgeOld() {
  var keys = await caches.keys();
  var old = keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; });
  if (old.length) {
    /* chép mục lưu lúc chạy (dữ liệu unit mới mở, ...) sang cache mới trước khi xóa; mục có sẵn ở cache mới được giữ */
    try {
      var cur = await caches.open(CACHE);
      for (var i = 0; i < old.length; i++) {
        var oc = await caches.open(old[i]);
        var reqs = await oc.keys();
        for (var j = 0; j < reqs.length; j++) {
          var rurl = typeof reqs[j] === "string" ? reqs[j] : reqs[j].url;
          if (await cur.match(rurl)) continue;
          /* ảnh HD (img-hd/) không chép sang bản mới: có thể là ảnh tạm của bản cũ; ngoại tuyến đã có ảnh 800w precache */
          if (/\/assets\/img-hd\//.test(rurl)) continue;
          var r = await oc.match(rurl);
          if (r) await cur.put(rurl, r);
        }
      }
    } catch (e) { /* không chép được thì vẫn dọn cache cũ */ }
  }
  await Promise.all(old.map(function (k) { return caches.delete(k); }));
  if (self.clients && self.clients.claim) await self.clients.claim();
}

async function notFoundPage(cache) {
  var nf = await cache.match(abs("404.html"));
  if (nf) {
    var body = await nf.blob();
    return new Response(body, { status: 404, statusText: "Not Found", headers: new Headers(nf.headers) });
  }
  return new Response("Không có mạng và trang này chưa được lưu.", {
    status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

function storable(res) {
  return res.status === 200 && res.type === "basic" && !isHtml(res);
}

async function remember(cache, key, res, copy) {
  try {
    if (key && res.status === 200 && res.type === "basic" && isHtml(res)) {
      await cache.put(abs(key), await clean(copy || res));
    }
  } catch (e) { /* bỏ qua */ }
}

async function navigate(event) {
  var req = event.request;
  var url = new URL(req.url);
  var key = pageName(url);
  var cache = await caches.open(CACHE);
  var netP = fetch(req).then(function (r) { return r; }, function () { return null; });
  var res = await Promise.race([netP, delay(NAV_TIMEOUT)]);
  if (res === undefined) { /* quá 3 giây: dùng bản đã lưu nếu có, mạng vẫn chạy ngầm để cập nhật */
    var quick = key ? await cache.match(abs(key)) : null;
    if (quick) {
      event.waitUntil(netP.then(function (r) { return r ? remember(cache, key, r) : null; }));
      return quick;
    }
    res = await netP;
  }
  if (res) {
    if (res.type === "opaqueredirect") return res; /* trình duyệt tự theo redirect (vd Pages 308) */
    if (res.status === 404) return res; /* trả nguyên, không lưu */
    if (res.ok) {
      event.waitUntil(remember(cache, key, res, res.clone()));
      return res;
    }
    var fallback = key ? await cache.match(abs(key)) : null;
    return fallback || res;
  }
  /* ngoại tuyến */
  var cached = await cache.match(key ? abs(key) : req.url);
  return cached || notFoundPage(cache);
}

/* Ảnh/icon: stale-while-revalidate (ít đổi, không gây lệch phiên bản). */
async function assetSwr(event) {
  var req = event.request;
  var cache = await caches.open(CACHE);
  var cached = await cache.match(req.url);
  var update = fetch(req).then(async function (res) {
    if (storable(res)) {
      try { await cache.put(req.url, res.clone()); } catch (e) { /* bỏ qua */ }
    }
    return res;
  });
  if (cached) {
    event.waitUntil(update.catch(function () { return null; }));
    return cached;
  }
  return update;
}

/* CSS/JS/data: network-first (timeout 3 giây) rồi rơi về cache, để HTML mới không bao giờ chạy với JS/catalog cũ. */
async function assetNet(event) {
  var req = event.request;
  var cache = await caches.open(CACHE);
  function save(r) {
    if (!r || !storable(r)) return null;
    return cache.put(req.url, r.clone()).catch(function () { return null; });
  }
  var netP = fetch(req).then(function (r) { return r; }, function () { return null; });
  var res = await Promise.race([netP, delay(NAV_TIMEOUT)]);
  if (res === undefined) {
    var quick = await cache.match(req.url);
    if (quick) {
      event.waitUntil(netP.then(save));
      return quick;
    }
    res = await netP;
  }
  if (res) {
    if (res.ok || res.status === 404) {
      event.waitUntil(Promise.resolve(save(res)));
      return res;
    }
    return (await cache.match(req.url)) || res;
  }
  return (await cache.match(req.url)) || Response.error();
}

var STATIC_EXT = /\.(svg|png|ico|jpg|jpeg|webp|gif|woff2?)$/i;

self.addEventListener("install", function (event) {
  event.waitUntil(precacheAll()); /* không skipWaiting: chờ người học bấm "Tải lại" */
});

self.addEventListener("activate", function (event) {
  event.waitUntil(purgeOld());
});

self.addEventListener("message", function (event) {
  if (event.data === "SKIP_WAITING" || (event.data && event.data.type === "SKIP_WAITING")) self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (!inScope(url)) return; /* khác nguồn hoặc ngoài phạm vi: để trình duyệt tự xử lý */
  if (req.headers && req.headers.has && req.headers.has("range")) return;
  var job = req.mode === "navigate" ? navigate(event) : (STATIC_EXT.test(url.pathname) ? assetSwr(event) : assetNet(event));
  /* lỗi bộ nhớ đệm (caches.open/match ném lỗi): rơi về mạng thay vì làm hỏng trang */
  event.respondWith(job.catch(function () { return fetch(req); }));
});
