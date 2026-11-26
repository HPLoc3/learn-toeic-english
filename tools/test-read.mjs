// Kiem tra Part 5/6/7: bai tap gram va read (read.js), quiz.js dispatch, core.js unitProgress, bang node, khong can trinh duyet.
// Dung DOM gia toi thieu. Chay: node tools/test-read.mjs
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

const clone = (o) => JSON.parse(JSON.stringify(o));
const loadFix = (f, id) => { const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "tools/fixtures/" + f + ".js"), "utf8"), w); return clone(w.BS_UNITS[id]); };
const GP = loadFix("gram-pass", "p5-01"), RP = loadFix("read-pass", "p7-01");
const RF = ["core.js", "quiz.js", "read.js"];
const GEX = () => clone(GP.exercises[0]);
const GEX2 = () => clone(GP.exercises[1]);
const RSETS = RP.exercises[0].sets.concat(RP.exercises[1].sets); /* S1 cloze, S2, S3 (vi tri), S4 chat, S5 doi */
const REX = (i) => ({ id: "rx", type: "read", instruction_vi: "Đọc.", sets: clone(Array.isArray(i) ? i.map((k) => RSETS[k]) : [RSETS[i]]) });
function mountG(o = {}) {
  const E = makeEnv(Object.assign({ files: RF }, o));
  const st = E.BS.unit("p5-test");
  if (o.pre) o.pre(st, E);
  const ex = o.ex ? o.ex() : GEX();
  const card = E.BS.renderGram(ex, 0, st, "p5-test");
  return Object.assign(E, { st, card, ex, items: byClass(card, "rd-item") });
}
function mountR(o = {}) {
  const E = makeEnv(Object.assign({ files: RF }, o));
  const st = E.BS.unit("p7-test");
  if (o.pre) o.pre(st, E);
  const ex = o.ex ? o.ex() : REX(1);
  const card = E.BS.renderRead(ex, 0, st, "p7-test");
  return Object.assign(E, { st, card, ex, sets: byClass(card, "rd-set") });
}
const ropts = (n, q) => byClass(byClass(n, "rd-q")[q], "rd-opt");
const rchk = (s) => byClass(s, "rd-check")[0];
const rfb = (s) => byClass(s, "rd-fb")[0];
const pressed = (b) => b.getAttribute("aria-pressed") === "true";
const pickAll = (s, letters) => letters.forEach((L, q) => ropts(s, q)["ABCD".indexOf(L)].click());
const scoreOf = (n) => byClass(n, "score")[0];
const KEYS = (set) => set.questions.map((q) => q.answer);

/* ================= tep, noi day, kich thuoc ================= */
{
  const src_ = src("read.js"), size = Buffer.byteLength(src_, "utf8");
  check("read.js <= 20480 byte", size <= 20480, String(size));
  check("read.js khong dung speechSynthesis/speakSeq/setTimeout/URL", !/speechSynthesis|speakSeq|setTimeout|fetch\(|XMLHttp|https?:\/\//.test(src_));
  check("read.js khong dong doc to: khong dung K.makeNotice", !/makeNotice\(/.test(src_));
  check("conv.js, qr.js, anim-scenes.js con nguyen (kich thuoc)", Buffer.byteLength(src("conv.js"), "utf8") === 16376 && Buffer.byteLength(src("qr.js"), "utf8") === 11650 && Buffer.byteLength(src("anim-scenes.js"), "utf8") === 16347);
  const html = fs.readFileSync(path.join(ROOT, "unit.html"), "utf8");
  check("unit.html: read.js nap ngay sau conv.js", /assets\/js\/conv\.js"><\/script>\s*<script src="assets\/js\/read\.js"><\/script>/.test(html));
  check("unit.html van noindex; index.html giu the lien he rong", /noindex/.test(html) && /<p id="contact" hidden><\/p>/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")));
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  check("sw.js: read.js nam trong PRECACHE, VERSION giu nguyen", /"assets\/js\/read\.js"/.test(sw) && /var VERSION = "37"/.test(sw));
  const css = fs.readFileSync(path.join(ROOT, "assets/css/learn.css"), "utf8");
  const blk = css.slice(css.indexOf("/* Part 5/6/7 (read.js) */"));
  check("learn.css: co khoi .rd-*", blk.length > 200 && /\.rd-blank/.test(blk) && /\.rd-pin\b/.test(blk));
  check("learn.css .rd-*: mau chi qua bien theme (hex chi la du phong trong var())", !/#[0-9a-fA-F]{3,8}/.test(blk.replace(/var\([^)]*\)/g, "")));
  check("learn.css .rd-*: muc tieu cham >= 44px (nut ghim, kiem tra, nop bai, blank, tom tat ban dich)", /\.rd-pinbtn[^{]*\{[^}]*min-height:44px/.test(blk) && /\.rd-blank\{[^}]*min-height:44px/.test(blk) && /\.rd-tr summary\{[^}]*min-height:44px/.test(blk));
}

/* ================= unitProgress, dispatch quiz.js ================= */
{
  const E = makeEnv({ files: RF });
  E.win.BS_UNITS = { "p5-x": { id: "p5-x", vocab: [], phrases: [], exercises: [clone(GP.exercises[0]), REX([0, 1])] } };
  let p = E.BS.unitProgress("p5-x");
  check("unitProgress: gram dem tung item, read dem tung cau trong sets (3 + 4 + 3 = 10)", p.total === 10 && p.done === 0, JSON.stringify(p));
  const st = E.BS.unit("p5-x");
  st.res["g1-01"] = 1; st.res["g1-02"] = 0; st.res["r1-s1-q1"] = 1; st.ans["r1-s2-q1"] = "A";
  p = E.BS.unitProgress("p5-x");
  check("unitProgress: chi tinh res; ans nhap (chua cham) khong tinh la da lam", p.done === 3 && p.total === 10, JSON.stringify(p));
  const root = E.doc.createElement("div");
  E.BS.render.quiz({ id: "p5-x", exercises: E.win.BS_UNITS["p5-x"].exercises }, root);
  const cards = byClass(root, "rd-card");
  check("quiz.js: type gram va read duoc dua cho BS.renderGram / BS.renderRead", cards.length === 2 && byClass(cards[0], "rd-item").length === 3 && byClass(cards[1], "rd-set").length === 2);
}

/* ================= gram: cham ngay ================= */
{
  const M = mountG();
  const txt = M.card.textContent;
  check("gram: the section.card, 3 cau, moi cau la fieldset co legend", M.card.tag === "section" && M.items.length === 3 && byClass(M.card, "rd-q").every((f) => f.tag === "fieldset" && f.kids[0].tag === "legend"));
  check("gram: truoc khi lam hien cho trong ------ va 4 dap an tieng Anh; chua co ban dich/giai thich", /------/.test(txt) && /A\. decide/.test(txt) && /D\. decisively/.test(txt) && !/Ủy ban sẽ công bố|làm tân ngữ/.test(txt));
  const b = ropts(M.items[0], 0);
  check("gram: dap an la button type=button aria-pressed=false, chua bi khoa", b.length === 4 && b.every((x) => x.tag === "button" && x.getAttribute("type") === "button" && x.getAttribute("aria-pressed") === "false" && !x.disabled));
  ropts(M.items[0], 0)[0].click(); /* A: sai */
  check("gram: bam mot dap an cham ngay va ghi nguyen tu ans/res/scores", M.st.ans["g1-01"] === "A" && M.st.res["g1-01"] === 0 && M.st.scores.g1.c === 0 && M.st.scores.g1.t === 3 && M.st.scores.g1.a === 1);
  const fb = rfb(M.items[0]), t2 = fb.textContent;
  check("gram: sai: hien ✗, dap an dung, ban dich, bay, giai thich, nghia tung dap an", /✗ Câu 1: chưa đúng\. Đáp án đúng: C\./.test(t2) && /Ủy ban sẽ công bố/.test(t2) && /Bẫy: Sai dạng từ/.test(t2) && /Động từ không đứng sau/.test(t2) && /Giải thích: Sau tính từ sở hữu/.test(t2) && /\(v\) quyết định/.test(t2));
  const key_ = byClass(M.items[0], "rd-key")[0];
  check("gram: cau hoan chinh in dam tu dung (decision)", !!key_ && key_.tag === "strong" && key_.textContent === "decision" && !/------/.test(byClass(M.items[0], "rd-sent")[0].textContent));
  check("gram: dap an dung ✓ opt-ok, lua chon sai ✗ opt-bad, ca bon bi khoa", ropts(M.items[0], 0).every((x) => x.disabled) && /✓ C\. decision/.test(ropts(M.items[0], 0)[2].textContent) && /opt-ok/.test(ropts(M.items[0], 0)[2].className) && /✗ A\. decide/.test(ropts(M.items[0], 0)[0].textContent) && /opt-bad/.test(ropts(M.items[0], 0)[0].className));
  check("gram: dap an dung khong co 'Bẫy', moi dap an sai co 'Bẫy'", (t2.match(/Bẫy:/g) || []).length === 3);
  check("gram: tieu diem chuyen den khung ket qua (tabindex -1)", M.doc.activeElement === fb && fb.getAttribute("tabindex") === "-1" && fb.getAttribute("role") === "group");
  check("gram: sai khong co XP; diem hien o khung score aria-live", M.BS.stats().total === 0 && /Điểm: 0\/3 \(đã làm 1\/3\)/.test(scoreOf(M.card).textContent) && scoreOf(M.card).getAttribute("aria-live") === "polite");
  ropts(M.items[0], 0)[2].click();
  check("gram: da cham thi bam them khong doi gi", M.st.ans["g1-01"] === "A" && M.st.res["g1-01"] === 0);
  ropts(M.items[1], 0)[1].click(); /* B dung */
  check("gram: dung: +10 XP, res=1", M.st.res["g1-02"] === 1 && M.BS.stats().total === 10 && /Điểm: 1\/3/.test(scoreOf(M.card).textContent), String(M.BS.stats().total));
  check("gram: dung: ✓ chinh xac", /✓ Câu 2: chính xác\./.test(rfb(M.items[1]).textContent));
  /* lam lai */
  btnText(M.card, "Làm lại")[0].click();
  check("gram: Lam lai: xoa ans/res/scores, mo khoa dap an, an ket qua, tieu diem ve dap an dau", Object.keys(M.st.ans).length === 0 && Object.keys(M.st.res).length === 0 && !M.st.scores.g1 && ropts(M.items[0], 0).every((x) => !x.disabled && x.getAttribute("aria-pressed") === "false") && rfb(M.items[0]).textContent === "" && M.doc.activeElement === ropts(M.items[0], 0)[0] && scoreOf(M.card).textContent === "");
  check("gram: Lam lai: cau hoan chinh tro lai cho trong", /------/.test(byClass(M.items[0], "rd-sent")[0].textContent) && !byClass(M.items[0], "rd-key").length);
  ropts(M.items[1], 0)[1].click();
  check("gram: lam lai roi dung lai: khong cong XP lan hai (once)", M.BS.stats().total === 10, String(M.BS.stats().total));
}
{
  /* phim 1-4 */
  const M = mountG();
  const fs0 = byClass(M.items[0], "rd-q")[0];
  key(fs0, "3", { ctrlKey: true }); key(fs0, "3", { metaKey: true }); key(fs0, "3", { altKey: true }); key(fs0, "3", { isComposing: true });
  check("gram: phim 3 kem ctrl/meta/alt/IME bi bo qua", M.st.res["g1-01"] === undefined);
  const ev = key(fs0, "9");
  check("gram: phim khac 1-4 bi bo qua", M.st.res["g1-01"] === undefined && !ev.prevented);
  const ev2 = key(fs0, "3");
  check("gram: phim 3 chon C (dap an dung) va cham ngay", M.st.ans["g1-01"] === "C" && M.st.res["g1-01"] === 1 && ev2.prevented === true);
  key(fs0, "1");
  check("gram: da cham thi phim khong doi ket qua", M.st.ans["g1-01"] === "C");
  const M2 = mountG({ ex: GEX2 });
  key(byClass(M2.items[2], "rd-q")[0], "4");
  check("gram: phim 4 chon D o cau cuoi (open)", M2.st.ans["g2-03"] === "D" && M2.st.res["g2-03"] === 1);
  check("gram: khong co phim R (khong co chuc nang nghe)", !btnText(M.card, "Nghe").length && !/Nghe/.test(M.card.textContent));
}
{
  /* khoi phuc */
  const M = mountG({ pre: (st) => { st.ans["g1-01"] = "C"; st.res["g1-01"] = 1; st.ans["g1-02"] = "A"; st.res["g1-02"] = 0; st.scores.g1 = { c: 1, t: 3, a: 2 }; } });
  check("gram khoi phuc: cau da lam hien ket qua, khong XP, khong cuop tieu diem", M.BS.stats().total === 0 && /Đáp án đúng: B\./.test(rfb(M.items[1]).textContent) && /✓ Câu 1: chính xác/.test(rfb(M.items[0]).textContent) && ropts(M.items[0], 0).every((x) => x.disabled) && M.doc.activeElement !== rfb(M.items[0]));
  check("gram khoi phuc: lua chon cu duoc danh dau, cau chua lam van mo", /✗ A\. satisfy/.test(ropts(M.items[1], 0)[0].textContent) && ropts(M.items[2], 0).every((x) => !x.disabled) && /Điểm: 1\/3/.test(scoreOf(M.card).textContent));
}

/* ================= gram: che do thi ================= */
{
  const M = mountG();
  const eb = btnText(M.card, "Chế độ thi")[0], sub = byClass(M.card, "rd-submit")[0];
  check("gram thi: mac dinh tat, nut Nop bai an", /tắt/.test(eb.textContent) && eb.getAttribute("aria-pressed") === "false" && sub.hidden);
  ropts(M.items[0], 0)[3].click(); /* truoc khi bat thi: cham ngay (sai) */
  eb.click();
  check("gram thi: bat che do thi: nut doi trang thai, Nop bai hien nhung bi khoa", /bật/.test(eb.textContent) && pressed(eb) && !sub.hidden && sub.disabled);
  check("gram thi: cau da cham giu nguyen, chi cau chua cham duoc dat lai", M.st.res["g1-01"] === 0 && ropts(M.items[0], 0).every((x) => x.disabled));
  ropts(M.items[1], 0)[0].click(); ropts(M.items[1], 0)[2].click();
  check("gram thi: bam dap an chi chon (doi duoc), KHONG cham, khong ghi ans/res", pressed(ropts(M.items[1], 0)[2]) && !pressed(ropts(M.items[1], 0)[0]) && M.st.res["g1-02"] === undefined && M.st.ans["g1-02"] === undefined && rfb(M.items[1]).textContent === "");
  check("gram thi: Nop bai con khoa khi chua chon het", sub.disabled);
  ropts(M.items[2], 0)[0].click();
  check("gram thi: chon het cac cau chua cham thi Nop bai mo (khong tu nop)", !sub.disabled && M.st.res["g1-03"] === undefined);
  sub.click();
  check("gram thi: Nop bai cham tat ca cung luc, ghi ans/res/scores, +10 XP cho cau dung", M.st.res["g1-02"] === 0 && M.st.res["g1-03"] === 0 && M.st.ans["g1-02"] === "C" && M.st.scores.g1.a === 3 && sub.hidden && /Đáp án đúng/.test(rfb(M.items[1]).textContent) && M.BS.stats().total === 0);
}
{
  const M = mountG();
  btnText(M.card, "Chế độ thi")[0].click();
  const sub = byClass(M.card, "rd-submit")[0];
  [2, 1, 3].forEach((l, i) => ropts(M.items[i], 0)[l].click());
  sub.click();
  check("gram thi: nop dung het: 30 XP va diem 3/3", M.BS.stats().total === 30 && M.st.scores.g1.c === 3 && /Điểm: 3\/3/.test(scoreOf(M.card).textContent), String(M.BS.stats().total));
  btnText(M.card, "Chế độ thi")[0].click();
  check("gram thi: tat che do thi: cau da nop van giu ket qua", ropts(M.items[0], 0).every((x) => x.disabled) && M.st.res["g1-01"] === 1);
}

/* ================= read: khung chung ================= */
{
  const M = mountR({ ex: () => REX(1) });
  const s = M.sets[0];
  check("read: the section.card, mot bo, bai doc la article lang=en co aria-label", M.card.tag === "section" && M.sets.length === 1 && byClass(s, "rd-pass")[0].tag === "article" && byClass(s, "rd-pass")[0].getAttribute("lang") === "en" && /^Bài đọc 1: email$/.test(byClass(s, "rd-pass")[0].getAttribute("aria-label")));
  check("read: head thanh <dl> voi <dt>/<dd> (To, From, Date, Subject)", byClass(s, "rd-head")[0].tag === "dl" && all(s, (x) => x.tag === "dt").map((x) => x.textContent).join() === "To,From,Date,Subject");
  check("read: 3 cau hoi, moi cau fieldset 4 dap an, nut Kiem tra bi khoa luc dau", byClass(s, "rd-q").length === 3 && byClass(s, "rd-opt").length === 12 && rchk(s).disabled && rchk(s).textContent === "Kiểm tra");
  check("read: truoc khi cham KHONG hien ban dich, giai thich, manh moi", !/Bản dịch|Giải thích|Kính gửi ông Brandt/.test(byClass(s, "rd-q").map((f) => f.textContent).join("")) && all(s, (x) => x.tag === "details").every((d) => d.hidden));
  check("read: legend co 'Câu n.' va cau hoi tieng Anh", /Câu 1\. Why did Ms\. Pereira write the e-mail\?/.test(byClass(s, "rd-q")[0].textContent) && /Câu 3\./.test(byClass(s, "rd-q")[2].textContent));
  ropts(s, 0)[0].click(); ropts(s, 1)[1].click();
  check("read: chon 2/3 cau: Kiem tra van khoa, ban nhap duoc luu vao ans nhung KHONG co res", rchk(s).disabled && M.st.ans["r1-s2-q1"] === "A" && M.st.ans["r1-s2-q2"] === "B" && M.st.res["r1-s2-q1"] === undefined && Object.keys(M.st.scores).length === 0);
  check("read: ban nhap khong bi cham diem (scores trong, XP 0)", M.BS.stats().total === 0 && scoreOf(M.card).textContent === "");
  ropts(s, 2)[0].click(); /* sai: A */
  check("read: du 3 cau: Kiem tra mo, van chua cham", !rchk(s).disabled && M.st.res["r1-s2-q3"] === undefined);
  rchk(s).click();
  check("read: Kiem tra cham ca bo nguyen tu: ans/res cho ca 3, scores, XP chi cho cau dung", ["q1", "q2", "q3"].every((q) => M.st.res["r1-s2-" + q] !== undefined) && M.st.res["r1-s2-q1"] === 1 && M.st.res["r1-s2-q2"] === 1 && M.st.res["r1-s2-q3"] === 0 && M.st.scores.rx.c === 2 && M.st.scores.rx.t === 3 && M.st.scores.rx.a === 3 && M.BS.stats().total === 20);
  check("read: tieu diem chuyen den khung ket qua co aria-label 'đúng x/y', score hien Diem", M.doc.activeElement === rfb(s) && rfb(s).getAttribute("aria-label") === "Kết quả bài đọc 1: đúng 2/3" && /Điểm: 2\/3/.test(scoreOf(M.card).textContent) && rchk(s).hidden);
  const ft = rfb(s).textContent;
  check("read: ket qua: ✓/✗, dap an dung, dich cau hoi, nghia dap an, bay + why_vi, giai thich", /✓ Câu 1: chính xác/.test(ft) && /✗ Câu 3: chưa đúng\. Đáp án đúng: C\./.test(ft) && /Vì sao bà Pereira viết thư/.test(ft) && /Bẫy: Không được nhắc đến/.test(ft) && /Rides to the hotel|Xe đưa đón/.test(ft) && /Giải thích: Máy chiếu/.test(ft));
  check("read: cau 'not': cac phuong an sai co nhan 'Được nêu trong bài'", /Bẫy: Được nêu trong bài/.test(ft));
  check("read: dap an to mau/khoa: ✓ opt-ok, ✗ opt-bad", ropts(s, 0).every((x) => x.disabled) && /✓ A\. To confirm/.test(ropts(s, 0)[0].textContent) && /✗ A\. Free parking/.test(ropts(s, 2)[0].textContent) && /opt-bad/.test(ropts(s, 2)[0].className) && /opt-ok/.test(ropts(s, 2)[2].className));
  check("read: bang chung: doan chua dap an co rd-ev + chu an '(chứa đáp án câu ...)', ban dich mo ra", byClass(s, "rd-ev").length === 3 && /\(chứa đáp án câu 1, 3\)/.test(s.textContent) && /\(chứa đáp án câu 3\)/.test(s.textContent) && all(s, (x) => x.tag === "details").every((d) => !d.hidden));
  check("read: moi doan co <details> 'Bản dịch' co ban dich tieng Viet", all(s, (x) => x.tag === "details").length === 3 && /Kính gửi ông Brandt/.test(all(s, (x) => x.tag === "details")[0].textContent) && all(s, (x) => x.tag === "summary").every((x) => x.textContent === "Bản dịch"));
  ropts(s, 0)[2].click();
  check("read: da cham: bam them khong doi gi", M.st.ans["r1-s2-q1"] === "A" && M.BS.stats().total === 20);
  /* lam lai */
  btnText(M.card, "Làm lại")[0].click();
  check("read: Lam lai: xoa ans/res/scores, mo khoa, an ket qua, bo bang chung, tieu diem ve dap an dau", Object.keys(M.st.ans).length === 0 && Object.keys(M.st.res).length === 0 && !M.st.scores.rx && ropts(s, 0).every((x) => !x.disabled && !pressed(x)) && rfb(s).textContent === "" && !byClass(s, "rd-ev").length && all(s, (x) => x.tag === "details").every((d) => d.hidden) && !rchk(s).hidden && rchk(s).disabled && M.doc.activeElement === ropts(s, 0)[0]);
  pickAll(s, KEYS(RSETS[1])); rchk(s).click();
  check("read: lam lai roi cham lai dung het: khong cong XP lan hai cho cau da nhan (once)", M.BS.stats().total === 30 && M.st.scores.rx.c === 3, String(M.BS.stats().total));
}
{
  /* ban nhap: khoi phuc */
  const M = mountR({ pre: (st) => { st.ans["r1-s2-q1"] = "A"; st.ans["r1-s2-q2"] = "D"; } });
  const s = M.sets[0];
  check("read khoi phuc ban nhap: lua chon cu duoc chon lai, chua cham, chua co res/XP", pressed(ropts(s, 0)[0]) && pressed(ropts(s, 1)[3]) && !ropts(s, 0)[0].disabled && rchk(s).disabled && Object.keys(M.st.res).length === 0 && M.BS.stats().total === 0 && rfb(s).textContent === "");
  const E2 = mountR({ pre: (st) => { st.ans["r1-s2-q1"] = "Z"; st.ans["r1-s2-q2"] = 7; } });
  check("read khoi phuc ban nhap: gia tri la (khong phai A-D) bi bo qua", ropts(E2.sets[0], 0).concat(ropts(E2.sets[0], 1)).every((b) => !pressed(b)));
  const P = mountR({ pre: (st) => { st.ans["r1-s2-q1"] = "A"; st.res["r1-s2-q1"] = 1; st.scores.rx = { c: 1, t: 3, a: 1 }; } });
  check("read khoi phuc: thieu res mot phan -> bo res do (khong chia le), tinh lai diem", P.st.res["r1-s2-q1"] === undefined && !P.st.scores.rx && rchk(P.sets[0]).disabled && pressed(ropts(P.sets[0], 0)[0]));
  const G = mountR({ pre: (st) => { RSETS[1].questions.forEach((q, i) => { st.ans[q.id] = i === 0 ? "B" : q.answer; st.res[q.id] = i === 0 ? 0 : 1; }); st.scores.rx = { c: 2, t: 3, a: 3 }; } });
  const gs = G.sets[0];
  check("read khoi phuc: du res thi hien da cham, khong XP, khong cuop tieu diem, nut Kiem tra an", G.BS.stats().total === 0 && /✗ Câu 1: chưa đúng/.test(rfb(gs).textContent) && /✗ B\. To ask/.test(ropts(gs, 0)[1].textContent) && ropts(gs, 0).every((b) => b.disabled) && rchk(gs).hidden && G.doc.activeElement !== rfb(gs) && /Điểm: 2\/3/.test(scoreOf(G.card).textContent));
  const G2 = mountR({ pre: (st) => { RSETS[1].questions.forEach((q) => { st.res[q.id] = 1; }); } });
  check("read khoi phuc: res=1 ma khong co ans -> dung dap an dung de hien lai", /✓ A\. To confirm/.test(ropts(G2.sets[0], 0)[0].textContent));
  check("read khoi phuc: ban nhap khong lam thay doi unitProgress", (() => { const E = makeEnv({ files: RF }); E.win.BS_UNITS = { u: { id: "u", exercises: [{ id: "rx", type: "read", sets: [RSETS[1]] }] } }; const st = E.BS.unit("u"); st.ans["r1-s2-q1"] = "A"; return E.BS.unitProgress("u").done === 0; })());
}
{
  /* phim 1-4 */
  const M = mountR();
  const f = byClass(M.sets[0], "rd-q")[1];
  key(f, "2", { ctrlKey: true }); key(f, "2", { isComposing: true });
  check("read: phim 2 kem ctrl/IME bi bo qua", M.st.ans["r1-s2-q2"] === undefined);
  const ev = key(f, "2");
  check("read: phim 2 chon B trong dung cau do, chua cham", pressed(ropts(M.sets[0], 1)[1]) && M.st.ans["r1-s2-q2"] === "B" && ev.prevented === true && M.st.res["r1-s2-q2"] === undefined);
  check("read: khong co phim R (khong co chuc nang nghe)", (key(M.sets[0], "r"), !btnText(M.card, "Nghe").length));
}

/* ================= read: cloze (Part 6) ================= */
{
  const M = mountR({ ex: () => REX(0) });
  const s = M.sets[0];
  const bl = byClass(s, "rd-blank");
  check("cloze: 4 cho trong la nut (button) voi aria-label 'Chỗ trống n: chưa chọn'", bl.length === 4 && bl.every((b, i) => b.tag === "button" && b.getAttribute("aria-label") === "Chỗ trống " + (i + 1) + ": chưa chọn") && /\(1\) ------/.test(bl[0].textContent));
  check("cloze: khong co the {n} tho nao con trong bai", !/\{\d\}/.test(byClass(s, "rd-pass")[0].textContent));
  check("cloze: cau hoi khong co q.en: legend 'Câu n. Chỗ trống (n)'", /Câu 1\. Chỗ trống \(1\)/.test(byClass(s, "rd-q")[0].textContent) && /Câu 4\. Chỗ trống \(4\)/.test(byClass(s, "rd-q")[3].textContent));
  bl[1].click();
  check("cloze: bam cho trong chuyen tieu diem toi dap an dau cua cau tuong ung", M.doc.activeElement === ropts(s, 1)[0]);
  ropts(s, 0)[1].click();
  check("cloze: chon dap an thi cho trong hien chu da chon, aria-label cap nhat", bl[0].textContent === "(1) Because of" && bl[0].getAttribute("aria-label") === "Chỗ trống 1: đã chọn Because of" && /rd-on/.test(bl[0].className));
  ropts(s, 2)[0].click(); /* chen: sai */
  check("cloze: cau chen: cho trong hien ca cau da chon", /^\(3\) The price of each chair/.test(bl[2].textContent));
  ropts(s, 1)[2].click(); ropts(s, 3)[3].click(); /* q2 dung, q4 sai */
  rchk(s).click();
  check("cloze: sau cham: cho trong hien dap an dung voi ✓/✗ (khong chi bang mau) va lop ok/bad", /^✓ Because of$/.test(bl[0].textContent) && /rd-ok/.test(bl[0].className) && /^✗ He will need about thirty minutes to unload the chairs\.$/.test(bl[2].textContent) && /rd-bad/.test(bl[2].className) && /^✓ will be delivered$/.test(bl[1].textContent) && /^✗ inconvenience$/.test(bl[3].textContent));
  check("cloze: aria-label sau cham: dung/sai kem dap an", bl[0].getAttribute("aria-label") === "Chỗ trống 1: đúng, Because of" && bl[2].getAttribute("aria-label") === "Chỗ trống 3: sai, đáp án He will need about thirty minutes to unload the chairs.");
  check("cloze: ket qua co 'Manh mối' cho cau co clue", /Manh mối: "will be completed next week"/.test(rfb(s).textContent) && /Manh mối: "Our driver"/.test(rfb(s).textContent));
  check("cloze: cham theo bo, XP cho 2 cau dung, cap nhat ban dich co the xem", M.BS.stats().total === 20 && M.st.scores.rx.c === 2 && M.st.scores.rx.t === 4 && /Tài xế của chúng tôi sẽ gọi/.test(s.textContent));
  btnText(M.card, "Làm lại")[0].click();
  check("cloze: Lam lai tra cho trong ve '(n) ------'", bl.every((b, i) => b.textContent === "(" + (i + 1) + ") ------" && b.getAttribute("aria-label") === "Chỗ trống " + (i + 1) + ": chưa chọn"));
}

/* ================= read: vi tri [n], tu vung ================= */
{
  const M = mountR({ ex: () => REX(2) });
  const s = M.sets[0];
  check("vi tri: dau [1]..[4] in dam (strong.rd-mark) theo thu tu", byClass(s, "rd-mark").map((x) => x.textContent).join("") === "[1][2][3][4]" && byClass(s, "rd-mark").every((x) => x.tag === "strong"));
  check("vi tri: cau can chen hien trong cau hoi, dap an la [n]", /The workshop will be led by a published author\./.test(byClass(s, "rd-q")[0].textContent) && /A\. \[1\]/.test(byClass(s, "rd-q")[0].textContent) && !byClass(s, "rd-added").length);
  const mk = byClass(s, "rd-word");
  check("tu vung: tu muc tieu duoc <mark class=rd-word> ngay tu dau, dung doan, chi 1 lan", mk.length === 1 && mk[0].tag === "mark" && mk[0].textContent === "return" && /rd-p$/.test(mk[0].parent.className));
  check("tu vung: cau hoi vocab co tu trong ngoac kep va 'closest in meaning to'", /the word "return" in paragraph 3 is closest in meaning to/.test(byClass(s, "rd-q")[1].textContent));
  pickAll(s, ["A", "B", "A"]); rchk(s).click(); /* vi tri chon A sai */
  const added = byClass(s, "rd-added");
  check("vi tri: sau cham: cau chen hien dung vi tri dung [4] (ke ca khi chon sai)", added.length === 1 && added[0].textContent === "The workshop will be led by a published author." && added[0].parent.parent.kids.indexOf(added[0].parent) === byClass(s, "rd-mark")[3].parent.kids.indexOf(byClass(s, "rd-mark")[3]) + 1);
  check("vi tri: ket qua bao sai o vi tri va dung o vocab/inference", /✗ Câu 1: chưa đúng\. Đáp án đúng: D\./.test(rfb(s).textContent) && /✓ Câu 2/.test(rfb(s).textContent) && /✓ Câu 3/.test(rfb(s).textContent) && M.st.scores.rx.c === 2);
  check("vi tri: dap an [n] khong in ban dich thua", !/\[1\] \[1\]/.test(rfb(s).textContent));
  btnText(M.card, "Làm lại")[0].click();
  check("vi tri: Lam lai: cau chen bi go khoi bai", !byClass(s, "rd-added").length && byClass(s, "rd-ins").every((x) => x.textContent === ""));
}

/* ================= read: chat, bang, bai doi ================= */
{
  const M = mountR({ ex: () => REX(3) });
  const s = M.sets[0], ol = byClass(s, "rd-chat")[0];
  check("chat: danh sach <ol> co 6 dong, moi dong co ten nguoi gui va gio", !!ol && ol.tag === "ol" && all(ol, (x) => x.tag === "li").length === 6 && /Dana Ortiz\s*10:12 A\.M\./.test(all(ol, (x) => x.tag === "li")[0].textContent) && byClass(s, "rd-who").length === 6 && byClass(s, "rd-time")[3].textContent === "10:16 A.M.");
  check("chat: tieu de bai (title) hien thi", /Text-message chain/.test(byClass(s, "rd-pt")[0].textContent));
  pickAll(s, KEYS(RSETS[3])); rchk(s).click();
  check("chat: bang chung dung dong chat (dong 3, 4 co rd-ev; dong 1 thi khong)", byClass(s, "rd-ev").length >= 2 && !/rd-ev/.test(byClass(s, "rd-pw")[0].className) && /rd-ev/.test(byClass(s, "rd-pw")[3].className) && M.st.scores.rx.c === 3);
}
{
  const M = mountR({ ex: () => REX(4) });
  const s = M.sets[0], ps = byClass(s, "rd-pass");
  check("bai doi: hai <article> xep chong, moi bai co tieu de 'Bài đọc 1/2' va 'Bài đọc 2/2'", ps.length === 2 && ps.every((p) => p.tag === "article") && /Bài đọc 1\/2/.test(ps[0].textContent) && /Bài đọc 2\/2/.test(ps[1].textContent) && ps[0].getAttribute("aria-label") === "Bài đọc 1: email" && ps[1].getAttribute("aria-label") === "Bài đọc 2: email");
  const tb = all(ps[1], (x) => x.tag === "table")[0];
  check("bang: <table> co <caption>, 4 <th scope=col>, 3 hang du lieu, boc trong vung cuon ngang co aria-label", !!tb && all(tb, (x) => x.tag === "caption")[0].textContent === "September Presentation Skills Sessions" && all(tb, (x) => x.tag === "th" && x.getAttribute("scope") === "col").length === 4 && all(tb, (x) => x.tag === "tr").length === 4 && byClass(ps[1], "cv-scroll").length === 1 && byClass(ps[1], "cv-scroll")[0].getAttribute("role") === "region" && byClass(ps[1], "cv-scroll")[0].getAttribute("tabindex") === "0");
  check("bang: nam trong bai thu hai, khong o bai thu nhat", !all(ps[0], (x) => x.tag === "table").length);
  check("bai doi: 5 cau hoi, cau 2 va 4 doc ca hai bai", byClass(s, "rd-q").length === 5);
  pickAll(s, KEYS(RSETS[4])); rchk(s).click();
  const ev = byClass(s, "rd-ev");
  check("bai doi: bang chung o ca hai bai (cau 2 chi [0,0] va [1,0], cau 4 [0,0] va [1,1])", ev.length === 4 && /\(chứa đáp án câu 1, 2, 4\)/.test(ps[0].textContent) && /\(chứa đáp án câu 1, 5\)/.test(ps[0].textContent) && /\(chứa đáp án câu 2, 3\)/.test(ps[1].textContent) && /\(chứa đáp án câu 4\)/.test(ps[1].textContent) && M.st.scores.rx.c === 5 && M.BS.stats().total === 50);
  const v = byClass(s, "rd-word");
  check("bai doi: tu vung 'offered' duoc danh dau trong bai thu hai", v.length === 1 && v[0].textContent === "offered" && ps[1].textContent.indexOf("offered") > -1);
}

/* ================= ghim bai doc, khong co giong noi ================= */
{
  const M = mountR({ ex: () => REX(4) });
  const s = M.sets[0], pb = byClass(s, "rd-pinbtn")[0], doc = byClass(s, "rd-doc")[0];
  check("ghim: nut 'Ghim bài đọc' aria-pressed=false, mac dinh khong ghim", pb.textContent === "Ghim bài đọc" && pb.getAttribute("aria-pressed") === "false" && !/rd-pin\b/.test(doc.className) && doc.getAttribute("tabindex") === null);
  pb.click();
  check("ghim: bat: aria-pressed=true, bai doc co rd-pin va thanh vung cuon duoc (role=region, tabindex=0, aria-label)", pb.getAttribute("aria-pressed") === "true" && /rd-pin/.test(doc.className) && doc.getAttribute("role") === "region" && doc.getAttribute("tabindex") === "0" && /ghim/.test(doc.getAttribute("aria-label")));
  pb.click();
  check("ghim: tat: tro ve binh thuong", pb.getAttribute("aria-pressed") === "false" && !/rd-pin\b/.test(doc.className) && doc.getAttribute("role") === null && doc.getAttribute("tabindex") === null);
}
{
  const G = mountG({ noSynth: true }), R = mountR({ noSynth: true, ex: () => REX([0, 3]) });
  check("khong co speechSynthesis: gram va read van render va cham duoc", G.win.speechSynthesis === undefined && R.win.speechSynthesis === undefined && (ropts(G.items[0], 0)[2].click(), G.st.res["g1-01"] === 1) && (pickAll(R.sets[1], KEYS(RSETS[3])), rchk(R.sets[1]).click(), R.st.res["r2-s4-q1"] === 1));
  check("khong co nut nghe nao trong gram/read", !btnText(G.card, "🔊").length && !btnText(R.card, "🔊").length && !btnText(R.card, "Nghe").length);
  const E = makeEnv({ files: ["core.js", "quiz.js"] });
  check("khong nap read.js: renderGram/renderRead khong ton tai va quiz.js khong vo", typeof E.BS.renderGram === "undefined" && typeof E.BS.renderRead === "undefined");
  const root = E.doc.createElement("div");
  let threw = false;
  try { E.BS.render.quiz({ id: "x", exercises: [{ id: "g", type: "gram", items: [] }, { id: "r", type: "read", sets: [] }] }, root); } catch (e) { threw = true; }
  check("quiz.js: thieu read.js thi bo qua bai gram/read (khong nem loi)", !threw && !byClass(root, "rd-card").length);
}

/* ================= mau unit nap duoc va render duoc ================= */
{
  const tpl = (n) => { const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "tools/templates/" + n), "utf8"), w); return clone(w.BS_UNITS.__ID__); };
  const T5 = tpl("unit-template-p5.js"), T67 = tpl("unit-template-p6p7.js");
  check("mau Part 5: nap duoc, co bai gram (items) va bai fill", T5.id === "__ID__" && T5.exercises.some((x) => x.type === "gram" && x.items.length >= 1) && T5.exercises.some((x) => x.type === "fill"));
  check("mau Part 6/7: nap duoc, co bai read voi bo cloze, single, double va bai fill", T67.exercises.filter((x) => x.type === "read").length === 2 && [].concat(...T67.exercises.filter((x) => x.sets).map((x) => x.sets)).map((x) => x.kind).sort().join() === "cloze,double,single,single" && T67.exercises.some((x) => x.type === "fill"));
  const E = makeEnv({ files: RF }), st = E.BS.unit("tpl");
  const cards = T5.exercises.filter((x) => x.type === "gram").map((x, i) => E.BS.renderGram(x, i, st, "tpl")).concat(T67.exercises.filter((x) => x.type === "read").map((x, i) => E.BS.renderRead(x, i, st, "tpl")));
  check("mau Part 5 va Part 6/7 duoc read.js render ra the", cards.length === 3 && cards.every((c) => c.tag === "section" && byClass(c, "rd-opt").length >= 4));
}

/* ================= tong ket ================= */
console.log("\ntest-read: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
