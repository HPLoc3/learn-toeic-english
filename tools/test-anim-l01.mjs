// Kiem tra goi B: dien vien + canh Unit 1. Chay: node tools/test-anim-l01.mjs  (khong trinh duyet/server)
// Phan can engine goi A (anim-engine.js, anim-rig.js) tu SKIP voi nhan "CHO GOI A"; cac kiem tra doc lap van chay.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0, skip = 0;
function ok(c, msg) { if (c) pass++; else { fail++; console.log('  FAIL: ' + msg); } }
function section(n) { console.log('# ' + n); }
function wait(n, why) { skip++; console.log('  CHO GOI A: ' + n + ' (' + why + ')'); }

const have = (p) => fs.existsSync(path.join(root, p));
const engineReady = have('assets/js/anim-engine.js') && have('assets/js/anim-rig.js');

// ---------- nap du lieu + dien vien ----------
function load(p, ctx) { vm.runInContext(rd(p), ctx, { filename: p, timeout: 10000 }); }

const regs = [];
let ctxCast;
if (engineReady) {
  ctxCast = { window: {} };
  vm.createContext(ctxCast);
  load('assets/js/anim-engine.js', ctxCast);
  load('assets/js/anim-rig.js', ctxCast);
  const orig = ctxCast.window.BSRig.register;
  ctxCast.window.BSRig.register = function (k, n, s) { regs.push({ kind: k, name: n, spec: s }); return orig.apply(this, arguments); };
} else {
  ctxCast = { window: { BSRig: { register: (k, n, s) => { regs.push({ kind: k, name: n, spec: s }); } } } };
  vm.createContext(ctxCast);
}
load('assets/js/anim-cast.js', ctxCast);
load('data/l01-anim.js', ctxCast);
const D = ctxCast.window.BS_ANIMS && ctxCast.window.BS_ANIMS.l01;

// ---------- 4. markup an toan, dien vien ----------
section('4. dien vien / dao cu / phong nen');
const want = { actor: ['nam', 'mai', 'hanh'], prop: ['counter', 'cup', 'kettle', 'table', 'laptop', 'box'], backdrop: ['kitchen', 'office', 'plain'] };
for (const k of Object.keys(want)) for (const n of want[k]) ok(regs.some((r) => r.kind === k && r.name === n), 'thieu ' + k + ' ' + n);
const bad = [/<script/i, /<image/i, /href/i, /\son[a-z]+\s*=/i, /<foreignObject/i, /\sid\s*=/i, /https?:/i, /javascript:/i];
function strings(v, out) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.keys(v).forEach((k) => strings(v[k], out));
  return out;
}
for (const r of regs) {
  const all = strings(r.spec, []);
  for (const s of all) for (const re of bad) ok(!re.test(s), r.kind + ':' + r.name + ' khop ' + re);
  ok(all.some((s) => s.indexOf('<') >= 0), r.kind + ':' + r.name + ' khong co markup');
}
for (const r of regs.filter((x) => x.kind === 'actor')) {
  ok(typeof r.spec.name === 'string' && r.spec.name.length > 0, r.name + ' thieu name');
  ok(Number.isFinite(r.spec.age) && r.spec.age > 0, r.name + ' thieu age');
  ok(typeof r.spec.job === 'string' && r.spec.job.length > 0, r.name + ' thieu job');
}
const A = (n) => regs.find((r) => r.kind === 'actor' && r.name === n);
ok(A('nam') && A('nam').spec.age === 28 && A('mai') && A('mai').spec.age === 24 && A('hanh') && A('hanh').spec.age === 55, 'tuoi dien vien');
if (engineReady && ctxCast.window.BSRig.markup) {
  const BSRig = ctxCast.window.BSRig;
  for (const bd of ['kitchen', 'office', 'plain']) for (const ac of ['nam', 'mai', 'hanh']) {
    let m = '';
    try { m = BSRig.markup({ stage: { w: 360, h: 270, backdrop: bd }, cast: { a: { actor: ac, x: 140, outfit: ['apron', 'vest', 'nametag'], face: 'smile' } }, props: { c: { type: 'cup', x: 240, y: 172 }, k: { type: 'kettle', x: 192, y: 160 }, t: { type: 'table', x: 10, y: 180 }, l: { type: 'laptop', x: 50, y: 180 }, b: { type: 'box', x: 90, y: 180 }, o: { type: 'counter', x: 185, y: 172 } }, fx: {} }); } catch (e) { ok(false, 'markup loi: ' + e.message); }
    for (const re of bad) ok(!re.test(m), 'BSRig.markup ' + bd + '/' + ac + ' khop ' + re);
  }
} else wait('BSRig.markup tren to hop', 'chua co anim-rig.js');

// ---------- 2. cau truc / kich thuoc ----------
section('2. cau truc du lieu');
ok(!!D, 'BS_ANIMS.l01 ton tai');
const fx = JSON.parse(rd('tools/fixtures/anim-l01-legacy.json'));
const sum = D.scenes.reduce((a, s) => a + s.dur, 0) + D.outro.dur;
ok(sum === 23, 'tong thoi luong = ' + sum);
ok(D.scenes.length === 3, '3 canh');
const EN = ['The man is pouring water into a cup.', 'The man is looking at the cup.', 'The man is wearing an apron.'];
D.scenes.forEach((s, i) => {
  ok(s.en === EN[i], 'en canh ' + i);
  ok(s.pieces.map((p) => p[0]).join('') === EN[i], 'pieces ghep thanh en canh ' + i);
  ok(s.dur === 7, 'dur canh ' + i);
});
ok(D.formula.map((x) => x[0]).join('') === 'be (is) + động từ-ing = đang làm gì', 'cong thuc nguyen van');
ok(D.outro.segs.map((x) => x[0]).join('') === fx.timed[230].viText, 'tong ket nguyen van: ' + D.outro.segs.map((x) => x[0]).join(''));
ok(/wearing = đang mặc sẵn trên người \(trạng thái\); putting on = đang mặc vào \(hành động\)/.test(D.outro.segs.map((x) => x[0]).join('')), 'cau wearing/putting on');
// moc thoi gian khop fixture cu: thoi diem hien tung manh
const AT = [3.8, 4.3, 4.8, 5.2, 5.7];
D.scenes.forEach((s, i) => { ok(s.pieces.every((p, j) => p[2] === AT[j]), 'moc pieces canh ' + i); ok(s.vi_at === 6.2, 'vi_at canh ' + i); });
ok(D.scenes[0].note_vi === 'pour → pouring: đang rót', 'note 1');

// ---------- 3. bat bien chuyen dong (bo noi suy doc lap, doc lai tu du lieu) ----------
section('3. bat bien chuyen dong');
const starts = []; { let a = 0; for (const s of D.scenes) { starts.push(a); a += s.dur; } }
const tr = {};
D.scenes.forEach((s, i) => (s.tracks || []).forEach((t) => {
  const k = t.of + '.' + t.ch;
  (tr[k] = tr[k] || []).push(...t.keys.map((kk) => ({ t: starts[i] + kk[0], v: kk[1], e: kk[2] })));
}));
Object.values(tr).forEach((a) => a.sort((x, y) => x.t - y.t));
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
function val(k, t, dflt) {
  const a = tr[k]; if (!a) return dflt;
  if (t <= a[0].t) return typeof a[0].v === 'number' ? a[0].v : dflt;
  for (let i = 1; i < a.length; i++) {
    if (t <= a[i].t) {
      const p = a[i - 1], q = a[i];
      if (q.e === 'step') return t >= q.t ? q.v : p.v;
      let u = (t - p.t) / (q.t - p.t); if (q.e === 'ease') u = ease(u);
      return p.v + (q.v - p.v) * u;
    }
  }
  return a[a.length - 1].v;
}
const steps = []; for (let i = 0; i <= 230; i++) steps.push(i / 10);
// fill don dieu 0 -> 1
let prev = -1, mono = true; for (const t of steps) { const v = val('cup.fill', t, 0); if (v < prev - 1e-9) mono = false; prev = v; }
ok(mono && val('cup.fill', 0, 0) === 0 && Math.abs(val('cup.fill', 23, 0) - 1) < 1e-9, 'cup.fill don dieu 0->1');
// stream.on
for (const t of steps) {
  const on = val('stream.on', t, 0) > 0.5;
  const expect = (t >= 2.4 && t < 7) || (t >= 7 && t < 7.12);
  ok(on === expect, 'stream.on t=' + t + ' ' + on);
}
// gaze > 0 chi canh 2 sau 2.4s
for (const t of steps) { const g = val('gaze.opacity', t, 0) > 0; ok(g === (t > 9.4 + 1e-9 && t < 14 - 1e-9), 'gaze t=' + t); }
// ring > 0 chi canh 3 sau 1.6s
for (const t of steps) { const r = val('ring.on', t, 0) > 0; ok(r === (t > 15.6 + 1e-9), 'ring t=' + t); }
// tay phai bam tay cam am: canh 1 tu 1.2 den 7, va canh 2 den 8.5
const hr = tr['man.handR'].filter((k) => k.v === '@kettle.handle');
ok(hr.some((k) => Math.abs(k.t - 1.2) < 1e-9) && hr.some((k) => Math.abs(k.t - 7) < 1e-9), 'handR khoa vao @kettle.handle tu 1.2 den 7');
ok(hr.every((k) => typeof k.v === 'string'), 'neo handR la chuoi');
ok(!tr['man.handR'].some((k) => k.t > 1.2 && k.t < 7), 'khong co key handR xen giua 1.2..7');
// kenh/ loai thuoc danh sach trang
const okCh = { man: ['x', 'lean', 'headTilt', 'look', 'handL', 'handR', 'face', 'sit', 'flip'], kettle: ['x', 'y', 'rot', 'opacity'], cup: ['x', 'y', 'rot', 'opacity', 'fill'], stream: ['on', 'opacity'], gaze: ['on', 'opacity'], ring: ['on', 'opacity'] };
D.scenes.forEach((s) => s.tracks.forEach((t) => ok((okCh[t.of] || []).indexOf(t.ch) >= 0, 'kenh la ' + t.of + '.' + t.ch)));

// ---------- 5. validate + 1. doi chieu fixture (can engine) ----------
section('5. validate / 1. fixture');
if (!engineReady) {
  wait('validate(BS_ANIMS.l01) rong', 'chua co anim-engine.js');
  wait('so khop fixture cu qua mount() voi DOM gia', 'chua co anim-engine.js');
} else {
  const BSAnim = ctxCast.window.BSAnim, BSRig = ctxCast.window.BSRig;
  const errs = BSAnim.validate(D, BSRig);
  ok(Array.isArray(errs) && errs.length === 0, 'validate: ' + JSON.stringify(errs));
  ok(BSAnim.compile(D).T === 23, 'compile.T = 23');
  runFixture(BSAnim);
}

function runFixture(BSAnim) {
  // DOM gia (giong tools/make-anim-fixture.mjs). Gia dinh: engine moi giu data-r step/sent/vi/bar2/sr, data-a play, lop bsa-on.
  class N {
    constructor(tag, attrs) { this.nodeType = 1; this.tag = tag; this.attrs = Object.assign({}, attrs); this.children = []; this._t = ''; this._h = ''; this.hidden = 'hidden' in this.attrs; this.style = {}; this.reg = []; this.isConnected = true; const s = new Set((this.attrs['class'] || '').split(/\s+/).filter(Boolean)); this._s = s; this.classList = { toggle: (c, o) => { const v = o === undefined ? !s.has(c) : !!o; if (v) s.add(c); else s.delete(c); return v; }, contains: (c) => s.has(c), add: (c) => s.add(c), remove: (c) => s.delete(c) }; }
    get className() { return [...this._s].join(' '); } set className(v) { this._s.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this._s.add(c)); }
    getClientRects() { return [1]; } setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
    addEventListener() {} appendChild(n) { this.children.push(n); return n; }
    get textContent() { return this._t + this.children.map((c) => c.textContent).join(''); } set textContent(v) { this._t = String(v); this.children = []; this._h = ''; }
    get innerHTML() { return this._h; }
    set innerHTML(h) { this._h = String(h); this.children = []; this._t = ''; this.reg = []; const re = /<(\w+)([^>]*)>/g; let m; while ((m = re.exec(this._h))) { if (!/data-(r|a|s)=/.test(m[2])) continue; const at = {}; const ar = /([\w-]+)(?:="([^"]*)")?/g; let a; while ((a = ar.exec(m[2]))) at[a[1]] = a[2] === undefined ? '' : a[2]; this.reg.push(new N(m[1], at)); } }
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
    querySelectorAll(s) { const m = /^\[(data-[ras])(?:="([^"]*)")?\]$/.exec(s); if (!m) return []; return this.reg.filter((n) => m[1] in n.attrs && (m[2] === undefined || n.attrs[m[1]] === m[2])); }
  }
  const strip = (h) => String(h).replace(/<[^>]*>/g, '').replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();
  const snap = (el) => {
    const R = (n) => el.querySelector('[data-r="bsa.' + n + '"]');
    const sent = R('sent'), vi = R('vi');
    return { step: R('step').textContent, shown: sent.children.filter((s) => s.classList.contains('bsa-on')).map((s) => s.textContent).join(''), full: sent.children.map((s) => s.textContent).join(''), viText: strip(vi.textContent), viOn: vi.classList.contains('bsa-on'), pct: Number(R('bar').getAttribute('aria-valuenow')), sr: R('sr').textContent, play: el.querySelector('[data-a="play"]').textContent };
  };
  function env(reduced) {
    const q = [];
    const w = ctxCast.window;
    w.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
    w.requestAnimationFrame = (f) => { q.push(f); return q.length; };
    w.cancelAnimationFrame = () => {};
    const doc = { createElement: (t) => new N(t, {}) }; w.document = doc; w.setTimeout = () => 1; w.clearTimeout = () => {};
    const el = new N('div', {}); el.ownerDocument = doc;
    return { el, api: w.BSAnim.mount(el, D) };
  }
  const { el, api } = env(false);
  api.pause();
  let bad1 = 0;
  let fl = 0;
  const cmp = (f, s) => s.step === f.step && s.shown === f.sentShown && s.full === f.sentFull && s.viText === f.viText && s.viOn === f.viOn && s.pct === f.pct && s.play === f.play;
  for (const f of fx.timed) {
    api.seek(f.t); api.pause();
    let s = snap(el);
    let same = cmp(f, s);
    // sai so float tai dung moc (vd 13.2-7=6.1999..): chap nhan neu khop sau khi nhich 1e-6
    if (!same) { api.seek(f.t + 1e-6); api.pause(); const s2 = snap(el); if (cmp(f, s2)) { same = true; fl++; s = s2; } }
    const srOk = !(f.viOn && f.sentShown === f.sentFull) || s.sr === f.sr;
    if (!same || !srOk) { bad1++; if (bad1 <= 5) console.log('  lech t=' + f.t + ' moi=' + JSON.stringify(s) + ' cu=' + JSON.stringify(f)); }
  }
  if (fl) console.log('  luu y: ' + fl + ' mau chi khop sau khi nhich t 1e-6 (sai so float tai dung moc)');
  ok(bad1 === 0, 'fixture thoi gian lech ' + bad1 + '/231 mau');
  const r = env(true);
  const PCT = [25, 50, 75, 100];
  fx.static.forEach((f, i) => {
    r.api.go(i); const s = snap(r.el);
    ok(s.step === f.step && s.shown === f.sentShown && s.full === f.sentFull && s.viText === f.viText && s.viOn === f.viOn && s.pct === PCT[i], 'fixture tinh buoc ' + i + ' ' + JSON.stringify(s));
  });
  r.api.go(3); const so = snap(r.el);
  ok(so.step === 'Tổng kết' && so.viText === fx.timed[230].viText && so.pct === 100, 'buoc tinh Tong ket ' + JSON.stringify(so));
  // tay phai trung toa do neo tay cam am sau IK (canh 1, 1.2..7s)
  const cp = BSAnim.compile(D), rig = ctxCast.window.BSRig;
  let worst = 0;
  for (let t = 1.2; t <= 8.5 + 1e-9; t += 0.1) {
    const sm = BSAnim.sample(cp, t);
    api.seek(t); api.pause();
    const an = rig.anchor(D, 'kettle', 'handle', sm);
    const h = el.querySelector('[data-r="man.handR"]');
    const d = Math.hypot(Number(h.getAttribute('cx')) - an[0], Number(h.getAttribute('cy')) - an[1]);
    if (d > worst) worst = d;
  }
  ok(worst < 0.05, 'tay phai lech neo am toi da ' + worst.toFixed(3) + 'px');
}

// ---------- kich thuoc ----------
section('kich thuoc');
const sz = (p) => fs.statSync(path.join(root, p)).size;
ok(sz('assets/js/anim-cast.js') <= 14 * 1024, 'anim-cast.js ' + sz('assets/js/anim-cast.js') + ' > 14KB');
ok(sz('data/l01-anim.js') <= 5 * 1024, 'l01-anim.js ' + sz('data/l01-anim.js') + ' > 5KB');
ok(!/\b(fetch\(|XMLHttpRequest|localStorage|eval\(|new Function)/.test(rd('assets/js/anim-cast.js') + rd('data/l01-anim.js')), 'khong co API cam');

console.log('\nDat ' + pass + ', that bai ' + fail + ', bo qua (CHO GOI A) ' + skip);
process.exit(fail ? 1 : 0);
