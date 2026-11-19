// Kiem tra du lieu + anh canh cua unit hoat hinh scenes v2. Chay: node tools/test-scenes.mjs [unit]  (khong tham so: moi unit co animKind scenes trong catalog; chi Node)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (p) => path.join(root, p);
function sceneUnits() {
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(P('data/catalog.js'), 'utf8'), c, { timeout: 10000 });
  const out = [];
  for (const part of c.window.BS_CATALOG.parts) for (const u of part.units) if (u.available && u.anim === true && u.animKind === 'scenes') out.push(u.id);
  return out;
}
const UNITS = process.argv[2] ? [process.argv[2]] : sceneUnits();
let pass = 0, fail = 0;
function ok(c, msg) { if (c) pass++; else { fail++; console.log('  FAIL: ' + msg); } }
function section(n) { console.log('# ' + n); }

function runUnit(UNIT) {
  console.log('=== ' + UNIT);
  // ---------- nap du lieu ----------
  const dataPath = 'data/' + UNIT + '-anim.js';
  const src = fs.readFileSync(P(dataPath), 'utf8');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: dataPath, timeout: 10000 });
  const D = ctx.window.BS_ANIMS && ctx.window.BS_ANIMS[UNIT];
  section('1. du lieu');
  ok(!!D, 'khong co BS_ANIMS.' + UNIT);
  if (!D) { console.log('\nDat ' + pass + ', that bai ' + fail); process.exit(1); }
  ok(D.v === 2 && D.kind === 'scenes' && D.id === UNIT, 'v/kind/id sai');
  ok(Buffer.byteLength(src) <= 6144, dataPath + ' ' + Buffer.byteLength(src) + ' > 6KB');
  ok(!/\b(fetch\(|XMLHttpRequest|localStorage|eval\(|new Function)/.test(src), 'co API cam trong du lieu');
  ok(!/\r/.test(src), 'khong dung LF');
  console.log('  placeholder: ' + (D.placeholder === true ? 'TRUE (du lieu/anh tam - check-units --release se fail)' : 'false'));

  const scenes = Array.isArray(D.scenes) ? D.scenes : [];
  ok(scenes.length >= 1 && scenes.length <= 8, 'so canh ngoai 1..8');
  ok(new Set(scenes.map(s => s.id)).size === scenes.length, 'canh id trung');
  ok(new Set(scenes.map(s => s.img)).size === scenes.length, 'canh img trung');
  let total = D.outro ? D.outro.dur : 0;
  for (const s of scenes) {
    const w = 'canh ' + s.id + ': ';
    ok(/^[a-z][A-Za-z0-9]{0,15}$/.test(s.id), w + 'id sai regex');
    ok(/^[a-z0-9-]{1,32}$/.test(s.img), w + 'img sai regex');
    ok(typeof s.alt_vi === 'string' && s.alt_vi.trim().length > 0 && s.alt_vi.length <= 400, w + 'alt_vi rong/dai');
    ok(typeof s.vi === 'string' && s.vi.trim().length > 0, w + 'thieu vi');
    ok(typeof s.en === 'string' && s.en.length > 0, w + 'thieu en');
    ok(Array.isArray(s.pieces) && s.pieces.length >= 1 && s.pieces.length <= 20, w + 'so pieces ngoai 1..20');
    ok(Array.isArray(s.pieces) && s.pieces.map(p => p[0]).join('') === s.en, w + 'pieces khong noi lai thanh en');
    ok(s.dur >= 2 && s.dur <= 60, w + 'dur ngoai 2..60');
    total += s.dur;
    ok(typeof s.note_vi === 'string', w + 'thieu note_vi');
    const kb = s.kb || {};
    for (const k of ['from', 'to']) {
      const a = kb[k];
      ok(Array.isArray(a) && a.length === 3 && a[0] >= 0 && a[0] <= 1 && a[1] >= 0 && a[1] <= 1 && a[2] >= 1 && a[2] <= 2, w + 'kb.' + k + ' sai');
    }
    if (s.focus) {
      const f = s.focus;
      ok(f.x >= 0 && f.x <= 1 && f.y >= 0 && f.y <= 1 && f.r >= 0.02 && f.r <= 0.4 && f.at >= 0 && f.at <= s.dur, w + 'focus ngoai khoang');
    }
  }
  ok(D.outro && /^[a-z0-9-]{1,32}$/.test(D.outro.img) && D.outro.alt_vi && D.outro.alt_vi.trim() && D.outro.dur >= 2 && D.outro.dur <= 60, 'outro sai');
  ok(total <= 300, 'tong thoi luong ' + total + ' > 300');
  ok(D.img && /^assets\/img\/[a-z0-9_-]+\/(scene\/)?$/.test(D.img.base) && /^assets\/img-hd\/[a-z0-9_-]+\/(scene\/)?$/.test(D.img.hd), 'img.base/hd sai regex');
  ok(D.img && JSON.stringify(D.img.w) === '[800,1600]', 'img.w phai la [800,1600]');

  // ---------- BSScenes.validate neu engine da co ----------
  section('2. BSScenes.validate');
  if (fs.existsSync(P('assets/js/anim-scenes.js'))) {
    const c2 = { window: {} };
    vm.createContext(c2);
    vm.runInContext(fs.readFileSync(P('assets/js/anim-scenes.js'), 'utf8'), c2, { timeout: 10000 });
    const B = c2.window.BSScenes;
    ok(!!B && typeof B.validate === 'function', 'thieu BSScenes.validate');
    if (B) { const e = B.validate(D); ok(e.length === 0, 'validate bao loi: ' + JSON.stringify(e)); }
    if (B) {
      const pl = B.plan(D);
      pl.scenes.forEach((x, i) => {
        const last = x.at[x.at.length - 1];
        ok(x.dur - last >= 4, 'canh ' + scenes[i].id + ': cau tieng Anh day du chi hien ' + (x.dur - last).toFixed(2) + ' s (< 4 s)');
        ok(x.dur - x.viAt >= 3, 'canh ' + scenes[i].id + ': nghia tieng Viet chi hien ' + (x.dur - x.viAt).toFixed(2) + ' s (< 3 s)');
      });
    }
    ok(scenes.every((s) => !('pos' in s)), 'data khong con truong pos (khong dung)');
  } else console.log('  bo qua: chua co assets/js/anim-scenes.js');

  // ---------- anh ----------
  function webpSize(buf) {
    if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
    const t = buf.toString('ascii', 12, 16);
    if (t === 'VP8 ') { // khung key: ma 9d 01 2a o byte 23..25, w/h 14 bit
      if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
      return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    if (t === 'VP8L') {
      if (buf[20] !== 0x2f) return null;
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (t === 'VP8X') return { w: (buf[24] | buf[25] << 8 | buf[26] << 16) + 1, h: (buf[27] | buf[28] << 8 | buf[29] << 16) + 1 };
    return null;
  }
  section('3. file anh');
  const names = scenes.map(s => s.img).concat(D.outro ? [D.outro.img] : []);
  let total800 = 0, missing = 0;
  for (const n of names) {
    for (const [dir, suf, W, H, cap] of [[D.img.base, '-800.webp', 800, 450, 110000], [D.img.hd, '-1600.webp', 1600, 900, 280000]]) {
      const rel = dir + n + suf;
      if (!fs.existsSync(P(rel))) { missing++; ok(false, 'THIEU FILE ANH ' + rel + ' (chay tools/make-scenes.py)'); continue; }
      const buf = fs.readFileSync(P(rel));
      const sz = webpSize(buf);
      ok(!!sz, rel + ': khong phai WebP hop le');
      if (sz) ok(sz.w === W && sz.h === H, rel + ': kich thuoc ' + sz.w + 'x' + sz.h + ' != ' + W + 'x' + H);
      ok(buf.length <= cap, rel + ': ' + buf.length + ' B > ' + cap);
      if (W === 800) total800 += buf.length;
    }
  }
  if (missing) console.log('  FAIL: thieu ' + missing + ' file anh');
  ok(total800 <= 800000, 'tong anh 800 ' + total800 + ' B > 800000');
  console.log('  tong anh 800: ' + total800 + ' B');


}
for (const u of UNITS) runUnit(u);
console.log('\nDat ' + pass + ', that bai ' + fail);
process.exit(fail ? 1 : 0);
