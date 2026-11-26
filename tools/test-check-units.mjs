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
  check("thật: l02 hiện tại không lỗi, không còn cảnh báo trộn svg/webp (toàn webp, ratio 16:9)", r.code === 0 && !MIX_L02.test(r.out) && !/ratio/.test(r.out), r.out);

  for (const u of ["l01", "l02"]) {
    const g = fs.readFileSync(path.join(REAL, "data/" + u + "-game.js"), "utf8");
    const gw = {}; gw.window = gw;
    vm.runInNewContext(g, gw);
    const imgs = gw.BS_GAMES[u].rounds.map((x) => x.img);
    check("thật: " + u + " mọi ảnh game là webp và ratio 16:9", gw.BS_GAMES[u].ratio === "16:9" && imgs.every((x) => /\.webp$/.test(x)), imgs.join(","));
  }

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
  /* core.js: BS.isWide dùng chung; BS.img thêm fig--wide cho webp (kể cả ?query/#hash), không thêm cho svg/undefined */
  const mkEl = () => ({ className: "", attrs: {}, kids: [], setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {}, appendChild(c) { this.kids.push(c); return c; } });
  const cw = { console, setTimeout, clearTimeout, URLSearchParams, JSON, Math, Object, Array, Number, String, RegExp, Date,
    localStorage: { getItem: () => null, setItem() {} },
    document: { readyState: "complete", getElementById: () => null, createElement: mkEl, createTextNode: (t) => ({ t }), createEvent: () => ({ initCustomEvent() {} }), dispatchEvent() {}, addEventListener() {}, documentElement: { setAttribute() {}, removeAttribute() {} }, body: null },
    location: { hostname: "example.com", protocol: "https:", search: "" } };
  cw.window = cw; cw.addEventListener = () => {}; cw.matchMedia = () => ({ matches: false });
  vm.createContext(cw);
  vm.runInContext(fs.readFileSync(path.join(REAL, "assets/js/core.js"), "utf8"), cw, { filename: "core.js" });
  const B = cw.BS;
  check("BS.isWide: webp (kể cả ?query/#hash) đúng; svg/.webpx/undefined sai", B.isWide("a/b.webp") && B.isWide("a/b.WEBP?v=3") && B.isWide("a/b.webp#x") && !B.isWide("a/b.svg") && !B.isWide("a/b.webpx") && !B.isWide(undefined));
  check("BS.img: fig--wide cho webp và webp?v=3, không cho svg/undefined", B.img("x/a.webp", "t").className === "fig fig--wide" && B.img("x/a.webp?v=3", "t").className === "fig fig--wide" && B.img("x/a.svg", "t").className === "fig" && B.img(undefined, "t").className === "fig");
  const gsrc = fs.readFileSync(path.join(REAL, "assets/js/game.js"), "utf8");
  check("game.js dùng BS.isWide (không lặp regex)", /game-img--wide/.test(gsrc) && /BS\.isWide\(src\)/.test(gsrc) && !/\\.webp/.test(gsrc));
  check("gridClass mặc định 4:3", G.gridClass({}) === "game-grid" && G.gridClass(undefined) === "game-grid");
  check("gridClass 16:9", G.gridClass({ ratio: "16:9" }) === "game-grid game-grid--16x9");
  check("gridClass bỏ qua ratio lạ", G.gridClass({ ratio: "1:1" }) === "game-grid");
  const css = fs.readFileSync(path.join(REAL, "assets/css/game.css"), "utf8");
  check("game.css: ô ảnh canh giữa (flex) và ảnh webp 16:9 không bị cắt (contain)", /\.game-opt \{[^}]*display: flex; align-items: center;/.test(css) && /\.game-opt img\.game-img--wide[^{]*\{ aspect-ratio: 16 \/ 9; \}/.test(css) && /\.game-opt img \{[^}]*object-fit: contain/.test(css));
  check("game.css có luật 16:9 dùng contain (kế thừa)", /\.game-grid--16x9 \.game-opt img \{ aspect-ratio: 16 \/ 9; \}/.test(css) && /object-fit: contain/.test(css) && !/object-fit: cover/.test(css));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
/* ---------- Part 2: bai tap type "qr" ---------- */
{
  const qtmp = fs.mkdtempSync(path.join(os.tmpdir(), "cu-qr-"));
  try {
    fs.mkdirSync(path.join(qtmp, "data"));
    fs.writeFileSync(path.join(qtmp, "data/catalog.js"), 'window.BS_CATALOG={parts:[{id:"p2",title:"Part 2 - Hỏi - đáp",units:[{id:"p2-01",no:5,title_vi:"Câu hỏi Who và Where",available:true}]}]};');
    const fx = (n) => fs.readFileSync(path.join(REAL, "tools/fixtures/" + n + ".js"), "utf8");
    const load = (code) => { const w = {}; w.window = w; vm.runInNewContext(code, w); return JSON.parse(JSON.stringify(w.BS_UNITS["p2-01"])); };
    const runQ = (u, extra) => {
      fs.writeFileSync(path.join(qtmp, "data/p2-01.js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['p2-01'] = " + JSON.stringify(u) + ";\n");
      const r = spawnSync(process.execPath, [path.join(REAL, "tools/check-units.mjs"), "--root", qtmp].concat(extra || []), { encoding: "utf8" });
      return { out: (r.stdout || "") + (r.stderr || ""), code: r.status };
    };
    const base = () => load(fx("qr-pass"));
    const qrs = (u) => u.exercises.find((e) => e.type === "qr").items;
    const LET = ["A", "B", "C"];
    const mk = (i, answer) => ({
      id: "qr9-" + i, kind: "who", q: { en: "Who handles request number " + i + "?", vi: "Ai xử lý yêu cầu " + i + "?" }, answer, explain_vi: "Giải thích " + i,
      options: LET.map((L) => L === answer ? { label: L, en: "Mr. Chen in accounting.", vi: "Ông Chen." } : { label: L, en: "Not related answer " + L + " " + i + ".", vi: "Không liên quan.", trap: "wrong-wh", why_vi: "Sai loại câu hỏi." })
    });
    const many = (u, n, letters) => { qrs(u).length = 0; for (let i = 0; i < n; i++) qrs(u).push(mk(i + 1, letters(i))); return u; };

    let r = runQ(base(), ["--release"]);
    check("qr hợp lệ (fixture qr-pass): 0 lỗi, kể cả --release, không còn cảnh báo thiếu tf/câu luyện tập", r.code === 0 && /0 lỗi/.test(r.out) && !/câu đúng\/sai/.test(r.out) && !/câu luyện tập/.test(r.out), r.out);
    check("qr hợp lệ: chỉ 4 câu nên cảnh báo < 20 câu và phân bố đáp án", /câu hỏi đáp \(qr\) 4 < 20/.test(r.out) && /đáp án B chiếm 50%/.test(r.out), r.out);

    r = runQ(load(fx("qr-fail")));
    check("fixture qr-fail: exit 1", r.code === 1, r.out);
    for (const [name, re] of [
      ["kind lạ", /kind 'weather' không hợp lệ/], ["thiếu q.vi", /q cần en và vi không rỗng/],
      ["đáp án sai thiếu trap", /options\[B\]: đáp án sai cần trap/], ["đáp án sai thiếu why_vi", /options\[C\]: đáp án sai thiếu why_vi/],
      ["đáp án đúng có trap", /đáp án đúng không được có trap/], ["đáp án đúng có why_vi", /đáp án đúng không được có why_vi/],
      ["chỉ 2 đáp án", /cần đúng 3 đáp án có label A, B, C/], ["câu hỏi trùng", /bị trùng \(qr1-01 và qr1-05\)/]
    ]) check("qr-fail báo lỗi: " + name, re.test(r.out), r.out);

    let u = base(); qrs(u)[0].options[0].why_vi = "";
    check("thiếu why_vi (chuỗi rỗng) là LỖI", /LỖI.*why_vi/.test(runQ(u).out));
    u = base(); qrs(u)[0].answer = "D";
    check("answer không thuộc A/B/C là lỗi", /answer 'D' phải là A, B hoặc C/.test(runQ(u).out));
    u = base(); qrs(u)[0].options[1].label = "C"; qrs(u)[0].options[2].label = "B";
    check("label sai thứ tự (A, C, B) là lỗi", /đúng 3 đáp án có label A, B, C theo thứ tự/.test(runQ(u).out));
    u = base(); delete qrs(u)[0].explain_vi;
    check("thiếu explain_vi là lỗi", /items\[0\]: thiếu explain_vi/.test(runQ(u).out));
    u = base(); qrs(u)[0].options[0].vi = "";
    check("đáp án thiếu vi là lỗi", /options\[A\]: thiếu en hoặc vi/.test(runQ(u).out));
    u = base(); qrs(u)[0].options[0].trap = "nonsense";
    check("trap ngoài danh sách là lỗi", /đáp án sai cần trap thuộc/.test(runQ(u).out));
    u = base(); qrs(u)[1].kind = "yesno";
    check("kind trong danh sách (yesno) được chấp nhận", runQ(u).code === 0);

    u = base(); qrs(u)[0].v = { status: "unverified", note: "x" };
    r = runQ(u, ["--release"]);
    check("--release: qr item còn unverified bị LỖI", r.code === 1 && /items\[0\]: còn 1 mục 'unverified'/.test(r.out), r.out);
    r = runQ(u);
    check("không --release: qr item unverified chỉ là cảnh báo/không lỗi", r.code === 0, r.out);
    u = base(); u.exercises[0].v = { status: "unverified" };
    check("--release: cả bài qr unverified cũng bị lỗi", /LỖI.*còn 'unverified'/.test(runQ(u, ["--release"]).out));

    u = many(base(), 24, (i) => LET[i % 3]);
    r = runQ(u);
    check("24 câu, đáp án chia đều: không cảnh báo số lượng/phân bố, 0 lỗi", r.code === 0 && !/câu hỏi đáp/.test(r.out) && !/chiếm/.test(r.out) && !/đúng lặp từ/.test(r.out), r.out);
    u = many(base(), 20, (i) => LET[i % 3]);
    check("đúng 20 câu: không cảnh báo thiếu số lượng", !/câu hỏi đáp \(qr\)/.test(runQ(u).out));
    u = many(base(), 24, (i) => (i < 12 ? "A" : LET[i % 3]));
    r = runQ(u);
    check("đáp án A quá nhiều (>45%): cảnh báo", /đáp án A chiếm/.test(r.out) && r.code === 0, r.out);
    u = many(base(), 24, (i) => (i % 3 === 0 ? "A" : "B"));
    check("đáp án C <20%: cảnh báo", /đáp án C chiếm 0%/.test(runQ(u).out));
    u = many(base(), 24, (i) => LET[i % 3]); qrs(u)[0].q.en = "Where is the budget report?"; qrs(u)[0].options.forEach((o) => { if (o.label === qrs(u)[0].answer) o.en = "The budget report is on my desk."; });
    r = runQ(u);
    check("đáp án đúng lặp từ nội dung của câu hỏi: cảnh báo (nêu từ lặp)", /items\[0\]: đáp án đúng lặp từ của câu hỏi \(budget, report\)/.test(r.out), r.out);
    u = many(base(), 24, (i) => LET[i % 3]); qrs(u)[0].q.en = "Who is the manager?"; qrs(u)[0].options.forEach((o) => { if (o.label === qrs(u)[0].answer) o.en = "It is the new one."; });
    check("chỉ trùng từ chức năng (is, the): không cảnh báo", !/đúng lặp từ/.test(runQ(u).out));

    u = base(); qrs(u)[0].audio = { q: "assets/audio/p2-01/q1.mp3", A: "assets/audio/p2-01/q1a.mp3" };
    check("audio tùy chọn dạng {q,A,B,C} đường dẫn tương đối: hợp lệ", runQ(u).code === 0);
    u = base(); qrs(u)[0].audio = { q: "https://x.test/a.mp3" };
    check("audio là URL ngoài: lỗi", /audio\.q phải là đường dẫn tương đối/.test(runQ(u).out));
    u = base(); qrs(u)[0].audio = { D: "a.mp3" };
    check("audio khóa lạ: lỗi", /audio có khóa lạ 'D'/.test(runQ(u).out));
    u = base(); qrs(u)[0].audio = "a.mp3";
    check("audio không phải đối tượng: lỗi", /audio phải là đối tượng/.test(runQ(u).out));
    u = base(); u.focus.tips[0].examples[0].q = "  ";
    check("tip example q rỗng: lỗi", /examples\[0\]: q \(câu hỏi Part 2\) phải là chuỗi không rỗng/.test(runQ(u).out));
    u = base(); u.sentences_title_vi = "";
    check("sentences_title_vi rỗng: lỗi", /sentences_title_vi phải là chuỗi không rỗng/.test(runQ(u).out));
    u = base(); u.exercises.push({ id: "tf9", type: "tf", instruction_vi: "x", items: [] });
    check("unit qr vẫn kiểm bài tf không có ảnh (tf thiếu image là lỗi)", /bài tf thiếu image/.test(runQ(u).out));
    u = base(); u.exercises.push({ id: "zz", type: "abc", instruction_vi: "x", items: [] });
    check("type lạ: thông báo liệt kê cả qr và conv", /không hợp lệ \(fill, tf, mc, qr, conv\)/.test(runQ(u).out));

    /* --release: v trên từng đáp án */
    u = base(); qrs(u)[0].options[2].v = { status: "unverified" };
    r = runQ(u, ["--release"]);
    check("--release: v unverified trên MỘT ĐÁP ÁN cũng bị LỖI", r.code === 1 && /items\[0\]: còn 1 mục 'unverified' \(câu hoặc đáp án\)/.test(r.out), r.out);
    check("không --release: v trên đáp án không gây lỗi", runQ(u).code === 0);
    u = base(); qrs(u)[0].options[2].v = { status: "verified" };
    check("--release: v verified trên đáp án được chấp nhận", runQ(u, ["--release"]).code === 0);

    /* không để lộ lời thoại/đáp án */
    const rightOf = (it) => it.options.find((o) => o.label === it.answer);
    const leak = (mut, re, name, extra) => { const x = base(); mut(x); const o = runQ(x, extra); check(name, o.code === 1 && re.test(o.out), o.out); };
    leak((x) => { x.focus.tips[0].examples[0].en = qrs(x)[0].q.en.toUpperCase().replace("?", ""); }, /qr1-01: câu hỏi .* trùng với nội dung ở focus\.tips\[0\]\.examples\[0\]\.en/, "lộ câu hỏi qr trong ví dụ mẹo (en), khác hoa/thường và dấu câu: LỖI");
    leak((x) => { x.focus.tips[0].examples[0].q = qrs(x)[1].q.en; }, /qr1-02: câu hỏi .*examples\[0\]\.q/, "lộ câu hỏi qr trong ví dụ mẹo (q): LỖI");
    leak((x) => { x.sentences[0].en = "  " + rightOf(qrs(x)[2]).en + " "; }, /qr1-03: đáp án đúng .* sentences\[0\]/, "đáp án đúng trùng câu trong Luyện nghe (sentences): LỖI");
    leak((x) => { x.phrases[0].en = rightOf(qrs(x)[3]).en; }, /qr1-04: đáp án đúng .* phrases\[0\]/, "đáp án đúng trùng cụm từ (phrases): LỖI");
    leak((x) => { const f = x.exercises.find((e) => e.type === "fill"); f.items[0].before = "Who is leading the sales meeting"; f.items[0].after = "this afternoon?"; f.items[0].answers = ["?"]; }, /qr1-01: câu hỏi .* \(câu ghép\)/, "câu hỏi qr bị ghép lại trong bài fill: LỖI");
    leak((x) => { x.focus.tips[1].examples[0].en = rightOf(qrs(x)[1]).en; }, /qr1-02: đáp án đúng/, "lộ đáp án: LỖI cả khi chạy --unit (không cần available)", ["--unit", "p2-01"]);
    leak((x) => { x.sentences[1].en = "Please say, " + rightOf(qrs(x)[0]).en + " again please."; }, /qr1-01: đáp án đúng/, "câu Luyện nghe chứa nguyên đáp án đúng (câu dài): LỖI");
    u = base(); u.focus.tips[0].examples[0].en = qrs(u)[0].options[0].en; u.sentences[0].en = qrs(u)[1].options[1].en;
    check("đáp án SAI (bẫy) dùng ở nơi khác: không bị báo", runQ(u).code === 0);
    u = base(); u.phrases[0].en = "Yes.";
    check("cụm ngắn thông thường không gây báo nhầm", runQ(u).code === 0);
    r = runQ(base(), ["--release"]);
    check("fixture sạch (không lộ): 0 lỗi", r.code === 0 && !/trùng với nội dung/.test(r.out), r.out);

    /* mở rộng: quét MỌI chuỗi ngoài bài qr (text_vi, intro_vi, từ vựng...), tách đoạn tiếng Anh trong câu tiếng Việt */
    leak((x) => { x.focus.tips[0].text_vi = "Ví dụ hay gặp: Ms. Alvarez from the head office là một câu trả lời đúng."; }, /qr1-01: đáp án đúng .* focus\.tips\[0\]\.text_vi/, "đáp án đúng được trích bằng tiếng Anh trong text_vi tiếng Việt: LỖI");
    leak((x) => { x.focus.intro_vi = "Hãy nghe: Where did you put the new printer paper? rồi chọn đáp án."; }, /qr1-02: câu hỏi .* focus\.intro_vi/, "câu hỏi qr được trích trong intro_vi: LỖI");
    leak((x) => { x.vocab[0].en = "They're at the front desk."; }, /qr1-03: đáp án đúng .* vocab\[0\]\.en/, "đáp án đúng nằm trong từ vựng: LỖI");
    leak((x) => { x.focus.tips[1].text_vi = "Hãy nghe cụm next to the copier trong đáp án."; }, /qr1-02: đáp án đúng .* focus\.tips\[1\]\.text_vi/, "đoạn tiếng Anh >= 4 từ nằm trong đáp án đúng: LỖI");
    leak((x) => { x.title_vi = "Ai và ở đâu: Mr. Chen in accounting handles those"; }, /qr1-04: đáp án đúng .* title_vi/, "đáp án đúng trong tiêu đề: LỖI");
    u = base(); u.focus.tips[0].text_vi = "Cụm the head office rất thường gặp.";
    r = runQ(u);
    check("đoạn 3 từ chiếm >= 50% câu qr: CẢNH BÁO (không lỗi)", r.code === 0 && /qr1-01: đáp án đúng .* gần trùng với đoạn tiếng Anh "the head office"/.test(r.out), r.out);
    r = runQ(u, ["--release"]);
    check("--release: cảnh báo gần trùng trở thành LỖI", r.code === 1 && /gần trùng/.test(r.out), r.out);
    u = base(); u.focus.tips[0].text_vi = "Hãy nghe cụm the supply closet nhé.";
    r = runQ(u, ["--release"]);
    check("đoạn 3 từ chiếm < 50% câu qr: không báo", r.code === 0 && !/gần trùng/.test(r.out), r.out);
    u = base(); u.focus.tips[0].text_vi = "Bẫy hay gặp: " + qrs(u)[0].options.find((o) => o.label !== qrs(u)[0].answer).en + " (đáp án sai thì được nhắc).";
    check("đáp án SAI được trích trong text_vi: không báo", runQ(u, ["--release"]).code === 0);
    r = runQ(base(), ["--unit", "p2-01"]);
    check("--unit <id>: chỉ kiểm đúng unit đó", /Đã kiểm 1 unit \(p2-01\)/.test(r.out), r.out);

    u = base(); rightOf(qrs(u)[0]).en = "The receptionist in the lobby has it."; u.sentences[0].en = "The receptionist in the lobby keeps them.";
    check("diễn đạt lại 'the receptionist in the lobby keeps them' (5/7 từ liền nhau): --release LỖI", /gần trùng với đoạn tiếng Anh "the receptionist in the lobby"/.test(runQ(u, ["--release"]).out));
    u = base(); rightOf(qrs(u)[0]).en = "She got a better offer."; u.sentences[0].en = "She got a better job offer last week.";
    check("diễn đạt lại 'She got a better job offer last week.' (4/5 từ liền nhau): --release LỖI", /gần trùng với đoạn tiếng Anh "she got a better"/.test(runQ(u, ["--release"]).out));
    u = base(); rightOf(qrs(u)[0]).en = "Just across from the post office."; u.focus.tips[0].text_vi = "Mẫu hay gặp: across from the nhé.";
    check("mẫu trần 'across from the' (3/6 từ, chỉ 1 từ nội dung): không báo", runQ(u, ["--release"]).code === 0);

    /* diễn đạt lại: đoạn liền nhau dài nhất, kể cả khi chuỗi có thêm từ (cảnh báo, --release thành LỖI) */
    u = base(); u.sentences[0].en = "Mr. Chen in accounting usually handles those requests.";
    r = runQ(u);
    check("diễn đạt lại đáp án đúng trong sentences (3/6 từ liền nhau, có thêm từ): CẢNH BÁO", r.code === 0 && /qr1-04: đáp án đúng .* gần trùng với đoạn tiếng Anh "chen in accounting"/.test(r.out), r.out);
    check("diễn đạt lại: --release thành LỖI", runQ(u, ["--release"]).code === 1);
    u = base(); u.phrases[0].en = "The visitor passes are at the front desk now.";
    r = runQ(u, ["--release"]);
    check("diễn đạt lại có thêm từ ở hai đầu (at the front desk): --release LỖI", r.code === 1 && /qr1-03: đáp án đúng .* "at the front desk"/.test(r.out), r.out);
    u = base(); u.sentences[0].en = "Please put it next to the window today.";
    check("mẫu trần chiếm < 50% câu qr (next to the / 3 trên 8 từ): không báo", runQ(u, ["--release"]).code === 0);
    u = base(); rightOf(qrs(u)[1]).en = "Not until next Monday."; u.focus.tips[0].text_vi = "Hãy nhớ mẫu not until next trong câu trả lời.";
    check("mẫu trần toàn từ chức năng (not until next) dù chiếm 3/4 câu: không báo", runQ(u, ["--release"]).code === 0);
    u = base(); rightOf(qrs(u)[1]).en = "Not until next Monday."; u.focus.tips[0].text_vi = "Hãy nhớ mẫu not until next Monday trong câu trả lời.";
    check("nhưng nếu có thêm từ nội dung (Monday): vẫn bị báo", runQ(u, ["--release"]).code === 1);

    /* lớp 2: trùng THEO TỪ NỘI DUNG (thêm/bớt/đảo từ, đồng nghĩa); cảnh báo, --release thành LỖI */
    const OV = /gần trùng về nội dung/;
    const ovFlag = (mut, re, name) => { const x = base(); mut(x); const a = runQ(x), b = runQ(x, ["--release"]); check(name + ": cảnh báo, --release LỖI", a.code === 0 && re.test(a.out) && b.code === 1 && re.test(b.out), a.out + b.out); };
    const ovNo = (mut, name) => { const x = base(); mut(x); const b = runQ(x, ["--release"]); check(name + ": không báo", b.code === 0 && !OV.test(b.out), b.out); };
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "She got a better offer."; x.sentences[0].en = "She got a much better offer."; }, /qr1-01: đáp án đúng .* sentences\[0\]/, "thêm một từ chen giữa ('She got a much better offer.')");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "She got a better offer."; x.focus.tips[0].text_vi = "Hãy nghe câu she got a much better offer nhé."; }, /qr1-01: đáp án đúng .*.text_vi/, "thêm một từ chen giữa, nằm trong câu tiếng Việt (text_vi)");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "Their budget was cut."; x.sentences[0].en = "Their budget was reduced."; }, /qr1-01: đáp án đúng .* sentences\[0\].*budget/, "đồng nghĩa cut/reduced");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "They plan to buy more chairs."; x.phrases[0].en = "They plan to purchase more chairs soon."; }, /qr1-01: đáp án đúng .* phrases\[0\]/, "đồng nghĩa buy/purchase");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "There's one next to the train station."; x.sentences[0].en = "Next to the station there is one."; }, /qr1-01: đáp án đúng .* sentences\[0\]/, "đảo thứ tự và rút gọn ('There's one next to the train station.')");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "She got a better offer."; x.sentences[0].en = "A better offer was what she got."; }, /qr1-01: đáp án đúng/, "đảo thứ tự + chia lại động từ");
    ovFlag((x) => { qrs(x)[0].q.en = "Why was the quarterly report delayed?"; x.sentences[0].en = "The quarterly report was postponed."; }, /qr1-01: câu hỏi .* sentences\[0\]/, "câu hỏi: đồng nghĩa delayed/postponed");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "Just across from the post office."; x.vocab[0].en = "post office"; x.vocab[1].en = "finance manager"; }, "từ vựng 1-2 từ ('post office', 'finance manager')");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "At the technology help desk."; x.sentences[0].en = "The help desk can fix it."; }, "cụm danh từ 2 từ (help desk) trong câu khác");
    ovNo((x) => { qrs(x)[0].q.en = "Where is the nearest bank?"; x.focus.tips[0].examples[0].en = "Where is the nearest post office?"; }, "ví dụ mẹo chỉ chung từ mở đầu ('Where is the nearest ...?')");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "She got a better offer."; x.focus.tips[0].text_vi = "Cô ấy về nhà muộn. She got home late, then there were many long meetings about the new schedule, and in the afternoon a better plan came from the manager who then made an offer to the client."; }, "đoạn văn dài chứa các từ khóa nhưng rải xa nhau");
    ovNo((x) => { const it = qrs(x)[1], ws = it.options.filter((o) => o.label !== it.answer); x.sentences[0].en = ws[0].en; x.phrases[0].en = ws[1].en; x.focus.tips[0].text_vi = "Bẫy hay gặp: " + ws[0].en + " (đáp án sai chỉ để so sánh)."; x.focus.tips[1].examples[0].en = ws[1].en; }, "đáp án SAI được trích ở bất cứ đâu");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "She got a better offer."; x.sentences[0].en = "She got home late today."; }, "chỉ chung vài từ (she got) không đủ");

    /* vòng 2: tense/article/câu hỏi diễn đạt lại, gốc từ (employees, cancelled, bigger), từ nhiều nghĩa không còn là đồng nghĩa */
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "We're waiting for a new delivery."; x.sentences[0].en = "We waited for new deliveries."; }, /qr1-01: đáp án đúng .* sentences\[0\]/, "đổi thì + bỏ mạo từ + số nhiều (waiting/waited, delivery/deliveries)");
    ovFlag((x) => { qrs(x)[0].q.en = "Who should I ask about my parking permit?"; x.sentences[0].en = "Who do I talk to about a parking permit?"; }, /qr1-01: câu hỏi .* sentences\[0\]/, "câu hỏi diễn đạt lại (ask/talk, my/a)");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "I will pick up the package at noon."; x.sentences[0].en = "I'll collect the package at noon."; }, /qr1-01: đáp án đúng .* sentences\[0\]/, "pick up / collect (đoạn còn lại khớp)");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "The new employees start Monday."; x.sentences[0].en = "A new employee will start Monday."; }, /qr1-01: đáp án đúng/, "số nhiều -ees (employees/employee)");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "The meeting was cancelled."; x.sentences[0].en = "They canceled the meeting yesterday."; }, /qr1-01: đáp án đúng/, "cancelled/canceled");
    ovFlag((x) => { rightOf(qrs(x)[0]).en = "We need a bigger room."; x.sentences[0].en = "We require a big room."; }, /qr1-01: đáp án đúng/, "so sánh hơn (bigger/big) + need/require");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "You should choose my suit today."; x.sentences[0].en = "Please pick up my suit this week."; }, "'pick up' không phải đồng nghĩa của 'choose'");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "I met the new manager Kim."; x.sentences[0].en = "The news about Kim was good."; }, "'news' không bị gộp với 'new'");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "The new manager arrived yesterday."; x.sentences[0].en = "The news came yesterday afternoon."; }, "'came' không còn đồng nghĩa với 'arrived'");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "They cut the power early."; x.sentences[0].en = "Use the lower floor power switch early."; }, "'lower' không còn đồng nghĩa với 'cut'");
    ovNo((x) => { qrs(x)[0].q.en = "Which form should I fill out first?"; x.sentences[0].en = "Fill out the online form."; }, "'Fill out the online form.' vs 'Which form should I fill out first?'");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "The cleaner's office is closed today."; x.sentences[0].en = "The cleaner is a nice person today."; }, "sở hữu cách cleaner's không thành 'cleaner is'");

    ovNo((x) => { rightOf(qrs(x)[0]).en = "Please call the weekly meeting today."; x.sentences[0].en = "Please phone the meeting room today."; }, "'call' không còn đồng nghĩa với 'phone' (call a meeting)");
    ovNo((x) => { rightOf(qrs(x)[0]).en = "We saw the show at the office."; x.sentences[0].en = "We display the sign at the office."; }, "'show' (danh từ) không còn đồng nghĩa với 'display'");

    /* rút gọn từ: nhất quán và không nhập nhầm (đọc thẳng các hằng số của check-units) */
    {
      const src = fs.readFileSync(path.join(REAL, "tools/check-units.mjs"), "utf8");
      const stem = new Function(src.slice(src.indexOf("const QR_IRREG"), src.indexOf("const QR_SYN_MAP")) + "\nreturn qrStem;")();
      [["meeting", "meetings"], ["meeting", "meet"], ["building", "buildings"], ["used", "use"], ["agreed", "agree"], ["agrees", "agree"], ["hoping", "hope"], ["filed", "file"], ["filling", "fill"],
        ["cancelled", "canceled"], ["employees", "employee"], ["reduced", "reduce"], ["waited", "waiting"], ["deliveries", "delivery"], ["planned", "plan"]]
        .forEach(([a, b]) => check("rút gọn: '" + a + "' = '" + b + "'", stem(a) === stem(b), stem(a) + " vs " + stem(b)));
      [["file", "fill"], ["hope", "hop"], ["hoping", "hopping"], ["filing", "filling"], ["speed", "spe"], ["indeed", "ind"]]
        .forEach(([a, b]) => check("rút gọn: '" + a + "' khác '" + b + "'", stem(a) !== stem(b), stem(a) + " vs " + stem(b)));
      check("rút gọn: speed, indeed, news giữ nguyên", stem("speed") === "speed" && stem("indeed") === "indeed" && stem("news") === "news");
    }

    /* ngoại lệ theo unit (CU_LEAK_ALLOW chỉ có tác dụng khi không --release) */
    {
      const warnOf = (x, allow, re) => { process.env.CU_LEAK_ALLOW = allow; try { return re.test(runQ(x).out); } finally { delete process.env.CU_LEAK_ALLOW; } };
      const mkOv = () => { const x = base(); rightOf(qrs(x)[0]).en = "She got a better offer."; x.sentences[0].en = "She got a much better offer."; return x; };
      const RO = /qr1-01: đáp án đúng .*gần trùng về nội dung/;
      check("ngoại lệ lớp 2 kiểu cả câu: <unit>/<id>|*overlap* chỉ bỏ qua câu của đúng unit", !warnOf(mkOv(), "p2-01/qr1-01|*overlap*", RO));
      check("ngoại lệ lớp 2: unit khác cùng id câu KHÔNG được bỏ qua", warnOf(mkOv(), "p2-02/qr1-01|*overlap*", RO));
      check("ngoại lệ lớp 2: không tiền tố unit (kiểu cũ toàn cục) KHÔNG còn tác dụng", warnOf(mkOv(), "qr1-01|*overlap*", RO));
      check("ngoại lệ lớp 2: đúng vị trí sentences[0].en thì bỏ qua", !warnOf(mkOv(), "p2-01/qr1-01|*overlap*|sentences[0].en", RO));
      check("ngoại lệ lớp 2: vị trí khác không bỏ qua", warnOf(mkOv(), "p2-01/qr1-01|*overlap*|sentences[1].en", RO));
      check("ngoại lệ lớp 2: vị trí sai định dạng (thiếu .en) không bỏ qua gì", warnOf(mkOv(), "p2-01/qr1-01|*overlap*|sentences[0]", RO));
      check("ngoại lệ lớp 2: id câu khác không bỏ qua", warnOf(mkOv(), "p2-01/qr1-02|*overlap*", RO));
      const mkRun = () => { const x = base(); x.focus.tips[0].text_vi = "Cụm the head office rất thường gặp."; return x; };
      const RR = /qr1-01: đáp án đúng .* gần trùng với đoạn tiếng Anh "the head office"/;
      check("ngoại lệ lớp 1: <unit>/<id>|<đoạn> bỏ qua đúng unit", !warnOf(mkRun(), "p2-01/qr1-01|the head office", RR));
      check("ngoại lệ lớp 1: unit khác không bỏ qua", warnOf(mkRun(), "p2-02/qr1-01|the head office", RR));
      check("ngoại lệ lớp 1: không tiền tố unit không còn tác dụng", warnOf(mkRun(), "qr1-01|the head office", RR));
      process.env.CU_LEAK_ALLOW = "p2-01/qr1-01|*overlap*";
      const rel = runQ(mkOv(), ["--release"]); delete process.env.CU_LEAK_ALLOW;
      check("--release bỏ qua biến CU_LEAK_ALLOW (không thể lách cổng)", rel.code === 1 && RO.test(rel.out), rel.out);
    }

    /* unit không phải Part 2 có bài qr vẫn chịu mức tối thiểu của Part 1 */
    {
      const u9 = base(); u9.id = "l09"; u9.part = "Part 1 - Mô tả hình ảnh";
      fs.writeFileSync(path.join(qtmp, "data/catalog.js"), 'window.BS_CATALOG={parts:[{id:"p1",title:"Part 1",units:[{id:"l09",no:5,title_vi:"Câu hỏi Who và Where",available:true}]}]};');
      fs.writeFileSync(path.join(qtmp, "data/l09.js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['l09'] = " + JSON.stringify(u9) + ";\n");
      const o9 = spawnSync(process.execPath, [path.join(REAL, "tools/check-units.mjs"), "--root", qtmp], { encoding: "utf8" });
      const out9 = (o9.stdout || "") + (o9.stderr || "");
      check("unit id l09 (không phải p2-) có bài qr: vẫn cảnh báo thiếu câu luyện tập và câu đúng/sai", /câu luyện tập 2 < 4/.test(out9) && /câu đúng\/sai 0 < 4/.test(out9), out9);
      check("unit không phải p2- : không áp mức 20 câu qr (chỉ p2-)", !/câu hỏi đáp \(qr\)/.test(out9), out9);
      fs.unlinkSync(path.join(qtmp, "data/l09.js"));
      fs.writeFileSync(path.join(qtmp, "data/catalog.js"), 'window.BS_CATALOG={parts:[{id:"p2",title:"Part 2 - Hỏi - đáp",units:[{id:"p2-01",no:5,title_vi:"Câu hỏi Who và Where",available:true}]}]};');
    }
  } finally {
    fs.rmSync(qtmp, { recursive: true, force: true });
  }
}

/* ---------- Part 3/4: bai tap type "conv" ---------- */
{
  const ctmp = fs.mkdtempSync(path.join(os.tmpdir(), "cu-cv-"));
  try {
    fs.mkdirSync(path.join(ctmp, "data"));
    const CAT = (id, no) => 'window.BS_CATALOG={parts:[{id:"p3",title:"Part 3",units:[{id:"' + id + '",no:' + no + ',title_vi:"Hội thoại nơi công sở",available:true}]}]};';
    fs.writeFileSync(path.join(ctmp, "data/catalog.js"), CAT("p3-01", 12));
    const fx = (n) => fs.readFileSync(path.join(REAL, "tools/fixtures/" + n + ".js"), "utf8");
    const load = (code) => { const w = {}; w.window = w; vm.runInNewContext(code, w); return JSON.parse(JSON.stringify(w.BS_UNITS["p3-01"])); };
    const runC = (u, extra) => {
      fs.writeFileSync(path.join(ctmp, "data/p3-01.js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['p3-01'] = " + JSON.stringify(u) + ";\n");
      const r = spawnSync(process.execPath, [path.join(REAL, "tools/check-units.mjs"), "--root", ctmp].concat(extra || []), { encoding: "utf8" });
      return { out: (r.stdout || "") + (r.stderr || ""), code: r.status };
    };
    const base = () => load(fx("conv-pass"));
    const sets = (u) => [].concat(...u.exercises.filter((e) => e.type === "conv").map((e) => e.sets));
    const S = (u, i) => sets(u)[i || 0];
    const errOf = (u, re, extra) => { const r = runC(u, extra); return r.code === 1 && re.test(r.out); };
    const warnOnly = (u, re, extra) => { const r = runC(u, extra); return r.code === 0 && re.test(r.out); };

    let r = runC(base(), ["--release"]);
    check("conv hợp lệ (fixture conv-pass): 0 lỗi kể cả --release", r.code === 0 && /0 lỗi/.test(r.out), r.out);
    check("conv hợp lệ: unit p3 không bị hỏi câu đúng/sai; chỉ còn cảnh báo ít hơn 6 đoạn", !/câu đúng\/sai/.test(r.out) && /đoạn nghe \(conv\) 2 < 6/.test(r.out) && !/đáp án [ABCD] chiếm/.test(r.out) && !/lời thoại \d+ từ/.test(r.out), r.out);
    check("conv hợp lệ: không có hình nào thiếu thì không cảnh báo hình", !/chưa có đoạn nào có hình/.test(r.out));

    r = runC(load(fx("conv-fail")));
    check("fixture conv-fail: exit 1", r.code === 1, r.out);
    for (const [name, re] of [
      ["kind đoạn lạ", /cf-s01': kind 'weird' không hợp lệ/], ["talk thiếu talk_type", /cf-s02': bài nói cần talk_type/], ["hội thoại có talk_type", /cf-s03': talk_type chỉ dùng cho kind "talk"/],
      ["gender sai", /cf-s04'\.speakers\[0\]: gender phải là m hoặc f/], ["accent sai", /cf-s04'\.speakers\[1\]: accent phải thuộc/],
      ["hội thoại 1 người nói", /cf-s05': hội thoại cần 2-3 người nói/], ["hai người cùng giọng", /cf-s06': hội thoại cần ít nhất 2 giới tính hoặc 2 giọng/], ["4 người nói", /cf-s07': cần 1-3 người nói \(hiện 4\)/],
      ["dòng có s lạ", /cf-s08'\.lines\[2\]: s 'Z' không có trong speakers/], ["ít dòng", /cf-s09': cần ít nhất 4 dòng/], ["dòng quá 240 ký tự", /cf-s10'\.lines\[0\]: en dài \d+ ký tự, tối đa 240/],
      ["người nói không có dòng", /cf-s11': người nói 'X' không có dòng nào/], ["2 câu hỏi", /cf-s12': cần đúng 3 câu hỏi \(hiện 2\)/], ["kind câu lạ", /cf-s13-q1': kind 'trivia' không hợp lệ/],
      ["3 đáp án", /cf-s14-q1': cần đúng 4 đáp án có label A, B, C, D/], ["answer E", /cf-s15-q1': answer 'E' phải là A, B, C hoặc D/],
      ["đáp án đúng có trap", /cf-s16-q1'\.options\[B\]: đáp án đúng không được có trap/], ["đáp án đúng có why_vi", /cf-s16-q1'\.options\[B\]: đáp án đúng không được có why_vi/],
      ["đáp án sai thiếu why_vi", /cf-s17-q1'\.options\[A\]: đáp án sai thiếu why_vi/], ["trap lạ", /cf-s18-q1'\.options\[C\]: đáp án sai cần trap thuộc/],
      ["evidence ngoài phạm vi", /cf-s19-q1': evidence phải là mảng không rỗng/], ["evidence rỗng", /cf-s19-q3': evidence phải là mảng không rỗng/],
      ["quote không có trong lời thoại", /cf-s20-q2': quote "That is not said anywhere" không có nguyên văn/], ["intent thiếu quote", /cf-s21-q2': câu intent cần quote/],
      ["uses_graphic không có graphic", /cf-s22-q3': uses_graphic cần graphic/], ["hàng bảng lệch cột", /cf-s23'\.graphic\.rows\[1\]: cần đúng 3 ô/], ["graphic không câu nào dùng", /cf-s24': có graphic nhưng không câu nào đặt uses_graphic/],
      ["câu hình không mở đầu Look at the graphic", /cf-s25-q2': câu dùng hình phải bắt đầu bằng "Look at the graphic"/], ["câu hỏi trùng trong đoạn", /cf-s26-q3': câu hỏi .* bị trùng trong đoạn/],
      ["đáp án trùng nội dung", /cf-s27-q1'\.options\[D\]: nội dung trùng với đáp án B/], ["đoạn có image", /cf-s35': đoạn conv không dùng image hay audio/], ["list ít hơn 3 mục", /cf-s36'\.graphic: list cần items/],
      ["kind graphic mà thiếu uses_graphic", /cf-s37-q2': kind "graphic" và uses_graphic: true phải đi cùng nhau/], ["Look at the graphic mà thiếu uses_graphic", /cf-s38-q1': câu hỏi mở đầu "Look at the graphic" thì phải đặt uses_graphic/],
      ["uses_graphic mà kind không phải graphic", /cf-s22-q3': kind "graphic" và uses_graphic: true phải đi cùng nhau/]
    ]) check("conv-fail báo lỗi: " + name, new RegExp("LỖI.*" + re.source).test(r.out), r.out.slice(0, 400));
    for (const [name, re] of [
      ["cả 3 câu cùng đáp án", /cf-s29': cả 3 câu cùng đáp án B/], ["lời thoại quá ngắn", /cf-s30': lời thoại \d+ từ/], ["câu dài > 160 ký tự", /cf-s31'\.lines\[1\]: có câu dài \d+ ký tự/],
      ["đáp án chép nguyên văn", /cf-s32-q1': đáp án đúng .* chép nguyên văn/], ["đáp án hình có trong lời thoại", /cf-s33-q2': câu dùng hình mà đáp án đúng "Birch" cũng xuất hiện/], ["đáp án hình không là ô của hình", /cf-s34-q2': .*không phải một ô\/mục của hình/],
      ["intent: quote không nằm trong q.en", /cf-s39-q2': câu hỏi intent nên chứa quote/], ["phân bố đáp án lệch", /đáp án D chiếm \d+%/], ["unverified khi đã mở", /unit đã mở nhưng còn 2 mục 'unverified'/]
    ]) check("conv-fail cảnh báo (không lỗi): " + name, new RegExp("CẢNH BÁO.*" + re.source).test(r.out) && !new RegExp("LỖI.*" + re.source).test(r.out), r.out.slice(0, 400));
    const rr = runC(load(fx("conv-fail")), ["--release"]);
    check("--release: lỗi (R) chép nguyên văn / đáp án hình / unverified đoạn", /LỖI.*cf-s32-q1.*chép nguyên văn.*--release/.test(rr.out) && /LỖI.*cf-s33-q2.*cũng xuất hiện.*--release/.test(rr.out) && /LỖI.*cf-s34-q2.*không phải một ô.*--release/.test(rr.out) && /LỖI.*cf-s28': còn 2 mục 'unverified'/.test(rr.out), rr.out.slice(-1500));
    check("--release: cảnh báo đếm (số đoạn, phân bố, từ) vẫn chỉ là cảnh báo", /CẢNH BÁO.*lời thoại \d+ từ/.test(rr.out) && !/LỖI.*lời thoại \d+ từ/.test(rr.out));

    /* sửa một chỗ trên unit hợp lệ */
    let u = base(); S(u).questions[0].options.pop();
    check("3 đáp án: lỗi", errOf(u, /cần đúng 4 đáp án có label A, B, C, D/));
    u = base(); S(u).questions[0].answer = "E";
    check("answer 'E': lỗi", errOf(u, /answer 'E' phải là A, B, C hoặc D/));
    u = base(); S(u).questions[0].options[1].trap = "literal";
    check("đáp án đúng có trap: lỗi", errOf(u, /đáp án đúng không được có trap/));
    u = base(); delete S(u).questions[0].options[0].why_vi;
    check("đáp án sai thiếu why_vi: lỗi", errOf(u, /đáp án sai thiếu why_vi/));
    u = base(); S(u).questions.pop();
    check("2 câu hỏi: lỗi", errOf(u, /cần đúng 3 câu hỏi \(hiện 2\)/));
    u = base(); S(u).questions.push(JSON.parse(JSON.stringify(S(u).questions[0]))); S(u).questions[3].id = "c1-s1-q4"; S(u).questions[3].q.en = "Another question here?";
    check("4 câu hỏi: lỗi", errOf(u, /cần đúng 3 câu hỏi \(hiện 4\)/));
    u = base(); S(u).lines[1].s = "Q";
    check("dòng trỏ người nói không có: lỗi", errOf(u, /s 'Q' không có trong speakers/));
    u = base(); S(u).questions[0].evidence = [0, 6];
    check("evidence ngoài phạm vi: lỗi", errOf(u, /evidence phải là mảng không rỗng/));
    u = base(); S(u, 1).questions[1].quote = "It is no trouble at all";
    check("intent: quote không có nguyên văn: lỗi", errOf(u, /quote "It is no trouble at all" không có nguyên văn/));
    u = base(); S(u, 1).questions[1].quote = "it’s  NO trouble!";
    check("intent: quote khớp sau chuẩn hóa (hoa/thường, nháy cong, dấu câu, khoảng trắng): hợp lệ", runC(u).code === 0);
    u = base(); S(u).graphic.rows[0].pop();
    check("hàng bảng lệch cột: lỗi", errOf(u, /graphic\.rows\[0\]: cần đúng 3 ô/));
    u = base(); S(u).graphic.title = "";
    check("graphic thiếu title: lỗi", errOf(u, /graphic: thiếu title/));
    u = base(); S(u).graphic = { type: "list", title: "Rooms", items: ["Maple", "Cedar", "Birch"] };
    check("graphic dạng list hợp lệ (>= 3 mục)", runC(u).code === 0);
    u = base(); S(u).graphic.type = "map";
    check("graphic type lạ: lỗi", errOf(u, /type 'map' không hợp lệ \(table, list\)/));
    u = base(); delete S(u).graphic;
    check("uses_graphic mà không có graphic: lỗi", errOf(u, /uses_graphic cần graphic của đoạn/));
    u = base(); S(u).questions[0].audio = { q: "a.mp3" };
    check("câu conv có audio: lỗi", errOf(u, /câu conv không dùng image hay audio/));
    u = base(); u.exercises[0].image = "assets/img/p3-01/x.webp";
    check("bài conv có image: lỗi", errOf(u, /bài conv không dùng image hay audio/));
    u = base(); S(u, 1).speakers.push({ id: "W", gender: "m", accent: "us" });
    check("id người nói trùng: lỗi", errOf(u, /id 'W' bị trùng/));
    u = base(); S(u).questions[1].id = S(u).questions[0].id;
    check("id câu trùng trong unit: lỗi", errOf(u, /id 'c1-s1-q1' bị trùng/));
    u = base(); S(u, 1).id = "c1-s1";
    check("id đoạn trùng trong unit: lỗi", errOf(u, /id 'c1-s1' bị trùng/));
    u = base(); u.exercises[0].sets = [];
    check("sets rỗng: lỗi", errOf(u, /sets không được rỗng/));
    u = base(); S(u).kind = "talk"; S(u).talk_type = "meeting"; S(u).speakers = [S(u).speakers[0]]; S(u).lines.forEach((l) => { l.s = "W"; }); S(u).questions.slice(1).forEach((q) => { q.kind = "detail"; delete q.uses_graphic; });
    delete S(u).graphic; S(u).questions[1].q.en = "What is discussed?"; S(u).questions[1].options[2].en = "Maple Room";
    check("bài nói (talk) 1 người nói, talk_type hợp lệ: không lỗi liên quan", !/LỖI.*(talk_type|người nói)/.test(runC(u).out));
    u = base(); S(u).kind = "talk"; S(u).talk_type = "meeting";
    check("bài nói có 2 người nói: lỗi", errOf(u, /bài nói cần đúng 1 người nói/));

    /* --release: unverified ở đoạn / câu / đáp án */
    u = base(); S(u).v = { status: "unverified" };
    check("--release: đoạn conv unverified: lỗi; không --release: không lỗi", errOf(u, /sets\[0\] 'c1-s1': còn 1 mục 'unverified'/, ["--release"]) && runC(u).code === 0);
    u = base(); S(u).questions[1].v = { status: "unverified" };
    check("--release: câu conv unverified: lỗi", errOf(u, /còn 1 mục 'unverified'/, ["--release"]));
    u = base(); S(u).questions[1].options[0].v = { status: "unverified" };
    check("--release: đáp án conv unverified: lỗi", errOf(u, /còn 1 mục 'unverified'/, ["--release"]));
    u = base(); u.exercises[0].v = { status: "unverified" };
    check("--release: cả bài conv unverified: lỗi", errOf(u, /bài conv|exercise\[0\] 'c1': còn 'unverified'/, ["--release"]));

    /* cảnh báo */
    u = base(); S(u).questions.forEach((q) => { const ia = q.options.findIndex((o) => o.label === q.answer); const t = q.options[0]; q.options[0] = q.options[ia]; q.options[ia] = t; q.options.forEach((o, j) => { o.label = "ABCD"[j]; }); q.answer = "A"; });
    S(u, 1).questions.forEach((q) => { const ia = q.options.findIndex((o) => o.label === q.answer); const t = q.options[0]; q.options[0] = q.options[ia]; q.options[ia] = t; q.options.forEach((o, j) => { o.label = "ABCD"[j]; }); q.answer = "A"; });
    r = runC(u);
    check("phân bố đáp án lệch (toàn A): cảnh báo, không lỗi; cùng đáp án cả đoạn", r.code === 0 && /đáp án A chiếm 100%/.test(r.out) && /cả 3 câu cùng đáp án A/.test(r.out) && /đáp án B chiếm 0%/.test(r.out), r.out);
    u = base(); S(u).lines.forEach((l) => { l.en = "Yes."; l.vi = "Vâng."; });
    check("lời thoại < 60 từ: cảnh báo (không lỗi)", warnOnly(u, /CẢNH BÁO.*lời thoại 6 từ, nên nằm trong 60-160/));
    u = base(); for (let k = 0; k < 3; k++) S(u).lines.push({ s: "W", en: "Word ".repeat(29).trim() + ".", vi: "x" });
    check("lời thoại > 160 từ: cảnh báo", warnOnly(u, /lời thoại \d+ từ, nên nằm trong 60-160/));
    u = base(); S(u).lines[0].en = S(u).lines[0].en.slice(0, -1) + " " + "very ".repeat(18) + "long.";
    check("câu > 160 ký tự: cảnh báo", warnOnly(u, /có câu dài \d+ ký tự/));
    u = base(); S(u).questions[0].options[1].en = "Then the room I booked is too small.";
    check("đáp án đúng chép nguyên văn (>= 4 từ) từ lời thoại: cảnh báo; --release: lỗi", warnOnly(u, /chép nguyên văn/) && errOf(u, /chép nguyên văn.*--release/, ["--release"]));
    u = base(); S(u).questions[0].options[1].en = "Too small.";
    check("đáp án đúng ngắn (< 4 từ) trùng lời thoại: không cảnh báo", !/chép nguyên văn/.test(runC(u).out));
    u = base(); S(u).questions[1].options[2].en = "Birch Hall";
    check("câu hình: đáp án đúng không phải ô của hình: cảnh báo; --release: lỗi", warnOnly(u, /không phải một ô\/mục của hình/) && errOf(u, /không phải một ô\/mục của hình.*--release/, ["--release"]));
    u = base(); S(u).lines[3].en = "Only the Birch room fits both. I'll reserve it right now.";
    check("câu hình: đáp án đúng cũng nằm trong lời thoại: cảnh báo; --release: lỗi", warnOnly(u, /cũng xuất hiện trong lời thoại/) && errOf(u, /cũng xuất hiện trong lời thoại.*--release/, ["--release"]));
    u = base(); S(u).graphic.rows = [["A", "1", "1"], ["B", "2", "2"]]; u.exercises[0].sets.push(JSON.parse(JSON.stringify(S(u, 1)))); u.exercises[0].sets[1].id = "c1-s9"; u.exercises[0].sets[1].questions.forEach((q, k) => { q.id = "c1-s9-q" + (k + 1); });
    check("nhiều đoạn trong một bài conv: được phép (bài c1 có 2 đoạn)", sets(u).length === 3 && !/LỖI/.test(runC(u).out), runC(u).out);

    /* tối thiểu của unit Part 3/4 */
    u = base(); u.exercises.splice(1, 1);
    r = runC(u);
    check("unit p3 chỉ còn 1 đoạn: cảnh báo ít hơn 6 đoạn; không hỏi tf", r.code === 0 && /đoạn nghe \(conv\) 1 < 6/.test(r.out) && !/câu đúng\/sai/.test(r.out), r.out);
    u = base(); delete S(u).graphic; S(u).questions[1].kind = "detail"; delete S(u).questions[1].uses_graphic; S(u).questions[1].q.en = "Which room is mentioned first?"; S(u).questions[1].options[2].en = "Birch room";
    check("unit p3 không có đoạn nào có hình: cảnh báo", warnOnly(u, /chưa có đoạn nào có hình/));
    u = base(); u.sentences.pop();
    check("unit p3: vẫn kiểm mức tối thiểu câu luyện tập (4)", warnOnly(u, /câu luyện tập 3 < 4/));
    u = base(); u.vocab.pop();
    check("unit p3: vẫn kiểm tối thiểu từ vựng (20)", warnOnly(u, /từ vựng 19 < 20/));
    {
      const u9 = base(); u9.id = "l09"; u9.part = "Part 1 - Mô tả hình ảnh";
      fs.writeFileSync(path.join(ctmp, "data/catalog.js"), CAT("l09", 12));
      fs.writeFileSync(path.join(ctmp, "data/l09.js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['l09'] = " + JSON.stringify(u9) + ";\n");
      const o9 = spawnSync(process.execPath, [path.join(REAL, "tools/check-units.mjs"), "--root", ctmp], { encoding: "utf8" });
      const out9 = (o9.stdout || "") + (o9.stderr || "");
      check("unit không phải p3-/p4- có bài conv: vẫn hỏi câu đúng/sai (0 < 4); không áp mức 6 đoạn", /câu đúng\/sai 0 < 4/.test(out9) && !/đoạn nghe \(conv\)/.test(out9), out9);
      fs.unlinkSync(path.join(ctmp, "data/l09.js"));
      fs.writeFileSync(path.join(ctmp, "data/catalog.js"), CAT("p3-01", 12));
    }
    {
      const u4 = base(); u4.id = "p4-02"; u4.part = "Part 4 - Bài nói"; u4.unitNo = 20;
      fs.writeFileSync(path.join(ctmp, "data/catalog.js"), CAT("p4-02", 20));
      fs.writeFileSync(path.join(ctmp, "data/p4-02.js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['p4-02'] = " + JSON.stringify(u4) + ";\n");
      const o4 = spawnSync(process.execPath, [path.join(REAL, "tools/check-units.mjs"), "--root", ctmp], { encoding: "utf8" });
      const out4 = (o4.stdout || "") + (o4.stderr || "");
      check("unit p4-: cũng được bỏ mức tối thiểu câu đúng/sai và chịu mức 6 đoạn", o4.status === 0 && !/câu đúng\/sai/.test(out4) && /đoạn nghe \(conv\) 2 < 6/.test(out4), out4);
      fs.unlinkSync(path.join(ctmp, "data/p4-02.js"));
      fs.writeFileSync(path.join(ctmp, "data/catalog.js"), CAT("p3-01", 12));
    }

    /* không để lộ lời thoại / đáp án ngoài bài conv */
    const leakErr = (fn, re, extra) => { const x = base(); fn(x); const o = runC(x, extra); return o.code === 1 && re.test(o.out); };
    const SENT = "We need at least ten seats, and it has to be free by one o'clock.";
    check("lộ lời thoại: câu lời thoại chép vào sentences: LỖI", leakErr((x) => { x.sentences[0].en = SENT; }, /c1-s1: lời thoại .* trùng với nội dung ở sentences\[0\]\.en/));
    check("lộ lời thoại: chép vào ví dụ của tip: LỖI", leakErr((x) => { x.focus.tips[0].examples[0].en = SENT; }, /c1-s1: lời thoại .* trùng với nội dung ở focus\.tips\[0\]\.examples\[0\]\.en/));
    check("lộ lời thoại: ghép lại thành câu điền từ: LỖI", leakErr((x) => { x.exercises[2].items[0] = { id: "fill1-1", before: "We need at least ten seats, and it has", after: "be free by one o'clock.", answers: ["to"] }; }, /c1-s1: lời thoại .* trùng với nội dung ở .*câu ghép/));
    check("lộ lời thoại: chép vào phrases: LỖI", leakErr((x) => { x.phrases[0].en = "Only one room fits both."; }, /c1-s1: lời thoại .* trùng với nội dung ở phrases\[0\]\.en/));
    check("lộ lời thoại: chép trong chuỗi tiếng Việt xen tiếng Anh: LỖI", leakErr((x) => { x.focus.tips[0].text_vi = "Hãy nghe câu: Then the room I booked is too small. rất thường gặp."; }, /c1-s1: lời thoại .* trùng với nội dung ở focus\.tips\[0\]\.text_vi/));
    check("lộ đáp án: đáp án đúng (>= 4 từ) chép vào tip: LỖI", leakErr((x) => { x.focus.tips[1].examples[0].en = "Notify the attendees of a change."; }, /c1-s1-q3: đáp án đúng .* trùng với nội dung ở focus\.tips\[1\]\.examples\[0\]\.en/));
    check("lộ lời thoại: LỖI cả khi chạy --unit (không cần available)", leakErr((x) => { x.sentences[0].en = SENT; }, /c1-s1: lời thoại/, ["--unit", "p3-01"]));
    const para = (x) => { x.sentences[0].en = "We need ten seats at least, and the room has to be free by one o'clock."; };
    r = (() => { const x = base(); para(x); return runC(x); })();
    check("diễn đạt gần như y hệt (đảo từ): cảnh báo gần trùng, không lỗi", r.code === 0 && /CẢNH BÁO: .*c1-s1: lời thoại .* gần trùng/.test(r.out), r.out);
    check("diễn đạt gần như y hệt: --release thành LỖI", leakErr(para, /LỖI: .*c1-s1: lời thoại .* gần trùng.*--release/, ["--release"]));
    {
      const x = base(); x.phrases[0].en = "Sure, no problem."; x.phrases[1].en = "Good, thanks."; x.phrases[2].en = "Then I'll book it.";
      const o = runC(x, ["--release"]);
      check("câu đệm ngắn (Sure, no problem.) và câu < 5 từ không bị coi là lộ", o.code === 0 && !/trùng/.test(o.out), o.out);
    }
    {
      const x = base(); para(x);
      process.env.CU_LEAK_ALLOW = "p3-01/c1-s1|*overlap*|sentences[0].en";
      const o = runC(x); const o2 = runC(x, ["--release"]); delete process.env.CU_LEAK_ALLOW;
      check("ngoại lệ lớp 2 theo vị trí: dùng id đoạn (p3-01/c1-s1|*overlap*|sentences[0].en) bỏ qua cảnh báo", !/gần trùng/.test(o.out), o.out);
      check("--release bỏ qua biến CU_LEAK_ALLOW của conv", o2.code === 1 && /gần trùng/.test(o2.out), o2.out);
    }
    {
      const x = base(); x.focus.tips[0].examples[0].en = "Notify the attendees of a change.";
      process.env.CU_LEAK_ALLOW = "p3-01/c1-s1-q3|*overlap*";
      const o = runC(x); delete process.env.CU_LEAK_ALLOW;
      check("lộ đáp án chính xác (lớp 1) không được ngoại lệ lớp 2 bỏ qua", o.code === 1 && /c1-s1-q3: đáp án đúng/.test(o.out), o.out);
    }
    check("unit p3 hợp lệ không bị báo lộ nhầm: vocab/phrases/tips khác kịch bản", !/trùng/.test(runC(base(), ["--release"]).out));
    check("thông báo type lạ có liệt kê conv", errOf((() => { const x = base(); x.exercises.push({ id: "zz", type: "abc", instruction_vi: "x", items: [] }); return x; })(), /không hợp lệ \(fill, tf, mc, qr, conv\)/));
  } finally {
    fs.rmSync(ctmp, { recursive: true, force: true });
  }
}


/* ---------- Part 3/4: canh bao "doan duoc" (xq, intent-ctx, idiom, len, grow, sum) ---------- */
{
  const wtmp = fs.mkdtempSync(path.join(os.tmpdir(), "cu-cw-"));
  try {
    fs.mkdirSync(path.join(wtmp, "data"));
    fs.writeFileSync(path.join(wtmp, "data/catalog.js"), 'window.BS_CATALOG={parts:[{id:"p3",title:"Part 3",units:[{id:"p3-01",no:12,title_vi:"Hội thoại nơi công sở",available:true}]}]};');
    const load = (code) => { const w = {}; w.window = w; vm.runInNewContext(code, w); return JSON.parse(JSON.stringify(w.BS_UNITS["p3-01"])); };
    const runW = (u, extra) => {
      fs.writeFileSync(path.join(wtmp, "data/p3-01.js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['p3-01'] = " + JSON.stringify(u) + ";\n");
      const r = spawnSync(process.execPath, [path.join(REAL, "tools/check-units.mjs"), "--root", wtmp].concat(extra || []), { encoding: "utf8" });
      return { out: (r.stdout || "") + (r.stderr || ""), code: r.status };
    };
    const base = () => load(fs.readFileSync(path.join(REAL, "tools/fixtures/conv-pass.js"), "utf8"));
    const SS = (u, i) => u.exercises.filter((e) => e.type === "conv")[i || 0].sets[0];
    const fires = (mut, rule, qid, extra) => { const u = base(); mut(u); const r = runW(u, extra); return r.code === 0 && new RegExp("CẢNH BÁO: \\[p3-01\\] " + qid + ": \\[" + rule + "\\]").test(r.out); };
    let r = runW(base(), ["--release"]);
    check("conv-pass: không phát sinh cảnh báo doan duoc nào (xq, intent-ctx, idiom, len, grow, sum, len-unit)", r.code === 0 && !/: \[(xq|intent-ctx|idiom|len|grow|sum)\]|\[len-unit\]/.test(r.out), r.out);

    check("xq: từ chỉ có ở đáp án đúng trùng cột/tiêu đề của hình", fires((u) => { SS(u).graphic.cols[0] = "People"; }, "xq", "c1-s1-q1"));
    check("xq: trùng đề của câu khác trong đoạn", fires((u) => { SS(u).questions[2].q.en = "Which people will the man contact?"; }, "xq", "c1-s1-q1"));
    check("xq: trùng đáp án đúng của câu khác", fires((u) => { SS(u).questions[2].options[0].en = "Tell the people about it."; }, "xq", "c1-s1-q1"));
    check("xq: trùng với 2 đáp án của một câu khác", fires((u) => { const o = SS(u).questions[2].options; o[1].en = "Invite more people."; o[2].en = "Call the people back."; }, "xq", "c1-s1-q1"));
    check("xq: một đáp án của câu khác thôi thì không cảnh báo", (() => { const u = base(); SS(u).questions[2].options[1].en = "Invite more people."; const o = runW(u); return !/c1-s1-q1: \[xq\]/.test(o.out); })());
    check("xq: từ chung cả với đáp án sai của chính câu đó thì không tính", (() => { const u = base(); SS(u).graphic.cols[0] = "Room"; const o = runW(u); return !/\[xq\]/.test(o.out); })());

    check("intent-ctx: evidence chỉ có dòng chứa quote", fires((u) => { SS(u, 1).questions[1].evidence = [4]; }, "intent-ctx", "c2-s1-q2"));
    check("intent-ctx: evidence có thêm dòng ngữ cảnh thì không cảnh báo", !/\[intent-ctx\]/.test(runW(base()).out));
    check("idiom: quote chứa thành ngữ trong danh sách", fires((u) => { const s = SS(u, 1); s.lines[4].en = "It's no trouble. I'll squeeze in the walk after the first lesson."; s.questions[1].quote = "squeeze in"; s.questions[1].q.en = 'What does Priya mean when she says, "squeeze in"?'; }, "idiom", "c2-s1-q2"));
    check("len: đáp án đúng dài hơn 1.3 lần trung bình", fires((u) => { SS(u).questions[0].options[1].en = "More people than expected will attend the client meeting on Tuesday."; }, "len", "c1-s1-q1"));
    check("len: đáp án đúng ngắn hơn 0.7 lần trung bình", fires((u) => { SS(u).questions[0].options[1].en = "Tiny."; }, "len", "c1-s1-q1"));
    check("len-unit: đáp án đúng là dài nhất ở quá nhiều câu", (() => { const u = base(); u.exercises.filter((e) => e.type === "conv").forEach((e) => e.sets.forEach((s) => s.questions.forEach((q) => { q.options.find((o) => o.label === q.answer).en += " in the end"; }))); const o = runW(u); return o.code === 0 && /\[len-unit\] đáp án đúng là đáp án dài nhất ở [3-6]\/6/.test(o.out); })());
    check("grow: hàng đáp án giữ giá trị lớn nhất duy nhất của cột số", fires((u) => { SS(u).graphic.rows[1][1] = "8"; }, "grow", "c1-s1-q2"));
    check("grow: hàng đáp án giữ giá trị nhỏ nhất duy nhất của cột số", fires((u) => { SS(u).graphic.rows[2][1] = "1"; }, "grow", "c1-s1-q2"));
    check("grow: hai câu hình cùng đáp án ở cùng một hàng", fires((u) => { const s = JSON.parse(JSON.stringify(SS(u))); s.id = "c1-s9"; s.questions.forEach((q, k) => { q.id = "c1-s9-q" + (k + 1); }); u.exercises[0].sets.push(s); }, "grow", "c1-s9-q2"));
    check("sum: một đáp án số bằng tổng của hai đáp án khác", fires((u) => { const q = SS(u).questions[0]; q.q.en = "How many people will attend?"; ["4", "6", "10", "12"].forEach((n, i) => { q.options[i].en = n; q.options[i].vi = n; }); }, "sum", "c1-s1-q1"));
    check("sum: hiệu của hai đáp án cũng bị bắt (9 - 6 = 3, tức 9 = 3 + 6)", fires((u) => { const q = SS(u).questions[0]; q.q.en = "How many people will attend?"; ["3", "6", "9", "20"].forEach((n, i) => { q.options[i].en = n; q.options[i].vi = n; }); }, "sum", "c1-s1-q1"));
    check("sum: bốn số không có quan hệ tổng/hiệu thì không cảnh báo", (() => { const u = base(); const q = SS(u).questions[0]; ["3", "6", "8", "20"].forEach((n, i) => { q.options[i].en = n; q.options[i].vi = n; }); return !/\[sum\]/.test(runW(u).out); })());

    /* ngoai le va --release: van chi la canh bao */
    const mut = (u) => { SS(u).questions[2].q.en = "Which people will the man contact?"; };
    const u1 = base(); mut(u1);
    process.env.CU_LEAK_ALLOW = "p3-01/c1-s1-q1|xq";
    const a1 = runW(u1); const a2 = runW(u1, ["--release"]); delete process.env.CU_LEAK_ALLOW;
    check("ngoại lệ <unit>/<id câu>|xq bỏ qua cảnh báo xq của đúng câu đó", !/c1-s1-q1: \[xq\]/.test(a1.out), a1.out);
    check("--release bỏ qua biến CU_LEAK_ALLOW: vẫn in cảnh báo", /c1-s1-q1: \[xq\]/.test(a2.out));
    const a3 = runW(u1, ["--release"]);
    check("--release: cảnh báo doan duoc KHÔNG leo thang (exit 0, vẫn là CẢNH BÁO, không LỖI)", a3.code === 0 && /CẢNH BÁO.*c1-s1-q1: \[xq\]/.test(a3.out) && !/LỖI.*\[xq\]/.test(a3.out), a3.out);
    process.env.CU_LEAK_ALLOW = "p3-01/c1-s1-q1|len";
    const u2 = base(); SS(u2).questions[0].options[1].en = "Tiny.";
    const a4 = runW(u2); delete process.env.CU_LEAK_ALLOW;
    check("ngoại lệ |len chỉ bỏ cảnh báo len của câu đó", !/c1-s1-q1: \[len\]/.test(a4.out));
    const a5 = (() => { const u = base(); SS(u).questions[2].q.en = "Which people will the man contact?"; process.env.CU_LEAK_ALLOW = "p3-01/c1-s1-q1|len"; const o = runW(u); delete process.env.CU_LEAK_ALLOW; return o; })();
    check("ngoại lệ chỉ đúng một luật: khai |len thì cảnh báo xq của cùng câu vẫn được in", /c1-s1-q1: \[xq\]/.test(a5.out), a5.out);
    const fr = runW(load(fs.readFileSync(path.join(REAL, "tools/fixtures/conv-fail.js"), "utf8")));
    check("conv-fail: có in cảnh báo grow (cùng hàng) và len (đáp án dài/ngắn)", /\[grow\]/.test(fr.out) && /\[len\]/.test(fr.out), fr.out.slice(0, 200));
  } finally {
    fs.rmSync(wtmp, { recursive: true, force: true });
  }
}

console.log("\ntest-check-units: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
