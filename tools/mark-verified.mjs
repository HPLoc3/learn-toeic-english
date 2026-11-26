// mark-verified.mjs - bo cac thuoc tinh "v": {"status": "unverified", ...} khoi data/<id>.js SAU KHI unit da qua kiem duyet. Cong cu dev.
// Chay: node tools/mark-verified.mjs --unit <id> [--root <thu muc>]
// Chi cat dung thuoc tinh do trong van ban (giu nguyen dinh dang, chu thich, kieu xuong dong); thuoc tinh v voi status khac duoc giu lai.
// Truoc khi ghi, cong cu nap lai tep moi va so voi du lieu cu da bo cac v unverified: khac nhau thi KHONG ghi (ma 1).
// Thoat: 0 = xong (ke ca khong co gi de bo); 1 = khong the sua an toan; 2 = sai tham so/tep.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/* tach ma nguon thanh token: chuoi, chu thich, tu, dau; khoang trang bo qua */
function tokens(src) {
  const out = [], re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\[\s\S])*"|'(?:[^'\\\n]|\\[\s\S])*'|`(?:[^`\\]|\\[\s\S])*`)|([A-Za-z_$0-9]+)|(\s+)|([\s\S])/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] !== undefined || m[4] !== undefined) continue;
    out.push({ t: m[0], at: m.index, end: m.index + m[0].length });
  }
  return out;
}

const isUnv = (v) => !!v && typeof v === "object" && !Array.isArray(v) && v.status === "unverified";

/* cac khoang [from, to) can cat */
function cuts(src) {
  const tk = tokens(src), out = [];
  for (let i = 1; i < tk.length - 2; i++) {
    if (!["v", '"v"', "'v'"].includes(tk[i].t) || !["{", ","].includes(tk[i - 1].t) || tk[i + 1].t !== ":" || tk[i + 2].t !== "{") continue;
    let depth = 0, j = i + 2;
    for (; j < tk.length; j++) {
      if (tk[j].t === "{") depth++;
      else if (tk[j].t === "}" && --depth === 0) break;
    }
    if (j >= tk.length) continue;
    let val;
    try { val = vm.runInNewContext("(" + src.slice(tk[i + 2].at, tk[j].end) + ")", {}, { timeout: 1000 }); } catch { continue; }
    if (!isUnv(val)) continue;
    const prev = tk[i - 1], next = tk[j + 1];
    let from = tk[i].at, to = tk[j].end;
    if (next && next.t === ",") { /* "v": {...}, -> bo ca dau phay sau va khoang trang tren cung dong */
      to = next.end;
      while (src[to] === " " || src[to] === "\t") to++;
    } else if (prev.t === ",") from = prev.at; /* thuoc tinh cuoi: bo dau phay truoc */
    out.push([from, to]);
    i = j;
  }
  return out;
}

export function stripUnverified(src) {
  const list = cuts(src);
  let out = src;
  for (let k = list.length - 1; k >= 0; k--) {
    let [from, to] = list[k];
    const lineStart = out.lastIndexOf("\n", from - 1) + 1;
    const nl = /^[ \t]*(\r?\n)/.exec(out.slice(to));
    if (nl && /^[ \t]*$/.test(out.slice(lineStart, from))) { from = lineStart; to += nl[0].length; } /* thuoc tinh dung mot minh tren dong: bo ca dong */
    out = out.slice(0, from) + out.slice(to);
  }
  return { text: out, removed: list.length };
}

function load(code, id) {
  const w = {}; w.window = w;
  vm.runInNewContext(code, w, { timeout: 5000 });
  const u = w.BS_UNITS && w.BS_UNITS[id];
  if (!u || typeof u !== "object") throw new Error("khong dat window.BS_UNITS." + id);
  return JSON.parse(JSON.stringify(u));
}
export function countUnverified(x) {
  if (!x || typeof x !== "object") return 0;
  if (Array.isArray(x)) return x.reduce((n, y) => n + countUnverified(y), 0);
  return Object.keys(x).reduce((n, k) => n + (k === "v" && isUnv(x[k]) ? 1 : countUnverified(x[k])), 0);
}
const without = (x) => {
  if (Array.isArray(x)) return x.map(without);
  if (!x || typeof x !== "object") return x;
  const o = {};
  Object.keys(x).forEach((k) => { if (!(k === "v" && isUnv(x[k]))) o[k] = without(x[k]); });
  return o;
};

function die(msg, code = 2) { console.error(msg); process.exit(code); }

function main() {
  const argv = process.argv.slice(2);
  let id = null, root = path.resolve(here, "..");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--unit") id = argv[++i];
    else if (argv[i] === "--root") root = path.resolve(argv[++i] || ".");
    else die("Tham so khong hop le: " + argv[i]);
  }
  if (!id || !/^[a-z0-9-]+$/.test(id)) die("Can --unit <id> (chu thuong, so, dau gach ngang).");
  const file = path.join(root, "data", id + ".js");
  let src, before;
  try { src = fs.readFileSync(file, "utf8"); before = load(src, id); } catch (e) { die(file + ": " + e.message); }
  const n = countUnverified(before);
  const r = stripUnverified(src);
  let after;
  try { after = load(r.text, id); } catch (e) { die("Khong sua duoc an toan (tep sau khi cat bi loi: " + e.message + "); khong ghi.", 1); }
  if (countUnverified(after) !== 0) die("Con " + countUnverified(after) + " muc unverified khong cat duoc (vd dung bien hoac ham de gan v); khong ghi.", 1);
  if (JSON.stringify(after) !== JSON.stringify(without(before))) die("Du lieu sau khi cat khac du lieu cu ngoai cac muc unverified; khong ghi.", 1);
  if (r.removed) fs.writeFileSync(file, r.text);
  console.log("mark-verified " + id + ": da bo " + r.removed + " thuoc tinh v unverified trong data/" + id + ".js" + (n !== r.removed ? " (du lieu co " + n + " muc; mot thuoc tinh co the dung cho nhieu muc)" : "") + ".");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
