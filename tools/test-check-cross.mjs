// Kiem tra tools/check-cross.mjs. Chay: node tools/test-check-cross.mjs  (chi ghi trong thu muc tam)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkCross, loadAll, periodicRun, letterFindings, lineRefs, sentencesOf, BASELINE, BASELINE_UNITS } from "./check-cross.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REAL = path.resolve(here, "..");
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (extra ? "\n     " + extra : "")); }
}
const run = (args) => { const r = spawnSync(process.execPath, [path.join(REAL, "tools/check-cross.mjs")].concat(args), { encoding: "utf8" }); return { code: r.status, out: r.stdout + r.stderr }; };

check("periodicRun: 8 phan tu chu ky 1-4 thi bat; 7 phan tu hoac chu ky 5 thi khong", !!periodicRun("AAAAAAAA".split("")) && periodicRun("DABCABCABCD".split("")).period === 3 && !!periodicRun("ABDCABDC".split("")) && !periodicRun("ABCDABC".split("")) && !periodicRun("ABCDAABCDAAB".split("")) && !periodicRun("AAAAAAAB".split("")));
const qrU = (id, groups) => ({ id, exercises: groups.map((g, i) => ({ id: "qr" + i, type: "qr", items: g.split("").map((a) => ({ answer: a })) })) });
check("X4: ba bai cung thu tu dap an -> bat; hai trong ba giong nhau -> khong", letterFindings(qrU("x", ["ABCCABAC", "ABCCABAC", "ABCCABAC"])).some((f) => /3 nhom qr co cung thu tu/.test(f.msg)) && !letterFindings(qrU("x", ["ABCCABAC", "ABCCABAC", "BBACACCA"])).some((f) => /nhom/.test(f.msg)));
check("X4: tat ca nhom (2) giong nhau -> bat", letterFindings(qrU("x", ["ABCCABAC", "ABCCABAC"])).some((f) => /2 nhom/.test(f.msg)));
check("tach cau: khong cat o Mr./Dr./A.M./P.M.", sentencesOf("Mr. Chen arrives at 9 A.M. on Monday. Dr. Lee will wait.").length === 2);
check("X5: tim 'Dòng 3' va 'line 12' trong khoa *_vi (ke ca long ben trong), khong tinh chuoi tieng Anh", (() => { const f = lineRefs({ explain_vi: "Xem Dòng 3 của bài.", options: [{ why_vi: "Theo line 12 thì sai." }], en: "See line 4 of the form.", ok_vi: "Dòng này nói khác, deadline 5 ngày." }); return f.length === 2; })());

/* ---------- cay that, chi 13 unit cu (unit moi duoc kiem bang chinh check-cross, khong bang bai test nay) ---------- */
{
  const bt = fs.mkdtempSync(path.join(os.tmpdir(), "cc-base-"));
  try {
    fs.mkdirSync(path.join(bt, "data"));
    for (const id of BASELINE_UNITS) fs.copyFileSync(path.join(REAL, "data", id + ".js"), path.join(bt, "data", id + ".js"));
    fs.writeFileSync(path.join(bt, "data/catalog.js"), "window.BS_CATALOG={parts:[{id:'p',units:" + JSON.stringify(BASELINE_UNITS.map((id) => ({ id, available: true }))) + "}]};");
    const real = run(["--root", bt]);
    check("13 unit cu: 0 loi; baseline chi gom X1, X2, X4", real.code === 0 && /13 unit .*; 0 loi \[/.test(real.out) && /baseline \d+ \[X1=\d+ X2=\d+ X3=0 X4=\d+ X5=0\]/.test(real.out), real.out);
  } finally { fs.rmSync(bt, { recursive: true, force: true }); }
}
{
  const all = loadAll(REAL), r = checkCross(all.units.filter((u) => BASELINE_UNITS.includes(u.id)));
  const keys = (k) => r.baseline.filter((x) => x.rule === k).map((x) => x.key).sort().join("|");
  check("danh sach BASELINE khop dung voi du lieu 13 unit cu (khong thieu, khong thua)", r.errors.length === 0 && ["x1", "x2", "x4", "x5"].every((k) => keys(k.toUpperCase()) === BASELINE[k].slice().sort().join("|")), JSON.stringify(r.errors.map((x) => x.msg)));
}

/* ---------- cay tam: 13 unit cu + hai unit moi ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cc-"));
try {
  fs.mkdirSync(path.join(tmp, "data"));
  const mk = (id, extra) => Object.assign({ id, focus: { tips: [] }, vocab: [], phrases: [], sentences: [], exercises: [] }, extra);
  const put = (units) => {
    fs.writeFileSync(path.join(tmp, "data/catalog.js"), "window.BS_CATALOG={parts:[{id:'p',units:" + JSON.stringify(units.map((u) => ({ id: u.id, available: false })).concat({ id: "p9-09", available: false })) + "}]};");
    units.forEach((u) => fs.writeFileSync(path.join(tmp, "data/" + u.id + ".js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['" + u.id + "'] = " + JSON.stringify(u) + ";\n"));
  };
  const S = (...en) => ({ sentences: en.map((t, i) => ({ id: "s" + i, en: t })) });
  const clean = () => [mk("p2-03", S("Please send Anders the shipping list today.", "Our driver met Bhatt near the dock.")), mk("p2-04", S("The teller asked Gallo to sign the form.", "We will call Hoang about the account."))];
  put(clean());
  let r = run(["--root", tmp]);
  check("hai unit moi sach: thoat 0, bao 1 unit chua co du lieu", r.code === 0 && /2 unit \(1 unit chua co du lieu\); 0 loi/.test(r.out), r.out);
  let u = clean(); u[1].phrases = [{ id: "p1", en: "Please send Anders, the shipping list today!" }];
  put(u); r = run(["--root", tmp]);
  check("X1: cau trung sau chuan hoa giua hai unit -> loi", r.code === 1 && /LOI X1: cau "Please send Anders/.test(r.out), r.out);
  check("X2: ten dung chung giua hai unit moi -> loi", /LOI X2: ten "Anders" dung chung o p2-03.*p2-04/.test(r.out), r.out);
  u = clean(); u[0].sentences.push({ id: "s8", en: "How can I help you?" }, { id: "s9", en: "Thank you very much." }); u[1].sentences.push({ id: "s8", en: "How can I help you?" }, { id: "s9", en: "Thank you very much." });
  put(u); check("X1: cau chao trong STOCK va cau duoi 5 tu duoc phep trung", run(["--root", tmp]).code === 0);
  u = clean(); u.push(mk("p2-01", S("We asked Priya to review the draft."))); u[0].sentences.push({ id: "s7", en: "Later, Priya will join the call." });
  put(u); r = run(["--root", tmp]);
  check("X2: unit moi dung lai ten cua unit cu (ke ca ten trong baseline) -> loi", r.code === 1 && /LOI X2: ten "Priya"/.test(r.out), r.out);
  u = [mk("p2-01", S("We asked Priya to review the draft.")), mk("p3-01", S("They told Priya about the change."))];
  put(u); r = run(["--root", tmp]);
  check("X2: ten baseline giua hai unit cu -> chi in baseline, thoat 0", r.code === 0 && /baseline X2: ten "Priya"/.test(r.out), r.out);
  u = [mk("p2-01", S("We asked Quentin to review the draft.")), mk("p3-01", S("They told Quentin about the change."))];
  put(u); check("X2: ten KHONG co trong baseline, du giua hai unit cu -> loi", run(["--root", tmp]).code === 1);

  /* X3 */
  put(clean());
  const nf = path.join(tmp, "names.json");
  fs.writeFileSync(nf, JSON.stringify({ "p2-03": ["Lena Anders", "Raj Bhatt", "Tidewell Freight"], "p2-04": ["Gallo", "Hoang"], "p2-05": ["Madsen"] }));
  r = run(["--root", tmp, "--names", nf]);
  check("X3: moi ten thuoc danh sach cua unit -> thoat 0; unit chua co du lieu chi ghi chu", r.code === 0 && /ghi chu: --names: unit p2-05 chua co du lieu/.test(r.out), r.out);
  fs.writeFileSync(nf, JSON.stringify({ "p2-03": ["Anders"], "p2-04": ["Gallo", "Hoang"] }));
  r = run(["--root", tmp, "--names", nf]);
  check("X3: ten ngoai danh sach -> loi", r.code === 1 && /LOI X3: p2-03: ten "Bhatt"/.test(r.out), r.out);
  u = clean(); u[0].sentences.push({ id: "s7", en: "Mr. Dunlap called on Fridays near Granite Street in March." });
  put(u); fs.writeFileSync(nf, JSON.stringify({ "p2-03": ["Anders", "Bhatt", "Granite Row"] }));
  r = run(["--root", tmp, "--names", nf]);
  check("nhan ten: bat ten sau Mr.; bo qua thu, thang, tu chung (Street)", r.code === 1 && /ten "Dunlap"/.test(r.out) && !/ten "(Mr|Fridays|Street|March|Our|Please)"/.test(r.out), r.out);

  /* X3 chinh xac: ten cua danh sach unit khac, ke ca dau cau va ten trung tu thuong */
  const pools = { "p2-03": ["Anders", "Bhatt", "Tidewell Freight"], "p2-04": ["Gallo", "Hoang", "Bill", "Page", "Stonemere Bank", "Cobbler Street"], "p2-05": ["Hill", "Marlow Packaging"] };
  fs.writeFileSync(nf, JSON.stringify(pools));
  const x3 = (lines03) => { const w = clean(); w[0].sentences.push(...lines03.map((t, i) => ({ id: "z" + i, en: t }))); w[1].sentences.push({ id: "b1", en: "The bill is on the first page near the hill." }); put(w); return run(["--root", tmp, "--names", nf]); };
  r = x3(["Bill will join the call after lunch today."]);
  check("X3: ten o dau cau trung tu thuong (Bill) cua unit khac -> loi", r.code === 1 && /LOI X3: p2-03: "Bill" \(z0\) thuoc danh sach ten cua p2-04/.test(r.out) && !/LOI X3: p2-04/.test(r.out), r.out);
  r = x3(["Gallo asked for another copy of the form.", "Please see Mr. Hill about the damaged crate."]);
  check("X3: ten dau cau va ten sau Mr. cua unit khac -> loi, chi mot dong cho moi ten", r.code === 1 && (r.out.match(/LOI X3: p2-03: "Gallo"/g) || []).length === 1 && (r.out.match(/LOI X3: p2-03: .*"Hill"/g) || []).length === 1, r.out);
  r = x3(["The shipment goes to Stonemere Bank on Friday.", "Marlow sent the boxes this morning."]);
  check("X3: ca cum to chuc va tu rieng biet cua cum -> loi (khong bao lai tung tu cua cum da bao)", r.code === 1 && /"Stonemere Bank"/.test(r.out) && !/p2-03: "Stonemere" /.test(r.out) && /"Marlow"/.test(r.out), r.out);
  r = x3(["The bank closes early near the freight street.", "Bank staff will check the packaging on the page.", "Street parking is free for our freight drivers.", "Please bill the client for the page count."]);
  check("X3: tu thuong (ke ca dau cau: Bank, Street) va 'bill'/'page' chu thuong khong bi gan", r.code === 0, r.out);
  r = x3(["Tidewell Freight will call Anders about the pallets."]);
  check("X3: ten trong danh sach cua chinh unit khong bi gan", r.code === 0, r.out);

  /* bai dien: chu hoa cua dap an o dau cau / sau goi y khong phai ten rieng */
  const FILL = (items) => [{ id: "fill1", type: "fill", items: items.map((x, i) => ({ id: "fill1-" + i, before: x[0], answers: x[1], after: x[2] })) }];
  const two2 = (a, b) => { const w = clean(); w[0].exercises = FILL(a); w[1].exercises = FILL(b); put(w); };
  const linkers = (tail) => [
    ["The " + tail + " lake path is longer than the road. (H...)", ["However"], ", most walkers like " + tail + "."],
    ["A storm damaged the " + tail + " roof. (T...)", ["Therefore", "therefore"], ", the " + tail + " show moved."],
    ["Keep your " + tail + " pass close. (O...)", ["Otherwise"], ", the " + tail + " guard will stop you."],
    ["First, slice the " + tail + " apples. (A...)", ["Afterward"], ", dry them."],
    ["", ["Meanwhile"], ", the " + tail + " team waited."],
    ["Bring the " + tail + " form; [m...]", ["Moreover"], ", sign it."],
    ["One more " + tail + " thing —", ["Besides"], ", it is late."],
  ];
  two2(linkers("north"), linkers("south"));
  r = run(["--root", tmp, "--list-names"]);
  check("bai dien: However/Therefore/Otherwise/Afterward/... o dau cau hoac sau goi y khong bi coi la ten", r.code === 0 && !/However|Therefore|Otherwise|Afterward|Meanwhile|Moreover|Besides/.test(r.out), r.out);
  fs.writeFileSync(nf, JSON.stringify({ "p2-03": ["Anders", "Bhatt"], "p2-04": ["Gallo", "Hoang"] }));
  r = run(["--root", tmp, "--names", nf]);
  check("bai dien: cung khong bi X3 khi co --names", r.code === 0, r.out);
  const bothNames = (item) => { two2([item], [[item[0], item[1], item[2] + " Then we left the north office."]]); return run(["--root", tmp]); };
  r = bothNames(["Please send the file to", ["Quentin"], "before noon."]);
  check("bai dien: ten la dap an GIUA cau van bi phat hien", r.code === 1 && /LOI X2: ten "Quentin"/.test(r.out), r.out);
  r = bothNames(["Please call Mr.", ["Quentin"], "before noon."]);
  check("bai dien: dap an sau Mr. van bi phat hien", r.code === 1 && /LOI X2: ten "Quentin"/.test(r.out), r.out);
  r = bothNames(["The form is ready. (H...)", ["However"], ", ask Quentin to sign it."]);
  check("bai dien: ten o phan after van bi phat hien, tu noi thi khong", r.code === 1 && /LOI X2: ten "Quentin"/.test(r.out) && !/ten "However"/.test(r.out), r.out);
  r = bothNames(["We met Quentin at the gate. (H...)", ["However"], ", he left early."]);
  check("bai dien: ten o phan before van bi phat hien", r.code === 1 && /LOI X2: ten "Quentin"/.test(r.out), r.out);
  { const w = clean(); w[0].exercises = FILL([["", ["Quentin"], "will open the gate."]]); w[1].sentences.push({ id: "q1", en: "Please give the key to Quentin tonight." }); put(w); }
  r = run(["--root", tmp]);
  check("bai dien: ten o dau cau van bi tinh khi noi khac dung no giua cau", r.code === 1 && /LOI X2: ten "Quentin" dung chung o p2-03.*p2-04/.test(r.out), r.out);
  two2([["", ["Gallo"], "will open the gate."]], []);
  r = run(["--root", tmp, "--names", nf]);
  check("bai dien: ten trong danh sach unit khac dung o dau cau van bi X3 (kiem chinh xac)", r.code === 1 && /LOI X3: p2-03: "Gallo"/.test(r.out), r.out);

  /* X5 khoa "vi" */
  u = clean(); u[0].sentences[0].vi = "Xem dòng 4 trong bài."; put(u); r = run(["--root", tmp]);
  check("X5: khoa vi (khong chi *_vi) cung bi kiem", r.code === 1 && /LOI X5: p2-03: sentences\[s0\]\.vi nhac "dòng 4"/.test(r.out), r.out);
  check("tach cau: A.M./P.M. cuoi cau van tach; truoc thu/thang thi khong", sentencesOf("We close at 5 P.M. The staff leave later.").length === 2 && sentencesOf("Come at 9 A.M. Monday, please.").length === 1 && sentencesOf("Prof. Han lives on St. John Road.").length === 1);

  /* X4, X5 */
  u = clean(); u[0].exercises = qrU("p2-03", ["ABCABCAB"]).exercises; u[1].sentences.push({ id: "s6", en: "x" }); u[1].focus.tips = [{ id: "t1", text_vi: "Xem dòng 2.", examples: [] }];
  put(u); r = run(["--root", tmp]);
  check("X4 va X5 tren unit moi -> loi", r.code === 1 && /LOI X4: p2-03: cau qr thu 1-8 lap chu ky 3/.test(r.out) && /LOI X5: p2-04: focus\.tips\[t1\]\.text_vi nhac "dòng 2"/.test(r.out), r.out);
  fs.writeFileSync(nf, "[1]");
  check("tham so sai / --names sai dinh dang / thieu catalog -> thoat 2", run(["--bogus"]).code === 2 && run(["--root", tmp, "--names", nf]).code === 2 && run(["--root", path.join(tmp, "khong-co")]).code === 2);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log("\ntest-check-cross: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
