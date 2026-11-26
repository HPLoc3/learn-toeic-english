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
