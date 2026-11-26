// So cau tra loi cua cac nguoi giai "mu" voi dap an trong data/<id>.js. Cong cu dev, khong phat hanh.
// Chay: node tools/blind-compare.mjs --solver <ten>=<tep.json>[,<tep.json>...] --solver <ten>=... (--manifest <goi>/manifest.json | --units id,id | --only unit/qid,...)
//        [--root <thu muc>] [--json <tep ra>] [--allow-identical]
// BAT BUOC co dung MOT trong --manifest, --units, --only: danh sach unit/cau PHAI duoc kiem lay tu do, khong lay tu tep cua nguoi giai (unit hay cau ca hai
// cung bo sot van bi tinh la KHONG DAT). --manifest: manifest.json do export-blind --batch hoac --only ghi (lay unit va id cau; manifest cu khong con khop du lieu thi ma 2).
// Can it nhat 2 nguoi giai. Moi nguoi co the co nhieu tep (vd pha B luu truoc, pha A luu sau); mot muc xuat hien o hai tep cua cung nguoi la loi.
// Hai nguoi giai tro toi cung mot tep: ma 2. Hai nguoi co du lieu giong het nhau: ma 2 (nghi chep bai); neu da kiem tra ho giai doc lap (vd goi delta rat nho,
// ca hai cung dung conf 5) thi chay lai voi --allow-identical (bao cao se ghi ro).
// Dinh dang tep (co dinh): { "<unitId>": { "<mode>": { "<qid>": [answer, conf, flag] } } }   (dung 3 phan tu)
//   answer: chu cai (hoac chu go vao voi bai dien; voi cau trac nghiem co the ghi nguyen van dap an hoac "B) ..."); conf: so nguyen 1-5;
//   flag: CHI mot trong: "" ; chuoi bat dau bang "second" (bao co dap an thu hai: chan pha A) ; chuoi bat dau bang "note:" (ghi chu, in ra, khong chan).
//   Flag khac (hoac muc sai dinh dang) -> ma 2.
// Mode "full" = pha A (BAT BUOC): moi nguoi giai tra loi DUNG moi cau, conf >= 4, khong co flag "second". Bai dien: dung neu (sau chuan hoa) nam trong answers cua cau.
// Moi mode khac = pha B (chi de tham khao, khong anh huong ma thoat). Mot cau bi gan co khi TAT CA nguoi giai deu dung va:
//   guess  : conf >= 4 khi khong co loi thoai / bai doc / de (options, noscript; cau insert o own-sentence), tru kind main va speaker
//   graphic: cau dung hinh giai duoc khi khong co loi thoai (conf bat ky)
//   cross  : cau cross giai duoc tu mot bai doc (p1, p2, p3; conf bat ky)
//   ctx    : cau Part 6 can ngu canh (ctx) giai duoc tu rieng cau cua no (own-sentence; conf bat ky)
// --only (hoac manifest cua goi delta): chi kiem pha A tren cac cau da neu (kiem lai sau khi sua), bo qua pha B.
// Mode "lesson" (goi cho nguoi duyet noi dung) KHONG duoc cham; neu co trong tep thi bi bo qua kem ghi chu.
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
export const okFlag = (flag) => typeof flag === "string" && (flag === "" || isSecond(flag) || /^note:/.test(flag));

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
  if (mode === "noscript") {
    if (k.type !== "conv" && k.type !== "read") return null; /* gram o noscript van con cau */
    if (k.type === "conv" && k.graphic) return "graphic";
    return guess();
  }
  if (mode === "options") return k.type === "conv" ? null : guess();
  return null;
}

export function compareUnit(unit, solvers, expected, delta) {
  const key = unitKey(unit), names = solvers.map((s) => s.name);
  const res = { unit: unit.id, items: 0, correct: {}, mismatches: [], lowConf: [], second: [], notes: [], flagsB: [], coverageB: [], pass: true };
  const get = (s, mode) => ((s.data[unit.id] || {})[mode]) || {};
  const ids = expected || questionIds(blind(unit, "full"));
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
      else if (g.flag) res.notes.push(id + " " + s.name + " " + g.flag);
    }
    if (wrong) res.mismatches.push({ id, type: k.type, kind: k.kind || "", key: k.type === "fill" ? k.accepted.join(" | ") : k.answer, solvers: row });
  }
  if (res.mismatches.length || res.lowConf.length || res.second.length) res.pass = false;
  for (const s of solvers) {
    for (const mode of Object.keys(s.data[unit.id] || {})) {
      if (mode === "lesson") res.notes.push(s.name + ": che do 'lesson' khong duoc cham, bo qua");
      else if (!MODES.includes(mode)) res.notes.push(s.name + ": che do la '" + mode + "' bi bo qua");
    }
    const extra = Object.keys(get(s, "full")).filter((id) => !key.has(id));
    if (extra.length) res.notes.push(s.name + ": cau la trong full bi bo qua: " + extra.join(", "));
  }
  if (delta) return res;
  const modes = MODES.filter((m) => m !== "full" && m !== "lesson" && solvers.some((s) => Object.keys(get(s, m)).length));
  for (const m of batchModes(unit)) if (!modes.includes(m)) res.coverageB.push(m + ": chua co cau tra loi");
  for (const mode of modes) {
    const inPacket = questionIds(blind(unit, mode));
    let both = 0;
    for (const id of inPacket) {
      const k = key.get(id), gs = solvers.map((s) => (get(s, mode)[id] === undefined ? null : grade(get(s, mode)[id], k)));
      if (gs.some((g) => !g)) continue;
      both++;
      gs.forEach((g, i) => {
        if (g.bad) res.notes.push(id + " " + solvers[i].name + " (" + mode + "): " + g.bad);
        if (g.flag) res.notes.push(id + " " + solvers[i].name + " (" + mode + ") " + g.flag);
      });
      if (!gs.every((g) => g.ok && !g.bad)) continue;
      const rule = flagB(k, mode, Math.min(...gs.map((g) => g.conf)));
      if (rule) res.flagsB.push({ id, mode, rule, kind: k.kind || "", conf: Object.fromEntries(solvers.map((s, i) => [s.name, gs[i].conf])) });
    }
    if (both < inPacket.length) res.coverageB.push(mode + ": " + both + "/" + inPacket.length + " cau duoc moi nguoi giai tra loi");
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
const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")); } catch (e) { return die("Khong doc duoc " + f + ": " + e.message); } };
const canon = (x) => (Array.isArray(x) ? "[" + x.map(canon).join(",") + "]" : isObj(x) ? "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + canon(x[k])).join(",") + "}" : JSON.stringify(x));

/* manifest.json cua export-blind -> { units, ids: {unit: [qid]}, delta } */
function readManifest(file, root) {
  const m = readJson(file);
  if (!isObj(m) || !Array.isArray(m.units) || !m.units.length || !Array.isArray(m.packets)) die(file + ": khong phai manifest cua export-blind.");
  const delta = m.only === true, ids = {};
  for (const u of m.units) {
    if (typeof u !== "string" || !/^[a-z0-9-]+$/.test(u)) die(file + ": id unit khong hop le.");
    const a = m.packets.filter((p) => isObj(p) && p.unit === u && p.pass === "A");
    const list = [].concat(...a.map((p) => (Array.isArray(p.ids) ? p.ids : [])));
    if (!list.length) die(file + ": unit " + u + " khong co goi pha A co id cau.");
    let unit;
    try { unit = loadUnit(root, u); } catch (e) { die(e.message); }
    const now = questionIds(blind(unit, "full"));
    const stale = delta ? list.filter((q) => !now.includes(q)) : list.filter((q) => !now.includes(q)).concat(now.filter((q) => !list.includes(q)));
    if (stale.length) die(file + ": manifest khong khop du lieu hien tai cua " + u + " (" + stale.slice(0, 5).join(", ") + "); xuat lai goi.");
    ids[u] = list;
  }
  if (m.packets.some((p) => isObj(p) && p.pass === "A" && !m.units.includes(p.unit))) die(file + ": co goi pha A cua unit ngoai danh sach units.");
  return { units: m.units, ids, delta };
}

function main() {
  const argv = process.argv.slice(2);
  const specs = [];
  let units = null, only = null, manifestFile = null, root = path.resolve(here, ".."), jsonOut = null, allowIdentical = false;
  const list = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--solver") specs.push(String(argv[++i] || ""));
    else if (argv[i] === "--units") units = list(argv[++i]);
    else if (argv[i] === "--only") only = list(argv[++i]);
    else if (argv[i] === "--manifest") manifestFile = argv[++i] || die("--manifest can ten tep.");
    else if (argv[i] === "--root") root = path.resolve(argv[++i] || ".");
    else if (argv[i] === "--json") jsonOut = argv[++i] || die("--json can ten tep.");
    else if (argv[i] === "--allow-identical") allowIdentical = true;
    else die("Tham so khong hop le: " + argv[i]);
  }
  if ([units, only, manifestFile].filter((x) => x !== null).length !== 1) die("Can dung MOT trong --manifest <goi>/manifest.json, --units id,id, --only unit/qid,...: danh sach can kiem khong duoc lay tu tep cua nguoi giai.");
  const seenFile = new Map();
  const solvers = specs.map((spec, si) => {
    const eq = spec.indexOf("=");
    const files = list(eq > 0 ? spec.slice(eq + 1) : spec);
    if (!files.length) die("--solver can <ten>=<tep.json>.");
    const name = eq > 0 ? spec.slice(0, eq) : path.basename(files[0], ".json");
    const data = {};
    for (const f of files) {
      const j = readJson(f);
      let real = fs.realpathSync.native(f);
      if (process.platform === "win32") real = real.toLowerCase();
      if (seenFile.has(real) && seenFile.get(real) !== si) die("Hai nguoi giai tro toi cung mot tep: " + f);
      seenFile.set(real, si);
      if (!isObj(j)) die(f + ": phai la doi tuong { unit: { mode: { qid: [answer, conf, flag] } } }.");
      for (const [u, ms] of Object.entries(j)) {
        if (!isObj(ms) || !Object.values(ms).every(isObj)) die(f + ": unit '" + u + "' sai dinh dang { mode: { qid: [...] } }.");
        for (const [m, qs] of Object.entries(ms)) {
          const t = (((data[u] = data[u] || {}))[m] = data[u][m] || {});
          for (const [q, v] of Object.entries(qs)) {
            const at = f + ": " + u + "/" + m + "/" + q;
            if (!Array.isArray(v) || v.length !== 3) die(at + " phai la [answer, conf, flag] (3 phan tu).");
            if (!okFlag(v[2])) die(at + ": flag " + JSON.stringify(v[2]) + " khong hop le: chi nhan \"\", chuoi bat dau bang \"second\" hoac \"note:\".");
            if (q in t) die(name + ": " + u + "/" + m + "/" + q + " xuat hien o hai tep.");
            t[q] = v;
          }
        }
      }
    }
    return { name, data };
  });
  if (solvers.length < 2) die("Can it nhat 2 --solver.");
  if (new Set(solvers.map((x) => x.name)).size !== solvers.length) die("Ten nguoi giai bi trung.");
  const identical = [];
  solvers.forEach((a, i) => solvers.slice(i + 1).forEach((b) => { if (canon(a.data) === canon(b.data)) identical.push(a.name + " = " + b.name); }));
  if (identical.length && !allowIdentical) die("Du lieu cua hai nguoi giai giong het nhau (" + identical.join(", ") + "): kiem tra xem co chep/dung nham tep khong. Neu ho thuc su giai doc lap, chay lai voi --allow-identical.");
  if (identical.length) console.log("CHU Y: --allow-identical: du lieu giong het nhau (" + identical.join(", ") + ").\n");

  let ids, expect = null, delta = false;
  if (manifestFile !== null) {
    const m = readManifest(manifestFile, root);
    ids = m.units; delta = m.delta; expect = m.ids;
  } else if (only !== null) {
    if (!only.length || !only.every((x) => /^[a-z0-9-]+\/[A-Za-z0-9_-]+$/.test(x))) die("--only can dang unit/qid,unit/qid.");
    expect = {}; delta = true;
    only.forEach((x) => { const [u, q] = x.split("/"); (expect[u] = expect[u] || []).push(q); });
    ids = Object.keys(expect);
  } else ids = [...new Set(units)];
  if (!ids.length) die("Khong co unit nao de so.");
  const names = solvers.map((x) => x.name), results = [];
  for (const id of ids) {
    if (!/^[a-z0-9-]+$/.test(id)) die("Id unit khong hop le: " + id);
    let u;
    try { u = loadUnit(root, id); } catch (e) { die(e.message); }
    if (expect) { const key = unitKey(u); expect[id].forEach((q) => { if (!key.has(q)) die(id + " khong co cau " + q + "."); }); }
    const r = compareUnit(u, solvers, expect && expect[id], delta);
    if (delta) r.flagsB = null;
    results.push(r);
    console.log(report(r, names) + "\n");
  }
  const ignored = [...new Set([].concat(...solvers.map((x) => Object.keys(x.data))))].filter((u) => !ids.includes(u));
  if (ignored.length) console.log("ghi chu: tep nguoi giai co unit khong duoc yeu cau (bo qua): " + ignored.join(", "));
  const bad = results.filter((r) => !r.pass).map((r) => r.unit);
  console.log("blind-compare: " + results.length + " unit; pha A " + (bad.length ? "KHONG DAT: " + bad.join(", ") : "DAT tat ca") + (delta ? " (kiem delta: " + results.reduce((n, r) => n + r.items, 0) + " cau)" : "") + ".");
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ solvers: names, identicalAllowed: identical, results }, null, 2) + "\n");
  process.exit(bad.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
