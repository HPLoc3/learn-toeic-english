/* Trinh phat canh anh Ken Burns (window.BSScenes). validate/plan thuan; chuoi du lieu chi vao DOM qua textContent/setAttribute. */
((g) => {
 'use strict';
 var A = Array.isArray, NM = /^[a-z0-9-]{1,32}$/, DIR = /^assets\/img(-hd)?\/[a-z0-9_-]+\/(scene\/)?$/, KB = [[0, 1], [0, 1], [1, 2]];
 var CSS = '.bss-root{--P:var(--pri,#0a58ca);max-width:720px;margin:0 auto;padding:12px;background:var(--card,#fff);color:var(--ink,#1b2733);border:1px solid var(--line,#c5ced9);border-radius:12px;line-height:1.5}' +
  '.bss-root [hidden]{display:none}.bss-fig{margin:0}.bss-stage,.bss-fb{position:relative;overflow:hidden;aspect-ratio:16/9;border-radius:10px;background:var(--card-2,#eef3fa)}' +
  '.bss-img{display:block;width:100%;height:100%;object-fit:cover;transform-origin:0 0}' +
  '.bss-ring{position:absolute;aspect-ratio:1;transform:translate(-50%,-50%);border:3px solid var(--P);border-radius:50%;box-shadow:0 0 0 2px var(--card,#fff)}' +
  '.bss-ring span{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding:0 8px;border-radius:6px;background:var(--P);color:var(--pri-ink,#fff);white-space:nowrap}' +
  '.bss-fb{display:flex;align-items:center;justify-content:center;padding:16px;font-size:24px;font-weight:700}.bss-step{margin:10px 0 0;font-weight:700}' +
  '.bss-sent{margin:4px 0;font-size:clamp(20px,5.6vw,28px);font-weight:600;min-height:2.8em}.bss-p,.bss-vi{opacity:0;transition:opacity .35s}.bss-p{white-space:pre-wrap}' +
  '.bss-vi{min-height:5.2em;margin:6px 0 10px;padding:8px 12px;border-radius:8px;background:var(--card-2,#eef3fa)}.bss-on{opacity:1}.bss-vi small,.bss-fm{display:block}' +
  '.bss-be,.bss-ing{font-weight:800}.bss-be{color:var(--bad,#a4161a);border-bottom:3px solid}.bss-ing{color:var(--P);border-bottom:3px dashed}' +
  '.bss-bar{height:8px;background:var(--track,#dde4ec);border-radius:4px;overflow:hidden;margin:0 0 10px}.bss-fill{height:100%;width:0;background:var(--P)}.bss-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}' +
  '.bss-btn{font:inherit;font-weight:700;min-width:44px;min-height:44px;padding:0 16px;border-radius:8px;border:2px solid var(--P);background:var(--P);color:var(--pri-ink,#fff);cursor:pointer}' +
  '.bss-sec{background:var(--card,#fff);color:var(--P)}.bss-sec[aria-pressed=true]{background:var(--P);color:var(--pri-ink,#fff)}.bss-btn[aria-current]{background:var(--ink,#1b2733);border-color:var(--ink,#1b2733);color:var(--card,#fff)}' +
  '.bss-btn[aria-disabled=true]{background:var(--dis-bg,#e5e9ef);border-color:var(--dis-line,#94a3b8);color:var(--dis-ink,#475569);cursor:default}.bss-btn:focus-visible{outline:3px solid var(--ink,#111827);outline-offset:2px}' +
  '.bss-note,.bss-src{margin:4px 0 8px;font-size:14px}.bss-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
  '@media(prefers-reduced-motion:reduce){.bss-p,.bss-vi{transition:none}}';

 function fin(x) { return typeof x === 'number' && isFinite(x); }
 function R(x, lo, hi) { return fin(x) && x >= lo && x <= hi; }
 function str(x) { return typeof x === 'string' && x.length <= 400; }
 function nes(x) { return str(x) && x.trim() !== ''; }
 function isO(x) { return !!x && typeof x === 'object' && !A(x); }
 function r3(x) { return Math.round(x * 1000) / 1000; }
 function cl(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
 function vec(v, r) { return A(v) && v.length === r.length && r.every((q, i) => R(v[i], q[0], q[1])); }
 function nm(x) { return typeof x === 'string' && NM.test(x); }

 function validate(d) { try { return V(d); } catch (x) { return ['x']; } }
 function V(d) {
  var E = [], ids = {}, tot = 0, im, o;
  function e(bad, m) { if (bad) E.push(m); return bad; }
  function pcs(p, w) {
   var s = '';
   if (e(!A(p) || p.length < 1 || p.length > 20, w)) return null;
   p.forEach((x) => { if (!e(!A(x) || x.length > 2 || !str(x[0]) || (x.length > 1 && ['', 'be', 'ing'].indexOf(x[1]) < 0), w + ' piece')) s += x[0]; });
   return s;
  }
  if (e(!isO(d), 'def')) return E;
  im = d.img;
  e(d.v !== 2 || d.kind !== 'scenes' || typeof d.id !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(d.id), 'v/kind/id');
  e(!nes(d.region_vi) || !str(d.sr_tail_vi), 'text'); pcs(d.formula, 'formula');
  e(!isO(im) || !DIR.test(im.base) || !DIR.test(im.hd) || !vec(im.w, [[800, 800], [1600, 1600]]) || im.ratio !== '16:9', 'img');
  if (e(!A(d.scenes) || d.scenes.length < 1 || d.scenes.length > 8, 'scenes')) return E;
  d.scenes.forEach((s, i) => {
   var w = 's' + i + ' ', f;
   if (e(!isO(s), w)) return;
   e(typeof s.id !== 'string' || !/^[a-z][A-Za-z0-9]{0,15}$/.test(s.id) || ids['$' + s.id], w + 'id'); ids['$' + s.id] = 1;
   e(!nm(s.img), w + 'img'); e(!nes(s.alt_vi) || !nes(s.vi) || !nes(s.en) || !str(s.note_vi), w + 'text');
   e(!R(s.dur, 2, 60), w + 'dur'); if (fin(s.dur)) tot += s.dur;
   f = pcs(s.pieces, w + 'pieces'); e(f !== null && f !== s.en, w + 'pieces!=en');
   e(!isO(s.kb) || !vec(s.kb.from, KB) || !vec(s.kb.to, KB), w + 'kb'); f = s.focus;
   if (f !== undefined) e(!isO(f) || !R(f.x, 0, 1) || !R(f.y, 0, 1) || !R(f.r, 0.02, 0.4) || !R(f.at, 0, s.dur) || !str(f.label_vi), w + 'focus');
  });
  o = d.outro;
  if (!e(!isO(o), 'outro')) { e(!nm(o.img) || !nes(o.alt_vi) || !str(o.title_vi) || !R(o.dur, 2, 60), 'outro'); if (fin(o.dur)) tot += o.dur; pcs(o.segs, 'segs'); }
  e(tot > 300, 'total');
  return E;
 }

 function plan(d) {
  var t = 0, sc = d.scenes.map((s) => {
   var m = s.pieces.length, o = { start: r3(t), dur: s.dur, at: s.pieces.map((p, i) => r3(s.dur * (0.15 + 0.25 * i / m))), viAt: r3(s.dur * 0.5), focusAt: s.focus ? s.focus.at : null, rest: r3(s.dur * 0.97) };
   t += s.dur; return o;
  });
  return { T: r3(t + d.outro.dur), outroStart: r3(t), scenes: sc, outro: { start: r3(t), dur: d.outro.dur } };
 }

 function mount(host, d) {
  if (!host || host.nodeType !== 1 || !d || validate(d).length) return null;
  if (host.__bss) host.__bss.destroy();
  var doc = host.ownerDocument || g.document, P = plan(d), SC = d.scenes, N = SC.length, T = P.T, O = d.outro, n = {}, X = {}, ch = [], ps = [], err = {}, i, l = '', api;
  var mq = g.matchMedia ? g.matchMedia('(prefers-reduced-motion: reduce)') : null, t = 0, pl = 0, raf = 0, tm = 0, last = 0, ug = UA(), spk = -1, am = 1, k = -1, ann = -1, rd = !!(mq && mq.matches), dead = 0;
  function B(f) { var o = g.BS; return o && typeof o[f] === 'function' ? o : null; }
  function UA() { var u = g.navigator && g.navigator.userActivation; return u ? +!!u.hasBeenActive : 0; }
  function stp() { var o = B('stopSpeak'); if (o) try { o.stopSpeak(); } catch (x) { /* bo qua */ } }
  function au() { var o = B('pref'); return o ? o.pref('animSpeak') !== 0 : !!am; }
  function vo() { var o = B('speak'), h = B('hasVoice'); return !!o && (!h || !!h.hasVoice()); }
  function say(j) { var o = B('speak'); if (o && j < N && vo()) try { o.speak(SC[j].en, { rate: 0.9 }); } catch (x) { /* bo qua */ } }
  function tog() { var o = B('setPref'); am = !au(); if (o) o.setPref('animSpeak', am ? 1 : 0); if (!am) stp(); ui(); }
  function at(e, a, v) { e.setAttribute(a, v); }
  function b(a, x, c, h) { return '<button type="button" class="bss-btn' + c + '" data-' + a + (h ? '" hidden' : '"') + '>' + x + '</button>'; }
  function sp(par, p, c) { var e = doc.createElement('span'); e.className = c + (p[1] ? ' bss-' + p[1] : ''); e.textContent = p[0]; par.appendChild(e); return e; }
  for (i = 0; i <= N; i++) l += b('s="' + i, 'Bước ' + (i + 1), ' bss-sec');
  host.textContent = '';
  host.innerHTML = '<style>' + CSS + '</style><div class="bss-root" role="region" data-r="root"><figure class="bss-fig">' +
   '<div class="bss-stage" style="aspect-ratio:16/9" data-r="stage"><img class="bss-img" sizes="(max-width:720px) 100vw, 720px" width="800" height="450" decoding="async" draggable="false" data-r="img">' +
   '<span class="bss-ring" aria-hidden="true" hidden data-r="ring"><span data-r="lab"></span></span></div><div class="bss-fb" role="img" data-fallback="1" hidden data-r="fb"></div>' +
   '<figcaption class="bss-cap"><p class="bss-step" data-r="step"></p><p class="bss-sent" lang="en" data-r="sent"></p>' +
   '<div class="bss-row">' + b('a="say', '🔊', ' bss-sec') + b('a="auto', 'Tự đọc', ' bss-sec') + '<span class="bss-note" hidden data-r="hint">Bấm 🔊 hoặc Phát để nghe</span></div><div class="bss-vi" data-r="vi"><span data-r="vt"></span><span class="bss-fm" data-r="fm"></span><small data-r="note"></small></div></figcaption></figure>' +
   '<div class="bss-bar" role="progressbar" aria-label="Tiến độ hoạt hình" aria-valuemin="0" aria-valuemax="100" data-r="bar"><div class="bss-fill" data-r="fill"></div></div>' +
   '<div class="bss-row" role="group" aria-label="Điều khiển hoạt hình">' + b('a="toggle', 'Phát', '') + b('a="prev', 'Trước', ' bss-sec', 1) + b('a="next', 'Tiếp', '', 1) + b('a="replay', 'Xem lại', ' bss-sec') + '</div>' +
   '<div class="bss-row" role="group" aria-label="Chọn động tác">' + l + '</div>' +
   '<p class="bss-note" hidden data-r="rn">Bạn đang tắt chuyển động trên thiết bị, nên hoạt hình hiện từng bước tĩnh. Bấm “Tiếp” để sang bước sau.</p>' +
   '<p class="bss-src">Ảnh minh họa do Từng Bước English tạo.</p><div class="bss-sr" aria-live="polite" data-r="sr"></div></div>';
  l = host.querySelectorAll('[data-r],[data-a],[data-s]');
  for (i = 0; i < l.length; i++) { n[l[i].getAttribute('data-r')] = X[l[i].getAttribute('data-a')] = l[i]; if (l[i].getAttribute('data-s') !== null) ch[+l[i].getAttribute('data-s')] = l[i]; }
  at(n.root, 'aria-label', d.region_vi); at(X.say, 'aria-label', 'Nghe câu tiếng Anh');
  d.formula.forEach((p) => { sp(n.fm, p, 'bss-f'); });
  ch.forEach((e, j) => { at(e, 'aria-label', 'Bước ' + (j + 1) + ': ' + (j < N ? SC[j].note_vi || SC[j].en : O.title_vi)); });

  function url(j, hd) { return (hd ? d.img.hd : d.img.base) + (j < N ? SC[j].img : O.img) + (hd ? '-1600' : '-800') + '.webp'; }
  function kOf(x) { var j, r = 0; for (j = 0; j < N; j++) if (x >= P.scenes[j].start) r = j; return x >= P.outroStart ? N : r; }
  function rest(j) { return j < N ? P.scenes[j].start + P.scenes[j].rest : r3(P.outroStart + O.dur * 0.97); }
  function load(j) {
   var out = j === N, s = SC[j], al = out ? O.alt_vi : s.alt_vi;
   if (k >= 0) stp();
   k = j; ps = [];
   at(n.img, 'alt', al); at(n.img, 'srcset', url(j) + ' 800w, ' + url(j, 1) + ' 1600w'); at(n.img, 'src', url(j));
   at(n.fb, 'aria-label', al); n.fb.textContent = out ? O.title_vi : s.en; n.stage.hidden = (err[j] | 0) > 1; n.fb.hidden = !n.stage.hidden;
   n.step.textContent = out ? O.title_vi : 'Động tác ' + (j + 1) + '/' + N; n.sent.textContent = ''; at(n.sent, 'lang', out ? 'vi' : 'en');
   (out ? O.segs : s.pieces).forEach((p) => { ps.push(sp(n.sent, p, 'bss-p')); });
   n.vi.hidden = out; n.vt.textContent = out ? '' : s.vi; n.note.textContent = out ? '' : s.note_vi; n.lab.textContent = !out && s.focus ? s.focus.label_vi : '';
   ch.forEach((e, x) => { if (x === j) at(e, 'aria-current', 'step'); else e.removeAttribute('aria-current'); });
  }
  function tr(x) { return x.replace(/[.!?\s]+$/, ''); }
  function ss(x, lg) { var e = doc.createElement('span'); if (lg) at(e, 'lang', lg); e.textContent = x; n.sr.appendChild(e); }
  function draw() {
   var j = kOf(t), out = j === N, s = SC[j], p = out ? P.outro : P.scenes[j], lt = t - p.start, tx = 0, ty = 0, z = 1, f, u, a, c, r = n.ring;
   if (k !== j) load(j);
   if (!out && !rd) {
    u = cl(lt / s.dur, 0, 1); u = u * u * (3 - 2 * u); a = s.kb.from; c = s.kb.to; z = a[2] + (c[2] - a[2]) * u;
    tx = 0.5 - z * cl(a[0] + (c[0] - a[0]) * u, 0.5 / z, 1 - 0.5 / z); ty = 0.5 - z * cl(a[1] + (c[1] - a[1]) * u, 0.5 / z, 1 - 0.5 / z);
   }
   n.img.style.transform = z === 1 ? 'none' : 'translate(' + r3(tx * 100) + '%,' + r3(ty * 100) + '%) scale(' + r3(z) + ')';
   ps.forEach((e, x) => { e.classList.toggle('bss-on', out || lt >= p.at[x]); });
   n.vi.classList.toggle('bss-on', !out && lt >= p.viAt);
   f = !out && s.focus; r.hidden = !(f && (rd || lt >= f.at));
   if (f) { r.style.left = r3((tx + z * f.x) * 100) + '%'; r.style.top = r3((ty + z * f.y) * 100) + '%'; r.style.width = r3(f.r * 2 * z * 100) + '%'; }
   if (!out && pl && (ug || (ug = UA())) && spk !== j && lt >= p.at[0] && (!au() || vo())) { spk = j; if (au()) say(j); }
   if (ann !== j && (out || lt >= p.viAt)) { ann = j; n.sr.textContent = '';
   if (out) ss(O.title_vi + '. ' + tr(O.segs.map((e) => e[0]).join('')) + '. ' + d.sr_tail_vi);
   else { ss('Câu mẫu: '); ss(s.en, 'en'); ss(' ' + [tr(s.vi), tr(s.note_vi)].filter(Boolean).join('. ') + '.'); } }
  }
  function z(e, h, x) { e.hidden = h; at(e, 'aria-disabled', !!x); }
  function ui() {
   var p = rd ? (k + 1) / (N + 1) : t / T, l;
   z(X.toggle, rd); l = pl ? 'Tạm dừng' : 'Phát'; if (X.toggle.textContent !== l) X.toggle.textContent = l;
   z(X.prev, !rd, k < 1); z(X.next, !rd, k >= N); z(X.replay); l = vo(); z(X.say, k === N || !B('speak'), !l); at(X.say, 'title', l ? 'Nghe câu tiếng Anh' : 'Máy chưa có giọng đọc tiếng Anh'); z(X.auto, !B('speak')); at(X.auto, 'aria-pressed', au()); n.hint.hidden = !(pl && !(ug || UA()) && au() && l);
   n.rn.hidden = !rd; at(n.bar, 'aria-valuenow', Math.round(p * 100)); n.fill.style.width = r3(p * 100) + '%';
  }
  function stop() { if (raf) { g.cancelAnimationFrame(raf); raf = 0; } if (tm) { g.clearTimeout(tm); tm = 0; } }
  function frame(ts) {
   raf = 0;
   if (dead || !pl || rd) return;
   if (host.isConnected === false) { pl = 0; stp(); ui(); return; }
   if (!host.getClientRects().length) { if (last) stp(); last = 0; tm = g.setTimeout(() => { tm = 0; if (!dead && pl) frame(0); }, 400); return; }
   t += last ? Math.min(0.5, (ts - last) / 1000) : 0; last = ts;
   if (t >= T) { t = T; pl = 0; draw(); ui(); return; }
   draw(); ui(); raf = g.requestAnimationFrame(frame);
  }
  function snap() { t = rest(kOf(t)); }
  function onMq() { var f = doc.activeElement === X.toggle; rd = !!mq.matches; stop(); pl = 0; if (rd) snap(); draw(); ui(); if (rd && f) X.next.focus(); }
  function onClick(v) {
   var e = v.target && v.target.closest && v.target.closest('button'), a, c;
   if (!e || e.getAttribute('aria-disabled') === 'true') return;
   ug = 1;
   a = e.getAttribute('data-a'); c = e.getAttribute('data-s');
   if (c !== null) api.go(+c); else if (a === 'prev') api.go(k - 1); else if (a === 'next') api.go(k + 1); else if (a === 'say') { spk = k; say(k); } else if (a === 'auto') tog(); else api[a === 'toggle' ? (pl ? 'pause' : 'play') : a]();
  }
  function onErr() {
   var c = err[k] = (err[k] | 0) + 1;
   if (c < 2) { n.img.removeAttribute('srcset'); at(n.img, 'src', url(k)); } else { n.stage.hidden = true; n.fb.hidden = false; }
  }

  api = {
   duration: T,
   play() { if (rd || dead) return; if (t >= T) { t = 0; spk = -1; } pl = 1; last = 0; if (!raf && !tm) raf = g.requestAnimationFrame(frame); draw(); ui(); },
   pause() { var w = pl; pl = 0; stop(); if (w) stp(); ui(); },
   replay() { stop(); stp(); t = 0; spk = ann = k = -1; if (rd) { pl = 0; snap(); draw(); ui(); } else { draw(); api.play(); } },
   seek(x) { spk = -1; t = fin(x) ? cl(x, 0, T) : 0; if (rd) snap(); draw(); ui(); },
   go(j) { j = cl(j | 0, 0, N); spk = -1; t = rd || !pl ? rest(j) : j < N ? P.scenes[j].start : P.outroStart; draw(); ui(); if (rd && (ug || (ug = UA())) && au()) { spk = j; say(j); } },
   destroy() {
    if (dead) return;
    dead = 1; pl = 0; stop(); stp();
    n.root.removeEventListener('click', onClick); n.img.removeEventListener('error', onErr);
    if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else mq.removeListener(onMq); }
    if (host.__bss === api) host.__bss = null;
    host.textContent = '';
   }
  };
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq); }
  n.root.addEventListener('click', onClick); n.img.addEventListener('error', onErr);
  host.__bss = api;
  if (rd) snap();
  draw(); ui();
  if (B('onVoices')) g.BS.onVoices(() => { if (!dead) ui(); });
  if (!rd) api.play();
  return api;
 }

 g.BSScenes = { validate: validate, plan: plan, mount: mount };
})(window);
