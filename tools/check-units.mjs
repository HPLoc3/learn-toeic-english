#!/usr/bin/env node
/* check-units.mjs - kiem tra du lieu cac unit cua Tung Buoc English. Chi dung node (khong phu thuoc goi ngoai).
 * Cach dung:
 *   node tools/check-units.mjs              kiem catalog va moi unit co "available": true
 *   node tools/check-units.mjs --unit l02   kiem them unit chua mo (bat ke available)
 *   --root <thu-muc>                        goc du an (mac dinh: thu muc cha cua tools/), dung de thu nghiem
 * Loi -> thoat ma 1. Canh bao khong lam hong ket qua. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

/* ---------- cau hinh so luong toi thieu (vi pham chi CANH BAO) ---------- */
const MIN = { tips: 2, vocab: 20, phrases: 8, sentences: 4, exercises: 3, fillItems: 5, tfItems: 4 };
const MIN_GAME_ROUNDS = 10;   /* duoi muc nay la LOI */
const GAME_CHOICES = 4;       /* phai trung CHOICES trong game.js */
const GAME_ROUNDS_PER_PLAY = 10;

const here = path.dirname(fileURLToPath(import.meta.url));
let ROOT = path.resolve(here, "..");
let only = null;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--unit") only = argv[++i];
  else if (argv[i] === "--root") ROOT = path.resolve(argv[++i] || ".");
  else { console.error("Tham so khong hop le: " + argv[i]); process.exit(2); }
}
if (argv.includes("--unit") && (!only || !/^[a-z0-9-]+$/.test(only))) {
  console.error("--unit can mot id hop le (chu thuong, so, dau gach ngang)."); process.exit(2);
}

const errors = [], warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const nonEmpty = (s) => typeof s === "string" && s.trim() !== "";
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => { try { return fs.statSync(path.join(ROOT, rel)).isFile(); } catch { return false; } };

function runInWindow(code, file) {
  const w = {};
  w.window = w;
  try { vm.runInNewContext(code, w, { filename: file, timeout: 5000 }); }
  catch (e) { return { error: e.message }; }
  return { w };
}

/* resolveSentence: tai dung tu game.js neu duoc, khong thi dung ban tuong duong */
function fallbackResolve(u, ref) {
  if (!ref) return null;
  if (ref.tip) {
    const t = ((u.focus && u.focus.tips) || []).find((x) => x.id === ref.tip);
    return t ? (t.examples || [])[ref.i] || null : null;
  }
  const ex = (u.exercises || []).find((x) => x.id === ref.ex);
  if (!ex) return null;
  if (ref.item) return (ex.items || []).find((x) => x.id === ref.item) || null;
  return (ex.options || []).find((o) => o.label === ex.answer) || null;
}
let resolveSentence = fallbackResolve;
if (exists("assets/js/game.js")) {
  const r = runInWindow(read("assets/js/game.js"), "game.js");
  if (r.w && r.w.BSGame && typeof r.w.BSGame.resolveSentence === "function") resolveSentence = r.w.BSGame.resolveSentence;
}

/* ---------- catalog ---------- */
function loadCatalog() {
  if (!exists("data/catalog.js")) { err("Thiếu tệp data/catalog.js."); return []; }
  const r = runInWindow(read("data/catalog.js"), "catalog.js");
  if (r.error) { err("data/catalog.js lỗi cú pháp: " + r.error); return []; }
  const cat = r.w.BS_CATALOG;
  if (!isObj(cat) || !Array.isArray(cat.parts)) { err("data/catalog.js: thiếu BS_CATALOG.parts."); return []; }
  const entries = [], ids = {}, nos = {};
  cat.parts.forEach((p) => {
    if (!isObj(p) || !Array.isArray(p.units)) { err("catalog: part '" + (p && p.id) + "' thiếu mảng units."); return; }
    p.units.forEach((u) => {
      if (!isObj(u) || !nonEmpty(u.id)) { err("catalog: có unit thiếu id."); return; }
      if (!/^[a-z0-9-]+$/.test(u.id)) err("catalog: id '" + u.id + "' không hợp lệ (chỉ chữ thường, số, dấu gạch ngang).");
      if (ids[u.id]) err("catalog: id '" + u.id + "' bị trùng.");
      ids[u.id] = 1;
      if (typeof u.no !== "number") err("catalog: unit '" + u.id + "' thiếu số thứ tự 'no' (số).");
      else { if (nos[u.no]) err("catalog: số thứ tự no=" + u.no + " bị trùng (unit '" + u.id + "')."); nos[u.no] = 1; }
      if (!nonEmpty(u.title_vi)) err("catalog: unit '" + u.id + "' thiếu title_vi.");
      if (u.available && u.game === true) { /* kiem game o duoi */ }
      if (u.anim !== undefined && !(typeof u.anim === "string" && /^assets\/js\/[A-Za-z0-9._\/-]+\.js$/.test(u.anim) && !u.anim.includes(".."))) err("catalog: unit '" + u.id + "' có 'anim' không hợp lệ.");
      entries.push(u);
    });
  });
  return entries;
}

/* ---------- anh ---------- */
const dirCache = {};
function listDir(rel) {
  if (!(rel in dirCache)) { try { dirCache[rel] = fs.readdirSync(path.join(ROOT, rel)); } catch { dirCache[rel] = null; } }
  return dirCache[rel];
}
const checkedImgs = {};
function checkImage(id, src, where) {
  if (typeof src !== "string" || !src) { err(where + ": đường dẫn ảnh rỗng hoặc không phải chuỗi."); return; }
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//") || src.startsWith("/") || src.includes("\\")) { err(where + ": ảnh '" + src + "' không được là URL ngoài hay đường dẫn tuyệt đối."); return; }
  if (src.split("/").includes("..")) { err(where + ": ảnh '" + src + "' chứa '..'."); return; }
  const prefix = "assets/img/" + id + "/";
  if (!src.startsWith(prefix) || src.length === prefix.length) { err(where + ": ảnh '" + src + "' phải nằm dưới " + prefix); return; }
  if (checkedImgs[src]) return;
  checkedImgs[src] = 1;
  const parts = src.split("/");
  let cur = "";
  for (let i = 0; i < parts.length; i++) {
    const list = listDir(cur || ".");
    if (!list) { err(where + ": không đọc được thư mục '" + (cur || ".") + "' cho ảnh '" + src + "'."); return; }
    if (!list.includes(parts[i])) {
      const alt = list.find((n) => n.toLowerCase() === parts[i].toLowerCase());
      if (alt) err(where + ": ảnh '" + src + "' sai hoa/thường, tên thật là '" + alt + "'.");
      else err(where + ": thiếu ảnh '" + src + "'.");
      return;
    }
    cur = cur ? cur + "/" + parts[i] : parts[i];
  }
  if (/\.svg$/i.test(src)) {
    let txt = "";
    try { txt = fs.readFileSync(path.join(ROOT, src), "utf8"); } catch { err(where + ": không đọc được " + src); return; }
    if (/<script/i.test(txt)) err(src + ": SVG chứa <script.");
    if (/<image/i.test(txt)) err(src + ": SVG chứa <image (ảnh nhúng).");
    if (/\son[a-z]+\s*=/i.test(txt)) err(src + ": SVG chứa thuộc tính sự kiện (onclick...).");
    const re = /(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi;
    let m;
    while ((m = re.exec(txt))) if (!m[1].startsWith("#")) { err(src + ": SVG có href ngoài '" + m[1] + "'."); break; }
    if (/<foreignObject/i.test(txt)) warn(src + ": SVG chứa <foreignObject, nên tránh.");
  }
}

/* ---------- kiem mot unit ---------- */
function checkUnit(entry) {
  const id = entry.id, tag = "[" + id + "] ";
  const e = (m) => err(tag + m), w = (m) => warn(tag + m);
  const file = "data/" + id + ".js";
  if (!exists(file)) { e("thiếu tệp " + file + "."); return; }
  const code = read(file);
  const netRe = /https?:\/\/|fetch\s*\(|XMLHttpRequest/;
  const gameFile = "data/" + id + "-game.js";
  const r = runInWindow(code, file);
  if (r.error) { e(file + " lỗi cú pháp/chạy: " + r.error); return; }
  const u = r.w.BS_UNITS && r.w.BS_UNITS[id];
  if (!isObj(u)) { e(file + " không đặt window.BS_UNITS." + id + "."); return; }
  if (netRe.test(code)) e(file + " chứa chuỗi mạng (http(s)://, fetch(, XMLHttpRequest).");
  if (u.id !== id) e("id trong dữ liệu ('" + u.id + "') khác catalog ('" + id + "').");
  if (u.unitNo !== entry.no) e("unitNo (" + u.unitNo + ") khác 'no' trong catalog (" + entry.no + ").");
  if (u.title_vi !== entry.title_vi) e("title_vi khác catalog.");
  if (!nonEmpty(u.part)) e("thiếu 'part'.");
  if (!isObj(u.focus)) e("thiếu 'focus'."); else if (!nonEmpty(u.focus.intro_vi)) e("focus thiếu intro_vi.");

  const seen = {};
  const uniq = (idv, where) => {
    if (!nonEmpty(idv)) { e(where + ": thiếu id."); return; }
    if (seen[idv]) e(where + ": id '" + idv + "' bị trùng (đã dùng ở " + seen[idv] + ").");
    else seen[idv] = where;
  };
  const arr = (x, name) => { if (!Array.isArray(x)) { e("'" + name + "' phải là mảng."); return []; } return x; };

  const tips = arr((u.focus || {}).tips, "focus.tips");
  tips.forEach((t, i) => {
    const wh = "tip[" + i + "]";
    uniq(t && t.id, wh);
    if (!isObj(t)) return;
    if (!nonEmpty(t.text_vi)) e(wh + ": thiếu text_vi.");
    if (t.image !== undefined) checkImage(id, t.image, wh + ".image");
    arr(t.examples, wh + ".examples").forEach((x, j) => {
      if (!isObj(x) || !nonEmpty(x.en)) e(wh + ".examples[" + j + "]: thiếu en.");
      else if (!nonEmpty(x.vi)) w(wh + ".examples[" + j + "]: thiếu bản dịch vi.");
    });
  });
  const vocab = arr(u.vocab, "vocab");
  vocab.forEach((x, i) => {
    const wh = "vocab[" + i + "]";
    uniq(x && x.id, wh);
    if (!isObj(x) || !nonEmpty(x.en) || !nonEmpty(x.vi)) e(wh + ": thiếu en hoặc vi.");
    else if (!nonEmpty(x.group)) e(wh + ": thiếu group.");
  });
  const phrases = arr(u.phrases, "phrases");
  phrases.forEach((x, i) => {
    const wh = "phrases[" + i + "]";
    uniq(x && x.id, wh);
    if (!isObj(x) || !nonEmpty(x.en) || !nonEmpty(x.vi)) e(wh + ": thiếu en hoặc vi.");
    else if (!nonEmpty(x.group_vi)) e(wh + ": thiếu group_vi.");
  });
  const sentences = arr(u.sentences, "sentences");
  sentences.forEach((x, i) => {
    const wh = "sentences[" + i + "]";
    uniq(x && x.id, wh);
    if (!isObj(x) || !nonEmpty(x.en) || !nonEmpty(x.vi)) e(wh + ": thiếu en hoặc vi.");
  });
  const exs = arr(u.exercises, "exercises");
  let fillN = 0, tfN = 0;
  exs.forEach((ex, i) => {
    const wh = "exercise[" + i + "]" + (ex && ex.id ? " '" + ex.id + "'" : "");
    uniq(ex && ex.id, wh);
    if (!isObj(ex)) return;
    if (ex.image !== undefined) checkImage(id, ex.image, wh + ".image");
    if (ex.type === "fill") {
      arr(ex.items, wh + ".items").forEach((it, j) => {
        const wi = wh + ".items[" + j + "]";
        uniq(it && it.id, wi);
        if (!isObj(it)) return;
        fillN++;
        if (typeof it.before !== "string" || typeof it.after !== "string") e(wi + ": thiếu before/after.");
        if (!Array.isArray(it.answers) || !it.answers.length || it.answers.some((a) => !nonEmpty(a))) e(wi + ": answers rỗng hoặc có đáp án rỗng.");
      });
    } else if (ex.type === "tf") {
      if (ex.image === undefined) e(wh + ": bài tf thiếu image.");
      const labels = {};
      arr(ex.items, wh + ".items").forEach((it, j) => {
        const wi = wh + ".items[" + j + "]";
        uniq(it && it.id, wi);
        if (!isObj(it)) return;
        tfN++;
        if (!nonEmpty(it.en)) e(wi + ": thiếu en.");
        if (typeof it.answer !== "boolean") e(wi + ": answer phải là true/false (boolean).");
        if (!nonEmpty(it.label)) e(wi + ": thiếu label.");
        else if (labels[it.label]) e(wi + ": label '" + it.label + "' bị trùng trong bài.");
        else labels[it.label] = 1;
        if (!nonEmpty(it.explain_vi)) e(wi + ": thiếu explain_vi.");
      });
    } else if (ex.type === "mc") {
      if (ex.image === undefined) e(wh + ": bài mc thiếu image.");
      const opts = arr(ex.options, wh + ".options"), labels = {};
      if (opts.length < 2) e(wh + ": cần ít nhất 2 lựa chọn.");
      opts.forEach((o, j) => {
        const wo = wh + ".options[" + j + "]";
        if (!isObj(o) || !nonEmpty(o.label) || !nonEmpty(o.en)) { e(wo + ": thiếu label hoặc en."); return; }
        if (labels[o.label]) e(wo + ": label '" + o.label + "' bị trùng."); else labels[o.label] = 1;
        if (o.label === ex.answer && o.why_vi) w(wo + ": lựa chọn đúng lại có why_vi.");
      });
      if (!labels[ex.answer]) e(wh + ": answer '" + ex.answer + "' không thuộc các label.");
      if (!nonEmpty(ex.explain_vi)) e(wh + ": thiếu explain_vi.");
    } else e(wh + ": type '" + ex.type + "' không hợp lệ (fill, tf, mc).");
    if (nonEmpty(ex.instruction_vi) === false) w(wh + ": thiếu instruction_vi.");
  });

  const cnt = (n, v, name) => { if (n < v) w("ít hơn mức tối thiểu: " + name + " " + n + " < " + v + "."); };
  cnt(tips.length, MIN.tips, "mẹo (tips)"); cnt(vocab.length, MIN.vocab, "từ vựng");
  cnt(phrases.length, MIN.phrases, "cụm từ"); cnt(sentences.length, MIN.sentences, "câu luyện tập");
  cnt(exs.length, MIN.exercises, "bài tập"); cnt(fillN, MIN.fillItems, "câu điền từ"); cnt(tfN, MIN.tfItems, "câu đúng/sai");

  /* the 'v' unverified */
  let unv = 0;
  (function walk(x) {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (x.v && typeof x.v === "object" && x.v.status === "unverified") unv++;
    Object.keys(x).forEach((k) => { if (k !== "v") walk(x[k]); });
  })(u);
  if (unv && entry.available) w("unit đã mở nhưng còn " + unv + " mục 'unverified'.");

  /* game */
  if (entry.game === true) {
    if (!exists(gameFile)) { e("catalog bật game nhưng thiếu " + gameFile + "."); }
    else {
      const gcode = read(gameFile);
      if (netRe.test(gcode)) e(gameFile + " chứa chuỗi mạng.");
      const gr = runInWindow(gcode, gameFile);
      const cfg = gr.w && gr.w.BS_GAMES && gr.w.BS_GAMES[id];
      if (gr.error) e(gameFile + " lỗi: " + gr.error);
      else if (!isObj(cfg) || !Array.isArray(cfg.rounds)) e(gameFile + " không đặt BS_GAMES." + id + ".rounds.");
      else {
        if (cfg.rounds.length < MIN_GAME_ROUNDS) e("game có " + cfg.rounds.length + " vòng, cần ít nhất " + MIN_GAME_ROUNDS + ".");
        const imgs = {};
        cfg.rounds.forEach((rd, i) => {
          const wr = "game.rounds[" + i + "]";
          if (!isObj(rd)) { e(wr + ": không phải đối tượng."); return; }
          checkImage(id, rd.img, wr + ".img");
          imgs[rd.img] = 1;
          const s = resolveSentence(u, rd.ref);
          if (!s || !nonEmpty(s.en)) e(wr + ": ref " + JSON.stringify(rd.ref) + " không tra ra câu có 'en'.");
          (rd.avoid || []).forEach((a) => {
            const ex = exs.find((x) => x && x.id === a);
            if (!ex) e(wr + ": avoid '" + a + "' không phải bài tập.");
            else if (!ex.image) e(wr + ": avoid '" + a + "' trỏ tới bài tập không có ảnh.");
          });
        });
        const distinct = Object.keys(imgs).length;
        if (distinct < GAME_CHOICES) e("game chỉ có " + distinct + " ảnh khác nhau, cần ít nhất " + GAME_CHOICES + ".");
        else if (distinct < Math.ceil(GAME_ROUNDS_PER_PLAY / 2)) w("game có " + distinct + " ảnh khác nhau, ít để đủ " + GAME_ROUNDS_PER_PLAY + " vòng (mỗi ảnh tối đa 2 vòng).");
        cfg.rounds.forEach((rd, i) => {
          if (!isObj(rd)) return;
          const avoidImgs = {};
          (rd.avoid || []).forEach((a) => { const ex = exs.find((x) => x && x.id === a); if (ex && ex.image) avoidImgs[ex.image] = 1; });
          const free = Object.keys(imgs).filter((p) => p !== rd.img && !avoidImgs[p]).length;
          if (free < GAME_CHOICES - 1) e("game.rounds[" + i + "]: chỉ còn " + free + " ảnh nhiễu sau khi trừ avoid, cần " + (GAME_CHOICES - 1) + ".");
        });
      }
    }
  } else if (exists(gameFile)) w("có " + gameFile + " nhưng catalog chưa bật \"game\": true.");
  if (entry.anim && !exists(entry.anim)) e("thiếu tệp hoạt hình '" + entry.anim + "'.");
}

/* ---------- chay ---------- */
const entries = loadCatalog();
const targets = [];
entries.forEach((u) => { if (u.available || u.id === only) targets.push(u); });
if (only && !entries.some((u) => u.id === only)) err("--unit " + only + ": id không có trong catalog (hãy thêm vào data/catalog.js trước).");
targets.forEach((u) => {
  if (u.available && !exists("data/" + u.id + ".js")) return checkUnit(u);
  checkUnit(u);
});

warns.forEach((m) => console.log("CẢNH BÁO: " + m));
errors.forEach((m) => console.log("LỖI: " + m));
console.log("Đã kiểm " + targets.length + " unit (" + targets.map((u) => u.id).join(", ") + "): " + errors.length + " lỗi, " + warns.length + " cảnh báo.");
process.exit(errors.length ? 1 : 0);
