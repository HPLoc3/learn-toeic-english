// test-build-dist.mjs - kiểm tools/build-dist.mjs: allowlist, loại trừ, PRECACHE, và cổng phát hành chặn build.
// Chạy: node tools/test-build-dist.mjs  (exit 0 khi đạt). Chạy build thật vào dist/ rồi xóa dist/ sau khi kiểm;
// phần thử cổng lỗi dùng bản sao tạm của site (không sửa file được theo dõi).
import { existsSync, readFileSync, writeFileSync, rmSync, mkdtempSync, mkdirSync, copyFileSync, appendFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build, isSiteFile, isPublicMeta, copySite, runGate, gitFiles, parsePrecache, localRefs, verifyDist, walkFiles, GATE, ROOT } from "./build-dist.mjs";

let total = 0, failed = 0;
function check(name, cond, extra) {
  total++;
  if (!cond) { failed++; console.error("FAIL: " + name + (extra !== undefined ? " -> " + extra : "")); }
}
const quiet = () => {};

// --- allowlist (hàm thuần) ---
for (const f of ["index.html", "unit.html", "review.html", "404.html", "_headers", "_redirects", "sw.js", "manifest.webmanifest", "favicon.ico", "assets/js/core.js", "assets/img-hd/l01/x.webp", "data/catalog.js"]) {
  check("allowlist nhận " + f, isSiteFile(f));
}
for (const f of ["README.md", "CREDITS-IMAGES.md", "HUONG-DAN.txt", ".gitignore", ".gitattributes", ".nojekyll", ".claude/settings.json", "tools/check-units.mjs", "tools/templates/x.js", "assets/notes.md", "data/a.txt", "dist/index.html", "../x.html", "/etc/x.html"]) {
  check("allowlist loại " + f, !isSiteFile(f));
}
check("localRefs bỏ qua link ngoài và data:", JSON.stringify(localRefs('<link rel="icon" href="data:image/svg+xml,x"><script src="https://a.b/x.js"></script><script src="a/b.js?v=1"></script><img src="/i.png">')) === JSON.stringify(["a/b.js", "/i.png"]));

// --- build thật ---
const dist = join(ROOT, "dist");
const r = build(ROOT, { log: quiet });
try {
  check("build thật thành công", r.ok, r.errors);
  if (r.ok) {
    const files = walkFiles(dist);
    const set = new Set(files);
    check("dist có các trang gốc", ["index.html", "unit.html", "review.html", "404.html"].every((f) => set.has(f)));
    check("dist có _headers, sw.js, manifest, favicon", ["_headers", "sw.js", "manifest.webmanifest", "favicon.ico"].every((f) => set.has(f)));
    check("dist có assets/img-hd và data", files.some((f) => f.startsWith("assets/img-hd/")) && files.some((f) => f.startsWith("data/")));
    check("dist không có .md/.txt", !files.some((f) => /\.(md|txt)$/i.test(f)), files.filter((f) => /\.(md|txt)$/i.test(f)));
    check("dist không có tools/ hay file ẩn", !files.some((f) => f.startsWith("tools/") || /(^|\/)\./.test(f)));
    check("dist không có dist/ lồng nhau", !set.has("dist/index.html"));
    const sw = readFileSync(join(dist, "sw.js"), "utf8");
    const pre = parsePrecache(sw);
    check("đọc được PRECACHE", Array.isArray(pre) && pre.length > 50, pre && pre.length);
    check("mọi mục PRECACHE có trong dist", pre.every((f) => set.has(f)), pre.filter((f) => !set.has(f)));
    // dist = đúng tập file được theo dõi và nằm trong allowlist
    const expected = gitFiles(ROOT).filter(isSiteFile).filter((f) => existsSync(join(ROOT, f))).sort();
    check("dist khớp git ls-files ∩ allowlist", JSON.stringify(expected) === JSON.stringify([...files].sort()));
    check("verifyDist không báo lỗi", verifyDist(dist).errors.length === 0);
    check("số file/byte báo cáo khớp", r.count === files.length && r.bytes === files.reduce((s, f) => s + statSync(join(dist, f)).size, 0));
    // Rác chưa theo dõi không lọt vào dist
    const junk = join(ROOT, "assets", "zz-untracked-test.txt");
    const junk2 = join(ROOT, "assets", "zz-untracked-test.js");
    writeFileSync(junk, "x"); writeFileSync(junk2, "x");
    try {
      const r2 = build(ROOT, { log: quiet });
      check("build lần 2 thành công", r2.ok, r2.errors);
      check("file chưa theo dõi không vào dist", !existsSync(join(dist, "assets", "zz-untracked-test.txt")) && !existsSync(join(dist, "assets", "zz-untracked-test.js")));
    } finally { rmSync(junk, { force: true }); rmSync(junk2, { force: true }); }
  }
} finally {
  rmSync(dist, { recursive: true, force: true });
}
check("dist đã được dọn", !existsSync(dist));

// --- cổng phát hành: lệnh lỗi ---
const fail1 = runGate(ROOT, [{ name: "giả-lỗi", args: ["-e", "process.exit(3)"] }, GATE[1]], quiet);
check("runGate báo lỗi khi một lệnh exit != 0", fail1.length === 1 && /giả-lỗi/.test(fail1[0]), fail1);
check("runGate qua khi mọi lệnh exit 0", runGate(ROOT, [{ name: "ok", args: ["-e", "0"] }], quiet).length === 0);
const bad = build(ROOT, { gate: [{ name: "giả-lỗi", args: ["-e", "process.exit(1)"] }], log: quiet });
check("build dừng khi cổng lỗi", bad.ok === false && /Cổng phát hành/.test(bad.errors[0]));
check("build dừng thì không tạo dist/", !existsSync(dist));

// --- cổng thật trên bản sao tạm có placeholder:true ---
const tmp = mkdtempSync(join(tmpdir(), "tb-build-"));
try {
  const copy = (rel) => { mkdirSync(dirname(join(tmp, rel)), { recursive: true }); copyFileSync(join(ROOT, rel), join(tmp, rel)); };
  for (const f of gitFiles(ROOT)) if (/^(data|assets|tools)\//.test(f) || /^[^/]+\.(html|js|webmanifest|ico)$/.test(f)) copy(f);
  const anim = join(tmp, "data", "l01-anim.js");
  appendFileSync(anim, "\n;window.BS_ANIMS.l01.placeholder = true;\n");
  const g = spawnSync(process.execPath, [join(tmp, "tools", "check-units.mjs"), "--release", "--root", tmp], { encoding: "utf8" });
  check("check-units --release thất bại với placeholder:true", g.status !== 0, g.status);
  const g2 = spawnSync(process.execPath, [join(tmp, "tools", "check-units.mjs"), "--release", "--root", ROOT], { encoding: "utf8" });
  check("check-units --release đạt trên dữ liệu thật", g2.status === 0, g2.stdout + g2.stderr);
  // build với cổng trỏ vào bản sao lỗi phải dừng, kể cả khi lệnh chạy bằng node thật
  const bad2 = build(ROOT, { gate: [{ name: "check-units --release (bản sao placeholder)", args: [join(tmp, "tools", "check-units.mjs"), "--release", "--root", tmp] }], log: quiet });
  check("build dừng với cổng thật thất bại", bad2.ok === false && !existsSync(dist), bad2.errors);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// --- verifyDist bắt lỗi ---
const vtmp = mkdtempSync(join(tmpdir(), "tb-verify-"));
try {
  writeFileSync(join(vtmp, "sw.js"), 'var PRECACHE = [\n  "a.js",\n  "missing.js"\n];');
  writeFileSync(join(vtmp, "a.js"), "x");
  writeFileSync(join(vtmp, "index.html"), '<script src="a.js"></script><img src="nope.png">');
  writeFileSync(join(vtmp, "README.md"), "x");
  const v = verifyDist(vtmp).errors.join("\n");
  check("verifyDist bắt PRECACHE thiếu", /missing\.js/.test(v));
  check("verifyDist bắt tham chiếu HTML thiếu", /nope\.png/.test(v));
  check("verifyDist bắt .md lọt vào", /README\.md/.test(v));
} finally {
  rmSync(vtmp, { recursive: true, force: true });
}

// --- robots.txt và .well-known/ (tùy chọn, nếu có tệp được theo dõi thì phải được chép) ---
for (const f of ["robots.txt", ".well-known/security.txt", ".well-known/assetlinks.json"]) check("allowlist nhận " + f, isSiteFile(f) && isPublicMeta(f));
for (const f of ["assets/robots.txt", "sub/robots.txt", "robots.txt.bak", ".well-known/", ".well-known", ".git/config", ".well-known/../x.html"]) check("allowlist loại " + f, !isSiteFile(f));
const mtmp = mkdtempSync(join(tmpdir(), "tb-meta-"));
try {
  const src = join(mtmp, "src"), out = join(mtmp, "out");
  mkdirSync(join(src, ".well-known"), { recursive: true }); mkdirSync(out, { recursive: true });
  writeFileSync(join(src, "robots.txt"), "User-agent: *\n");
  writeFileSync(join(src, ".well-known", "security.txt"), "Contact: none\n");
  writeFileSync(join(src, "README.md"), "x"); writeFileSync(join(src, "sw.js"), "var PRECACHE = [\n  \"robots.txt\"\n];");
  const cp = copySite(src, out, ["robots.txt", ".well-known/security.txt", "README.md", "sw.js"]);
  check("copySite chép robots.txt và .well-known, bỏ README.md", cp.list.includes("robots.txt") && cp.list.includes(".well-known/security.txt") && !cp.list.includes("README.md"), cp.list);
  check("tệp đã nằm trong dist thật", existsSync(join(out, "robots.txt")) && existsSync(join(out, ".well-known", "security.txt")));
  check("verifyDist không coi robots.txt/.well-known là file nội bộ", verifyDist(out).errors.length === 0, verifyDist(out).errors);
} finally {
  rmSync(mtmp, { recursive: true, force: true });
}

console.log(`test-build-dist: ${total - failed}/${total} ca đạt`);
process.exit(failed ? 1 : 0);
