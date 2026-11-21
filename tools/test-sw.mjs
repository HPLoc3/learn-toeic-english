// test-sw.mjs - kiểm logic sw.js và pwa.js bằng node:vm với đối tượng giả (không trình duyệt, không mạng).
// Chạy: node tools/test-sw.mjs  (exit 0 khi đạt). Không thay thế việc thử service worker thật khi deploy.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { readdirSync, existsSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SW_SRC = readFileSync(join(ROOT, "sw.js"), "utf8");
const CN = "tb-" + /var VERSION = "([^"]+)"/.exec(SW_SRC)[1];
const PWA_SRC = readFileSync(join(ROOT, "assets/js/pwa.js"), "utf8");

let total = 0, failed = 0;
function check(name, cond, extra) {
  total++;
  if (!cond) { failed++; console.error("FAIL: " + name + (extra !== undefined ? " -> " + extra : "")); }
}
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

// ---------- đối tượng giả cho sw.js ----------
const ORIGIN = "https://t.test";
function mk(body, o = {}) {
  const res = new Response(body, { status: o.status ?? 200, headers: { "Content-Type": o.ct ?? "text/html; charset=utf-8" } });
  Object.defineProperty(res, "type", { value: o.type ?? "basic" });
  if (o.redirected) Object.defineProperty(res, "redirected", { value: true });
  return res;
}
function fakeCaches() {
  const stores = new Map();
  const keyOf = (r) => (typeof r === "string" ? r : r.url);
  const mkCache = (m) => ({
    async put(r, res) { m.set(keyOf(r), res); },
    async match(r) { const x = m.get(keyOf(r)); return x ? x.clone() : undefined; },
    async keys() { return [...m.keys()]; },
  });
  return {
    stores,
    async open(n) { if (!stores.has(n)) stores.set(n, new Map()); return mkCache(stores.get(n)); },
    async keys() { return [...stores.keys()]; },
    async delete(n) { return stores.delete(n); },
  };
}
function loadSw(fetchImpl) {
  const handlers = {};
  const state = { skipped: 0, claimed: 0, fetchCalls: [] };
  const caches = fakeCaches();
  const self = {
    addEventListener: (t, f) => { handlers[t] = f; },
    registration: { scope: ORIGIN + "/" },
    location: { href: ORIGIN + "/sw.js" },
    skipWaiting: () => { state.skipped++; },
    clients: { claim: async () => { state.claimed++; } },
  };
  const fetchFn = async (req, init) => {
    state.fetchCalls.push({ url: typeof req === "string" ? req : req.url, init });
    return fetchImpl(typeof req === "string" ? req : req.url, init, req);
  };
  const ctx = vm.createContext({
    self, caches, fetch: fetchFn, Response, Request, Headers, URL, Promise, Object, Error, console,
    setTimeout: (f, ms) => setTimeout(f, ms === 3000 ? 15 : ms), clearTimeout,
  });
  vm.runInContext(SW_SRC, ctx);
  const PRECACHE = vm.runInContext("PRECACHE", ctx);
  async function fire(type, ev) {
    const waits = [];
    ev.waitUntil = (p) => { waits.push(p); };
    let responded = false, rp;
    ev.respondWith = (p) => { responded = true; rp = p; };
    handlers[type](ev);
    const response = responded ? await rp : undefined;
    await Promise.all(waits);
    return { responded, response };
  }
  const nav = (path) => ({ request: { url: ORIGIN + path, method: "GET", mode: "navigate", headers: new Headers(), redirect: "manual" } });
  const sub = (path, extra = {}) => ({ request: { url: ORIGIN + path, method: "GET", mode: "no-cors", headers: new Headers(), ...extra } });
  return { handlers, state, caches, fire, nav, sub, PRECACHE };
}
const okFetch = (url) => {
  const p = new URL(url).pathname;
  if (/\.js$/.test(p)) return mk("//js", { ct: "text/javascript" });
  if (/\.css$/.test(p)) return mk("/*css*/", { ct: "text/css" });
  if (/\.png$/.test(p)) return mk("png", { ct: "image/png" });
  if (/\.webp$/.test(p)) return mk("webp", { ct: "image/webp" });
  return mk("<html>" + p + "</html>");
};

// ---------- 1. cài đặt ----------
{
  const t = loadSw(okFetch);
  check("PRECACHE có 4 trang HTML", ["index.html", "unit.html", "review.html", "404.html"].every((f) => t.PRECACHE.includes(f)));
  {
    const sb = { window: {} };
    vm.runInNewContext(readFileSync(join(ROOT, "data/catalog.js"), "utf8"), sb);
    const need = [];
    for (const p of sb.window.BS_CATALOG.parts) for (const u of p.units) {
      if (u.available !== true) continue;
      need.push("data/" + u.id + ".js");
      if (u.game === true) need.push("data/" + u.id + "-game.js");
      if (u.anim === true) need.push("data/" + u.id + "-anim.js");
      const walkImg = (rel) => { for (const e of readdirSync(join(ROOT, rel), { withFileTypes: true })) { if (e.isDirectory()) walkImg(rel + "/" + e.name); else need.push(rel + "/" + e.name); } };
      if (existsSync(join(ROOT, "assets/img/" + u.id))) walkImg("assets/img/" + u.id);
    }
    check("PRECACHE gồm mọi file của unit available theo catalog (" + need.length + " file)", need.length > 0 && need.every((f) => t.PRECACHE.includes(f)));
    check("PRECACHE có engine/rig/cast hoạt hình, mascot.js, mascot.css, không có file anim lạ", ["assets/js/anim-engine.js", "assets/js/anim-rig.js", "assets/js/anim-cast.js", "assets/js/anim-scenes.js", "assets/js/mascot.js", "assets/css/mascot.css", "data/l01-anim.js", "data/l02-anim.js", "data/l03-anim.js", "data/l04-anim.js"].every((f) => t.PRECACHE.includes(f)) && t.PRECACHE.filter((f) => /anim/.test(f)).length === 8);
    check("PRECACHE có 7 ảnh cảnh 800w, không có ảnh HD (assets/img-hd)", t.PRECACHE.filter((f) => /^assets\/img\/l01\/scene\/[a-z-]+-800\.webp$/.test(f)).length === 7 && !t.PRECACHE.some((f) => /img-hd/.test(f)));
    check("PRECACHE có 7 ảnh cảnh 800w của l02", t.PRECACHE.filter((f) => /^assets\/img\/l02\/scene\/[a-z-]+-800\.webp$/.test(f)).length === 7);
    check("PRECACHE có 7 ảnh cảnh 800w của l03, không có ảnh HD", t.PRECACHE.filter((f) => /^assets\/img\/l03\/scene\/[a-z-]+-800\.webp$/.test(f)).length === 7 && !t.PRECACHE.some((f) => /img-hd/.test(f)));
    check("PRECACHE có 7 ảnh cảnh 800w của l04, không có ảnh HD", t.PRECACHE.filter((f) => /^assets\/img\/l04\/scene\/[a-z-]+-800\.webp$/.test(f)).length === 7 && !t.PRECACHE.some((f) => /img-hd/.test(f)));
    check("PRECACHE không chứa unit chưa available", !t.PRECACHE.some((f) => /^data\/l0[5-9]|^data\/p2-0[3-7]|^data\/p[3-9]/.test(f)));
  }
  await t.fire("install", {});
  const c = t.caches.stores.get(CN);
  check("install ghi cache tb-1 đủ file", c && c.size === t.PRECACHE.length, c && c.size);
  check("install dùng cache:reload", t.state.fetchCalls.length === t.PRECACHE.length && t.state.fetchCalls.every((x) => x.init && x.init.cache === "reload"));
  check("install lưu khóa chuẩn /index.html", c.has(ORIGIN + "/index.html") && c.has(ORIGIN + "/404.html"));
  check("install không skipWaiting", t.state.skipped === 0);
  await t.fire("message", { data: "SKIP_WAITING" });
  check("message SKIP_WAITING gọi skipWaiting", t.state.skipped === 1);
  await t.fire("message", { data: "khac" });
  check("message khác bị bỏ qua", t.state.skipped === 1);
}
// install nguyên tử: một file 404 -> hủy, chưa ghi gì
{
  const t = loadSw((url) => (url.endsWith("/data/catalog.js") ? mk("nf", { status: 404, ct: "text/html" }) : okFetch(url)));
  let rejected = false;
  try { await t.fire("install", {}); } catch { rejected = true; }
  check("install hủy khi một file 404", rejected);
  check("install hủy không ghi cache nào", !t.caches.stores.has(CN) || t.caches.stores.get(CN).size === 0);
}
{
  const t = loadSw((url) => (url.endsWith("/favicon.ico") ? mk("x", { type: "opaque" }) : okFetch(url)));
  let rejected = false;
  try { await t.fire("install", {}); } catch { rejected = true; }
  check("install hủy khi response không phải basic", rejected);
}
// redirected được dựng lại
{
  const t = loadSw((url) => (url.endsWith("/unit.html") ? mk("<html>UNIT</html>", { redirected: true }) : okFetch(url)));
  await t.fire("install", {});
  const stored = t.caches.stores.get(CN).get(ORIGIN + "/unit.html");
  check("response redirected được dựng lại (redirected=false)", stored && stored.redirected === false);
  check("response dựng lại giữ nguyên nội dung và status", stored && (await stored.clone().text()) === "<html>UNIT</html>" && stored.status === 200);
  check("response dựng lại giữ Content-Type", stored && /text\/html/.test(stored.headers.get("content-type")));
}

// ---------- 2. activate ----------
{
  const t = loadSw(okFetch);
  for (const n of ["tb-0", CN, "tb-old", "khac-cache", "tbx"]) await t.caches.open(n);
  await t.fire("activate", {});
  const left = [...t.caches.stores.keys()].sort().join(",");
  check("activate chỉ xóa tb-* cũ", left === "khac-cache," + CN + ",tbx", left);
  check("activate gọi clients.claim", t.state.claimed === 1);
}

// ---------- 3. navigation ----------
async function installed(fetchImpl) {
  let phase = true;
  const impl = fetchImpl || okFetch;
  const t = loadSw((u, i, r) => (phase ? okFetch(u) : impl(u, i, r)));
  await t.fire("install", {});
  phase = false;
  t.caches.stores.get(CN).clear(); // bắt đầu từ cache trống để thấy rõ cái gì được lưu
  t.state.fetchCalls.length = 0;
  return t;
}
{
  const t = await installed();
  const cases = [["/", "/index.html"], ["/unit", "/unit.html"], ["/unit.html?u=l01", "/unit.html"], ["/review", "/review.html"], ["/review.html", "/review.html"], ["/index.html", "/index.html"]];
  for (const [path, key] of cases) {
    t.caches.stores.get(CN).clear();
    const r = await t.fire("fetch", t.nav(path));
    const keys = [...t.caches.stores.get(CN).keys()];
    check(`navigation ${path} -> khóa ${key}`, r.responded && r.response.status === 200 && keys.length === 1 && keys[0] === ORIGIN + key, keys.join());
  }
  check("navigation mạng dùng đúng URL có query", t.state.fetchCalls.some((c) => c.url === ORIGIN + "/unit.html?u=l01"));
}
{
  // ngoại tuyến: trang đã biết lấy từ cache, bỏ query
  let offline = false;
  const t = await installed((url) => { if (offline) throw new TypeError("offline"); return okFetch(url); });
  await t.fire("fetch", t.nav("/unit.html?u=l01"));
  await t.fire("fetch", t.nav("/"));
  await t.fire("fetch", t.nav("/404.html"));
  offline = true;
  const r = await t.fire("fetch", t.nav("/unit?u=l02&x=1"));
  check("offline /unit?u=l02 trả bản /unit.html đã lưu", r.response.status === 200 && (await r.response.text()).includes("/unit.html"));
  const r2 = await t.fire("fetch", t.nav("/"));
  check("offline / trả index đã lưu", r2.response.status === 200 && (await r2.response.text()).includes("/"));
  const r3 = await t.fire("fetch", t.nav("/khong-co-trang-nay"));
  check("offline URL lạ -> 404.html với status 404", r3.response.status === 404 && (await r3.response.text()).includes("/404.html"));
  const r4 = await t.fire("fetch", t.nav("/review"));
  check("offline trang chưa từng lưu (review) không lỗi, trả 404 page", r4.response.status === 404);
}
{
  // online 404: trả nguyên, không lưu
  const t = await installed((url) => (url.includes("/khong-co") ? mk("<html>NF</html>", { status: 404 }) : okFetch(url)));
  const r = await t.fire("fetch", t.nav("/khong-co"));
  check("online 404 trả nguyên status 404", r.response.status === 404 && (await r.response.text()) === "<html>NF</html>");
  check("online 404 không được lưu", t.caches.stores.get(CN).size === 0);
  const r2 = await t.fire("fetch", t.nav("/unit?u=zz"));
  check("trang 200 vẫn được lưu", t.caches.stores.get(CN).size === 1);
}
{
  // 404 trên một trang đã biết cũng không đè cache
  const t = await installed((url) => (url.endsWith("/unit.html") ? mk("<html>NF</html>", { status: 404 }) : okFetch(url)));
  await t.caches.stores.get(CN).set(ORIGIN + "/unit.html", mk("<html>OLD</html>"));
  const r = await t.fire("fetch", t.nav("/unit.html"));
  check("404 trên trang đã biết không đè bản đã lưu", r.response.status === 404 && (await t.caches.stores.get(CN).get(ORIGIN + "/unit.html").clone().text()) === "<html>OLD</html>");
}
{
  // quá 3 giây: dùng cache
  const t = await installed((url) => (url.endsWith("/unit.html") ? new Promise((res) => setTimeout(() => res(mk("<html>LATE</html>")), 120)) : okFetch(url)));
  t.caches.stores.get(CN).set(ORIGIN + "/unit.html", mk("<html>CACHED</html>"));
  const r = await t.fire("fetch", t.nav("/unit.html"));
  check("mạng chậm quá hạn -> dùng bản cache", (await r.response.text()) === "<html>CACHED</html>");
  check("mạng chậm về sau cập nhật cache ngầm", (await t.caches.stores.get(CN).get(ORIGIN + "/unit.html").clone().text()) === "<html>LATE</html>");
}
{
  // opaqueredirect đi thẳng
  const t = await installed((url) => mk("", { type: "opaqueredirect", status: 200 }));
  const r = await t.fire("fetch", t.nav("/unit.html"));
  check("opaqueredirect được trả nguyên, không lưu", r.response.type === "opaqueredirect" && t.caches.stores.get(CN).size === 0);
}
{
  // 5xx -> dùng cache nếu có
  const t = await installed((url) => mk("err", { status: 503 }));
  t.caches.stores.get(CN).set(ORIGIN + "/index.html", mk("<html>CACHED</html>"));
  const r = await t.fire("fetch", t.nav("/"));
  check("5xx rơi về cache", (await r.response.text()) === "<html>CACHED</html>");
}
{
  // response HTML lạ (không phải text/html) cho navigation không lưu vào khóa trang
  const t = await installed((url) => mk("{}", { ct: "application/json" }));
  await t.fire("fetch", t.nav("/unit.html"));
  check("navigation không phải text/html không được lưu", t.caches.stores.get(CN).size === 0);
}

// ---------- 4. asset ----------
{
  const t = await installed((url) => {
    const p = new URL(url).pathname;
    if (p === "/data/l99.js") return mk("<html>404 page</html>", { status: 200, ct: "text/html" }); // SPA-fallback giả
    if (p === "/data/l98.js") return mk("nf", { status: 404, ct: "text/javascript" });
    if (p === "/data/l97.js") return mk("v2", { ct: "text/javascript" });
    return okFetch(url);
  });
  const cache = t.caches.stores.get(CN);
  let r = await t.fire("fetch", t.sub("/data/l99.js"));
  check("asset text/html (trang 404 giả JS) không được lưu", r.responded && cache.size === 0);
  r = await t.fire("fetch", t.sub("/data/l98.js"));
  check("asset 404 không được lưu", cache.size === 0 && r.response.status === 404);
  r = await t.fire("fetch", t.sub("/data/l01.js"));
  check("asset 200 JS được lưu runtime", cache.has(ORIGIN + "/data/l01.js") && r.response.status === 200);
  // network-first: mạng thắng, cache cập nhật
  cache.set(ORIGIN + "/data/l97.js", mk("v1", { ct: "text/javascript" }));
  r = await t.fire("fetch", t.sub("/data/l97.js"));
  check("JS network-first trả bản mới từ mạng (không lệch phiên bản)", (await r.response.text()) === "v2");
  check("JS network-first cập nhật cache", (await cache.get(ORIGIN + "/data/l97.js").clone().text()) === "v2");
  r = await t.fire("fetch", t.sub("/assets/img-hd/l01/nam-pour-1600.webp"));
  check("ảnh HD webp (không precache) được lưu khi tải lần đầu từ mạng", r.response.status === 200 && cache.has(ORIGIN + "/assets/img-hd/l01/nam-pour-1600.webp"));
  const t2 = await installed(() => mk("x", { type: "opaque", ct: "image/png" }));
  await t2.fire("fetch", t2.sub("/assets/img/l01/a.svg"));
  check("response không basic không được lưu", t2.caches.stores.get(CN).size === 0);
  const t3 = await installed(() => { throw new TypeError("offline"); });
  t3.caches.stores.get(CN).set(ORIGIN + "/assets/css/site.css", mk("css", { ct: "text/css" }));
  const r3 = await t3.fire("fetch", t3.sub("/assets/css/site.css"));
  check("asset offline lấy từ cache", (await r3.response.text()) === "css");
}

{
  // network-first: mạng chậm -> cache rồi cập nhật ngầm; mạng lỗi -> cache; không có gì -> lỗi mạng
  const t = await installed((url) => (url.endsWith("/data/slow.js") ? new Promise((res) => setTimeout(() => res(mk("NEW", { ct: "text/javascript" })), 120)) : (() => { throw new TypeError("offline"); })()));
  const cache = t.caches.stores.get(CN);
  cache.set(ORIGIN + "/data/slow.js", mk("OLD", { ct: "text/javascript" }));
  const r = await t.fire("fetch", t.sub("/data/slow.js"));
  check("JS mạng chậm quá 3s -> dùng cache", (await r.response.text()) === "OLD");
  check("JS mạng chậm về sau cập nhật cache ngầm", (await cache.get(ORIGIN + "/data/slow.js").clone().text()) === "NEW");
  const r2 = await t.fire("fetch", t.sub("/data/slow.js?x=1"));
  check("JS offline không có cache -> lỗi mạng (không treo)", r2.response.type === "error");
  const r3 = await t.fire("fetch", t.sub("/data/slow.js"));
  check("JS offline có cache -> trả cache", (await r3.response.text()) === "NEW");
  // 5xx -> cache
  const t5 = await installed(() => mk("err", { status: 503, ct: "text/javascript" }));
  t5.caches.stores.get(CN).set(ORIGIN + "/assets/js/core.js", mk("CORE", { ct: "text/javascript" }));
  const r5 = await t5.fire("fetch", t5.sub("/assets/js/core.js"));
  check("JS 5xx rơi về cache", (await r5.response.text()) === "CORE");
  // ảnh: SWR
  const ts = await installed(() => mk("<svg>v2</svg>", { ct: "image/svg+xml" }));
  ts.caches.stores.get(CN).set(ORIGIN + "/assets/img/l01/mc1.svg", mk("<svg>v1</svg>", { ct: "image/svg+xml" }));
  const rs = await ts.fire("fetch", ts.sub("/assets/img/l01/mc1.svg"));
  check("SVG stale-while-revalidate trả bản cũ ngay", (await rs.response.text()) === "<svg>v1</svg>");
  check("SVG cập nhật cache ngầm", (await ts.caches.stores.get(CN).get(ORIGIN + "/assets/img/l01/mc1.svg").clone().text()) === "<svg>v2</svg>");
}
{
  // cache lỗi -> rơi về fetch
  const t = await installed(okFetch);
  t.caches.open = async () => { throw new Error("quota"); };
  const r = await t.fire("fetch", t.nav("/unit.html"));
  check("navigation: caches.open ném lỗi -> rơi về mạng", r.response.status === 200 && (await r.response.text()).includes("/unit.html"));
  const r2 = await t.fire("fetch", t.sub("/assets/js/core.js"));
  check("asset JS: caches.open ném lỗi -> rơi về mạng", r2.response.status === 200);
  const r3 = await t.fire("fetch", t.sub("/assets/img/l01/mc1.svg"));
  check("asset SVG: caches.open ném lỗi -> rơi về mạng", r3.response.status === 200);
}
{
  // activate chép runtime-cache từ cache cũ
  const t = loadSw(okFetch);
  const oldC = await t.caches.open("tb-1");
  await oldC.put(ORIGIN + "/data/p2-01.js", mk("RT", { ct: "text/javascript" }));
  await oldC.put(ORIGIN + "/index.html", mk("OLD"));
  await oldC.put(ORIGIN + "/assets/img-hd/l01/nam-pour-1600.webp", mk("PLACEHOLDER", { ct: "image/webp" }));
  const newC = await t.caches.open(CN);
  await newC.put(ORIGIN + "/index.html", mk("NEW"));
  await t.fire("activate", {});
  const keys = [...t.caches.stores.keys()];
  check("activate xóa cache cũ sau khi chép", !keys.includes("tb-1") && keys.includes(CN));
  const m = t.caches.stores.get(CN);
  check("activate chép mục runtime sang cache mới", m.has(ORIGIN + "/data/p2-01.js") && (await m.get(ORIGIN + "/data/p2-01.js").clone().text()) === "RT");
  check("activate KHÔNG chép ảnh img-hd cũ sang cache mới", !m.has(ORIGIN + "/assets/img-hd/l01/nam-pour-1600.webp"));
  check("activate giữ bản precache mới, không đè bằng bản cũ", (await m.get(ORIGIN + "/index.html").clone().text()) === "NEW");
}

// ---------- 5. bỏ qua ----------
{
  const t = await installed();
  let r = await t.fire("fetch", { request: { url: "https://khac.example/x.js", method: "GET", mode: "no-cors", headers: new Headers() } });
  check("request khác origin bị bỏ qua", !r.responded);
  r = await t.fire("fetch", { request: { url: ORIGIN + "/data/l01.js", method: "POST", mode: "cors", headers: new Headers() } });
  check("request không phải GET bị bỏ qua", !r.responded);
  r = await t.fire("fetch", t.sub("/assets/img/a.mp3", { headers: new Headers({ Range: "bytes=0-1" }) }));
  check("request có Range bị bỏ qua", !r.responded);
  r = await t.fire("fetch", { request: { url: "chrome-extension://x/y.js", method: "GET", mode: "no-cors", headers: new Headers() } });
  check("scheme lạ bị bỏ qua", !r.responded);
}

// ---------- 6. pwa.js ----------
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.ls = {}; this.hidden = false; this.className = ""; this.textContent = ""; this.disabled = false; this.classList = { add: (c) => { this.className += " " + c; } }; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
  click() { (this.ls.click || []).forEach((f) => f({})); }
}
function all(e, out = []) { out.push(e); e.children.forEach((c) => all(c, out)); return out; }

function loadPwa({ protocol = "https:", hostname = "hoc.example", search = "", root = true, standalone = false, ua = "Mozilla/5.0 (X11)", controller = true, waiting = false, swSupported = true } = {}) {
  const log = { registered: [], unreg: 0, deleted: [], posted: [], reloads: 0, prompts: 0 };
  const rootEl = root ? new El("div") : null;
  const head = new El("head"), body = new El("body");
  const winLs = {};
  const swLs = {};
  const worker = { postMessage: (m) => log.posted.push(m) };
  const reg = {
    waiting: waiting ? worker : null, installing: null, ls: {},
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); },
  };
  const serviceWorker = {
    controller: controller ? {} : null,
    register: async (p) => { log.registered.push(p); return reg; },
    ready: Promise.resolve(reg),
    getRegistrations: async () => [{ unregister: async () => { log.unreg++; return true; } }],
    addEventListener: (t, f) => { (swLs[t] = swLs[t] || []).push(f); },
  };
  const doc = {
    readyState: "complete", head, body,
    getElementById: (id) => (id === "pwa-root" ? rootEl : null),
    createElement: (t) => new El(t),
    addEventListener: () => {},
  };
  const win = {
    URLSearchParams, location: { protocol, hostname, search, reload: () => { log.reloads++; } },
    navigator: { serviceWorker: swSupported ? serviceWorker : undefined, userAgent: ua, maxTouchPoints: 0 },
    matchMedia: () => ({ matches: standalone }),
    addEventListener: (t, f) => { (winLs[t] = winLs[t] || []).push(f); },
    caches: { keys: async () => ["tb-1", "tb-2", "other"], delete: async (n) => { log.deleted.push(n); return true; } },
  };
  win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, navigator: win.navigator, Promise, Object, console, setTimeout });
  vm.runInContext(PWA_SRC, ctx);
  return { log, rootEl, head, body, winLs, swLs, reg, worker, serviceWorker };
}

{
  let t = loadPwa({ protocol: "http:", hostname: "localhost" });
  await tick();
  check("pwa: localhost không đăng ký mặc định", t.log.registered.length === 0);
  t = loadPwa({ protocol: "http:", hostname: "127.0.0.1" });
  await tick();
  check("pwa: 127.0.0.1 không đăng ký mặc định", t.log.registered.length === 0);
  t = loadPwa({ protocol: "file:", hostname: "", search: "?pwa=1" });
  await tick();
  check("pwa: file: không đăng ký kể cả ?pwa=1", t.log.registered.length === 0);
  t = loadPwa({ protocol: "http:", hostname: "localhost", search: "?pwa=1" });
  await tick();
  check("pwa: localhost ?pwa=1 đăng ký sw.js", t.log.registered.join() === "sw.js");
  t = loadPwa({});
  await tick();
  check("pwa: https đăng ký sw.js (đường dẫn tương đối)", t.log.registered.join() === "sw.js");
  t = loadPwa({ protocol: "http:", hostname: "hoc.example" });
  await tick();
  check("pwa: http (không phải localhost) không đăng ký", t.log.registered.length === 0);
  t = loadPwa({ protocol: "http:", hostname: "localhost", search: "?pwa=0" });
  await tick();
  check("pwa: ?pwa=0 gỡ đăng ký", t.log.unreg === 1 && t.log.registered.length === 0);
  check("pwa: ?pwa=0 chỉ xóa cache tb-*", t.log.deleted.join() === "tb-1,tb-2");
  t = loadPwa({ root: false });
  await tick();
  check("pwa: không có #pwa-root vẫn chạy, không lỗi, vẫn đăng ký", t.log.registered.length === 1 && t.head.children.length === 0);
  t = loadPwa({ swSupported: false });
  await tick();
  check("pwa: trình duyệt không có serviceWorker không lỗi", t.rootEl.children.length >= 1);
}
{
  const t = loadPwa({});
  await tick();
  const els = all(t.rootEl);
  const status = els.find((e) => e.className === "pwa-status");
  check("pwa: dòng trạng thái ngoại tuyến sau khi SW sẵn sàng", status && status.textContent === "Đã sẵn sàng học khi không có mạng" && status.attrs.role === "status");
  check("pwa: tự chèn pwa.css một lần", t.head.children.filter((e) => e.tag === "link" && e.href === "assets/css/pwa.css").length === 1);
  const wrap = els.find((e) => e.className === "pwa-install");
  check("pwa: nút cài ẩn khi chưa có beforeinstallprompt", wrap && wrap.hidden === true);
  let prevented = false, prompted = 0;
  t.winLs.beforeinstallprompt.forEach((f) => f({ preventDefault: () => { prevented = true; }, prompt: () => { prompted++; } }));
  check("pwa: beforeinstallprompt hiện nút Cài ứng dụng", prevented && wrap.hidden === false);
  const btn = els.find((e) => e.tag === "button");
  check("pwa: nút cài đúng chữ", btn.textContent === "Cài ứng dụng");
  btn.click();
  check("pwa: bấm nút gọi prompt() và ẩn nút", prompted === 1 && wrap.hidden === true);
}
{
  const t = loadPwa({ standalone: true });
  await tick();
  check("pwa: chế độ standalone không dựng UI cài đặt", !all(t.rootEl).some((e) => e.className === "pwa-install" || e.tag === "details"));
  const i = loadPwa({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari" });
  await tick();
  const det = all(i.rootEl).find((e) => e.tag === "details");
  check("pwa: iOS có <details> hướng dẫn Thêm vào Màn hình chính", det && all(det).some((e) => /Thêm vào Màn hình chính/.test(e.textContent)));
  const d = loadPwa({});
  await tick();
  check("pwa: desktop không có <details> iOS", !all(d.rootEl).some((e) => e.tag === "details"));
}
{
  // cập nhật
  const t = loadPwa({ waiting: true });
  await tick();
  const bar = t.body.children.find((e) => e.className === "pwa-bar");
  check("pwa: có bản waiting -> hiện thanh cập nhật role=status", bar && bar.attrs.role === "status" && bar.children[0].textContent === "Đã có bản mới");
  const btn = bar.children[1];
  check("pwa: nút Tải lại", btn.textContent === "Tải lại");
  btn.click();
  check("pwa: bấm Tải lại gửi SKIP_WAITING", t.log.posted.join() === "SKIP_WAITING");
  check("pwa: chưa reload trước controllerchange", t.log.reloads === 0);
  t.swLs.controllerchange.forEach((f) => f());
  t.swLs.controllerchange.forEach((f) => f());
  check("pwa: controllerchange reload đúng 1 lần", t.log.reloads === 1, t.log.reloads);
  // m1: tab chưa bấm "Tải lại" không tự reload khi controllerchange
  const o = loadPwa({ waiting: true });
  await tick();
  o.swLs.controllerchange.forEach((g) => g());
  check("pwa: tab chưa bấm Tải lại không tự reload", o.log.reloads === 0);
  // m8: nút Để sau ẩn thanh
  const ob = o.body.children.find((e) => e.className === "pwa-bar");
  const later = ob.children.find((e) => e.textContent === "Để sau");
  later.click();
  check("pwa: nút Để sau ẩn thanh cập nhật", later && ob.hidden === true);
  // lần cài đầu (chưa có controller): không hiện thanh, không reload
  const f = loadPwa({ waiting: true, controller: false });
  await tick();
  check("pwa: lần cài đầu không hiện thanh cập nhật", !f.body.children.some((e) => e.className === "pwa-bar"));
  f.swLs.controllerchange && f.swLs.controllerchange.forEach((g) => g());
  check("pwa: lần cài đầu claim không reload", f.log.reloads === 0);
  // updatefound
  const u = loadPwa({});
  await tick();
  let stateCb;
  const nw = { state: "installing", postMessage() {}, addEventListener: (t2, cb) => { stateCb = cb; } };
  u.reg.installing = nw;
  u.reg.ls.updatefound.forEach((g) => g());
  nw.state = "installed";
  stateCb();
  check("pwa: updatefound -> installed hiện thanh cập nhật", u.body.children.some((e) => e.className === "pwa-bar"));
}

console.log(`test-sw: ${total - failed}/${total} ca đạt`);
process.exit(failed ? 1 : 0);
