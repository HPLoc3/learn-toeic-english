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
  const FORBID = ["answer", "answers", "trap", "why_vi", "explain_vi", "evidence", "clue", "ref", "ctx", "cross", "cat", "pos", "vi", "q_vi", "v", "_note"];
  const keysOf = (x, out = new Set()) => { if (Array.isArray(x)) x.forEach((y) => keysOf(y, out)); else if (x && typeof x === "object") Object.keys(x).forEach((k) => { out.add(k); keysOf(x[k], out); }); return out; };
  const sets = (j) => [].concat(...j.exercises.filter((e) => e.sets).map((e) => e.sets));
  const qs = (j) => [].concat(...sets(j).map((s) => s.questions));
  const gitems = (j) => [].concat(...j.exercises.filter((e) => e.type === "gram").map((e) => e.items));

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
  check("gram full: 6 câu, giữ câu có ------ và 4 đáp án; không có cat/pos/vi", gitems(r.j).length === 6 && gitems(r.j).every((it) => /------/.test(it.en) && it.options.length === 4) && !/word-form|Ủy ban/.test(r.raw));
  r = exp("p5-01", "options");
  check("gram options: bỏ câu (en), chỉ còn 4 đáp án", gitems(r.j).length === 6 && gitems(r.j).every((it) => it.en === undefined && it.options.length === 4) && !/------/.test(r.raw));
  check("gram noscript và own-sentence: giữ nguyên câu", gitems(exp("p5-01", "noscript").j).every((it) => /------/.test(it.en)) && gitems(exp("p5-01", "own-sentence").j).every((it) => /------/.test(it.en)));
  check("gram p1/p2: không có bộ double nên không xuất gì", exp("p5-01", "p1").j.exercises.length === 0 && exp("p5-01", "p2").j.exercises.length === 0);
  check("read full: không xuất mẹo, từ vựng, cụm từ; bài điền được xuất kèm (pha A) nhưng không có đáp án", (() => { const o = exp("p7-01", "full"); return Object.keys(o.j).join() === "id,mode,exercises" && !/"tips"|"phrases"|"sentences"|"focus"|"answers"/.test(o.raw) && o.j.exercises.every((e) => ["read", "gram", "fill"].includes(e.type)) && o.j.exercises.filter((e) => e.type === "fill").length === 1; })());
  check("dùng --unit bắt buộc, mode lạ và unit không có đều thoát mã 2", run([]).status === 2 && run(["--unit", "p7-01", "--mode", "weird"]).status === 2 && run(["--unit", "p9-99"]).status === 2 && run(["--unit", "Bad Id"]).status === 2);
  check("tham số lạ: thoát mã 2", run(["--unit", "p7-01", "--bogus"]).status === 2);
  /* ---------- qr, conv, fill, lesson, triple, batch (dữ liệu thật p2-01, p3-01, p4-01 + fixture triple) ---------- */
  {
    for (const id of ["p2-01", "p3-01", "p4-01"]) fs.copyFileSync(path.join(REAL, "data/" + id + ".js"), path.join(tmp, "data/" + id + ".js"));
    const unitOf = (file, id) => { const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(file, "utf8"), w); return JSON.parse(JSON.stringify(w.BS_UNITS[id])); };
    const writeUnit = (u) => fs.writeFileSync(path.join(tmp, "data/" + u.id + ".js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['" + u.id + "'] = " + JSON.stringify(u) + ";\n");
    const U2 = unitOf(path.join(tmp, "data/p2-01.js"), "p2-01"), U3 = unitOf(path.join(tmp, "data/p3-01.js"), "p3-01");
    const nQr = [].concat(...U2.exercises.filter((e) => e.type === "qr").map((e) => e.items)).length;
    const nFill = (u) => [].concat(...u.exercises.filter((e) => e.type === "fill").map((e) => e.items)).length;
    for (const id of ["p2-01", "p3-01", "p4-01"]) for (const mode of ["full", "noscript", "options", "own-sentence", "p1", "p2", "p3", "fill", "lesson"]) {
      const r = exp(id, mode), ks = r.j ? keysOf(r.j) : new Set();
      check(id + " " + mode + ": chạy được, không còn khóa bị cấm", r.code === 0 && FORBID.every((k) => !ks.has(k)), r.err + [...ks].filter((k) => FORBID.includes(k)).join());
    }
    const ex = (j, t) => [].concat(...j.exercises.filter((e) => e.type === t).map((e) => e.items || e.sets));
    let a = exp("p2-01", "full");
    check("qr full: đủ câu hỏi + 3 đáp án, chỉ các trường id/q/options (không kind, không audio); kèm bài điền", ex(a.j, "qr").length === nQr && ex(a.j, "qr").every((it) => Object.keys(it).join() === "id,q,options" && Object.keys(it.q).join() === "en" && it.options.length === 3 && it.options.every((o) => Object.keys(o).join() === "label,en")) && ex(a.j, "fill").length === nFill(U2));
    a = exp("p2-01", "options");
    check("qr options: chỉ còn đáp án, không còn câu hỏi, không có bài điền", ex(a.j, "qr").length === nQr && ex(a.j, "qr").every((it) => Object.keys(it).join() === "id,options") && ex(a.j, "fill").length === 0 && !a.raw.includes(U2.exercises.find((e) => e.type === "qr").items[0].q.en));
    check("qr noscript: không áp dụng, không xuất gì", exp("p2-01", "noscript").j.exercises.length === 0);
    a = exp("p3-01", "full");
    const S = ex(a.j, "conv");
    check("conv full: người nói, lời thoại (có chỉ số i), hình, 3 câu hỏi 4 đáp án; không kind/uses_graphic của câu; không accent", S.length === 6 && S.every((s) => s.speakers.length >= 1 && s.lines.length >= 3 && s.lines.every((l, i) => l.i === i && l.en && l.s) && s.questions.length === 3 && s.questions.every((q) => Object.keys(q).join() === "id,q,options" && q.options.length === 4)) && S.some((s) => s.graphic) && !keysOf(a.j).has("uses_graphic") && !keysOf(a.j).has("accent"));
    a = exp("p3-01", "noscript");
    check("conv noscript: bỏ hết lời thoại, giữ người nói, hình và câu hỏi", ex(a.j, "conv").length === 6 && !keysOf(a.j).has("lines") && ex(a.j, "conv").some((s) => s.graphic) && !a.raw.includes(U3.exercises.find((e) => e.type === "conv").sets[0].lines[0].en) && ex(a.j, "fill").length === 0);
    check("conv options: không áp dụng", exp("p3-01", "options").j.exercises.length === 0);
    a = exp("p3-01", "fill");
    check("fill: chỉ before/after, không đáp án", a.j.exercises.every((e) => e.type === "fill") && ex(a.j, "fill").length === nFill(U3) && ex(a.j, "fill").every((it) => Object.keys(it).join() === "id,before,after"));
    a = exp("p2-01", "lesson");
    check("lesson: tips, vocab, phrases, sentences; không có câu được chấm; không có bản dịch (vi, q_vi)", a.j.exercises.length === 0 && Object.keys(a.j.lesson).join() === "intro_vi,tips,vocab,phrases,sentences" && a.j.lesson.vocab.length === U2.vocab.length && a.j.lesson.phrases.length === U2.phrases.length && a.j.lesson.sentences.length === U2.sentences.length && a.j.lesson.tips[0].examples[0].q === U2.focus.tips[0].examples[0].q && !keysOf(a.j).has("q_vi"));

    /* triple */
    const tw = {}; tw.window = tw; vm.runInNewContext(fs.readFileSync(path.join(REAL, "tools/fixtures/read-triple.js"), "utf8"), tw);
    const TU = unitOf(path.join(tmp, "data/p7-01.js"), "p7-01");
    TU.id = "p7-04"; TU.exercises.filter((e) => e.type === "read").pop().sets.push(JSON.parse(JSON.stringify(tw.BS_TRIPLE)));
    TU.exercises.filter((e) => e.type === "read").forEach((e) => { e.sets = e.sets.filter((s) => s.kind !== "cloze"); });
    writeUnit(TU);
    const tr = (m) => sets(exp("p7-04", m).j);
    const one = (m, k) => { const t = tr(m).find((s) => s.kind === "triple"); return !!t && t.passages.length === 1 && t.passages[0].id === "r2-s6-p" + k && t.questions.length === 5; };
    check("triple p1/p2: gồm cả bộ double và triple, mỗi bộ đúng một bài", tr("p1").map((s) => s.kind).join() === "double,triple" && tr("p2").length === 2 && one("p1", 1) && one("p2", 2));
    check("triple p3: chỉ bộ triple, bài thứ ba; unit không có triple thì p3 rỗng", tr("p3").length === 1 && one("p3", 3) && exp("p7-01", "p3").j.exercises.length === 0);
    check("triple full: đủ 3 bài", tr("full").find((s) => s.kind === "triple").passages.length === 3);

    /* batch */
    const out = path.join(tmp, "batch");
    const b = run(["--batch", "p2-01,p3-01,p5-01,p7-04", "--out", out]);
    const man = b.status === 0 ? JSON.parse(fs.readFileSync(path.join(out, "manifest.json"), "utf8")) : { packets: [] };
    const modesOf = (u) => man.packets.filter((p) => p.unit === u).map((p) => p.mode).join();
    check("batch: chạy được, chế độ theo loại unit", b.status === 0 && modesOf("p2-01") === "full,options,lesson" && modesOf("p3-01") === "full,noscript,lesson" && modesOf("p5-01") === "full,options,lesson" && modesOf("p7-04") === "full,noscript,p1,p2,p3,lesson", b.stdout + b.stderr);
    check("batch: pha A ở passA/, pha B ở passB/; mọi file trong manifest tồn tại và không còn khóa bị cấm", man.packets.length === 15 && man.packets.every((p) => p.file === (p.mode === "full" ? "passA/" : "passB/") + p.unit + "." + p.mode + ".json" && (() => { const k = keysOf(JSON.parse(fs.readFileSync(path.join(out, p.file), "utf8"))); return FORBID.every((x) => !k.has(x)); })()));
    check("batch: manifest không chứa đáp án, số câu khớp", b.status === 0 && !keysOf(man).has("answer") && man.packets.find((p) => p.unit === "p2-01" && p.mode === "full").items === nQr + nFill(U2) && fs.readdirSync(path.join(out, "passA")).length === 4);
    check("batch: từ chối ghi đè thư mục cũ (mã 2)", run(["--batch", "p2-01", "--out", out]).status === 2);
    check("batch: thiếu --out, id trùng, unit không có, dùng chung --unit đều thoát mã 2 và không ghi gì", run(["--batch", "p2-01"]).status === 2 && run(["--batch", "p2-01,p2-01", "--out", out + "2"]).status === 2 && run(["--batch", "p2-01,p9-99", "--out", out + "3"]).status === 2 && run(["--batch", "p2-01", "--unit", "p2-01", "--out", out + "4"]).status === 2 && ["2", "3", "4"].every((n) => !fs.existsSync(out + n)));
    const bad = JSON.parse(JSON.stringify(U3));
    bad.id = "p3-09"; bad.exercises.filter((e) => e.type === "conv").flatMap((e) => e.sets).find((s) => s.graphic).graphic.answer = "A";
    writeUnit(bad);
    const sc = run(["--batch", "p2-01,p3-09", "--out", out + "5"]);
    check("batch: tự kiểm phát hiện khóa bị cấm còn sót (vd answer trong graphic) -> mã 1, không ghi gì", sc.status === 1 && /graphic\.answer/.test(sc.stderr) && !fs.existsSync(out + "5"), sc.stderr);
  }
  {
    const rc = exp("p7-01", "full"), czq = sets(rc.j).find((s) => s.questions[0].blank).questions;
    check("cloze: bo kind goi y loai tu (tense, word-form...), chi giu kind insert", czq.map((q) => q.kind).join() === ",,insert," || czq.filter((q) => q.kind && q.kind !== "insert").length === 0);
    const pq = (r) => qs(r.j).filter((q) => q.at !== undefined);
    const a1 = pq(r1), a2 = pq(r2);
    check("p1/p2: at tro toi bai da bo thi bi bo; at tro toi bai con lai doi thanh 0 (vocab 'offered' o bai 2)", a1.length === 0 && a2.length === 1 && JSON.stringify(a2[0].at) === "[0,0]" && a2[0].word === "offered");
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log("\ntest-export-blind: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
