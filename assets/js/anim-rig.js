/* Rig hoat hinh (window.BSRig): dang ky dien vien/dao cu/phong/fx, dung SVG tinh, ap mau thoi gian. Hinh dang spec: tools/ANIM-RIG-CONTRACT.md. Khong id trong SVG (data-r). */
((g) => {
  'use strict';
  var REG = { actor: {}, prop: {}, backdrop: {}, fx: {} }, HAS = Object.prototype.hasOwnProperty;
  var NAME = /^[a-z][a-z0-9]{0,15}$/, REF = /^([a-z][A-Za-z0-9]{0,15})\.([a-z][A-Za-z0-9]{0,15})$/;
  var BAD = /<script|<image|href|\son\w+\s*=|foreignObject|\sid\s*=/i;
  var COL = /^(#[0-9a-fA-F]{3,8}|[a-z]{3,20}|var\(--[a-z-]+,#[0-9a-fA-F]{3,8}\))$/, STY = /^[\w\-:#(),. %]{1,80};?$/;

  function c(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function mix(a, b, k) { return a + (b - a) * k; }
  function mix2(a, b, k) { return [mix(a[0], b[0], k), mix(a[1], b[1], k)]; }
  function num(x, d) { return typeof x === 'number' && isFinite(x) ? x : d; }
  function fmt(x) { return String(Math.round(num(x, 0) * 100) / 100); }
  function col(v) { return COL.test(v) ? v : '#000'; }
  function isArr(a, n) { return Array.isArray(a) && a.length >= n && a.every((v) => typeof v === 'number' && isFinite(v)); }

  function okSpec(kind, s) {
    if (!s || typeof s !== 'object' || BAD.test(JSON.stringify(s))) return false;
    if (kind === 'backdrop' || kind === 'prop') return typeof s.svg === 'string';
    if (kind === 'fx') return /^(line|ring)$/.test(s.shape) && Array.isArray(s.refs) && STY.test(s.style);
    return typeof s.name === 'string' && typeof s.job === 'string' && typeof s.age === 'number' && typeof s.body === 'string' &&
      typeof s.head === 'string' && isArr(s.pivot, 2) && isArr(s.hip, 2) && s.eye && isArr(s.eye.L, 2) && isArr(s.eye.R, 2) &&
      s.faces && Object.keys(s.faces).length && s.arm && s.arm.L > 0 && isArr(s.arm.s, 2) && isArr(s.arm.rest, 2) &&
      s.leg && s.leg.L > 0 && isArr(s.leg.hip, 2) && isArr(s.leg.foot, 2) && s.anchors;
  }
  function register(kind, name, spec) {
    if (!REG[kind] || typeof name !== 'string' || !NAME.test(name) || !okSpec(kind, spec)) return false;
    REG[kind][name] = spec; return true;
  }
  function spec(kind, name) { return REG[kind] && HAS.call(REG[kind], name) ? REG[kind][name] : null; }
  function has(kind, name) { return !!spec(kind, name); }
  function hasAnchor(kind, name, a) { var s = spec(kind, name); return !!(s && s.anchors && HAS.call(s.anchors, a)); }

  function solveArm(s, h, L, side) {
    var dx = h[0] - s[0], dy = h[1] - s[1], d = Math.sqrt(dx * dx + dy * dy), m = 2 * L - 0.5;
    if (d < 1) { if (d < 1e-9) { dx = 1; dy = 0; } else { dx /= d; dy /= d; } d = 1; }
    else if (d > m) { dx *= m / d; dy *= m / d; d = m; }
    var a = d / 2, hh = Math.sqrt(Math.max(0, L * L - a * a)), mx = s[0] + dx / 2, my = s[1] + dy / 2, px = -dy / d, py = dx / d;
    var e1 = [mx + px * hh, my + py * hh], e2 = [mx - px * hh, my - py * hh];
    var s1 = e1[1] + side * e1[0] * 0.6, s2 = e2[1] + side * e2[0] * 0.6;
    return { e: s1 >= s2 ? e1 : e2, h: [s[0] + dx, s[1] + dy] };
  }
  function rotAt(p, deg, o) {
    var r = deg * Math.PI / 180, co = Math.cos(r), si = Math.sin(r), x = p[0] - o[0], y = p[1] - o[1];
    return [o[0] + x * co - y * si, o[1] + x * si + y * co].concat(p.slice(2));
  }

  register('fx', 'stream', { shape: 'line', refs: ['from', 'to'], style: 'stroke:var(--bsa-water,#4aa3df)', w: 3, dash: '6 3', flow: 30, drop: 1 });
  register('fx', 'gaze', { shape: 'line', refs: ['from', 'to'], style: 'stroke:var(--bsa-fx,#4a2ad6)', w: 2.5, dash: '5 5' });
  register('fx', 'ring', { shape: 'ring', refs: ['around'], style: 'stroke:var(--bsa-fx,#4a2ad6)', w: 2.5, dash: '5 4', pad: 0 });

  function V(ch, id, n, d) { var v = ch[id + '.' + n]; return v === undefined ? d : v; }
  function pre(s, id) { return s.replace(/data-r="~/g, 'data-r="' + id + '.'); }
  function P(id, r, v) { return '<path data-r="' + id + '.' + r + '" fill="none" stroke="' + col(v.c) + '" stroke-width="' + fmt(v.w) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }

  function markup(def) {
    var bg = spec('backdrop', def.stage.backdrop), B = [], F = [], bod = [], arms = [], hands = [], fx = [];
    Object.keys(def.props).forEach((id) => {
      var e = def.props[id], sp = spec('prop', e.type), gx = '<g data-r="' + id + '">' + pre(sp.svg, id) + '</g>';
      ((e.z || sp.z) === 'front' ? F : B).push(gx);
    });
    Object.keys(def.cast).forEach((id) => {
      var e = def.cast[id], sp = spec('actor', e.actor), A = sp.arm, L = sp.leg, sh = L.shoe || { rx: 9, ry: 3.5, c: '#222' }, s;
      s = '<g data-r="' + id + '"><g>' + P(id, 'legL', L) + P(id, 'legR', L);
      ['L', 'R'].forEach((k) => { s += '<ellipse data-r="' + id + '.shoe' + k + '" rx="' + fmt(sh.rx) + '" ry="' + fmt(sh.ry) + '" fill="' + col(sh.c) + '"/>'; });
      s += '</g><g data-r="' + id + '.up">' + pre(sp.body, id);
      (e.outfit || []).forEach((o) => { if (sp.outfit && HAS.call(sp.outfit, o) && typeof sp.outfit[o] === 'string') s += pre(sp.outfit[o], id); });
      s += '<g data-r="' + id + '.head">' + pre(sp.head, id);
      ['L', 'R'].forEach((k) => { s += '<circle data-r="' + id + '.eye' + k + '" r="' + fmt(sp.eye.r || 2.3) + '" fill="' + col(sp.eye.c || '#1b1b1b') + '"/>'; });
      Object.keys(sp.faces).forEach((k) => { s += '<g data-r="' + id + '.f.' + k + '" opacity="0">' + pre(sp.faces[k], id) + '</g>'; });
      bod.push(s + '</g></g></g>');
      ['L', 'R'].forEach((k) => {
        arms.push(P(id, 'arm' + k, A));
        hands.push('<circle data-r="' + id + '.hand' + k + '" r="' + fmt(A.hr || 5.5) + '" fill="' + col(A.hc || '#f0b98d') + '"/>');
      });
    });
    Object.keys(def.fx).forEach((id) => {
      var sp = spec('fx', def.fx[id].type), a = ' style="' + sp.style + '" fill="none" stroke-width="' + fmt(sp.w || 2.5) + '" stroke-dasharray="' + (/^[\d. ]{1,16}$/.test(sp.dash || '') ? sp.dash : '5 5') + '" stroke-linecap="round" opacity="0"/>';
      fx.push(sp.shape === 'ring' ? '<rect data-r="' + id + '" rx="9"' + a : '<line data-r="' + id + '"' + a);
    });
    return '<g>' + bg.svg + '</g>' + B.join('') + bod.join('') + arms.join('') + F.join('') + hands.join('') + fx.join('');
  }

  function bind(def, root) {
    var n = {}, l = root.querySelectorAll('[data-r]');
    for (var i = 0; i < l.length; i++) n[l[i].getAttribute('data-r')] = l[i];
    return { def: def, n: n, k: {} };
  }
  function W(x, name, a, v) {
    var nd = x.n[name]; v = String(v);
    if (!nd || x.k[name + '|' + a] === v) return;
    x.k[name + '|' + a] = v; nd.setAttribute(a, v);
  }

  function aState(d, id, ch) {
    var e = d.cast[id], sp = spec('actor', e.actor), tilt = num(V(ch, id, 'headTilt', 0), 0), lk = V(ch, id, 'look', null), fc = V(ch, id, 'face', e.face);
    if (!isArr(lk, 2)) lk = [1.6 * c(tilt / 10), 1.8 * c(tilt / 10)];
    var sit = c(num(V(ch, id, 'sit', 0), 0)), st = (sp.leg.sit || {});
    return {
      sp: sp, sit: sit, tilt: tilt, lean: num(V(ch, id, 'lean', 0), 0), x: num(V(ch, id, 'x', e.x), 0), y: num(st.dy, 0) * sit,
      f: num(V(ch, id, 'flip', e.flip ? 1 : 0), 0) > 0.5 ? -1 : 1, look: [Math.max(-4, Math.min(4, lk[0])), Math.max(-4, Math.min(4, lk[1]))],
      face: HAS.call(sp.faces, fc) ? fc : Object.keys(sp.faces)[0]
    };
  }
  function toStage(a, p) { return [a.x + a.f * p[0], p[1] + a.y]; }

  function anchor(def, id, name, sample) {
    var ch = sample.ch, e, sp, p, a, r;
    if (def.cast[id]) {
      a = aState(def, id, ch); sp = a.sp; p = sp.anchors[name];
      if (!isArr(p, 2)) return null;
      if ((sp.headAnchors || []).indexOf(name) >= 0) { p = rotAt(p, a.tilt, sp.pivot); p = [p[0] + a.look[0], p[1] + a.look[1]].concat(p.slice(2)); }
      p = rotAt(p, a.lean, sp.hip); r = toStage(a, p);
      return r.concat(p.slice(2));
    }
    e = def.props[id]; if (!e) return null;
    sp = spec('prop', e.type); p = sp.anchors && sp.anchors[name];
    if (typeof p === 'function') p = p(params(def, id, ch));
    if (!isArr(p, 2)) return null;
    p = rotAt(p, num(V(ch, id, 'rot', 0), 0), [0, 0]);
    return [num(V(ch, id, 'x', e.x), 0) + p[0], num(V(ch, id, 'y', e.y), 0) + p[1]];
  }
  function rf(d, ref, sm) { var m = REF.exec(ref); return m && anchor(d, m[1], m[2], sm); }
  function params(def, id, ch) {
    var sp = spec('prop', def.props[id].type), o = {}, k;
    for (k in (sp.params || {})) o[k] = num(V(ch, id, k, sp.params[k].def || 0), 0);
    return o;
  }

  function aApply(x, id, sample) {
    var d = x.def, ch = sample.ch, a = aState(d, id, ch), sp = a.sp, A = sp.arm, L = sp.leg, st = L.sit || {}, k;
    W(x, id, 'transform', 'translate(' + fmt(a.x) + ',' + fmt(a.y) + ') scale(' + a.f + ',1)');
    W(x, id + '.up', 'transform', 'rotate(' + fmt(a.lean) + ' ' + sp.hip[0] + ' ' + sp.hip[1] + ')');
    W(x, id + '.head', 'transform', 'rotate(' + fmt(a.tilt) + ' ' + sp.pivot[0] + ' ' + sp.pivot[1] + ')');
    ['L', 'R'].forEach((z, j) => {
      var ey = sp.eye[z], sh = L.shoe || {}, sg = j ? 1 : -1, hip = [sg * L.hip[0], L.hip[1]], ft = [sg * L.foot[0] + a.sit * num(st.fx, 0), L.foot[1] - a.sit * num(st.dy, 0)], lg = solveArm(hip, ft, L.L, 1);
      W(x, id + '.eye' + z, 'cx', fmt(ey[0] + a.look[0])); W(x, id + '.eye' + z, 'cy', fmt(ey[1] + a.look[1]));
      W(x, id + '.leg' + z, 'd', 'M' + fmt(hip[0]) + ' ' + fmt(hip[1]) + ' L' + fmt(lg.e[0]) + ' ' + fmt(lg.e[1]) + ' L' + fmt(lg.h[0]) + ' ' + fmt(lg.h[1]));
      W(x, id + '.shoe' + z, 'cx', fmt(lg.h[0] + num(sh.dx, 0))); W(x, id + '.shoe' + z, 'cy', fmt(lg.h[1] + num(sh.dy, 4)));

      var rest = [sg * A.rest[0], A.rest[1]], v = ch[id + '.hand' + z], dsc = v && typeof v === 'object' && !Array.isArray(v) ? v : { a: v === undefined ? 'rest' : v, b: v === undefined ? 'rest' : v, k: 0 };
      function pt(q) {
        var an;
        if (isArr(q, 2)) return [rest[0] + q[0], rest[1] + q[1]];
        if (typeof q === 'string' && q.charAt(0) === '@' && (an = rf(d, q.slice(1), sample))) return [(an[0] - a.x) / a.f, an[1] - a.y];
        return rest;
      }
      var tg = mix2(pt(dsc.a), pt(dsc.b), c(num(dsc.k, 0))), s0 = rotAt([sg * A.s[0], A.s[1]], a.lean, sp.hip), ar = solveArm(s0, tg, A.L, sg),
        S0 = toStage(a, s0), E = toStage(a, ar.e), H = toStage(a, ar.h);
      W(x, id + '.arm' + z, 'd', 'M' + fmt(S0[0]) + ' ' + fmt(S0[1]) + ' L' + fmt(E[0]) + ' ' + fmt(E[1]) + ' L' + fmt(H[0]) + ' ' + fmt(H[1]));
      W(x, id + '.hand' + z, 'cx', fmt(H[0])); W(x, id + '.hand' + z, 'cy', fmt(H[1]));
    });
    for (k in sp.faces) W(x, id + '.f.' + k, 'opacity', k === a.face ? 1 : 0);
  }

  function apply(x, sample) {
    var d = x.def, ch = sample.ch, id;
    for (id in d.props) {
      var e = d.props[id], sp = spec('prop', e.type), pr = sp.params || {}, k;
      W(x, id, 'transform', 'translate(' + fmt(V(ch, id, 'x', e.x)) + ',' + fmt(V(ch, id, 'y', e.y)) + ') rotate(' + fmt(V(ch, id, 'rot', 0)) + ')');
      W(x, id, 'opacity', fmt(c(num(V(ch, id, 'opacity', 1), 1))));
      for (k in pr) {
        var v = num(V(ch, id, k, pr[k].def || 0), 0);
        (pr[k].bind || []).forEach((b) => { W(x, id + '.' + b[0], b[1], fmt(mix(b[2], b[3], v))); });
      }
    }
    for (id in d.cast) aApply(x, id, sample);
    for (id in d.fx) {
      var f = d.fx[id], fs = spec('fx', f.type), op = c(num(V(ch, id, 'on', 0), 0)) * c(num(V(ch, id, 'opacity', 1), 1)), pu = f.pulse;
      if (pu) op *= (1 - pu.depth) + pu.depth * Math.sin(2 * Math.PI * pu.hz * sample.lt);
      if (op > 0.01) {
        if (fs.shape === 'ring') {
          var r = rf(d, f.around, sample), pd = num(fs.pad, 0);
          if (r && r.length > 3) { W(x, id, 'x', fmt(r[0] - r[2] / 2 - pd)); W(x, id, 'y', fmt(r[1] - r[3] / 2 - pd)); W(x, id, 'width', fmt(r[2] + 2 * pd)); W(x, id, 'height', fmt(r[3] + 2 * pd)); }
        } else {
          var p1 = rf(d, f.from, sample), p2 = rf(d, f.to, sample);
          if (p1 && p2) {
            W(x, id, 'x1', fmt(p1[0])); W(x, id, 'y1', fmt(p1[1])); W(x, id, 'x2', fmt(fs.drop ? p1[0] : p2[0])); W(x, id, 'y2', fmt(p2[1]));
            if (fs.flow) W(x, id, 'stroke-dashoffset', fmt(-((sample.lt * fs.flow) % 9)));
          }
        }
      }
      W(x, id, 'opacity', fmt(Math.max(0, op) > 0.01 ? op : 0));
    }
  }

  g.BSRig = { register: register, has: has, spec: spec, hasAnchor: hasAnchor, solveArm: solveArm, markup: markup, bind: bind, apply: apply, anchor: anchor };
})(window);
