// check-sw.mjs - kiểm tra service worker + manifest trước khi deploy.
// Chạy: node tools/check-sw.mjs          (exit 1 nếu có lỗi)
//       node tools/check-sw.mjs --write   (cập nhật dòng "// content-hash:" trong sw.js; KHÔNG tự đổi VERSION)
// Kiểm: (1) PRECACHE khớp file thật trên đĩa, (2) hash nội dung file precache khớp dòng trong sw.js,
//       (3) manifest.webmanifest hợp lệ, icon tồn tại và đúng kích thước (đọc header PNG).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WRITE = process.argv.includes("--write");
const errors = [];
const fail = (m) => errors.push(m);
const read = (rel) => readFileSync(join(ROOT, rel));

function walk(dir) {
  const out = [];
  if (!existsSync(join(ROOT, dir))) return out;
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = posix.join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

const swText = read("sw.js").toString("utf8");

// --- PRECACHE trong sw.js ---
const m = swText.match(/var PRECACHE = \[([\s\S]*?)\];/);
if (!m) { console.error("Không thấy PRECACHE trong sw.js"); process.exit(1); }
const listed = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
if (new Set(listed).size !== listed.length) fail("PRECACHE có mục trùng.");

// --- Tập file mong đợi ---
const catalog = read("data/catalog.js").toString("utf8");
const animFiles = new Set([...catalog.matchAll(/"anim"\s*:\s*"([^"]+)"/g)].map((x) => x[1]));
const expected = new Set([
  "index.html", "unit.html", "review.html", "404.html", "manifest.webmanifest", "favicon.ico", "data/catalog.js",
  ...walk("assets/css"), ...walk("assets/icons"),
  ...walk("assets/js").filter((f) => !animFiles.has(f)), // file hoạt hình riêng của từng unit: lưu khi người học mở unit
]);
for (const f of expected) if (!listed.includes(f)) fail(`Thiếu trong PRECACHE: ${f}`);
for (const f of listed) {
  if (!existsSync(join(ROOT, f))) fail(`PRECACHE trỏ file không tồn tại: ${f}`);
  else if (!expected.has(f)) fail(`PRECACHE thừa (không thuộc shell): ${f}`);
}

// --- Hash nội dung ---
const norm = (rel, buf) => (/\.(html|css|js|svg|webmanifest)$/.test(rel) ? Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n")) : buf);
const h = createHash("sha256");
for (const rel of [...listed].sort()) {
  if (!existsSync(join(ROOT, rel))) continue;
  h.update(rel + "\0");
  h.update(norm(rel, read(rel)));
  h.update("\0");
}
const hash = h.digest("hex").slice(0, 16);
const hm = swText.match(/^\/\/ content-hash: ([0-9a-f]+)$/m);
if (!hm) fail('Thiếu dòng "// content-hash: ..." trong sw.js.');
const vm = swText.match(/var VERSION = "([^"]+)"/);
if (!vm) fail("Thiếu VERSION trong sw.js.");

if (WRITE && hm && hm[1] !== hash) {
  writeFileSync(join(ROOT, "sw.js"), swText.replace(/^\/\/ content-hash: [0-9a-f]+$/m, `// content-hash: ${hash}`));
  console.log(`Đã cập nhật content-hash: ${hm[1]} -> ${hash} (VERSION hiện là "${vm ? vm[1] : "?"}"; nhớ đã tăng VERSION).`);
} else if (hm && hm[1] !== hash) {
  fail(`Nội dung file precache đã đổi (hash ${hash}, sw.js ghi ${hm[1]}): cần đổi VERSION và cập nhật hash (node tools/check-sw.mjs --write).`);
}

// --- Manifest ---
function pngSize(rel) {
  const b = read(rel);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString("ascii", 12, 16) !== "IHDR") return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
try {
  const mf = JSON.parse(read("manifest.webmanifest").toString("utf8"));
  for (const k of ["name", "short_name", "start_url", "scope", "display", "theme_color", "background_color", "icons"]) {
    if (!mf[k]) fail(`manifest thiếu "${k}"`);
  }
  if (mf.display !== "standalone") fail('manifest.display phải là "standalone"');
  const icons = Array.isArray(mf.icons) ? mf.icons : [];
  let has192 = false, has512 = false, hasMask = false;
  for (const ic of icons) {
    if (!ic.src || !existsSync(join(ROOT, ic.src))) { fail(`icon không tồn tại: ${ic.src}`); continue; }
    if (/\.png$/.test(ic.src)) {
      const s = pngSize(ic.src);
      const want = String(ic.sizes || "").split("x").map(Number);
      if (!s) fail(`không đọc được header PNG: ${ic.src}`);
      else if (s[0] !== want[0] || s[1] !== want[1]) fail(`kích thước PNG ${ic.src} là ${s.join("x")}, manifest ghi ${ic.sizes}`);
      if (s && s[0] === 192) has192 = true;
      if (s && s[0] === 512) has512 = true;
      if (/maskable/.test(ic.purpose || "")) hasMask = true;
    }
  }
  if (!has192 || !has512) fail("manifest cần icon PNG 192 và 512");
  if (!hasMask) fail("manifest cần icon maskable");
} catch (e) {
  fail("manifest.webmanifest không hợp lệ: " + e.message);
}
const apple = existsSync(join(ROOT, "assets/icons/apple-touch-icon.png")) ? pngSize("assets/icons/apple-touch-icon.png") : null;
if (!apple || apple[0] !== 180 || apple[1] !== 180) fail("apple-touch-icon.png phải là PNG 180x180");

if (errors.length) {
  console.error("check-sw: LỖI\n - " + errors.join("\n - "));
  process.exit(1);
}
console.log(`check-sw: đạt (${listed.length} file precache, VERSION "${vm[1]}", hash ${hash}).`);
