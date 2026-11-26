// Xuat unit ra JSON "mu" de dua cho nguoi giai doc lap (kiem tra dap an va kiem tra doan duoc). Khong duoc phat hanh (chi la cong cu dev).
// Chay mot unit: node tools/export-blind.mjs --unit <id> --mode full|noscript|options|own-sentence|p1|p2|p3|fill|lesson [--root <thu muc>]
// Chay ca lo:    node tools/export-blind.mjs --batch <id,id,...> --out <thu muc> [--root <thu muc>]
// Goi delta:     node tools/export-blind.mjs --only <unit>/<qid>,<unit>/<qid>,... --out <thu muc> [--root <thu muc>]
//   full         : de va dap an day du cua moi cau duoc cham (chi bo dap an, giai thich va ban dich).
//                  qr: cau hoi + 3 dap an; conv: nguoi noi, loi thoai, hinh, cau hoi; read: bai doc, de, dap an; gram: cau + dap an; fill: before/after.
//   noscript     : conv: bo loi thoai (con nguoi noi, hinh, cau hoi). read: bo bai doc; con de + dap an (tu vung va cau can chen van co trong cau hoi). gram giu nguyen.
//   options      : qr: bo cau hoi, chi con 3 dap an. read: bo bai doc va de; chi con dap an. gram: bo cau, chi con 4 dap an.
//   own-sentence : cloze chi con cau chua cho trong cua tung cau (cau chen: chi con dap an); bo bai doc o cac bo khac; gram giu nguyen
//   p1 | p2 | p3 : chi cac bo double va triple (p3: chi triple), moi bo chi con mot bai doc (thu 1, 2 hoac 3); cac cau cross van hoi nhu cu
//   fill         : chi bai dien tu (before/after, khong co dap an)
//   lesson       : chi cac tab bai hoc (tips, vocab, phrases, sentences), khong co cau duoc cham. Goi nay danh cho NGUOI DUYET NOI DUNG (kiem lo dap an
//                  o tab bai hoc), dung hay khong tuy y; KHONG dua cho nguoi giai de cham va blind-compare KHONG cham no.
// Cloze: chi giu kind "insert" (kind tense/word-form... la goi y loai tu). p1/p2/p3: "at" tro toi bai da bo thi bi bo, con lai doi thanh chi so 0.
// MOI goi duoc dung theo DANH SACH CHO PHEP (SHAPES): truong la trong du lieu (hint, note, correct...) khong bao gio lot vao goi. Truoc khi in/ghi, cong cu
// tu kiem lai tung goi theo cung danh sach do va theo STRIP; co truong ngoai danh sach, con khoa cam, hoac mot gia tri chu lai la doi tuong thi thoat ma 1 va khong ghi gi.
// --batch ghi <out>/passA/<id>.full.json (pha A), <out>/passB/<id>.<mode>.json (pha B: chi cac che do hop voi loai unit), <out>/reviewer/<id>.lesson.json
// (cho nguoi duyet, khong cham) va <out>/manifest.json (khong chua dap an; blind-compare --manifest doc unit va id cau tu day).
// Dua cho nguoi giai thu muc passB truoc, luu cau tra loi roi moi dua passA.
// --only (kiem lai sau khi sua, chi pha A): <out>/passA/<id>.full.json chi gom cac cau da neu kem ngu canh cua chung (ca loi thoai + hinh cua doan, ca bai doc cua bo);
// bo cloze: gui CA bo (4 cau), vi bai doc can du cac cho trong. manifest.json co "only": true va id cua moi cau trong goi.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { sentencesOf } from "./check-cross.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MODES = ["full", "noscript", "options", "own-sentence", "p1", "p2", "p3", "fill", "lesson"];
const PART_MODES = ["p1", "p2", "p3"];
export const STRIP = ["answer", "answers", "trap", "why_vi", "explain_vi", "evidence", "clue", "ref", "ctx", "cross", "cat", "pos", "vi", "q_vi", "v", "_note"];

const clone = (x) => JSON.parse(JSON.stringify(x));
/* tra ve duong dan cua moi khoa STRIP con sot lai */
export function leakedKeys(x, p = "") {
  if (Array.isArray(x)) return [].concat(...x.map((y, i) => leakedKeys(y, p + "[" + i + "]")));
  if (!x || typeof x !== "object") return [];
  return [].concat(...Object.keys(x).map((k) => (STRIP.includes(k) ? [p + "." + k] : []).concat(leakedKeys(x[k], p + "." + k))));
}

/* ---------- DANH SACH CHO PHEP ----------
 * "s" = gia tri don (chuoi, so, true/false); "at" = so hoac mang so; [X] = mang cac X; {k: X} = doi tuong chi co cac khoa nay (khoa nao cung co the vang). */
const S = "s";
const OPTION = { label: S, en: S };
const TABLE = { type: S, title: S, cols: [S], rows: [[S]] };
const GRAPHIC = Object.assign({}, TABLE, { items: [S] });
const HEAD = { id: S, type: S, title_vi: S, instruction_vi: S };
const withHead = (o) => Object.assign({}, HEAD, o);
const PASSAGE = { id: S, genre: S, title: S, head: [[S]], paras: [{ en: S, who: S, time: S }], table: TABLE };
const READ_Q = { id: S, blank: S, kind: S, q: { en: S }, options: [OPTION], sentence: S, word: S, at: "at", quote: S, at_time: S };
export const SHAPES = {
  qr: withHead({ items: [{ id: S, q: { en: S }, options: [OPTION] }] }),
  gram: withHead({ items: [{ id: S, en: S, options: [OPTION] }] }),
  fill: withHead({ items: [{ id: S, before: S, after: S }] }),
  conv: withHead({ sets: [{ id: S, kind: S, talk_type: S, speakers: [{ id: S, gender: S }], lines: [{ i: S, s: S, en: S }], graphic: GRAPHIC, questions: [{ id: S, q: { en: S }, options: [OPTION] }] }] }),
  read: withHead({ sets: [{ id: S, kind: S, passages: [PASSAGE], questions: [READ_Q] }] }),
};
const LESSON = { intro_vi: S, tips: [{ id: S, text_vi: S, examples: [{ q: S, en: S }] }], vocab: [{ id: S, en: S, group: S }], phrases: [{ id: S, en: S, group_vi: S }], sentences: [{ id: S, en: S }] };

const isScalar = (x) => ["string", "number", "boolean"].includes(typeof x);
const isPlain = (x) => !!x && typeof x === "object" && !Array.isArray(x);
/* mot lan duyet cho ca hai viec: chep theo danh sach (bo khoa la) va ghi lai moi cho sai kieu / khoa la */
function walkShape(x, shape, p, extra, wrong) {
  if (shape === S) { if (!isScalar(x)) wrong.push(p); return x; }
  if (shape === "at") { if (!(isScalar(x) || (Array.isArray(x) && x.every(isScalar)))) wrong.push(p); return x; }
  if (Array.isArray(shape)) {
    if (!Array.isArray(x)) { wrong.push(p); return []; }
    return x.map((y, i) => walkShape(y, shape[0], p + "[" + i + "]", extra, wrong));
  }
  if (!isPlain(x)) { wrong.push(p); return {}; }
  const o = {};
  Object.keys(x).forEach((k) => { if (!Object.prototype.hasOwnProperty.call(shape, k)) extra.push(p + "." + k); });
  Object.keys(shape).forEach((k) => { if (x[k] !== undefined && x[k] !== null) o[k] = walkShape(x[k], shape[k], p + "." + k, extra, wrong); });
  return o;
}
function project(x, shape, where) {
  const extra = [], wrong = [], out = walkShape(x, shape, where, extra, wrong);
  if (wrong.length) throw new Error("gia tri sai kieu (can chu/so, lai la doi tuong hoac mang): " + wrong.slice(0, 5).join(", "));
  return clone(out);
}
/* tu kiem mot goi da dung: moi khoa ngoai danh sach, gia tri sai kieu, khoa STRIP */
export function violations(packet) {
  const extra = [], wrong = [];
  const top = { id: S, mode: S, exercises: true, lesson: true };
  Object.keys(packet).forEach((k) => { if (!top[k]) extra.push("." + k); });
  if (packet.lesson !== undefined) walkShape(packet.lesson, LESSON, "lesson", extra, wrong);
  (packet.exercises || []).forEach((ex, i) => {
    const sh = ex && SHAPES[ex.type];
    if (!sh) wrong.push("exercises[" + i + "].type"); else walkShape(ex, sh, "exercises[" + i + "]", extra, wrong);
  });
  return extra.concat(wrong, leakedKeys(packet));
}

/* cat du lieu goc theo che do; ket qua con di qua project() nen truong la bi bo */
function shapeInput(ex, mode) {
  if (ex.type === "fill") return mode === "full" || mode === "fill" ? ex : null;
  if (mode === "fill") return null;
  if (ex.type === "qr") {
    if (mode !== "full" && mode !== "options") return null;
    return mode === "full" ? ex : Object.assign({}, ex, { items: (ex.items || []).map((it) => Object.assign({}, it, { q: undefined })) });
  }
  if (ex.type === "conv") {
    if (mode !== "full" && mode !== "noscript") return null;
    return Object.assign({}, ex, { sets: (ex.sets || []).map((s) => Object.assign({}, s, { lines: mode === "full" ? (s.lines || []).map((l, i) => ({ i, s: l.s, en: l.en })) : undefined })) });
  }
  if (ex.type === "gram") {
    if (PART_MODES.includes(mode)) return null;
    return mode === "options" ? Object.assign({}, ex, { items: (ex.items || []).map((it) => Object.assign({}, it, { en: undefined })) }) : ex;
  }
  const ownSentence = (set, q) => {
    const text = (set.passages || []).map((p) => (p.paras || []).map((x) => x.en).join(" ")).join(" ");
    const s = sentencesOf(text).find((t) => t.includes("{" + q.blank + "}"));
    return s ? s.replace(/\{(\d)\}/g, (m, n) => (Number(n) === q.blank ? "------" : "(" + n + ")")) : "";
  };
  const e = clone(ex);
  const k = PART_MODES.indexOf(mode);
  let sets = e.sets || [];
  if (k >= 0) sets = sets.filter((s) => (s.kind === "double" || s.kind === "triple") && (s.passages || []).length > k);
  sets.forEach((s) => {
    if (s.kind === "cloze") (s.questions || []).forEach((q) => { if (q.kind !== "insert") delete q.kind; }); /* kind (tense, word-form...) goi y loai tu: bo */
    if (k >= 0) {
      (s.questions || []).forEach((q) => { /* at tro toi bai con lai thi doi ve chi so 0, tro toi bai da bo thi bo at */
        if (Array.isArray(q.at)) { if (q.at[0] === k) q.at = [0, q.at[1]]; else delete q.at; }
        else if (Number.isInteger(q.at)) { if (q.at === k) q.at = 0; else delete q.at; }
      });
      s.passages = [s.passages[k]];
      return;
    }
    if (mode === "own-sentence" && s.kind === "cloze") (s.questions || []).forEach((q) => { if (q.kind !== "insert") q.sentence = ownSentence(s, q); else delete q.sentence; });
    if (mode !== "full") delete s.passages;
    if (mode === "options") (s.questions || []).forEach((q) => { delete q.q; delete q.sentence; delete q.word; delete q.at; delete q.quote; delete q.at_time; });
  });
  if (!sets.length) return null;
  e.sets = sets;
  return e;
}

function lessonOf(u) {
  return project({
    intro_vi: (u.focus || {}).intro_vi,
    tips: (u.focus || {}).tips || [], vocab: u.vocab || [], phrases: u.phrases || [], sentences: u.sentences || [],
  }, LESSON, "lesson");
}

export function blind(unit, mode) {
  if (mode === "lesson") return { id: unit.id, mode, lesson: lessonOf(unit), exercises: [] };
  const out = [];
  (unit.exercises || []).forEach((ex, i) => {
    if (!SHAPES[ex.type]) return;
    const e = shapeInput(ex, mode);
    if (e) out.push(project(e, SHAPES[ex.type], unit.id + ".exercises[" + i + "]"));
  });
  return { id: unit.id, mode, exercises: out };
}

/* goi delta: goi full chi giu cac cau trong want (bo cloze co cau duoc chon: giu ca bo) */
export function blindOnly(unit, want) {
  const full = blind(unit, "full"), have = new Set(questionIds(full)), need = new Set(want);
  const missing = want.filter((q) => !have.has(q));
  if (missing.length) throw new Error(unit.id + " khong co cau: " + missing.join(", "));
  full.exercises = full.exercises.filter((ex) => {
    if (ex.items) { ex.items = ex.items.filter((it) => need.has(it.id)); return ex.items.length > 0; }
    ex.sets = (ex.sets || []).filter((s) => {
      if (!(s.questions || []).some((q) => need.has(q.id))) return false;
      if (s.kind !== "cloze") s.questions = s.questions.filter((q) => need.has(q.id));
      return true;
    });
    return ex.sets.length > 0;
  });
  return full;
}

/* cac che do pha B hop voi loai unit (lesson luon co) */
export function batchModes(unit) {
  const exs = unit.exercises || [], has = (t) => exs.some((x) => x.type === t);
  const sets = [].concat(...exs.filter((x) => x.type === "read").map((x) => x.sets || []));
  const m = new Set();
  if (has("qr") || has("gram")) m.add("options");
  if (has("conv")) m.add("noscript");
  if (sets.some((s) => s.kind === "cloze")) m.add("own-sentence");
  if (sets.some((s) => s.kind !== "cloze")) m.add("noscript");
  if (sets.some((s) => s.kind === "double" || s.kind === "triple")) { m.add("p1"); m.add("p2"); }
  if (sets.some((s) => s.kind === "triple")) m.add("p3");
  return MODES.filter((x) => m.has(x));
}

/* id cac cau co trong mot goi */
export function questionIds(packet) {
  const out = [];
  (packet.exercises || []).forEach((ex) => {
    (ex.items || []).forEach((it) => out.push(it.id));
    (ex.sets || []).forEach((s) => (s.questions || []).forEach((q) => out.push(q.id)));
  });
  return out;
}

export function loadUnit(root, id) {
  const file = path.join(root, "data", id + ".js");
  if (!fs.existsSync(file)) throw new Error("Khong thay " + file);
  const w = {}; w.window = w;
  try { vm.runInNewContext(fs.readFileSync(file, "utf8"), w, { filename: file, timeout: 5000 }); } catch (e) { throw new Error(file + " loi: " + e.message); }
  const u = w.BS_UNITS && w.BS_UNITS[id];
  if (!u || typeof u !== "object") throw new Error(file + " khong dat window.BS_UNITS." + id);
  return u;
}

function die(msg, code = 2) { console.error(msg); process.exit(code); }

function main() {
  const argv = process.argv.slice(2);
  let id = null, mode = null, batch = null, only = null, out = null, root = path.resolve(here, "..");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--unit") id = argv[++i];
    else if (argv[i] === "--mode") mode = argv[++i];
    else if (argv[i] === "--batch") batch = String(argv[++i] || "");
    else if (argv[i] === "--only") only = String(argv[++i] || "");
    else if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--root") root = path.resolve(argv[++i] || ".");
    else die("Tham so khong hop le: " + argv[i]);
  }
  const okId = (x) => !!x && /^[a-z0-9-]+$/.test(x);
  const load = (x) => { try { return loadUnit(root, x); } catch (e) { return die(e.message); } };
  /* dung goi va tu kiem; moi sai sot -> ma 1, chua ghi gi */
  const build = (name, make) => {
    let p;
    try { p = make(); } catch (e) { die("TU KIEM THAT BAI: " + name + ": " + e.message, 1); }
    const bad = violations(p);
    if (bad.length) die("TU KIEM THAT BAI: " + name + " co truong ngoai danh sach cho phep: " + bad.slice(0, 10).join(", "), 1);
    return p;
  };
  const outDir = () => {
    if (!out) die("Can --out <thu muc>.");
    const dir = path.resolve(out);
    if (["passA", "passB", "reviewer", "manifest.json"].some((x) => fs.existsSync(path.join(dir, x)))) die("Thu muc --out da co passA, passB, reviewer hoac manifest.json; dung thu muc moi de khong lan goi cu.");
    return dir;
  };
  const writeAll = (dir, files, manifest) => {
    for (const [rel, body] of files.concat([["manifest.json", JSON.stringify(manifest, null, 2) + "\n"]])) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), body);
    }
    manifest.packets.forEach((p) => console.log(p.pass + "  " + p.file + "  (" + p.items + " cau)"));
    console.log("Da ghi " + manifest.packets.length + " goi va manifest.json vao " + dir + "; tu kiem: chi co truong trong danh sach cho phep.");
  };
  const files = [], packets = [];
  const add = (unitId, m, dirName, pass, p) => {
    const rel = dirName + "/" + unitId + "." + m + ".json", qids = questionIds(p);
    if (m !== "lesson" && !qids.length) die("TU KIEM THAT BAI: " + rel + " khong co cau nao.", 1);
    files.push([rel, JSON.stringify(p, null, 2) + "\n"]);
    packets.push({ unit: unitId, mode: m, pass, file: rel, items: qids.length, ids: qids });
  };
  if (batch !== null) {
    if (id !== null || mode !== null || only !== null) die("--batch khong dung chung voi --unit/--mode/--only.");
    const ids = batch.split(",").map((x) => x.trim()).filter(Boolean);
    if (!ids.length || !ids.every(okId) || new Set(ids).size !== ids.length) die("--batch can danh sach id hop le, khong trung, cach nhau bang dau phay.");
    const dir = outDir();
    for (const x of ids) {
      const u = load(x);
      for (const m of ["full"].concat(batchModes(u))) add(x, m, m === "full" ? "passA" : "passB", m === "full" ? "A" : "B", build(x + " " + m, () => blind(u, m)));
      add(x, "lesson", "reviewer", "reviewer", build(x + " lesson", () => blind(u, "lesson")));
    }
    writeAll(dir, files, { units: ids, packets });
    return;
  }
  if (only !== null) {
    if (id !== null || mode !== null) die("--only khong dung chung voi --unit/--mode.");
    const list = only.split(",").map((x) => x.trim()).filter(Boolean);
    if (!list.length || !list.every((x) => /^[a-z0-9-]+\/[A-Za-z0-9_-]+$/.test(x)) || new Set(list).size !== list.length) die("--only can dang unit/qid,unit/qid, khong trung.");
    const by = {};
    list.forEach((x) => { const [u, q] = x.split("/"); (by[u] = by[u] || []).push(q); });
    const dir = outDir();
    for (const [x, qs] of Object.entries(by)) {
      const u = load(x);
      const have = new Set(questionIds(build(x + " full", () => blind(u, "full"))));
      if (!qs.every((q) => have.has(q))) die("--only: " + x + " khong co cau: " + qs.filter((q) => !have.has(q)).join(", "));
      add(x, "full", "passA", "A", build(x + " delta", () => blindOnly(u, qs)));
    }
    writeAll(dir, files, { units: Object.keys(by), only: true, requested: list, packets });
    return;
  }
  if (out !== null) die("--out chi dung voi --batch hoac --only.");
  if (mode === null) mode = "full";
  if (!okId(id)) die("Can --unit <id> (chu thuong, so, dau gach ngang).");
  if (!MODES.includes(mode)) die("--mode phai la mot trong: " + MODES.join(", "));
  const u = load(id);
  console.log(JSON.stringify(build(id + " " + mode, () => blind(u, mode)), null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
