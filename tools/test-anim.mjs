// Kiem tra goi A (engine + rig hoat hinh) bang node:vm, khong trinh duyet/server.  Chay: node tools/test-anim.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENG = fs.readFileSync(path.join(root, 'assets/js/anim-engine.js'), 'utf8');
const RIG = fs.readFileSync(path.join(root, 'assets/js/anim-rig.js'), 'utf8');

let pass = 0, total = 0;
function ok(cond, msg) { total++; if (cond) pass++; else console.log('  FAIL: ' + msg); }
function sect(s) { console.log('# ' + s); }

// ---------- actor/prop/backdrop mau (thay cho cast that cua goi B) ----------
function register(R) {
  const a = R.register('actor', 'nam', {
    name: 'Nam', age: 28, job: 'nhan vien quan ca phe',
    body: '<path d="M-17 106 L17 106 L18 210 L-18 210 Z" fill="#4f7cac"/>',
    head: '<ellipse cx="0" cy="77" rx="17.5" ry="19" fill="#f0b98d"/><path data-r="~hair" d="M-19 74 Q0 54 19 74Z" fill="#2b2118"/>',
    pivot: [0, 98], hip: [0, 205], eye: { L: [-7, 78], R: [7, 78], r: 2.3, c: '#1b1b1b' },
    faces: { smile: '<path d="M-5 88 Q0 92 5 88" fill="none" stroke="#8a3b2a"/>', neutral: '<path d="M-5 89 L5 89" stroke="#8a3b2a"/>' },
    outfit: { apron: '<path d="M-12 112 L12 112 L16 192 L-16 192 Z" fill="#f4d58d"/>' },
    arm: { L: 33, s: [13, 110], rest: [26, 160], w: 9, c: '#4f7cac', hr: 5.5, hc: '#f0b98d' },
    leg: { L: 20, hip: [7, 205], foot: [7, 244], w: 10, c: '#3d405b', shoe: { rx: 9, ry: 3.5, c: '#222', dx: 4, dy: 4 }, sit: { dy: 22, fx: 26 } },
    anchors: { eye: [6, 80], apron: [0, 151, 46, 94] }, headAnchors: ['eye']
  });
  const b = R.register('prop', 'cup', {
    svg: '<path d="M-11 -20 L-9 0 L9 0 L11 -20 Z" fill="#fff" stroke="#51657d"/><rect data-r="~water" x="-9" y="-1" width="18" height="0.01" fill="#4aa3df"/>',
    params: { fill: { def: 0, bind: [['water', 'height', 0.01, 16], ['water', 'y', -1, -17]] } },
    anchors: { handle: [0, 0], rim: [-4, -20], surface: (p) => [0, -1 - 16 * p.fill] }
  });
  const c = R.register('prop', 'kettle', {
    z: 'front', svg: '<rect x="2" y="-14" width="32" height="24" rx="7" fill="#9aa9bb"/>',
    anchors: { handle: [0, 0], spout: [46, -16] }
  });
  const d = R.register('backdrop', 'kitchen', { svg: '<rect width="360" height="270" fill="#eef3fa"/>' });
  return a && b && c && d;
}

function scene(i, extra) {
  return Object.assign({
    id: 's' + i, dur: 7, rest: 6.8, title_vi: 'Cảnh ' + (i + 1), label_vi: 'nhãn cảnh ' + (i + 1), en: 'Sentence number ' + (i + 1) + '.',
    pieces: [['The man', '', 3.8], [' is', 'be', 4.3], [' pour', '', 4.8], ['ing', 'ing', 5.2], [' water.', '', 5.7]],
    vi_at: 6.2, note_vi: 'ghi chú ' + (i + 1), tracks: [{ of: 'man', ch: 'headTilt', keys: [[0.8, 0], [1.8, 8, 'ease']] }]
  }, extra || {});
}
function mkDef(n) {
  const sc = [];
  for (let i = 0; i < n; i++) sc.push(scene(i));
  sc[0].tracks = [
    { of: 'man', ch: 'handR', keys: [[0.3, 'rest'], [1.2, '@kettle.handle', 'ease']] },
    { of: 'kettle', ch: 'y', keys: [[1.2, 160], [2.0, 128, 'ease']] },
    { of: 'kettle', ch: 'rot', keys: [[1.8, 0], [2.5, 25, 'ease']] },
    { of: 'stream', ch: 'on', keys: [[2.4, 1, 'step']] },
    { of: 'cup', ch: 'fill', keys: [[2.4, 0], [6.2, 1]] },
    { of: 'man', ch: 'headTilt', keys: [[0.8, 0], [1.8, 8, 'ease']] }
  ];
  if (n > 1) sc[1].tracks = [{ of: 'stream', ch: 'on', keys: [[0, 1], [0.12, 0, 'step']] }, { of: 'gaze', ch: 'on', keys: [[0, 0], [2.4, 0], [2.7, 1]] }, { of: 'man', ch: 'face', keys: [[0, 'smile'], [3, 'neutral']] }];
  return {
    v: 1, id: 'l01', region_vi: 'Vùng hoạt hình', svg_label_vi: 'Nhãn svg', svg_title_vi: 'Tiêu đề svg', svg_desc_vi: 'Mô tả svg',
    stage: { w: 360, h: 270, backdrop: 'kitchen' },
    cast: { man: { actor: 'nam', x: 140, outfit: ['apron'], face: 'smile' } },
    props: { cup: { type: 'cup', x: 240, y: 172 }, kettle: { type: 'kettle', x: 192, y: 160, z: 'front' } },
    fx: { stream: { type: 'stream', from: 'kettle.spout', to: 'cup.surface' }, gaze: { type: 'gaze', from: 'man.eye', to: 'cup.rim', pulse: { hz: 1.1, depth: 0.45 } }, ring: { type: 'ring', around: 'man.apron' } },
    formula: [['be ('], ['is', 'be'], [') + động từ-'], ['ing', 'ing'], [' = đang làm gì']],
    sr_tail_vi: 'Cấu trúc be + V-ing nghĩa là đang làm gì.',
    scenes: sc,
    outro: { dur: 2, title_vi: 'Tổng kết', segs: [['Ghi nhớ: '], ['be', 'be'], [' + '], ['ing', 'ing']] }
  };
}
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- DOM gia ----------
function makeEnv(opts = {}) {
  const sb = {}; sb.window = sb;
  const all = [], htmlLog = [], wr = { n: 0 };
  const raf = { q: [], calls: 0, cancels: 0 }, tm = { q: [], id: 0 };
  const mqL = [];
  sb.requestAnimationFrame = (f) => { raf.calls++; const id = raf.q.length + 1; raf.q.push([id, f]); return id; };
  sb.cancelAnimationFrame = (id) => { raf.cancels++; raf.q = raf.q.filter((x) => x[0] !== id); };
  sb.setTimeout = (f) => { const id = ++tm.id; tm.q.push([id, f]); return id; };
  sb.clearTimeout = (id) => { tm.q = tm.q.filter((x) => x[0] !== id); };
  const mq = { matches: !!opts.reduced, addEventListener: (t, f) => mqL.push(f), removeEventListener: (t, f) => { const i = mqL.indexOf(f); if (i >= 0) mqL.splice(i, 1); } };
  sb.matchMedia = () => mq;
  const doc = { createElement: (t) => mk(t) };
  function mk(tag) {
    const e = {
      nodeType: 1, tag, attrs: {}, children: [], listeners: [], style: {}, hidden: false, className: '', _t: '', _h: '', ownerDocument: doc, isConnected: true, rects: 1,
      classes: new Set(),
      setAttribute(k, v) { wr.n++; this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      removeAttribute(k) { wr.n++; delete this.attrs[k]; },
      appendChild(c) { this.children.push(c); return c; },
      addEventListener(t, f) { this.listeners.push([t, f]); }, removeEventListener(t, f) { this.listeners = this.listeners.filter((x) => x[1] !== f); },
      getClientRects() { return new Array(this.rects); },
      click() { this.listeners.filter((x) => x[0] === 'click').forEach((x) => x[1]()); },
      get textContent() { return this._t + this.children.map((c) => c.textContent).join(''); },
      set textContent(v) { this.children = []; this._t = String(v); },
      get innerHTML() { return this._h; },
      set innerHTML(v) {
        this._h = String(v); htmlLog.push(this._h); this.children = []; this._t = '';
        const re = /<(\w+)([^>]*)>([^<]*)/g; let m;
        while ((m = re.exec(this._h))) {
          const c = mk(m[1]); c._t = m[3]; const ar = /([\w:-]+)="([^"]*)"/g; let a;
          while ((a = ar.exec(m[2]))) c.attrs[a[1]] = a[2];
          if (/\shidden(\s|$)/.test(m[2])) c.hidden = true;
          this.children.push(c);
        }
      },
      querySelectorAll(sel) {
        const k = /^\[([\w-]+)\]$/.exec(sel)[1], out = [];
        (function walk(n) { n.children.forEach((c) => { if (k in c.attrs) out.push(c); walk(c); }); })(this);
        return out;
      }
    };
    e.classList = { toggle(c, on) { if (on) e.classes.add(c); else e.classes.delete(c); }, contains: (c) => e.classes.has(c) };
    all.push(e);
    return e;
  }
  vm.createContext(sb);
  vm.runInContext(ENG, sb); vm.runInContext(RIG, sb);
  const R = sb.BSRig; register(R);
  const el = mk('div');
  const byA = (k) => el.querySelectorAll('[data-a]').find((x) => x.attrs['data-a'] === k);
  const byR = (k) => el.querySelectorAll('[data-r]').find((x) => x.attrs['data-r'] === k);
  let ts = 0;
  return {
    sb, el, all, htmlLog, wr, raf, tm, mqL, mq, A: sb.BSAnim, R, byA, byR,
    chips: () => el.querySelectorAll('[data-s]'),
    tick(n = 1, dt = 100) { for (let i = 0; i < n; i++) { const q = raf.q; raf.q = []; ts += dt; q.forEach((x) => x[1](ts)); } },
    fire() { const q = tm.q; tm.q = []; q.forEach((x) => x[1]()); },
    listeners: () => all.reduce((s, e) => s + e.listeners.length, 0),
    pct: () => +byR('bsa.bar').attrs['aria-valuenow'],
    step: () => byR('bsa.step').textContent
  };
}

// ================= 1. Nap trong vm chi co window =================
sect('1 nap + du API');
{
  const sb = {}; sb.window = sb; vm.createContext(sb);
  let err = null;
  try { vm.runInContext(ENG, sb); vm.runInContext(RIG, sb); } catch (e) { err = e; }
  ok(!err, 'nap khong loi: ' + err);
  ok(['validate', 'compile', 'sample', 'mount'].every((k) => typeof sb.BSAnim?.[k] === 'function'), 'du API BSAnim');
  ok(['register', 'solveArm', 'markup', 'apply', 'anchor', 'bind', 'has', 'spec'].every((k) => typeof sb.BSRig?.[k] === 'function'), 'du API BSRig');
  ok(register(sb.BSRig), 'dang ky mau');
  ok(sb.BSRig.register('actor', 'xau', { name: 'x' }) === false, 'spec actor thieu truong bi tu choi');
  ok(sb.BSRig.register('prop', 'bad', { svg: '<image href="x"/>' }) === false, 'svg co <image/href bi tu choi');
  ok(sb.BSRig.register('prop', 'Bad!', { svg: '<g/>' }) === false, 'ten sai bi tu choi');
}

// ================= 2. validate =================
sect('2 validate');
{
  const { A, R } = makeEnv();
  const good = mkDef(3);
  ok(A.validate(good, R).length === 0, 'fixture hop le: ' + JSON.stringify(A.validate(good, R)));
  ok(A.validate(good).length === 0, 'fixture hop le khi khong co rig');
  const bad = (name, fn) => { const d = clone(good); fn(d); ok(A.validate(d, R).length > 0, 'phai tu choi: ' + name); };
  bad('kenh la cua dien vien', (d) => { d.scenes[0].tracks[5].ch = 'evil'; });
  bad('kenh la cua dao cu', (d) => { d.scenes[0].tracks[1].ch = 'evil'; });
  bad('kenh fx la', (d) => { d.scenes[0].tracks[3].ch = 'x'; });
  bad('actor la', (d) => { d.cast.man.actor = 'ghost'; });
  bad('prop la', (d) => { d.props.cup.type = 'ghost'; });
  bad('fx la', (d) => { d.fx.stream.type = 'laser'; });
  bad('backdrop la', (d) => { d.stage.backdrop = 'moon'; });
  bad('so NaN', (d) => { d.scenes[0].tracks[1].keys[0][1] = NaN; });
  bad('so Infinity', (d) => { d.props.cup.x = Infinity; });
  bad('dur=0', (d) => { d.scenes[1].dur = 0; });
  bad('dur am', (d) => { d.scenes[1].dur = -3; });
  bad('9 canh', (d) => { while (d.scenes.length < 9) d.scenes.push(scene(d.scenes.length)); });
  bad('0 canh', (d) => { d.scenes = []; });
  bad('pieces sai dang', (d) => { d.scenes[0].pieces = [['chi hai', '']]; });
  bad('pieces kieu la', (d) => { d.scenes[0].pieces[0][1] = 'script'; });
  bad('pieces khong phai mang', (d) => { d.scenes[0].pieces = 'abc'; });
  bad('ease la', (d) => { d.scenes[0].tracks[1].keys[1][2] = 'bounce'; });
  bad('key lui thoi gian', (d) => { d.scenes[0].tracks[1].keys = [[2, 1], [1, 2]]; });
  bad('tham chieu neo la', (d) => { d.fx.gaze.to = 'cup.nope'; });
  bad('tham chieu doi tuong la', (d) => { d.fx.ring.around = 'ghost.apron'; });
  bad('tay nham dich', (d) => { d.scenes[0].tracks[0].keys[1][1] = '@ghost.handle'; });
  bad('id trung', (d) => { d.props.man = { type: 'cup', x: 1, y: 1 }; });
  bad('id sai', (d) => { d.props['a b'] = { type: 'cup', x: 1, y: 1 }; });
  bad('outfit sai dang', (d) => { d.cast.man.outfit = 'apron'; });
  bad('track khong phai doi tuong', (d) => { d.scenes[0].tracks.push(null); });
  bad('track face gia tri sai', (d) => { d.scenes[1].tracks[2].keys[0][1] = 'a b'; });
  bad('rest >= dur', (d) => { d.scenes[0].rest = 7; });
  bad('thieu outro', (d) => { delete d.outro; });
  bad('def rong', (d) => { Object.keys(d).forEach((k) => delete d[k]); });
  ok(A.validate(null, R).length > 0 && A.validate('x', R).length > 0, 'def khong phai doi tuong');
  const one = mkDef(1); ok(A.validate(one, R).length === 0, '1 canh hop le');
  const eight = mkDef(8); ok(A.validate(eight, R).length === 0, '8 canh hop le: ' + JSON.stringify(A.validate(eight, R)));
}

// ================= 3. quet t + thuan =================
sect('3 sample');
{
  const { A, R } = makeEnv();
  const def = mkDef(3), cp = A.compile(def);
  ok(cp.T === 23 && cp.outroStart === 21 && cp.scenes.length === 3 && cp.scenes[1].start === 7, 'compile: T=23, outro 21');
  let bad = 0, cnt = 0;
  const finite = (v) => v === null || v === undefined || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' ? isFinite(v) : (typeof v === 'object' && Object.values(v).every(finite)));
  for (let t = 0; t <= cp.T + 1e-9; t += 0.05) { cnt++; if (!finite(A.sample(cp, t))) bad++; }
  ok(bad === 0 && cnt > 400, 'moi gia tri huu han tren ' + cnt + ' mau');
  const s5 = JSON.stringify(A.sample(cp, 5)); A.sample(cp, 20); A.sample(cp, 0);
  ok(JSON.stringify(A.sample(cp, 5)) === s5, 'sample(5) truoc/sau sample(20) giong het');
  ok(A.sample(cp, -5).t === 0 && A.sample(cp, 999).t === 23, 'kep t');
  const s = A.sample(cp, 5);
  ok(s.scene === 0 && s.lt === 5 && !s.outro && s.piecesOn.join() === 'true,true,true,false,false' && !s.viOn && s.pct === 22, 'sample(5): ' + JSON.stringify([s.scene, s.piecesOn, s.pct]));
  const s22 = A.sample(cp, 22);
  ok(s22.outro && s22.scene === 2 && s22.viOn && s22.pct === 96 && s22.piecesOn.every(Boolean), 'sample(22): outro, 96%');
  ok(A.sample(cp, 7).scene === 1 && A.sample(cp, 6.999).scene === 0, 'ranh gioi canh');
  // noi suy / giu / step
  ok(A.sample(cp, 0).ch['kettle.y'] === 160 && A.sample(cp, 3).ch['kettle.y'] === 128, 'giu truoc key dau / sau key cuoi');
  ok(Math.abs(A.sample(cp, 1.6).ch['kettle.y'] - 144) < 1e-9, 'ease o giua = nua doan');
  ok(A.sample(cp, 2.3).ch['stream.on'] === 0 && A.sample(cp, 2.4).ch['stream.on'] === 1, 'step: truoc moc 0, tai moc 1');
  ok(A.sample(cp, 7.05).ch['stream.on'] === 1 && A.sample(cp, 7.12).ch['stream.on'] === 0, 'stream bat 0.12s dau canh 2');
  ok(A.sample(cp, 5).ch['man.handR'].k >= 0 && A.sample(cp, 5).ch['man.handR'].b === '@kettle.handle', 'hand la mo ta {a,b,k}');
  ok(A.sample(cp, 10).ch['kettle.y'] === 128, 'khong noi suy qua ranh gioi canh');
  let mono = true, prev = -1; for (let t = 0; t <= 23; t += 0.05) { const f = A.sample(cp, t).ch['cup.fill']; if (f < prev - 1e-12) mono = false; prev = f; }
  ok(mono && A.sample(cp, 10).ch['cup.fill'] === 1, 'cup.fill don dieu');
  // neo + tay theo am
  const sm = A.sample(cp, 4), h = R.anchor(def, 'kettle', 'handle', sm), sp = R.anchor(def, 'kettle', 'spout', sm), su = R.anchor(def, 'cup', 'surface', sm);
  ok(h && sp && su && Math.abs(h[0] - 192) < 1e-9 && Math.abs(h[1] - 128) < 1e-9, 'anchor kettle.handle theo y');
  const a25 = R.anchor(def, 'kettle', 'spout', A.sample(cp, 4)); // rot=25
  ok(Math.abs(a25[0] - (192 + 46 * Math.cos(25 * Math.PI / 180) + 16 * Math.sin(25 * Math.PI / 180))) < 1e-9, 'anchor xoay theo rot');
  ok(R.anchor(def, 'man', 'eye', A.sample(cp, 0)) !== null && R.anchor(def, 'man', 'zzz', A.sample(cp, 0)) === null, 'anchor actor');
  const mk2 = makeEnv(); mk2.sb.requestAnimationFrame = () => 0;
  const el2 = mk2.el, ap = mk2.A.mount(el2, def);
  ok(!!ap, 'mount tra api'); ap.pause(); ap.seek(4);
  const hr = mk2.byR('man.handR'), an = mk2.R.anchor(def, 'kettle', 'handle', mk2.A.sample(mk2.A.compile(def), 4));
  ok(Math.abs(+hr.attrs.cx - an[0]) < 0.02 && Math.abs(+hr.attrs.cy - an[1]) < 0.02, 'ban tay phai nam tren tay cam am (' + hr.attrs.cx + ',' + hr.attrs.cy + ' vs ' + an + ')');
  ok(mk2.byR('cup.water').attrs.height !== undefined && mk2.byR('stream').attrs.opacity === '1', 'nuoc/stream duoc ghi');
}

// ================= 4. IK =================
sect('4 IK');
{
  const { R } = makeEnv();
  let seed = 12345; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let maxErr = 0, far = 0, fin = true;
  for (let i = 0; i < 200; i++) {
    const L = i % 2 ? 33 : 20, s = [rnd() * 300, rnd() * 200], sc = i % 5 === 0 ? 400 : i % 7 === 0 ? 3 : 150;
    const h = [s[0] + (rnd() - 0.5) * sc, s[1] + (rnd() - 0.5) * sc], side = i % 3 ? 1 : -1, r = R.solveArm(s, h, L, side);
    const d1 = Math.hypot(r.e[0] - s[0], r.e[1] - s[1]), d2 = Math.hypot(r.e[0] - r.h[0], r.e[1] - r.h[1]);
    maxErr = Math.max(maxErr, Math.abs(d1 - L), Math.abs(d2 - L));
    if (Math.hypot(h[0] - s[0], h[1] - s[1]) > 2 * L) far++;
    if (!r.e.concat(r.h).every(isFinite)) fin = false;
  }
  ok(maxErr < 1e-6 && fin, 'do dai doan = L, sai so max ' + maxErr);
  ok(far > 20, 'co du dich qua tam: ' + far);
  const z = R.solveArm([5, 5], [5, 5], 33, 1);
  ok(Math.abs(Math.hypot(z.e[0] - 5, z.e[1] - 5) - 33) < 1e-6, 'dich trung vai van dung do dai');
}

// ================= 5. mount N=1,2,5 =================
sect('5 mount dom gia');
for (const n of [1, 2, 5]) {
  const E = makeEnv(), def = mkDef(n), api = E.A.mount(E.el, def);
  ok(!!api && api.duration === n * 7 + 2, 'N=' + n + ' duration ' + (api && api.duration));
  const ch = E.chips();
  ok(ch.length === n, 'N=' + n + ' co dung ' + n + ' nut');
  ok(ch.every((b, i) => b.textContent === 'Bước ' + (i + 1) && b.attrs['aria-label'] === 'Chuyển tới động tác ' + (i + 1) + ': nhãn cảnh ' + (i + 1)), 'nhan + aria nut N=' + n);
  const bar = E.byR('bsa.bar');
  ok(bar.attrs.role === 'progressbar' && bar.attrs['aria-valuemin'] === '0' && bar.attrs['aria-valuemax'] === '100' && /^\d+$/.test(bar.attrs['aria-valuenow']) && !!bar.attrs['aria-label'], 'progressbar aria N=' + n);
  ok(ch[0].attrs['aria-current'] === 'step' && ch.slice(1).every((b) => !('aria-current' in b.attrs)), 'aria-current o buoc 1');
  ok(E.step() === 'Động tác 1/' + n + ' · Cảnh 1', 'nhan buoc: ' + E.step());
  ok(E.byR('bsa.svg').attrs['aria-label'] === 'Nhãn svg' && E.byR('bsa.root').attrs['aria-label'] === 'Vùng hoạt hình' && E.byR('bsa.svgt').textContent === 'Tiêu đề svg', 'nhan svg/region tu du lieu');
  ok(E.byR('bsa.sent').children.length === 5, 'cau co 5 manh');
  if (n > 1) { ch[1].click(); ok(E.step().startsWith('Động tác 2/' + n) && ch[1].attrs['aria-current'] === 'step' && !('aria-current' in ch[0].attrs), 'bam Buoc 2'); }
  ok(E.byR('man.armR') && E.byR('man.handL') && E.byR('cup.water') && E.byR('ring'), 'rig tao dung data-r');
  api.destroy();
}

// ================= 6. giam chuyen dong =================
sect('6 giam chuyen dong');
{
  const E = makeEnv({ reduced: true }), def = mkDef(3), api = E.A.mount(E.el, def);
  const play = E.byA('play'), pause = E.byA('pause'), prev = E.byA('prev'), next = E.byA('next');
  ok(play.hidden && pause.hidden && !prev.hidden && !next.hidden && !E.byR('bsa.rnote').hidden, 'nut an/hien');
  ok(E.raf.calls === 0, 'khong goi rAF luc mount');
  api.play(); ok(E.raf.calls === 0, 'play() khong goi rAF khi giam chuyen dong');
  ok(prev.attrs['aria-disabled'] === 'true' && next.attrs['aria-disabled'] === 'false', 'Truoc vo hieu o buoc dau');
  const seen = [E.step()], pcts = [E.pct()];
  for (let i = 0; i < 3; i++) { next.click(); seen.push(E.step()); pcts.push(E.pct()); }
  ok(seen.join('|') === 'Động tác 1/3 · Cảnh 1|Động tác 2/3 · Cảnh 2|Động tác 3/3 · Cảnh 3|Tổng kết', 'co buoc Tong ket: ' + seen.join('|'));
  ok(pcts.join() === '25,50,75,100', 'phan tram: ' + pcts);
  ok(next.attrs['aria-disabled'] === 'true', 'Tiep vo hieu o buoc cuoi');
  next.click(); ok(E.step() === 'Tổng kết', 'bam Tiep vo hieu khong doi buoc');
  ok(E.byR('bsa.vi').textContent === 'Ghi nhớ: be + ing', 'noi dung tong ket: ' + E.byR('bsa.vi').textContent);
  prev.click(); ok(E.step().startsWith('Động tác 3/3'), 'Truoc quay lai canh 3');
  ok(E.byR('bsa.sent').children.every((c) => c.className.includes('bsa-p')) && E.byR('bsa.sent').children.every((c) => c.classes.has('bsa-on')), 'tinh: cau hien du');
  E.chips()[1].click(); ok(E.step().startsWith('Động tác 2/3') && E.raf.calls === 0, 'bam Buoc 2 trong che do tinh');
  api.replay(); ok(E.step().startsWith('Động tác 1/3') && E.raf.calls === 0, 'replay tinh');
  // doi che do trong luc chay
  api.destroy();
  const E2 = makeEnv(), a2 = E2.A.mount(E2.el, def);
  a2.seek(10); E2.mq.matches = true; E2.mqL.forEach((f) => f());
  ok(E2.byA('play').hidden && E2.step().startsWith('Động tác 2/3'), 'doi sang giam chuyen dong giu canh hien tai');
  a2.seek(22); ok(E2.step() === 'Tổng kết', 'seek vao tong ket (che do tinh)');
}

// ================= 7. che do thuong =================
sect('7 che do thuong');
{
  const E = makeEnv(), def = mkDef(3), api = E.A.mount(E.el, def);
  ok(E.raf.q.length === 1, 'tu phat: 1 rAF xep hang');
  ok(E.byA('play').attrs['aria-disabled'] === 'true' && E.byA('pause').attrs['aria-disabled'] === 'false', 'trang thai nut khi dang phat');
  E.tick(); E.tick(10);   // 1 giay
  const p0 = E.pct(); E.tick(30); const p1 = E.pct();
  ok(p1 > p0, 'phat lam tien do tang ' + p0 + '->' + p1);
  // an panel
  E.el.rects = 0; E.tick();
  ok(E.raf.q.length === 0 && E.tm.q.length === 1, 'an panel: khong con rAF, co 1 thoi diem tham do');
  const calls = E.raf.calls, pa = E.pct();
  for (let i = 0; i < 20; i++) { E.fire(); E.tick(); }
  ok(E.raf.calls === calls && E.pct() === pa && E.tm.q.length === 1, 'an panel lau: rAF khong tang (' + calls + '), t khong tang, thoi diem tham do luon 1');
  E.el.rects = 1; E.fire(); ok(E.raf.q.length === 1, 'hien lai: quay lai rAF');
  E.tick(5); ok(E.pct() > pa, 'hien lai: tien do tiep tuc');
  // pause huy timer
  E.el.rects = 0; E.tick(); api.pause(); ok(E.tm.q.length === 0 && E.raf.q.length === 0, 'pause: huy timer + rAF');
  E.el.rects = 1; api.play(); ok(E.raf.q.length === 1, 'play lai');
  // chay toi het
  let guard = 0; while (E.raf.q.length && guard++ < 1000) E.tick();
  ok(E.pct() === 100 && E.byA('play').textContent === 'Phát lại' && E.step() === 'Tổng kết' && E.byA('play').attrs['aria-disabled'] === 'false', 'toi T: nhan "Phat lai", 100%, Tong ket');
  E.byA('play').click(); ok(E.raf.q.length === 1 && E.byA('play').textContent !== 'Phát lại', 'bam Phat lai chay lai');
  E.tick(3); api.destroy();
  ok(E.raf.q.length === 0 && E.tm.q.length === 0, 'destroy huy rAF/timer');
  ok(E.listeners() === 0 && E.mqL.length === 0, 'destroy go het listener: ' + E.listeners() + '/' + E.mqL.length);
  ok(E.el.__bsa === null, 'destroy xoa __bsa');
  ok(api.play() === undefined && E.raf.q.length === 0, 'play sau destroy khong lam gi');
  // mount lai tren cung el huy ban cu
  const a1 = E.A.mount(E.el, def), a2 = E.A.mount(E.el, def);
  ok(E.mqL.length === 1 && E.raf.q.length >= 1, 'mount lai huy ban cu (mq listener=' + E.mqL.length + ')');
  a2.destroy(); a1.destroy();
  // tach khoi DOM
  const E3 = makeEnv(); const ap = E3.A.mount(E3.el, def); E3.tick(); E3.el.isConnected = false; E3.tick();
  ok(E3.raf.q.length === 0 && E3.byA('play').attrs['aria-disabled'] === 'false', 'tach khoi DOM: dung phat');
  // dt kep 0.1 + aria-live
  const E4 = makeEnv(), a4 = E4.A.mount(E4.el, def); E4.tick(1, 100); E4.tick(1, 5000);
  ok(E4.pct() <= 1, 'dt kep 0.1s (pct=' + E4.pct() + ')');
  a4.pause(); a4.seek(5.9);
  ok(E4.byR('bsa.sr').textContent === '', 'chua doc aria-live khi chua hien du');
  a4.seek(6.3);
  ok(E4.byR('bsa.sr').textContent === 'Câu mẫu: Sentence number 1. Cấu trúc be + V-ing nghĩa là đang làm gì.', 'aria-live doc cau khi hien du: ' + E4.byR('bsa.sr').textContent);
  ok(E4.byR('bsa.sr').attrs['aria-live'] === 'polite', 'aria-live polite');
}

// ================= 8. an toan du lieu =================
sect('8 an toan');
{
  const E = makeEnv(), def = mkDef(3), X = '<img src=x onerror=alert(1)>';
  ['region_vi', 'svg_label_vi', 'svg_title_vi', 'svg_desc_vi', 'sr_tail_vi'].forEach((k) => { def[k] = X; });
  def.scenes.forEach((s) => { s.title_vi = X; s.label_vi = X; s.en = X; s.note_vi = X; s.pieces[0][0] = X; });
  def.formula[0][0] = X; def.outro.title_vi = X; def.outro.segs[0][0] = X;
  ok(E.A.validate(def, E.R).length === 0, 'chuoi nguy hiem la du lieu hop le');
  const api = E.A.mount(E.el, def);
  ok(!!api, 'mount duoc');
  api.seek(6.5);
  ok(E.htmlLog.every((h) => !/onerror|<img/i.test(h)), 'khong co <img/onerror trong innerHTML');
  ok(E.byR('bsa.step').textContent.includes(X), 'chuoi xuat hien nguyen van trong textContent');
  ok(E.byR('bsa.svg').attrs['aria-label'] === X && E.byR('bsa.sr').textContent.includes(X), 'qua setAttribute / textContent');
  ok(!E.all.some((e) => Object.keys(e.attrs).some((k) => /^on/i.test(k))), 'khong co thuoc tinh on*');
  api.destroy();
  const bad = clone(mkDef(3)); bad.cast.man.actor = '<script>';
  ok(E.A.mount(E.el, bad) === null, 'def sai -> mount tra null');
  const E2 = makeEnv(), d2 = mkDef(3); d2.cast['x"><script>'] = { actor: 'nam', x: 1 };
  ok(E2.A.validate(d2, E2.R).length > 0 && E2.A.mount(E2.el, d2) === null, 'id doi tuong nguy hiem bi tu choi');
  const mk = E.R.markup(mkDef(3));
  ok(!/<script|<image|href|\son\w+\s*=|foreignObject|\sid\s*=/i.test(mk), 'markup rig sach, khong id');
  ok(/stroke:var\(--pri,#[0-9a-f]+\)/i.test(mk), 'net hieu ung dung var(--pri,#...)');
  ok(!/stroke="#/.test(mk.slice(mk.indexOf('data-r="stream"'))), 'fx khong dung stroke hex cung');
}

// ================= 9. pha tinh: khong ghi trung =================
sect('9 khong ghi trung');
{
  const E = makeEnv({ reduced: true }), def = mkDef(3), api = E.A.mount(E.el, def);
  api.go(1); E.wr.n = 0; api.go(1);
  ok(E.wr.n === 0, 'tinh: go(1) lap lai ghi ' + E.wr.n + ' thuoc tinh');
  api.go(3); E.wr.n = 0; api.go(3); ok(E.wr.n === 0, 'tinh: Tong ket lap lai ghi ' + E.wr.n);
  const N = makeEnv(), a = N.A.mount(N.el, def); a.pause(); a.seek(5); N.wr.n = 0; a.seek(5);
  ok(N.wr.n === 0, 'thuong: seek(5) lap lai ghi ' + N.wr.n);
  a.seek(5.01); ok(N.wr.n > 0 && N.wr.n < 40, 'seek khac chi ghi phan thay doi: ' + N.wr.n);
  const w0 = N.wr.n; a.seek(5.01); ok(N.wr.n === w0, 'lap lai lan nua van 0 ghi them');
}

// ================= 10. quet ma =================
sect('10 quet ma');
for (const [name, src] of [['anim-engine.js', ENG], ['anim-rig.js', RIG]]) {
  for (const [re, label] of [[/http/, 'http'], [/fetch\(/, 'fetch('], [/XMLHttpRequest/, 'XMLHttpRequest'], [/localStorage/, 'localStorage'], [/\beval\b/, 'eval'], [/new Function/, 'new Function'], [/The man/, '"The man"'], [/Math\.min\(2/, 'Math.min(2'], [/\bdocument\b[.[]/, 'document. o cap cao nhat?']]) {
    if (label.startsWith('document')) continue;
    ok(!re.test(src), name + ' khong chua ' + label);
  }
  if (name === 'anim-engine.js') {
    const i0 = src.indexOf('el.innerHTML ='), tpl = src.slice(i0, src.indexOf("</div>';", i0));
    ok(i0 > 0 && !/def\.(?!stage\.[wh]\b|scenes\.map)\w+/.test(tpl), 'engine: mau innerHTML chi chua so w/h + chi so nut');
  }
  ok(!/\bid="/.test(src.replace(/data-r="/g, '')), name + ': khong dung thuoc tinh id');
}
ok(/'use strict';/.test(ENG) && /\}\)\(window\);\s*$/.test(ENG) && !/^\s*document\./m.test(ENG), 'engine IIFE strict, khong document o cap cao nhat');

// ================= 11. kich thuoc =================
sect('11 kich thuoc');
{
  const eb = Buffer.byteLength(ENG), rb = Buffer.byteLength(RIG);
  console.log('  engine ' + eb + ' B (<= 18432), rig ' + rb + ' B (<= 12288)');
  ok(eb <= 18 * 1024, 'engine <= 18KB');
  ok(rb <= 12 * 1024, 'rig <= 12KB');
}

console.log('\n' + pass + '/' + total + ' ca dat');
process.exit(pass === total ? 0 : 1);
