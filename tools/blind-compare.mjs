// So cau tra loi cua cac nguoi giai "mu" voi dap an trong data/<id>.js. Cong cu dev, khong phat hanh.
// Chay: node tools/blind-compare.mjs --solver <ten>=<tep.json>[,<tep.json>...] --solver <ten>=... [--units id,id] [--only unit/qid,...] [--root <thu muc>] [--json <tep ra>]
// Can it nhat 2 nguoi giai. Moi nguoi co the co nhieu tep (vd pha B luu truoc, pha A luu sau); mot muc xuat hien o hai tep cua cung nguoi la loi.
// Dinh dang tep (co dinh): { "<unitId>": { "<mode>": { "<qid>": [answer, conf, flag] } } }
//   answer: chu cai (hoac chu go vao voi bai dien; voi cau trac nghiem co the ghi nguyen van dap an hoac "B) ..."); conf: so nguyen 1-5; flag: "" hoac chuoi;
//   flag bat dau bang "second" = bao co dap an thu hai.
// Mode "full" = pha A (BAT BUOC): moi nguoi giai tra loi DUNG moi cau, conf >= 4, khong co flag "second". Bai dien: dung neu (sau chuan hoa) nam trong answers cua cau.
// Moi mode khac = pha B (chi de tham khao, khong anh huong ma thoat). Mot cau bi gan co khi TAT CA nguoi giai deu dung va:
//   guess  : conf >= 4 khi khong co loi thoai / bai doc / de (options, noscript, lesson; cau insert o own-sentence), tru kind main va speaker
//   graphic: cau dung hinh giai duoc khi khong co loi thoai (conf bat ky)
//   cross  : cau cross giai duoc tu mot bai doc (p1, p2, p3; conf bat ky)
//   ctx    : cau Part 6 can ngu canh (ctx) giai duoc tu rieng cau cua no (own-sentence; conf bat ky)
// --only: chi kiem pha A tren cac cau da neu (kiem lai sau khi sua), bo qua pha B.
// Thoat: 0 = moi unit dat pha A; 1 = co unit khong dat pha A; 2 = sai tham so hoac tep.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blind, batchModes, questionIds, loadUnit, MODES } from "./export-blind.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

/* giong BS.norm trong assets/js/core.js (cach trang web cham bai dien) */
export function normFill(s) {
  return String(s === null || s === undefined ? "" : s).toLowerCase()
    .replace(/[’‘]/g, "'").replace(/\s+/g, " ").replace(/^[\s.,;:!?"]+|[\s.,;:!?"]+$/g, "").trim();
}
const normText = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").replace(/^[\s"'.,;:!?]+|[\s"'.,;:!?]+$/g, "");

/* chu cai hoac van ban -> nhan dap an; khong nhan ra thi null */
export function normAnswer(raw, options) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const labels = options.map((o) => o.label);
  if (/^[A-Da-d]$/.test(s)) return labels.includes(s.toUpperCase()) ? s.toUpperCase() : null;
  const byText = (t) => options.filter((o) => normText(o.en) === normText(t));
  const whole = byText(s); /* xet nguyen van truoc: dap an "A technician" khong phai chu cai A */
  if (whole.length === 1) return whole[0].label;
  const m = /^\(?([A-Da-d])(\)|\.|:|\s*-|\s)\s*(.*)$/s.exec(s);
  if (m) {
    const L = m[1].toUpperCase(), rest = m[3].trim(), punct = m[2].trim() !== "";
    if (!labels.includes(L)) return null;
    if (!rest) return L;
    const hit = byText(rest);
    if (hit.length === 1) return hit[0].label === L ? L : null; /* chu cai va chu mau thuan */
    return punct ? L : null;
  }
  return null;
}

export function unitKey(unit) {
  const key = new Map();
  (unit.exercises || []).forEach((ex) => {
    if (ex.type === "fill") (ex.items || []).forEach((it) => key.set(it.id, { type: "fill", accepted: it.answers || [] }));
    else if (ex.type === "qr" || ex.type === "gram") (ex.items || []).forEach((it) => key.set(it.id, { type: ex.type, kind: it.kind || it.cat || "", answer: it.answer, options: it.options }));
    else if (ex.type === "conv" || ex.type === "read") (ex.sets || []).forEach((s) => (s.questions || []).forEach((q) =>
      key.set(q.id, { type: ex.type, kind: q.kind, answer: q.answer, options: q.options, setKind: s.kind, cross: q.cross === true, ctx: q.ctx === true, graphic: q.uses_graphic === true || q.kind === "graphic" })));
  });
  return key;
}

/* mot cau tra loi tho -> {raw, a, conf, flag, ok, bad} */
function grade(entry, k) {
  if (!Array.isArray(entry) || entry.length < 2) return { bad: "muc phai la [answer, conf, flag]", raw: JSON.stringify(entry), ok: false, conf: 0, flag: "" };
  const [raw, conf, flag0] = entry;
  const flag = flag0 === undefined || flag0 === null ? "" : String(flag0);
  const out = { raw: String(raw), conf, flag, bad: Number.isInteger(conf) && conf >= 1 && conf <= 5 ? null : "conf phai la so nguyen 1-5 (nhan: " + JSON.stringify(conf) + ")" };
  if (k.type === "fill") { out.a = normFill(raw); out.ok = k.accepted.map(normFill).includes(out.a) && out.a !== ""; }
  else { out.a = normAnswer(raw, k.options); out.ok = out.a === k.answer; }
  return out;
}
const isSecond = (flag) => /^\s*second/i.test(flag);

/* luat gan co pha B cho mot cau ma moi nguoi giai deu dung */
function flagB(k, mode, minConf) {
  const guess = () => (minConf >= 4 && !["main", "speaker"].includes(k.kind) ? "guess" : null);
  if (k.type === "fill") return null;
  if (mode === "p1" || mode === "p2" || mode === "p3") return k.cross ? "cross" : null;
  if (mode === "own-sentence") {
    if (k.type !== "read") return null;
    if (k.setKind !== "cloze") return guess();
    if (k.ctx) return "ctx";
    return k.kind === "insert" ? guess() : null;
  }
  if (mode === "noscript" || mode === "lesson") {
    if (k.type !== "conv" && k.type !== "read") return null; /* gram o noscript van con cau */
    if (k.type === "conv" && k.graphic) return "graphic";
    return guess();
  }
  if (mode === "options") return k.type === "conv" ? null : guess();
  return null;
}

export function compareUnit(unit, solvers, only) {
  const key = unitKey(unit), names = solvers.map((s) => s.name);
  const res = { unit: unit.id, items: 0, correct: {}, mismatches: [], lowConf: [], second: [], notes: [], flagsB: [], coverageB: [], pass: true };
  const get = (s, mode) => ((s.data[unit.id] || {})[mode]) || {};
  const ids = only ? only : questionIds(blind(unit, "full"));
  res.items = ids.length;
  names.forEach((n) => { res.correct[n] = 0; });
  if (!ids.length) { res.notes.push("unit khong co cau nao duoc cham"); res.pass = false; }
  for (const id of ids) {
    const k = key.get(id), row = {};
    let wrong = false;
    for (const s of solvers) {
      const entry = get(s, "full")[id];
      if (entry === undefined) { row[s.name] = { missing: true }; wrong = true; continue; }
      const g = grade(entry, k);
      row[s.name] = { answer: g.a === null ? "?(" + g.raw + ")" : k.type === "fill" ? g.raw : g.a, conf: g.conf, flag: g.flag };
      if (g.ok) res.correct[s.name]++; else wrong = true;
      if (g.bad) { res.pass = false; res.notes.push(id + " " + s.name + ": " + g.bad); }
      else if (g.conf < 4) res.lowConf.push({ id, solver: s.name, conf: g.conf, ok: g.ok });
      if (isSecond(g.flag)) res.second.push({ id, solver: s.name, flag: g.flag });
      else if (g.flag.trim()) res.notes.push(id + " " + s.name + " ghi chu: " + g.flag);
    }
    if (wrong) res.mismatches.push({ id, type: k.type, kind: k.kind || "", key: k.type === "fill" ? k.accepted.join(" | ") : k.answer, solvers: row });
  }
  if (res.mismatches.length || res.lowConf.length || res.second.length) res.pass = false;
  for (const s of solvers) {
    for (const mode of Object.keys(s.data[unit.id] || {})) {
      if (!MODES.includes(mode)) res.notes.push(s.name + ": che do la '" + mode + "' bi bo qua");
    }
    const extra = Object.keys(get(s, "full")).filter((id) => !key.has(id));
    if (extra.length) res.notes.push(s.name + ": cau la trong full bi bo qua: " + extra.join(", "));
  }
  if (only) return res;
  const modes = MODES.filter((m) => m !== "full" && solvers.some((s) => Object.keys(get(s, m)).length));
  for (const m of batchModes(unit)) if (m !== "lesson" && !modes.includes(m)) res.coverageB.push(m + ": chua co cau tra loi");
  for (const mode of modes) {
    const inPacket = mode === "lesson" ? [...key.keys()] : questionIds(blind(unit, mode));
    let both = 0;
    for (const id of inPacket) {
      const k = key.get(id), gs = solvers.map((s) => (get(s, mode)[id] === undefined ? null : grade(get(s, mode)[id], k)));
      if (gs.some((g) => !g)) continue;
      both++;
      gs.forEach((g, i) => { if (g.bad) res.notes.push(id + " " + solvers[i].name + " (" + mode + "): " + g.bad); });
      if (!gs.every((g) => g.ok && !g.bad)) continue;
      const rule = flagB(k, mode, Math.min(...gs.map((g) => g.conf)));
      if (rule) res.flagsB.push({ id, mode, rule, kind: k.kind || "", conf: Object.fromEntries(solvers.map((s, i) => [s.name, gs[i].conf])) });
    }
    if (mode !== "lesson" && both < inPacket.length) res.coverageB.push(mode + ": " + both + "/" + inPacket.length + " cau duoc moi nguoi giai tra loi");
  }
  return res;
}

export function report(r, names) {
  const L = ["===== " + r.unit + " =====", "pha A: " + names.map((n) => n + " " + r.correct[n] + "/" + r.items).join(", ")];
  const show = (m) => names.map((n) => { const x = m.solvers[n]; return n + "=" + (x.missing ? "THIEU" : x.answer + "(c" + x.conf + ")" + (x.flag ? " [" + x.flag + "]" : "")); }).join("  ");
  L.push("  sai/thieu so voi dap an: " + r.mismatches.length);
  r.mismatches.forEach((m) => L.push("    MISMATCH " + m.id + " " + m.type + (m.kind ? "/" + m.kind : "") + " dap an=" + m.key + "  " + show(m)));
  L.push("  conf < 4: " + r.lowConf.length);
  r.lowConf.forEach((x) => L.push("    LOWCONF " + x.id + " " + x.solver + " c" + x.conf + (x.ok ? "" : " (sai)")));
  L.push("  bao dap an thu hai: " + r.second.length);
  r.second.forEach((x) => L.push("    SECOND " + x.id + " " + x.solver + ": " + x.flag));
  if (r.flagsB !== null) {
    L.push("pha B (tham khao): " + r.flagsB.length + " co");
    r.flagsB.forEach((f) => L.push("    [" + f.rule + "] " + f.id + " " + f.mode + (f.kind ? " kind=" + f.kind : "") + " " + Object.keys(f.conf).map((n) => n + " c" + f.conf[n]).join(" ")));
    r.coverageB.forEach((c) => L.push("    (thieu) " + c));
  }
  r.notes.forEach((n) => L.push("  ghi chu: " + n));
  L.push("KET QUA " + r.unit + ": pha A " + (r.pass ? "DAT" : "KHONG DAT"));
  return L.join("\n");
}

function die(msg) { console.error(msg); process.exit(2); }

function main() {
  const argv = process.argv.slice(2);
  const specs = [];
  let units = null, only = null, root = path.resolve(here, ".."), jsonOut = null;
  const list = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--solver") specs.push(String(argv[++i] || ""));
    else if (argv[i] === "--units") units = list(argv[++i]);
    else if (argv[i] === "--only") only = list(argv[++i]);
    else if (argv[i] === "--root") root = path.resolve(argv[++i] || ".");
    else if (argv[i] === "--json") jsonOut = argv[++i] || die("--json can ten tep.");
    else die("Tham so khong hop le: " + argv[i]);
  }
  const solvers = specs.map((spec) => {
    const eq = spec.indexOf("=");
    const files = list(eq > 0 ? spec.slice(eq + 1) : spec);
    if (!files.length) die("--solver can <ten>=<tep.json>.");
    const name = eq > 0 ? spec.slice(0, eq) : path.basename(files[0], ".json");
    const data = {};
    for (const f of files) {
      let j;
      try { j = JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")); } catch (e) { die("Khong doc duoc " + f + ": " + e.message); }
      const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
      if (!isObj(j)) die(f + ": phai la doi tuong { unit: { mode: { qid: [answer, conf, flag] } } }.");
      for (const [u, ms] of Object.entries(j)) {
        if (!isObj(ms) || !Object.values(ms).every(isObj)) die(f + ": unit '" + u + "' sai dinh dang { mode: { qid: [...] } }.");
        for (const [m, qs] of Object.entries(ms)) {
          const t = (((data[u] = data[u] || {}))[m] = data[u][m] || {});
          for (const [q, v] of Object.entries(qs)) {
            if (q in t) die(name + ": " + u + "/" + m + "/" + q + " xuat hien o hai tep.");
            t[q] = v;
          }
        }
      }
    }
    return { name, data };
  });
  if (solvers.length < 2) die("Can it nhat 2 --solver.");
  if (new Set(solvers.map((s) => s.name)).size !== solvers.length) die("Ten nguoi giai bi trung.");
  let onlyBy = null;
  if (only) {
    if (units) die("--only khong dung chung voi --units.");
    if (!only.length || !only.every((x) => /^[a-z0-9-]+\/[A-Za-z0-9_-]+$/.test(x))) die("--only can dang unit/qid,unit/qid.");
    onlyBy = {};
    only.forEach((x) => { const [u, q] = x.split("/"); (onlyBy[u] = onlyBy[u] || []).push(q); });
  }
  const ids = onlyBy ? Object.keys(onlyBy) : units || [...new Set([].concat(...solvers.map((s) => Object.keys(s.data))))].sort();
  if (!ids.length) die("Khong co unit nao de so.");
  const names = solvers.map((s) => s.name), results = [];
  for (const id of ids) {
    if (!/^[a-z0-9-]+$/.test(id)) die("Id unit khong hop le: " + id);
    let u;
    try { u = loadUnit(root, id); } catch (e) { die(e.message); }
    if (onlyBy) { const key = unitKey(u); onlyBy[id].forEach((q) => { if (!key.has(q)) die("--only: " + id + " khong co cau " + q + "."); }); }
    const r = compareUnit(u, solvers, onlyBy && onlyBy[id]);
    if (onlyBy) r.flagsB = null;
    results.push(r);
    console.log(report(r, names) + "\n");
  }
  const bad = results.filter((r) => !r.pass).map((r) => r.unit);
  console.log("blind-compare: " + results.length + " unit; pha A " + (bad.length ? "KHONG DAT: " + bad.join(", ") : "DAT tat ca") + (onlyBy ? " (chi " + only.length + " cau --only)" : "") + ".");
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ solvers: names, results }, null, 2) + "\n");
  process.exit(bad.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
