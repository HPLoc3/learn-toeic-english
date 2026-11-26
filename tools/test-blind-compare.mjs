// Kiem tra tools/blind-compare.mjs. Chay: node tools/test-blind-compare.mjs  (chi ghi trong thu muc tam)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normAnswer, normFill, unitKey } from "./blind-compare.mjs";
import { blind, questionIds } from "./export-blind.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REAL = path.resolve(here, "..");
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (extra ? "\n     " + extra : "")); }
}

/* ---------- chuan hoa ---------- */
const O = [{ label: "A", en: "A technician" }, { label: "B", en: "Call the vendor." }, { label: "C", en: "On Friday" }, { label: "D", en: "decision" }];
check("normAnswer: chu cai hoa/thuong", normAnswer("b", O) === "B" && normAnswer(" C ", O) === "C");
check("normAnswer: van ban trung dap an (khong phan biet hoa/thuong, dau cuoi)", normAnswer("call the vendor", O) === "B" && normAnswer("Decision.", O) === "D");
check("normAnswer: dap an bat dau bang 'A ' khong bi doc thanh chu A mot cach sai", normAnswer("A technician", O) === "A" && normAnswer("A plumber", O) === null);
check("normAnswer: 'B) ...', 'C. ...', 'D: ...', '(B) ...', 'C - ...'", normAnswer("B) Call the vendor.", O) === "B" && normAnswer("C. on friday", O) === "C" && normAnswer("D: decision", O) === "D" && normAnswer("(B) call the vendor", O) === "B" && normAnswer("C - On Friday", O) === "C" && normAnswer("C On Friday", O) === "C");
check("normAnswer: chu cai mau thuan voi chu -> khong nhan; rong, la, ngoai pham vi -> null", normAnswer("A) On Friday", O) === null && normAnswer("", O) === null && normAnswer("E", O) === null && normAnswer("something", O) === null && normAnswer("D", O.slice(0, 3)) === null);
check("normFill giong BS.norm cua core.js", (() => {
  const src = fs.readFileSync(path.join(REAL, "assets/js/core.js"), "utf8");
  const fn = vm.runInNewContext("(" + /function norm\(s\) \{[\s\S]*?\n  \}/.exec(src)[0] + ")");
  return ['  "What  Time?" ', "Doesn’t.", "isn't it", "", "A.M.", null].every((x) => fn(x) === normFill(x));
})());

/* ---------- CLI tren unit gia dung tu fixture ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bc-"));
try {
  fs.mkdirSync(path.join(tmp, "data"));
  const load = (file, id) => { const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(file, "utf8"), w); return JSON.parse(JSON.stringify(id ? w.BS_UNITS[id] : w.BS_TRIPLE)); };
  const put = (u) => fs.writeFileSync(path.join(tmp, "data/" + u.id + ".js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['" + u.id + "'] = " + JSON.stringify(u) + ";\n");
  const P3 = load(path.join(REAL, "data/p3-01.js"), "p3-01");
  const P7 = load(path.join(REAL, "tools/fixtures/read-pass.js"), "p7-01");
  P7.exercises.filter((x) => x.type === "read").pop().sets.push(load(path.join(REAL, "tools/fixtures/read-triple.js")));
  const P5 = load(path.join(REAL, "tools/fixtures/gram-pass.js"), "p5-01");
  [P3, P7, P5].forEach(put);

  /* nguoi giai hoan hao pha A; pha B tra loi sai het */
  const wrongOf = (k) => (k.type === "fill" ? "zzz" : k.options.find((o) => o.label !== k.answer).label);
  const rightOf = (k) => (k.type === "fill" ? k.accepted[k.accepted.length - 1].toUpperCase() + "." : k.answer);
  const perfect = (units) => {
    const out = {};
    for (const u of units) { const key = unitKey(u); out[u.id] = { full: {} }; questionIds(blind(u, "full")).forEach((id) => { out[u.id].full[id] = [rightOf(key.get(id)), 5, ""]; }); }
    return out;
  };
  const addMode = (data, u, mode, right = () => false, conf = 5) => {
    const key = unitKey(u); data[u.id][mode] = {};
    questionIds(blind(u, mode)).forEach((id) => { data[u.id][mode][id] = [right(id, key.get(id)) ? rightOf(key.get(id)) : wrongOf(key.get(id)), conf, ""]; });
    return data;
  };
  let n = 0;
  const file = (d) => { const f = path.join(tmp, "s" + (++n) + ".json"); fs.writeFileSync(f, JSON.stringify(d)); return f; };
  const run = (args) => { const r = spawnSync(process.execPath, [path.join(REAL, "tools/blind-compare.mjs"), "--root", tmp].concat(args), { encoding: "utf8" }); return { code: r.status, out: r.stdout + r.stderr }; };
  const two = (a, b, extra = []) => run(["--solver", "opus=" + file(a), "--solver", "sonnet=" + file(b)].concat(extra));
  const cp = (x) => JSON.parse(JSON.stringify(x));

  const base = perfect([P3, P5]);
  const nP3 = Object.keys(base["p3-01"].full).length;
  let r = two(base, cp(base));
  check("hai nguoi giai dung het (ca bai dien): thoat 0", r.code === 0 && r.out.includes("opus " + nP3 + "/" + nP3) && /DAT tat ca/.test(r.out), r.out);

  const q = Object.keys(base["p3-01"].full)[0], kq = unitKey(P3).get(q), fillId = [...unitKey(P3)].find(([, k]) => k.type === "fill")[0];
  let b = cp(base); b["p3-01"].full[q] = [wrongOf(kq), 5, ""];
  r = two(base, b);
  check("mot cau sai: thoat 1, in MISMATCH voi dap an va cau tra loi", r.code === 1 && new RegExp("MISMATCH " + q + " conv/\\S+ dap an=" + kq.answer + ".*sonnet=" + wrongOf(kq) + "\\(c5\\)").test(r.out) && /KHONG DAT: p3-01\./.test(r.out), r.out);
  b = cp(base); delete b["p3-01"].full[q];
  r = two(base, b);
  check("thieu cau: thoat 1, ghi THIEU", r.code === 1 && /sonnet=THIEU/.test(r.out), r.out);
  b = cp(base); b["p3-01"].full[q] = [kq.answer, 3, ""];
  r = two(base, b);
  check("dung nhung conf 3: thoat 1, in LOWCONF", r.code === 1 && new RegExp("LOWCONF " + q + " sonnet c3").test(r.out), r.out);
  b = cp(base); b["p3-01"].full[q] = [kq.answer, 4, ""];
  check("conf 4 dat", two(base, b).code === 0);
  b = cp(base); b["p3-01"].full[q] = [kq.answer, 5, "Second answer: C also fits"];
  r = two(base, b);
  check("flag bat dau bang 'second': thoat 1, in SECOND", r.code === 1 && new RegExp("SECOND " + q + " sonnet: Second answer").test(r.out), r.out);
  b = cp(base); b["p3-01"].full[q] = [kq.answer, 5, "typo in line 2"];
  r = two(base, b);
  check("flag khac chi la ghi chu: thoat 0", r.code === 0 && /ghi chu: typo in line 2/.test(r.out), r.out);
  b = cp(base); b["p3-01"].full[q] = [kq.options.find((o) => o.label === kq.answer).en, 5, ""];
  check("tra loi bang nguyen van dap an: dat", two(base, b).code === 0);
  b = cp(base); b["p3-01"].full[fillId] = ["not an accepted word", 5, ""];
  r = two(base, b);
  check("bai dien ngoai danh sach answers: thoat 1, in MISMATCH fill", r.code === 1 && new RegExp("MISMATCH " + fillId + " fill ").test(r.out), r.out);
  b = cp(base); b["p3-01"].full[q] = [kq.answer, "high", ""];
  r = two(base, b);
  check("conf sai kieu: thoat 1", r.code === 1 && /conf phai la so nguyen 1-5/.test(r.out), r.out);

  /* nhieu tep cho mot nguoi giai: pha B luu truoc, pha A luu sau */
  const bOnly = { "p3-01": { noscript: addMode(perfect([P3]), P3, "noscript")["p3-01"].noscript } };
  r = run(["--solver", "opus=" + file(bOnly) + "," + file(base), "--solver", "sonnet=" + file(base)]);
  check("mot nguoi giai nhieu tep: gop lai", r.code === 0, r.out);
  r = run(["--solver", "opus=" + file(base) + "," + file(base), "--solver", "sonnet=" + file(base)]);
  check("cung mot muc o hai tep cua mot nguoi: thoat 2", r.code === 2 && /xuat hien o hai tep/.test(r.out), r.out);

  /* ---------- pha B ---------- */
  const flags = (out) => [...out.matchAll(/^ {4}\[(\w+)\] (\S+) (\S+)/gm)].map((m) => m[1] + ":" + m[2] + ":" + m[3]);
  const kinds = [...unitKey(P3)].filter(([, k]) => k.type === "conv");
  const mainQ = kinds.find(([, k]) => ["main", "speaker"].includes(k.kind))[0];
  const detQ = kinds.find(([, k]) => !["main", "speaker", "graphic"].includes(k.kind) && !k.graphic)[0];
  const gQ = kinds.find(([, k]) => k.graphic)[0];
  const sel = (ids) => (id) => ids.includes(id);
  let d = addMode(perfect([P3]), P3, "noscript", sel([mainQ, detQ, gQ]), 4);
  r = two(d, cp(d));
  check("conv noscript: guess cho cau detail conf>=4, graphic cho cau hinh, main/speaker khong bi gan; pha B khong doi ma thoat", r.code === 0 && flags(r.out).sort().join() === ["graphic:" + gQ + ":noscript", "guess:" + detQ + ":noscript"].sort().join(), r.out);
  let d3 = addMode(perfect([P3]), P3, "noscript", sel([detQ, gQ]), 3);
  r = two(d, d3);
  check("conv noscript: mot nguoi conf 3 -> khong con guess, graphic van bi gan (conf bat ky)", flags(r.out).join() === "graphic:" + gQ + ":noscript", r.out);
  r = two(d, addMode(perfect([P3]), P3, "noscript"));
  check("pha B: chi mot nguoi dung thi khong gan co", flags(r.out).length === 0, r.out);

  d = addMode(perfect([P5]), P5, "options", () => true, 4);
  r = two(d, cp(d));
  check("gram options: moi cau dung conf>=4 bi gan guess (6 cau)", flags(r.out).filter((x) => /^guess:g/.test(x)).length === 6, r.out);

  const K7 = unitKey(P7);
  const crossIds = [...K7].filter(([, k]) => k.cross).map(([i]) => i);
  d = perfect([P7]); for (const m of ["p1", "p2", "p3"]) addMode(d, P7, m, () => true, 2);
  r = two(d, cp(d));
  const f7 = flags(r.out);
  check("p1/p2/p3: chi cau cross bi gan (conf bat ky), cau thuong tra loi tu mot bai thi khong", f7.length > 0 && f7.every((x) => x.startsWith("cross:") && crossIds.includes(x.split(":")[1])) && f7.includes("cross:r2-s6-q2:p1") && f7.includes("cross:r2-s6-q3:p3") && f7.includes("cross:r2-s5-q2:p2"), f7.join());

  d = addMode(perfect([P7]), P7, "own-sentence", (id, k) => k.setKind === "cloze", 3);
  r = two(d, cp(d));
  const ctxIds = [...K7].filter(([, k]) => k.ctx && k.setKind === "cloze").map(([i]) => i);
  check("own-sentence: cau ctx giai duoc bi gan ctx; cau cloze cuc bo khong bi gan", ctxIds.length >= 2 && flags(r.out).sort().join() === ctxIds.map((i) => "ctx:" + i + ":own-sentence").sort().join(), r.out);
  check("pha B thieu che do duoc bao (thieu)", /\(thieu\) noscript: chua co cau tra loi/.test(r.out) && /\(thieu\) p3: chua co/.test(r.out), r.out);
  d = addMode(perfect([P7]), P7, "noscript", () => true, 5);
  r = two(d, cp(d));
  check("read noscript: kind main khong bi gan, cac kind khac bi gan guess", flags(r.out).length > 0 && flags(r.out).every((x) => x.startsWith("guess:") && K7.get(x.split(":")[1]).kind !== "main") && flags(r.out).length === [...K7].filter(([, k]) => k.type === "read" && k.kind !== "main").length, r.out);

  /* --only, --units, --json */
  b = cp(base); b["p3-01"].full[q] = [wrongOf(kq), 5, ""];
  const other = Object.keys(base["p3-01"].full)[1];
  const delta = { "p3-01": { full: { [other]: base["p3-01"].full[other] } } };
  check("--only: chi kiem cac cau neu ten", two(delta, cp(delta), ["--only", "p3-01/" + other]).code === 0 && two(delta, cp(delta), ["--only", "p3-01/" + other + ",p3-01/" + q]).code === 1 && two(delta, cp(delta)).code === 1);
  check("--only: cau khong ton tai -> thoat 2", two(delta, delta, ["--only", "p3-01/nope"]).code === 2);
  check("--units: chi unit da chon; unit khong ai tra loi thi khong dat", two(b, cp(base), ["--units", "p5-01"]).code === 0 && two(base, base, ["--units", "p7-01"]).code === 1);
  const jf = path.join(tmp, "out.json");
  r = two(b, cp(base), ["--json", jf]);
  const j = JSON.parse(fs.readFileSync(jf, "utf8"));
  check("--json: ghi ket qua tung unit", j.results.length === 2 && j.results.find((x) => x.unit === "p3-01").pass === false && j.results.find((x) => x.unit === "p3-01").mismatches[0].id === q);
  check("tham so sai: 1 nguoi giai, tep hong, unit la, tham so la -> thoat 2", run(["--solver", "a=" + file(base)]).code === 2 && run(["--solver", "a=" + path.join(tmp, "khong-co.json"), "--solver", "b=" + file(base)]).code === 2 && two({ "p9-99": { full: {} } }, base).code === 2 && two(base, base, ["--bogus"]).code === 2);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log("\ntest-blind-compare: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
