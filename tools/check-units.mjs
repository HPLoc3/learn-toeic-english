#!/usr/bin/env node
/* check-units.mjs - kiem tra du lieu cac unit cua Tung Buoc English. Chi dung node (khong phu thuoc goi ngoai).
 * Cach dung:
 *   node tools/check-units.mjs              kiem catalog va moi unit co "available": true
 *   node tools/check-units.mjs --unit l02   chi kiem unit do (ke ca unit chua mo)
 *   --release                               that bai neu du lieu hoat hinh con "placeholder": true (binh thuong chi canh bao)
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
/* Part 2 (type "qr") */
const QR_KINDS = ["who", "where", "when", "why", "what", "which", "how", "yesno", "negative", "tag", "request", "suggestion", "choice", "statement", "indirect"];
const QR_TRAPS = ["similar-sound", "repeat-word", "wrong-wh", "wrong-tense", "wrong-subject", "related-word", "yesno-to-wh"];
const QR_LABELS = ["A", "B", "C"];
const QR_MIN_ITEMS = 20;
const QR_LEAK_ALLOW =["qr1-05|as soon as"]; /* ngoại lệ có chủ đích: "id câu|đoạn tiếng anh đã chuẩn hóa". Hiện: liên từ thông dụng "as soon as" trong từ vựng p2-02, phần còn lại của đáp án không bị lộ. */
const QR_LETTER_MIN = 0.2, QR_LETTER_MAX = 0.45;
const QR_STOP = new Set(("a an the and or but if so as of to in on at by for with from into onto up down out off over under about than then that this these those " +
  "i me my mine we us our you your he him his she her it its they them their is am are was were be been being do does did done have has had will would can could shall should may might must " +
  "not no yes ok okay please there here what which who whom whose when where why how too very just also still already again s t ll d re ve m").split(/\s+/));
/* từ chức năng cho luật "gần trùng": QR_STOP thêm giới từ/trạng từ mẫu câu thường gặp */
const QR_LEAK_STOP = new Set([...QR_STOP, "until", "next", "last", "across", "behind", "near", "before", "after", "during", "between", "through", "around", "inside", "outside", "any", "some", "more", "much", "many", "let", "say"]);
const qrWords = (t) => String(t || "").toLowerCase().replace(/[’‘]/g, "'").split(/[^a-z0-9]+/).filter((w) => w && !QR_STOP.has(w));

const here = path.dirname(fileURLToPath(import.meta.url));
let ROOT = path.resolve(here, "..");
let only = null;
let RELEASE = false;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--unit") only = argv[++i];
  else if (argv[i] === "--release") RELEASE = true;
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
      if (u.anim !== undefined && u.anim !== true) err("catalog: unit '" + u.id + "' có 'anim' không hợp lệ: chỉ nhận true (không còn đường dẫn). Hoạt hình nằm ở data/" + u.id + "-anim.js, xem tools/templates/HUONG-DAN-UNIT.txt.");
      if (u.animKind !== undefined && u.animKind !== "rig" && u.animKind !== "scenes") err("catalog: unit '" + u.id + "' có 'animKind' không hợp lệ ('" + u.animKind + "'): chỉ nhận \"scenes\" hoặc \"rig\".");
      else if (u.animKind !== undefined && u.anim !== true) warn("catalog: unit '" + u.id + "' có animKind nhưng không bật \"anim\": true.");
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
const MAX_WEBP_BYTES = 110000;
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
  if (!/\.(svg|webp)$/i.test(src)) { err(where + ": ảnh '" + src + "' chỉ được là .svg hoặc .webp."); return; }
  if (/\.webp$/i.test(src)) {
    let size = 0;
    try { size = fs.statSync(path.join(ROOT, src)).size; } catch { err(where + ": không đọc được " + src); return; }
    if (size > MAX_WEBP_BYTES) err(src + ": ảnh webp nặng " + size + " B, tối đa " + MAX_WEBP_BYTES + " B.");
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
      if (isObj(x) && x.q !== undefined && !nonEmpty(x.q)) e(wh + ".examples[" + j + "]: q (câu hỏi Part 2) phải là chuỗi không rỗng.");
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
  if (u.sentences_title_vi !== undefined && !nonEmpty(u.sentences_title_vi)) e("sentences_title_vi phải là chuỗi không rỗng.");
  const sentences = arr(u.sentences, "sentences");
  sentences.forEach((x, i) => {
    const wh = "sentences[" + i + "]";
    uniq(x && x.id, wh);
    if (!isObj(x) || !nonEmpty(x.en) || !nonEmpty(x.vi)) e(wh + ": thiếu en hoặc vi.");
  });
  const exs = arr(u.exercises, "exercises");
  let fillN = 0, tfN = 0, qrN = 0;
  const qrItems = [];
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
    } else if (ex.type === "qr") {
      if (ex.image !== undefined) w(wh + ": bài qr không dùng ảnh (Part 2 chỉ nghe).");
      if (RELEASE && ex.v && ex.v.status === "unverified") e(wh + ": còn 'unverified', không được phát hành (--release).");
      arr(ex.items, wh + ".items").forEach((it, j) => {
        const wi = wh + ".items[" + j + "]";
        uniq(it && it.id, wi);
        if (!isObj(it)) return;
        qrN++; qrItems.push(it);
        if (!QR_KINDS.includes(it.kind)) e(wi + ": kind '" + it.kind + "' không hợp lệ (" + QR_KINDS.join(", ") + ").");
        if (!isObj(it.q) || !nonEmpty(it.q.en) || !nonEmpty(it.q.vi)) e(wi + ": q cần en và vi không rỗng.");
        if (!nonEmpty(it.explain_vi)) e(wi + ": thiếu explain_vi.");
        if (it.audio !== undefined) {
          if (!isObj(it.audio)) e(wi + ": audio phải là đối tượng {q, A, B, C} (đường dẫn tương đối).");
          else Object.keys(it.audio).forEach((k) => {
            const a = it.audio[k];
            if (!["q", "A", "B", "C"].includes(k)) e(wi + ": audio có khóa lạ '" + k + "'.");
            else if (!nonEmpty(a) || /^[a-z][a-z0-9+.-]*:/i.test(a) || a.startsWith("/") || a.startsWith("//") || a.includes("\\") || a.split("/").includes("..")) e(wi + ": audio." + k + " phải là đường dẫn tương đối, không URL và không '..'.");
          });
        }
        const os = Array.isArray(it.options) ? it.options : [];
        if (os.length !== 3 || os.some((o, k) => !isObj(o) || o.label !== QR_LABELS[k])) { e(wi + ": cần đúng 3 đáp án có label A, B, C theo thứ tự."); return; }
        if (!QR_LABELS.includes(it.answer)) e(wi + ": answer '" + it.answer + "' phải là A, B hoặc C.");
        os.forEach((o, k) => {
          const wo = wi + ".options[" + QR_LABELS[k] + "]";
          if (!nonEmpty(o.en) || !nonEmpty(o.vi)) e(wo + ": thiếu en hoặc vi.");
          if (o.label === it.answer) {
            if (o.trap !== undefined) e(wo + ": đáp án đúng không được có trap.");
            if (o.why_vi !== undefined) e(wo + ": đáp án đúng không được có why_vi.");
          } else {
            if (!QR_TRAPS.includes(o.trap)) e(wo + ": đáp án sai cần trap thuộc (" + QR_TRAPS.join(", ") + ").");
            if (!nonEmpty(o.why_vi)) e(wo + ": đáp án sai thiếu why_vi (giải thích tiếng Việt vì sao sai).");
          }
        });
        if (QR_LABELS.includes(it.answer) && isObj(it.q) && nonEmpty(it.q.en)) {
          const right = os.find((o) => o.label === it.answer);
          const qw = new Set(qrWords(it.q.en));
          const dup = right && nonEmpty(right.en) ? qrWords(right.en).filter((x) => qw.has(x)) : [];
          if (dup.length) w(wi + ": đáp án đúng lặp từ của câu hỏi (" + [...new Set(dup)].join(", ") + "); thường là dấu hiệu bẫy, hãy xem lại.");
        }
        if (RELEASE) { /* đếm mọi `v` unverified trong câu, kể cả trên từng đáp án */
          let n = 0;
          (function walk(x) {
            if (!x || typeof x !== "object") return;
            if (Array.isArray(x)) { x.forEach(walk); return; }
            if (x.v && typeof x.v === "object" && x.v.status === "unverified") n++;
            Object.keys(x).forEach((k) => { if (k !== "v") walk(x[k]); });
          })(it);
          if (n) e(wi + ": còn " + n + " mục 'unverified' (câu hoặc đáp án), không được phát hành (--release).");
        }
      });
    } else e(wh + ": type '" + ex.type + "' không hợp lệ (fill, tf, mc, qr).");
    if (nonEmpty(ex.instruction_vi) === false) w(wh + ": thiếu instruction_vi.");
  });

  const cnt = (n, v, name) => { if (n < v) w("ít hơn mức tối thiểu: " + name + " " + n + " < " + v + "."); };
  cnt(tips.length, MIN.tips, "mẹo (tips)"); cnt(vocab.length, MIN.vocab, "từ vựng");
  cnt(phrases.length, MIN.phrases, "cụm từ");
  cnt(exs.length, MIN.exercises, "bài tập"); cnt(fillN, MIN.fillItems, "câu điền từ");
  const isP2 = /^p2-/.test(id); /* chỉ unit Part 2 (không có ảnh) được bỏ mức tối thiểu của câu tả hình và câu đúng/sai */
  if (qrN) {
    if (isP2) cnt(qrN, QR_MIN_ITEMS, "câu hỏi đáp (qr)");
    const byL = {};
    qrItems.forEach((it) => { if (QR_LABELS.includes(it.answer)) byL[it.answer] = (byL[it.answer] || 0) + 1; });
    const tot = qrItems.length;
    QR_LABELS.forEach((L) => {
      const r = (byL[L] || 0) / tot;
      if (r < QR_LETTER_MIN || r > QR_LETTER_MAX) w("đáp án " + L + " chiếm " + Math.round(r * 100) + "% (" + (byL[L] || 0) + "/" + tot + ") các câu qr; nên nằm trong " + QR_LETTER_MIN * 100 + "-" + QR_LETTER_MAX * 100 + "%.");
    });
    const seenQ = {};
    qrItems.forEach((it) => {
      if (!isObj(it.q) || !nonEmpty(it.q.en)) return;
      const k = it.q.en.trim().toLowerCase().replace(/\s+/g, " ");
      if (seenQ[k]) e("câu hỏi \"" + it.q.en + "\" bị trùng (" + seenQ[k] + " và " + it.id + ").");
      else seenQ[k] = it.id;
    });
  }
  if (!(qrN && isP2)) { cnt(sentences.length, MIN.sentences, "câu luyện tập"); cnt(tfN, MIN.tfItems, "câu đúng/sai"); }
  /* Không để lộ lời thoại/đáp án: câu hỏi và đáp án ĐÚNG của qr không được xuất hiện ở BẤT KỲ chuỗi nào ngoài bài qr: bài học (text_vi, ví dụ), intro_vi,
   * từ vựng, cụm từ, luyện nghe, tiêu đề, hướng dẫn, bài điền (kể cả câu ghép lại). Đáp án sai (bẫy) thì được phép.
   * So sánh sau khi chuẩn hóa (chữ thường, bỏ dấu câu); với chuỗi tiếng Việt xen tiếng Anh thì tách các đoạn tiếng Anh (cắt ở chữ có dấu và . , ; : ! ? ( )), giữ đoạn >= 3 từ.
   * LỖI: trùng khớp một chuỗi/đoạn; hoặc cả câu (>= 12 ký tự) nằm trong một chuỗi/đoạn; hoặc một đoạn tiếng Anh >= 4 từ và >= 12 ký tự nằm trong câu qr.
   * Đoạn liền nhau dài nhất giữa một đoạn tiếng Anh và câu qr (không cần cả đoạn nằm trong câu qr) dài >= 3 từ, chiếm >= 50% số từ của câu qr và có >= 2 từ không thuộc QR_LEAK_STOP: CẢNH BÁO (LỖI khi --release, trừ khi có trong QR_LEAK_ALLOW). */
  if (qrN) {
    const nz = (t) => String(t || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
    const pool = []; /* { k, where, run } */
    const addStr = (s, where) => {
      if (typeof s !== "string" || !s.trim()) return;
      const k = nz(s);
      if (k) pool.push({ k, where, run: false });
      /* cắt ở dấu câu (. , ; : ! ? ( )), rồi ở mọi từ có chữ không phải ASCII (từ tiếng Việt có dấu); giữ đoạn >= 3 từ */
      s.split(/[.,;:!?()"“”]+/).forEach((seg) => {
        let cur = [], ln = false; /* ln/rn: rìa đoạn giáp từ tiếng Việt, nơi có thể dính từ tiếng Việt không dấu (trong, nghe...) */
        const flush = (rn) => { const r = nz(cur.join(" ")); if (r && r.split(" ").length >= 3) pool.push({ k: r, where, run: true, ln, rn }); cur = []; ln = rn; };
        seg.split(/\s+/).forEach((tok) => { if (/[^\x00-\x7F]/.test(tok)) flush(true); else if (tok) cur.push(tok); });
        flush(false);
      });
    };
    (function walk(x, where) {
      if (typeof x === "string") { addStr(x, where); return; }
      if (!x || typeof x !== "object") return;
      if (Array.isArray(x)) { x.forEach((y, i) => walk(y, where + "[" + i + "]")); return; }
      if (Array.isArray(x.answers) && typeof x.after === "string") { /* bài điền: ghép lại câu hoàn chỉnh */
        addStr([x.before, x.answers[0], x.after].filter(Boolean).join(" "), where + " (câu ghép)");
      }
      Object.keys(x).forEach((k) => {
        if (k === "v") return;
        if (k === "exercises" && Array.isArray(x[k])) { x[k].forEach((ex, i) => { if (!(isObj(ex) && ex.type === "qr")) walk(ex, where + "exercises[" + i + "]"); }); return; }
        walk(x[k], where ? where + "." + k : k);
      });
    })(u, "");
    const padK = (k) => " " + k + " ";
    const place = (p) => p.where;
    const hit = (txt, what, itemId) => {
      const k = nz(txt);
      if (!k) return;
      const nw = k.split(" ").length;
      const kw = k.split(" ");
      /* đoạn chung liền nhau dài nhất (theo từ) giữa một đoạn tiếng Anh và câu qr; chịu được từ tiếng Việt không dấu dính ở rìa đoạn */
      const common = (p) => {
        const pw = p.k.split(" "); let best = 0, at = 0;
        for (let i = 0; i < pw.length; i++) for (let j = 0; j < kw.length; j++) {
          let n = 0; while (i + n < pw.length && j + n < kw.length && pw[i + n] === kw[j + n]) n++;
          /* cả đoạn phải nằm trong câu qr; riêng rìa giáp chữ Việt được bỏ tối đa 2 từ */
          if (n > best && i <= (p.ln ? 2 : 0) && pw.length - (i + n) <= (p.rn ? 2 : 0)) { best = n; at = i; }
        }
        return { n: best, text: pw.slice(at, at + best).join(" ") };
      };
      const f = pool.find((p) => p.k === k || (k.length >= 12 && padK(p.k).includes(padK(k))) || (p.run && (() => { const c = common(p); return c.n >= 4 && c.text.length >= 12; })()));
      if (f) { e(itemId + ": " + what + " \"" + txt + "\" trùng với nội dung ở " + place(f) + " (lộ lời thoại/đáp án); hãy viết câu khác cùng dạng."); return; }
      let g = null, gt = "";
      /* đoạn liền nhau dài nhất theo thứ tự giữa MỌI đoạn tiếng Anh và câu qr (không cần cả đoạn nằm trong câu qr): bắt cả câu diễn đạt lại có thêm từ */
      const lcs = (p) => {
        const pw = p.k.split(" "); let best = 0, at = 0;
        for (let i = 0; i < pw.length; i++) for (let j = 0; j < kw.length; j++) { let n = 0; while (i + n < pw.length && j + n < kw.length && pw[i + n] === kw[j + n]) n++; if (n > best) { best = n; at = i; } }
        return { n: best, text: pw.slice(at, at + best).join(" ") };
      };
      pool.some((p) => {
        if (!p.run) return false;
        const c = lcs(p);
        if (c.n < 3 || c.n / nw < 0.5) return false;
        if (c.text.split(" ").filter((x) => !QR_LEAK_STOP.has(x)).length < 2) return false; /* mẫu câu trần (across from the, not until next, who is in charge of the): bỏ qua */
        if (QR_LEAK_ALLOW.includes(itemId + "|" + c.text)) return false;
        g = p; gt = c.text; return true;
      });
      if (g) {
        const m = itemId + ": " + what + " \"" + txt + "\" gần trùng với đoạn tiếng Anh \"" + gt + "\" ở " + place(g) + " (chiếm từ 50% số từ); nên viết lại.";
        if (RELEASE) e(m + " Không được phát hành (--release)."); else w(m);
      }
    };
    qrItems.forEach((it) => {
      if (isObj(it.q)) hit(it.q.en, "câu hỏi", it.id);
      const right = Array.isArray(it.options) ? it.options.find((o) => isObj(o) && o.label === it.answer) : null;
      if (right) hit(right.en, "đáp án đúng", it.id);
    });
  }


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
        if (cfg.ratio !== undefined && cfg.ratio !== "16:9") e("BS_GAMES." + id + ".ratio '" + cfg.ratio + "' không hợp lệ: chỉ nhận \"16:9\" (bỏ trống = 4:3).");
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
        const kinds = {};
        Object.keys(imgs).forEach((p) => { if (typeof p === "string") kinds[/\.webp$/i.test(p) ? "webp" : "svg"] = 1; });
        if (kinds.svg && kinds.webp) w("game trộn ảnh .svg (4:3) với .webp (16:9); khung hình sẽ có viền, nên đồng nhất định dạng.");
        const byEn = {};
        cfg.rounds.forEach((rd, i) => {
          if (!isObj(rd)) return;
          const s = resolveSentence(u, rd.ref);
          if (!s || !nonEmpty(s.en)) return;
          const k = s.en.trim().toLowerCase();
          (byEn[k] = byEn[k] || { en: s.en, imgs: {}, at: [] });
          byEn[k].imgs[rd.img] = 1; byEn[k].at.push(i);
        });
        Object.keys(byEn).forEach((k) => {
          const b = byEn[k];
          if (Object.keys(b.imgs).length > 1) w("câu \"" + b.en + "\" dùng ở các vòng " + b.at.join(", ") + " với ảnh khác nhau.");
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
  if (entry.anim === true) checkAnim(entry, e, w);
  else if (exists("data/" + id + "-anim.js")) w("có data/" + id + "-anim.js nhưng catalog chưa bật \"anim\": true.");
}

/* ---------- hoat hinh du lieu (anim:true) ---------- */
function checkAnim(entry, e, w) {
  const id = entry.id, file = "data/" + id + "-anim.js";
  const scenes = entry.animKind === "scenes";
  const shared = scenes ? ["assets/js/anim-scenes.js"] : ["assets/js/anim-engine.js", "assets/js/anim-rig.js", "assets/js/anim-cast.js"];
  if (!exists(file)) { e("catalog bật anim:true nhưng thiếu tệp " + file + "."); return; }
  const miss = shared.filter((f) => !exists(f));
  if (miss.length) { e("thiếu tệp dùng chung của hoạt hình: " + miss.join(", ") + "."); return; }
  const code = read(file);
  if (/https?:\/\/|fetch\s*\(|XMLHttpRequest/.test(code)) e(file + " chứa chuỗi mạng (http(s)://, fetch(, XMLHttpRequest).");
  const win = {};
  win.window = win;
  try {
    shared.forEach((f) => vm.runInNewContext(read(f), win, { filename: f, timeout: 5000 }));
    vm.runInNewContext(code, win, { filename: file, timeout: 5000 });
  } catch (x) { e(file + " (hoặc engine) lỗi khi nạp: " + x.message); return; }
  const def = win.BS_ANIMS && win.BS_ANIMS[id];
  if (!isObj(def)) { e(file + " không đặt window.BS_ANIMS." + id + "."); return; }
  if (def.placeholder === true) {
    const m = file + ": dữ liệu/ảnh còn là placeholder (\"placeholder\": true).";
    if (RELEASE) e(m + " Không được phát hành (--release)."); else w(m);
  }
  if (scenes) { checkScenes(entry, def, file, win, e, w); return; }
  if (!win.BSAnim || typeof win.BSAnim.validate !== "function" || !win.BSRig) { e("engine/rig không xuất BSAnim.validate / BSRig."); return; }
  let errs;
  try { errs = win.BSAnim.validate(def, win.BSRig); } catch (x) { e(file + ": validate ném lỗi: " + x.message); return; }
  (errs || []).forEach((m) => e(file + ": " + m));
  if (def.id !== id) e(file + ": id trong dữ liệu ('" + def.id + "') khác catalog ('" + id + "').");
  (Array.isArray(def.scenes) ? def.scenes : []).forEach((sc, i) => {
    if (!isObj(sc) || !Array.isArray(sc.pieces)) return;
    const joined = sc.pieces.map((p) => (Array.isArray(p) ? p[0] : "")).join("");
    if (joined !== sc.en) e(file + ": scenes[" + i + "] câu 'en' (" + JSON.stringify(sc.en) + ") không khớp các pieces nối lại (" + JSON.stringify(joined) + ").");
  });
}

/* du lieu v2 (animKind "scenes"): validate cua BSScenes + kiem nhe hinh dang va anh 800 */
function checkScenes(entry, def, file, win, e, w) {
  const id = entry.id;
  if (!win.BSScenes || typeof win.BSScenes.validate !== "function") { e("anim-scenes.js không xuất BSScenes.validate."); return; }
  let errs;
  try { errs = win.BSScenes.validate(def); } catch (x) { e(file + ": BSScenes.validate ném lỗi: " + x.message); return; }
  (errs || []).forEach((m) => e(file + ": " + m));
  if (def.v !== 2 || def.kind !== "scenes") e(file + ": cần v:2 và kind:\"scenes\".");
  if (def.id !== id) e(file + ": id trong dữ liệu ('" + def.id + "') khác catalog ('" + id + "').");
  if (!isObj(def.img) || typeof def.img.base !== "string") { e(file + ": thiếu img.base."); return; }
  const list = Array.isArray(def.scenes) ? def.scenes : [];
  if (!list.length) e(file + ": scenes rỗng.");
  const names = list.map((sc) => sc && sc.img);
  if (isObj(def.outro)) names.push(def.outro.img);
  const sids = {};
  list.forEach((sc, i) => {
    if (!isObj(sc)) return;
    if (sids[sc.id]) e(file + ": scenes[" + i + "] id '" + sc.id + "' bị trùng."); sids[sc.id] = 1;
    if (Array.isArray(sc.pieces) && sc.pieces.map((p) => (Array.isArray(p) ? p[0] : "")).join("") !== sc.en) e(file + ": scenes[" + i + "] pieces nối lại không bằng 'en'.");
  });
  const seen = {};
  names.forEach((n) => {
    if (typeof n !== "string" || !/^[a-z0-9-]{1,32}$/.test(n) || seen[n]) return;
    seen[n] = 1;
    const f = def.img.base + n + "-800.webp";
    if (!/^assets\/img\//.test(f) || f.includes("..")) { e(file + ": đường dẫn ảnh '" + f + "' không hợp lệ."); return; }
    if (!exists(f)) e(file + ": thiếu ảnh " + f + ".");
    if (typeof def.img.hd === "string" && /^assets\/img-hd\/[a-z0-9_-]+\/$/.test(def.img.hd)) {
      const g = def.img.hd + n + "-1600.webp";
      if (!exists(g)) w(file + ": thiếu ảnh HD " + g + " (máy màn hình nét cao sẽ rơi về 800w).");
    }
  });
}

/* ---------- chay ---------- */
const entries = loadCatalog();
const targets = [];
entries.forEach((u) => { if (only ? u.id === only : u.available) targets.push(u); }); /* --unit <id>: chỉ kiểm unit đó (kể cả khi chưa mở); catalog vẫn được kiểm toàn bộ */
if (only && !entries.some((u) => u.id === only)) err("--unit " + only + ": id không có trong catalog (hãy thêm vào data/catalog.js trước).");
targets.forEach((u) => {
  if (u.available && !exists("data/" + u.id + ".js")) return checkUnit(u);
  checkUnit(u);
});

warns.forEach((m) => console.log("CẢNH BÁO: " + m));
errors.forEach((m) => console.log("LỖI: " + m));
console.log("Đã kiểm " + targets.length + " unit (" + targets.map((u) => u.id).join(", ") + "): " + errors.length + " lỗi, " + warns.length + " cảnh báo.");
process.exit(errors.length ? 1 : 0);
