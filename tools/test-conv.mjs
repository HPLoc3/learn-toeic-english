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

/* ================= conv.js: convSeq + renderConv ================= */
const FIX = (() => { const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "tools/fixtures/conv-pass.js"), "utf8"), w); return JSON.parse(JSON.stringify(w.BS_UNITS["p3-01"])); })();
const S1 = FIX.exercises[0].sets[0], S2 = FIX.exercises[1].sets[0];
const EXC = () => ({ id: "cx", type: "conv", instruction_vi: "Nghe và chọn.", sets: JSON.parse(JSON.stringify([S1, S2])) });
const TALK = () => ({ id: "tk", type: "conv", sets: [{ id: "tk-s1", kind: "talk", talk_type: "announcement", speakers: [{ id: "A", gender: "f", accent: "au" }],
  lines: [{ s: "A", en: "Attention, shoppers. The store will close in ten minutes.", vi: "x" }, { s: "A", en: "Please bring your items to the registers.", vi: "y" }, { s: "A", en: "Thank you.", vi: "z" }],
  questions: [{ id: "tk-s1-q1", kind: "main", q: { en: "Where is the announcement being made?", vi: "?" }, answer: "A", evidence: [0], explain_vi: "e",
    options: [{ label: "A", en: "At a store", vi: "a" }, { label: "B", en: "At a bank", vi: "b", trap: "not-mentioned", why_vi: "w" }, { label: "C", en: "At a gym", vi: "c", trap: "not-mentioned", why_vi: "w" }, { label: "D", en: "At a hotel", vi: "d", trap: "not-mentioned", why_vi: "w" }] }] }] });
const CVF = ["core.js", "quiz.js", "conv.js"];
function mountC(o = {}) {
  const E = makeEnv(Object.assign({ voices: [V("en-US", "Alex"), V("en-GB", "Kate"), V("en-AU", "Karen")], files: CVF }, o));
  const st = E.BS.unit("p3-test");
  if (o.pre) o.pre(st);
  const ex = o.ex ? o.ex() : EXC();
  const card = E.BS.renderConv(ex, 0, st, "p3-test");
  E.advance(900);
  const sets = byClass(card, "cv-set");
  return Object.assign(E, { st, card, sets, ex });
}
const copts = (s) => byClass(s, "cv-opt");
const qopts = (s, q) => byClass(byClass(s, "cv-q")[q], "cv-opt");
const cplay = (s) => byClass(s, "cv-play")[0];
const cchk = (s) => byClass(s, "cv-check")[0];
const cfb = (s) => byClass(s, "cv-fb")[0];
const pickAll = (s, letters) => letters.forEach((L, q) => qopts(s, q)["ABCD".indexOf(L)].click());
const scoreOf = (n) => byClass(n, "score")[0];

{
  /* convSeq */
  const M = mountC();
  check("convSeq: xuat ra BS", typeof M.BS.convSeq === "function");
  const q = M.BS.convSeq(S1);
  check("convSeq: mot phan moi dong, who = nguoi noi, accent theo nguoi noi", q.parts.length === 6 && q.parts.map((p) => p.who).join("") === "WMWMWM" && q.parts[0].accent === "gb" && q.parts[1].accent === "us");
  check("convSeq: cast gom id, accent, gender (cho castVoices)", JSON.stringify(q.cast) === JSON.stringify([{ id: "W", accent: "gb", gender: "f" }, { id: "M", accent: "us", gender: "m" }]));
  check("convSeq: nghi 350 ms khi doi nguoi noi, khong co loi dan vao", q.parts.slice(0, 5).every((p) => p.pause === 350) && q.parts[0].text === S1.lines[0].en);
  const same = M.BS.convSeq({ speakers: S1.speakers, lines: [{ s: "W", en: "One two three four." }, { s: "W", en: "Five six seven eight." }, { s: "M", en: "Nine." }] });
  check("convSeq: nghi 250 ms khi cung nguoi noi", same.parts[0].pause === 250 && same.parts[1].pause === 350);
  const long = "This is the first sentence of a rather long line that keeps going for a while. This is the second sentence which also keeps going and going for quite some time now. Third one is short.";
  const lq = M.BS.convSeq({ speakers: S1.speakers, lines: [{ s: "W", en: long }, { s: "M", en: "Okay." }] });
  const wp = lq.parts.filter((p) => p.who === "W");
  check("convSeq: dong > 140 ky tu tach o cuoi cau thanh nhieu phan cung who, moi phan <= 140, nghi 150 giua cac phan", long.length > 140 && wp.length >= 2 && wp.every((p) => p.text.length <= 140) && wp.slice(0, -1).every((p) => p.pause === 150) && wp[wp.length - 1].pause === 350 && lq.parts.map((p) => p.text).join(" ") === long + " Okay.");
  const one = M.BS.convSeq(S1, [2]);
  check("convSeq: chi mot dong (phat lai tung dong)", one.parts.length === 1 && one.parts[0].text === S1.lines[2].en && one.cast.length === 2);
}
{
  /* render truoc khi nghe */
  const M = mountC();
  check("renderConv: the section.card, hai doan", M.card.tag === "section" && M.sets.length === 2);
  const txt = M.card.textContent;
  check("tieu de doan: 'Đoạn 1/2 (câu 1–3)' va 'Đoạn 2/2 (câu 4–6)'", /Đoạn 1\/2 \(câu 1–3\)/.test(txt) && /Đoạn 2\/2 \(câu 4–6\)/.test(txt));
  check("truoc khi nghe: hien ca 3 cau hoi va 4 dap an bang tieng Anh", /Why does the man need a different room\?/.test(txt) && /More people will attend\./.test(txt) && /A\. The projector is broken\./.test(txt) && copts(M.sets[0]).length === 12);
  check("truoc khi nghe: KHONG in loi thoai va ban dich", !/Kenji, the client meeting|Let me look at the schedule|Tôi sẽ đặt ngay/.test(txt));
  check("truoc khi nghe: KHONG in giai thich/ban dich dap an", !/Người phụ nữ nói số người|Máy chiếu bị hỏng/.test(txt));
  const fs0 = byClass(M.sets[0], "cv-q");
  check("moi cau la fieldset co legend", fs0.length === 3 && fs0.every((f) => f.tag === "fieldset" && f.kids[0].tag === "legend"));
  check("dap an la button type=button, aria-pressed=false, bi khoa truoc khi nghe", copts(M.sets[0]).every((b) => b.tag === "button" && b.getAttribute("type") === "button" && b.getAttribute("aria-pressed") === "false" && b.disabled));
  check("nut Kiem tra bi khoa luc dau", cchk(M.sets[0]).disabled && cchk(M.sets[0]).textContent === "Kiểm tra");
  const gr = byClass(M.sets[0], "cv-graphic")[0];
  const tb = all(gr, (x) => x.tag === "table")[0];
  check("hinh: <table> co <caption> va 3 <th scope=col>, 4 hang du lieu, lang=en", !!tb && all(tb, (x) => x.tag === "caption")[0].textContent === "Meeting Rooms - Tuesday" && all(tb, (x) => x.tag === "th" && x.getAttribute("scope") === "col").length === 3 && all(tb, (x) => x.tag === "tr").length === 5 && gr.getAttribute("lang") === "en");
  check("hinh: boc trong vung cuon ngang (cv-scroll) cho man hinh nho", byClass(gr, "cv-scroll").length === 1);
  check("hinh nam truoc nut nghe trong doan", M.sets[0].kids.indexOf(gr.parent === M.sets[0] ? gr : gr) < M.sets[0].kids.indexOf(cplay(M.sets[0]).parent));
  check("doan khong co hinh thi khong in khung hinh", byClass(M.sets[1], "cv-graphic").length === 0);
  const live = all(M.card, (x) => x.getAttribute("aria-live") !== null), stat = all(M.card, (x) => x.getAttribute("role") === "status");
  check("vung thong bao: aria-live=polite chi o khung diem; fb khong phai live region; vung role=status duy nhat la notice cua quizKit (an, rong)", live.length === 1 && live[0] === byClass(M.card, "score")[0] && live[0].getAttribute("aria-live") === "polite" && stat.length === 1 && stat[0].hidden && stat[0].textContent === "" && cfb(M.sets[0]).getAttribute("aria-live") === null && cfb(M.sets[0]).getAttribute("role") === "group" && cfb(M.sets[0]).getAttribute("tabindex") === "-1");
  check("co nut toc do va nut Che do thi; huong dan phim tat 1-4 va R", btnText(M.card, "Chậm 0.7").length === 1 && btnText(M.card, "Chế độ thi: tắt").length === 1 && /1, 2, 3, 4/.test(txt) && /R nghe lại/.test(txt));
}
{
  /* nghe, chon, cham */
  const M = mountC();
  const s = M.sets[0], play = cplay(s);
  check("nut nghe co nhan 'Nghe hội thoại'", play.textContent === "Nghe hội thoại" && !play.disabled);
  play.click();
  check("nghe: doc dong dau ngay (nguoi nu en-GB, giong Kate, pitch 1)", M.synth.spoken.length === 1 && M.synth.spoken[0].text === S1.lines[0].en && M.synth.spoken[0].voice.name === "Kate" && M.synth.spoken[0].lang === "en-GB" && M.synth.spoken[0].pitch === 1);
  M.advance(120 + 350 + 10);
  check("nghe: dong hai la nguoi nam en-US, giong Alex", M.synth.spoken.length === 2 && M.synth.spoken[1].voice.name === "Alex" && M.synth.spoken[1].lang === "en-US");
  M.advance(5000);
  check("nghe: du 6 dong theo thu tu, toc do mac dinh 0.9", M.synth.spoken.length === 6 && M.synth.spoken.map((m) => m.text).join("|") === S1.lines.map((l) => l.en).join("|") && M.synth.spoken.every((m) => m.rate === 0.9));
  check("sau khi nghe: dap an duoc mo, nut nghe doi thanh 'Nghe lại hội thoại', nghe lai khong gioi han", copts(s).every((b) => !b.disabled) && play.textContent === "Nghe lại hội thoại" && !play.disabled);
  const n0 = M.synth.spoken.length;
  play.click(); play.click();
  check("luyen tap: nghe lai nhieu lan", M.synth.spoken.length === n0 + 2);
  btnText(M.card, "Chậm 0.7")[0].click();
  M.synth.spoken.length = 0; play.click();
  check("doi toc do 0.7 co hieu luc", M.synth.spoken[0].rate === 0.7);
  /* chon */
  qopts(s, 0)[0].click(); qopts(s, 1)[1].click();
  check("chon 2/3 cau: nut Kiem tra van khoa; aria-pressed theo lua chon", cchk(s).disabled && qopts(s, 0)[0].getAttribute("aria-pressed") === "true" && qopts(s, 1)[1].getAttribute("aria-pressed") === "true");
  qopts(s, 0)[1].click();
  check("doi lua chon truoc khi cham: A bo chon, B duoc chon", qopts(s, 0)[0].getAttribute("aria-pressed") === "false" && qopts(s, 0)[1].getAttribute("aria-pressed") === "true");
  qopts(s, 2)[0].click();
  check("du 3 lua chon: nut Kiem tra duoc mo; chua ghi diem", !cchk(s).disabled && M.st.res["c1-s1-q1"] === undefined && M.BS.stats().total === 0);
  M.log.length = 0; qopts(s, 1)[0].click(); /* doi cau 2 thanh A (sai) */
  cchk(s).click();
  check("cham: ghi ans/res ca 3 cau cung luc (B dung, A sai, A dung)", JSON.stringify([M.st.ans["c1-s1-q1"], M.st.ans["c1-s1-q2"], M.st.ans["c1-s1-q3"]]) === '["B","A","A"]' && JSON.stringify([M.st.res["c1-s1-q1"], M.st.res["c1-s1-q2"], M.st.res["c1-s1-q3"]]) === "[1,0,1]");
  check("cham: +10 XP moi cau dung (2 cau = 20)", M.BS.stats().total === 20);
  check("cham: diem luu theo ca bai (6 cau, da lam 3)", JSON.stringify(M.st.scores.cx) === JSON.stringify({ c: 2, t: 6, a: 3 }) && /Điểm: 2\/6/.test(scoreOf(M.card).textContent));
  const logStop = M.log.indexOf("cancel"), logScore = M.log.indexOf("text:score");
  check("cham: tat tieng TRUOC khi ghi vao vung aria-live", logStop !== -1 && logScore !== -1 && logStop < logScore, M.log.join());
  check("cham: tieu diem chuyen vao vung ket qua (fb)", M.doc.activeElement === cfb(s) && /Kết quả đoạn 1: đúng 2\/3/.test(cfb(s).getAttribute("aria-label")));
  check("cham: dap an bi khoa, danh dau dung/sai, nut Kiem tra an", copts(s).every((b) => b.disabled) && qopts(s, 0)[1].className.includes("opt-ok") && qopts(s, 1)[0].className.includes("opt-bad") && qopts(s, 1)[2].className.includes("opt-ok") && cchk(s).hidden);
  const fbt = cfb(s).textContent;
  check("sau cham: hien dap an dung, dich cau hoi/dap an, 'Bẫy:' voi why_vi cho dap an sai, giai thich", /✓ Câu 1: chính xác/.test(fbt) && /✗ Câu 2: chưa đúng\. Đáp án đúng: C/.test(fbt) && /Bẫy: Chỉ có trong hình/.test(fbt) && /Chỉ có 6 chỗ/.test(fbt) && /Tại sao người đàn ông cần phòng khác/.test(fbt) && /Giải thích: Người phụ nữ nói/.test(fbt));
  check("sau cham: in loi thoai co nhan 'Người nữ'/'Người nam' va ban dich", /Người nữ: Kenji, the client meeting/.test(fbt) && /Người nam: Then the room/.test(fbt) && /Tôi sẽ đặt ngay/.test(fbt));
  const ev = byClass(cfb(s), "cv-ev");
  check("dong chua dap an duoc danh dau (cv-ev) kem chu an 'chứa đáp án câu n'", ev.length === 5 && /chứa đáp án câu 1/.test(ev[0].textContent) && /chứa đáp án câu 2/.test(ev[2].textContent) && byClass(ev[0], "cv-sr").length === 1);
  M.synth.spoken.length = 0;
  btnText(cfb(s), "🔊")[1].click();
  check("phat lai tung dong dung giong cua nguoi do (dong 2 = Alex)", M.synth.spoken.length === 1 && M.synth.spoken[0].text === S1.lines[1].en && M.synth.spoken[0].voice.name === "Alex");
  /* cham lai: khong cong XP, khong ghi de */
  M.BS.stopSpeak();
  const xp = M.BS.stats().total;
  cchk(s).click(); qopts(s, 0)[2].click();
  check("sau cham: bam them khong doi gi (khong XP, ans giu nguyen)", M.BS.stats().total === xp && M.st.ans["c1-s1-q1"] === "B");
  /* lam lai */
  btnText(M.card, "Làm lại")[0].click();
  check("Lam lai: xoa ans/res/scores, mo lai doan, tieu diem ve nut Nghe cua doan dau", M.st.res["c1-s1-q1"] === undefined && M.st.ans["c1-s1-q1"] === undefined && M.st.scores.cx === undefined && scoreOf(M.card).textContent === "" && !cfb(s).textContent && M.doc.activeElement === cplay(s) && copts(s).every((b) => b.disabled && b.getAttribute("aria-pressed") === "false"));
  cplay(s).click(); pickAll(s, ["B", "C", "A"]); cchk(s).click();
  check("Lam lai roi cham lai: khong cong XP lan hai cho cau da nhan (once)", M.BS.stats().total === 30, String(M.BS.stats().total));
}
{
  /* xem loi thoai: khong XP */
  const M = mountC();
  const s = M.sets[0];
  check("xem loi thoai: nut an luc dau khi co giong", byClass(s, "cv-peek")[0].hidden);
  cplay(s).click();
  M.synth.cancel(); M.BS.stopSpeak();
  const M2 = mountC({ voices: [] });
  const s2 = M2.sets[0], pk = byClass(s2, "cv-peek")[0];
  check("khong co giong: hien nut 'Hiện lời thoại (không được XP)', dap an duoc mo", !pk.hidden && /không được XP/.test(pk.textContent) && copts(s2).every((b) => !b.disabled));
  pk.click();
  check("xem loi thoai: in tieng Anh co nhan nguoi noi, an nut", /Người nữ: Kenji/.test(byClass(s2, "cv-tr")[0].textContent) && pk.hidden);
  pickAll(s2, ["B", "C", "A"]); cchk(s2).click();
  check("da xem loi thoai: cham duoc nhung KHONG co XP", M2.st.res["c1-s1-q1"] === 1 && M2.BS.stats().total === 0 && M2.st.scores.cx.c === 3);
  const M3 = mountC({ noSynth: true });
  const s3 = M3.sets[0];
  cplay(s3).click();
  check("speakSeq tra null: thong bao + nut xem loi thoai, khong nem", !byClass(s3, "cv-peek")[0].hidden && /Không phát được âm thanh/.test(byClass(s3, "cv-note")[0].textContent));
  const M4 = mountC({ voices: [] });
  M4.BS.speakSeq = () => null;
  cplay(M4.sets[0]).click();
  check("speakSeq tra null (co giong): hien nut xem loi thoai", !byClass(M4.sets[0], "cv-peek")[0].hidden);
}
{
  /* khoi phuc */
  const M = mountC({ pre: (st) => { ["c1-s1-q1", "c1-s1-q2", "c1-s1-q3"].forEach((id, i) => { st.res[id] = [1, 0, 1][i]; st.ans[id] = ["B", "A", "A"][i]; }); } });
  const s = M.sets[0];
  check("khoi phuc: du 3 res thi hien trang thai da cham, khong XP", /Kết quả|chính xác/.test(cfb(s).textContent) && copts(s).every((b) => b.disabled) && M.BS.stats().total === 0 && cchk(s).hidden);
  check("khoi phuc: hien dung lua chon da luu (A sai o cau 2)", qopts(s, 1)[0].className.includes("opt-bad") && qopts(s, 1)[2].className.includes("opt-ok"));
  check("khoi phuc: doan 2 chua lam van o trang thai moi (dap an bi khoa)", copts(M.sets[1]).every((b) => b.disabled) && !cfb(M.sets[1]).textContent);
  const P = mountC({ pre: (st) => { st.res["c1-s1-q1"] = 1; st.ans["c1-s1-q1"] = "B"; } });
  check("khoi phuc mot phan (1/3): coi nhu moi, chua cham", !cfb(P.sets[0]).textContent && !cchk(P.sets[0]).hidden && copts(P.sets[0]).every((b) => b.disabled));
  const R = mountC({ pre: (st) => { ["c1-s1-q1", "c1-s1-q2", "c1-s1-q3"].forEach((id) => { st.res[id] = 1; st.ans[id] = 7; }); } });
  check("khoi phuc: ans khong hop le thi suy ra tu res (dung = dap an dung)", qopts(R.sets[0], 0)[1].className.includes("opt-ok"));
  const D = mountC({ pre: (st) => { st.res["c1-s1-q1"] = 1; st.ans["c1-s1-q1"] = "D"; st.res["c1-s1-q2"] = 0; st.ans["c1-s1-q2"] = "D"; st.res["c1-s1-q3"] = 0; st.ans["c1-s1-q3"] = "D"; } });
  check("khoi phuc: chap nhan dap an 'D'", qopts(D.sets[0], 1)[3].className.includes("opt-bad"));
  check("diem cu duoc hien khi mo lai", mountC({ pre: (st) => { st.scores.cx = { c: 4, t: 6, a: 6 }; } }).card.textContent.includes("Điểm: 4/6"));
}
{
  /* che do thi */
  const M = mountC({ auto: false });
  const s = M.sets[0], play = cplay(s), exam = btnText(M.card, "Chế độ thi")[0];
  exam.click();
  check("Che do thi bat: nut doi nhan, toc do bi khoa", exam.textContent === "Chế độ thi: bật" && exam.getAttribute("aria-pressed") === "true" && btnText(M.card, "Chậm 0.7")[0].disabled);
  play.focus(); play.click();
  check("Che do thi: toc do 1.0 va chi nghe mot lan (Nghe bi khoa)", M.synth.spoken[0].rate === 1 && play.disabled);
  check("Che do thi: Nghe bi khoa khi dang giu tieu diem -> tieu diem chuyen sang dap an dau cau 1", M.doc.activeElement === qopts(s, 0)[0]);
  check("Che do thi: ghi chu da dung luot nghe duy nhat", /lượt nghe duy nhất/.test(byClass(s, "cv-note")[0].textContent));
  M.BS.stopSpeak(); /* bi huy tu ben ngoai truoc khi am thanh bat dau -> hoan luot */
  check("Che do thi: bi huy truoc khi bat dau thi hoan lai luot nghe", !play.disabled && play.textContent === "Nghe hội thoại" && copts(s).every((b) => b.disabled));
  M.doc.activeElement = null;
  play.click(); M.synth.spoken[M.synth.spoken.length - 1].onstart({});
  check("Che do thi: tieu diem khong bi keo di neu Nghe khong giu tieu diem", M.doc.activeElement === null && play.disabled);
  M.BS.stopSpeak(); /* da bat dau -> khong hoan luot */
  check("Che do thi: da bat dau roi bi huy thi khong hoan luot", play.disabled);
  /* bat che do thi reset doan chua cham, giu doan da cham */
  const N = mountC();
  pickAll(N.sets[0], ["B", "C", "A"]);
  cplay(N.sets[0]).click(); qopts(N.sets[0], 0)[1].click(); qopts(N.sets[0], 1)[2].click(); qopts(N.sets[0], 2)[0].click(); cchk(N.sets[0]).click();
  cplay(N.sets[1]).click(); qopts(N.sets[1], 0)[0].click();
  btnText(N.card, "Chế độ thi")[0].click();
  check("bat Che do thi: doan chua cham duoc dat lai, doan da cham giu nguyen", copts(N.sets[1]).every((b) => b.disabled && b.getAttribute("aria-pressed") === "false") && cfb(N.sets[0]).textContent.length > 0 && !cplay(N.sets[0]).disabled);
  /* chia se giua cac the: bat o mot the thi the khac cung bat */
  const E2 = makeEnv({ voices: [V("en-US", "Alex")], files: CVF });
  const stA = E2.BS.unit("p3-a"), c1 = E2.BS.renderConv(EXC(), 0, stA, "p3-a"), c2 = E2.BS.renderConv(EXC(), 1, stA, "p3-a");
  btnText(c1, "Chế độ thi")[0].click();
  check("Che do thi dung chung cho moi the conv trong trang", btnText(c2, "Chế độ thi: bật").length === 1);
}
{
  /* ban phim */
  const M = mountC();
  const s = M.sets[0], q = byClass(s, "cv-q");
  key(q[0], "2");
  check("phim 1-4 khi dap an con khoa (chua nghe): khong chon", qopts(s, 0).every((b) => b.getAttribute("aria-pressed") === "false"));
  cplay(s).click();
  const k = key(q[0], "2");
  check("phim 2 chon B trong dung cau do, preventDefault", qopts(s, 0)[1].getAttribute("aria-pressed") === "true" && k.prevented === true && qopts(s, 1).every((b) => b.getAttribute("aria-pressed") === "false"));
  key(q[1], "4"); key(q[2], "1");
  check("phim 4 chon D, phim 1 chon A", qopts(s, 1)[3].getAttribute("aria-pressed") === "true" && qopts(s, 2)[0].getAttribute("aria-pressed") === "true");
  key(q[0], "3", { ctrlKey: true }); key(q[0], "3", { metaKey: true }); key(q[0], "3", { altKey: true }); key(q[0], "3", { isComposing: true });
  check("phim co ctrl/meta/alt/isComposing bi bo qua", qopts(s, 0)[2].getAttribute("aria-pressed") === "false" && qopts(s, 0)[1].getAttribute("aria-pressed") === "true");
  key(q[0], "5"); key(q[0], "x");
  check("phim 5 hoac chu khac khong lam gi", qopts(s, 0)[1].getAttribute("aria-pressed") === "true");
  const n0 = M.synth.spoken.length;
  key(s, "r");
  check("phim R nghe lai ca doan", M.synth.spoken.length === n0 + 1);
  key(s, "R", { ctrlKey: true });
  check("Ctrl+R khong nghe lai", M.synth.spoken.length === n0 + 1);
  cchk(s).click();
  key(q[0], "1");
  check("sau khi cham phim 1-4 khong doi ket qua", M.st.ans["c1-s1-q1"] === "B");
}
{
  /* bai noi (Part 4) */
  const M = mountC({ ex: TALK });
  const s = M.sets[0];
  check("bai noi: tieu de 'Nghe bài nói', nut 'Nghe bài nói', doan 1/1 (câu 1–1 dung 'câu 1')", /Nghe bài nói và chọn đáp án/.test(M.card.textContent) && cplay(s).textContent === "Nghe bài nói" && /Đoạn 1\/1 \(câu 1\)/.test(M.card.textContent));
  cplay(s).click(); M.advance(5000);
  check("bai noi: mot nguoi noi, giong nu en-AU (Karen), 3 dong", M.synth.spoken.length === 3 && M.synth.spoken.every((m) => m.voice.name === "Karen" && m.lang === "en-AU"));
  qopts(s, 0)[0].click(); cchk(s).click();
  check("bai noi: cham 1 cau, nhan 'Người nói'", M.st.res["tk-s1-q1"] === 1 && /Người nói: Attention, shoppers/.test(cfb(s).textContent) && M.BS.stats().total === 10);
}
{
  /* the co v unverified chi hien o che do bien tap; khong doi gi o day. tien do */
  const M = mountC();
  M.win.BS_UNITS = { "p3-test": { id: "p3-test", vocab: [], phrases: [], exercises: [M.ex] } };
  pickAll(M.sets[0], ["B", "C", "A"]);
  cplay(M.sets[0]).click(); pickAll(M.sets[0], ["B", "C", "A"]); cchk(M.sets[0]).click();
  const p = M.BS.unitProgress("p3-test");
  check("unitProgress sau khi cham doan 1: 3/6 cau", p.done === 3 && p.total === 6 && p.pct === 50, JSON.stringify(p));
}
{
  /* quiz.js chuyen conv sang renderConv */
  const E = makeEnv({ voices: [V("en-US", "Alex")], files: CVF });
  const root = E.doc.createElement("div");
  E.BS.render.quiz({ id: "p3-q", exercises: [EXC(), { id: "ghost", type: "zzz" }] }, root);
  check("quiz.js: ex.type conv duoc ve boi BS.renderConv, type la bi bo qua", byClass(root, "cv-set").length === 2 && all(root, (x) => x.tag === "section" && x.getAttribute("aria-label") === "Bài tập 1").length === 1);
}



/* ================= vong sua sau danh gia ================= */
{
  /* castVoices > 3 nguoi: ket thuc, pitch khac nhau khi co the */
  const E = makeEnv({ voices: [V("en-US", "Google US English")] });
  const five = [1, 2, 3, 4, 5].map((i) => ({ id: "F" + i, accent: "us", gender: "f" }));
  const c = E.BS.castVoices(five);
  const ps = c.map((x) => x.pitch);
  check("castVoices: 5 nguoi nu mot giong la: ket thuc, pitch deu trong 0.5-1.6 va khac nhau", c.length === 5 && ps.every((p) => p >= 0.5 && p <= 1.6) && new Set(ps).size === 5, ps.join());
  const E2 = makeEnv({ voices: [] });
  const c2 = E2.BS.castVoices([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => ({ id: "X" + i, accent: "gb", gender: "f" })));
  check("castVoices: 12 nguoi khong co giong van ket thuc, pitch trong 0.5-1.6", c2.length === 12 && c2.every((x) => x.pitch >= 0.5 && x.pitch <= 1.6) && new Set(c2.map((x) => x.pitch)).size >= 7);
  const E3 = makeEnv({ voices: ["Eddy", "Flo", "Grandma", "Grandpa", "Reed", "Rocko", "Sandy", "Shelley"].map((n) => V("en-US", n)).concat([V("en-US", "Martha"), V("en-GB", "Nathan")]) });
  const c3 = E3.BS.castVoices([{ id: "W", accent: "us", gender: "f" }, { id: "M", accent: "gb", gender: "m" }]);
  check("castVoices: giong Eloquence (Eddy, Flo, Grandma, Sandy...) bi loai; Martha/Nathan co gioi tinh", c3[0].v.name === "Martha" && c3[1].v.name === "Nathan" && c3.every((x) => x.matched));
}
{
  /* tieu diem sau khi xem loi thoai */
  const M = mountC({ voices: [] });
  const s = M.sets[0], pk = byClass(s, "cv-peek")[0];
  pk.focus(); pk.click();
  check("xem loi thoai: tieu diem khong con o nut da an, chuyen sang dap an dau cau 1 (dang mo)", pk.hidden && M.doc.activeElement === qopts(s, 0)[0] && !M.doc.activeElement.disabled && !M.doc.activeElement.hidden);
  const M2 = mountC({ voices: [] });
  const pk2 = byClass(M2.sets[0], "cv-peek")[0]; M2.doc.activeElement = null; pk2.click();
  check("xem loi thoai: khong keo tieu diem neu nut khong giu tieu diem", M2.doc.activeElement === null);
  const M3 = mountC({ noSynth: true });
  cplay(M3.sets[0]).focus(); cplay(M3.sets[0]).click();
  const pk3 = byClass(M3.sets[0], "cv-peek")[0]; pk3.focus(); pk3.click();
  check("speakSeq null roi xem loi thoai: tieu diem cung khong ket tren nut an", M3.doc.activeElement === qopts(M3.sets[0], 0)[0]);
}
{
  /* che do thi: hoan luot khi huy -> dap an bi khoa, tieu diem ve nut Nghe */
  const M = mountC({ auto: false });
  const s = M.sets[0], play = cplay(s);
  btnText(M.card, "Chế độ thi")[0].click();
  play.focus(); play.click();
  check("che do thi: tieu diem sang dap an dau sau khi bam Nghe", M.doc.activeElement === qopts(s, 0)[0]);
  M.BS.stopSpeak();
  check("che do thi: huy truoc khi bat dau -> dap an bi khoa va tieu diem tro ve nut Nghe (khong o nut bi khoa)", M.doc.activeElement === play && !play.disabled && copts(s).every((b) => b.disabled));
}
{
  /* khoi phuc mot phan: bo ket qua le, khong tinh vao diem/tien do */
  const M = mountC({ pre: (st) => { st.res["c1-s1-q1"] = 1; st.ans["c1-s1-q1"] = "B"; st.res["c1-s1-q2"] = 0; st.ans["c1-s1-q2"] = "A"; ["c2-s1-q1", "c2-s1-q2", "c2-s1-q3"].forEach((id, i) => { st.res[id] = [1, 0, 1][i]; st.ans[id] = ["D", "C", "B"][i]; }); st.scores.cx = { c: 9, t: 6, a: 9 }; } });
  check("khoi phuc mot phan (2/3): res/ans cua doan do bi bo, doan khac giu nguyen", M.st.res["c1-s1-q1"] === undefined && M.st.ans["c1-s1-q2"] === undefined && M.st.res["c2-s1-q1"] === 1 && M.st.res["c2-s1-q3"] === 1);
  check("khoi phuc mot phan: diem tinh lai chi tu cac cau con lai (doan day du 2/3 dung)", JSON.stringify(M.st.scores.cx) === JSON.stringify({ c: 2, t: 6, a: 3 }) && /Điểm: 2\/6/.test(scoreOf(M.card).textContent), JSON.stringify(M.st.scores.cx));
  const E = makeEnv({ voices: [], files: CVF });
  const stp = E.BS.unit("p3-test"); stp.res["c1-s1-q1"] = 1;
  const ex = EXC();
  E.win.BS_UNITS = { "p3-test": { id: "p3-test", vocab: [], phrases: [], exercises: [ex] } };
  E.BS.renderConv(ex, 0, stp, "p3-test");
  check("khoi phuc mot phan: unitProgress khong dem cau le", E.BS.unitProgress("p3-test").done === 0);
}
{
  /* giong chua nap: lan bao dau 'khong co giong' chi la tam thoi */
  const E = makeEnv({ voices: [], files: CVF });
  const card = E.BS.renderConv(EXC(), 0, E.BS.unit("p3-test"), "p3-test");
  E.advance(100);
  const s = byClass(card, "cv-set")[0];
  check("giong chua nap (100 ms): chua mo dap an, chua hien nut xem loi thoai", copts(s).every((b) => b.disabled) && byClass(s, "cv-peek")[0].hidden);
  E.advance(800);
  check("sau 800 ms van khong co giong: mo dap an va hien nut xem loi thoai", copts(s).every((b) => !b.disabled) && !byClass(s, "cv-peek")[0].hidden);
  const E2 = makeEnv({ voices: [V("en-US", "Alex")], files: CVF });
  const c2 = E2.BS.renderConv(EXC(), 0, E2.BS.unit("p3-test"), "p3-test");
  check("co giong ngay tu dau: van khoa dap an cho den khi nghe", byClass(c2, "cv-opt").every((b) => b.disabled) && byClass(c2, "cv-peek").every((b) => b.hidden));
}
{
  /* du lieu chua HTML chi duoc hien thanh chu */
  const X = '<img src=x onerror=alert(1)>';
  const ex = EXC();
  const s0 = ex.sets[0];
  s0.lines[0].en = X + " Hello there."; s0.lines[0].vi = X + "vi";
  s0.graphic.title = X + "title"; s0.graphic.cols[0] = X + "col"; s0.graphic.rows[0][0] = X + "cell";
  s0.questions[0].q.en = X + " question?"; s0.questions[0].q.vi = X + "qvi"; s0.questions[0].options[0].en = X + "opt"; s0.questions[0].options[0].vi = X + "ovi"; s0.questions[0].options[0].why_vi = X + "why"; s0.questions[0].explain_vi = X + "exp";
  const M = mountC({ ex: () => ex });
  const n0 = all(M.card, (x) => x.tag === "img").length;
  cplay(M.sets[0]).click(); pickAll(M.sets[0], ["A", "C", "A"]); cchk(M.sets[0]).click();
  const imgs = all(M.card, (x) => x.tag === "img" || x.tag === "script" || Object.keys(x.attrs).some((k) => /^on/i.test(k)));
  const txt = M.card.textContent;
  check("markup trong du lieu (en/vi/graphic/dap an/giai thich) khong tao phan tu, chi hien thanh chu", n0 === 0 && imgs.length === 0 && txt.includes(X + " question?") && txt.includes(X + "cell") && txt.includes(X + "title") && txt.includes(X + "why") && txt.includes(X + "vi"));
}
{
  /* tieu de bai: theo kieu cac doan */
  const mixed = EXC(); mixed.sets[1].kind = "talk";
  const mm = mountC({ ex: () => mixed });
  check("bai gom hoi thoai va bai noi: tieu de trung tinh, nut nghe theo tung doan", /Nghe hội thoại hoặc bài nói và chọn đáp án/.test(mm.card.textContent) && cplay(mm.sets[0]).textContent === "Nghe hội thoại" && cplay(mm.sets[1]).textContent === "Nghe bài nói");
}


{
  /* khoi phuc mot phan khi khong co doan nao khac da cham: khong de lai diem rong */
  const M = mountC({ pre: (st) => { st.res["c1-s1-q1"] = 1; st.ans["c1-s1-q1"] = "B"; st.scores.cx = { c: 1, t: 6, a: 1 }; } });
  check("khoi phuc mot phan, khong con cau nao da lam: xoa muc diem va khung diem trong", M.st.scores.cx === undefined && scoreOf(M.card).textContent === "" && !/Điểm/.test(M.card.textContent));
}
{
  /* thiet bi luon huy ngay: sau 2 lan hoan luot lien tiep thi hien nut xem loi thoai */
  const M = mountC({ auto: false });
  const s = M.sets[0], pk = byClass(s, "cv-peek")[0];
  cplay(s).click(); M.BS.stopSpeak();
  check("huy ngay lan 1: da hoan luot, chua hien nut xem loi thoai", pk.hidden && copts(s).every((b) => b.disabled));
  cplay(s).click(); M.BS.stopSpeak();
  check("huy ngay 2 lan lien tiep: hien nut xem loi thoai va thong bao", !pk.hidden && /Không phát được âm thanh/.test(byClass(s, "cv-note")[0].textContent));
  pk.click();
  check("sau do xem loi thoai thi mo dap an, khong ket", copts(s).every((b) => !b.disabled));
  const N = mountC({ auto: false });
  const s2 = N.sets[0];
  cplay(s2).click(); N.BS.stopSpeak();
  cplay(s2).click(); N.synth.spoken[N.synth.spoken.length - 1].onstart({}); N.BS.stopSpeak();
  cplay(s2).click(); N.BS.stopSpeak();
  check("huy ngay xen ke lan da bat dau phat: khong tinh la lien tiep", byClass(s2, "cv-peek")[0].hidden);
}


{
  /* speak() nem loi dong bo: khong ket o 'Dang phat', hien nut xem loi thoai */
  const M = mountC();
  M.synth.speak = () => { throw new Error("boom"); };
  const s = M.sets[0];
  cplay(s).click();
  check("speak() nem loi dong bo: nut nghe khong ket o 'Đang phát...'", cplay(s).textContent === "Nghe hội thoại" && !cplay(s).disabled);
  check("speak() nem loi dong bo: dap an van khoa, hien nut 'Hiện lời thoại' va thong bao", copts(s).every((b) => b.disabled) && !byClass(s, "cv-peek")[0].hidden && /Không phát được âm thanh/.test(byClass(s, "cv-note")[0].textContent));
  const E = makeEnv({ voices: [V("en-US", "Alex")] });
  E.synth.speak = () => { throw new Error("boom"); };
  let stops = 0;
  const h = E.BS.speakSeq([{ text: "A", accent: "us" }, { text: "B", accent: "us" }], { onstop: () => { stops++; } });
  check("speakSeq: ket thuc dong bo truoc khi phan nao bat dau -> tra null, khong goi onstop", h === null && stops === 0);
  const E2 = makeEnv({ voices: [V("en-US", "Alex")], auto: false });
  let stops2 = 0;
  const h2 = E2.BS.speakSeq([{ text: "A", accent: "us" }], { onstop: () => { stops2++; } });
  h2.cancel();
  check("speakSeq: huy sau khi da tra tay cam van goi onstop mot lan", !!h2 && stops2 === 1);
}
{
  /* vi trung en: khong in hai lan */
  const ex = EXC();
  const M = mountC({ ex: () => ex });
  cplay(M.sets[0]).click(); pickAll(M.sets[0], ["B", "A", "A"]); cchk(M.sets[0]).click();
  const li = all(cfb(M.sets[0]), (x) => x.tag === "li" && /Birch/.test(x.textContent) && /Hình|đúng/.test(x.textContent))[0];
  check("dap an co vi trung en (Birch/Birch): chi in mot lan trong phan hoi", !!li && li.textContent.split("Birch").length === 2, li && li.textContent);
  check("dap an co vi khac en van in ban dich", /Sẽ có nhiều người tham dự hơn/.test(cfb(M.sets[0]).textContent));
}
{
  const css = fs.readFileSync(path.join(ROOT, "assets/css/learn.css"), "utf8"), site = fs.readFileSync(path.join(ROOT, "assets/css/site.css"), "utf8");
  const cvCss = css.split("\n").filter((l) => l.startsWith(".cv-")).join(" ");
  const used = [...cvCss.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
  const undef = [...new Set(used)].filter((v) => !site.includes(v + ":") && !css.includes(v + ":"));
  check("learn.css: moi bien mau dung deu duoc dinh nghia o site.css (khong con --card-alt)", undef.length === 0 && !/--card-alt/.test(css), undef.join());
  check("bang cua conv: o tieu de dung --card-2 va --ink (doc duoc ca sang va toi)", /\.cv-table th\{background:var\(--card-2\);color:var\(--ink\)\}/.test(css));
}

{
  /* phan bat dau va ket thuc ngay trong speak(): tra null, khong cho onstop */
  const E = makeEnv({ voices: [V("en-US", "Alex")] });
  E.synth.speak = (m) => { if (m.onstart) m.onstart({}); if (m.onerror) m.onerror({ error: "canceled" }); };
  let stops = 0;
  const h = E.BS.speakSeq([{ text: "A", accent: "us" }, { text: "B", accent: "us" }], { onstop: () => { stops++; } });
  check("speakSeq: phan bat dau roi bi huy ngay trong speak(): tra null, khong goi onstop", h === null && stops === 0);
  const M = mountC();
  M.synth.speak = E.synth.speak;
  cplay(M.sets[0]).click();
  check("conv: huy dong bo sau khi bat dau: khong ket o 'Đang phát...', hien nut xem loi thoai", cplay(M.sets[0]).textContent === "Nghe hội thoại" && !byClass(M.sets[0], "cv-peek")[0].hidden);
}
console.log("\ntest-conv: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
