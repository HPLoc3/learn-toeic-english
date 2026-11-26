// check-cross.mjs - kiem tra CHEO giua cac unit. Cong cu dev, KHONG nam trong cong cua build-dist; chay trong danh sach truoc phat hanh.
// Chay: node tools/check-cross.mjs [--names <tep.json>] [--root <thu muc>] [--list-names]
// Kiem moi unit trong catalog co tep data/<id>.js (ke ca unit chua mo). Thoat: 0 = khong loi; 1 = co loi; 2 = sai tham so/tep.
//   X1  mot cau tieng Anh (>= 5 tu, sau chuan hoa; tru vai cau chao trong STOCK) xuat hien o hai unit. Khong tinh de cau hoi Part 3/4/6/7 va dap an ngan (lap lai tu nhien).
//   X2  mot ten rieng xuat hien o hai unit (13 unit cu dung chung vai ten: nam trong danh sach BASELINE).
//   X3  (--names) ten rieng khong thuoc danh sach cua unit. Tep: { "<unitId>": ["Ho Ten", "Ten To Chuc", ...] }; chi kiem unit co trong tep.
//   X4  (unit moi) chu cai dap an tuan hoan: co 8 cau lien tiep (cung loai, theo thu tu du lieu) lap theo chu ky <= 4;
//       hoac thu tu dap an cua cac nhom (bo conv/read, bai qr/gram; nhom >= 3 cau) giong het: >= 3 nhom giong nhau, hoac tat ca (>= 2) nhom giong nhau.
//       Voi --names con kiem CHINH XAC: ten trong danh sach cua unit KHAC xuat hien (viet hoa, dung nguyen tu) trong chuoi tieng Anh cua unit, ke ca o dau cau
//       va ke ca ten trung voi tu thuong (Bill, Hill, Page). Muc mot tu (ten nguoi): so nguyen tu. Muc nhieu tu (to chuc, dia diem): so ca cum; them tung tu
//       rieng biet cua cum (khong phai tu thuong/tu chung, chi nam trong MOT danh sach). Ten co trong danh sach cua chinh unit thi bo qua.
//   X5  chuoi "vi" hoac *_vi nhac "Dong N" / "line N" (nguoi hoc khong thay so dong).
// Cach nhan ten rieng: tu viet hoa dung GIUA cau (hoac sau Mr./Ms./Mrs./Dr.) trong chuoi tieng Anh khong phai tieu de, khong nam trong danh sach tu thuong (STOP),
// va KHONG xuat hien o dang chu thuong o bat ky dau trong cac unit. Tu viet tat (toan chu hoa) bi bo qua. Day la phep doan: dung --list-names de xem.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/* 13 unit da co truoc dot 23 unit. Phat hien chi lien quan cac unit nay VA co trong danh sach duoi thi la "baseline" (in ra, khong tinh loi). */
export const BASELINE_UNITS = ["l01", "l02", "l03", "l04", "p2-01", "p2-02", "p3-01", "p3-02", "p4-01", "p4-02", "p5-01", "p6-01", "p7-01"];
export const BASELINE = {
  /* cau (da chuan hoa) */
  x1: ["the man is wearing an apron", "a man is sitting on the bench", "at the end of the hallway"],
  /* ten rieng (chu thuong) */
  x2: ["alder", "alvarez", "elm", "fiona", "haddad", "linden", "lisbon", "maple", "okoye", "priya", "reyes", "riverside", "rosa", "tanaka", "tomas"],
  /* "<unit>|<loai>" */
  x4: ["p2-01|qr", "p3-02|conv", "p5-01|gram", "p7-01|read"],
  /* "<unit>|<duong dan truong>" */
  x5: [],
};

const STOP = new Set(("i mr mrs ms miss dr sir madam " +
  "monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december " +
  "english vietnamese american british australian canadian french german japanese korean chinese spanish italian european asian " +
  "mondays tuesdays wednesdays thursdays fridays saturdays sundays " +
  "toeic part unit look graphic yes no ok okay " +
  "wi-fi internet email e-mail x-ray mobile dental rail " +
  /* tu chung trong ten to chuc, dia diem (khong phai ten rieng) */
  "human resources street road avenue lane court plaza square park hall tower building center centre island junction bridge inn hotel museum garden bank library " +
  "association bookkeepers foundation industries properties builders systems electronics media print press advertising labs contracting air airlines utilities bistro cafe " +
  "cleaners landscaping motors dairy tools pharmacy consulting works supply cycles paper outfitters authority gazette transit bureau gifts equipment hire radio " +
  "freight packaging company group club express").split(/\s+/));
/* cau chao/cau dem thong dung: duoc phep trung giua cac unit (X1) */
const STOCK = new Set(["how can i help you", "how may i help you", "what can i do for you", "thank you for your time", "thank you for your patience"]);
const TITLES = new Set(["mr", "mrs", "ms", "dr"]);
const WORD = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’-][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g;
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

/* ---------- thu thap chuoi tieng Anh: [{ s, where, sent }] (sent = tinh cho X1) ---------- */
export function englishStrings(u) {
  const out = [];
  const add = (s, where, sent) => { if (typeof s === "string" && s.trim()) out.push({ s: s.trim(), where, sent: !!sent }); };
  const table = (g, where) => {
    if (!isObj(g)) return;
    add(g.title, where + ".title");
    (g.cols || []).forEach((c) => add(c, where + ".cols"));
    (g.rows || []).forEach((r) => (r || []).forEach((c) => add(c, where + ".rows")));
    (g.items || []).forEach((c) => add(c, where + ".items"));
  };
  ((u.focus || {}).tips || []).forEach((t) => (t.examples || []).forEach((x) => { add(x.q, t.id + ".q", true); add(x.en, t.id + ".en", true); }));
  (u.vocab || []).forEach((x) => add(x.en, x.id));
  (u.phrases || []).forEach((x) => add(x.en, x.id, true));
  (u.sentences || []).forEach((x) => add(x.en, x.id, true));
  (u.exercises || []).forEach((ex) => {
    if (ex.type === "fill") (ex.items || []).forEach((it) => add([it.before, (it.answers || [])[0], it.after].filter(Boolean).join(" "), it.id, true));
    else if (ex.type === "tf") (ex.items || []).forEach((it) => add(it.en, it.id, true));
    else if (ex.type === "mc") (ex.options || []).forEach((o) => add(o.en, ex.id + "." + o.label, true));
    else if (ex.type === "qr") (ex.items || []).forEach((it) => { add((it.q || {}).en, it.id + ".q", true); (it.options || []).forEach((o) => add(o.en, it.id + "." + o.label, true)); });
    else if (ex.type === "gram") (ex.items || []).forEach((it) => {
      const key = (it.options || []).find((o) => o.label === it.answer);
      add(String(it.en || "").replace("------", key ? key.en : "------"), it.id, true);
      (it.options || []).forEach((o) => add(o.en, it.id + "." + o.label));
    });
    else (ex.sets || []).forEach((s) => {
      (s.lines || []).forEach((l, i) => add(l.en, s.id + ".lines[" + i + "]", true));
      table(s.graphic, s.id + ".graphic");
      const keys = {};
      (s.questions || []).forEach((q) => { const k = (q.options || []).find((o) => o.label === q.answer); if (k && q.blank !== undefined) keys[q.blank] = k.en; });
      (s.passages || []).forEach((p) => {
        add(p.title, p.id + ".title");
        (p.head || []).forEach((h) => add(h[1], p.id + ".head"));
        (p.paras || []).forEach((x, i) => { add(x.who, p.id + ".who"); add(String(x.en || "").replace(/\{(\d)\}/g, (m, n) => keys[n] || m).replace(/\[\d\]/g, " "), p.id + ".paras[" + i + "]", true); });
        table(p.table, p.id + ".table");
      });
      (s.questions || []).forEach((q) => {
        add((q.q || {}).en, q.id + ".q");
        add(q.sentence, q.id + ".sentence", true);
        (q.options || []).forEach((o) => add(o.en, q.id + "." + o.label, q.kind === "insert"));
      });
    });
  });
  return out;
}

/* bao ve dau cham cua chu viet tat de khong cat cau o do. Dau cham CUOI cua A.M./P.M. van la het cau khi sau no la chu hoa (tru thu, thang). */
const AFTER_TIME = "(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day|January|February|March|April|May|June|July|August|September|October|November|December";
const TIME = new RegExp("\\b([APap])\\.([Mm])\\.(?=(\\s+(?!(?:" + AFTER_TIME + ")\\b)\\p{Lu}|\\s*$)?)", "gu");
const protect = (s) => s.replace(/\b(Mr|Mrs|Ms|Dr|St|Mt|No|Prof|Jr)\./g, "$1\u0001")
  .replace(TIME, (m, a, b, end) => a + "\u0001" + b + (end !== undefined ? "." : "\u0001"))
  .replace(/\b(e\.g|i\.e|U\.S)\./g, (m) => m.replace(/\./g, "\u0001"));
export function sentencesOf(s) {
  return protect(s).split(/(?<=[.!?]["”']?)\s+/).map((t) => t.replace(/\u0001/g, ".").trim()).filter(Boolean);
}
const normSentence = (s) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

/* tieu de (phan lon tu dai viet hoa, khong co dau ket cau): khong dung de PHAT HIEN ten */
const titleLike = (s) => {
  if (/[.?!]["”']?$/.test(s)) return false;
  const long = (s.match(WORD) || []).filter((w) => w.length > 3);
  return long.length > 0 && long.filter((w) => /^\p{Lu}/u.test(w)).length / long.length > 0.6;
};
const bare = (w) => w.replace(/['’]s$/i, "");
const nameShape = (w) => /^\p{Lu}/u.test(w) && /\p{Ll}/u.test(w) && w.length > 1 && !/['’](ll|re|ve|m|d|t)$/i.test(w);

export function findNames(units) {
  const strings = new Map(units.map((u) => [u.id, englishStrings(u)]));
  const lower = new Set();
  for (const list of strings.values()) for (const x of list) (x.s.match(WORD) || []).forEach((w) => { if (/^\p{Ll}/u.test(w)) { lower.add(bare(w).toLowerCase()); w.split("-").forEach((p) => lower.add(p.toLowerCase())); } });
  const common = (w) => { const k = w.toLowerCase(); return STOP.has(k) || lower.has(k) || lower.has(k.replace(/s$/, "")) || lower.has(k + "s"); };
  const cands = new Set();
  for (const list of strings.values()) for (const x of list) {
    if (titleLike(x.s)) continue;
    for (const sent of sentencesOf(x.s)) {
      const re = new RegExp(WORD.source, "g");
      let m, prev = null;
      while ((m = re.exec(sent))) {
        const w = bare(m[0]);
        const before = sent.slice(0, m.index).replace(/\s+$/, "");
        const initial = before === "" || /[.!?:;"“(\-–]$/.test(before);
        const afterTitle = prev !== null && TITLES.has(prev.toLowerCase());
        if (nameShape(w) && (!initial || afterTitle) && !common(w)) cands.add(w.toLowerCase());
        prev = m[0];
      }
    }
  }
  /* mot ten da duoc phat hien thi tinh o MOI vi tri viet hoa (ke ca dau cau, tieu de, dau thu) */
  const byUnit = new Map();
  for (const [id, list] of strings) {
    const found = new Map();
    for (const x of list) (x.s.match(WORD) || []).forEach((raw) => {
      const w = bare(raw), k = w.toLowerCase();
      if (/^\p{Lu}/u.test(w) && cands.has(k) && !found.has(k)) found.set(k, { name: w, where: x.where });
    });
    byUnit.set(id, found);
  }
  return { byUnit, strings, common };
}

/* ---------- X3 chinh xac: ten cua unit khac ---------- */
const wordsOf = (s) => (String(s).match(WORD) || []).map(bare);
export function foreignNames(names, strings, common) {
  const entries = new Map(); /* cum tu -> { words, owners } */
  const tokenOwners = new Map();
  for (const [id, pool] of Object.entries(names)) for (const raw of pool) {
    const w = wordsOf(raw);
    if (!w.length) continue;
    const k = w.join(" ");
    if (!entries.has(k)) entries.set(k, { words: w, owners: new Set() });
    entries.get(k).owners.add(id);
    w.forEach((t) => { const tk = t.toLowerCase(); if (!tokenOwners.has(tk)) tokenOwners.set(tk, new Set()); tokenOwners.get(tk).add(id); });
  }
  /* tu rieng biet cua cum nhieu tu: viet hoa, khong phai tu thuong/chung, chi thuoc mot danh sach */
  const single = new Map();
  for (const { words, owners } of entries.values()) {
    if (words.length < 2) continue;
    for (const t of words) if (nameShape(t) && !common(t) && tokenOwners.get(t.toLowerCase()).size === 1 && !entries.has(t)) single.set(t, owners);
  }
  const targets = [...[...entries].map(([k, v]) => [k, v.words, v.owners]), ...[...single].map(([k, o]) => [k, [k], o])];
  const out = [];
  for (const [id, list] of strings) {
    const own = new Set([].concat(...(names[id] || []).map((n) => wordsOf(n).map((t) => t.toLowerCase()))));
    const toks = list.map((x) => ({ where: x.where, s: x.s, w: wordsOf(x.s) }));
    const hits = [];
    for (const [k, words, owners] of targets) {
      if (owners.has(id) || words.every((t) => own.has(t.toLowerCase()))) continue;
      const at = toks.find((x) => x.w.some((_, i) => words.every((t, j) => x.w[i + j] === t))); /* phan biet hoa thuong: "bill" khong phai "Bill" */
      if (at) hits.push({ id, name: k, words, owners: [...owners], where: at.where, text: at.s });
    }
    /* da bao ca cum thi khong bao lai tung tu cua cum */
    hits.filter((h) => !(h.words.length === 1 && hits.some((o) => o.words.length > 1 && o.words.includes(h.name)))).forEach((h) => out.push(h));
  }
  return out;
}

/* ---------- X4 ---------- */
export function periodicRun(seq) {
  for (let p = 1; p <= 4; p++) {
    let run = p; /* so phan tu cua doan tuan hoan chu ky p ket thuc tai i */
    for (let i = p; i < seq.length; i++) {
      run = seq[i] === seq[i - p] ? run + 1 : p;
      if (run >= 8) return { period: p, start: i - run + 1, text: seq.slice(i - run + 1, i + 1).join("") };
    }
  }
  return null;
}
export function letterFindings(u) {
  const by = {};
  (u.exercises || []).forEach((ex) => {
    if (!["qr", "gram", "conv", "read"].includes(ex.type)) return;
    const t = (by[ex.type] = by[ex.type] || { seq: [], groups: [] });
    const groups = ex.type === "qr" || ex.type === "gram" ? [[ex.id, ex.items || []]] : (ex.sets || []).map((s) => [s.id, s.questions || []]);
    groups.forEach(([gid, qs]) => { const letters = qs.map((q) => q.answer); t.seq.push(...letters); if (letters.length >= 3) t.groups.push([gid, letters.join("")]); });
  });
  const out = [];
  for (const [type, t] of Object.entries(by)) {
    const r = periodicRun(t.seq);
    if (r) out.push({ type, msg: "cau " + type + " thu " + (r.start + 1) + "-" + (r.start + r.text.length) + " lap chu ky " + r.period + " (" + r.text + ")" });
    const same = {};
    t.groups.forEach(([gid, s]) => { (same[s] = same[s] || []).push(gid); });
    for (const [s, ids] of Object.entries(same)) {
      if (ids.length >= 3 || (ids.length >= 2 && ids.length === t.groups.length)) out.push({ type, msg: ids.length + " nhom " + type + " co cung thu tu dap an " + s + " (" + ids.join(", ") + ")" });
    }
  }
  return out;
}

/* ---------- X5 ---------- */
export function lineRefs(u) {
  const out = [];
  (function walk(x, p, vi) {
    if (typeof x === "string") { if (vi) { const m = /(?<!\p{L})(dòng|line)\s*(số\s*)?\d+/iu.exec(x.normalize("NFC")); if (m) out.push({ path: p, text: m[0] }); } return; }
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) { x.forEach((y, i) => walk(y, p + "[" + (y && typeof y === "object" && y.id ? y.id : i) + "]", vi)); return; }
    Object.keys(x).forEach((k) => walk(x[k], p ? p + "." + k : k, vi || k === "vi" || /_vi$/.test(k)));
  })(u, "", false);
  return out;
}

/* ---------- gop ---------- */
export function checkCross(units, names = null) {
  const errors = [], baseline = [], notes = [];
  const old = (ids) => ids.every((i) => BASELINE_UNITS.includes(i));
  const put = (rule, bkey, ids, msg) => { (old(ids) && BASELINE[rule.toLowerCase()].includes(bkey) ? baseline : errors).push({ rule, key: bkey, units: ids, msg }); };
  const { byUnit, strings, common } = findNames(units);

  const sent = new Map();
  for (const [id, list] of strings) for (const x of list) {
    if (!x.sent) continue;
    for (const t of sentencesOf(x.s)) {
      const k = normSentence(t);
      if (k.split(" ").length < 5 || STOCK.has(k)) continue;
      if (!sent.has(k)) sent.set(k, new Map());
      if (!sent.get(k).has(id)) sent.get(k).set(id, { where: x.where, text: t });
    }
  }
  for (const [k, m] of sent) if (m.size > 1) put("X1", k, [...m.keys()], "cau \"" + [...m.values()][0].text + "\" co o " + [...m].map(([i, v]) => i + " (" + v.where + ")").join(", "));

  const nameAt = new Map();
  for (const [id, found] of byUnit) for (const [k, v] of found) { if (!nameAt.has(k)) nameAt.set(k, []); nameAt.get(k).push([id, v]); }
  for (const [k, l] of [...nameAt].sort()) if (l.length > 1) put("X2", k, l.map((x) => x[0]), "ten \"" + l[0][1].name + "\" dung chung o " + l.map(([i, v]) => i + " (" + v.where + ")").join(", "));

  if (names) {
    for (const [id, pool] of Object.entries(names)) {
      const found = byUnit.get(id);
      if (!found) { notes.push("--names: unit " + id + " chua co du lieu (bo qua)."); continue; }
      const toks = new Set();
      pool.forEach((n) => (String(n).match(WORD) || []).forEach((w) => toks.add(bare(w).toLowerCase())));
      for (const [k, v] of found) if (!toks.has(k)) errors.push({ rule: "X3", key: id + "|" + k, units: [id], msg: id + ": ten \"" + v.name + "\" (" + v.where + ") khong thuoc danh sach ten cua unit" });
    }
  }
  if (names) {
    for (const h of foreignNames(names, strings, common)) {
      /* thay muc doan (X3 heuristic) cung ten bang thong bao chinh xac, neu co */
      const keys = new Set(h.words.map((t) => h.id + "|" + t.toLowerCase()));
      for (let i = errors.length - 1; i >= 0; i--) if (errors[i].rule === "X3" && keys.has(errors[i].key)) errors.splice(i, 1);
      errors.push({ rule: "X3", key: h.id + "|" + h.name.toLowerCase(), units: [h.id], msg: h.id + ": \"" + h.name + "\" (" + h.where + ") thuoc danh sach ten cua " + h.owners.join(", ") + ": \"" + h.text.slice(0, 80) + "\"" });
    }
  }
  for (const u of units) {
    const isOld = BASELINE_UNITS.includes(u.id);
    for (const f of letterFindings(u)) {
      const item = { rule: "X4", key: u.id + "|" + f.type, units: [u.id], msg: u.id + ": " + f.msg };
      (isOld && BASELINE.x4.includes(item.key) ? baseline : errors).push(item);
    }
    for (const f of lineRefs(u)) put("X5", u.id + "|" + f.path, [u.id], u.id + ": " + f.path + " nhac \"" + f.text + "\"");
  }
  return { errors, baseline, notes, byUnit };
}

export function loadAll(root) {
  const run = (file) => { const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(file, "utf8"), w, { filename: file, timeout: 5000 }); return w; };
  const cat = run(path.join(root, "data", "catalog.js")).BS_CATALOG;
  const units = [], missing = [];
  for (const p of cat.parts) for (const e of p.units) {
    const file = path.join(root, "data", e.id + ".js");
    if (!fs.existsSync(file)) { if (e.available === true) throw new Error("thieu " + file); missing.push(e.id); continue; }
    const u = (run(file).BS_UNITS || {})[e.id];
    if (!u) throw new Error(file + " khong dat window.BS_UNITS." + e.id);
    units.push(JSON.parse(JSON.stringify(u)));
  }
  return { units, missing };
}

function die(msg) { console.error(msg); process.exit(2); }

function main() {
  const argv = process.argv.slice(2);
  let namesFile = null, root = path.resolve(here, ".."), listNames = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--names") namesFile = argv[++i] || die("--names can ten tep.");
    else if (argv[i] === "--root") root = path.resolve(argv[++i] || ".");
    else if (argv[i] === "--list-names") listNames = true;
    else die("Tham so khong hop le: " + argv[i]);
  }
  let names = null, all;
  if (namesFile) {
    try { names = JSON.parse(fs.readFileSync(namesFile, "utf8").replace(/^﻿/, "")); } catch (e) { die("Khong doc duoc " + namesFile + ": " + e.message); }
    if (!isObj(names) || !Object.values(names).every((v) => Array.isArray(v) && v.every((x) => typeof x === "string"))) die("--names: can JSON { unitId: [ten, ...] }.");
  }
  try { all = loadAll(root); } catch (e) { die(e.message); }
  const r = checkCross(all.units, names);
  if (listNames) for (const [id, m] of r.byUnit) console.log("ten " + id + ": " + [...m.values()].map((v) => v.name).sort().join(", "));
  r.notes.forEach((n) => console.log("ghi chu: " + n));
  r.errors.forEach((x) => console.log("LOI " + x.rule + ": " + x.msg));
  r.baseline.forEach((x) => console.log("baseline " + x.rule + ": " + x.msg));
  const by = (l) => ["X1", "X2", "X3", "X4", "X5"].map((k) => k + "=" + l.filter((x) => x.rule === k).length).join(" ");
  console.log("check-cross: " + all.units.length + " unit (" + all.missing.length + " unit chua co du lieu); " + r.errors.length + " loi [" + by(r.errors) + "]; baseline " + r.baseline.length + " [" + by(r.baseline) + "].");
  process.exit(r.errors.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
