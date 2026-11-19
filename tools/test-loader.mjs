// Kiem tra assets/js/loader.js (loadAnim, loadUnit) bang node voi document gia. Chay: node tools/test-loader.mjs
import vm from "node:vm";
import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

let pass = 0, total = 0;
const queue = [];
function t(name, fn) { queue.push([name, fn]); }

/* moi ca co moi truong rieng: catalog that (co the sua), document gia ghi lai thu tu script */
function env(opts) {
  opts = opts || {};
  const added = [];
  const win = {};
  win.window = win;
  const doc = {
    head: {
      appendChild(s) {
        added.push({ src: s.src, async: s.async });
        setTimeout(() => {
          const f = opts.fail && opts.fail(s.src);
          if (f === "hang") return;
          if (f) { s.onerror && s.onerror(); return; }
          const m = /^data\/([a-z0-9]+)(-game|-anim)?\.js$/.exec(s.src);
          if (m && !m[2]) { (win.BS_UNITS = win.BS_UNITS || {})[m[1]] = { id: m[1] }; }
          if (m && m[2] === "-anim" && !opts.skipDef) { (win.BS_ANIMS = win.BS_ANIMS || {})[m[1]] = { id: m[1] }; }
          if (s.src === "assets/js/anim-scenes.js" && !opts.noScenes) win.BSScenes = { mount() {} };
          if (s.src === "assets/js/anim-engine.js") win.BSAnim = { mount() {} };
          if (s.src === "assets/js/anim-rig.js") win.BSRig = {};
          s.onload && s.onload();
        }, 0);
      }
    },
    createElement: () => ({}),
    dispatchEvent() { return true; },
    createEvent: () => ({ initCustomEvent() {} })
  };
  const ctx = vm.createContext({ window: win, document: doc, setTimeout, clearTimeout, console, CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; } });
  win.BS = { isEdit: () => !!opts.edit };
  vm.runInContext(rd("data/catalog.js"), ctx);
  if (opts.catalog) opts.catalog(win.BS_CATALOG);
  vm.runInContext(rd("assets/js/loader.js"), ctx);
  return { win, added, BS: win.BS };
}
const later = (BS, fn, id) => new Promise((res) => BS[fn](id, (v, e) => res({ v, e })));
const SCENES = "assets/js/anim-scenes.js";
const asKind = (kind) => (c) => { const u = c.parts[0].units[0]; u.animKind = kind; const v = c.parts[0].units[1]; v.available = true; v.anim = true; if (kind !== undefined) v.animKind = kind; };
const SHARED = ["assets/js/anim-engine.js", "assets/js/anim-rig.js", "assets/js/anim-cast.js"];

t("loadAnim(l01) nap dung thu tu engine, rig, cast, data va async=false", async () => {
  const E = env();
  const r = await later(E.BS, "loadAnim", "l01");
  assert.ok(r.v && r.v.id === "l01", "tra ve def");
  assert.deepEqual(E.added.map((x) => x.src), [...SHARED, "data/l01-anim.js"]);
  assert.ok(E.added.every((x) => x.async === false));
});
t("goi lan hai (cung unit) khong nap lai gi", async () => {
  const E = env();
  await later(E.BS, "loadAnim", "l01");
  const n = E.added.length;
  const r = await later(E.BS, "loadAnim", "l01");
  assert.ok(r.v);
  assert.equal(E.added.length, n);
});
t("unit khac: chi nap file du lieu cua unit do, khong nap lai 3 file chung", async () => {
  const E = env({ catalog: (c) => { const u = c.parts[0].units[1]; u.available = true; u.anim = true; } });
  await later(E.BS, "loadAnim", "l01");
  const r = await later(E.BS, "loadAnim", "l02");
  assert.ok(r.v && r.v.id === "l02");
  const srcs = E.added.map((x) => x.src);
  assert.deepEqual(srcs, [...SHARED, "data/l01-anim.js", "data/l02-anim.js"]);
});
t("hai loi goi dong thoi cung mot unit chi nap mot lan", async () => {
  const E = env();
  const [a, b] = await Promise.all([later(E.BS, "loadAnim", "l01"), later(E.BS, "loadAnim", "l01")]);
  assert.ok(a.v && b.v);
  assert.equal(E.added.length, 4);
});
t("id la / sai dinh dang -> null", async () => {
  const E = env();
  for (const id of ["zzz", "../x", "L01", "", null, 5]) {
    const r = await later(E.BS, "loadAnim", id);
    assert.equal(r.v, null, String(id));
  }
  assert.equal(E.added.length, 0);
});
t("unit chua available -> null (khong nap), tru khi localhost + che do bien tap", async () => {
  const mk = (c) => { const u = c.parts[0].units[1]; u.available = false; u.anim = true; };
  const E = env({ catalog: mk });
  assert.equal((await later(E.BS, "loadAnim", "l02")).v, null);
  assert.equal(E.added.length, 0);
  const E2 = env({ catalog: mk, edit: true });
  assert.ok((await later(E2.BS, "loadAnim", "l02")).v);
});
t("anim !== true (thieu, chuoi duong dan, 1) -> null", async () => {
  for (const val of [undefined, "assets/js/anim-engine.js", 1, "true", false]) {
    const E = env({ catalog: (c) => { const u = c.parts[0].units[1]; u.available = true; if (val === undefined) delete u.anim; else u.anim = val; } });
    const r = await later(E.BS, "loadAnim", "l02");
    assert.equal(r.v, null, String(val));
    assert.equal(E.added.length, 0);
  }
});
t("file data/<id>-anim.js bi loi mang -> null, err load-error; thu lai thanh cong khong nap lai 3 file chung", async () => {
  let broken = true;
  const E = env({ fail: (s) => (broken && s === "data/l01-anim.js" ? "err" : false) });
  const r = await later(E.BS, "loadAnim", "l01");
  assert.equal(r.v, null); assert.equal(r.e, "load-error");
  broken = false;
  const n = E.added.length;
  const r2 = await later(E.BS, "loadAnim", "l01");
  assert.ok(r2.v);
  assert.equal(E.added.length, n + 1);
});
t("file chung loi -> null; lan sau van co the thu lai", async () => {
  let broken = true;
  const E = env({ fail: (s) => (broken && s === "assets/js/anim-rig.js" ? "err" : false) });
  const r = await later(E.BS, "loadAnim", "l01");
  assert.equal(r.v, null); assert.equal(r.e, "load-error");
  broken = false;
  const r2 = await later(E.BS, "loadAnim", "l01");
  assert.ok(r2.v);
});
t("data nap xong nhung khong dat BS_ANIMS[id] -> null (missing)", async () => {
  const E = env({ skipDef: true });
  const r = await later(E.BS, "loadAnim", "l01");
  assert.equal(r.v, null); assert.equal(r.e, "missing");
});
t("loadUnit(l01) khong them file hoat hinh (chi data + game)", async () => {
  const E = env();
  const r = await later(E.BS, "loadUnit", "l01");
  assert.ok(r.v);
  assert.deepEqual(E.added.map((x) => x.src), ["data/l01.js", "data/l01-game.js"]);
  assert.ok(!E.added.some((x) => /anim/.test(x.src)));
});
t("loadUnits khong keo theo hoat hinh", async () => {
  const E = env();
  await new Promise((res) => E.BS.loadUnits(["l01"], res));
  assert.ok(!E.added.some((x) => /anim/.test(x.src)));
});
t("scenes: danh sach nap [anim-scenes.js, data/l01-anim.js], async=false, khong nap trio cu", async () => {
  const E = env({ catalog: asKind("scenes") });
  const r = await later(E.BS, "loadAnim", "l01");
  assert.ok(r.v && r.v.id === "l01");
  assert.deepEqual(E.added.map((x) => x.src), [SCENES, "data/l01-anim.js"]);
  assert.ok(E.added.every((x) => x.async === false));
});
t("scenes: goi lan hai khong nap lai; unit scenes thu hai chi nap data", async () => {
  const E = env({ catalog: asKind("scenes") });
  await later(E.BS, "loadAnim", "l01");
  const n = E.added.length;
  assert.ok((await later(E.BS, "loadAnim", "l01")).v);
  assert.equal(E.added.length, n);
  assert.ok((await later(E.BS, "loadAnim", "l02")).v);
  assert.deepEqual(E.added.slice(n).map((x) => x.src), ["data/l02-anim.js"]);
});
t("animKind la / thieu / sai kieu -> roi vao rig (bo ba cu)", async () => {
  for (const k of ["foo", undefined, 1, null, "SCENES"]) {
    const E = env({ catalog: (c) => { if (k !== undefined) c.parts[0].units[0].animKind = k; } });
    const r = await later(E.BS, "loadAnim", "l01");
    assert.ok(r.v, String(k));
    assert.deepEqual(E.added.map((x) => x.src), [...SHARED, "data/l01-anim.js"], String(k));
  }
});
t("hai kind khong dung chung trang thai: rig nap trio, scenes nap rieng, moi bo nap mot lan", async () => {
  const E = env({ catalog: (c) => { c.parts[0].units[0].animKind = "scenes"; const v = c.parts[0].units[1]; v.available = true; v.anim = true; } });
  await later(E.BS, "loadAnim", "l01");
  assert.deepEqual(E.added.map((x) => x.src), [SCENES, "data/l01-anim.js"]);
  await later(E.BS, "loadAnim", "l02");
  assert.deepEqual(E.added.map((x) => x.src), [SCENES, "data/l01-anim.js", ...SHARED, "data/l02-anim.js"]);
  const n = E.added.length;
  await later(E.BS, "loadAnim", "l01"); await later(E.BS, "loadAnim", "l02");
  assert.equal(E.added.length, n);
});
t("scenes: file chung nap xong nhung thieu BSScenes -> load-error, thu lai duoc", async () => {
  const E = env({ catalog: asKind("scenes"), noScenes: true });
  const r = await later(E.BS, "loadAnim", "l01");
  assert.equal(r.v, null); assert.equal(r.e, "load-error");
  const r2 = await later(E.BS, "loadAnim", "l01");
  assert.equal(r2.e, "load-error");
  assert.equal(E.added.filter((x) => x.src === SCENES).length, 2);
});
t("scenes: anim-scenes.js loi mang -> load-error; roi thu lai thanh cong", async () => {
  let broken = true;
  const E = env({ catalog: asKind("scenes"), fail: (s) => (broken && s === SCENES ? "err" : false) });
  assert.equal((await later(E.BS, "loadAnim", "l01")).e, "load-error");
  broken = false;
  assert.ok((await later(E.BS, "loadAnim", "l01")).v);
});
t("scenes: data thieu BS_ANIMS[id] -> missing; hai goi dong thoi nap mot lan", async () => {
  const E = env({ catalog: asKind("scenes"), skipDef: true });
  assert.equal((await later(E.BS, "loadAnim", "l01")).e, "missing");
  const F = env({ catalog: asKind("scenes") });
  const [a, b] = await Promise.all([later(F.BS, "loadAnim", "l01"), later(F.BS, "loadAnim", "l01")]);
  assert.ok(a.v && b.v);
  assert.equal(F.added.length, 2);
});
t("scenes: anim !== true van not-found, khong nap gi", async () => {
  const E = env({ catalog: (c) => { const u = c.parts[0].units[0]; u.animKind = "scenes"; u.anim = "x"; } });
  assert.equal((await later(E.BS, "loadAnim", "l01")).e, "not-found");
  assert.equal(E.added.length, 0);
});
t("ma nguon loader: khong con dang duong dan anim, khong chuoi mang", async () => {
  const s = rd("assets/js/loader.js");
  assert.ok(!/validAnim/.test(s));
  assert.ok(!/https?:\/\/|fetch\s*\(|XMLHttpRequest/.test(s));
});
t("catalog that: l01 co anim === true", async () => {
  const E = env();
  assert.strictEqual(E.BS.catalogUnit("l01").anim, true);
});

for (const [name, fn] of queue) {
  total++;
  try { await fn(); pass++; console.log("  dat  " + name); }
  catch (e) { console.log("  LOI  " + name + "\n       " + String(e.message).split("\n")[0]); }
}
console.log("\nKet qua: " + pass + "/" + total + " ca dat");
process.exit(pass === total ? 0 : 1);
