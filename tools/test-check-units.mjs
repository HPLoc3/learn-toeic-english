// Kiem tra cac luat anh moi cua check-units (svg/webp, kich thuoc, tron dinh dang, cau trung, ratio) va lop luoi 16:9 cua game.js.
// Chay: node tools/test-check-units.mjs  (khong ghi vao cay that: dung ban sao trong thu muc tam)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REAL = path.resolve(here, "..");
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (extra ? "\n" + extra : "")); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cu-"));
for (const d of ["data", "assets/js", "assets/img", "assets/img-hd"]) {
  fs.cpSync(path.join(REAL, d), path.join(tmp, d), { recursive: true });
}
const gameFile = path.join(tmp, "data/l02-game.js");
const baseGame = fs.readFileSync(gameFile, "utf8");
const SCENES = fs.readdirSync(path.join(tmp, "assets/img/l02/scene")).filter((f) => /-800\.webp$/.test(f)).map((f) => "assets/img/l02/scene/" + f);

function run(mutate) {
  const w = {}; w.window = w;
  vm.runInNewContext(baseGame, w);
  const cfg = w.BS_GAMES.l02;
  mutate(cfg);
  fs.writeFileSync(gameFile, "window.BS_GAMES = window.BS_GAMES || {};\nwindow.BS_GAMES.l02 = " + JSON.stringify(cfg) + ";\n");
  const r = spawnSync(process.execPath, [path.join(REAL, "tools/check-units.mjs"), "--root", tmp, "--unit", "l02"], { encoding: "utf8" });
  return { out: (r.stdout || "") + (r.stderr || ""), code: r.status };
}
const allWebp = (cfg) => { cfg.rounds.forEach((r, i) => { r.img = SCENES[i % SCENES.length]; }); };

const MIX_L02 = /\[l02\] game trộn ảnh/;
try {
  let r = run(() => {});
  check("thật: l02 hiện tại không lỗi, có cảnh báo trộn svg/webp", r.code === 0 && MIX_L02.test(r.out), r.out);

  r = run(allWebp);
  check("toàn webp: không cảnh báo trộn", r.code === 0 && !MIX_L02.test(r.out), r.out);

  r = run((cfg) => { allWebp(cfg); cfg.ratio = "16:9"; });
  check("ratio 16:9 hợp lệ", r.code === 0 && !/ratio/.test(r.out), r.out);

  r = run((cfg) => { allWebp(cfg); cfg.ratio = "4:5"; });
  check("ratio lạ bị báo lỗi", r.code !== 0 && /ratio '4:5'/.test(r.out), r.out);

  fs.writeFileSync(path.join(tmp, "assets/img/l02/x.png"), "png");
  r = run((cfg) => { allWebp(cfg); cfg.rounds[0].img = "assets/img/l02/x.png"; });
  check("đuôi .png bị báo lỗi", r.code !== 0 && /chỉ được là \.svg hoặc \.webp/.test(r.out), r.out);

  fs.writeFileSync(path.join(tmp, "assets/img/l02/big.webp"), Buffer.alloc(110001));
  r = run((cfg) => { allWebp(cfg); cfg.rounds[0].img = "assets/img/l02/big.webp"; });
  check("webp > 110000 B bị báo lỗi", r.code !== 0 && /110001 B/.test(r.out), r.out);

  fs.writeFileSync(path.join(tmp, "assets/img/l02/ok.webp"), Buffer.alloc(110000));
  r = run((cfg) => { allWebp(cfg); cfg.rounds[0].img = "assets/img/l02/ok.webp"; });
  check("webp đúng 110000 B được chấp nhận", r.code === 0 && !/110000 B/.test(r.out), r.out);

  r = run((cfg) => { allWebp(cfg); cfg.rounds.push({ img: SCENES[6], ref: cfg.rounds[0].ref, avoid: [] }); });
  check("cùng một câu dùng với ảnh khác nhau: cảnh báo", /dùng ở các vòng 0, 14 với ảnh khác nhau/.test(r.out), r.out);

  r = run(allWebp);
  check("không có câu trùng ảnh khác: không cảnh báo câu", !/với ảnh khác nhau/.test(r.out), r.out);

  /* game.js: lop luoi theo ratio */
  const gw = {}; gw.window = gw;
  vm.runInNewContext(fs.readFileSync(path.join(REAL, "assets/js/game.js"), "utf8"), gw);
  const G = gw.BSGame;
  check("imgClass: webp (kể cả ?query/#hash) thành game-img--wide, svg thì không", G.imgClass("a/b.webp") === "game-img game-img--wide" && G.imgClass("a/b.webp?v=3") === "game-img game-img--wide" && G.imgClass("a/b.svg") === "game-img" && G.imgClass("a/b.webpx") === "game-img" && G.imgClass(undefined) === "game-img");
  check("gridClass mặc định 4:3", G.gridClass({}) === "game-grid" && G.gridClass(undefined) === "game-grid");
  check("gridClass 16:9", G.gridClass({ ratio: "16:9" }) === "game-grid game-grid--16x9");
  check("gridClass bỏ qua ratio lạ", G.gridClass({ ratio: "1:1" }) === "game-grid");
  const css = fs.readFileSync(path.join(REAL, "assets/css/game.css"), "utf8");
  check("game.css: ô ảnh canh giữa (flex) và ảnh webp 16:9 không bị cắt (contain)", /\.game-opt \{[^}]*display: flex; align-items: center;/.test(css) && /\.game-opt img\.game-img--wide[^{]*\{ aspect-ratio: 16 \/ 9; \}/.test(css) && /\.game-opt img \{[^}]*object-fit: contain/.test(css));
  check("game.css có luật 16:9 dùng contain (kế thừa)", /\.game-grid--16x9 \.game-opt img \{ aspect-ratio: 16 \/ 9; \}/.test(css) && /object-fit: contain/.test(css) && !/object-fit: cover/.test(css));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log("\ntest-check-units: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
