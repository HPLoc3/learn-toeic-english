// Kiem tra logic backup.js bang node (khong phu thuoc). Chay: node tools/test-backup.mjs
import vm from "node:vm";
import fs from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "..", "assets", "js", "backup.js"), "utf8");
const win = {};
const ctx = vm.createContext({ window: win, console });
vm.runInContext(src, ctx);
const B = win.BSBackup;
const TODAY = "2026-11-18";

let pass = 0, total = 0;
function t(name, fn) {
  total++;
  try { fn(); pass++; console.log("  dat  " + name); }
  catch (e) { console.log("  LOI  " + name + "\n       " + e.message.split("\n")[0]); }
}
const J = (o) => JSON.stringify(o);
const wrap = (data, extra) => J(Object.assign({ app: "tungbuoc", format: 1, exported: "x", data }, extra || {}));
const plain = (o) => JSON.parse(JSON.stringify(o));

function sample() {
  return {
    v: 1,
    prefs: { theme: "dark", edit: 0, goal: 100, autoSpeak: 1, noTimer: 0, mascot: 1 },
    xp: {
      total: 500,
      days: { "2026-11-17": { xp: 40, rep: 30, hit: 1, hitGoal: 30 }, "2026-11-18": { xp: 20, rep: 10, hit: 0 } },
      streak: { n: 3, best: 7, last: "2026-11-18" },
      once: { "u1:v:w1": 1, "u1:r:c1:2026-11-18": 1 }
    },
    units: {
      u1: {
        known: { w1: 1, w2: 1 }, res: { q1: 1, q2: 0 },
        scores: { s1: { c: 3, t: 5, a: 2 } },
        ans: { q1: "abc", q2: true, q3: { t: "hi" } },
        last: { tab: "vocab", card: "w2" }, game: { best: 90, bestCombo: 5, plays: 4 },
        srs: { w1: { b: 3, d: "2026-11-20", l: "2026-11-17", w: 2, n: 5 } }
      }
    }
  };
}
const code = (txt) => { const r = B.parse(txt, TODAY); return r.ok ? "OK" : r.code; };

console.log("Kiem tra BSBackup");
t("API co parse/merge/summarize", () => { assert.equal(typeof B.parse, "function"); assert.equal(typeof B.merge, "function"); assert.equal(typeof B.summarize, "function"); });
t("tep > 1 MB -> QUA_LON", () => assert.equal(code(" ".repeat(1048577)), "QUA_LON"));
t("khong phai JSON -> KHONG_PHAI_JSON", () => { assert.equal(code("xin chao"), "KHONG_PHAI_JSON"); assert.equal(code("[1,2]"), "KHONG_PHAI_JSON"); });
t("sai app -> SAI_UNG_DUNG", () => assert.equal(code(J({ app: "khac", format: 1, data: { units: {} } })), "SAI_UNG_DUNG"));
t("sai format -> SAI_PHIEN_BAN", () => assert.equal(code(J({ app: "tungbuoc", format: 2, data: { units: {} } })), "SAI_PHIEN_BAN"));
t("units la mang -> SAI_CAU_TRUC", () => { const r = B.parse(wrap({ units: [] }), TODAY); assert.equal(r.code, "SAI_CAU_TRUC"); assert.match(r.msg, /units/); });
t("total am -> SAI_CAU_TRUC kem ten truong", () => { const s = sample(); s.xp.total = -5; const r = B.parse(wrap(s), TODAY); assert.equal(r.code, "SAI_CAU_TRUC"); assert.match(r.msg, /xp\.total/); });
t("total 1e99 -> SAI_CAU_TRUC", () => { const s = sample(); const txt = wrap(s).replace('"total":500', '"total":1e99'); assert.equal(code(txt), "SAI_CAU_TRUC"); });
t("ngay tuong lai trong xp.days: bo va dem, tep van nhap duoc", () => {
  const s = sample(); s.xp.days["2030-01-01"] = { xp: 5 };
  const r = B.parse(wrap(s), TODAY); assert.ok(r.ok); assert.equal(r.data.xp.days["2030-01-01"], undefined); assert.equal(r.dropped, 1);
  assert.equal(Object.keys(r.data.xp.days).length, 2);
});
t("xuat 18/11 nhap tren may 17/11 (dong ho lui): khong bi tu choi", () => {
  const r = B.parse(B.buildFile(sample()), "2026-11-17"); assert.ok(r.ok); assert.equal(r.data.xp.days["2026-11-18"], undefined);
});
t("ans 501 ky tu bi cat con 500 (chuoi va {t})", () => {
  const s = sample(); s.units.u1.ans.q1 = "x".repeat(501); s.units.u1.ans.q3 = { t: "y".repeat(900) };
  const r = B.parse(wrap(s), TODAY); assert.ok(r.ok);
  assert.equal(r.data.units.u1.ans.q1.length, 500); assert.equal(r.data.units.u1.ans.q3.t.length, 500);
});
t("hoan tac: ban .bak (buildFile cua state cu) qua parse nguyen ven, bo ngay tuong lai", () => {
  const old = sample(); old.xp.days["2031-01-01"] = { xp: 9 };
  const r = B.parse(B.buildFile(old), TODAY); assert.ok(r.ok);
  assert.equal(r.data.xp.total, 500); assert.equal(r.data.xp.days["2031-01-01"], undefined);
  assert.equal(B.parse(B.buildFile({ units: [] }), TODAY).ok, false); // .bak hong -> khong nap
});
t("streak.last tuong lai -> n=0, last rong", () => { const s = sample(); s.xp.streak = { n: 9, best: 9, last: "2030-01-01" }; const r = B.parse(wrap(s), TODAY); assert.ok(r.ok); assert.equal(r.data.xp.streak.n, 0); assert.equal(r.data.xp.streak.last, ""); });
t("__proto__/constructor khong lam o nhiem Object.prototype", () => {
  const txt = '{"app":"tungbuoc","format":1,"data":{"__proto__":{"polluted":1},"units":{"__proto__":{"polluted":1},"constructor":{},"u1":{"__proto__":{"polluted":1},"known":{"__proto__":1,"w1":1}}},"xp":{"once":{"__proto__":1}}}}';
  const r = B.parse(txt, TODAY);
  assert.ok(r.ok);
  assert.equal(({}).polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
  assert.deepEqual(Object.keys(r.data.units), ["u1"]);
  assert.deepEqual(Object.keys(r.data.units.u1.known), ["w1"]);
  assert.ok(r.dropped >= 5);
});
t("khoa la bi bo va dem", () => {
  const s = sample(); s.bonus = 1; s.units.u1.rac = 2; s.units.u1.scores.s1.z = 1; s.prefs.mau = "x";
  const r = B.parse(wrap(s), TODAY);
  assert.ok(r.ok); assert.equal(r.dropped, 4);
  assert.equal(r.data.bonus, undefined); assert.equal(r.data.units.u1.rac, undefined);
});
t("50k khoa once -> bi tu choi (SAI_CAU_TRUC, gioi han 20000)", () => {
  const s = sample(); const once = {};
  for (let i = 0; i < 50000; i++) once["u:v:" + i] = 1;
  s.xp.once = once;
  const txt = wrap(s);
  const r = B.parse(txt, TODAY);
  assert.equal(r.ok, false);
  assert.ok(r.code === "SAI_CAU_TRUC" || r.code === "QUA_LON");
});
t("20000 khoa once hop le van chap nhan", () => {
  const s = sample(); const once = {};
  for (let i = 0; i < 20000; i++) once["u:v:" + i] = 1;
  s.xp.once = once;
  const r = B.parse(wrap(s), TODAY); assert.ok(r.ok); assert.equal(Object.keys(r.data.xp.once).length, 20000);
});
t("khoa once sai dinh dang bi bo; gia tri khac 1 -> tu choi", () => {
  const s = sample(); s.xp.once["khong hop le!"] = 1;
  const r = B.parse(wrap(s), TODAY); assert.ok(r.ok); assert.ok(r.dropped >= 1);
  const s2 = sample(); s2.xp.once["u1:v:w1"] = 2; assert.equal(code(wrap(s2)), "SAI_CAU_TRUC");
});
t("scores c>t bi tu choi; prefs.goal sai bi tu choi", () => {
  const s = sample(); s.units.u1.scores.s1 = { c: 9, t: 5, a: 1 }; assert.equal(code(wrap(s)), "SAI_CAU_TRUC");
  const s2 = sample(); s2.prefs.goal = 77; assert.equal(code(wrap(s2)), "SAI_CAU_TRUC");
});
t("xuat roi nhap kieu thay the cho state y het (edit=0)", () => {
  const s = sample();
  const file = B.buildFile(s, new Date(2026, 10, 18, 9, 5));
  const r = B.parse(file, TODAY);
  assert.ok(r.ok, r.msg); assert.equal(r.dropped, 0);
  const expect = plain(s); delete expect.prefs.edit;
  assert.deepEqual(plain(r.data), expect);
});
t("prefs.mascot 0/1 di-ve nguyen ven; 2 bi tu choi; ban cu thieu khoa van nhap duoc", () => {
  for (const v of [0, 1]) {
    const s = sample(); s.prefs.mascot = v;
    const r = B.parse(B.buildFile(s, new Date(2026, 10, 18, 9, 5)), TODAY);
    assert.ok(r.ok, r.msg); assert.equal(r.dropped, 0); assert.strictEqual(r.data.prefs.mascot, v);
  }
  const s2 = sample(); s2.prefs.mascot = 2; assert.equal(code(wrap(s2)), "SAI_CAU_TRUC");
  const s3 = sample(); s3.prefs.mascot = true; assert.equal(code(wrap(s3)), "SAI_CAU_TRUC");
  const old = sample(); delete old.prefs.mascot;
  const r4 = B.parse(wrap(old), TODAY); assert.ok(r4.ok, r4.msg); assert.equal(r4.dropped, 0); assert.equal(r4.data.prefs.mascot, undefined);
});
t("prefs.animSpeak 0/1 di-ve nguyen ven (khong bi bo); 2 bi tu choi", () => {
  [0, 1].forEach((v) => { const s = sample(); s.prefs.animSpeak = v; const r = B.parse(wrap(s), TODAY); assert.ok(r.ok, r.msg); assert.equal(r.dropped, 0); assert.strictEqual(r.data.prefs.animSpeak, v); });
  const s2 = sample(); s2.prefs.animSpeak = 2; assert.equal(code(wrap(s2)), "SAI_CAU_TRUC");
});
t("buoc xuat dat prefs.edit = 0", () => {
  const s = sample(); s.prefs.edit = 1;
  assert.equal(JSON.parse(B.buildFile(s)).data.prefs.edit, 0);
});
t("gop file voi chinh no khong tang xp.total/rep", () => {
  const s = sample(); const r = B.parse(B.buildFile(s), TODAY);
  const m = B.merge(s, r.data);
  assert.equal(m.xp.total, 500);
  assert.equal(m.xp.days["2026-11-17"].rep, 30); assert.equal(m.xp.days["2026-11-18"].xp, 20);
  assert.equal(m.xp.streak.n, 3);
  assert.deepEqual(plain(m.units.u1.known), s.units.u1.known);
  assert.deepEqual(plain(m.xp.once), s.xp.once);
  assert.deepEqual(plain(B.merge(m, r.data)), plain(m)); // luy dang
});
t("gop hai state: total=max, once=hop, streak dung luat", () => {
  const a = sample();
  const b = sample();
  b.xp.total = 900; b.xp.once = { "u2:v:x": 1 };
  b.xp.streak = { n: 2, best: 12, last: "2026-11-17" };
  b.xp.days["2026-11-17"] = { xp: 55, rep: 60, hit: 1, hitGoal: 50 };
  b.units.u1.known = { w3: 1 }; b.units.u1.res = { q1: 0, q2: 1 }; b.units.u1.ans = { q1: "B", q2: "Z" };
  b.units.u1.scores.s1 = { c: 5, t: 5, a: 4 };
  b.units.u1.game = { best: 50, bestCombo: 9, plays: 10 };
  b.units.u1.srs.w1 = { b: 1, d: "2026-11-19", l: "2026-11-18", w: 0, n: 6 };
  b.units.u1.last = { tab: "quiz", card: "x" };
  b.prefs.theme = "light";
  const m = B.merge(a, b);
  assert.equal(m.xp.total, 900);
  assert.deepEqual(Object.keys(m.xp.once).sort(), ["u1:r:c1:2026-11-18", "u1:v:w1", "u2:v:x"]);
  assert.equal(m.xp.streak.n, 3); assert.equal(m.xp.streak.last, "2026-11-18"); assert.equal(m.xp.streak.best, 12);
  assert.equal(m.xp.days["2026-11-17"].xp, 55); assert.equal(m.xp.days["2026-11-17"].rep, 60);
  assert.deepEqual(Object.keys(m.units.u1.known).sort(), ["w1", "w2", "w3"]);
  assert.equal(m.units.u1.res.q1, 1); assert.equal(m.units.u1.ans.q1, "abc");
  assert.equal(m.units.u1.res.q2, 1); assert.equal(m.units.u1.ans.q2, "Z");
  assert.deepEqual(plain(m.units.u1.scores.s1), { c: 5, t: 5, a: 4 });
  assert.deepEqual(plain(m.units.u1.game), { best: 90, bestCombo: 9, plays: 10 });
  assert.equal(m.units.u1.srs.w1.l, "2026-11-18"); assert.equal(m.units.u1.srs.w1.n, 6);
  assert.equal(m.prefs.theme, "dark"); assert.deepEqual(plain(m.units.u1.last), { tab: "vocab", card: "w2" });
});
t("gop srs cung ngay lay hop thap hon; streak bang ngay lay n lon hon", () => {
  const a = { xp: { total: 1, days: {}, streak: { n: 2, best: 2, last: "2026-11-18" }, once: {} }, units: { u: { srs: { c: { b: 4, d: "2026-11-20", l: "2026-11-18", w: 0, n: 1 } } } } };
  const b = { xp: { total: 1, days: {}, streak: { n: 5, best: 5, last: "2026-11-18" }, once: {} }, units: { u: { srs: { c: { b: 2, d: "2026-11-19", l: "2026-11-18", w: 0, n: 1 } } } } };
  const m = B.merge(a, b);
  assert.equal(m.units.u.srs.c.b, 2); assert.equal(m.xp.streak.n, 5);
});
t("summarize dem dung", () => {
  const sm = B.summarize(sample());
  assert.deepEqual(plain(sm), { xp: 500, units: 1, cards: 2, streak: 3, best: 7 });
});

function fakeStore(failSetOn) {
  const m = new Map(); let n = 0;
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), removeItem: (k) => m.delete(k),
    setItem: (k, v) => { n++; if (n === failSetOn) throw new Error("quota"); m.set(k, v); } };
}
t("safeApply: importState false -> .bak cu duoc tra lai nguyen van", () => {
  const st = fakeStore(0); st.m.set("k.bak", "CU");
  assert.equal(B.safeApply(st, "k.bak", { a: 1 }, () => false), false);
  assert.equal(st.getItem("k.bak"), "CU");
});
t("safeApply: khong co .bak cu va ap dung that bai -> khong de lai .bak", () => {
  const st = fakeStore(0);
  assert.equal(B.safeApply(st, "k.bak", { a: 1 }, () => false), false);
  assert.equal(st.getItem("k.bak"), null);
});
t("safeApply: setItem .bak nem loi -> khong ap dung, .bak cu con", () => {
  const st = fakeStore(1); st.m.set("k.bak", "CU"); let called = false;
  assert.equal(B.safeApply(st, "k.bak", {}, () => { called = true; return true; }), false);
  assert.equal(called, false); assert.equal(st.getItem("k.bak"), "CU");
});
t("safeApply: thanh cong -> .bak = ban hien tai", () => {
  const st = fakeStore(0); st.m.set("k.bak", "CU");
  assert.equal(B.safeApply(st, "k.bak", { a: 1 }, () => true), true);
  assert.deepEqual(JSON.parse(st.getItem("k.bak")).data, { a: 1 });
});
t("id toString/valueOf duoc giu khi parse", () => {
  const s = sample(); s.units.u1.known.valueOf = 1; s.units.u1.known.hasOwnProperty = 1; s.units.u1.res.toString = 1;
  const r = B.parse(wrap(s), TODAY); assert.ok(r.ok); assert.equal(r.dropped, 0);
  assert.deepEqual(Object.keys(r.data.units.u1.known).sort(), ["hasOwnProperty", "valueOf", "w1", "w2"]);
  assert.equal(r.data.units.u1.res.toString, 1);
});
t("id toString/valueOf duoc giu khi gop (moi ben mot phia)", () => {
  const a = sample(); a.units.u1.res.toString = 1; a.units.u1.ans.valueOf = "A"; a.units.u1.scores.toString = { c: 1, t: 2, a: 1 };
  a.units.u1.srs.valueOf = { b: 1, d: "2026-11-19", l: "2026-11-18", w: 0, n: 1 }; a.xp.days.toString = { xp: 1 };
  const b = sample(); b.units.u2 = { known: { toString: 1 } }; b.units.u1.res.valueOf = 1; b.units.u1.ans.toString = "B";
  const m = B.merge(a, b);
  const u = m.units.u1;
  assert.equal(u.res.toString, 1); assert.equal(u.res.valueOf, 1);
  assert.equal(u.ans.valueOf, "A"); assert.equal(u.ans.toString, "B");
  assert.equal(u.scores.toString.a, 1); assert.equal(u.srs.valueOf.b, 1);
  assert.equal(m.units.u2.known.toString, 1); assert.equal(m.xp.days.toString.xp, 1);
});

console.log("\nKet qua: " + pass + "/" + total + " ca dat");
process.exit(pass === total ? 0 : 1);
