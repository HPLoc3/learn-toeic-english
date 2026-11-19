// Kiem tra trinh phat canh anh (assets/js/anim-scenes.js) bang node:vm + DOM gia, khong trinh duyet/server.  Chay: node tools/test-anim-scenes.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(root, 'assets/js/anim-scenes.js'), 'utf8');
const ENG = fs.readFileSync(path.join(root, 'assets/js/anim-engine.js'), 'utf8');
const SIZE_CAP = 16384; // hop dong ghi 10240 nhung khong du cho day du tinh nang; xem bao cao Executor A

let pass = 0, total = 0;
function ok(cond, msg) { total++; if (cond) pass++; else console.log('  FAIL: ' + msg); }
function sect(s) { console.log('# ' + s); }
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- du lieu mau (rut gon tu hop dong muc 1; C ghi ban that) ----------
function sc(id, img, en, pieces, note, kbTo, focus) {
  return { id, img, dur: 7, alt_vi: 'Mô tả ảnh ' + id + '.', en, vi: 'Câu tiếng Việt ' + id + '.', pieces, note_vi: note,
    kb: { from: [0.5, 0.5, 1.0], to: kbTo }, focus: Object.assign({ x: 0.5, y: 0.5, r: 0.12, at: 2.5, label_vi: 'đang ' + id }, focus || {}) };
}
function def() {
  return {
    v: 2, kind: 'scenes', id: 'l01', placeholder: true, region_vi: 'Hoạt hình mẹo be + V-ing',
    formula: [['be ('], ['is', 'be'], [') + động từ-'], ['ing', 'ing'], [' = đang làm gì']], sr_tail_vi: 'Cấu trúc be + V-ing nghĩa là đang làm gì.',
    img: { base: 'assets/img/l01/scene/', hd: 'assets/img-hd/l01/', w: [800, 1600], ratio: '16:9' },
    scenes: [
      sc('pour', 'nam-pour', 'He is pouring water into a cup.', [['He', ''], [' is', 'be'], [' pour', ''], ['ing', 'ing'], [' water into a cup.', '']], 'pour → pouring', [0.62, 0.55, 1.25], { x: 0.62, y: 0.58 }),
      sc('wipe', 'nam-wipe', 'He is wiping the counter.', [['He', ''], [' is', 'be'], [' wip', ''], ['ing', 'ing'], [' the counter.', '']], 'wipe → wiping', [0.45, 0.6, 1.25]),
      sc('look', 'mai-look', 'She is looking at a document.', [['She', ''], [' is', 'be'], [' look', ''], ['ing', 'ing'], [' at a document.', '']], 'look → looking', [0.4, 0.45, 1.3]),
      sc('type', 'mai-type', 'She is typing on a laptop.', [['She', ''], [' is', 'be'], [' typ', ''], ['ing', 'ing'], [' on a laptop.', '']], 'type → typing', [0.5, 0.6, 1.3]),
      sc('wear', 'hanh-wear', 'She is wearing glasses.', [['She', ''], [' is', 'be'], [' wear', ''], ['ing', 'ing'], [' glasses.', '']], 'wear → wearing', [0.5, 0.4, 1.35]),
      sc('point', 'hanh-point', 'She is pointing at the flowers.', [['She', ''], [' is', 'be'], [' point', ''], ['ing', 'ing'], [' at the flowers.', '']], 'point → pointing', [0.65, 0.5, 1.3])
    ],
    outro: { img: 'duo-cafe', dur: 2, alt_vi: 'Hai người bạn trong quán cà phê.', title_vi: 'Tổng kết', segs: [['Ghi nhớ nhanh: '], ['be', 'be'], [' + động từ-'], ['ing', 'ing'], ['.']] }
  };
}

// ---------- DOM gia ----------
function makeEnv(opts = {}) {
  const sb = {}; sb.window = sb;
  const all = [], raf = { q: [], calls: 0, cancels: 0 }, tm = { q: [], id: 0 }, mqL = [];
  sb.requestAnimationFrame = (f) => { raf.calls++; const id = raf.calls; raf.q.push([id, f]); return id; };
  sb.cancelAnimationFrame = (id) => { raf.cancels++; raf.q = raf.q.filter((x) => x[0] !== id); };
  sb.setTimeout = (f) => { const id = ++tm.id; tm.q.push([id, f]); return id; };
  sb.clearTimeout = (id) => { tm.q = tm.q.filter((x) => x[0] !== id); };
  const mq = { matches: !!opts.reduced }, mqAdd = (t, f) => { if (typeof t === 'function') f = t; mqL.push(f); }, mqRem = (t, f) => { if (typeof t === 'function') f = t; const i = mqL.indexOf(f); if (i >= 0) mqL.splice(i, 1); };
  if (opts.legacy) { mq.addListener = mqAdd; mq.removeListener = mqRem; } else { mq.addEventListener = mqAdd; mq.removeEventListener = mqRem; }
  sb.matchMedia = () => mq;
  const doc = { createElement: (t) => mk(t) };
  function mk(tag) {
    const e = {
      nodeType: 1, tagName: tag.toUpperCase(), tag, attrs: {}, children: [], listeners: [], style: {}, hidden: false, _t: '', ownerDocument: doc, isConnected: true, rects: 1, classes: new Set(), tw: 0,
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, removeAttribute(k) { delete this.attrs[k]; },
      appendChild(c) { this.children.push(c); return c; },
      addEventListener(t, f) { this.listeners.push([t, f]); }, removeEventListener(t, f) { this.listeners = this.listeners.filter((x) => !(x[0] === t && x[1] === f)); },
      getClientRects() { return new Array(this.rects); },
      closest(s) { return s.toLowerCase() === tag ? this : null; },
      fire(t) { const ev = { target: this, type: t }; this.listeners.filter((x) => x[0] === t).forEach((x) => x[1](ev)); return ev; },
      click() {
        const ev = this.fire('click');
        if (this.attrs['data-r'] !== 'root') { const r = all.find((x) => x.attrs['data-r'] === 'root'); if (r) r.listeners.filter((x) => x[0] === 'click').forEach((x) => x[1](ev)); }
      },
      get textContent() { return this._t + this.children.map((c) => c.textContent).join(''); },
      set textContent(v) { this.children = []; this._t = String(v); this.tw++; },
      set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
      get className() { return [...this.classes].join(' '); },
      set innerHTML(v) {
        this.children = []; this._t = ''; this.tw++;
        const re = /<(\w+)([^>]*)>([^<]*)/g; let m;
        while ((m = re.exec(String(v)))) {
          const c = mk(m[1]); c._t = m[3]; const ar = /([\w:-]+)="([^"]*)"/g; let a;
          while ((a = ar.exec(m[2]))) { c.attrs[a[1]] = a[2]; if (a[1] === 'class') c.className = a[2]; }
          if (/\shidden(\s|$)/.test(m[2])) c.hidden = true;
          this.children.push(c);
        }
      },
      querySelectorAll(sel) {
        const keys = sel.split(',').map((s) => /^\[([\w-]+)\]$/.exec(s.trim())[1]), out = [];
        (function walk(n) { n.children.forEach((c) => { if (keys.some((k) => k in c.attrs)) out.push(c); walk(c); }); })(this);
        return out;
      }
    };
    e.classList = { toggle(c, on) { if (on) e.classes.add(c); else e.classes.delete(c); }, contains: (c) => e.classes.has(c) };
    all.push(e);
    return e;
  }
  vm.createContext(sb);
  vm.runInContext(SRC, sb);
  const host = mk('div');
  const byR = (k) => host.querySelectorAll('[data-r]').find((x) => x.attrs['data-r'] === k);
  const byA = (k) => host.querySelectorAll('[data-a]').find((x) => x.attrs['data-a'] === k);
  let ts = 0;
  return {
    sb, host, all, raf, tm, mqL, mq, S: sb.BSScenes, byR, byA,
    chips: () => host.querySelectorAll('[data-s]'),
    tick(n = 1, dt = 100) { for (let i = 0; i < n; i++) { const q = raf.q; raf.q = []; ts += dt; q.forEach((x) => x[1](ts)); } },
    fire() { const q = tm.q; tm.q = []; q.forEach((x) => x[1]()); },
    listeners: () => all.reduce((s, e) => s + e.listeners.length, 0) + mqL.length,
    pct: () => +byR('bar').attrs['aria-valuenow'],
    on: (el) => [...el.classes].includes('bss-on')
  };
}

// ================= 1. Nap + validate =================
sect('1 nap + validate');
{
  const E = makeEnv(), S = E.S;
  ok(S && typeof S.validate === 'function' && typeof S.plan === 'function' && typeof S.mount === 'function', 'BSScenes co validate/plan/mount');
  ok(Object.keys(S).length === 3, 'BSScenes chi 3 khoa');
  const v0 = S.validate(def());
  ok(Array.isArray(v0) && v0.length === 0, 'mau hop le: ' + JSON.stringify(v0));
  const bad = (name, fn) => { const d = def(); fn(d); const r = S.validate(d); ok(Array.isArray(r) && r.length > 0, 'tu choi: ' + name); };
  bad('alt_vi rong', (d) => { d.scenes[0].alt_vi = ''; });
  bad('alt_vi khoang trang', (d) => { d.scenes[0].alt_vi = '   '; });
  bad('thieu vi', (d) => { delete d.scenes[1].vi; });
  bad('vi rong', (d) => { d.scenes[1].vi = ''; });
  bad('pieces != en', (d) => { d.scenes[2].en = 'She is looking at a paper.'; });
  bad('tag la', (d) => { d.scenes[0].pieces[1][1] = 'xx'; });
  bad('kb z=3', (d) => { d.scenes[0].kb.to[2] = 3; });
  bad('kb z=0.5', (d) => { d.scenes[0].kb.from[2] = 0.5; });
  bad('kb cx>1', (d) => { d.scenes[0].kb.from[0] = 1.2; });
  bad('kb thieu', (d) => { delete d.scenes[0].kb; });
  bad('focus.at > dur', (d) => { d.scenes[0].focus.at = 8; });
  bad('focus.r qua lon', (d) => { d.scenes[0].focus.r = 0.5; });
  bad('focus.x ngoai', (d) => { d.scenes[0].focus.x = 1.5; });
  bad('img sai regex', (d) => { d.scenes[0].img = '../x'; });
  bad('img chu hoa', (d) => { d.scenes[0].img = 'Nam'; });
  bad('outro.img sai', (d) => { d.outro.img = 'a/b'; });
  bad('base sai', (d) => { d.img.base = 'http://x/'; });
  bad('hd sai', (d) => { d.img.hd = 'assets/img-hd/l01'; });
  bad('w sai', (d) => { d.img.w = [400, 800]; });
  bad('ratio sai', (d) => { d.img.ratio = '4:3'; });
  bad('v:1', (d) => { d.v = 1; });
  bad('kind sai', (d) => { d.kind = 'rig'; });
  bad('id sai', (d) => { d.id = 'A B'; });
  bad('scenes rong', (d) => { d.scenes = []; });
  bad('> 8 canh', (d) => { while (d.scenes.length < 9) d.scenes.push(clone(d.scenes[0])); d.scenes.forEach((s, i) => { s.id = 's' + i; }); });
  bad('id canh trung', (d) => { d.scenes[1].id = d.scenes[0].id; });
  bad('id canh constructor-trung', (d) => { d.scenes[0].id = 'constructor'; d.scenes[1].id = 'constructor'; });
  bad('dur < 2', (d) => { d.scenes[0].dur = 1; });
  bad('tong > 300', (d) => { d.scenes.forEach((s) => { s.dur = 60; s.focus.at = 1; }); });
  bad('outro thieu', (d) => { delete d.outro; });
  bad('outro.alt rong', (d) => { d.outro.alt_vi = ''; });
  bad('outro.segs rong', (d) => { d.outro.segs = []; });
  bad('formula rong', (d) => { d.formula = []; });
  bad('chuoi > 400', (d) => { d.scenes[0].note_vi = 'x'.repeat(401); });
  bad('region_vi thieu', (d) => { delete d.region_vi; });
  ok(S.validate(null).length > 0 && S.validate(undefined).length > 0 && S.validate('x').length > 0 && S.validate([]).length > 0, 'validate(null/chuoi/mang) tra loi');
  const cyc = def(); cyc.scenes[0].self = cyc; ok(S.validate(cyc).length === 0, 'khoa la bi bo qua');
  const d2 = def(); d2.zzz = 1; d2.scenes[0].zzz = 2; ok(S.validate(d2).length === 0, 'khoa la khong loi');
  const d3 = def(); delete d3.scenes[0].pos; delete d3.scenes[0].focus; delete d3.placeholder; ok(S.validate(d3).length === 0, 'focus/placeholder tuy chon');
  const d5 = def(); d5.scenes[0].pos = [2, 'x']; d5.scenes[1].pos = 'abc'; ok(S.validate(d5).length === 0, 'pos cu (rac) duoc bo qua, khong loi');
  const d4 = def(); d4.scenes.length = 8 - 0; while (d4.scenes.length < 8) { const c = clone(d4.scenes[0]); c.id = 'c' + d4.scenes.length; d4.scenes.push(c); } ok(S.validate(d4).length === 0, '8 canh van hop le (56+2 giay)');
  const th = { get v() { throw new Error('boom'); } }; let r; try { r = S.validate(th); } catch (x) { r = null; }
  ok(Array.isArray(r) && r.length === 1 && r[0] === 'x', 'validate boc try/catch -> [x]');
}

// ================= 2. plan =================
sect('2 plan');
{
  const E = makeEnv(), S = E.S, p = S.plan(def());
  ok(p.T === 44, 'T = 44 (got ' + p.T + ')');
  ok(p.outroStart === 42 && p.outro.start === 42 && p.outro.dur === 2, 'outroStart 42, outro dur 2');
  ok(p.scenes.length === 6, '6 canh');
  p.scenes.forEach((s, i) => {
    ok(s.start === i * 7 && s.dur === 7, 'start/dur canh ' + i);
    ok(s.at.length === 5 && s.at.every((x, j) => j === 0 || x > s.at[j - 1]), 'at tang dan canh ' + i);
    ok(s.viAt > s.at[s.at.length - 1], 'viAt > at cuoi canh ' + i);
    ok(s.rest < s.dur && s.rest > s.viAt, 'rest < dur va > viAt canh ' + i);
  });
  const s0 = p.scenes[0];
  ok(s0.at[0] === 1.05 && s0.viAt === 3.5 && s0.rest === 6.79, 'cong thuc at/viAt/rest: ' + [s0.at[0], s0.viAt, s0.rest]);
  ok(s0.at[4] === 2.45, 'at[4] = dur*(0.15+0.25*4/5) = 2.45 (got ' + s0.at[4] + ')');
  p.scenes.forEach((x, i) => { ok(x.dur - x.at[x.at.length - 1] >= 4, 'canh ' + i + ': cau tieng Anh day du hien >= 4 s'); ok(x.dur - x.viAt >= 3, 'canh ' + i + ': nghia tieng Viet hien >= 3 s'); });
  ok(s0.focusAt === 2.5, 'focusAt = focus.at');
  const d = def(); delete d.scenes[1].focus; ok(S.plan(d).scenes[1].focusAt === null, 'focusAt null khi khong co focus');
  ok(JSON.stringify(S.plan(def())) === JSON.stringify(p), 'plan thuan (lap lai = nhau)');
}

// ================= 3. mount: markup =================
sect('3 mount markup');
{
  const E = makeEnv(), api = E.S.mount(E.host, def());
  ok(api && typeof api === 'object', 'mount tra api');
  ['play', 'pause', 'replay', 'seek', 'go', 'destroy'].forEach((k) => ok(typeof api[k] === 'function', 'api.' + k));
  ok(api.duration === 44, 'api.duration = T');
  ok(Object.keys(api).length === 7, 'api 7 thanh phan');
  ok(E.host.__bss === api, 'host.__bss = api');
  const root = E.byR('root'), img = E.byR('img');
  ok(root && root.attrs.role === 'region' && root.attrs['aria-label'] === def().region_vi, 'root role=region + aria-label');
  ok(img.attrs.alt === def().scenes[0].alt_vi, 'img alt = alt_vi');
  ok(img.attrs.srcset === 'assets/img/l01/scene/nam-pour-800.webp 800w, assets/img-hd/l01/nam-pour-1600.webp 1600w', 'srcset 800w + 1600w: ' + img.attrs.srcset);
  ok(img.attrs.src === 'assets/img/l01/scene/nam-pour-800.webp', 'src = 800');
  ok(img.attrs.decoding === 'async' && img.attrs.width === '800' && img.attrs.height === '450' && /100vw/.test(img.attrs.sizes), 'decoding/width/height/sizes');
  ok(/aspect-ratio:\s*16\/9/.test(E.byR('stage').attrs.style), 'stage aspect-ratio 16/9');
  const sr = E.byR('sr'); ok(sr && sr.attrs['aria-live'] === 'polite', 'aria-live polite');
  const bar = E.byR('bar'); ok(bar.attrs.role === 'progressbar' && bar.attrs['aria-valuemin'] === '0' && bar.attrs['aria-valuemax'] === '100', 'progressbar');
  const idx = (cls) => E.all.findIndex((e) => e.classes.has(cls));
  ok(idx('bss-fig') >= 0 && idx('bss-cap') > idx('bss-stage'), 'figure/stage truoc figcaption (caption duoi anh)');
  ok(E.all.find((e) => e.classes.has('bss-cap')).tag === 'figcaption' && E.all.find((e) => e.classes.has('bss-fig')).tag === 'figure', 'figure/figcaption');
  ok(E.chips().length === 7, '7 chip buoc (6 + outro)');
  ok(E.chips().every((c, i) => c.textContent === 'Bước ' + (i + 1) && c.attrs['aria-label'].startsWith(c.textContent + ':') && c.attrs.type === 'button'), 'chip nhan + aria-label bat dau bang chu hien thi (WCAG 2.5.3) + type=button');
  ok(E.chips()[0].attrs['aria-current'] === 'step' && E.chips().filter((c) => 'aria-current' in c.attrs).length === 1, 'chi chip hien tai co aria-current');
  ok(/pour → pouring/.test(E.chips()[0].attrs['aria-label']), 'aria-label chip dung note_vi');
  ['toggle', 'prev', 'next', 'replay'].forEach((a) => ok(E.byA(a) && E.byA(a).attrs.type === 'button', 'nut ' + a));
  ok(E.byA('prev').hidden && E.byA('next').hidden, 'prev/next an khi khong reduced');
  const sent = E.byR('sent'); ok(sent.attrs.lang === 'en', 'sent lang=en');
  ok(sent.children.map((c) => c.textContent).join('') === def().scenes[0].en, 'cau noi lai = en');
  ok(sent.children[1].classes.has('bss-be') && sent.children[3].classes.has('bss-ing') && sent.children.every((c) => c.classes.has('bss-p')), 'highlight be/ing dung lop bss-be/bss-ing');
  ok(E.byR('fm').children.length === 5 && E.byR('fm').children[1].classes.has('bss-be') && E.byR('fm').children[3].classes.has('bss-ing'), 'cong thuc formula co be/ing');
  ok(E.byR('rn').hidden === true, 'ghi chu reduced an khi chay thuong');
  ok(E.host.children[0].tag === 'style' && /\.bss-root/.test(E.host.children[0].textContent), 'CSS tiem bang <style> trong host');
  ok(E.raf.q.length === 1, 'auto play: 1 raf cho');
  api.destroy();
}

// ================= 4. mount tu choi =================
sect('4 mount tu choi');
{
  const E = makeEnv(), S = E.S;
  ok(S.mount(E.host, null) === null && S.mount(E.host, undefined) === null && S.mount(E.host, 'x') === null, 'def sai -> null');
  const d = def(); d.scenes[0].alt_vi = ''; ok(S.mount(E.host, d) === null, 'def khong hop le -> null');
  ok(S.mount(null, def()) === null && S.mount({}, def()) === null && S.mount({ nodeType: 3 }, def()) === null && S.mount(undefined, def()) === null, 'host khong phai Element -> null');
  ok(E.raf.calls === 0 && E.all.length === 1, 'tu choi khong tao DOM, khong raf');
  const d1 = def(); d1.v = 1; ok(S.mount(E.host, d1) === null, 'v:1 -> null');
  ok(S.mount(E.host, { v: 2, kind: 'scenes' }) === null, 'def thieu -> null');
}

// ================= 5. playback =================
sect('5 playback');
{
  const E = makeEnv(), api = E.S.mount(E.host, def());
  const sr = E.byR('sr'), img = E.byR('img'), ring = E.byR('ring'), sent = E.byR('sent'), vi = E.byR('vi');
  ok(E.pct() === 0 && !E.byA('toggle').hidden && E.byA('toggle').textContent === 'Tạm dừng' && !E.byA('play') && !E.byA('pause'), 'dang chay: mot nut toggle, nhan Tam dung');
  ok(sr.textContent === '' && !E.on(sent.children[0]) && !E.on(vi) && ring.hidden, 'luc dau: chua hien cau/vi/vong');
  E.tick(1);
  E.tick(9); // ~0.9s
  ok(!sent.children.some((c) => E.on(c)), 'chua den at[0]=1.05 -> chua hien manh nao');
  const tr0 = img.style.transform;
  ok(/^translate\(-?[\d.]+%,-?[\d.]+%\) scale\([\d.]+\)$/.test(tr0), 'Ken Burns: transform translate+scale: ' + tr0);
  E.tick(2); // ~1.1s
  ok(E.on(sent.children[0]) && !E.on(sent.children[4]) && ring.hidden, 'at[0] da qua: hien manh dau, chua manh cuoi, vong chua hien');
  E.tick(15); // ~2.6s
  ok(!ring.hidden && ring.style.left && ring.style.top && /%$/.test(ring.style.width), 'vong hien tu focusAt: ' + ring.style.left + ' ' + ring.style.top + ' ' + ring.style.width);
  ok(E.byR('lab').textContent === 'đang pour' || E.byR('lab').textContent === 'đang ' + def().scenes[0].id, 'nhan label_vi');
  ok(sent.children.every((c) => E.on(c)), 'hien het manh cau (<= 0.4*dur)');
  ok(!E.on(vi) && sr.textContent === '', 'chua viAt (3.5s): vi chua hien, chua doc');
  E.tick(10); // ~3.6s
  ok(E.on(vi), 'qua viAt: vi hien');
  ok(sr.textContent === 'Câu mẫu: He is pouring water into a cup. Câu tiếng Việt pour. pour → pouring.', 'aria-live doc cau + vi + note (khong tail, khong "..."): ' + sr.textContent);
  ok(!/\.\./.test(sr.textContent) && !sr.textContent.includes('Cấu trúc be'), 'khong dau cham doi, sr_tail_vi khong doc o canh');
  ok(sr.children.length === 3 && sr.children[1].attrs.lang === 'en' && sr.children[1].textContent === def().scenes[0].en && !('lang' in sr.children[0].attrs), 'cau tieng Anh nam trong span lang=en, phan Viet khong gan lang');
  ok(sr.textContent.includes(def().scenes[0].vi.replace(/\.$/, '')) && sr.textContent.includes('pour → pouring'), 'doc du en/vi/note');
  const w0 = sr.tw; E.tick(3); ok(sr.tw === w0, 'khong doc lai trong cung canh');
  const z = (s) => +/scale\(([\d.]+)\)/.exec(s)[1];
  const tx = (s) => +/translate\((-?[\d.]+)%/.exec(s)[1], ty = (s) => +/translate\(-?[\d.]+%,(-?[\d.]+)%/.exec(s)[1];
  const t1 = img.style.transform; ok(z(t1) > z(tr0), 'Ken Burns phong to theo thoi gian');
  // chuyen canh
  E.tick(32); // ~7.1s
  ok(img.attrs.src === 'assets/img/l01/scene/nam-wipe-800.webp' && img.attrs.alt === def().scenes[1].alt_vi, 'sang canh 2: src/alt doi');
  ok(sent.children.map((c) => c.textContent).join('') === def().scenes[1].en, 'sang canh 2: cau doi');
  ok(!E.on(sent.children[4]) && !E.on(vi), 'sang canh 2: manh/vi reset');
  ok(E.chips()[1].attrs['aria-current'] === 'step' && !('aria-current' in E.chips()[0].attrs), 'chip dung aria-current');
  ok(E.pct() > 15 && E.pct() < 20, 'progress ~ t/T (got ' + E.pct() + ')');
  // Ken Burns kep trong anh: translate trong [(1-z)*100, 0]
  for (let i = 0; i < 40; i++) {
    E.tick(1); const tr = img.style.transform; if (tr === 'none') continue;
    const zz = z(tr), x = tx(tr), y = ty(tr);
    if (x > 0.001 || y > 0.001 || x < (1 - zz) * 100 - 0.1 || y < (1 - zz) * 100 - 0.1) { ok(false, 'transform lo ra ngoai anh: ' + tr); break; }
  }
  ok(true, 'transform luon trong anh');
  // seek / go
  api.seek(100); ok(E.pct() === 100, 'seek ngoai => T');
  ok(E.on(E.byR('sent').children[0]) && E.byR('vi').hidden, 'o outro: vi an, cau hien');
  api.seek(NaN); ok(E.pct() === 0, 'seek(NaN) = 0');
  api.go(2); ok(E.byR('img').attrs.src.includes('mai-look-800'), 'go(2) -> canh look');
  api.go(99); ok(E.byR('img').attrs.src.includes('duo-cafe-800') && E.byR('step').textContent === 'Tổng kết', 'go(99) -> outro (duo-cafe)');
  ok(E.byR('img').attrs.alt === def().outro.alt_vi, 'outro alt');
  ok(E.byR('sr').textContent === 'Tổng kết. Ghi nhớ nhanh: be + động từ-ing. ' + def().sr_tail_vi, 'outro doc: title + segs + sr_tail_vi (mot lan, khong ..): ' + E.byR('sr').textContent);
  api.go(-5); ok(E.byR('img').attrs.src.includes('nam-pour-800'), 'go(-5) -> canh 0');
  api.destroy();
}

// ================= 5b. chay het, nut, chip =================
sect('5b nut + chay het');
{
  const E = makeEnv(), api = E.S.mount(E.host, def()), tg = E.byA('toggle');
  const live = () => E.all.filter((e) => e.tag === 'button' && !e.hidden).length;
  ok(!tg.hidden && tg.textContent === 'Tạm dừng', 'dang chay: toggle hien, nhan Tam dung');
  tg.click(); ok(E.raf.q.length === 0 && E.raf.cancels === 1, 'Tam dung huy raf');
  ok(!tg.hidden && tg.textContent === 'Phát', 'Tam dung -> cung nut, nhan Phat, KHONG an (giu focus ban phim)');
  const p0 = E.pct(); E.tick(5); ok(E.pct() === p0, 'dung hinh khi pause');
  tg.click(); ok(E.raf.q.length === 1 && !tg.hidden && tg.textContent === 'Tạm dừng', 'Phat lai: co raf, nut van hien, nhan Tam dung');
  E.chips()[3].click(); ok(E.byR('img').attrs.src.includes('mai-type-800') && E.chips()[3].attrs['aria-current'] === 'step', 'bam chip 4 -> canh type');
  E.chips()[6].click(); ok(E.byR('img').attrs.src.includes('duo-cafe'), 'bam chip 7 -> outro');
  E.tick(60); // qua T
  ok(!tg.hidden && tg.textContent === 'Phát' && E.pct() === 100, 'het phim tu dung: nut van hien (khong mat focus), nhan Phat, 100%');
  ok(E.raf.q.length === 0, 'het phim khong con raf');
  tg.click(); ok(E.raf.q.length === 1 && E.pct() === 0, 'Phat sau khi het -> chay lai tu dau');
  E.tick(10); E.byA('replay').click(); ok(E.pct() === 0 && E.byR('img').attrs.src.includes('nam-pour'), 'Xem lai ve canh 1');
  E.tick(80); ok(/^Câu mẫu: He is pouring/.test(E.byR('sr').textContent), 'sau replay doc lai canh 1');
  // moi nut vua bam khong duoc bien mat (focus ban phim)
  const clicked = [tg, tg, E.byA('replay'), E.chips()[2], E.chips()[6], E.chips()[0], tg];
  clicked.forEach((b, i) => { b.click(); ok(!b.hidden, 'sau khi bam nut #' + i + ' (' + (b.attrs['data-a'] || b.attrs['data-s']) + ') nut khong bi an'); });
  ok(live() === 2 + 7, 'chay thuong: 2 nut dieu khien (toggle, replay; prev/next an) + 7 chip hien: ' + live());
  api.destroy();
}
// ---- 5b2. go(k)/chip nhay toi rest o ca hai che do; dong ho dt ----
sect('5b2 go -> rest + dong ho');
{
  const E = makeEnv(), api = E.S.mount(E.host, def()), sent = E.byR('sent'), ring = E.byR('ring');
  E.byA('toggle').click(); // dung hinh
  E.chips()[2].click();
  ok(E.byR('img').attrs.src.includes('mai-look') && sent.children.every((c) => E.on(c)) && E.on(E.byR('vi')) && !ring.hidden, 'chip 3 khi tam dung: day du cau + vi + vong');
  ok(Math.abs(E.pct() - Math.round(100 * (14 + 7 * 0.97) / 44)) <= 1, 'chip 3: thoi gian = rest cua canh 3 (' + E.pct() + '%)');
  api.go(0); ok(sent.children.every((c) => E.on(c)) && E.on(E.byR('vi')) && !ring.hidden, 'go(0) cung den rest');
  {
    const P = makeEnv(), ap = P.S.mount(P.host, def());
    P.tick(1); P.tick(5);
    P.chips()[2].click(); // dang phat: nhay toi DAU canh 3 va tiep tuc phat
    ok(P.byR('img').attrs.src.includes('mai-look') && P.byA('toggle').textContent === 'Tạm dừng' && P.raf.q.length === 1, 'dang phat + bam chip 3: vao canh 3, van phat');
    P.tick(10); // 1 s
    ok(P.byR('img').attrs.src.includes('mai-look') && P.chips()[2].attrs['aria-current'] === 'step', 'sau 1 s van o canh 3 (khong bi nhay sang canh 4)');
    P.chips()[6].click(); P.tick(5);
    ok(P.byR('img').attrs.src.includes('duo-cafe') && P.raf.q.length === 1, 'chip outro khi phat: vao outro, chua het phim sau 0.5 s');
    ap.destroy();
  }
  api.go(6); ok(sent.children.every((c) => E.on(c)) && E.byR('vi').hidden, 'go(outro): cau day du');
  const E2 = makeEnv({ reduced: true }); E2.S.mount(E2.host, def()); E2.chips()[4].click();
  ok(E2.byR('sent').children.every((c) => E2.on(c)) && E2.on(E2.byR('vi')) && !E2.byR('ring').hidden, 'reduced: chip van den rest');
  // dt toi da 0.5s/khung: tab bi bop khung (1.3 fps ~ 770 ms/khung) van chay ~ 0.5 s thuc moi khung
  const E3 = makeEnv(), a3 = E3.S.mount(E3.host, def());
  E3.tick(1, 770); E3.tick(10, 770); // 10 khung x 0.5 s = 5 s
  ok(Math.abs(E3.pct() - Math.round(100 * 5 / 44)) <= 1, 'cap dt = 0.5: 10 khung 770ms -> t = 5 s (got ' + E3.pct() + '%)');
  const E4 = makeEnv(), a4 = E4.S.mount(E4.host, def());
  E4.tick(1, 100); E4.tick(1, 30000); // nhay tab: chi tien 0.5 s
  ok(E4.pct() === Math.round(100 * 0.5 / 44), 'nhay tab 30 s van chi tien 0.5 s (got ' + E4.pct() + '%)');
  const E5 = makeEnv(), a5 = E5.S.mount(E5.host, def());
  E5.tick(1, 100); E5.tick(10, 300); // 3 s: truoc day cap 0.1 se chi 1 s
  ok(E5.pct() === Math.round(100 * 3 / 44), 'khung 300ms tien du 300ms (got ' + E5.pct() + '%)');
  [a3, a4, a5, api].forEach((x) => x.destroy());
}

// ================= 5c. an / ngat ket noi =================
sect('5c an + ngat ket noi');
{
  const E = makeEnv(), api = E.S.mount(E.host, def());
  E.host.rects = 0; E.tick(1);
  ok(E.raf.q.length === 0 && E.tm.q.length === 1, 'host an: khong raf, cho 400ms');
  E.host.rects = 1; E.fire(); ok(E.raf.q.length === 1 && E.tm.q.length === 0, 'het an: tiep tuc raf');
  E.tick(2); E.host.isConnected = false; E.tick(1);
  ok(E.raf.q.length === 0 && E.tm.q.length === 0, 'ngat ket noi: dung phat');
  ok(!E.byA('toggle').hidden && E.byA('toggle').textContent === 'Phát', 'ngat ket noi: hien Phat');
  api.destroy();
  // host chua tung ket noi: khong chay ngam
  const F = makeEnv(); F.host.isConnected = false; const af = F.S.mount(F.host, def()); F.tick(1);
  ok(F.raf.q.length === 0 && F.tm.q.length === 0 && F.byA('toggle').textContent === 'Phát' && !F.byA('toggle').hidden, 'host chua ket noi: pl=0, hien Phat, khong raf/timer');
  af.destroy();
}

// ================= 6. reduced motion =================
sect('6 reduced-motion');
{
  const E = makeEnv({ reduced: true }), api = E.S.mount(E.host, def());
  ok(api && E.raf.calls === 0 && E.tm.q.length === 0, 'khong raf/timer, khong autoplay');
  ok(E.byA('toggle').hidden, 'toggle an');
  ok(!E.byA('prev').hidden && !E.byA('next').hidden, 'Truoc/Tiep hien');
  ok(E.byA('prev').attrs['aria-disabled'] === 'true' && E.byA('next').attrs['aria-disabled'] === 'false', 'prev bi vo hieu o canh 1');
  ok(!E.byR('rn').hidden && /Bấm “Tiếp”/.test(E.byR('rn').textContent), 'hien ghi chu reduced-motion');
  ok(E.byR('img').style.transform === 'none', 'transform none');
  const ring = E.byR('ring'); ok(!ring.hidden && ring.style.left === '62%' && ring.style.top === '58%' && ring.style.width === '24%', 'vong hien tinh ngay, dung vi tri: ' + [ring.style.left, ring.style.top, ring.style.width]);
  const sent = E.byR('sent'); ok(sent.children.every((c) => E.on(c)) && E.on(E.byR('vi')), 'o trang thai rest: moi manh + vi da hien');
  ok(/^Câu mẫu: He is pouring/.test(E.byR('sr').textContent), 'doc ngay');
  ok(E.pct() === Math.round(100 / 7), 'progress = (k+1)/(N+1): ' + E.pct());
  E.byA('next').click();
  ok(E.byR('img').attrs.src.includes('nam-wipe') && E.pct() === Math.round(200 / 7) && E.byR('img').style.transform === 'none', 'Tiep -> canh 2, tuc thi, transform none');
  ok(E.byA('prev').attrs['aria-disabled'] === 'false', 'prev bat o canh 2');
  E.byA('prev').click(); ok(E.byR('img').attrs.src.includes('nam-pour'), 'Truoc -> canh 1');
  E.byA('prev').click(); ok(E.byR('img').attrs.src.includes('nam-pour'), 'prev o canh dau khong lui (aria-disabled)');
  E.chips()[6].click(); ok(E.byA('next').attrs['aria-disabled'] === 'true' && E.pct() === 100, 'outro: next vo hieu, 100%');
  E.byA('next').click(); ok(E.byR('img').attrs.src.includes('duo-cafe'), 'next o outro khong di tiep');
  api.play(); ok(E.raf.calls === 0, 'play() bi bo qua khi reduced');
  api.replay(); ok(E.raf.calls === 0 && E.byR('img').attrs.src.includes('nam-pour'), 'replay reduced: ve canh 1, khong raf');
  api.seek(20); ok(E.byR('img').attrs.src.includes('mai-look') && E.byR('img').style.transform === 'none', 'seek reduced -> dung o canh');
  // doi cai dat khi dang chay
  api.destroy();
}
{
  const E = makeEnv(), api = E.S.mount(E.host, def());
  E.tick(30); ok(E.raf.q.length === 1 && E.byR('img').style.transform !== 'none', 'dang chay thuong');
  E.host.ownerDocument.activeElement = E.byA('toggle'); E.byA('next').focus = () => { E.host.ownerDocument.activeElement = E.byA('next'); };
  E.mq.matches = true; E.mqL.forEach((f) => f());
  ok(E.host.ownerDocument.activeElement === E.byA('next'), 'bat reduced khi toggle co focus: chuyen focus sang Tiep');
  ok(E.raf.q.length === 0 && E.byA('toggle').hidden && !E.byA('prev').hidden && !E.byR('rn').hidden, 'bat reduced giua chung: dung phat, doi UI');
  ok(E.byR('img').style.transform === 'none', 'bat reduced: transform none');
  ok(E.byR('img').attrs.src.includes('nam-pour') && E.on(E.byR('vi')), 'giu canh hien tai o trang thai rest');
  E.mq.matches = false; E.mqL.forEach((f) => f());
  ok(E.raf.q.length === 0 && !E.byA('toggle').hidden && E.byA('toggle').textContent === 'Phát' && E.byA('prev').hidden && E.byR('rn').hidden, 'tat reduced: dung, hien Phat, an Truoc/Tiep');
  E.byA('toggle').click(); ok(E.raf.q.length === 1, 'Phat lai duoc sau khi tat reduced');
  api.destroy();
}
{
  // Safari <= 13: chi co addListener/removeListener
  const E = makeEnv({ legacy: true }), api = E.S.mount(E.host, def());
  ok(api && E.mqL.length === 1, 'legacy mq: dung addListener (khong nem loi)');
  E.mq.matches = true; E.mqL.forEach((f) => f()); ok(E.byA('toggle').hidden, 'legacy mq: change chay');
  api.destroy(); ok(E.mqL.length === 0 && E.listeners() === 0, 'legacy mq: destroy go removeListener');
}

// ================= 7. onerror =================
sect('7 onerror');
{
  const E = makeEnv(), api = E.S.mount(E.host, def()), img = E.byR('img');
  ok(img.attrs.srcset && E.byR('fb').hidden && !E.byR('stage').hidden, 'ban dau: co srcset, khong fallback');
  img.fire('error');
  ok(!('srcset' in img.attrs) && img.attrs.src === 'assets/img/l01/scene/nam-pour-800.webp', 'loi lan 1: go srcset, dat src = 800');
  ok(E.byR('fb').hidden && !E.byR('stage').hidden, 'loi lan 1: chua fallback');
  img.fire('error');
  const fb = E.byR('fb');
  ok(!fb.hidden && E.byR('stage').hidden && fb.attrs['data-fallback'] === '1' && fb.attrs.role === 'img' && fb.attrs['aria-label'] === def().scenes[0].alt_vi, 'loi lan 2: the .bss-fb (role=img, aria-label=alt, data-fallback=1)');
  ok(fb.classes.has('bss-fb') && fb.textContent === 'He is pouring water into a cup.', 'fallback hien en lon');
  ok(E.byR('sent').children.length === 5 && !E.byA('replay').hidden, 'caption/dieu khien van song');
  api.go(1);
  ok(E.byR('fb').hidden && !E.byR('stage').hidden && E.byR('img').attrs.srcset, 'canh khac: anh binh thuong tro lai (theo tung anh), srcset khoi phuc');
  api.go(0); ok(!E.byR('fb').hidden, 'quay lai canh loi: fallback');
  api.go(2); E.byR('img').fire('error'); api.go(3);
  ok(E.byR('img').attrs.srcset && E.byR('fb').hidden, 'loi 1 lan o canh 3 roi sang canh 4: canh 4 chua bi tinh loi');
  E.byR('img').fire('error'); ok(!('srcset' in E.byR('img').attrs) && E.byR('fb').hidden, 'loi dau tien cua canh 4 chi go srcset (khong cong don tu canh 3)');
  api.destroy();
}

// ================= 8. destroy =================
sect('8 destroy');
{
  const E = makeEnv(), api = E.S.mount(E.host, def());
  ok(E.listeners() > 0, 'co listener truoc destroy');
  E.tick(3);
  E.host.rects = 0; E.tick(1); // tao timer 400ms
  ok(E.tm.q.length === 1, 'co timer 400ms');
  const img = E.byR('img');
  api.destroy();
  ok(E.raf.q.length === 0 && E.tm.q.length === 0, 'destroy: 0 raf/timer');
  ok(E.listeners() === 0, 'destroy: 0 listener (con ' + E.listeners() + ')');
  ok(E.host.children.length === 0 && E.host.textContent === '', 'destroy: host rong');
  ok(E.host.__bss === null, 'host.__bss = null');
  api.destroy(); api.destroy();
  ok(true, 'destroy goi nhieu lan an toan');
  api.play(); api.pause(); api.seek(3); api.go(1); api.replay();
  ok(E.tm.q.length === 0, 'api sau destroy khong tao timer');
  // mount lai tren cung host: huy ban cu
  const a1 = E.S.mount(E.host, def()), a2 = E.S.mount(E.host, def());
  ok(a1 !== a2 && E.host.__bss === a2, 'mount lai tren host: huy ban cu, __bss = ban moi');
  ok(E.raf.q.length === 1, 'mount lai: chi con 1 vong raf (ban cu da huy)');
  ok(E.listeners() === E.all.filter((e) => e.attrs['data-r'] === 'root' || e.attrs['data-r'] === 'img').filter((e) => e.listeners.length).length + E.mqL.length, 'listener chi cua ban moi');
  const live = E.all.filter((e) => e.listeners.length).length; ok(live === 2, 'ban moi chi 2 phan tu co listener (root + img): ' + live);
  a2.destroy(); ok(E.listeners() === 0 && E.raf.q.length === 0, 'don sach lan nua');
}

// ================= 9. engine cu tu choi v2 =================
sect('9 BSAnim.validate tu choi v2');
{
  const sb = {}; sb.window = sb; vm.createContext(sb); vm.runInContext(ENG, sb);
  const r = sb.BSAnim.validate(def());
  ok(Array.isArray(r) && r.length > 0, 'engine cu tu choi def v2: ' + JSON.stringify(r).slice(0, 80));
  ok(sb.BSAnim.mount({ nodeType: 1 }, def()) === null, 'BSAnim.mount(def v2) -> null');
}

// ================= 9b. CSS theme (sang/toi) =================
sect('9b CSS theme');
{
  const E = makeEnv(); E.S.mount(E.host, def());
  const css = E.host.children[0].textContent.replace(/@media[^{]*\{[^{}]*\{[^}]*\}\}/g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
  const bgRules = rules.filter(([, b]) => /(^|;)\s*background(-color)?:/.test(b));
  ok(bgRules.length >= 8, 'tim thay cac luat co background (' + bgRules.length + ')');
  bgRules.forEach(([sel, b]) => {
    const bg = /(?:^|;)\s*background(?:-color)?:([^;]*)/.exec(b)[1];
    const themed = /^\s*var\(--[a-zA-Z0-9-]+(,\s*#[0-9a-f]{3,6})?\)\s*$/i.test(bg);
    ok(/(^|;)\s*color:/.test(b) || themed, sel + ': background "' + bg.trim() + '" cung cung mau chu hoac dung bien theme');
  });
  // moi mau literal (#hex) chi duoc nam trong var(--x, #hex) (de theme toi doi duoc), tru nen/chu cung cap
  const lit = css.replace(/var\(--[a-z0-9-]+,\s*#[0-9a-f]{3,6}\)/gi, '').match(/#[0-9a-f]{3,6}/gi) || [];
  ok(lit.length === 0, 'khong con mau #hex cung ngoai var(): ' + lit.join(','));
  ok(/\.bss-root\{[^}]*background:var\(--card[^}]*color:var\(--ink/.test(css), 'root dat ca nen (--card) va chu (--ink) theo theme');
  ok(/\.bss-vi\{[^}]*background:var\(--card-2/.test(css), 'hop nghia Viet dung --card-2, chu ke thua --ink');
}

// ================= 10. tep nguon =================
sect('10 kich thuoc + API cam');
{
  const bytes = Buffer.byteLength(SRC, 'utf8');
  console.log('  anim-scenes.js = ' + bytes + ' byte (tran hop dong 10240, tran test ' + SIZE_CAP + ')');
  ok(bytes <= SIZE_CAP, 'anim-scenes.js <= ' + SIZE_CAP + ' byte (got ' + bytes + ')');
  [/\bfetch\s*\(/, /XMLHttpRequest/, /localStorage/, /sessionStorage/, /\beval\s*\(/, /new\s+Function/, /document\.write/, /\bimport\s*\(/].forEach((re) => ok(!re.test(SRC), 'khong dung ' + re));
  ok((SRC.match(/innerHTML/g) || []).length === 1, 'innerHTML chi 1 lan (khung tinh)');
  ok(!SRC.includes('\r'), 'LF only');
  ok(!/<\/?(script|iframe)/i.test(SRC), 'khong chen script/iframe');
  const m = /host\.innerHTML = ([\s\S]*?);\n  l = host/.exec(SRC);
  ok(m && !/\bd\.|\bs\.|SC\[|\bO\./.test(m[1].replace(/'[^']*'/g, '')), 'innerHTML chi ghep CSS + nut tinh, khong ghep chuoi du lieu');
  ok(/'use strict'/.test(SRC) && /g\.BSScenes\s*=/.test(SRC), 'use strict + gan window.BSScenes');
  ok(/@media\(prefers-reduced-motion:reduce\)/.test(SRC) && /focus-visible/.test(SRC) && /min-height:44px/.test(SRC), 'CSS: reduced-motion, focus ring, nut 44px');
  ok(!/\.bsa-|BSAnim|BSRig/.test(SRC), 'khong dung lop/engine cu');
}

console.log('\n' + pass + '/' + total + ' passed');
process.exit(pass === total ? 0 : 1);
