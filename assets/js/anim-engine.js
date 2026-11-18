/* Engine hoat hinh theo du lieu (window.BSAnim). validate/compile/sample thuan; mount dung BSRig. Chuoi du lieu chi vao DOM qua textContent/setAttribute. */
((g) => {
  'use strict';

  var ID = /^[a-z][A-Za-z0-9]{0,15}$/, REF = /^([a-z][A-Za-z0-9]{0,15})\.([a-z][A-Za-z0-9]{0,15})$/, KIND = { '': 1, be: 1, ing: 1 };
  var CHN = { actor: ' x lean headTilt look handL handR face sit flip ', prop: ' x y rot opacity ', fx: ' on opacity ' };
  var EASES = ' ease step linear ';
  var MAXS = 8, MAXTXT = 400, HAS = Object.prototype.hasOwnProperty, K = { cast: 'actor', props: 'prop', fx: 'fx' };

  var CSS =
    '.bsa-root{--P:var(--pri,#0a58ca);--I:var(--ink,#1b2733);--M:var(--muted,#334155);--C:var(--card,#fff);box-sizing:border-box;width:100%;max-width:720px;margin:0 auto;padding:12px;background:var(--C);color:var(--I);border:1px solid var(--line,#c5ced9);border-radius:12px;font-size:16px;line-height:1.6}' +
    '.bsa-root *{box-sizing:border-box}.bsa-svg{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--line,#c5ced9)}' +
    '.bsa-step{margin:10px 0 0;font-weight:700;color:var(--M)}' +
    '.bsa-sent{margin:4px 0;font-size:clamp(20px,5.6vw,28px);line-height:1.35;font-weight:600;min-height:2.8em}' +
    '.bsa-p{opacity:0;transition:opacity .35s;white-space:pre-wrap}.bsa-p.bsa-on,.bsa-vi.bsa-on{opacity:1}' +
    '.bsa-be,.bsa-ing{font-weight:800;padding-bottom:1px}' +
    '.bsa-be{color:var(--bad,#a4161a);border-bottom:3px solid var(--bad,#a4161a)}' +
    '.bsa-ing{color:var(--P);border-bottom:3px dashed var(--P)}' +
    '.bsa-vi{margin:6px 0 10px;min-height:5.2em;padding:8px 12px;border-radius:8px;background:var(--card-2,#eef3fa);opacity:0;transition:opacity .35s}' +
    '.bsa-vi small{display:block;color:var(--M)}' +
    '.bsa-bar{height:8px;background:var(--track,#dde4ec);border-radius:4px;overflow:hidden;margin:0 0 10px}.bsa-fill{height:100%;width:0;background:var(--P)}' +
    '.bsa-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}' +
    '.bsa-btn{font:inherit;font-weight:700;min-width:44px;min-height:44px;padding:0 16px;border-radius:8px;border:2px solid var(--P);background:var(--P);color:var(--pri-ink,#fff);cursor:pointer}' +
    '.bsa-btn.bsa-sec{background:var(--C);color:var(--P)}' +
    '.bsa-btn[aria-current="step"]{background:var(--I);border-color:var(--I);color:var(--C)}' +
    '.bsa-btn[aria-disabled="true"]{background:var(--dis-bg,#e5e9ef);border-color:var(--dis-line,#94a3b8);color:var(--dis-ink,#475569);cursor:default}' +
    '.bsa-btn:focus-visible{outline:3px solid var(--focus,#111827);outline-offset:2px}.bsa-btn[hidden]{display:none}' +
    '.bsa-note,.bsa-src{margin:4px 0 8px;font-size:14px;color:var(--M)}' +
    '.bsa-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '@media (prefers-reduced-motion:reduce){.bsa-p,.bsa-vi{transition:none}}';

  function c(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function mix(a, b, k) { return a + (b - a) * k; }
  function fin(x) { return typeof x === 'number' && isFinite(x) && Math.abs(x) <= 1e4; }
  function str(x) { return typeof x === 'string' && x.length <= MAXTXT; }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function own(o, k) { return isObj(o) && HAS.call(o, k); }
  function inl(l, x) { return typeof x === 'string' && l.indexOf(' ' + x + ' ') >= 0; }

  var NM = /^[a-z][a-z0-9]{0,15}$/;
  function T(re, x) { return typeof x === 'string' && re.test(x); }
  function R(x, lo, hi) { return fin(x) && x >= lo && x <= hi; }
  function validate(def, rig) {
    try { return validate0(def, rig); } catch (x) { return ['x']; }
  }
  function validate0(def, rig) {
    var E = [], ids = {}, tot = 0, st = def && def.stage, A = Array.isArray;
    function e(bad, m) { if (bad) E.push(m); return bad; }
    function txts(o, ks, w) { ks.forEach((k) => { e(!str(o[k]), w + k); }); }
    if (e(!isObj(def), 'def')) return E;
    e(def.v !== 1 || !T(/^[a-z0-9_-]{1,32}$/, def.id), 'v/id');
    txts(def, ['region_vi', 'svg_label_vi', 'svg_title_vi', 'svg_desc_vi', 'sr_tail_vi'], '');
    if (!e(!isObj(st) || !R(st.w, 50, 2000) || !R(st.h, 50, 2000) || !T(NM, st.backdrop), 'stage')) e(rig && !rig.has('backdrop', st.backdrop), 'backdrop');

    function group(g, max, fn) {
      var o = def[g], ks;
      if (e(!isObj(o), g)) return;
      ks = Object.keys(o); e(ks.length > max, g + ' max');
      ks.forEach((id) => {
        if (e(!ID.test(id) || id === 'bsa' || own(ids, id), 'id ' + id)) return;
        ids[id] = g;
        if (!e(!isObj(o[id]), id)) fn(id, o[id]);
      });
    }
    group('cast', MAXS, (id, a) => {
      e(!T(NM, a.actor) || (rig && !rig.has('actor', a.actor)) || !fin(a.x) || (a.outfit !== undefined && (!A(a.outfit) || a.outfit.length > 8)), 'cast ' + id);
    });
    group('props', 24, (id, p) => {
      e(!T(NM, p.type) || (rig && !rig.has('prop', p.type)) || !fin(p.x) || !fin(p.y) || (p.z !== undefined && p.z !== 'front' && p.z !== 'back'), 'prop ' + id);
    });
    function ref(r, who) {
      var m = typeof r === 'string' ? REF.exec(r) : null, g = m && own(ids, m[1]) ? ids[m[1]] : '';
      if (e(g !== 'cast' && g !== 'props', 'ref ' + who) || !rig) return;
      e(!rig.hasAnchor(K[g], g === 'cast' ? def.cast[m[1]].actor : def.props[m[1]].type, m[2]), 'neo ' + who);
    }
    group('fx', 16, (id, f) => {
      var s = T(NM, f.type) ? (rig ? rig.spec('fx', f.type) : { refs: ['from', 'to', 'around'].filter((k) => f[k] !== undefined) }) : null;
      if (e(!s, 'fx ' + id)) return;
      s.refs.forEach((k) => { ref(f[k], id + '.' + k); });
      e(f.pulse !== undefined && (!isObj(f.pulse) || !fin(f.pulse.hz) || !fin(f.pulse.depth)), 'pulse ' + id);
    });

    function segs(a, w, dur) {
      if (e(!A(a) || a.length < 1 || a.length > 20, w)) return;
      a.forEach((s, i) => { e(!A(s) || !str(s[0]) || (s[1] !== undefined && !own(KIND, s[1])) || (dur !== undefined && !R(s[2], 0, dur)), w + i); });
    }
    function track(tr, w, dur) {
      var g = isObj(tr) && own(ids, tr.of) ? ids[tr.of] : '', kind = K[g], ch = tr.ch, pt = 0, hand = ch === 'handL' || ch === 'handR';
      if (e(!kind, w + ' of')) return;
      var ps = kind === 'prop' && rig ? rig.spec('prop', def.props[tr.of].type) : null;
      if (e(!T(ID, ch) || !(inl(CHN[kind], ch) || (kind === 'prop' && (!rig || (ps && own(ps.params, ch))))), w + ' ch') || e(!A(tr.keys) || tr.keys.length < 1 || tr.keys.length > 64, w + ' keys')) return;
      tr.keys.forEach((k, n) => {
        var v = A(k) ? k[1] : 0, vec = A(v) && v.length === 2 && fin(v[0]) && fin(v[1]), at = typeof v === 'string' && v.charAt(0) === '@',
          ok = hand ? v === 'rest' || at || vec : ch === 'look' ? vec : ch === 'face' ? T(ID, v) : fin(v);
        if (e(!A(k) || !R(k[0], pt, dur) || (k[2] !== undefined && !inl(EASES, k[2])) || !ok, w + ' key' + n)) return;
        pt = k[0];
        if (hand && at) ref(v.slice(1), w);
      });
    }

    if (e(!A(def.scenes) || def.scenes.length < 1 || def.scenes.length > MAXS, 'scenes')) return E;
    def.scenes.forEach((s, i) => {
      var w = 's' + i;
      if (e(!isObj(s) || !R(s.dur, 0.01, 60), w)) return;
      tot += s.dur;
      e(!R(s.rest, 0, s.dur - 0.001) || !R(s.vi_at, 0, s.dur), w + ' rest/vi_at');
      txts(s, ['title_vi', 'label_vi', 'en', 'note_vi'], w);
      segs(s.pieces, w + ' pieces', s.dur);
      if (!e(!A(s.tracks) || s.tracks.length > 200, w + ' tracks')) s.tracks.forEach((t, j) => { track(t, w + 't' + j, s.dur); });
    });
    segs(def.formula, 'formula');
    if (!e(!isObj(def.outro) || !R(def.outro.dur, 0.01, 60) || !str(def.outro.title_vi), 'outro')) { segs(def.outro.segs, 'outro.segs'); tot += def.outro.dur; }
    e(tot > 300, 'tong');
    return E;
  }

  function compile(def) {
    var t0 = 0, tr = {}, sc = [];
    def.scenes.forEach((s, i) => {
      sc.push({ start: t0, dur: s.dur, rest: s.rest, at: s.pieces.map((p) => p[2]), vi: s.vi_at });
      (s.tracks || []).forEach((k) => {
        var key = k.of + '.' + k.ch, a = tr[key] || (tr[key] = []);
        k.keys.forEach((q) => { a.push({ t: t0 + q[0], v: q[1], e: q[2], s: i }); });
      });
      t0 += s.dur;
    });
    return { T: t0 + def.outro.dur, scenes: sc, outroStart: t0, tracks: tr };
  }
  function hold(v, hand) { v = Array.isArray(v) ? v.slice() : v; return hand ? { a: v, b: v, k: 0 } : v; }
  function ev(ks, t, hand) {
    var n = ks.length, i = -1, a, b, k;
    if (t < ks[0].t) return ks[0].e === 'step' && typeof ks[0].v === 'number' ? 0 : hold(ks[0].v, hand);
    while (i + 1 < n && ks[i + 1].t <= t) i++;
    a = ks[i];
    if (i === n - 1) return hold(a.v, hand);
    b = ks[i + 1];
    if (a.s !== b.s) return hold(a.v, hand);
    k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
    if (b.e === 'step') k = 0; else if (b.e === 'ease') k = k * k * (3 - 2 * k);
    if (hand) return { a: a.v, b: b.v, k: k };
    if (typeof a.v === 'number' && typeof b.v === 'number') return mix(a.v, b.v, k);
    if (Array.isArray(a.v) && Array.isArray(b.v)) return [mix(a.v[0], b.v[0], k), mix(a.v[1], b.v[1], k)];
    return a.v;
  }
  function sample(cp, t) {
    t = t < 0 ? 0 : t > cp.T ? cp.T : t;
    var outro = t >= cp.outroStart, i = cp.scenes.length - 1, ch = {}, k, s, on = [], j;
    if (!outro) { i = 0; while (i + 1 < cp.scenes.length && cp.scenes[i + 1].start <= t) i++; }
    s = cp.scenes[i];
    var lt = t - s.start;
    for (j = 0; j < s.at.length; j++) on.push(lt >= s.at[j]);
    for (k in cp.tracks) ch[k] = ev(cp.tracks[k], t, /\.hand[LR]$/.test(k));
    return { scene: i, lt: lt, outro: outro, piecesOn: on, viOn: lt >= s.vi, pct: Math.round(t / cp.T * 100), t: t, ch: ch };
  }

  function mount(el, def) {
    if (!el || el.nodeType !== 1 || !def) return null;
    var rig = g.BSRig;
    if (!rig || validate(def, rig).length) return null;
    if (el.__bsa) el.__bsa.destroy();
    var doc = el.ownerDocument || g.document, cp = compile(def), SC = def.scenes, OU = def.outro, N = SC.length, T = cp.T;
    function btn(a, t, sec) { return '<button type="button" class="bsa-btn' + (sec ? ' bsa-sec' : '') + '" data-' + a + '>' + t + '</button>'; }
    el.textContent = '';
    el.innerHTML = '<style>' + CSS + '</style>' +
      '<div class="bsa-root" role="region" data-r="bsa.root">' +
      '<svg class="bsa-svg" viewBox="0 0 ' + (+def.stage.w) + ' ' + (+def.stage.h) + '" role="img" data-r="bsa.svg"><title data-r="bsa.svgt"></title><desc data-r="bsa.svgd"></desc>' + rig.markup(def) + '</svg>' +
      '<p class="bsa-step" data-r="bsa.step"></p><p class="bsa-sent" lang="en" data-r="bsa.sent"></p><div class="bsa-vi" data-r="bsa.vi"></div>' +
      '<div class="bsa-bar" role="progressbar" aria-label="Tiến độ hoạt hình" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-r="bsa.bar"><div class="bsa-fill" data-r="bsa.fill"></div></div>' +
      '<div class="bsa-row" role="group" aria-label="Điều khiển hoạt hình">' +
      btn('a="play"', 'Phát', 0) + btn('a="pause"', 'Tạm dừng', 1) + btn('a="prev" hidden', 'Trước', 1) + btn('a="next" hidden', 'Tiếp', 0) + btn('a="replay"', 'Xem lại', 1) + '</div>' +
      '<div class="bsa-row" role="group" aria-label="Chọn động tác">' +
      SC.map((s, i) => btn('s="' + i + '"', 'Bước ' + (i + 1), 1)).join('') + '</div>' +
      '<p class="bsa-note" data-r="bsa.rnote" hidden>Bạn đang tắt chuyển động trên thiết bị, nên hoạt hình hiện từng bước tĩnh. Bấm “Tiếp” để sang bước sau.</p>' +
      '<p class="bsa-src">Hoạt hình minh họa do Từng Bước English soạn.</p><div class="bsa-sr" aria-live="polite" data-r="bsa.sr"></div></div>';

    var n = {}, B = {}, chips = [], i, l, rx;
    l = el.querySelectorAll('[data-r]'); for (i = 0; i < l.length; i++) n[l[i].getAttribute('data-r').replace('bsa.', '')] = l[i];
    l = el.querySelectorAll('[data-a]'); for (i = 0; i < l.length; i++) B[l[i].getAttribute('data-a')] = l[i];
    l = el.querySelectorAll('[data-s]'); for (i = 0; i < l.length; i++) chips[+l[i].getAttribute('data-s')] = l[i];
    rx = rig.bind(def, el);

    var Z = {};
    function Y(k, nd, a, v) {
      if (Z[k + a] === v) return;
      Z[k + a] = v;
      if (a === 'text') nd.textContent = v; else if (a === 'hidden') nd.hidden = v; else if (a === 'on') nd.classList.toggle('bsa-on', v);
      else if (a === 'w') nd.style.width = v + '%'; else if (v === null) nd.removeAttribute(a); else nd.setAttribute(a, v);
    }

    n.svg.setAttribute('aria-label', def.svg_label_vi); n.root.setAttribute('aria-label', def.region_vi);
    n.svgt.textContent = def.svg_title_vi; n.svgd.textContent = def.svg_desc_vi;
    SC.forEach((s, k) => { chips[k].setAttribute('aria-label', 'Chuyển tới động tác ' + (k + 1) + ': ' + s.label_vi); });

    var mq = g.matchMedia ? g.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var S = { t: 0, playing: false, raf: 0, tm: 0, last: 0, step: 0, reduced: !!(mq && mq.matches), scene: -1, gen: 0, vik: '', ann: -1, wasConn: false, dead: false };
    var pe = [], subs = [];

    function segsTo(p, arr, base) {
      var o = [];
      p.textContent = '';
      arr.forEach((s) => { var sp = doc.createElement('span'); sp.className = base + (s[1] ? ' bsa-' + s[1] : ''); sp.textContent = s[0]; p.appendChild(sp); o.push(sp); });
      return o;
    }
    function buildVi(k, outro) {
      var key = outro ? 'o' : String(k), sm;
      if (S.vik === key) return;
      S.vik = key;
      if (outro) segsTo(n.vi, OU.segs, '');
      else { segsTo(n.vi, def.formula, ''); sm = doc.createElement('small'); sm.textContent = SC[k].note_vi; n.vi.appendChild(sm); }
    }
    function tNow() { return S.reduced ? (S.step < N ? cp.scenes[S.step].start + cp.scenes[S.step].rest : T) : S.t; }

    function ui() {
      var rd = S.reduced, p = S.playing;
      [['play', rd], ['pause', rd], ['prev', !rd], ['next', !rd]].forEach((q) => { Y(q[0], B[q[0]], 'hidden', q[1]); });
      Y('r', n.rnote, 'hidden', !rd);
      [['play', p], ['pause', !p], ['prev', S.step <= 0], ['next', S.step >= N]].forEach((q) => { Y(q[0], B[q[0]], 'aria-disabled', '' + q[1]); });
      Y('p', B.play, 'text', (!p && S.t >= T) ? 'Phát lại' : (S.t > 0 && !p ? 'Tiếp tục' : 'Phát'));
    }

    function render() {
      var s = sample(cp, tNow()), k = s.scene, rd = S.reduced, j, allOn = true, pct;
      rig.apply(rx, s);
      if (S.scene !== k) { S.scene = k; S.gen++; pe = segsTo(n.sent, SC[k].pieces, 'bsa-p'); }
      for (j = 0; j < pe.length; j++) { Y('p' + j + 'g' + S.gen, pe[j], 'on', s.piecesOn[j]); if (!s.piecesOn[j]) allOn = false; }
      buildVi(k, s.outro); Y('v', n.vi, 'on', s.viOn);
      Y('s', n.step, 'text', s.outro ? OU.title_vi : 'Động tác ' + (k + 1) + '/' + N + ' · ' + SC[k].title_vi);
      for (j = 0; j < N; j++) {
        Y('c' + j, chips[j], 'aria-current', !(rd && s.outro) && j === k ? 'step' : null);
      }
      pct = rd ? Math.round((S.step + 1) / (N + 1) * 100) : s.pct;
      Y('f', n.fill, 'w', pct); Y('b', n.bar, 'aria-valuenow', pct);
      var done = allOn && s.viOn;
      if (done && S.ann !== k) { S.ann = k; n.sr.textContent = 'Câu mẫu: ' + SC[k].en + ' ' + def.sr_tail_vi; }
      else if (!done) S.ann = -1;
    }

    function stopLoop() {
      if (S.raf) { g.cancelAnimationFrame(S.raf); S.raf = 0; }
      if (S.tm) { g.clearTimeout(S.tm); S.tm = 0; }
    }
    function wait() { S.last = 0; S.tm = g.setTimeout(() => { S.tm = 0; if (!S.dead && S.playing) frame(0); }, 400); }
    function frame(ts) {
      S.raf = 0;
      if (S.dead || !S.playing) return;
      if (el.isConnected === false) { if (S.wasConn) { S.playing = false; ui(); return; } }
      else { S.wasConn = true; if (el.getClientRects().length === 0) { wait(); return; } }
      var dt = S.last ? Math.min(0.1, (ts - S.last) / 1000) : 0;
      S.last = ts; S.t += dt;
      if (S.t >= T) { S.t = T; S.playing = false; render(); ui(); return; }
      render();
      S.raf = g.requestAnimationFrame(frame);
    }
    function syncStep() { var s = sample(cp, S.t); S.step = s.outro ? N : s.scene; }

    var api = {
      duration: T,
      play: function () {
        if (S.reduced || S.dead) return;
        if (S.t >= T) S.t = 0;
        S.playing = true; S.last = 0;
        if (!S.raf && !S.tm) S.raf = g.requestAnimationFrame(frame);
        ui();
      },
      pause: function () { S.playing = false; stopLoop(); ui(); },
      replay: function () {
        stopLoop(); S.t = 0; S.step = 0; S.ann = -1; S.scene = -1;
        if (S.reduced) { S.playing = false; render(); ui(); } else { render(); api.play(); }
      },
      seek: function (t) { S.t = fin(t) ? Math.max(0, Math.min(T, t)) : 0; if (S.reduced) syncStep(); render(); ui(); },
      go: function (k) {
        k = Math.max(0, Math.min(N, k | 0)); S.step = k;
        S.t = k < N ? cp.scenes[k].start : cp.outroStart;
        render(); ui();
      },
      destroy: function () {
        if (S.dead) return;
        S.dead = true; S.playing = false; stopLoop();
        subs.forEach((q) => { q[0].removeEventListener(q[1], q[2]); });
        if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq); }
        if (el.__bsa === api) el.__bsa = null;
        el.textContent = '';
      }
    };
    function onMq() {
      S.reduced = !!(mq && mq.matches);
      stopLoop(); S.playing = false; syncStep(); S.scene = -1;
      render(); ui();
    }
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }

    function on(node, fn) { node.addEventListener('click', fn); subs.push([node, 'click', fn]); }
    function enabled(b) { return b.getAttribute('aria-disabled') !== 'true'; }
    on(B.play, () => { if (enabled(B.play)) api.play(); });
    on(B.pause, () => { if (enabled(B.pause)) api.pause(); });
    on(B.replay, () => { api.replay(); });
    on(B.prev, () => { if (enabled(B.prev)) api.go(S.step - 1); });
    on(B.next, () => { if (enabled(B.next)) api.go(S.step + 1); });
    chips.forEach((b, k) => { on(b, () => { api.go(k); }); });

    el.__bsa = api;
    render(); ui();
    if (!S.reduced) api.play();
    return api;
  }

  g.BSAnim = { validate: validate, compile: compile, sample: sample, mount: mount };
})(window);
