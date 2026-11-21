// Kiem tra Part 2: BS.speakSeq (core.js) va bai tap qr (qr.js) bang node, khong can trinh duyet.
// Dung DOM gia toi thieu + speechSynthesis gia + dong ho gia. Chay: node tools/test-qr.mjs
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
const V = (lang, name) => ({ lang, name: name || lang });
const all = (n, pred, out = []) => { if (pred(n)) out.push(n); n.kids.forEach((k) => all(k, pred, out)); return out; };
const byClass = (n, c) => all(n, (x) => (x.attrs.class || "").split(/\s+/).includes(c));
const btnText = (n, t) => all(n, (x) => x.tag === "button" && x.textContent.indexOf(t) !== -1);
const key = (node, k, extra) => node.dispatch(Object.assign({ type: "keydown", key: k }, extra || {}));

/* ================= BS.speakSeq ================= */
{
  const E = makeEnv({ voices: [V("en-US"), V("en-GB"), V("fr-FR")] });
  const parts = [{ text: "Who is it?", accent: "us", pause: 900 }, { text: "Mr. Lee.", accent: "gb" }, { text: "Yes.", accent: "gb" }];
  let ended = 0;
  const h = E.BS.speakSeq(parts, { rate: 0.7, onend: () => { ended++; } });
  check("speakSeq: tra ve tay cam co cancel()", !!h && typeof h.cancel === "function");
  check("speakSeq: phan dau doc ngay, cac phan sau chua", E.synth.spoken.length === 1 && E.synth.spoken[0].text === "Who is it?");
  E.advance(120);
  check("speakSeq: co khoang nghi giua cac phan (900 ms sau cau hoi)", E.synth.spoken.length === 1);
  E.advance(899);
  check("speakSeq: ngay truoc khi het khoang nghi van chua doc phan 2", E.synth.spoken.length === 1);
  E.advance(2);
  check("speakSeq: het khoang nghi thi doc phan 2", E.synth.spoken.length === 2);
  E.advance(120 + 700 + 120 + 10);
  const s = E.synth.spoken;
  check("speakSeq: thu tu doc dung", s.map((m) => m.text).join("|") === "Who is it?|Mr. Lee.|Yes.");
  check("speakSeq: lang theo accent (cau hoi en-US, dap an en-GB)", s.map((m) => m.lang).join() === "en-US,en-GB,en-GB");
  check("speakSeq: chon dung giong theo accent", s[0].voice.lang === "en-US" && s[1].voice.lang === "en-GB" && s[2].voice.lang === "en-GB");
  check("speakSeq: ap dung toc do rate", s.every((m) => m.rate === 0.7));
  check("speakSeq: onend chay dung mot lan sau phan cuoi (khong cho them khoang nghi)", ended === 1);
  E.advance(5000);
  check("speakSeq: khong doc them sau khi xong", E.synth.spoken.length === 3 && ended === 1);
}
{
  /* giong: khong co giong nao */
  const E = makeEnv({ voices: [] });
  const h = E.BS.speakSeq([{ text: "A", accent: "us" }, { text: "B", accent: "gb" }], { rate: 1 });
  E.advance(5000);
  check("khong co giong: van doc (de trinh duyet tu chon), voice trong, lang theo accent", !!h && E.synth.spoken.length === 2 && E.synth.spoken.every((m) => m.voice === undefined) && E.synth.spoken[1].lang === "en-GB");
}
{
  /* chi mot giong en-US: dung chung giong; phan en-GB tang pitch de phan biet */
  const E = makeEnv({ voices: [V("en-US", "only")] });
  E.BS.speakSeq([{ text: "Q", accent: "us" }, { text: "R", accent: "gb" }], { rate: 1 });
  E.advance(5000);
  const s = E.synth.spoken;
  check("mot giong: ca hai phan dung chung giong", s.length === 2 && s[0].voice.name === "only" && s[1].voice.name === "only");
  check("mot giong: phan en-GB co pitch cao hon, phan en-US khong doi pitch", s[0].pitch === undefined && s[1].pitch > 1);
  check("mot giong: van dat lang en-GB cho phan thu hai (Chrome Android bo qua voice)", s[1].lang === "en-GB");
}
{
  /* nhieu giong: uu tien en-GB cho phan GB; ten lang dang en_GB; giong khong phai en bi bo qua */
  const E = makeEnv({ voices: [V("fr-FR"), V("en-AU"), V("en_GB", "gb2"), V("en-GB", "gb3"), V("en-US", "us1"), V("en-US", "us2")] });
  E.BS.speakSeq([{ text: "Q", accent: "us" }, { text: "R", accent: "gb" }], { rate: 1 });
  E.advance(5000);
  const s = E.synth.spoken;
  check("nhieu giong: en-US lay giong en-US dau tien", s[0].voice.name === "us1");
  check("nhieu giong: en-GB lay giong en-GB (ke ca en_GB), khong lay giong khac", s[1].voice.name === "gb2");
  check("nhieu giong: co du giong thi khong tang pitch", s[1].pitch === undefined);
}
{
  /* chi co en-GB: phan en-US roi ve giong dau tien */
  const E = makeEnv({ voices: [V("en-GB", "g")] });
  E.BS.speakSeq([{ text: "Q", accent: "us" }], {});
  check("chi co en-GB: phan en-US van doc bang giong co san", E.synth.spoken[0].voice.name === "g" && E.synth.spoken[0].lang === "en-US");
}
{
  /* dong ho canh: onend khong bao gio ve */
  const E = makeEnv({ voices: [V("en-US")], auto: false });
  let ended = 0;
  E.BS.speakSeq([{ text: "Hello there", accent: "us", pause: 100 }, { text: "Bye", accent: "gb" }], { rate: 1, onend: () => { ended++; } });
  check("watchdog: chua het gio thi chua sang phan sau", E.synth.spoken.length === 1);
  E.advance(2500 + Math.round("Hello there".length * 95) + 100 + 10);
  check("watchdog: onend khong ve van sang phan sau", E.synth.spoken.length === 2);
  E.advance(2500 + 3 * 95 + 50);
  check("watchdog: phan cuoi cung goi onend", ended === 1);
  const E2 = makeEnv({ voices: [V("en-US")], auto: false });
  E2.BS.speakSeq([{ text: "Slow", accent: "us", pause: 0 }, { text: "Next", accent: "us" }], { rate: 0.7 });
  const slow = 2500 + Math.round(4 * 95 / 0.7);
  E2.advance(slow - 20);
  const before = E2.synth.spoken.length;
  E2.advance(40);
  check("watchdog: toc do cham keo dai han (khong sang phan sau qua som, nhung van sang)", before === 1 && E2.synth.spoken.length === 2);
}
{
  /* huy */
  const E = makeEnv({ voices: [V("en-US")] });
  let ended = 0;
  E.BS.speakSeq([{ text: "1", accent: "us" }, { text: "2", accent: "gb" }, { text: "3", accent: "gb" }], { rate: 1, onend: () => { ended++; } });
  E.advance(130);
  E.BS.stopSpeak();
  const n = E.synth.spoken.length;
  E.advance(10000);
  check("huy bang BS.stopSpeak: khong doc them phan nao va khong goi onend", E.synth.spoken.length === n && ended === 0 && E.synth.cancels >= 1);
  const h = E.BS.speakSeq([{ text: "x", accent: "us" }, { text: "y", accent: "us" }], { rate: 1, onend: () => { ended++; } });
  E.advance(10);
  h.cancel();
  const m = E.synth.spoken.length;
  E.advance(10000);
  check("huy bang h.cancel(): dung gon", E.synth.spoken.length === m && ended === 0);
  /* mot day moi huy day cu */
  let a = 0, b = 0;
  E.BS.speakSeq([{ text: "a1", accent: "us" }, { text: "a2", accent: "us" }], { rate: 1, onend: () => { a++; } });
  E.advance(10);
  E.BS.speakSeq([{ text: "b1", accent: "us" }], { rate: 1, onend: () => { b++; } });
  E.advance(10000);
  check("day moi huy day cu (day cu khong doc tiep, khong onend)", a === 0 && b === 1 && E.synth.spoken.every((x) => x.text !== "a2"));
  /* BS.speak cung huy day dang doc */
  let c = 0;
  E.BS.speakSeq([{ text: "c1", accent: "us" }, { text: "c2", accent: "us" }], { rate: 1, onend: () => { c++; } });
  E.advance(10);
  E.BS.speak("single", 0.9);
  E.advance(10000);
  check("BS.speak huy day dang doc", c === 0 && E.synth.spoken.every((x) => x.text !== "c2"));
  /* loi 'canceled' tu trinh duyet khong lam chay tiep */
  let d = 0;
  E.synth.auto = false;
  E.BS.speakSeq([{ text: "d1", accent: "us" }, { text: "d2", accent: "us" }], { rate: 1, onend: () => { d++; } });
  const last = E.synth.spoken[E.synth.spoken.length - 1];
  last.onerror({ error: "canceled" });
  E.advance(10000);
  check("onerror 'canceled': dung day, khong onend", d === 0 && E.synth.spoken.every((x) => x.text !== "d2"));
}
{
  /* khong nem loi */
  const E1 = makeEnv({ noSynth: true });
  check("khong co speechSynthesis: tra null, khong nem", E1.BS.speakSeq([{ text: "x" }], {}) === null);
  const E2 = makeEnv({ voices: [V("en-US")], noUtterance: true });
  check("khong co SpeechSynthesisUtterance: tra null", E2.BS.speakSeq([{ text: "x" }], {}) === null);
  const E3 = makeEnv({ voices: [V("en-US")] });
  check("tham so xau: tra null", E3.BS.speakSeq(null) === null && E3.BS.speakSeq([]) === null && E3.BS.speakSeq("x") === null && E3.BS.speakSeq([{ text: "" }, null, {}]) === null);
  E3.synth.speak = () => { throw new Error("boom"); };
  let threw = false, r;
  try { r = E3.BS.speakSeq([{ text: "x", accent: "us" }], { onend: () => {} }); } catch (e) { threw = true; }
  check("speechSynthesis.speak nem loi: khong lan ra ngoai", !threw);
  let thr2 = false;
  try { E3.BS.stopSpeak(); } catch (e) { thr2 = true; }
  check("stopSpeak khong nem", !thr2);
  const E4 = makeEnv({ voices: [V("en-US")] });
  let ok4 = true;
  try { E4.BS.speakSeq([{ text: "x", accent: "zz", pause: "abc" }, { text: "y" }], { rate: "x", onend: () => { throw new Error("in onend"); } }); E4.advance(10000); } catch (e) { ok4 = false; }
  check("accent/pause/rate la va onend nem loi: khong nem, dung mac dinh", ok4 && E4.synth.spoken.length === 2 && E4.synth.spoken[0].rate === 0.9 && E4.synth.spoken[0].lang === "en-US");
}

/* ================= qr.js ================= */
const ITEMS = [
  { id: "qr1-01", kind: "who", q: { en: "Who is leading the sales meeting?", vi: "Ai chủ trì họp?" }, answer: "B", explain_vi: "Who hỏi người.",
    options: [
      { label: "A", en: "It starts at three.", vi: "Ba giờ.", trap: "wrong-wh", why_vi: "Trả lời When." },
      { label: "B", en: "Ms. Alvarez from the head office.", vi: "Cô Alvarez." },
      { label: "C", en: "Yes, I led it last year.", vi: "Vâng.", trap: "yesno-to-wh", why_vi: "Wh không trả lời Yes." }] },
  { id: "qr1-02", kind: "where", q: { en: "Where did you put the paper?", vi: "Giấy ở đâu?" }, answer: "A", explain_vi: "Where hỏi nơi.",
    options: [
      { label: "A", en: "In the supply closet.", vi: "Trong tủ." },
      { label: "B", en: "I printed two copies.", vi: "In hai bản.", trap: "similar-sound", why_vi: "Nghe giống." },
      { label: "C", en: "About twenty dollars.", vi: "Hai mươi đô.", trap: "wrong-wh", why_vi: "Trả lời giá." }] }
];
const EX = () => ({ id: "qr1", type: "qr", instruction_vi: "Nghe và chọn.", items: JSON.parse(JSON.stringify(ITEMS)) });
function mount(o = {}) {
  const E = makeEnv(Object.assign({ voices: [V("en-US"), V("en-GB")], files: ["core.js", "quiz.js", "qr.js"] }, o));
  const st = E.BS.unit("p2-test");
  if (o.pre) o.pre(st);
  const card = E.BS.renderQR(EX(), 0, st, "p2-test");
  E.advance(900); /* onVoices tre 800 ms */
  const items = byClass(card, "qr-item");
  return Object.assign(E, { st, card, items });
}
const opts = (it) => byClass(it, "qr-opt");
const fbOf = (it) => byClass(it, "fb")[0];

{
  const M = mount();
  check("quizKit: du ham cho qr.js", ["saveScore", "resetEx", "scoreText", "makeNotice", "SPEEDS"].every((k) => M.BS.quizKit && k in M.BS.quizKit) && M.BS.quizKit.SPEEDS.length === 3);
  check("renderQR tra ve the section co 2 cau", M.card.tag === "section" && M.items.length === 2);
  const txt = M.card.textContent;
  check("truoc khi tra loi KHONG in cau hoi va dap an (chi A, B, C)", !/Who is leading|Alvarez|supply closet|three|printed|twenty|led it/.test(txt), txt.slice(0, 300));
  check("truoc khi tra loi: khong in ban dich tieng Viet cua cau hoi/dap an", !/Ai chủ trì|Cô Alvarez|Trong tủ/.test(txt));
  const o = opts(M.items[0]);
  check("nut dap an: button, type=button, aria-label 'Chọn đáp án A/B/C'", o.length === 3 && o.every((b, i) => b.tag === "button" && b.getAttribute("type") === "button" && b.getAttribute("aria-label") === "Chọn đáp án " + "ABC"[i] && b.textContent === "ABC"[i]));
  check("nut dap an: aria-pressed=false luc dau; nhan tieng Viet nen KHONG dat lang=en tren nut", o.every((b) => b.getAttribute("aria-pressed") === "false" && b.getAttribute("lang") === null));
  const play = byClass(M.items[0], "qr-play")[0];
  check("nut nghe la button that voi nhan 'Nghe câu hỏi và 3 đáp án'", play.tag === "button" && play.textContent === "Nghe câu hỏi và 3 đáp án");
  check("fb khong la vung aria-live (khong ghi vao live region khi dang doc)", fbOf(M.items[0]).getAttribute("aria-live") === null && fbOf(M.items[0]).getAttribute("tabindex") === "-1");
  check("co nut toc do va nut Che do thi (aria-pressed)", btnText(M.card, "Chậm 0.7").length === 1 && btnText(M.card, "Chế độ thi").length === 1 && btnText(M.card, "Chế độ thi")[0].getAttribute("aria-pressed") === "false");
  check("co the nho 1/2/3 va R trong huong dan", /1, 2, 3/.test(txt) && /R nghe lại/.test(txt));

  /* nghe */
  play.click();
  check("nut nghe: doc cau hoi (en-US) roi 3 dap an (en-GB)", M.synth.spoken.length === 1 && M.synth.spoken[0].text === "Who is leading the sales meeting?" && M.synth.spoken[0].lang === "en-US");
  M.advance(120 + 900 + 120 + 700 + 120 + 700 + 120 + 50);
  check("nut nghe: du 4 phan, thu tu cau hoi roi A, B, C (doc kem chu cai A./B./C.)", M.synth.spoken.map((m) => m.text).join("|") === "Who is leading the sales meeting?|A. It starts at three.|B. Ms. Alvarez from the head office.|C. Yes, I led it last year." && M.synth.spoken[1].lang === "en-GB" && M.synth.spoken[3].lang === "en-GB");
  check("nut nghe: toc do mac dinh 0.9", M.synth.spoken.every((m) => m.rate === 0.9));
  check("sau khi nghe, nut doi thanh 'Nghe lại câu hỏi và 3 đáp án' va cho nghe lai khong gioi han (luyen tap)", play.textContent === "Nghe lại câu hỏi và 3 đáp án" && !play.disabled);
  const n0 = M.synth.spoken.length;
  play.click(); play.click();
  check("luyen tap: nghe lai nhieu lan (moi lan huy lan truoc)", M.synth.spoken.length === n0 + 2);
  btnText(M.card, "Chậm 0.7")[0].click();
  M.synth.spoken.length = 0;
  play.click();
  check("doi toc do 0.7 co hieu luc", M.synth.spoken[0].rate === 0.7 && btnText(M.card, "Chậm 0.7")[0].getAttribute("aria-pressed") === "true");
}

/* cham diem, XP, phan hoi */
{
  const M = mount();
  const it = M.items[0];
  const play = byClass(it, "qr-play")[0];
  play.click();
  M.advance(50);
  M.log.length = 0;
  opts(it)[1].click(); /* B dung */
  check("chon dung: res=1, ans='B' (chuoi)", M.st.res["qr1-01"] === 1 && M.st.ans["qr1-01"] === "B");
  check("chon dung: +10 XP", M.BS.stats().total === 10);
  const logStop = M.log.indexOf("cancel"), logScore = M.log.indexOf("text:score");
  check("khi chon: tat tieng TRUOC khi ghi diem vao vung aria-live", logStop !== -1 && logScore !== -1 && logStop < logScore, M.log.join());
  check("chon dung: tieng dang doc bi dung, khong doc tiep", (() => { const n = M.synth.spoken.length; M.advance(5000); return M.synth.spoken.length === n; })());
  check("chon dung: tieu diem chuyen vao khung ket qua", M.doc.activeElement === fbOf(it));
  const fb = fbOf(it), t = fb.textContent;
  check("ket qua: nhan aria-label cua nhom", /Kết quả câu 1: chính xác/.test(fb.getAttribute("aria-label")));
  check("ket qua: hien cau hoi + 3 dap an (en va vi)", /Who is leading/.test(t) && /Ai chủ trì/.test(t) && /It starts at three/.test(t) && /Ms\. Alvarez/.test(t) && /Cô Alvarez/.test(t) && /Yes, I led/.test(t) && /Vâng/.test(t));
  check("ket qua: ten bay va why_vi cua tung dap an sai, giai thich", /Trả lời sai loại câu hỏi/.test(t) && /Trả lời When/.test(t) && /Trả lời Yes\/No cho câu hỏi Wh/.test(t) && /Wh không trả lời Yes/.test(t) && /Giải thích: Who hỏi người/.test(t));
  check("ket qua: nut nghe lai cho cau hoi va tung dap an (button, aria-label)", all(fb, (x) => x.tag === "button" && /^Nghe lại /.test(x.getAttribute("aria-label") || "")).length === 4);
  const labels = all(fb, (x) => x.tag === "button").map((b) => b.getAttribute("aria-label"));
  check("ket qua: nhan nut nghe lai ro rang", labels.includes("Nghe lại câu hỏi") && labels.includes("Nghe lại đáp án A") && labels.includes("Nghe lại đáp án C"));
  check("ket qua: dap an dung duoc danh dau bang chu '(đúng)', khong chi bang mau", /B\. \(đúng\)/.test(t));
  check("sau khi tra loi: tieng Anh nam trong span lang=en, nut van khong co lang", opts(it).every((b) => b.getAttribute("lang") === null && all(b, (x) => x.tag === "span" && x.getAttribute("lang") === "en").length === 1) && opts(it)[1].kids[1].textContent === "Ms. Alvarez from the head office.");
  check("nut dap an sau khi tra loi: khoa, co dau ✓ voi dap an dung va aria-pressed theo lua chon", opts(it).every((b) => b.disabled) && opts(it)[1].textContent.startsWith("✓ B.") && opts(it)[1].getAttribute("aria-pressed") === "true" && opts(it)[0].getAttribute("aria-pressed") === "false");
  const scoreP = byClass(M.card, "score")[0];
  check("diem: 'Điểm: 1/2 (đã làm 1/2)'", scoreP.textContent === "Điểm: 1/2 (đã làm 1/2)" && M.st.scores.qr1.c === 1);
  check("score box co aria-live polite", scoreP.getAttribute("aria-live") === "polite");
  const rep = all(fb, (x) => x.tag === "button" && x.getAttribute("aria-label") === "Nghe lại đáp án C")[0];
  M.synth.spoken.length = 0; rep.click();
  check("nut nghe lai tung dong: doc dung dong do bang giong en-GB", M.synth.spoken.length === 1 && M.synth.spoken[0].text === "Yes, I led it last year." && M.synth.spoken[0].lang === "en-GB");

  /* sai */
  opts(M.items[1])[2].click();
  check("chon sai: res=0, ans='C', khong cong XP", M.st.res["qr1-02"] === 0 && M.st.ans["qr1-02"] === "C" && M.BS.stats().total === 10);
  const t2 = fbOf(M.items[1]).textContent;
  check("chon sai: bao dap an dung va danh dau dap an da chon", /Chưa đúng\. Đáp án đúng: A\./.test(t2) && /C\. \(bạn chọn, sai\)/.test(t2) && /Nghe giống/.test(t2) && /Trả lời giá/.test(t2));
  check("diem sau 2 cau: 1/2", scoreP.textContent === "Điểm: 1/2" && M.st.scores.qr1.a === 2);
  /* chon lai sau khi da tra loi: bo qua */
  opts(it)[0].click();
  check("da tra loi: bam them khong doi ket qua", M.st.ans["qr1-01"] === "B");
  /* lam lai: xoa ket qua, khong cong lai XP */
  btnText(M.card, "Làm lại")[0].click();
  check("Làm lại: xoa res/ans/score, mo khoa nut, an ket qua", M.st.res["qr1-01"] === undefined && M.st.ans["qr1-01"] === undefined && M.st.scores.qr1 === undefined && opts(it).every((b) => !b.disabled && b.textContent.length === 1) && fbOf(it).textContent === "");
  opts(it)[1].click();
  check("tra loi dung lai sau Làm lại: khong cong XP lan nua (once)", M.BS.stats().total === 10);
}

/* phim tat, pham vi theo the duoc focus */
{
  const M = mount();
  const a = M.items[0], b = M.items[1];
  const ev1 = key(opts(a)[0], "2");
  check("phim 2 tren the cau 1: chon B cho CAU 1, cau 2 khong bi anh huong", M.st.ans["qr1-01"] === "B" && M.st.ans["qr1-02"] === undefined && ev1.prevented === true);
  key(opts(b)[0], "1");
  check("phim 1 tren the cau 2: chon A cho cau 2", M.st.ans["qr1-02"] === "A" && M.st.res["qr1-02"] === 1);
  const c = mount();
  key(opts(c.items[0])[0], "2", { ctrlKey: true });
  key(opts(c.items[0])[0], "2", { metaKey: true });
  key(opts(c.items[0])[0], "9");
  key(opts(c.items[0])[0], "a");
  check("phim 'ctrl+2', 'cmd+2', 9, a: khong chon gi", c.st.ans["qr1-01"] === undefined);
  key(opts(c.items[0])[1], "R");
  check("phim R (hoa) nghe lai dung cau dang focus", c.synth.spoken.length === 1 && c.synth.spoken[0].text === "Who is leading the sales meeting?");
  c.synth.spoken.length = 0;
  key(opts(c.items[1])[0], "r");
  check("phim r tren the cau 2 doc cau 2", c.synth.spoken[0].text === "Where did you put the paper?");
  key(opts(c.items[0])[0], "3");
  check("phim 3 chon C", c.st.ans["qr1-01"] === "C" && c.st.res["qr1-01"] === 0);
  const n = c.st.res["qr1-01"];
  key(opts(c.items[0])[0], "2");
  check("sau khi tra loi, phim so khong doi ket qua", c.st.ans["qr1-01"] === "C" && c.st.res["qr1-01"] === n);
}

/* khoi phuc trang thai (khong cong XP, khong keo tieu diem) */
{
  const M = mount({ pre: (st) => { st.res["qr1-01"] = 1; st.ans["qr1-01"] = "B"; st.res["qr1-02"] = 0; st.ans["qr1-02"] = "C"; } });
  check("khoi phuc: hai cau da tra loi, nut khoa", M.items.every((it) => opts(it).every((b) => b.disabled)));
  check("khoi phuc: hien ket qua, cau dung/sai dung theo ans da luu", /Chính xác/.test(fbOf(M.items[0]).textContent) && /bạn chọn, sai/.test(fbOf(M.items[1]).textContent));
  check("khoi phuc: khong cong XP va khong chuyen tieu diem", M.BS.stats().total === 0 && M.doc.activeElement === null);
  check("khoi phuc: nut nghe san sang nghe lai", !byClass(M.items[0], "qr-play")[0].disabled && byClass(M.items[0], "qr-play")[0].textContent === "Nghe lại câu hỏi và 3 đáp án");
  const M2 = mount({ pre: (st) => { st.res["qr1-01"] = 1; st.scores.qr1 = { c: 1, t: 2, a: 1 }; } });
  check("khoi phuc: res=1 khong co ans -> hien dap an dung; diem cu duoc hien", /Chính xác/.test(fbOf(M2.items[0]).textContent) && byClass(M2.card, "score")[0].textContent === "Điểm: 1/2 (đã làm 1/2)");
  const M3 = mount({ pre: (st) => { st.res["qr1-01"] = 0; st.ans["qr1-01"] = "zzz"; } });
  check("khoi phuc: ans la gia tri la khong lam hong giao dien", /Chưa đúng/.test(fbOf(M3.items[0]).textContent) || /Đáp án đúng: B/.test(fbOf(M3.items[0]).textContent));
  const M4 = mount({ pre: (st) => { st.ans["qr1-01"] = true; } });
  check("khoi phuc: ans co kieu la nhung chua co res -> coi nhu chua lam", opts(M4.items[0]).every((b) => !b.disabled));
}

/* Che do thi */
{
  const M = mount();
  const eb = btnText(M.card, "Chế độ thi")[0];
  const it = M.items[0], play = byClass(it, "qr-play")[0];
  btnText(M.card, "Chậm 0.7")[0].click();
  eb.click();
  check("Che do thi bat: aria-pressed=true, nhan 'bật', nut toc do bi khoa", eb.getAttribute("aria-pressed") === "true" && eb.textContent === "Chế độ thi: bật" && btnText(M.card, "Chậm 0.7")[0].disabled);
  play.click();
  M.advance(50);
  check("Che do thi: doc voi toc do 1.0 (bat ke toc do da chon)", M.synth.spoken.length === 1 && M.synth.spoken[0].rate === 1);
  check("Che do thi: sau lan nghe dau nut bi khoa va co ghi chu", play.disabled && /lượt nghe duy nhất/.test(byClass(it, "qr-note")[0].textContent));
  const n = M.synth.spoken.length;
  play.click(); key(opts(it)[0], "r");
  M.advance(100);
  check("Che do thi: nut nghe va phim R khong cho nghe lan hai", M.synth.spoken.length === n);
  M.advance(5000);
  check("Che do thi: dap an van chon duoc sau khi nghe", (() => { opts(it)[1].click(); return M.st.res["qr1-01"] === 1; })());
  check("Che do thi: sau khi tra loi duoc nghe lai de on (khong tinh diem)", !play.disabled);
  check("Che do thi khong ghi vao BS prefs / localStorage (chi trong phien)", JSON.stringify(M.BS.state.prefs).indexOf("exam") === -1 && JSON.stringify(M.BS.state.prefs).indexOf("thi") === -1 && !("exam" in M.BS.state));
  eb.click();
  check("Che do thi tat: nut toc do mo lai", eb.getAttribute("aria-pressed") === "false" && !btnText(M.card, "Chậm 0.7")[0].disabled);
  const it2 = M.items[1], play2 = byClass(it2, "qr-play")[0];
  eb.click(); play2.click(); eb.click(); eb.click();
  check("bat lai Che do thi lam moi luot nghe cua cau chua tra loi", !play2.disabled);
}

/* Khong co giong tieng Anh */
{
  const M = mount({ voices: [] });
  const n = byClass(M.card, "notice")[0];
  check("khong co giong: hien thong bao co role=status", !n.hidden && /không có giọng đọc tiếng Anh/.test(n.textContent) && n.getAttribute("role") === "status");
  const peek = byClass(M.items[0], "qr-peek")[0];
  check("khong co giong: hien nut 'Hiện lời thoại'", !peek.hidden && /Hiện lời thoại/.test(peek.textContent));
  peek.click();
  check("Hien loi thoai: hien cau hoi + dap an, chua danh dau dung/sai", /Who is leading/.test(M.items[0].textContent) && /Ms\. Alvarez/.test(M.items[0].textContent) && !/\(đúng\)/.test(M.items[0].textContent));
  opts(M.items[0])[1].click();
  check("da xem loi thoai: tra loi dung van ghi diem nhung KHONG co XP", M.st.res["qr1-01"] === 1 && M.BS.stats().total === 0);
  opts(M.items[1])[0].click();
  check("cau khong xem loi thoai: van duoc XP", M.BS.stats().total === 10);
  const play = byClass(M.items[1], "qr-play")[0];
  M.synth.spoken.length = 0;
  play.click();
  check("khong co giong: bam nghe van phat (de trinh duyet tu chon giong), khong nem loi", M.synth.spoken.length === 1);
}
{
  const M = mount({ noSynth: true });
  const it = M.items[0];
  byClass(it, "qr-play")[0].click();
  check("khong co speechSynthesis: bam nghe bao khong phat duoc va hien nut Hien loi thoai", /Không phát được âm thanh/.test(byClass(it, "qr-note")[0].textContent) && !byClass(it, "qr-peek")[0].hidden);
  check("khong co speechSynthesis: nut nghe khong bi tinh la da dung luot (che do thi van nghe duoc khi co tieng)", byClass(it, "qr-play")[0].textContent === "Nghe câu hỏi và 3 đáp án");
}

/* Che do thi: giu tieu diem, onstop, nhan 'Dang phat' khong ket */
{
  const M = mount();
  const eb = btnText(M.card, "Chế độ thi")[0];
  eb.click();
  const it = M.items[0], play = byClass(it, "qr-play")[0];
  play.focus();
  play.click();
  check("Che do thi: bam Nghe -> tieu diem chuyen sang nut dap an A (khong roi ve body)", M.doc.activeElement === opts(it)[0] && play.disabled);
  key(M.doc.activeElement, "2");
  check("Che do thi: sau do phim 2 van chon duoc (listener tren the cau)", M.st.ans["qr1-01"] === "B");
  const N = mount();
  const p2 = byClass(N.items[1], "qr-play")[0];
  p2.click();
  check("Dang phat: nhan 'Đang phát...' khi dang doc", p2.textContent === "Đang phát...");
  byClass(N.items[0], "qr-play")[0].click(); /* phat o cau khac: huy cau 2 */
  check("Phat o cau khac: nhan cau 2 tro lai 'Nghe lại', khong ket 'Đang phát...'", p2.textContent === "Nghe lại câu hỏi và 3 đáp án" && !/Đang phát/.test(p2.textContent));
  p2.click();
  N.BS.stopSpeak();
  check("BS.stopSpeak tu ben ngoai (doi tab...): nhan khong ket", p2.textContent !== "Đang phát...");
  opts(N.items[0])[0].click(); /* chon dap an o cau khac cung tat tieng */
  check("Chon dap an o cau khac: cau dang doc duoc dat lai", byClass(N.items[1], "qr-play")[0].textContent !== "Đang phát...");
  /* che do thi: huy truoc khi am thanh bat dau -> hoan lai luot nghe */
  const X = mount({ auto: false });
  btnText(X.card, "Chế độ thi")[0].click();
  const xp = byClass(X.items[0], "qr-play")[0];
  xp.click();
  X.BS.stopSpeak();
  check("Che do thi: bi huy khi am thanh CHUA bat dau -> hoan lai luot nghe (Play mo lai)", !xp.disabled && xp.textContent === "Nghe câu hỏi và 3 đáp án");
  xp.click();
  X.synth.spoken[X.synth.spoken.length - 1].onstart({});
  X.BS.stopSpeak();
  check("Che do thi: da bat dau doc roi bi huy -> luot nghe da dung, Play khoa", xp.disabled);
}
/* speakSeq onstop */
{
  const E = makeEnv({ voices: [V("en-US")] });
  const calls = [];
  E.BS.speakSeq([{ text: "a", accent: "us" }, { text: "b", accent: "us" }], { onstop: (r) => calls.push(JSON.stringify(r)), onend: () => calls.push("end") });
  E.advance(5000);
  check("speakSeq onstop: doc het -> goi dung mot lan voi completed:true, started:true (sau do onend)", calls.join("|") === '{"completed":true,"started":true}|end', calls.join("|"));
  const c2 = [];
  E.BS.speakSeq([{ text: "a", accent: "us" }], { onstop: (r) => c2.push(JSON.stringify(r)) });
  E.BS.stopSpeak(); E.BS.stopSpeak(); E.advance(5000);
  check("speakSeq onstop: huy -> goi dung mot lan voi completed:false", c2.length === 1 && /"completed":false/.test(c2[0]), c2.join());
  const c3 = [];
  E.BS.speakSeq([{ text: "a", accent: "us" }], { onstop: () => { c3.push(1); throw new Error("x"); } });
  let ok = true; try { E.BS.stopSpeak(); } catch (e) { ok = false; }
  check("speakSeq onstop nem loi: khong lan ra ngoai", ok && c3.length === 1);
}

/* qrSeq */
{
  const M = mount();
  const s = M.BS.qrSeq(ITEMS[0]);
  check("qrSeq: [cau hoi us, A gb, B gb, C gb], moi dap an doc kem chu cai", s.length === 4 && s[0].accent === "us" && s.slice(1).every((p) => p.accent === "gb") && s[0].pause === 900 && s.slice(1).map((p) => p.text.slice(0, 3)).join() === "A. ,B. ,C. ");
}
/* quiz.js: qr khong co qr.js van khong vo */
{
  const M = makeEnv({ voices: [V("en-US")], files: ["core.js", "quiz.js"] });
  const root = M.doc.createElement("div");
  M.BS.render.quiz({ id: "x", exercises: [EX()] }, root);
  check("quiz.js khong co qr.js: bo qua bai qr, khong nem", root.kids.length >= 1);
}
/* qr.js mới + core.js cũ đã cache (không có speakSeq/stopSpeak/onVoices): không ném lỗi, rơi về nhánh không có giọng đọc */
{
  const M = makeEnv({ voices: [V("en-US")], files: ["core.js", "quiz.js"] });
  delete M.BS.speakSeq; delete M.BS.stopSpeak; /* core.js cũ vẫn có onVoices (Part 1 dùng) */
  let threw = null, card = null;
  try {
    vm.runInContext(src("qr.js"), M.win, { filename: "qr.js" });
    const st = M.BS.unit("p2-old");
    card = M.BS.renderQR(EX(), 0, st, "p2-old");
    const it = byClass(card, "qr-item")[0];
    byClass(it, "qr-play")[0].click();
    check("core.js cũ (thiếu speakSeq): bấm Nghe rơi về thông báo không phát được, hiện nút lời thoại", /Không phát được/.test(byClass(it, "qr-note")[0].textContent) && !byClass(it, "qr-peek")[0].attrs.hidden && true);
    byClass(it, "qr-opt")[0].click();
    check("core.js cũ: vẫn chọn đáp án và chấm điểm được", byClass(it, "fb")[0].textContent.length > 0);
  } catch (x) { threw = x; }
  check("core.js cũ (thiếu speakSeq/stopSpeak): qr.js không ném lỗi", threw === null, threw && threw.message);
}
const M5 = makeEnv({ voices: [V("en-US")], files: ["core.js", "quiz.js", "qr.js"] });
{
  const root = M5.doc.createElement("div");
  M5.BS.render.quiz({ id: "p2-x", exercises: [EX()] }, root);
  check("quiz.js: BS.render.quiz giao bai type qr cho qr.js", byClass(root, "qr-item").length === 2);
}
/* bài fill: đáp án phụ đúng thì dòng Lời thoại hiện đáp án người học gõ; đơn đáp án và đáp án đầu giữ nguyên */
{
  const M = makeEnv({ voices: [V("en-US")], files: ["core.js", "quiz.js"] });
  const FX = { id: "fx", type: "fill", instruction_vi: "x", items: [
    { id: "fx-1", before: "", after: "does the next train leave? At ten past nine.", answers: ["When", "What time"] },
    { id: "fx-2", before: "Why did the store close early?", after: "the power went out.", answers: ["Because", "Since"] },
    { id: "fx-3", before: "", after: "is the nearest bank?", answers: ["Where", "where"] },
    { id: "fx-4", before: "I took a taxi", after: "get there on time.", answers: ["to", "in order to"] } ] };
  const root = M.doc.createElement("div");
  M.BS.render.quiz({ id: "fx", exercises: [FX] }, root);
  const inps = all(root, (n) => n.tag === "input");
  const typed = ["What time", " because. ", "where", "wrong"];
  inps.forEach((n, i) => { n.value = typed[i]; });
  btnText(root, "Chấm điểm")[0].click();
  const lines = byClass(root, "muted").map((n) => n.textContent).filter((t) => /^Lời thoại/.test(t));
  check("fill: đáp án phụ đúng ('What time') -> Lời thoại hiện câu với đáp án đã gõ", lines[0] === "Lời thoại: What time does the next train leave? At ten past nine.", lines[0]);
  check("fill: gõ ' because. ' (đáp án đầu, thừa dấu/khoảng trắng) -> câu chuẩn với 'Because'", lines[1] === "Lời thoại: Why did the store close early? Because the power went out.", lines[1]);
  check("fill: đáp án 'where' (cùng đáp án đầu, khác hoa/thường) giữ nguyên câu với answers[0]", lines[2] === "Lời thoại: Where is the nearest bank?", lines[2]);
  check("fill: trả lời sai -> Lời thoại vẫn là câu với answers[0]", lines[3] === "Lời thoại: I took a taxi to get there on time.", lines[3]);
}
console.log("\ntest-qr: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
