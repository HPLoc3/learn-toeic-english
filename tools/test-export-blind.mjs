// Kiem tra tools/export-blind.mjs: dau ra khong con truong nao lo dap an/nghia, va tung che do bo dung phan. Chay: node tools/test-export-blind.mjs
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
  else { fail++; console.log("FAIL " + name + (extra ? "\n     " + extra : "")); }
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eb-"));
try {
  fs.mkdirSync(path.join(tmp, "data"));
  for (const [fx, id] of [["gram-pass", "p5-01"], ["read-pass", "p7-01"]]) {
    const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(path.join(REAL, "tools/fixtures/" + fx + ".js"), "utf8"), w);
    fs.writeFileSync(path.join(tmp, "data/" + id + ".js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['" + id + "'] = " + JSON.stringify(w.BS_UNITS[id]) + ";\n");
  }
  const run = (args) => spawnSync(process.execPath, [path.join(REAL, "tools/export-blind.mjs"), "--root", tmp].concat(args), { encoding: "utf8" });
  const exp = (id, mode) => { const r = run(["--unit", id, "--mode", mode]); return { code: r.status, raw: r.stdout, err: r.stderr, j: r.status === 0 ? JSON.parse(r.stdout) : null }; };
  const FORBID = ["answer", "trap", "why_vi", "explain_vi", "evidence", "clue", "ref", "ctx", "cross", "cat", "pos", "vi", "v", "_note"];
  const keysOf = (x, out = new Set()) => { if (Array.isArray(x)) x.forEach((y) => keysOf(y, out)); else if (x && typeof x === "object") Object.keys(x).forEach((k) => { out.add(k); keysOf(x[k], out); }); return out; };
  const sets = (j) => [].concat(...j.exercises.filter((e) => e.sets).map((e) => e.sets));
  const qs = (j) => [].concat(...sets(j).map((s) => s.questions));
  const items = (j) => [].concat(...j.exercises.filter((e) => e.items).map((e) => e.items));

  for (const id of ["p5-01", "p7-01"]) for (const mode of ["full", "noscript", "options", "own-sentence", "p1", "p2"]) {
    const r = exp(id, mode), ks = r.j ? keysOf(r.j) : new Set();
    check(id + " " + mode + ": chạy được, không còn khóa lộ đáp án/nghĩa (" + FORBID.join(", ") + ")", r.code === 0 && FORBID.every((k) => !ks.has(k)), r.err + [...ks].filter((k) => FORBID.includes(k)).join());
  }
  let r = exp("p7-01", "full");
  check("read full: giữ bài đọc (en), đề và 4 đáp án; không có bản dịch/Giải thích/Bẫy trong chuỗi", sets(r.j).length === 5 && sets(r.j).every((s) => s.passages.length >= 1) && qs(r.j).length === 18 && qs(r.j).every((q) => q.options.length === 4) && !/Giải thích|Bẫy|Manh mối|chứa đáp án/.test(r.raw) && !/Cảm ơn bà đã đặt/.test(r.raw));
  check("read full: giữ nhãn đáp án A-D, từ vựng (word, at), câu position (sentence), intent (quote, at_time)", qs(r.j).filter((q) => q.kind === "vocab").every((q) => q.word && q.at) && qs(r.j).filter((q) => q.kind === "position").every((q) => q.sentence) && qs(r.j).filter((q) => q.kind === "intent").every((q) => q.quote && q.at_time) && qs(r.j)[0].options.map((o) => o.label).join("") === "ABCD");
  check("read full: bảng của bài double còn nguyên (title, cols, rows)", /September Presentation Skills Sessions/.test(r.raw) && /Session 2/.test(r.raw));
  r = exp("p7-01", "noscript");
  check("read noscript: bỏ hết bài đọc nhưng giữ đề, đáp án, word và sentence", sets(r.j).every((s) => s.passages === undefined) && qs(r.j).length === 18 && qs(r.j).filter((q) => q.q).length === 14 && qs(r.j).some((q) => q.word === "return") && qs(r.j).some((q) => q.sentence) && !/Thank you for your order|Harbor Room/.test(r.raw));
  r = exp("p7-01", "options");
  check("read options: bỏ bài đọc và đề (q, word, at, sentence, quote, at_time); chỉ còn đáp án", sets(r.j).every((s) => s.passages === undefined) && qs(r.j).every((q) => q.q === undefined && q.word === undefined && q.sentence === undefined && q.quote === undefined && q.at_time === undefined && q.options.length === 4));
  r = exp("p7-01", "own-sentence");
  const cz = sets(r.j).find((s) => s.kind === "cloze");
  check("read own-sentence: cloze chỉ còn câu chứa chỗ trống (------), cầu chèn (insert) chỉ còn đáp án; bài đọc bị bỏ", sets(r.j).every((s) => s.passages === undefined) && cz.questions[0].sentence.includes("------") && !cz.questions[0].sentence.includes("{") && cz.questions[1].sentence.includes("------") && cz.questions[2].sentence === undefined && cz.questions[2].kind === "insert" && /Because of|\(1\)/.test(cz.questions[0].sentence) === false);
  check("read own-sentence: câu hỏi ở bộ khác giữ nguyên đề", sets(r.j).filter((s) => s.kind !== "cloze").every((s) => s.questions.every((q) => q.q && q.q.en)));
  const r1 = exp("p7-01", "p1"), r2 = exp("p7-01", "p2");
  check("read p1/p2: chỉ còn bộ double, mỗi bộ đúng một bài đọc (p1 là e-mail hỏi, p2 là thư trả lời có bảng)", sets(r1.j).length === 1 && sets(r2.j).length === 1 && sets(r1.j)[0].passages.length === 1 && sets(r2.j)[0].passages.length === 1 && /Team workshop in September/.test(r1.raw) && !/September Presentation Skills Sessions/.test(r1.raw) && /September Presentation Skills Sessions/.test(r2.raw) && !/Our budget for the whole group/.test(r2.raw));
  check("read p1/p2: vẫn giữ cả 5 câu hỏi của bộ double (kể cả hai câu cross)", qs(r1.j).length === 5 && qs(r2.j).length === 5);
  r = exp("p5-01", "full");
  check("gram full: 6 câu, giữ câu có ------ và 4 đáp án; không có cat/pos/vi", items(r.j).length === 6 && items(r.j).every((it) => /------/.test(it.en) && it.options.length === 4) && !/word-form|Ủy ban/.test(r.raw));
  r = exp("p5-01", "options");
  check("gram options: bỏ câu (en), chỉ còn 4 đáp án", items(r.j).length === 6 && items(r.j).every((it) => it.en === undefined && it.options.length === 4) && !/------/.test(r.raw));
  check("gram noscript và own-sentence: giữ nguyên câu", items(exp("p5-01", "noscript").j).every((it) => /------/.test(it.en)) && items(exp("p5-01", "own-sentence").j).every((it) => /------/.test(it.en)));
  check("gram p1/p2: không có bộ double nên không xuất gì", exp("p5-01", "p1").j.exercises.length === 0 && exp("p5-01", "p2").j.exercises.length === 0);
  check("chỉ xuất bài gram/read: không xuất mẹo, từ vựng, cụm từ, bài điền", (() => { const o = exp("p7-01", "full"); return Object.keys(o.j).join() === "id,mode,exercises" && !/"tips"|"phrases"|"fill1"|"sentences"|"focus"/.test(o.raw) && o.j.exercises.every((e) => e.type === "read" || e.type === "gram"); })());
  check("dùng --unit bắt buộc, mode lạ và unit không có đều thoát mã 2", run([]).status === 2 && run(["--unit", "p7-01", "--mode", "weird"]).status === 2 && run(["--unit", "p9-99"]).status === 2 && run(["--unit", "Bad Id"]).status === 2);
  check("tham số lạ: thoát mã 2", run(["--unit", "p7-01", "--bogus"]).status === 2);
  const real = spawnSync(process.execPath, [path.join(REAL, "tools/export-blind.mjs"), "--unit", "p3-01"], { encoding: "utf8" });
  check("unit thật p3-01 (không có gram/read): xuất ra danh sách bài rỗng", real.status === 0 && JSON.parse(real.stdout).exercises.length === 0);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log("\ntest-export-blind: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
