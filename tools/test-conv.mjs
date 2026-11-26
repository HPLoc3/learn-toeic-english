// Kiem tra Part 3/4: giong theo vai (core.js), tien do va bai tap conv (conv.js) bang node, khong can trinh duyet.
// Dung DOM gia toi thieu + speechSynthesis gia + dong ho gia. Chay: node tools/test-conv.mjs
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    focus() { doc.activeElement = this; }
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


/* ================= BS.castVoices ================= */
const CAST2 = [{ id: "W", accent: "gb", gender: "f" }, { id: "M", accent: "us", gender: "m" }];
{
  const E = makeEnv({ voices: [V("en-US", "Alex"), V("en-US", "Samantha"), V("en-GB", "Daniel"), V("en-GB", "Kate")] });
  check("castVoices: la ham xuat ra BS", typeof E.BS.castVoices === "function");
  const c = E.BS.castVoices(CAST2);
  check("castVoices: giu thu tu va id cua dan vai", c.length === 2 && c[0].id === "W" && c[1].id === "M");
  check("castVoices: nu en-GB nhan Kate, nam en-US nhan Alex", c[0].v.name === "Kate" && c[1].v.name === "Alex");
  check("castVoices: ten giong khop gioi tinh thi pitch 1 va matched", c.every((x) => x.pitch === 1 && x.matched === true));
  check("castVoices: lang theo accent yeu cau", c[0].lang === "en-GB" && c[1].lang === "en-US");
  check("castVoices: xac dinh (goi hai lan cho ket qua nhu nhau)", JSON.stringify(E.BS.castVoices(CAST2).map((x) => [x.id, x.v.name, x.pitch])) === JSON.stringify(c.map((x) => [x.id, x.v.name, x.pitch])));
}
{
  /* mot giong khong ro gioi tinh: dung chung, pitch 0.8 / 1.2 */
  const E = makeEnv({ voices: [V("en-US", "Google US English")] });
  const c = E.BS.castVoices(CAST2);
  check("mot giong la: ca hai dung chung giong", c[0].v === c[1].v && c[0].v.name === "Google US English");
  check("mot giong la: pitch nu 1.2, nam 0.8, matched=false", c[0].pitch === 1.2 && c[1].pitch === 0.8 && !c[0].matched && !c[1].matched);
}
{
  /* hai nguoi nam, mot giong nam: lech pitch >= 0.15 */
  const E = makeEnv({ voices: [V("en-US", "Daniel"), V("en-US", "Samantha")] });
  const c = E.BS.castVoices([{ id: "M1", accent: "us", gender: "m" }, { id: "M2", accent: "us", gender: "m" }]);
  check("hai nam mot giong: cung giong", c[0].v.name === "Daniel" && c[1].v.name === "Daniel", c.map((x) => x.v && x.v.name).join());
  check("hai nam mot giong: pitch lech it nhat 0.15", Math.abs(c[0].pitch - c[1].pitch) >= 0.15 - 1e-9, c.map((x) => x.pitch).join());
}
{
  /* hai nam, hai giong nam: moi nguoi mot giong */
  const E = makeEnv({ voices: [V("en-US", "Daniel"), V("en-US", "Alex")] });
  const c = E.BS.castVoices([{ id: "A", accent: "us", gender: "m" }, { id: "B", accent: "us", gender: "m" }]);
  check("hai nam hai giong nam: khac giong nhau", c[0].v !== c[1].v);
}
{
  /* giong la khong bao gio duoc chon */
  const NOV = ["Bells", "Zarvox", "Albert", "Bad News", "Good News", "Bahh", "Bubbles", "Cellos", "Boing", "Jester", "Organ", "Superstar", "Trinoids", "Whisper", "Wobble", "Fred", "Junior", "Princess"];
  const E = makeEnv({ voices: NOV.map((n) => V("en-US", n, n === "Zarvox")).concat([V("en-GB", "Daniel")]) });
  const c = E.BS.castVoices([{ id: "A", accent: "us", gender: "m" }, { id: "B", accent: "us", gender: "f" }]);
  check("giong la (Bells, Zarvox, Fred...) khong bao gio duoc chon", c.every((x) => x.v && x.v.name === "Daniel"), c.map((x) => x.v && x.v.name).join());
  const E2 = makeEnv({ voices: NOV.map((n) => V("en-US", n)) });
  const c2 = E2.BS.castVoices(CAST2);
  check("chi co giong la: khong chon giong nao (voice null), van co lang va pitch", c2.every((x) => x.v === null) && c2[0].lang === "en-GB" && c2[0].pitch === 1.2 && c2[1].pitch === 0.8);
}
{
  /* gioi tinh thang accent */
  const E = makeEnv({ voices: [V("en-GB", "Daniel"), V("en-US", "Samantha")] });
  const c = E.BS.castVoices([{ id: "W", accent: "gb", gender: "f" }]);
  check("gioi tinh thang accent: nu en-GB nhan Samantha (en-US) thay vi Daniel (en-GB)", c[0].v.name === "Samantha" && c[0].lang === "en-GB" && c[0].pitch === 1);
  const c3 = makeEnv({ voices: [V("en-AU", "Karen"), V("en-US", "Tom")] }).BS.castVoices([{ id: "M", accent: "au", gender: "m" }]);
  check("gioi tinh thang accent: nam en-AU nhan Tom (en-US) thay vi Karen (en-AU)", c3[0].v.name === "Tom" && c3[0].lang === "en-AU");
}
{
  /* khong co giong */
  const E = makeEnv({ voices: [] });
  const c = E.BS.castVoices(CAST2);
  check("khong co giong: voice null, lang theo accent, pitch theo gioi tinh", c.length === 2 && c[0].v === null && c[0].lang === "en-GB" && c[1].lang === "en-US" && c[0].pitch === 1.2 && c[1].pitch === 0.8);
  check("castVoices tham so xau: khong nem", E.BS.castVoices(null).length === 0 && E.BS.castVoices([null, {}]).length === 2);
  E.BS.speakSeq([{ text: "Hi.", who: "W" }, { text: "Hello.", who: "M" }], { rate: 1, cast: CAST2 });
  E.advance(5000);
  const s = E.synth.spoken;
  check("khong co giong: speakSeq van doc, voice trong, lang theo vai", s.length === 2 && s[0].voice === undefined && s[0].lang === "en-GB" && s[1].lang === "en-US");
}

/* ================= speakSeq voi who/cast ================= */
{
  const E = makeEnv({ voices: [V("en-US", "Alex"), V("en-GB", "Kate"), V("en-US", "Samantha")] });
  E.BS.speakSeq([{ text: "One.", who: "W", pause: 100 }, { text: "Two.", who: "M" }, { text: "Three.", who: "W" }], { rate: 1.0, cast: CAST2 });
  E.advance(5000);
  const s = E.synth.spoken;
  check("speakSeq cast: thu tu dung", s.map((m) => m.text).join("|") === "One.|Two.|Three.");
  check("speakSeq cast: moi phan dung giong, lang, pitch cua vai", s[0].voice.name === "Kate" && s[0].lang === "en-GB" && s[0].pitch === 1 && s[1].voice.name === "Alex" && s[1].lang === "en-US" && s[2].voice.name === "Kate");
  check("speakSeq cast: ap dung rate", s.every((m) => m.rate === 1));
}
{
  /* phan khong co who: giong het nhu truoc; who la: roi ve duong cu */
  const E = makeEnv({ voices: [V("en-US", "us1"), V("en-GB", "gb1")] });
  E.BS.speakSeq([{ text: "Q", accent: "us" }, { text: "R", accent: "gb", who: "Z" }, { text: "S", accent: "gb" }], { rate: 0.9, cast: CAST2 });
  E.advance(5000);
  const s = E.synth.spoken;
  check("who khong co trong cast hoac khong co who: dung pickVoice theo accent nhu cu", s[0].voice.name === "us1" && s[1].voice.name === "gb1" && s[2].voice.name === "gb1" && s[0].pitch === undefined && s[1].pitch === undefined);
  const E2 = makeEnv({ voices: [V("en-US", "us1"), V("en-GB", "gb1")] });
  E2.BS.speakSeq([{ text: "Q", accent: "us", who: "M" }, { text: "R", accent: "gb" }], { rate: 0.9 });
  E2.advance(5000);
  check("who ma khong co opts.cast: duong cu (khong pitch)", E2.synth.spoken[0].voice.name === "us1" && E2.synth.spoken[0].pitch === undefined);
  const E3 = makeEnv({ voices: [V("en-US", "only")] });
  E3.BS.speakSeq([{ text: "Q", accent: "us" }, { text: "R", accent: "gb" }], { rate: 1 });
  E3.advance(5000);
  check("duong cu khong doi: mot giong, en-GB co pitch 1.2", E3.synth.spoken[0].pitch === undefined && E3.synth.spoken[1].pitch === 1.2);
}

/* ================= unitProgress dem conv ================= */
{
  const E = makeEnv({ voices: [] });
  E.win.BS_UNITS = { "p3-x": { id: "p3-x", vocab: [], phrases: [], exercises: [
    { id: "c1", type: "conv", sets: [{ id: "c1-s1", questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }] }, { id: "c1-s2", questions: [{ id: "q4" }, { id: "q5" }, { id: "q6" }] }] },
    { id: "f1", type: "fill", items: [{ id: "f1-1" }] }] } };
  let p = E.BS.unitProgress("p3-x");
  check("unitProgress: conv dem moi cau trong sets (6 + 1 fill = 7)", p.total === 7 && p.done === 0 && p.pct === 0, JSON.stringify(p));
  const st = E.BS.unit("p3-x");
  st.res.q1 = 1; st.res.q2 = 0; st.res.q5 = 1; st.res["f1-1"] = 1;
  p = E.BS.unitProgress("p3-x");
  check("unitProgress: cau conv da tra loi (dung hoac sai) duoc tinh la da lam", p.done === 4 && p.total === 7 && p.pct === 57, JSON.stringify(p));
}


console.log("\ntest-conv: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
