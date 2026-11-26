// Xuat unit ra JSON "mu" de dua cho nguoi giai doc lap (kiem tra dap an va kiem tra doan duoc). Khong duoc phat hanh (chi la cong cu dev).
// Chay mot unit: node tools/export-blind.mjs --unit <id> --mode full|noscript|options|own-sentence|p1|p2|p3|fill|lesson [--root <thu muc>]
// Chay ca lo:    node tools/export-blind.mjs --batch <id,id,...> --out <thu muc> [--root <thu muc>]
//   full         : de va dap an day du cua moi cau duoc cham (chi bo dap an, giai thich va ban dich).
//                  qr: cau hoi + 3 dap an; conv: nguoi noi, loi thoai, hinh, cau hoi; read: bai doc, de, dap an; gram: cau + dap an; fill: before/after.
//   noscript     : conv: bo loi thoai (con nguoi noi, hinh, cau hoi). read: bo bai doc; con de + dap an (tu vung va cau can chen van co trong cau hoi). gram giu nguyen.
//   options      : qr: bo cau hoi, chi con 3 dap an. read: bo bai doc va de; chi con dap an. gram: bo cau, chi con 4 dap an.
//   own-sentence : cloze chi con cau chua cho trong cua tung cau (cau chen: chi con dap an); bo bai doc o cac bo khac; gram giu nguyen
//   p1 | p2 | p3 : chi cac bo double va triple (p3: chi triple), moi bo chi con mot bai doc (thu 1, 2 hoac 3); cac cau cross van hoi nhu cu
//   fill         : chi bai dien tu (before/after, khong co dap an)
//   lesson       : chi cac tab bai hoc (tips, vocab, phrases, sentences), khong co cau duoc cham
// Cloze: chi giu kind "insert" (kind tense/word-form... la goi y loai tu). p1/p2/p3: "at" tro toi bai da bo thi bi bo, con lai doi thanh chi so 0.
// qr va conv: chi chep cac truong trong danh sach cho phep (khong co kind cua cau).
// Bo khoi dau ra: xem STRIP (khoa de lo dap an hoac nghia).
// --batch ghi <out>/passA/<id>.full.json (pha A), <out>/passB/<id>.<mode>.json (pha B: chi cac che do hop voi loai unit, va lesson) va <out>/manifest.json
// (khong chua dap an). Dua cho nguoi giai thu muc passB truoc, luu cau tra loi roi moi dua passA. Truoc khi ghi, cong cu tu kiem: con khoa STRIP nao thi thoat ma 1 va khong ghi gi.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MODES = ["full", "noscript", "options", "own-sentence", "p1", "p2", "p3", "fill", "lesson"];
const PART_MODES = ["p1", "p2", "p3"];
export const STRIP = ["answer", "answers", "trap", "why_vi", "explain_vi", "evidence", "clue", "ref", "ctx", "cross", "cat", "pos", "vi", "q_vi", "v", "_note"];

const clone = (x) => JSON.parse(JSON.stringify(x));
function strip(x) {
  if (Array.isArray(x)) return x.map(strip);
  if (x && typeof x === "object") { const o = {}; Object.keys(x).forEach((k) => { if (!STRIP.includes(k)) o[k] = strip(x[k]); }); return o; }
  return x;
}
/* tra ve duong dan cua moi khoa STRIP con sot lai */
export function leakedKeys(x, p = "") {
  if (Array.isArray(x)) return [].concat(...x.map((y, i) => leakedKeys(y, p + "[" + i + "]")));
  if (!x || typeof x !== "object") return [];
  return [].concat(...Object.keys(x).map((k) => (STRIP.includes(k) ? [p + "." + k] : []).concat(leakedKeys(x[k], p + "." + k))));
}

const head = (ex) => { const o = {}; ["id", "type", "title_vi", "instruction_vi"].forEach((k) => { if (ex[k] !== undefined) o[k] = ex[k]; }); return o; };
const opts = (q) => (q.options || []).map((o) => ({ label: o.label, en: o.en }));

function qrExercise(ex, mode) {
  if (mode !== "full" && mode !== "options") return null;
  const e = head(ex);
  e.items = (ex.items || []).map((it) => (mode === "full" ? { id: it.id, q: { en: it.q.en }, options: opts(it) } : { id: it.id, options: opts(it) }));
  return e;
}
function convExercise(ex, mode) {
  if (mode !== "full" && mode !== "noscript") return null;
  const e = head(ex);
  e.sets = (ex.sets || []).map((s) => {
    const o = { id: s.id, kind: s.kind };
    if (s.talk_type !== undefined) o.talk_type = s.talk_type;
    o.speakers = (s.speakers || []).map((x) => ({ id: x.id, gender: x.gender }));
    if (mode === "full") o.lines = (s.lines || []).map((l, i) => ({ i, s: l.s, en: l.en }));
    if (s.graphic !== undefined) o.graphic = clone(s.graphic);
    o.questions = (s.questions || []).map((q) => ({ id: q.id, q: { en: q.q.en }, options: opts(q) }));
    return o;
  });
  return e;
}
function fillExercise(ex, mode) {
  if (mode !== "full" && mode !== "fill") return null;
  const e = head(ex);
  e.items = (ex.items || []).map((it) => ({ id: it.id, before: it.before, after: it.after }));
  return e;
}
function readGramExercise(ex, mode) {
  if (mode === "fill") return null;
  const e = clone(ex);
  if (ex.type === "gram") {
    if (PART_MODES.includes(mode)) return null;
    if (mode === "options") (e.items || []).forEach((it) => { delete it.en; });
    return strip(e);
  }
  const ownSentence = (set, q) => {
    const text = (set.passages || []).map((p) => (p.paras || []).map((x) => x.en).join(" ")).join(" ");
    const s = text.split(/(?<=[.!?])\s+/).find((t) => t.includes("{" + q.blank + "}"));
    return s ? s.replace(/\{(\d)\}/g, (m, n) => (Number(n) === q.blank ? "------" : "(" + n + ")")) : "";
  };
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
    if (mode === "own-sentence" && s.kind === "cloze") (s.questions || []).forEach((q) => { if (q.kind !== "insert") q.sentence = ownSentence(s, q); });
    if (mode !== "full") delete s.passages;
    if (mode === "options") (s.questions || []).forEach((q) => { delete q.q; delete q.sentence; delete q.word; delete q.at; delete q.quote; delete q.at_time; });
  });
  if (!sets.length) return null;
  e.sets = sets;
  return strip(e);
}

function lessonOf(u) {
  return strip({
    intro_vi: (u.focus || {}).intro_vi,
    tips: ((u.focus || {}).tips || []).map((t) => ({ id: t.id, text_vi: t.text_vi, examples: (t.examples || []).map((x) => ({ q: x.q, en: x.en })) })),
    vocab: (u.vocab || []).map((x) => ({ id: x.id, en: x.en, group: x.group })),
    phrases: (u.phrases || []).map((x) => ({ id: x.id, en: x.en, group_vi: x.group_vi })),
    sentences: (u.sentences || []).map((x) => ({ id: x.id, en: x.en })),
  });
}

export function blind(unit, mode) {
  if (mode === "lesson") return { id: unit.id, mode, lesson: clone(lessonOf(unit)), exercises: [] };
  const by = { qr: qrExercise, conv: convExercise, fill: fillExercise, gram: readGramExercise, read: readGramExercise };
  const out = [];
  (unit.exercises || []).forEach((ex) => {
    const e = by[ex.type] && by[ex.type](ex, mode);
    if (e) out.push(e);
  });
  return { id: unit.id, mode, exercises: out };
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
  return MODES.filter((x) => m.has(x)).concat("lesson");
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
  let id = null, mode = null, batch = null, out = null, root = path.resolve(here, "..");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--unit") id = argv[++i];
    else if (argv[i] === "--mode") mode = argv[++i];
    else if (argv[i] === "--batch") batch = String(argv[++i] || "");
    else if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--root") root = path.resolve(argv[++i] || ".");
    else die("Tham so khong hop le: " + argv[i]);
  }
  const okId = (x) => !!x && /^[a-z0-9-]+$/.test(x);
  const load = (x) => { try { return loadUnit(root, x); } catch (e) { return die(e.message); } };
  if (batch !== null) {
    if (id !== null || mode !== null) die("--batch khong dung chung voi --unit/--mode.");
    const ids = batch.split(",").map((x) => x.trim()).filter(Boolean);
    if (!ids.length || !ids.every(okId) || new Set(ids).size !== ids.length) die("--batch can danh sach id hop le, khong trung, cach nhau bang dau phay.");
    if (!out) die("--batch can --out <thu muc>.");
    const dir = path.resolve(out);
    if (["passA", "passB", "manifest.json"].some((x) => fs.existsSync(path.join(dir, x)))) die("Thu muc --out da co passA, passB hoac manifest.json; dung thu muc moi de khong lan goi cu.");
    const files = [], manifest = { units: ids, packets: [] };
    for (const x of ids) {
      const u = load(x);
      for (const m of ["full"].concat(batchModes(u))) {
        const p = blind(u, m), rel = (m === "full" ? "passA" : "passB") + "/" + x + "." + m + ".json";
        const bad = leakedKeys(p);
        if (bad.length) die("TU KIEM THAT BAI: " + rel + " con khoa bi cam: " + bad.slice(0, 10).join(", "), 1);
        const qids = questionIds(p);
        if (m !== "lesson" && !qids.length) die("TU KIEM THAT BAI: " + rel + " khong co cau nao.", 1);
        files.push([rel, JSON.stringify(p, null, 2) + "\n"]);
        manifest.packets.push({ unit: x, mode: m, pass: m === "full" ? "A" : "B", file: rel, items: qids.length, ids: qids });
      }
    }
    for (const [rel, body] of files.concat([["manifest.json", JSON.stringify(manifest, null, 2) + "\n"]])) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), body);
    }
    manifest.packets.forEach((p) => console.log(p.pass + "  " + p.file + "  (" + p.items + " cau)"));
    console.log("Da ghi " + manifest.packets.length + " goi va manifest.json vao " + dir + "; tu kiem: khong con khoa bi cam.");
    return;
  }
  if (out !== null) die("--out chi dung voi --batch.");
  if (mode === null) mode = "full";
  if (!okId(id)) die("Can --unit <id> (chu thuong, so, dau gach ngang).");
  if (!MODES.includes(mode)) die("--mode phai la mot trong: " + MODES.join(", "));
  console.log(JSON.stringify(blind(load(id), mode), null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
