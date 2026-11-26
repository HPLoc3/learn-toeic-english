// Xuat unit Part 5/6/7 ra JSON "mu" de dua cho nguoi giai doc lap (kiem tra dap an va kiem tra doan duoc). Khong duoc phat hanh (chi la cong cu dev).
// Chay: node tools/export-blind.mjs --unit <id> --mode full|noscript|options|own-sentence|p1|p2 [--root <thu muc>]
//   full         : bai doc (passages), de va dap an day du (chi bo dap an, giai thich va ban dich)
//   noscript     : bo bai doc; con de + dap an (tu vung va cau can chen van co trong cau hoi); gram giu nguyen
//   options      : bo bai doc va de; chi con dap an (gram: bo cau, chi con 4 dap an)
//   own-sentence : cloze chi con cau chua cho trong cua tung cau (cau chen: chi con dap an); bo bai doc o cac bo khac; gram giu nguyen
//   p1 | p2      : chi cac bo double, moi bo chi con bai doc thu nhat (p1) hoac thu hai (p2); cac cau cross van hoi nhu cu
// Bo khoi dau ra: answer, trap, why_vi, explain_vi, evidence, clue, ref, ctx, cross, cat, pos, vi, v, _note (khoa de lo dap an hoac nghia).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const MODES = ["full", "noscript", "options", "own-sentence", "p1", "p2"];
export const STRIP = ["answer", "trap", "why_vi", "explain_vi", "evidence", "clue", "ref", "ctx", "cross", "cat", "pos", "vi", "v", "_note"];

export function blind(unit, mode) {
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const strip = (x) => {
    if (Array.isArray(x)) return x.map(strip);
    if (x && typeof x === "object") { const o = {}; Object.keys(x).forEach((k) => { if (!STRIP.includes(k)) o[k] = strip(x[k]); }); return o; }
    return x;
  };
  const ownSentence = (set, q) => {
    const text = (set.passages || []).map((p) => (p.paras || []).map((x) => x.en).join(" ")).join(" ");
    const s = text.split(/(?<=[.!?])\s+/).find((t) => t.includes("{" + q.blank + "}"));
    return s ? s.replace(/\{(\d)\}/g, (m, n) => (Number(n) === q.blank ? "------" : "(" + n + ")")) : "";
  };
  const out = [];
  (unit.exercises || []).forEach((ex) => {
    if (ex.type !== "gram" && ex.type !== "read") return;
    const e = clone(ex);
    if (ex.type === "gram") {
      if (mode === "p1" || mode === "p2") return;
      if (mode === "options") (e.items || []).forEach((it) => { delete it.en; });
      out.push(strip(e));
      return;
    }
    let sets = e.sets || [];
    if (mode === "p1" || mode === "p2") sets = sets.filter((s) => s.kind === "double");
    sets.forEach((s) => {
      if (mode === "p1" || mode === "p2") { s.passages = [s.passages[mode === "p1" ? 0 : 1]]; return; }
      if (mode === "own-sentence" && s.kind === "cloze") (s.questions || []).forEach((q) => { if (q.kind !== "insert") q.sentence = ownSentence(s, q); });
      if (mode !== "full") delete s.passages;
      if (mode === "options") (s.questions || []).forEach((q) => { delete q.q; delete q.sentence; delete q.word; delete q.at; delete q.quote; delete q.at_time; });
    });
    if (sets.length) { e.sets = sets; out.push(strip(e)); }
  });
  return { id: unit.id, mode, exercises: out };
}

function main() {
  const argv = process.argv.slice(2);
  let id = null, mode = "full", root = path.resolve(here, "..");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--unit") id = argv[++i];
    else if (argv[i] === "--mode") mode = argv[++i];
    else if (argv[i] === "--root") root = path.resolve(argv[++i] || ".");
    else { console.error("Tham so khong hop le: " + argv[i]); process.exit(2); }
  }
  if (!id || !/^[a-z0-9-]+$/.test(id)) { console.error("Can --unit <id> (chu thuong, so, dau gach ngang)."); process.exit(2); }
  if (!MODES.includes(mode)) { console.error("--mode phai la mot trong: " + MODES.join(", ")); process.exit(2); }
  const file = path.join(root, "data", id + ".js");
  if (!fs.existsSync(file)) { console.error("Khong thay " + file); process.exit(2); }
  const w = {}; w.window = w;
  try { vm.runInNewContext(fs.readFileSync(file, "utf8"), w, { filename: file, timeout: 5000 }); } catch (e) { console.error(file + " loi: " + e.message); process.exit(2); }
  const u = w.BS_UNITS && w.BS_UNITS[id];
  if (!u || typeof u !== "object") { console.error(file + " khong dat window.BS_UNITS." + id); process.exit(2); }
  console.log(JSON.stringify(blind(u, mode), null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
