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
/* Ngoại lệ có chủ đích, KHÔNG dùng chung giữa các unit (id câu qr1-01... lặp lại ở mọi unit Part 2), nên luôn có tiền tố unit:
 *   "<unit>/<id câu>|<đoạn tiếng Anh đã chuẩn hóa>"          luật đoạn liền nhau (lớp 1)
 *   "<unit>/<id câu>|*overlap*"                              lớp 2, cả câu
 *   "<unit>/<id câu>|*overlap*|<vị trí, ví dụ vocab[3].en>"  lớp 2, một chỗ (phải đúng từng ký tự)
 * Chỉ để thử nghiệm: biến môi trường CU_LEAK_ALLOW (cách nhau bằng ;) được cộng thêm, và bị BỎ QUA khi --release. */
const QR_LEAK_ALLOW = []; /* hiện không có ngoại lệ nào; ví dụ: "p2-02/qr1-05|as soon as" */
const QR_LEAK_ALLOW_TEST = (process.env.CU_LEAK_ALLOW || "").split(";").filter(Boolean);
const QR_LETTER_MIN = 0.2, QR_LETTER_MAX = 0.45;
const QR_STOP = new Set(("a an the and or but if so as of to in on at by for with from into onto up down out off over under about than then that this these those " +
  "i me my mine we us our you your he him his she her it its they them their is am are was were be been being do does did done have has had will would can could shall should may might must " +
  "not no yes ok okay please there here what which who whom whose when where why how too very just also still already again s t ll d re ve m").split(/\s+/));
/* từ chức năng cho luật "gần trùng": QR_STOP thêm giới từ/trạng từ mẫu câu thường gặp */
const QR_LEAK_STOP = new Set([...QR_STOP, "until", "next", "last", "across", "behind", "near", "before", "after", "during", "between", "through", "around", "inside", "outside", "any", "some", "more", "much", "many", "let", "say"]);
/* Lớp 2 của luật lộ đáp án: so khớp THEO TỪ NỘI DUNG, không cần liền nhau/đúng thứ tự (bắt câu thêm/bớt/đảo từ và câu đồng nghĩa).
 * Cho phép riêng lớp này: "<unit>/<id câu>|*overlap*" (cả câu) hoặc "<unit>/<id câu>|*overlap*|<vị trí, ví dụ vocab[3].en>" (một chỗ); xem QR_LEAK_ALLOW. */
const QR_OV_STOP = new Set("mr ms mrs dr miss sir think guess sorry thanks thank sure well really probably maybe actually yeah".split(/\s+/));
/* Từ đồng nghĩa CHẮC CHẮN trong ngữ cảnh công sở/TOEIC Part 2 (giữ ít và thận trọng; cố ý bỏ các từ nhiều nghĩa: leave, check, ring, get, pick (pick up), lower (lower floor), come). Mỗi dòng là một nhóm.
 * Cố ý bỏ call/phone và show/display (call a meeting, show là danh từ). */
const QR_SYNONYMS = [
  ["cut", "reduce", "decrease"], ["quit", "resign"], ["begin", "start", "commence"], ["finish", "complete", "conclude"],
  ["buy", "purchase"], ["help", "assist"], ["big", "large"], ["fix", "repair", "mend"],
  ["arrive", "reach"], ["delay", "postpone"], ["need", "require"], ["choose", "select"], ["fast", "quick", "rapid"],
  ["cheap", "inexpensive"], ["expensive", "costly", "pricey"], ["answer", "reply", "respond"], ["talk", "speak"], ["tell", "inform", "notify"],
  ["increase", "raise"], ["employee", "worker"], ["salary", "wage"], ["rent", "lease"], ["enough", "sufficient"],
  ["glad", "happy", "pleased"], ["ready", "prepared"], ["soon", "shortly"], ["incorrect", "wrong", "mistaken"]
];
const QR_IRREG = { went: "go", gone: "go", got: "get", gotten: "get", took: "take", taken: "take", bought: "buy", left: "leave", ran: "run", came: "come", saw: "see", seen: "see", made: "make", paid: "pay", sent: "send",
  gave: "give", given: "give", told: "tell", found: "find", held: "hold", met: "meet", wrote: "write", written: "write", began: "begin", begun: "begin", chose: "choose", chosen: "choose", spoke: "speak", spoken: "speak",
  thought: "think", brought: "bring", kept: "keep", lost: "lose", sold: "sell", built: "build", taught: "teach", wore: "wear", worn: "wear", drove: "drive", driven: "drive", flew: "fly", flown: "fly",
  ate: "eat", eaten: "eat", knew: "know", known: "know", understood: "understand", heard: "hear", led: "lead", shown: "show", news: "news", buses: "bus", gases: "gas", goes: "go", died: "die", dies: "die", dying: "die", tied: "tie", tying: "tie", lying: "lie", lied: "lie", sued: "sue", dyed: "dye", movies: "movie", menus: "menu", sat: "sit", won: "win",
  bigger: "big", biggest: "big", larger: "large", largest: "large", faster: "fast", fastest: "fast", quicker: "quick", quickest: "quick", cheaper: "cheap", cheapest: "cheap", happier: "happy", happiest: "happy", newer: "new", newest: "new" };
/* rút gọn nhẹ, dùng đồng nhất cho cả hai phía nên chỉ cần nhất quán: bất quy tắc; số nhiều (-ies, -ses/-xes/-ches/-shes, -s) TRƯỚC, rồi -ied/-ing/-ed (meetings -> meeting -> meet);
 * từ một âm tiết dạng phụ âm-nguyên âm-phụ âm khi bỏ -ing/-ed thì thêm lại e (hoping/hoped -> hope, filing -> file, used -> use) để không nhập với hop/fill;
 * phụ âm đôi gộp một (hopping -> hop, filling/fill -> fil, cancelled -> cancel); e cuối bị bỏ trừ khi là dạng một âm tiết như trên (hope, file, use); -eed (agreed) bỏ -d, trừ speed/need/indeed... */
const QR_EED = new Set("speed need indeed feed seed weed deed proceed exceed succeed breed bleed".split(" "));
const QR_SHORT_E = /^[^aeiou]*[aeiou][^aeiouwxy]e$/, QR_SHORT = /^[^aeiou]*[aeiou][^aeiouwxy]$/;
const qrStem = (t) => {
  if (QR_IRREG[t]) { t = QR_IRREG[t]; if (t === "news") return t; }
  if (t.length > 4 && /ies$/.test(t)) t = t.slice(0, -3) + "y";
  else if (t.length > 4 && /(ss|x|ch|sh)es$/.test(t)) t = t.slice(0, -2);
  else if (t.length > 3 && /s$/.test(t) && !/(ss|us|is)$/.test(t)) t = t.slice(0, -1);
  if (t.length > 4 && /ied$/.test(t)) t = t.slice(0, -3) + "y";
  else {
    let m = null;
    if (/eed$/.test(t)) { if (!QR_EED.has(t)) m = t.slice(0, -1); }
    else if (t.length > 4 && /ing$/.test(t)) m = t.slice(0, -3);
    else if (t.length > 3 && /ed$/.test(t)) m = t.slice(0, -2);
    if (m !== null) {
      if (m.length > 3 && /([b-df-hj-np-tv-z])\1$/.test(m)) m = m.slice(0, -1); /* không gộp phụ âm đôi của gốc <= 3 chữ (add, odd, egg) */
      else if (QR_SHORT.test(m)) m += "e";
      if (/[aeiouy]/.test(m)) t = m; /* kết quả không còn nguyên âm (str, sh, br) thì giữ nguyên từ gốc */
    }
  }
  if (t.length > 3 && /e$/.test(t) && !QR_SHORT_E.test(t)) t = t.slice(0, -1);
  if (t.length > 3 && /([b-df-hj-np-tv-z])\1$/.test(t)) t = t.slice(0, -1);
  return t;
};
const QR_SYN_MAP = (() => { const m = {}; QR_SYNONYMS.forEach((g) => { const c = qrStem(g[0]); g.forEach((x) => { m[qrStem(x)] = c; }); }); return m; })();
/* chuỗi -> [{c: dạng chuẩn, stop}] (đã bung viết tắt: he's -> he is, it'll -> it will, we're -> we are, n't -> not) */
const qrToks = (s) => String(s || "").toLowerCase().replace(/[’‘]/g, "'")
  .replace(/\bwon't\b/g, "will not").replace(/\bcan't\b/g, "can not").replace(/n't\b/g, " not").replace(/'re\b/g, " are").replace(/'ll\b/g, " will")
  .replace(/'ve\b/g, " have").replace(/'m\b/g, " am").replace(/'d\b/g, " would")
  .replace(/\b(he|she|it|that|there|here|what|who|where|how|let)'s\b/g, "$1 is").replace(/'s\b/g, "") /* sở hữu cách (cleaner's) chỉ bỏ 's, không thành "is" */
  .replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean)
  .map((t) => { if (QR_LEAK_STOP.has(t) || QR_OV_STOP.has(t)) return { c: t, stop: true, o: t }; const st = qrStem(t); return { c: QR_SYN_MAP[st] || st, stop: false, o: t }; });
const QR_OV_RAW = 0.6; /* phần từ khác nhau của câu qr (kể cả từ chức năng) phải xuất hiện trong cửa sổ */
const qrWords = (t) => String(t || "").toLowerCase().replace(/[’‘]/g, "'").split(/[^a-z0-9]+/).filter((w) => w && !QR_STOP.has(w));

/* Part 3/4 (type "conv"): hoi thoai/bai noi, moi doan 3 cau, 4 dap an A-D */
const CV_KINDS = ["main", "speaker", "detail", "problem", "request", "inference", "next", "intent", "graphic"];
const CV_TRAPS = ["heard-word", "wrong-speaker", "wrong-detail", "not-mentioned", "changed-plan", "over-inference", "literal", "graphic-only", "similar-sound"];
const CV_SET_KINDS = ["conversation", "talk"];
const CV_TALK_TYPES = ["announcement", "advertisement", "voicemail", "recorded-message", "tour", "meeting", "broadcast", "speech"];
const CV_LABELS = ["A", "B", "C", "D"];
const CV_ACCENTS = ["us", "gb", "au"];
const CV_MIN_SETS = 6; /* unit Part 3/4: it hon la CANH BAO */
const CV_LETTER_MIN = 0.15, CV_LETTER_MAX = 0.35;
const CV_WORDS_MIN = 60, CV_WORDS_MAX = 160, CV_MAX_LINE = 240, CV_MAX_SENT = 160;
const cvNorm = (t) => String(t || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const cvHas = (hay, needle) => !!needle && (" " + hay + " ").includes(" " + needle + " ");
const cvWordN = (t) => cvNorm(t).split(" ").filter(Boolean).length;
/* Canh bao "doan duoc" cho conv (KHONG leo thang khi --release). Ngoai le tung cau: "<unit>/<id cau>|<luat>" (luat: xq, intent-ctx, idiom, len, grow, sum), rieng luat len cap unit: "<unit>|len-unit".
 * Bien moi truong CU_LEAK_ALLOW (cach nhau bang ;) cung duoc cong them khi khong --release. */
const CV_WARN_ALLOW = [];
const CV_IDIOMS = ["tight", "hold up", "squeeze in", "relief", "fill up", "hate to", "moving target", "comfortable shoes"];
const CV_LEN_HI = 1.3, CV_LEN_LO = 0.7, CV_LEN_UNIT = 7 / 18;
const cvNum = (t, unit) => { const m = (unit ? /^\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:%|[a-z]{0,10})$/i : /^\$?\s*(\d[\d,]*(?:\.\d+)?)\s*%?$/).exec(String(t).trim()); return m ? Number(m[1].replace(/,/g, "")) : null; };
const cvCells = (g) => (isObj(g) ? (g.type === "list" ? (Array.isArray(g.items) ? g.items : []) : [].concat(...(Array.isArray(g.rows) ? g.rows : []).map((r) => (Array.isArray(r) ? r : [])))) : []).map(cvNorm);

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
  let fillN = 0, tfN = 0, qrN = 0, cvN = 0;
  const cvSets = [], cvQs = [];
  const rel = (m) => { if (RELEASE) e(m + " Không được phát hành (--release)."); else w(m); };
  const cvGraphic = (g, wg) => {
    if (!isObj(g)) { e(wg + ": graphic phải là đối tượng."); return; }
    if (!nonEmpty(g.title)) e(wg + ": thiếu title.");
    const strs = (a) => a.every((c) => nonEmpty(c));
    if (g.type === "table") {
      if (!Array.isArray(g.cols) || g.cols.length < 2 || !strs(g.cols)) { e(wg + ": table cần cols (mảng >= 2 chuỗi không rỗng)."); return; }
      if (!Array.isArray(g.rows) || g.rows.length < 2) { e(wg + ": table cần rows (mảng >= 2 hàng)."); return; }
      g.rows.forEach((r, i) => { if (!Array.isArray(r) || r.length !== g.cols.length || !strs(r)) e(wg + ".rows[" + i + "]: cần đúng " + g.cols.length + " ô, mỗi ô là chuỗi không rỗng."); });
    } else if (g.type === "list") {
      if (!Array.isArray(g.items) || g.items.length < 3 || !strs(g.items)) e(wg + ": list cần items (mảng >= 3 chuỗi không rỗng).");
    } else e(wg + ": type '" + g.type + "' không hợp lệ (table, list).");
  };
  const cvSet = (s, ws) => {
    if (!isObj(s)) { e(ws + ": không phải đối tượng."); return; }
    uniq(s.id, ws);
    cvSets.push(s);
    if (s.image !== undefined || s.audio !== undefined) e(ws + ": đoạn conv không dùng image hay audio.");
    const talk = s.kind === "talk";
    if (!CV_SET_KINDS.includes(s.kind)) e(ws + ": kind '" + s.kind + "' không hợp lệ (" + CV_SET_KINDS.join(", ") + ").");
    if (talk) { if (!CV_TALK_TYPES.includes(s.talk_type)) e(ws + ": bài nói cần talk_type thuộc (" + CV_TALK_TYPES.join(", ") + ")."); }
    else if (s.talk_type !== undefined) e(ws + ": talk_type chỉ dùng cho kind \"talk\".");
    const sp = Array.isArray(s.speakers) ? s.speakers : (e(ws + ": speakers phải là mảng."), []), ids = {};
    sp.forEach((x, k) => {
      const wk = ws + ".speakers[" + k + "]";
      if (!isObj(x) || !nonEmpty(x.id)) { e(wk + ": thiếu id."); return; }
      if (ids[x.id]) e(wk + ": id '" + x.id + "' bị trùng."); ids[x.id] = 1;
      if (x.gender !== "m" && x.gender !== "f") e(wk + ": gender phải là m hoặc f.");
      if (!CV_ACCENTS.includes(x.accent)) e(wk + ": accent phải thuộc (" + CV_ACCENTS.join(", ") + ").");
    });
    if (sp.length < 1 || sp.length > 3) e(ws + ": cần 1-3 người nói (hiện " + sp.length + ").");
    else if (s.kind === "conversation") {
      if (sp.length < 2) e(ws + ": hội thoại cần 2-3 người nói.");
      else if (new Set(sp.map((x) => x && x.gender)).size < 2 && new Set(sp.map((x) => x && x.accent)).size < 2) e(ws + ": hội thoại cần ít nhất 2 giới tính hoặc 2 giọng khác nhau (để nghe phân biệt được).");
    } else if (talk && sp.length !== 1) e(ws + ": bài nói cần đúng 1 người nói.");
    const lines = Array.isArray(s.lines) ? s.lines : (e(ws + ": lines phải là mảng."), []);
    if (lines.length < (talk ? 3 : 4)) e(ws + ": cần ít nhất " + (talk ? 3 : 4) + " dòng lời thoại (hiện " + lines.length + ").");
    const used = {}; let words = 0, okLines = true;
    lines.forEach((ln, k) => {
      const wl = ws + ".lines[" + k + "]";
      if (!isObj(ln)) { e(wl + ": không phải đối tượng."); okLines = false; return; }
      if (!ids[ln.s]) e(wl + ": s '" + ln.s + "' không có trong speakers."); else used[ln.s] = 1;
      if (!nonEmpty(ln.en) || !nonEmpty(ln.vi)) { e(wl + ": thiếu en hoặc vi."); okLines = false; return; }
      if (ln.en.length > CV_MAX_LINE) e(wl + ": en dài " + ln.en.length + " ký tự, tối đa " + CV_MAX_LINE + ".");
      words += cvWordN(ln.en);
      ln.en.split(/(?<=[.!?])\s+/).forEach((t) => { if (t.length > CV_MAX_SENT) w(wl + ": có câu dài " + t.length + " ký tự (> " + CV_MAX_SENT + "), nên tách ngắn hơn."); });
    });
    Object.keys(ids).forEach((k) => { if (!used[k]) e(ws + ": người nói '" + k + "' không có dòng nào."); });
    if (okLines && lines.length && (words < CV_WORDS_MIN || words > CV_WORDS_MAX)) w(ws + ": lời thoại " + words + " từ, nên nằm trong " + CV_WORDS_MIN + "-" + CV_WORDS_MAX + ".");
    const lnN = lines.map((ln) => (isObj(ln) ? cvNorm(ln.en) : ""));
    if (s.graphic !== undefined) cvGraphic(s.graphic, ws + ".graphic");
    const qs = Array.isArray(s.questions) ? s.questions : (e(ws + ": questions phải là mảng."), []);
    if (qs.length !== 3) e(ws + ": cần đúng 3 câu hỏi (hiện " + qs.length + ").");
    const seenQ = {}, letters = []; let gq = 0;
    qs.forEach((q, k) => {
      const wq = ws + ".questions[" + k + "]" + (q && q.id ? " '" + q.id + "'" : "");
      uniq(q && q.id, wq);
      if (!isObj(q)) return;
      cvN++; cvQs.push(q);
      if (q.image !== undefined || q.audio !== undefined) e(wq + ": câu conv không dùng image hay audio.");
      if (!CV_KINDS.includes(q.kind)) e(wq + ": kind '" + q.kind + "' không hợp lệ (" + CV_KINDS.join(", ") + ").");
      if (!isObj(q.q) || !nonEmpty(q.q.en) || !nonEmpty(q.q.vi)) e(wq + ": q cần en và vi không rỗng.");
      else { const kq = cvNorm(q.q.en); if (seenQ[kq]) e(wq + ": câu hỏi \"" + q.q.en + "\" bị trùng trong đoạn."); seenQ[kq] = 1; }
      if (!nonEmpty(q.explain_vi)) e(wq + ": thiếu explain_vi.");
      if (!Array.isArray(q.evidence) || !q.evidence.length || q.evidence.some((x) => !Number.isInteger(x) || x < 0 || x >= lines.length)) e(wq + ": evidence phải là mảng không rỗng các chỉ số dòng hợp lệ (0-" + Math.max(0, lines.length - 1) + ").");
      if (q.kind === "intent") {
        if (!nonEmpty(q.quote)) e(wq + ": câu intent cần quote (đúng lời trong hội thoại).");
        else {
          if (!lnN.some((t) => cvHas(t, cvNorm(q.quote)))) e(wq + ": quote \"" + q.quote + "\" không có nguyên văn trong dòng lời thoại nào.");
          if (isObj(q.q) && !cvHas(cvNorm(q.q.en), cvNorm(q.quote))) w(wq + ": câu hỏi intent nên chứa quote trong q.en (dạng Why does the man say, \"...\"?).");
        }
      }
      if (q.uses_graphic !== undefined && q.uses_graphic !== true) e(wq + ": uses_graphic chỉ nhận true.");
      if ((q.kind === "graphic") !== (q.uses_graphic === true)) e(wq + ": kind \"graphic\" và uses_graphic: true phải đi cùng nhau (hiện kind '" + q.kind + "', uses_graphic " + q.uses_graphic + ").");
      if (q.uses_graphic !== true && isObj(q.q) && /^Look at the graphic/.test(String(q.q.en || ""))) e(wq + ": câu hỏi mở đầu \"Look at the graphic\" thì phải đặt uses_graphic: true.");
      if (q.uses_graphic === true) {
        gq++;
        if (!isObj(s.graphic)) e(wq + ": uses_graphic cần graphic của đoạn.");
        if (!isObj(q.q) || !/^Look at the graphic/.test(String(q.q.en || ""))) e(wq + ": câu dùng hình phải bắt đầu bằng \"Look at the graphic\".");
      }
      const os = Array.isArray(q.options) ? q.options : [];
      if (os.length !== 4 || os.some((o, j) => !isObj(o) || o.label !== CV_LABELS[j])) { e(wq + ": cần đúng 4 đáp án có label A, B, C, D theo thứ tự."); return; }
      if (!CV_LABELS.includes(q.answer)) { e(wq + ": answer '" + q.answer + "' phải là A, B, C hoặc D."); return; }
      letters.push(q.answer);
      const seenO = {};
      os.forEach((o, j) => {
        const wo = wq + ".options[" + CV_LABELS[j] + "]";
        if (!nonEmpty(o.en) || !nonEmpty(o.vi)) e(wo + ": thiếu en hoặc vi.");
        else { const ko = cvNorm(o.en); if (seenO[ko]) e(wo + ": nội dung trùng với đáp án " + seenO[ko] + "."); else seenO[ko] = o.label; }
        if (o.label === q.answer) {
          if (o.trap !== undefined) e(wo + ": đáp án đúng không được có trap.");
          if (o.why_vi !== undefined) e(wo + ": đáp án đúng không được có why_vi.");
        } else {
          if (!CV_TRAPS.includes(o.trap)) e(wo + ": đáp án sai cần trap thuộc (" + CV_TRAPS.join(", ") + ").");
          if (!nonEmpty(o.why_vi)) e(wo + ": đáp án sai thiếu why_vi (giải thích tiếng Việt vì sao sai).");
        }
      });
      const right = os.find((o) => o.label === q.answer), kr = nonEmpty(right.en) ? cvNorm(right.en) : "";
      if (kr && kr.split(" ").length >= 4 && lnN.some((t) => cvHas(t, kr))) rel(wq + ": đáp án đúng \"" + right.en + "\" chép nguyên văn (>= 4 từ) từ lời thoại; nên diễn đạt lại.");
      if (kr && q.uses_graphic === true && isObj(s.graphic)) {
        if (lnN.some((t) => cvHas(t, kr))) rel(wq + ": câu dùng hình mà đáp án đúng \"" + right.en + "\" cũng xuất hiện trong lời thoại (người học không cần nhìn hình).");
        if (!cvCells(s.graphic).includes(kr)) rel(wq + ": câu dùng hình mà đáp án đúng \"" + right.en + "\" không phải một ô/mục của hình.");
      }
    });
    if (s.graphic !== undefined && qs.length && !gq) e(ws + ": có graphic nhưng không câu nào đặt uses_graphic: true.");
    if (letters.length === 3 && letters.every((x) => x === letters[0])) w(ws + ": cả 3 câu cùng đáp án " + letters[0] + ".");
    if (RELEASE) { /* mọi `v` unverified trong đoạn: đoạn, câu, đáp án */
      let n = 0;
      (function walk(x) {
        if (!x || typeof x !== "object") return;
        if (Array.isArray(x)) { x.forEach(walk); return; }
        if (x.v && typeof x.v === "object" && x.v.status === "unverified") n++;
        Object.keys(x).forEach((k) => { if (k !== "v") walk(x[k]); });
      })(s);
      if (s.v && s.v.status === "unverified") n = Math.max(n, 1);
      if (n) e(ws + ": còn " + n + " mục 'unverified' (đoạn, câu hoặc đáp án), không được phát hành (--release).");
    }
  };
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
    } else if (ex.type === "conv") {
      if (ex.image !== undefined || ex.audio !== undefined) e(wh + ": bài conv không dùng image hay audio (Part 3/4 chỉ nghe và đọc chữ).");
      if (RELEASE && ex.v && ex.v.status === "unverified") e(wh + ": còn 'unverified', không được phát hành (--release).");
      const ss = arr(ex.sets, wh + ".sets");
      if (!ss.length) e(wh + ": sets không được rỗng.");
      ss.forEach((x, j) => cvSet(x, wh + ".sets[" + j + "]" + (x && x.id ? " '" + x.id + "'" : "")));
    } else e(wh + ": type '" + ex.type + "' không hợp lệ (fill, tf, mc, qr, conv).");
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
  const isP34 = /^p[34]-/.test(id); /* unit Part 3/4 (chỉ nghe, không ảnh) chỉ được bỏ mức tối thiểu của câu đúng/sai */
  if (!(qrN && isP2)) { cnt(sentences.length, MIN.sentences, "câu luyện tập"); if (!(cvN && isP34)) cnt(tfN, MIN.tfItems, "câu đúng/sai"); }
  if (cvN) {
    /* canh bao doan duoc (xq, intent-ctx, idiom, len, grow, sum): chi CANH BAO, khong leo thang khi --release */
    const cvAllow = (k) => CV_WARN_ALLOW.includes(k) || (!RELEASE && QR_LEAK_ALLOW_TEST.includes(k));
    const cw = (qid, rule, msg) => { if (!cvAllow(id + "/" + qid + "|" + rule)) w(qid + ": [" + rule + "] " + msg); };
    const T = (t) => new Set(cvNorm(t).split(" ").filter((x) => x.length > 1 && !QR_LEAK_STOP.has(x)).map(qrStem));
    const ok4 = (q) => isObj(q) && Array.isArray(q.options) && q.options.length === 4 && q.options.every((o) => isObj(o) && nonEmpty(o.en)) && CV_LABELS.includes(q.answer);
    let longest = 0, nq = 0;
    const growRows = {};
    cvSets.forEach((s) => {
      if (!isObj(s) || !Array.isArray(s.questions)) return;
      const lnN = (Array.isArray(s.lines) ? s.lines : []).map((ln) => (isObj(ln) ? cvNorm(ln.en) : ""));
      s.questions.forEach((q) => {
        if (!isObj(q) || q.kind !== "intent" || !nonEmpty(q.quote)) return;
        const kq = cvNorm(q.quote), at = lnN.map((t, i) => (cvHas(t, kq) ? i : -1)).filter((i) => i >= 0);
        if (Array.isArray(q.evidence) && q.evidence.length && at.length && q.evidence.every((i) => at.includes(i))) cw(q.id, "intent-ctx", "câu intent: evidence chỉ có dòng chứa quote; cần thêm dòng ngữ cảnh (dòng trước/sau) để suy ra ý.");
        const idm = CV_IDIOMS.find((p) => cvHas(kq, p));
        if (idm) cw(q.id, "idiom", "quote chứa thành ngữ/cụm khó \"" + idm + "\"; người học dễ hiểu sai theo nghĩa đen hoặc đoán được nhờ từ này.");
      });
      const gTok = new Set();
      if (isObj(s.graphic)) [s.graphic.title].concat(Array.isArray(s.graphic.cols) ? s.graphic.cols : []).forEach((t) => T(t).forEach((x) => gTok.add(x)));
      const qs = s.questions.filter(ok4);
      qs.forEach((q) => {
        const key = q.options.find((o) => o.label === q.answer), dis = q.options.filter((o) => o !== key);
        const dT = new Set(); dis.forEach((o) => T(o.en).forEach((x) => dT.add(x)));
        const D = [...T(key.en)].filter((x) => !dT.has(x));
        if (D.length) { /* xq: từ chỉ có ở đáp án đúng mà lại xuất hiện ở chỗ khác trong đoạn */
          const hit = (S) => D.filter((x) => S.has(x)), why = [];
          const g = hit(gTok); if (g.length) why.push("tiêu đề/cột của hình (" + g.join(", ") + ")");
          qs.forEach((o) => {
            if (o === q) return;
            const a = hit(T(isObj(o.q) ? o.q.en : "")); if (a.length) why.push("đề của " + o.id + " (" + a.join(", ") + ")");
            const b = hit(T(o.options.find((x) => x.label === o.answer).en)); if (b.length) why.push("đáp án đúng của " + o.id + " (" + b.join(", ") + ")");
            const n2 = o.options.filter((x) => hit(T(x.en)).length).length; if (n2 >= 2) why.push(n2 + " đáp án của " + o.id);
          });
          if (why.length) cw(q.id, "xq", "từ chỉ có ở đáp án đúng (" + D.join(", ") + ") lại xuất hiện ở: " + why.join("; ") + "; có thể đoán đáp án mà không cần nghe.");
        }
        const mean = dis.reduce((a, o) => a + o.en.length, 0) / 3, r = key.en.length / mean;
        if (r > CV_LEN_HI || r < CV_LEN_LO) cw(q.id, "len", "đáp án đúng dài " + key.en.length + " ký tự, " + (r > 1 ? "dài" : "ngắn") + " hơn hẳn trung bình " + Math.round(mean) + " của ba đáp án sai (tỉ lệ " + r.toFixed(2) + ").");
        nq++; if (dis.every((o) => key.en.length > o.en.length)) longest++;
        const v = q.options.map((o) => cvNum(o.en, true));
        if (v.every((x) => x !== null)) {
          let done = false; /* hiệu a - b = c cũng là a = b + c nên chỉ cần kiểm tổng */
          for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = j + 1; k < 4; k++) {
            if (!done && i !== j && i !== k && v[i] === v[j] + v[k]) { done = true; cw(q.id, "sum", "đáp án " + q.options[i].label + " (" + q.options[i].en + ") bằng tổng của " + q.options[j].label + " và " + q.options[k].label + " (hoặc hiệu của hai đáp án khác); dễ đoán ra đáp án."); }
          }
        }
        const g2 = s.graphic;
        if (q.uses_graphic === true && isObj(g2) && g2.type === "table" && Array.isArray(g2.rows) && g2.rows.every((r2) => Array.isArray(r2))) {
          const row = g2.rows.findIndex((r2) => r2.some((c) => cvNorm(c) === cvNorm(key.en)));
          if (row >= 0) {
            (growRows[row] = growRows[row] || []).push(q.id);
            if (growRows[row].length > 1) cw(q.id, "grow", "đáp án đúng của câu hình nằm cùng hàng " + (row + 1) + " với câu hình " + growRows[row][0] + " (đáp án luôn ở cùng một hàng).");
            (g2.cols || []).forEach((cn, j) => {
              const nums = g2.rows.map((r2) => cvNum(r2[j], false));
              if (nums.some((x) => x === null) || nums.length < 3) return;
              const mx = Math.max(...nums), mn = Math.min(...nums);
              if ((nums[row] === mx && nums.filter((x) => x === mx).length === 1) || (nums[row] === mn && nums.filter((x) => x === mn).length === 1)) cw(q.id, "grow", "hàng đáp án đúng giữ giá trị " + (nums[row] === mx ? "lớn nhất" : "nhỏ nhất") + " duy nhất của cột \"" + cn + "\" (đoán được mà không cần nghe).");
            });
          }
        }
      });
    });
    if (nq >= 6 && longest > Math.floor(nq * CV_LEN_UNIT) && !cvAllow(id + "|len-unit")) w("[len-unit] đáp án đúng là đáp án dài nhất ở " + longest + "/" + nq + " câu conv (quá nhiều: người học đoán theo độ dài).");
    if (isP34) {
      if (cvSets.length < CV_MIN_SETS) w("ít hơn mức tối thiểu: đoạn nghe (conv) " + cvSets.length + " < " + CV_MIN_SETS + ".");
      if (!cvSets.some((x) => isObj(x) && x.graphic !== undefined)) w("ít hơn mức tối thiểu: chưa có đoạn nào có hình (graphic).");
    }
    const byLc = {}, okQ = cvQs.filter((q) => CV_LABELS.includes(q.answer));
    okQ.forEach((q) => { byLc[q.answer] = (byLc[q.answer] || 0) + 1; });
    if (okQ.length) CV_LABELS.forEach((L) => {
      const r = (byLc[L] || 0) / okQ.length;
      if (r < CV_LETTER_MIN || r > CV_LETTER_MAX) w("đáp án " + L + " chiếm " + Math.round(r * 100) + "% (" + (byLc[L] || 0) + "/" + okQ.length + ") các câu conv; nên nằm trong " + CV_LETTER_MIN * 100 + "-" + CV_LETTER_MAX * 100 + "%.");
    });
  }
  /* Không để lộ lời thoại/đáp án: câu hỏi và đáp án ĐÚNG của qr không được xuất hiện ở BẤT KỲ chuỗi nào ngoài bài qr: bài học (text_vi, ví dụ), intro_vi,
   * từ vựng, cụm từ, luyện nghe, tiêu đề, hướng dẫn, bài điền (kể cả câu ghép lại). Đáp án sai (bẫy) thì được phép.
   * So sánh sau khi chuẩn hóa (chữ thường, bỏ dấu câu); với chuỗi tiếng Việt xen tiếng Anh thì tách các đoạn tiếng Anh (cắt ở chữ có dấu và . , ; : ! ? ( )), giữ đoạn >= 3 từ.
   * LỖI: trùng khớp một chuỗi/đoạn; hoặc cả câu (>= 12 ký tự) nằm trong một chuỗi/đoạn; hoặc một đoạn tiếng Anh >= 4 từ và >= 12 ký tự nằm trong câu qr.
   * Đoạn liền nhau dài nhất giữa một đoạn tiếng Anh và câu qr (không cần cả đoạn nằm trong câu qr) dài >= 3 từ, chiếm >= 50% số từ của câu qr và có >= 2 từ không thuộc QR_LEAK_STOP: CẢNH BÁO (LỖI khi --release, trừ khi có trong QR_LEAK_ALLOW). */
  if (qrN || cvN) {
    const nz = (t) => String(t || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
    const pool = []; /* { k, where, run } */
    const addStr = (s, where) => {
      if (typeof s !== "string" || !s.trim()) return;
      const k = nz(s);
      const asc = !/[^\x00-\x7F]/.test(s);
      if (k) pool.push({ k, where, run: false, asc });
      /* cắt ở dấu câu (. , ; : ! ? ( )), rồi ở mọi từ có chữ không phải ASCII (từ tiếng Việt có dấu); giữ đoạn >= 3 từ */
      s.split(/[.,;:!?()"“”]+/).forEach((seg) => {
        let cur = [], ln = false; /* ln/rn: rìa đoạn giáp từ tiếng Việt, nơi có thể dính từ tiếng Việt không dấu (trong, nghe...) */
        const flush = (rn) => { const r = nz(cur.join(" ")); if (r && r.split(" ").length >= 3) pool.push({ k: r, where, run: true, ln, rn, asc }); cur = []; ln = rn; };
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
        if (k === "exercises" && Array.isArray(x[k])) { x[k].forEach((ex, i) => { if (!(isObj(ex) && (ex.type === "qr" || ex.type === "conv"))) walk(ex, where + "exercises[" + i + "]"); }); return; }
        walk(x[k], where ? where + "." + k : k);
      });
    })(u, "");
    const padK = (k) => " " + k + " ";
    const place = (p) => p.where;
    /* lớp 2: trùng THEO TỪ NỘI DUNG (không cần liền nhau/đúng thứ tự; đồng nghĩa quy về một dạng) trong cửa sổ (số từ câu qr + 3) của MỘT chuỗi.
     * Câu qr có >= 3 từ nội dung: cần >= n-1 từ khi n = 3-4, >= 75% khi n >= 5, và > QR_OV_RAW (60%, nghĩa là floor(n*0.6)+1) mọi từ khác nhau của câu (kể cả từ chức năng). Có đúng 2 từ nội dung: cần cả 2 và cũng > QR_OV_RAW mọi từ của câu (câu >= 4 từ).
     * Chuỗi được so phải có >= 4 từ (từ vựng/cụm 1-3 từ không bị tính). Chuỗi thuần Anh so cả chuỗi; chuỗi có chữ Việt chỉ so các đoạn tiếng Anh. */
    const ovPool = pool.filter((p) => (p.run ? !p.asc : p.asc)).map((p) => ({ p, t: qrToks(p.k) })).filter((x) => x.t.length >= 4);
    const okAllow = (key) => QR_LEAK_ALLOW.includes(key) || (!RELEASE && QR_LEAK_ALLOW_TEST.includes(key));
    const overlap = (txt, what, itemId) => {
      const tt = qrToks(txt);
      const C = [...new Set(tt.filter((x) => !x.stop && x.c.length > 1).map((x) => x.c))];
      const nC = C.length, raw = tt.length;
      let need;
      if (nC >= 3) need = nC <= 4 ? nC - 1 : Math.ceil(nC * 0.75);
      else if (nC === 2 && raw >= 4) need = 2;
      else return;
      const T = new Set(tt.map((x) => x.c)), W = raw + 3, CS = new Set(C);
      const rawNeed = Math.floor(T.size * QR_OV_RAW) + 1; /* LỚN HƠN 60% */ /* cả từ chức năng cũng phải khớp phần lớn, để một cụm danh từ 2 từ (help desk) không đủ */
      const orig = {}; tt.forEach((x) => { if (CS.has(x.c) && !orig[x.c]) orig[x.c] = x.o; });
      const uk = id + "/" + itemId;
      if (okAllow(uk + "|*overlap*")) return;
      for (const { p, t } of ovPool) {
        if (okAllow(uk + "|*overlap*|" + place(p))) continue;
        for (let i = 0; i <= Math.max(0, t.length - W); i++) {
          const mc = new Set(), mr = new Set(); let lo = -1, hi = -1;
          for (let j = i; j < Math.min(t.length, i + W); j++) { if (CS.has(t[j].c)) { mc.add(t[j].c); if (lo < 0) lo = j; hi = j; } if (T.has(t[j].c)) mr.add(t[j].c); }
          if (mc.size >= need && mr.size >= rawNeed) {
            const m = itemId + ": " + what + " \"" + txt + "\" gần trùng về nội dung (cùng từ khóa, có thể thêm/bớt/đảo từ hoặc dùng từ đồng nghĩa) với \"" + t.slice(lo, hi + 1).map((x) => x.o).join(" ") + "\" ở " + place(p) + " (khớp " + mc.size + "/" + nC + " từ nội dung của câu qr: " + [...mc].map((c) => orig[c]).join(", ") + "); nên viết lại.";
            if (RELEASE) e(m + " Không được phát hành (--release)."); else w(m);
            return;
          }
        }
      }
    };
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
        if (okAllow(id + "/" + itemId + "|" + c.text)) return false;
        g = p; gt = c.text; return true;
      });
      if (!g) { overlap(txt, what, itemId); return; }
      {
        const m = itemId + ": " + what + " \"" + txt + "\" gần trùng với đoạn tiếng Anh \"" + gt + "\" ở " + place(g) + " (chiếm từ 50% số từ); nên viết lại.";
        if (RELEASE) e(m + " Không được phát hành (--release)."); else w(m);
      }
    };
    qrItems.forEach((it) => {
      if (isObj(it.q)) hit(it.q.en, "câu hỏi", it.id);
      const right = Array.isArray(it.options) ? it.options.find((o) => isObj(o) && o.label === it.answer) : null;
      if (right) hit(right.en, "đáp án đúng", it.id);
    });
    /* conv: câu lời thoại (>= 5 từ, >= 2 từ ngoài QR_LEAK_STOP) và đáp án đúng (>= 4 từ); câu đệm ngắn và đáp án cụm danh từ ngắn cố ý không được bảo vệ */
    cvSets.forEach((s) => {
      if (!isObj(s) || !Array.isArray(s.lines)) return;
      s.lines.forEach((ln) => {
        if (!isObj(ln) || typeof ln.en !== "string") return;
        ln.en.split(/(?<=[.!?])\s+/).forEach((t) => {
          const ws = nz(t).split(" ").filter(Boolean);
          if (ws.length >= 5 && ws.filter((x) => !QR_LEAK_STOP.has(x)).length >= 2) hit(t, "lời thoại", s.id);
        });
      });
    });
    cvQs.forEach((q) => {
      const right = Array.isArray(q.options) ? q.options.find((o) => isObj(o) && o.label === q.answer) : null;
      if (right && typeof right.en === "string" && nz(right.en).split(" ").filter(Boolean).length >= 4) hit(right.en, "đáp án đúng", q.id);
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
