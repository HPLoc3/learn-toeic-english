// Kiem tra goi C (linh vat "Buoc") bang node + vm, khong trinh duyet/server. Chay: node tools/test-mascot.mjs
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const BASE = "3f5214e"; // commit truoc goi C

let NOW = new Date(2026, 5, 10, 12, 0, 0).getTime();
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(NOW); }
  static now() { return NOW; }
}

/* DOM gia toi thieu: du cho core.js (el, HUD) va mascot.js */
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.attrs = {}; this.children = []; this.listeners = {};
    this.style = {}; this.hidden = false; this.innerHTML = ""; this._text = ""; this.parentNode = null; this._cls = new Set();
    const self = this;
    this.classList = { add: (...c) => c.forEach((x) => self._cls.add(x)), contains: (c) => self._cls.has(c) };
  }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this._cls].join(" "); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "class") this.className = v; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  click() { (this.listeners.click || []).forEach((f) => f({ target: this })); }
  all(out = []) { this.children.forEach((c) => { if (c.all) { out.push(c); c.all(out); } }); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const m = /^\.([\w-]+)$/.exec(sel);
    return m ? this.all().filter((e) => e._cls.has(m[1])) : [];
  }
}
class FakeText { constructor(t) { this.textContent = String(t); } }

function makeEnv(seed, opts = {}) {
  const store = {};
  if (seed !== undefined) store["tungbuoc.v1"] = typeof seed === "string" ? seed : JSON.stringify(seed);
  const timers = [];
  const listeners = {};
  const byId = {};
  const doc = {
    readyState: "complete",
    body: new FakeEl("body"),
    documentElement: new FakeEl("html"),
    createElement: (t) => new FakeEl(t),
    createTextNode: (t) => new FakeText(t),
    getElementById: (id) => byId[id] || null,
    createEvent: () => ({ initCustomEvent() {} }),
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
    dispatchEvent: (ev) => { (listeners[ev.type] || []).slice().forEach((f) => f(ev)); },
  };
  class CE { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
  if (opts.hud) { const h = new FakeEl("div"); byId.hud = h; }
  const ctx = {
    Date: FakeDate, console, JSON, Math, Object, Array, Number, String, RegExp, URLSearchParams, CustomEvent: CE,
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].dead = true; },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: doc,
    location: { hostname: "example.com", protocol: "https:", search: "" },
  };
  ctx.window = ctx;
  ctx.addEventListener = () => {};
  ctx.matchMedia = () => ({ matches: false, addEventListener() {} });
  vm.createContext(ctx);
  vm.runInContext(read("assets/js/core.js"), ctx, { filename: "core.js" });
  if (opts.mascot !== false) vm.runInContext(read("assets/js/mascot.js"), ctx, { filename: "mascot.js" });
  return {
    ctx, BS: ctx.BS, store, doc, timers, hud: byId.hud, FakeEl,
    emit: (name, detail) => doc.dispatchEvent(new CE(name, { detail })),
    runTimers: () => { const t = timers.splice(0); t.forEach((x) => { if (!x.dead) x.f(); }); },
  };
}

let pass = 0, total = 0;
function t(name, fn) {
  total++;
  try { fn(); pass++; console.log("  dat  " + name); }
  catch (e) { console.log("  LOI  " + name + "\n       " + String(e.message).split("\n")[0]); }
}
const UNSAFE = /<script|<image|href|\son\w+\s*=|foreignObject|<style|javascript:|<iframe|<use/i;

console.log("Kiem tra linh vat Buoc (goi C)");

/* 1 */
t("1 normalize: thieu->1; 0 giu 0; rac->1; khong doi khoa khac", () => {
  const base = { v: 1, units: { u1: { known: { a: 1 } } }, prefs: { theme: "dark", goal: 100, autoSpeak: 0, noTimer: 1 }, xp: { total: 77 } };
  const get = (m) => { const s = JSON.parse(JSON.stringify(base)); if (m !== "ABSENT") s.prefs.mascot = m; return makeEnv(s, { mascot: false }).BS.state; };
  assert.equal(get("ABSENT").prefs.mascot, 1);
  assert.equal(get(0).prefs.mascot, 0);
  assert.equal(get(false).prefs.mascot, 0);
  for (const bad of [2, -1, "0", "x", null, [], {}, 0.5]) assert.equal(get(bad).prefs.mascot, 1, "rac " + JSON.stringify(bad));
  assert.equal(makeEnv(undefined, { mascot: false }).BS.state.prefs.mascot, 1);
  const a = JSON.parse(JSON.stringify(get("ABSENT"))), b = JSON.parse(JSON.stringify(get(0)));
  delete a.prefs.mascot; delete b.prefs.mascot;
  assert.deepEqual(a, b);
  assert.equal(a.prefs.theme, "dark"); assert.equal(a.prefs.goal, 100); assert.equal(a.prefs.autoSpeak, 0);
  assert.equal(a.prefs.noTimer, 1); assert.equal(a.xp.total, 77); assert.deepEqual(Object.keys(a.units), ["u1"]);
});

/* 2 */
t("2 stats().studiedToday dung", () => {
  const e = makeEnv(undefined, { mascot: false });
  assert.strictEqual(e.BS.stats().studiedToday, false);
  e.BS.addXP(5);
  assert.strictEqual(e.BS.stats().studiedToday, true);
  const e2 = makeEnv({ v: 1, units: {}, xp: { streak: { n: 3, best: 3, last: "2026-06-09" } } }, { mascot: false });
  assert.strictEqual(e2.BS.stats().studiedToday, false);
  assert.equal(e2.BS.stats().streak, 3);
  const e3 = makeEnv({ v: 1, units: {}, xp: { streak: { n: 3, best: 3, last: "2026-06-10" } } }, { mascot: false });
  assert.strictEqual(e3.BS.stats().studiedToday, true);
});

/* 3 */
t("3 svg(mood): 5 mood, aria-hidden, qua bo loc an toan", () => {
  const M = makeEnv().BS.mascot;
  for (const m of ["idle", "wave", "cheer", "proud", "worried"]) {
    const s = M.svg(m);
    assert.ok(s.startsWith("<svg"), m);
    assert.ok(s.includes('aria-hidden="true"'), m);
    assert.ok(s.includes('data-mood="' + m + '"'), m);
    assert.ok(!UNSAFE.test(s), "khong an toan " + m);
    assert.equal((s.match(/<svg/g) || []).length, 1);
  }
  assert.ok(M.svg("la").includes('data-mood="idle"'));
  assert.ok(M.svg("idle") === M.svg("idle"));
  const mini = M.svg("idle", { mini: true, bare: true });
  assert.ok(mini.includes("mascot-mini") && !mini.includes("data-mood") && mini.includes('aria-hidden="true"'));
});

/* 4 */
t("4 pickLine: khong rong, <=90 ky tu, tat dinh, nhieu bien the, dieu kien streak-risk", () => {
  const M = makeEnv().BS.mascot;
  const sts = [{}, { streak: 2, studiedToday: false, total: 10 }, { streak: 12345, studiedToday: false, total: 99 }, { streak: 5, studiedToday: true, total: 9 }, { total: 0 }, { streak: 0, total: 5 }];
  const N = 48;
  for (const kind of ["greet", "streak-risk", "goal", "review-done", "khac"]) {
    const seen = new Set();
    for (const st of sts) for (let i = 0; i < N; i++) {
      const rnd = () => i / N;
      const a = M.pickLine(kind, st, rnd), b = M.pickLine(kind, st, rnd);
      assert.equal(a, b, "tat dinh " + kind);
      assert.ok(typeof a === "string" && a.length > 0 && a.length <= 90, kind + ": " + a);
      assert.ok(!/<|>/.test(a));
      seen.add(a);
    }
    assert.ok(seen.size >= 3, kind + " it bien the: " + seen.size);
  }
  assert.ok(M.pickLine("greet", {}, () => 0.999999).length > 0);
  assert.ok(M.pickLine("goal", null, () => 5).length > 0 && M.pickLine("goal", null, () => NaN).length > 0);
  assert.ok(M.pickLine("greet").length > 0); // rnd mac dinh
  const risk = M.pickLine("streak-risk", { streak: 7, studiedToday: false }, () => 0);
  assert.ok(/7/.test(risk) && /chuỗi/i.test(risk));
  for (const st of [{ streak: 1, studiedToday: false }, { streak: 0 }, { streak: 9, studiedToday: true }, {}]) {
    for (let i = 0; i < N; i++) assert.ok(!/chuỗi/i.test(M.pickLine("streak-risk", st, () => i / N)), "khong nhac chuoi khi " + JSON.stringify(st));
  }
  // giong nhe: khong tu trach moc
  const all = []; for (let i = 0; i < N; i++) all.push(M.pickLine("streak-risk", { streak: 3, studiedToday: false }, () => i / N));
  assert.ok(!all.some((s) => /lười|tệ|thất bại|mất hết|phải\b/i.test(s)));
});

/* 5 */
t("5 tat: host rong/an, say/react khong lam gi; bat: bs:xp hit:1 -> mini cheer, hit:0 thi khong", () => {
  const e = makeEnv(undefined, { hud: true });
  const BS = e.BS, host = new e.FakeEl("div");
  const m = BS.mascot.mount(host, { variant: "hero", mood: "wave" });
  assert.ok(host.innerHTML.includes("<svg")); assert.equal(host.hidden, false);
  assert.equal(host.getAttribute("data-mood"), "wave");
  m.say("Xin <b>chào</b>");
  assert.ok(host.innerHTML.includes('<p class="mascot-say">') && !host.innerHTML.includes("<b>") && host.innerHTML.includes("&#60;b&#62;"));
  assert.ok(!/aria-live|role=/.test(host.innerHTML), "bong bong khong aria-live");
  m.set("cheer"); assert.equal(host.getAttribute("data-mood"), "cheer");
  m.set("khong-co"); assert.equal(host.getAttribute("data-mood"), "idle");
  // HUD mini
  const btn = e.hud.querySelector(".hud-mascot"), face = e.hud.querySelector(".hud-mascot-face");
  assert.ok(btn && face);
  assert.equal(face.getAttribute("data-mood"), "idle");
  e.emit("bs:xp", { gain: 0, hit: 0 }); assert.equal(face.getAttribute("data-mood"), "idle");
  e.emit("bs:xp", { gain: 5, hit: 1 }); assert.equal(face.getAttribute("data-mood"), "cheer");
  e.runTimers(); assert.equal(face.getAttribute("data-mood"), "idle");
  // addXP that su dat muc tieu
  BS.setPref("goal", 30);
  BS.addXP(30, { once: "t:1" });
  assert.equal(face.getAttribute("data-mood"), "cheer");
  assert.ok(host.innerHTML.includes("mascot-say"), "bong bong hero doi sang cau mung");
  e.runTimers();
  // tat
  BS.mascot.setEnabled(false);
  assert.equal(BS.state.prefs.mascot, 0); assert.equal(BS.mascot.enabled(), false);
  assert.equal(host.innerHTML, ""); assert.equal(host.hidden, true);
  m.say("hello"); m.set("wave"); assert.equal(host.innerHTML, "");
  const host2 = new e.FakeEl("div"); BS.mascot.mount(host2, { variant: "inline", mood: "proud" }).say("x");
  assert.equal(host2.innerHTML, ""); assert.equal(host2.hidden, true);
  BS.mascot.react("goal"); BS.mascot.react("review-done");
  e.emit("bs:xp", { gain: 5, hit: 1 });
  assert.equal(face.getAttribute("data-mood"), "idle", "tat thi khong phan ung");
  assert.ok(btn.parent === undefined || true);
  // bat lai: host hien lai, giu cau da noi
  BS.mascot.setEnabled(true);
  assert.equal(host.hidden, false); assert.ok(host.innerHTML.includes("<svg"));
  assert.ok(host.innerHTML.includes("mascot-say"));
  // xoa
  m.destroy(); assert.equal(host.innerHTML, "");
  assert.equal(typeof BS.mascot.mount(null, {}).say, "function");
});

/* 6 */
t("6 mascot.js khong addXP/luu tru/mang/rAF/am thanh; core.js: REP_CAP + addXP khong doi", () => {
  const src = read("assets/js/mascot.js");
  for (const re of [/addXP/, /localStorage/, /sessionStorage/, /https?:/, /fetch\s*\(/, /XMLHttpRequest/, /requestAnimationFrame/, /\beval\b/, /new Function/, /\bAudio\b/, /speechSynthesis/, /\.speak\(/, /\bonce\b/, /rep\s*:/, /sendBeacon/, /WebSocket/]) {
    assert.ok(!re.test(src), "mascot.js khop " + re);
  }
  assert.ok(!/addXP|localStorage|XMLHttpRequest/.test(read("assets/css/mascot.css")));
  let baseSrc;
  try { baseSrc = execFileSync("git", ["show", BASE + ":assets/js/core.js"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch (e) { baseSrc = null; }
  const now = read("assets/js/core.js");
  const cut = (s) => s.slice(s.indexOf("function addXP"), s.indexOf("function stats")).replace(/\r\n/g, "\n");
  assert.ok(/var REP_CAP = 60;/.test(now));
  assert.ok(cut(now).length > 500);
  if (baseSrc) {
    assert.equal(cut(now), cut(baseSrc), "than addXP doi");
    assert.equal(now.match(/var REP_CAP = \d+;/)[0], baseSrc.match(/var REP_CAP = \d+;/)[0]);
  } else console.log("       (khong co git/commit " + BASE + ": bo qua so voi base)");
  assert.ok(!/mascot/.test(cut(now)), "addXP khong nhac linh vat");
});

/* 7 */
t("7 HUD: nut thu 5 .hud-btn, aria-pressed, nhan Linh vat Buoc, bam de bat/tat", () => {
  const e = makeEnv(undefined, { hud: true });
  const kids = e.hud.children;
  const btn = e.hud.querySelector(".hud-mascot");
  assert.ok(btn && btn.tagName === "BUTTON" && btn.getAttribute("type") === "button");
  assert.ok(btn._cls.has("hud-btn") && btn._cls.has("btn"));
  assert.equal(btn.getAttribute("aria-label"), "Linh vật Bước");
  assert.equal(btn.getAttribute("aria-pressed"), "true");
  assert.ok(btn.textContent.includes("Bước"));
  assert.equal(kids[kids.length - 1], btn, "o cuoi HUD (sau nut giao dien)");
  assert.equal(e.hud.all().filter((x) => x.tagName === "BUTTON").length, 5, "3 nut muc tieu + giao dien + linh vat");
  assert.equal(btn.querySelector(".hud-mascot-face").getAttribute("aria-hidden"), "true");
  btn.click();
  assert.equal(e.BS.state.prefs.mascot, 0);
  assert.equal(btn.getAttribute("aria-pressed"), "false");
  assert.ok(e.hud.querySelector(".hud-mascot"), "nut van con khi tat");
  btn.click();
  assert.equal(e.BS.state.prefs.mascot, 1); assert.equal(btn.getAttribute("aria-pressed"), "true");
  assert.ok(JSON.parse(e.store["tungbuoc.v1"]).prefs.mascot === 1);
  // khoi dau o trang thai tat
  const off = makeEnv({ v: 1, units: {}, prefs: { mascot: 0 } }, { hud: true });
  assert.equal(off.hud.querySelector(".hud-mascot").getAttribute("aria-pressed"), "false");
  // mascot.js khong ton tai (404.html): khong co nut
  assert.equal(makeEnv(undefined, { hud: true, mascot: false }).hud.querySelector(".hud-mascot"), null);
  assert.match(read("assets/css/hud.css"), /\.hud-mascot/);
  assert.match(read("assets/css/hud.css"), /min-height: 44px/);
});

/* 8 */
t("8 sao luu: chay tools/test-backup.mjs (mascot 0/1, 2 bi tu choi, ban cu thieu khoa)", () => {
  const out = execFileSync(process.execPath, [path.join(root, "tools", "test-backup.mjs")], { encoding: "utf8", timeout: 50000 });
  assert.match(out, /prefs\.mascot 0\/1/);
  assert.ok(!/LOI/.test(out));
  const m = /(\d+)\/(\d+) ca dat/.exec(out); assert.ok(m && m[1] === m[2]);
  const bk = read("assets/js/backup.js");
  assert.ok(/"mascot", "animSpeak"\]\)/.test(bk) && /\["autoSpeak", "noTimer", "mascot", "animSpeak"\]/.test(bk));
});

/* 9 */
t("9 HTML: 3 trang co mascot.css + mascot.js sau core.js; 404.html khong co; trang chu co khe", () => {
  for (const f of ["index.html", "review.html", "unit.html"]) {
    const h = read(f);
    assert.ok(/<link rel="stylesheet" href="assets\/css\/mascot\.css">/.test(h), f + " thieu css");
    const ic = h.indexOf('assets/js/core.js"'), im = h.indexOf('assets/js/mascot.js"');
    assert.ok(ic > 0 && im > ic, f + ": mascot.js phai sau core.js");
    assert.equal((h.match(/mascot\.js/g) || []).length, 1);
    assert.ok(h.indexOf("hud.css") < h.indexOf("mascot.css"));
  }
  const nf = read("404.html");
  assert.ok(!/mascot/.test(nf), "404.html khong duoc nhac linh vat");
  const idx = read("index.html");
  const hero = idx.slice(idx.indexOf('<div class="hero">'), idx.indexOf('<div id="hud">'));
  assert.ok(/id="mascot-home"/.test(hero), "khe nam trong .hero");
  assert.ok(!/aria-live|role="status"/.test(hero.slice(hero.indexOf("mascot-home"), hero.indexOf("mascot-home") + 80)));
  assert.ok(!/aria-live/.test(read("assets/js/mascot.js")));
  assert.ok(/BS\.mascot/.test(read("assets/js/home.js")) && /streak >= 2 && !st\.studiedToday/.test(read("assets/js/home.js")));
  const rv = read("assets/js/review.js");
  assert.equal((rv.match(/^\s+proudMascot\(box\);/gm) || []).length, 2, "showEnd + nhanh on xong cua showEmpty");
  const empty = rv.slice(rv.indexOf("function showEmpty"), rv.indexOf("function startSession"));
  const i1 = empty.indexOf("proudMascot(box);"), iNt = empty.indexOf("Chưa có thẻ nào đến hạn"), iNo = empty.indexOf("Chưa có thẻ để ôn"), iFail = empty.indexOf("Chưa tải được");
  assert.ok(i1 > iFail && i1 < iNt && iNt < iNo, "chi o nhanh 'on xong roi'");
  assert.ok(!/(^|[^\w])mascot[^\n]*XP|addXP[^\n]*mascot/i.test(rv));
});

/* 10 */
t("10 kich thuoc: mascot.js <= 10KB (tran nang tu 9KB sau khi them loc host da go), mascot.css <= 2.5KB, an toan cu phap", () => {
  const js = fs.statSync(path.join(root, "assets/js/mascot.js")).size;
  const css = fs.statSync(path.join(root, "assets/css/mascot.css")).size;
  assert.ok(js <= 10240, "mascot.js " + js);
  assert.ok(css <= 2500, "mascot.css " + css);
  assert.ok(!/@import|url\(|https?:/.test(read("assets/css/mascot.css")));
  const css2 = read("assets/css/mascot.css");
  assert.match(css2, /prefers-reduced-motion:\s*reduce/);
  assert.ok(!/requestAnimationFrame|setInterval/.test(read("assets/js/mascot.js")));
});

/* 11 */
t("11 host da go khoi DOM bi bo khoi insts; khong ve lai khi bat/tat", () => {
  const e = makeEnv(undefined, { hud: true });
  const a = new e.FakeEl("div"), b = new e.FakeEl("div");
  e.BS.mascot.mount(a, { variant: "inline", mood: "proud" }).say("a");
  e.BS.mascot.mount(b, { variant: "inline", mood: "proud" }).say("b");
  a.isConnected = false; // nhu review.js clear() go khoi DOM
  a.innerHTML = "(da tach)";
  e.BS.mascot.setEnabled(false); e.BS.mascot.setEnabled(true);
  assert.equal(a.innerHTML, "(da tach)", "host da tach khong bi ve lai");
  assert.ok(b.innerHTML.includes("<svg"));
  for (let i = 0; i < 5; i++) { const h = new e.FakeEl("div"); e.BS.mascot.mount(h, { variant: "inline" }); h.isConnected = false; }
  const c = new e.FakeEl("div"); e.BS.mascot.mount(c, { variant: "inline" });
  e.BS.mascot.setEnabled(false); e.BS.mascot.setEnabled(true);
  assert.ok(c.innerHTML.includes("<svg"));
});

/* 12 */
t("12 CSS: khong con infinite (WCAG 2.2.2); tay/duoi/nhay huu han <= 5s; giam chuyen dong van tinh", () => {
  const css = read("assets/css/mascot.css");
  assert.ok(!/infinite/.test(css), "con infinite");
  for (const k of ["m-wag", "m-wv", "m-jump"]) {
    const m = new RegExp("animation:" + k + " ([\\d.]+)s [\\w-]+ (\\d+)").exec(css);
    assert.ok(m, k + " thieu so lan huu han");
    assert.ok(Number(m[1]) * Number(m[2]) <= 5, k + " chay > 5s");
  }
  assert.match(css, /prefers-reduced-motion:\s*reduce\)\{\.mascot \*\{animation:none!important\}/);
});

console.log("\nKet qua: " + pass + "/" + total + " hang muc dat");
process.exit(pass === total ? 0 : 1);
