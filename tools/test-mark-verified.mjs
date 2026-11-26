// Kiem tra tools/mark-verified.mjs. Chay: node tools/test-mark-verified.mjs  (chi ghi trong thu muc tam)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stripUnverified, countUnverified } from "./mark-verified.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REAL = path.resolve(here, "..");
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (extra ? "\n     " + extra : "")); }
}
const SRC = `window.BS_UNITS = window.BS_UNITS || {};
/* chu thich: "v": {"status":"unverified"} khong bi dong vao */
window.BS_UNITS["t-01"] = {
  "id": "t-01",
  "v": {"status":"unverified","note":"cau {a}, \\"b\\" }"},
  "note_vi": "chuoi co , \\"v\\": {\\"status\\":\\"unverified\\"} ben trong",
  "items": [
    { "id": "a", "v": { "status": "unverified" }, "en": "x" },
    { "id": "b", "en": "y", "v": {
        "status": "unverified",
        "note": "nhieu dong"
      }
    },
    { id: 'c', v: { status: 'unverified' } },
    { "id": "d", "v": { "status": "verified" } },
    { "v": {"status":"unverified"} }
  ]
};
`;
const load = (code) => { const w = {}; w.window = w; vm.runInNewContext(code, w); return JSON.parse(JSON.stringify(w.BS_UNITS["t-01"])); };
const r = stripUnverified(SRC), u = load(r.text);
check("cat du 5 thuoc tinh unverified (mot dong, thuoc tinh cuoi, nhieu dong, khoa khong ngoac, doi tuong chi co v)", r.removed === 5 && countUnverified(u) === 0, r.text);
check("giu v co status khac, chu thich va chuoi chua chu v; du lieu con lai khong doi", u.items[3].v.status === "verified" && r.text.includes('/* chu thich: "v": {"status":"unverified"}') && u.note_vi.includes("unverified") && u.items.map((x) => x.id || "-").join() === "a,b,c,d,-" && u.items[0].en === "x" && u.items[1].en === "y");
check("dong chi chua v bi bo ca dong (khong de lai dong trong)", !/\n[ \t]*\n/.test(r.text), r.text);
const crlf = stripUnverified(SRC.replace(/\n/g, "\r\n"));
check("tep CRLF: van giu CRLF", crlf.removed === 5 && !/[^\r]\n/.test(crlf.text));
check("khong co gi de bo: van ban giu nguyen", stripUnverified(r.text).removed === 0 && stripUnverified(r.text).text === r.text);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mv-"));
try {
  fs.mkdirSync(path.join(tmp, "data"));
  const f = path.join(tmp, "data/t-01.js");
  const run = (args) => { const x = spawnSync(process.execPath, [path.join(REAL, "tools/mark-verified.mjs"), "--root", tmp].concat(args), { encoding: "utf8" }); return { code: x.status, out: x.stdout + x.stderr }; };
  fs.writeFileSync(f, SRC);
  let x = run(["--unit", "t-01"]);
  check("CLI: ghi tep, bao so muc", x.code === 0 && /da bo 5 thuoc tinh/.test(x.out) && countUnverified(load(fs.readFileSync(f, "utf8"))) === 0, x.out);
  x = run(["--unit", "t-01"]);
  check("CLI: chay lai khong doi gi", x.code === 0 && /da bo 0 /.test(x.out) && fs.readFileSync(f, "utf8") === r.text, x.out);
  const via = 'var V = {status:"unverified"};\nwindow.BS_UNITS = {};\nwindow.BS_UNITS["t-01"] = { id: "t-01", v: V };\n';
  fs.writeFileSync(f, via);
  x = run(["--unit", "t-01"]);
  check("CLI: v gan qua bien (khong cat duoc) -> ma 1, tep giu nguyen", x.code === 1 && fs.readFileSync(f, "utf8") === via, x.out);
  check("CLI: thieu --unit, unit khong co, tham so la -> ma 2", run([]).code === 2 && run(["--unit", "t-99"]).code === 2 && run(["--unit", "t-01", "--x"]).code === 2);
  /* fixture that co v unverified: qua mark-verified roi nap lai */
  const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync(path.join(REAL, "tools/fixtures/read-fail.js"), "utf8"), w);
  const fx = JSON.parse(JSON.stringify(w.BS_UNITS["p7-01"]));
  const n = countUnverified(fx);
  fs.writeFileSync(path.join(tmp, "data/p7-01.js"), "window.BS_UNITS = window.BS_UNITS || {};\nwindow.BS_UNITS['p7-01'] = " + JSON.stringify(fx, null, 2) + ";\n");
  x = run(["--unit", "p7-01"]);
  const w2 = {}; w2.window = w2; vm.runInNewContext(fs.readFileSync(path.join(tmp, "data/p7-01.js"), "utf8"), w2);
  check("CLI: du lieu dang JSON thut le (read-fail co " + n + " muc): cat het", n > 0 && x.code === 0 && countUnverified(w2.BS_UNITS["p7-01"]) === 0, x.out);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log("\ntest-mark-verified: " + pass + " đạt, " + fail + " lỗi");
process.exit(fail ? 1 : 0);
