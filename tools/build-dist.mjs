// build-dist.mjs - dựng thư mục dist/ chỉ gồm file của website, để Cloudflare Pages phát hành.
// Chạy: node tools/build-dist.mjs   (Cloudflare Pages: build command = node tools/build-dist.mjs, output = dist)
// Thứ tự: (1) cổng phát hành (check-units --release, check-sw), (2) xóa dist/ cũ, (3) chép file theo ALLOWLIST lấy từ `git ls-files`
//         (file chưa theo dõi không bao giờ được chép), (4) kiểm lại dist/ (PRECACHE, file HTML tham chiếu, không lọt file nội bộ).
// Chỉ dùng thư viện chuẩn, chạy được trên Node 18. Chỉ ghi trong <repo>/dist.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, rmSync, mkdirSync, copyFileSync, statSync, readdirSync, realpathSync } from "node:fs";
import { join, dirname, resolve, relative, sep, posix } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, "..");

/* ---------- ALLOWLIST ---------- */
// File ở thư mục gốc được phép (đường dẫn dạng posix).
const ROOT_FILES = new Set(["_headers", "_redirects", "sw.js", "manifest.webmanifest", "favicon.ico"]);
const ROOT_HTML = /^[A-Za-z0-9_-]+\.html$/;
// Thư mục được phép (gồm assets/img-hd/).
const SITE_DIRS = ["assets/", "data/"];
// Đuôi file nội bộ không bao giờ được vào dist, kể cả nằm trong thư mục được phép.
const FORBIDDEN_EXT = /\.(md|txt|py|mjs|log)$/i;

export function isSiteFile(rel) {
  if (rel.includes("\\") || rel.startsWith("/") || rel.split("/").includes("..")) return false;
  if (FORBIDDEN_EXT.test(rel)) return false;
  if (!rel.includes("/")) return ROOT_FILES.has(rel) || ROOT_HTML.test(rel);
  return SITE_DIRS.some((d) => rel.startsWith(d));
}

/* ---------- git ---------- */
export function gitFiles(root = ROOT) {
  const r = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) {
    throw new Error("Không chạy được `git ls-files` (cần git và thư mục là kho git): " + (r.error ? r.error.message : (r.stderr || "").trim()) + ". Từ chối chép mọi thứ.");
  }
  return r.stdout.split("\0").filter(Boolean);
}

/* ---------- cổng phát hành ---------- */
export const GATE = [
  { name: "check-units --release", args: [join("tools", "check-units.mjs"), "--release"] },
  { name: "check-sw", args: [join("tools", "check-sw.mjs")] },
];
// Trả về danh sách lỗi (rỗng = qua cổng). `gate` cho phép test thay lệnh.
export function runGate(root = ROOT, gate = GATE, log = console.log) {
  const errors = [];
  for (const g of gate) {
    log("Cổng phát hành: " + g.name + " ...");
    const r = spawnSync(process.execPath, g.args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error || r.status !== 0) {
      errors.push(g.name + " thất bại (exit " + (r.error ? r.error.message : r.status) + ").\n" + ((r.stdout || "") + (r.stderr || "")).trim().split("\n").map((l) => "    " + l).join("\n"));
    }
  }
  return errors;
}

/* ---------- an toàn đường dẫn ---------- */
export function safeDist(root = ROOT) {
  const realRoot = realpathSync(root);
  const dist = join(realRoot, "dist");
  if (relative(realRoot, dist) !== "dist") throw new Error("Đường dẫn dist nằm ngoài kho: " + dist);
  if (existsSync(dist) && realpathSync(dist) !== dist) throw new Error("dist là liên kết trỏ ra ngoài kho (" + realpathSync(dist) + "); từ chối xóa.");
  return dist;
}

/* ---------- chép ---------- */
export function copySite(root, dist, files) {
  const list = files.filter(isSiteFile).filter((f) => existsSync(join(root, f)));
  let bytes = 0;
  for (const f of list) {
    const to = join(dist, ...f.split("/"));
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(root, f), to);
    bytes += statSync(to).size;
  }
  return { list, bytes };
}

export function walkFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p, base));
    else out.push(relative(base, p).split(sep).join("/"));
  }
  return out;
}

/* ---------- kiểm dist ---------- */
export function parsePrecache(swText) {
  const m = swText.match(/var PRECACHE = \[([\s\S]*?)\];/);
  if (!m) return null;
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

// File cục bộ mà HTML tham chiếu (script src, link href, img src). Bỏ qua http(s), data:, mailto:, #, //.
export function localRefs(html) {
  const refs = [];
  for (const tag of html.match(/<(script|link|img)\b[^>]*>/gi) || []) {
    const kind = /^<(\w+)/.exec(tag)[1].toLowerCase();
    const attr = kind === "link" ? "href" : "src";
    const m = new RegExp("\\s" + attr + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)')", "i").exec(tag);
    if (!m) continue;
    const v = (m[2] !== undefined ? m[2] : m[3]).trim();
    if (!v || v.startsWith("#") || v.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(v)) continue;
    refs.push(v.split(/[?#]/)[0]);
  }
  return refs;
}

export function verifyDist(dist) {
  const errors = [];
  const files = walkFiles(dist);
  const set = new Set(files);
  if (!set.has("sw.js")) errors.push("dist thiếu sw.js.");
  else {
    const pre = parsePrecache(readFileSync(join(dist, "sw.js"), "utf8"));
    if (!pre) errors.push("Không thấy PRECACHE trong dist/sw.js.");
    else for (const f of pre) if (!set.has(f)) errors.push("PRECACHE trỏ file không có trong dist: " + f);
  }
  for (const page of files.filter((f) => /^[^/]+\.html$/.test(f))) {
    const html = readFileSync(join(dist, page), "utf8");
    for (const ref of localRefs(html)) {
      const target = ref.startsWith("/") ? ref.slice(1) : posix.normalize(ref);
      if (!set.has(target)) errors.push(page + " tham chiếu file không có trong dist: " + ref);
    }
  }
  for (const f of files) {
    if (/\.(md|txt)$/i.test(f) || /^tools\//.test(f) || /(^|\/)\.[^/]/.test(f)) errors.push("File nội bộ lọt vào dist: " + f);
    if (!isSiteFile(f)) errors.push("File ngoài allowlist trong dist: " + f);
  }
  return { errors, files };
}

/* ---------- chạy ---------- */
export function build(root = ROOT, opts = {}) {
  const gate = opts.gate || GATE;
  const log = opts.log || console.log;
  const gerr = runGate(root, gate, log);
  if (gerr.length) return { ok: false, errors: ["Cổng phát hành không qua, dừng build (không đụng dist/):", ...gerr] };
  let tracked;
  try { tracked = gitFiles(root); } catch (e) { return { ok: false, errors: [e.message] }; }
  const dist = safeDist(root);
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  const { bytes } = copySite(root, dist, tracked);
  const v = verifyDist(dist);
  if (v.errors.length) return { ok: false, errors: v.errors };
  return { ok: true, count: v.files.length, bytes, dist, files: v.files };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const r = build();
  if (!r.ok) {
    console.error("build-dist: LỖI\n - " + r.errors.join("\n - "));
    process.exit(1);
  }
  console.log(`build-dist: đạt. dist/ có ${r.count} file, ${r.bytes} byte (${(r.bytes / 1048576).toFixed(2)} MB).`);
}
