// Sinh tools/fixtures/anim-l01-legacy.json tu hoat hinh CU (assets/js/anim-being.js, commit 3f5214e).
// Chay: node tools/make-anim-fixture.mjs   (khong trinh duyet, khong mang)
// Neu anim-being.js da bi xoa, doc ban cu bang `git show 3f5214e:assets/js/anim-being.js`.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OLD = path.join(root, 'assets/js/anim-being.js');
const src = fs.existsSync(OLD) ? fs.readFileSync(OLD, 'utf8')
  : execFileSync('git', ['show', '3f5214e:assets/js/anim-being.js'], { cwd: root, encoding: 'utf8', timeout: 20000 });

function makeEnv(reduced) {
  class FNode {
    constructor(tag, attrs) {
      this.nodeType = 1; this.tag = tag; this.attrs = Object.assign({}, attrs || {});
      this.children = []; this._text = ''; this._html = ''; this.hidden = ('hidden' in this.attrs);
      this.style = {}; this.reg = []; this.listeners = {};
      this.isConnected = true;
      const set = new Set((this.attrs['class'] || '').split(/\s+/).filter(Boolean));
      this.classList = {
        toggle: (c, on) => { const v = on === undefined ? !set.has(c) : !!on; if (v) set.add(c); else set.delete(c); return v; },
        contains: (c) => set.has(c), add: (c) => set.add(c), remove: (c) => set.delete(c)
      };
      this._set = set;
    }
    get className() { return [...this._set].join(' '); }
    set className(v) { this._set.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this._set.add(c)); }
    getClientRects() { return [1]; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    appendChild(n) { this.children.push(n); return n; }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this._text = String(v); this.children = []; this._html = ''; }
    get innerHTML() { return this._html; }
    set innerHTML(h) {
      this._html = String(h); this.children = []; this._text = '';
      this.reg = [];
      const re = /<(\w+)([^>]*)>/g; let m;
      while ((m = re.exec(this._html))) {
        if (!/data-(r|a|s)=/.test(m[2])) continue;
        const attrs = {}; const are = /([\w-]+)(?:="([^"]*)")?/g; let a;
        while ((a = are.exec(m[2]))) attrs[a[1]] = a[2] === undefined ? '' : a[2];
        this.reg.push(new FNode(m[1], attrs));
      }
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    querySelectorAll(sel) {
      const m = /^\[(data-[ras])(?:="([^"]*)")?\]$/.exec(sel);
      if (!m) return [];
      return this.reg.filter((n) => m[1] in n.attrs && (m[2] === undefined || n.attrs[m[1]] === m[2]));
    }
  }
  const raf = [];
  const win = {
    matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: (f) => { raf.push(f); return raf.length; },
    cancelAnimationFrame() {}
  };
  const doc = { createElement: (t) => new FNode(t, {}) };
  const ctx = vm.createContext({ window: win, document: doc, Math, String, Number });
  vm.runInContext(src, ctx, { filename: 'anim-being.js', timeout: 10000 });
  const el = new FNode('div', {});
  const api = win.BSAnim.mount(el);
  return { el, api };
}

const strip = (h) => String(h).replace(/<[^>]*>/g, '').replace(/&ldquo;|&rdquo;/g, '"');

function snap(el, t) {
  const R = (n) => el.querySelector('[data-r="' + n + '"]');
  const sent = R('sent'), vi = R('vi');
  const on = sent.children.filter((s) => s.classList.contains('bsa-on')).map((s) => s.textContent);
  const all = sent.children.map((s) => s.textContent);
  return {
    t,
    step: R('step').textContent,
    sentShown: on.join(''),
    sentFull: all.join(''),
    piecesOn: sent.children.map((s) => s.classList.contains('bsa-on')),
    viText: strip(vi.innerHTML).replace(/\s+/g, ' ').trim(),
    viOn: vi.classList.contains('bsa-on'),
    pct: Number(R('bar2').getAttribute('aria-valuenow')),
    sr: R('sr').textContent,
    play: el.querySelector('[data-a="play"]').textContent
  };
}

const out = {
  source: 'assets/js/anim-being.js @ 3f5214e',
  note: 'sr la gia tri dinh (chi doi khi cau + o Viet da hien du); play lay sau pause(); static = che do giam chuyen dong, go(0..2)',
  timed: [], static: []
};
{
  const { el, api } = makeEnv(false);
  api.pause();
  for (let i = 0; i <= 230; i++) {
    const t = i / 10;
    api.seek(t); api.pause();
    out.timed.push(snap(el, t));
  }
}
{
  const { el, api } = makeEnv(true);
  for (let n = 0; n < 3; n++) { api.go(n); out.static.push(snap(el, 'step' + n)); }
}
const dest = path.join(root, 'tools/fixtures/anim-l01-legacy.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
console.log('Da ghi', dest, '-', out.timed.length, 'mau thoi gian,', out.static.length, 'mau tinh');
