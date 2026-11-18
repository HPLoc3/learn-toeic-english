/* test-srs.mjs - kiem tra luat on tap (node, vm, khong phu thuoc). Chay: node tools/test-srs.mjs */
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let NOW = new Date(2026, 5, 10, 12, 0, 0).getTime(); // 2026-06-10 gio may
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(NOW); }
  static now() { return NOW; }
}
const setDay = (y, m, d) => { NOW = new Date(y, m - 1, d, 12, 0, 0).getTime(); };

function makeEnv(seed) {
  const store = {};
  if (seed) store["tungbuoc.v1"] = JSON.stringify(seed);
  const ctx = {
    Date: FakeDate, console, setTimeout, clearTimeout, URLSearchParams, JSON, Math, Object, Array, Number, String, RegExp,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: { readyState: "complete", getElementById: () => null, createEvent: () => ({ initCustomEvent() {} }), dispatchEvent() {}, addEventListener() {}, documentElement: { setAttribute() {}, removeAttribute() {} }, body: null },
    location: { hostname: "example.com", protocol: "https:", search: "" },
  };
  ctx.window = ctx;
  ctx.addEventListener = () => {};
  ctx.matchMedia = () => ({ matches: false });
  vm.createContext(ctx);
  vm.runInContext(read("assets/js/core.js"), ctx, { filename: "core.js" });
  vm.runInContext(read("assets/js/srs.js"), ctx, { filename: "srs.js" });
  return { ctx, BS: ctx.BS, store };
}

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log("  ok   " + name); }
  catch (e) { fail++; console.log("  FAIL " + name + "\n       " + e.message); }
}
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || "") + " got " + JSON.stringify(a) + " expected " + JSON.stringify(b)); }
function ok(c, msg) { if (!c) throw new Error(msg || "assert"); }

setDay(2026, 6, 10);
t("API ton tai", () => {
  const { BS } = makeEnv();
  ok(BS.srs && typeof BS.srs.grade === "function" && typeof BS.srs.due === "function");
  eq(BS.srs.INTERVALS, [0, 1, 3, 7, 14, 30]);
});
t("the chua hoc khong den han, get tra null", () => {
  const { BS } = makeEnv();
  eq(BS.srs.get("l01", "v001"), null);
  eq(BS.srs.due("l01", ["v001", "v002"]).length, 0);
  eq(BS.srs.dueCount(), 0);
});
t("nho lien tiep trong 1 ngay chi len 1 hop", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  let e = BS.srs.grade("l01", "v001", true);
  eq(e.b, 1); eq(e.d, "2026-06-11");
  e = BS.srs.grade("l01", "v001", true);
  eq(e.b, 1, "lan 2");
  e = BS.srs.grade("l01", "v001", true);
  eq(e.b, 1, "lan 3"); eq(e.n, 3);
});
t("hop tang moi ngay theo INTERVALS", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  let day = new Date(2026, 5, 10);
  const exp = [1, 3, 7, 14, 30];
  const boxes = [];
  for (let i = 0; i < 5; i++) {
    setDay(day.getFullYear(), day.getMonth() + 1, day.getDate());
    const e = BS.srs.grade("l01", "v001", true);
    boxes.push(e.b);
    const d2 = new Date(day.getFullYear(), day.getMonth(), day.getDate() + exp[i]);
    eq(e.d, BS.dayKey(d2), "han buoc " + i);
    day = d2;
  }
  eq(boxes, [1, 2, 3, 4, 5]);
  setDay(day.getFullYear(), day.getMonth() + 1, day.getDate());
  eq(BS.srs.grade("l01", "v001", true).b, 5, "tran hop 5");
});
t("quen dua b ve 0, han hom nay, w tang", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  BS.srs.grade("l01", "v001", true);
  setDay(2026, 6, 11);
  BS.srs.grade("l01", "v001", true);
  setDay(2026, 6, 14);
  const e = BS.srs.grade("l01", "v001", false);
  eq(e.b, 0); eq(e.d, "2026-06-14"); eq(e.w, 1); eq(e.n, 3);
  eq(BS.srs.due("l01", ["v001"]).length, 1, "van den han de quay lai cuoi phien");
});
t("w>=3 giam nua khoang cach", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  for (let i = 0; i < 3; i++) BS.srs.grade("l01", "v001", false); // w=3, b=0
  setDay(2026, 6, 11);
  BS.srs.grade("l01", "v001", true); // b=1
  setDay(2026, 6, 12);
  let e = BS.srs.grade("l01", "v001", true); // b=2: 3*0.5=1.5 -> 2
  eq(e.b, 2); eq(e.d, "2026-06-14");
  setDay(2026, 6, 14);
  e = BS.srs.grade("l01", "v001", true); // b=3: 7*.5=3.5 -> 4
  eq(e.d, "2026-06-18");
  // doi chung: w=0 thi b=3 cach 7 ngay
  setDay(2026, 6, 10);
  const { BS: B2 } = makeEnv();
  B2.srs.grade("l01", "x", true);
  setDay(2026, 6, 11); B2.srs.grade("l01", "x", true);
  setDay(2026, 6, 14); e = B2.srs.grade("l01", "x", true);
  eq(e.b, 3); eq(e.d, "2026-06-21");
});
t("the known cu: rai 3 ngay tu moc co dinh, qua han dan, get/due khong ghi state", () => {
  const ids = [];
  for (let i = 0; i < 30; i++) ids.push("v" + String(i).padStart(3, "0"));
  const known = {};
  ids.forEach((i) => { known[i] = 1; });
  setDay(2026, 11, 17);
  const { BS, store } = makeEnv({ v: 1, units: { l01: { known } } });
  const before = JSON.stringify(BS.state);
  const stored0 = store["tungbuoc.v1"];
  eq(BS.srs.due("l01", ids).length, 0, "truoc moc: chua den han");
  const sizes = [];
  for (let k = 0; k < 5; k++) {
    setDay(2026, 11, 18 + k);
    const d = BS.srs.due("l01", ids);
    sizes.push(d.length);
    ok(BS.srs.get("l01", ids[0]).virtual && BS.srs.get("l01", ids[0]).b === 1);
    eq(BS.srs.dueCount(), d.length);
  }
  ok(sizes[0] > 0 && sizes[0] < 30, "ngay dau chi mot phan: " + sizes);
  ok(sizes[0] <= sizes[1] && sizes[1] <= sizes[2], "tang dan: " + sizes);
  eq(sizes[2], 30, "sau 3 ngay du 30 the");
  eq(sizes[4], 30, "khong bien mat khi bo lo");
  const dd = BS.srs.due("l01", ids);
  ok(dd.some((x) => x.over > 0), "co the qua han");
  eq(JSON.stringify(BS.state), before, "state khong doi");
  eq(store["tungbuoc.v1"], stored0, "localStorage khong doi");
  ok(!Object.keys(BS.state.units.l01.srs).length, "srs van rong");
});
t("tab Tu vung: nho khi chua den han khong len hop", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  BS.srs.grade("l01", "v001", true); // b1, han 06-11
  for (let k = 1; k <= 6; k++) {
    const e = BS.srs.grade("l01", "v001", true);
    eq(e.b, 1, "chua den han, lan " + k);
    eq(e.d, "2026-06-11");
  }
  eq(BS.srs.get("l01", "v001").n, 7);
  setDay(2026, 6, 11); // den han
  eq(BS.srs.grade("l01", "v001", true).b, 2);
  setDay(2026, 6, 12); // chua den han (han 06-14); quen van dat lai
  eq(BS.srs.grade("l01", "v001", true).b, 2);
  eq(BS.srs.grade("l01", "v001", false).b, 0);
});
t("dong ho lui coi nhu hom nay", () => {
  setDay(2026, 6, 20);
  const { BS } = makeEnv();
  BS.srs.grade("l01", "v001", true); // l = 06-20
  setDay(2026, 6, 15); // lui
  eq(BS.srs.get("l01", "v001").l, "2026-06-15");
  const e = BS.srs.grade("l01", "v001", true); // da len "hom nay" -> giu b
  eq(e.b, 1); eq(e.l, "2026-06-15");
});
t("loc id mo coi khi unit da nap", () => {
  setDay(2026, 11, 25);
  const seed = { v: 1, units: { l01: { known: { v001: 1, gone: 1 } } } };
  const { ctx, BS } = makeEnv(seed);
  ctx.BS_UNITS = { l01: { vocab: [{ id: "v001" }], phrases: [] } };
  eq(BS.srs.summary().due, 1);
  const { BS: B2 } = makeEnv(seed);
  eq(B2.srs.summary().due, 2, "chua nap: tinh het");
});
t("summary chi dem unit thuoc availableUnits", () => {
  setDay(2026, 11, 25);
  const seed = { v: 1, units: { l01: { known: { v001: 1 } }, l02: { known: { v001: 1 } } } };
  const { BS } = makeEnv(seed);
  eq(BS.srs.summary().due, 2);
  BS.availableUnits = () => [{ id: "l01" }];
  eq(BS.srs.summary().due, 1);
  eq(BS.srs.summary().next, null);
});
t("sap xep due: qua han lau, hop thap, quen nhieu", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  const u = BS.unit("l01");
  u.srs.a = { b: 3, d: "2026-06-08", l: "2026-06-01", w: 0, n: 2 }; // qua han 2
  u.srs.b = { b: 1, d: "2026-06-10", l: "2026-06-09", w: 0, n: 2 }; // 0, box1
  u.srs.c = { b: 0, d: "2026-06-10", l: "2026-06-10", w: 4, n: 5 }; // 0, box0, w4
  u.srs.d = { b: 0, d: "2026-06-10", l: "2026-06-10", w: 1, n: 5 }; // 0, box0, w1
  u.srs.e = { b: 2, d: "2026-06-05", l: "2026-06-01", w: 0, n: 2 }; // qua han 5
  u.srs.f = { b: 2, d: "2026-06-11", l: "2026-06-10", w: 0, n: 2 }; // chua den
  eq(BS.srs.due("l01", ["a", "b", "c", "d", "e", "f", "zz"]).map((x) => x.id), ["e", "a", "c", "d", "b"]);
});
t("nextLabel", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  eq(BS.srs.nextLabel({ d: "2026-06-10" }), "Đến hạn ôn");
  eq(BS.srs.nextLabel({ d: "2026-06-13" }), "Ôn lại sau 3 ngày");
  eq(BS.srs.nextLabel({ d: "2026-06-11" }), "Ôn lại ngày mai");
});
t("XP: on cung the 2 lan/ngay chi +1 XP lap", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  BS.srs.review("l01", "v001", false);
  eq(BS.state.xp.days["2026-06-10"].rep, 1);
  BS.srs.review("l01", "v001", false);
  eq(BS.state.xp.days["2026-06-10"].rep, 1);
  eq(BS.state.xp.total, 1);
});
t("XP: nho tren the chua known -> known=1, +5 mot lan; khong nhan doi", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  BS.srs.review("l01", "v001", true);
  eq(BS.state.units.l01.known.v001, 1);
  eq(BS.state.xp.total, 6);
  BS.srs.review("l01", "v001", true);
  eq(BS.state.xp.total, 6);
  const { BS: B2 } = makeEnv();
  B2.addXP(1, { once: "l01:r:v002:" + B2.dayKey(), rep: true }); // tab Tu vung da tinh khoa chung
  B2.srs.review("l01", "v002", false);
  eq(B2.state.xp.total, 1);
});
t("XP: sau khi rep dat 60 thi khong tang them", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv();
  for (let i = 0; i < 70; i++) BS.srs.review("l01", "w" + i, false);
  eq(BS.state.xp.days["2026-06-10"].rep, 60);
  eq(BS.state.xp.total, 60);
});
t("'Quen' khong xoa known", () => {
  setDay(2026, 6, 10);
  const { BS } = makeEnv({ v: 1, units: { l01: { known: { v001: 1 } } } });
  BS.srs.review("l01", "v001", false);
  eq(BS.state.units.l01.known.v001, 1);
  eq(BS.srs.get("l01", "v001").b, 0);
});
t("grade luu vao localStorage (BS.save)", () => {
  setDay(2026, 6, 10);
  const { BS, store } = makeEnv();
  BS.srs.grade("l01", "v001", true);
  const o = JSON.parse(store["tungbuoc.v1"]);
  eq(o.units.l01.srs.v001.b, 1);
});

console.log("\n" + pass + "/" + (pass + fail) + " ca dat");
process.exit(fail ? 1 : 0);
