// Kiem tra bai Dien cho trong (quiz.js): cau hoan chinh khi hien dap an va khi doc to, bang node, khong can trinh duyet.
// Dung DOM gia toi thieu. Chay: node tools/test-fill.mjs
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blind, violations } from "./export-blind.mjs";
import { englishStrings } from "./check-cross.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const src = (f) => fs.readFileSync(path.join(ROOT, "assets/js", f), "utf8");
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (extra ? "\n     " + extra : "")); }
}

/* ---------- moi truong gia ---------- */
function makeEnv(o = {}) {
  const log = [];
  /* dong ho gia */
  const T = { now: 0, list: [], id: 0 };
  const setTimeout_ = (fn, ms) => { const id = ++T.id; T.list.push({ id, at: T.now + (ms || 0), fn }); return id; };
  const clearTimeout_ = (id) => { T.list = T.list.filter((x) => x.id !== id); };
  const advance = (ms) => {
    const end = T.now + ms;
    for (;;) {
      T.list.sort((a, b) => a.at - b.at || a.id - b.id);
      const nx = T.list[0];
      if (!nx || nx.at > end) break;
      T.list.shift(); T.now = nx.at; nx.fn();
    }
    T.now = end;
  };
  /* DOM gia */
  const doc = { activeElement: null, readyState: "complete", listeners: {} };
  const textNode = (t) => { const n = new N("#text"); n.isText = true; n.t = String(t); return n; };
  class N {
    constructor(tag) { this.tag = tag; this.attrs = {}; this.kids = []; this.parent = null; this.ls = {}; this.isText = false; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(c) { if (c.parent) c.parent.kids = c.parent.kids.filter((x) => x !== c); c.parent = this; this.kids.push(c); return c; }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    get textContent() { return this.isText ? this.t : this.kids.map((k) => k.textContent).join(""); }
    set textContent(v) { this.kids.forEach((k) => { k.parent = null; }); this.kids = []; if (v !== "") this.appendChild(textNode(v)); log.push("text:" + (this.attrs.class || this.tag)); }
    get className() { return this.attrs.class || ""; }
    set className(v) { this.attrs.class = v; }
    get hidden() { return "hidden" in this.attrs; }
    set hidden(v) { if (v) this.attrs.hidden = ""; else delete this.attrs.hidden; }
    get disabled() { return "disabled" in this.attrs; }
    set disabled(v) { if (v) this.attrs.disabled = ""; else delete this.attrs.disabled; }
    get style() { return {}; }
    focus() { for (let n = this; n; n = n.parent) if (n.hidden) return; if (this.disabled) return; doc.activeElement = this; }
    click() { if (this.disabled) return; this.dispatch({ type: "click" }); }
    dispatch(ev) { ev.target = this; ev.preventDefault = ev.preventDefault || function () { this.prevented = true; }; for (let n = this; n; n = n.parent) (n.ls[ev.type] || []).forEach((f) => f(ev)); return ev; }
  }
  doc.createElement = (t) => new N(t);
  doc.createTextNode = textNode;
  doc.getElementById = () => null;
  doc.addEventListener = () => {};
  doc.dispatchEvent = () => {};
  doc.createEvent = () => ({ initCustomEvent() {} });
  doc.documentElement = { setAttribute() {}, removeAttribute() {} };
  doc.body = new N("body");
  /* speechSynthesis gia */
  const synth = o.noSynth ? undefined : {
    voices: o.voices || [], spoken: [], cancels: 0, auto: o.auto !== false, auto_ms: 120,
    getVoices() { return this.voices; },
    speak(m) { this.spoken.push(m); if (this.auto) { if (m.onstart) m.onstart({}); setTimeout_(() => m.onend && m.onend({}), this.auto_ms); } },
    cancel() { this.cancels++; log.push("cancel"); },
    addEventListener() {}, removeEventListener() {}
  };
  const store = {};
  const win = {
    console, JSON, Math, Object, Array, Number, String, RegExp, Date, URLSearchParams, Error,
    setTimeout: setTimeout_, clearTimeout: clearTimeout_,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: doc, location: { hostname: "example.com", protocol: "https:", search: "" },
    matchMedia: () => ({ matches: false }), addEventListener() {},
    SpeechSynthesisUtterance: function (t) { this.text = t; }
  };
  win.window = win;
  if (synth) win.speechSynthesis = synth;
  if (o.noUtterance) delete win.SpeechSynthesisUtterance;
  vm.createContext(win);
  for (const f of o.files || ["core.js"]) vm.runInContext(src(f), win, { filename: f });
  return { win, BS: win.BS, synth, advance, log, doc, store };
}
const V = (lang, name, def) => ({ lang, name: name || lang, default: !!def });
const all = (n, pred, out = []) => { if (pred(n)) out.push(n); n.kids.forEach((k) => all(k, pred, out)); return out; };
const byClass = (n, c) => all(n, (x) => (x.attrs.class || "").split(/\s+/).includes(c));
const btnText = (n, t) => all(n, (x) => x.tag === "button" && x.textContent.indexOf(t) !== -1);
const key = (node, k, extra) => node.dispatch(Object.assign({ type: "keydown", key: k }, extra || {}));

const clone = (o) => JSON.parse(JSON.stringify(o));
const FILES = ["core.js", "quiz.js"];
const PREFIX = "Lời thoại: ";
const exOf = (items) => ({ id: "u-test", exercises: [{ id: "fx", type: "fill", instruction_vi: "Điền.", items }] });
function mountQuiz(u) {
  const E = makeEnv({ files: FILES, voices: [V("en-US"), V("en-GB")] });
  const root = E.doc.createElement("div");
  E.BS.render.quiz(u, root);
  return Object.assign(E, { root });
}
const fullLines = (root) => all(root, (x) => x.tag === "p" && x.textContent.indexOf(PREFIX) === 0).map((x) => x.textContent.slice(PREFIX.length));
const revealAll = (u) => { const E = mountQuiz(u); btnText(E.root, "Hiện lời thoại").forEach((b) => b.click()); return fullLines(E.root); };
const gradeWith = (it, typed) => {
  const E = mountQuiz(exOf([it]));
  all(E.root, (x) => x.tag === "input")[0].value = typed;
  btnText(E.root, "Chấm điểm")[0].click();
  return { line: fullLines(E.root)[0], ok: byClass(E.root, "ok").length === 1 };
};
/* tab Luyen nghe: di het cac cau, bam nut nghe, lay dung chuoi gui cho speechSynthesis */
function spokenAll(u) {
  const E = makeEnv({ files: FILES, voices: [V("en-US"), V("en-GB")] });
  const root = E.doc.createElement("div");
  E.BS.render.listen(u, root);
  const next = btnText(root, "Sau")[0], out = [];
  for (let guard = 0; guard < 500; guard++) {
    const before = E.synth.spoken.length;
    btnText(byClass(root, "listen-btns")[0], "0.9")[0].click();
    E.advance(1000);
    out.push(E.synth.spoken.slice(before).map((m) => m.text).join(" "));
    if (next.disabled) break;
    next.click();
  }
  return out;
}

/* ================= bon truong hop ================= */
const CASES = [
  ["giua cau binh thuong", { id: "c1", before: "Please", answers: ["send"], after: "the file today." }, "Please send the file today."],
  ["after bat dau bang dau ?", { id: "c2", before: "The brochure is free,", answers: ["isn't it"], after: "? Take one." }, "The brochure is free, isn't it? Take one."],
  ["after bat dau bang dau phay", { id: "c3", before: "This one", answers: ["however"], after: ", is new." }, "This one however, is new."],
  ["cho trong dau cau (before rong)", { id: "c4", before: "", answers: ["where"], after: "can I park?" }, "Where can I park?"],
  ["cho trong sau dau cham, co goi y", { id: "c5", before: "The path is long. (H...)", answers: ["however"], after: ", people like it." }, "The path is long. However, people like it."],
  ["cho trong sau dau ?", { id: "c6", before: "Why did it close?", answers: ["because"], after: "the power went out." }, "Why did it close? Because the power went out."],
  ["goi y giua cau: bo, khong viet hoa", { id: "c7", before: "Actually, let's (g...)", answers: ["go"], after: "back." }, "Actually, let's go back."],
  ["ngoac co nghia duoc giu", { id: "c8", before: "The team (HR)", answers: ["has hired"], after: "two people (see page 2) for Block (a)." }, "The team (HR) has hired two people (see page 2) for Block (a)."],
  ["ngoac ngay sau cho trong nhung khong phai mot tu viet thuong: giu", { id: "c11", before: "Our", answers: ["partner"], after: "(ABC Ltd) signed." }, "Our partner (ABC Ltd) signed."],
  ["dong tu goc ngay sau cho trong", { id: "c12", before: "The team", answers: ["has hired"], after: "(hire) two people." }, "The team has hired two people."],
  ["dong tu goc sau dau ? cuoi cau", { id: "c13", before: "Would you mind", answers: ["holding"], after: "the ladder? (hold)" }, "Would you mind holding the ladder?"],
  ["ghi chu (one word) cuoi cau", { id: "c14", before: "Why", answers: ["not"], after: "ask Tobias? (one word)" }, "Why not ask Tobias?"],
  ["nghia tieng Viet cuoi cau", { id: "c15", before: "It depends", answers: ["on"], after: "how many are cracked. (Còn tùy có bao nhiêu viên bị nứt.)" }, "It depends on how many are cracked."]
];
for (const [name, it, want] of CASES) {
  const got = revealAll(exOf([it]))[0], said = spokenAll(exOf([it]))[0];
  check("hien dap an: " + name, got === want, JSON.stringify(got));
  check("doc to: " + name, said === want, JSON.stringify(said));
}
{
  const it = CASES[4][1];
  const E = mountQuiz(exOf([it]));
  check("cau hoi chua tra loi van hien goi y (H...)", byClass(E.root, "qrow")[0].textContent.includes("(H...)"));
  const lower = gradeWith(it, "however"), upper = gradeWith(it, "However"), wrong = gradeWith(it, "therefore");
  check("cham diem khong doi: chu thuong va chu hoa deu dung, tu khac sai", lower.ok && upper.ok && !wrong.ok);
  const alt = gradeWith({ id: "c9", before: "", answers: ["when", "what time"], after: "does it leave?" }, "what time");
  check("dap an khac answers[0]: cau hien dung dap an da go, viet hoa dau cau", alt.ok && alt.line === "What time does it leave?", JSON.stringify(alt.line));
  const alt2 = gradeWith({ id: "c10", before: "It is free, (i...)", answers: ["isn't it", "is it not"], after: "?" }, "is it not");
  check("dap an khac answers[0]: khong cach truoc dau cau, bo goi y", alt2.ok && alt2.line === "It is free, is it not?", JSON.stringify(alt2.line));
}

{
  const hinted = CASES.filter((c) => ["c12", "c13", "c14", "c15"].includes(c[1].id)).map((c) => c[1]);
  const E = mountQuiz(exOf(hinted));
  btnText(E.root, "Hiện lời thoại")[0].click();
  const rows = byClass(E.root, "qrow");
  check("cau hoi van hien (hire), (hold), (one word) va nghia tieng Viet, ca sau khi hien loi thoai", rows.length === hinted.length && hinted.every((it, i) => rows[i].kids[0].textContent.includes(it.after)));
}

/* ================= "dien not tu" (join: true) ================= */
{
  const it = { id: "j1", join: true, before: "Our team will take ca", answers: ["re"], after: "of the sign." };
  const want = "Our team will take care of the sign.";
  const got = revealAll(exOf([it]))[0], said = spokenAll(exOf([it]))[0];
  check("join: hien dap an noi lien hai nua tu", got === want, JSON.stringify(got));
  check("join: doc to noi lien hai nua tu", said === want, JSON.stringify(said));
  const first = revealAll(exOf([{ id: "j2", join: true, before: "pay", answers: ["ment"], after: ", then leave." }]))[0];
  check("join: khong viet hoa phan duoi tu, khong cach truoc dau phay", first === "payment, then leave.", JSON.stringify(first));
  check("join: cham diem nhu truoc (go phan con thieu la dung, go ca tu la sai)", gradeWith(it, "re").ok && gradeWith(it, "RE").ok && !gradeWith(it, "care").ok);
  const inline = (item) => byClass(mountQuiz(exOf([item])).root, "qrow")[0].kids[0];
  /* chuoi chu truoc o nhap, va kiem o nhap nam cung span khong xuong dong voi nua dau cua tu */
  const beforeInput = (p) => { let s = "", hit = false; (function walk(n) { if (hit) return; if (n.tag === "input") { hit = true; return; } if (n.isText) s += n.t; n.kids.forEach(walk); })(p); return s; };
  const p = inline(it), wrap = all(p, (x) => x.tag === "span" && x.attrs.style === "white-space:nowrap")[0];
  check("join: o nhap dinh lien nua dau cua tu (khong dau cach), cung mot span nowrap", beforeInput(p) === "Our team will take ca" && !!wrap && wrap.textContent === "ca" && wrap.kids.some((k) => k.tag === "input"), JSON.stringify(beforeInput(p)));
  check("khong join: van co dau cach truoc o nhap", beforeInput(inline(CASES[0][1])) === "Please ");
}
{
  const FULL = {
    "p5-01": ["payment service", "particularly good", "knowledgeable about", "generous donation", "receptionist last"],
    "p5-04": ["pay attention to", "an agreement on", "take care of", "into account before", "an appointment with"]
  };
  const joined = [], bad = [];
  for (const f of fs.readdirSync(path.join(ROOT, "data")).filter((f) => /^[lp][\d-]+\.js$/.test(f)).sort()) {
    const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data", f), "utf8"), w);
    for (const u of Object.values(w.BS_UNITS || {})) for (const ex of (u.exercises || []).filter((x) => x.type === "fill")) {
      const partial = /hậu tố|tiền tố|phần còn thiếu của từ|nốt từ/i.test(ex.instruction_vi || "");
      for (const it of ex.items || []) {
        if (partial && it.join !== true) bad.push(u.id + " " + it.id + ": de bai dien mot phan tu nhung thieu join");
        if (it.join === true) joined.push([u.id, it]);
      }
    }
  }
  check("data/: dung 10 cau join (p5-01, p5-04), bai co de 'phan cua tu' deu co join", !bad.length && joined.length === 10 && joined.every(([id]) => FULL[id]), bad.concat(joined.length).join("\n     "));
  for (const id of Object.keys(FULL)) {
    const items = joined.filter((x) => x[0] === id).map((x) => clone(x[1]));
    const shown = revealAll(exOf(items)), said = spokenAll(exOf(items));
    check("data/ " + id + ": cau hoan chinh co tu lien (hien va doc)", shown.length === 5 && shown.every((s, i) => s.includes(FULL[id][i])) && said.join("\n") === shown.join("\n"), shown.join("\n     "));
    const out = blind({ id, exercises: [{ id: "fill1", type: "fill", items }] }, "fill");
    check("export-blind " + id + ": goi giu join, khong lo dap an", !violations(out).length && out.exercises[0].items.every((x) => x.join === true && Object.keys(x).sort().join() === "after,before,id,join"));
    const audit = englishStrings({ exercises: [{ id: "fill1", type: "fill", items }] }).map((x) => x.s);
    check("check-cross " + id + ": cau ghep noi lien hai nua tu", audit.length === 5 && audit.every((s, i) => s.includes(FULL[id][i])), audit.join("\n     "));
  }
  check("quiz.js: khong dung unicode property escape (can ES2018, trinh duyet cu loi cu phap ca file)", !/\\p\{/.test(src("quiz.js")));
}

/* ================= moi cau dien cho trong trong data/ ================= */
{
  const bad = [];
  let total = 0, variants = 0;
  /* data/ hien chi co ngoac goi y: cau hoan chinh khong duoc con ngoac nao. Them ngoac co nghia vao data/ thi sua dieu kien nay */
  const BAD = /\s[,.?!]|[()]/u;
  let hintedItems = 0;
  for (const f of fs.readdirSync(path.join(ROOT, "data")).filter((f) => /^[lp][\d-]+\.js$/.test(f)).sort()) {
    const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data", f), "utf8"), w);
    for (const u of Object.values(w.BS_UNITS || {})) {
      const fills = clone((u.exercises || []).filter((x) => x.type === "fill"));
      if (!fills.length) continue;
      const only = { id: u.id, exercises: fills };
      const items = [].concat(...fills.map((x) => x.items || [])).filter((x) => x.answers && x.answers.length);
      const shown = revealAll(only), said = spokenAll(only);
      const asked = byClass(mountQuiz(only).root, "qrow").map((r) => r.kids[0].textContent);
      items.forEach((it, i) => {
        const hints = ((it.before || "") + " " + (it.after || "")).match(/\([^()]*\)/g) || [];
        if (hints.length) hintedItems++;
        if (!hints.every((h) => (asked[i] || "").includes(h))) bad.push(f + " " + it.id + ": cau hoi mat goi y: " + asked[i]);
      });
      if (shown.length !== items.length || said.join("\n") !== shown.join("\n")) bad.push(f + ": so cau hien (" + shown.length + ") / doc (" + said.length + ") / du lieu (" + items.length + ") lech nhau");
      shown.forEach((s) => { total++; if (BAD.test(s)) bad.push(f + ": " + s); });
      for (const it of items) {
        if (/(^|[.?!])\s*(\(\p{L}\.+\))?\s*$/u.test(it.before || "")) {
          const line = revealAll(exOf([it]))[0], at = line.toLowerCase().indexOf(it.answers[0].toLowerCase(), (it.before || "").replace(/\s*\(\p{L}\.+\)/u, "").trim().length);
          if (at < 0 || line.charAt(at) !== line.charAt(at).toUpperCase()) bad.push(f + " " + it.id + ": dap an dau cau chua viet hoa: " + line);
        }
        for (const a of it.answers.slice(1)) { const r = gradeWith(it, a); variants++; if (!r.ok || BAD.test(r.line)) bad.push(f + " " + it.id + " (" + a + "): " + r.line); }
      }
    }
  }
  check("data/: co cau dien cho trong de kiem, trong do co cau mang goi y", total >= 100 && hintedItems >= 22, total + " / " + hintedItems);
  check("data/: " + total + " cau + " + variants + " dap an khac: khong cach truoc , . ? !, cau hoan chinh khong con ngoac, cau hoi giu goi y, dau cau viet hoa, hien = doc", !bad.length, bad.slice(0, 10).join("\n     "));
}

/* ================= tong ket ================= */
console.log("\ntest-fill: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
