/* Hoat hinh "be + V-ing" (Listening Part 1). Xuat window.BSAnim.mount(el).
   Khong phu thuoc tep khac, khong am thanh, khong goi mang. CSS rieng tien to .bsa- nam trong the <style> do script tao. */
(function (global) {
  'use strict';

  var SC = 7;            // giay moi dong tac
  var OUT = 21;          // bat dau phan tong ket
  var T = 23;            // tong thoi luong (giay)
  var AT = [3.8, 4.3, 4.8, 5.2, 5.7];   // moc hien tung manh cau
  var VIAT = 6.2;        // moc hien dong tieng Viet
  var REDUCED_LT = 6.8;  // thoi diem "cuoi canh" dung cho che do tinh

  var SCENES = [
    { title: 'Rót nước vào cốc',
      en: 'The man is pouring water into a cup.',
      pieces: [['The man', ''], [' is', 'is'], [' pour', ''], ['ing', 'ing'], [' water into a cup.', '']],
      note: 'pour → pouring: đang rót' },
    { title: 'Nhìn vào cốc',
      en: 'The man is looking at the cup.',
      pieces: [['The man', ''], [' is', 'is'], [' look', ''], ['ing', 'ing'], [' at the cup.', '']],
      note: 'look at → looking at: thêm ing sau động từ, giữ nguyên at (đang nhìn vào)' },
    { title: 'Mặc tạp dề',
      en: 'The man is wearing an apron.',
      pieces: [['The man', ''], [' is', 'is'], [' wear', ''], ['ing', 'ing'], [' an apron.', '']],
      note: 'wear → wearing: đang mặc (trạng thái đang có tạp dề trên người), khác putting on = đang mặc vào (hành động)' }
  ];

  var CSS =
    '.bsa-root{box-sizing:border-box;width:100%;max-width:720px;margin:0 auto;padding:12px;background:var(--card,#fff);color:var(--ink,#1b2733);' +
    'border:1px solid var(--line-strong,#c5ced9);border-radius:12px;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:left}' +
    '.bsa-root *{box-sizing:border-box}' +
    '.bsa-svg{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--line,#c5ced9)}' +
    '.bsa-step{margin:10px 0 0;font-weight:700;font-size:15px;color:var(--muted,#334155)}' +
    '.bsa-sent{margin:4px 0;font-size:clamp(20px,5.6vw,28px);line-height:1.35;font-weight:600;min-height:2.8em;color:var(--ink,#1b2733)}' +
    '.bsa-p{opacity:0;transition:opacity .35s;white-space:pre-wrap}' +
    '.bsa-p.bsa-on{opacity:1}' +
    '.bsa-is,.bsa-ing{font-weight:800;padding-bottom:1px}' +
    '.bsa-is{color:var(--bad,#a4161a);border-bottom:3px solid var(--bad,#a4161a)}' +
    '.bsa-ing{color:var(--pri,#0a58ca);border-bottom:3px dashed var(--pri,#0a58ca)}' +
    '.bsa-vi{margin:6px 0 10px;min-height:5.2em;padding:8px 12px;border-radius:8px;background:var(--card-2,#eef3fa);color:var(--ink,#1b2733);font-size:16px;opacity:0;transition:opacity .35s}' +
    '.bsa-vi.bsa-on{opacity:1}' +
    '.bsa-vi small{display:block;font-size:15px;color:var(--muted,#334155)}' +
    '.bsa-bar{height:8px;background:var(--track,#dde4ec);border-radius:4px;overflow:hidden;margin:0 0 10px}' +
    '.bsa-fill{height:100%;width:0;background:var(--pri,#0a58ca)}' +
    '.bsa-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}' +
    '.bsa-btn{font:inherit;font-weight:700;min-width:44px;min-height:44px;padding:0 16px;border-radius:8px;border:2px solid var(--pri,#0a58ca);background:var(--pri,#0a58ca);color:var(--pri-ink,#fff);cursor:pointer}' +
    '.bsa-btn.bsa-sec{background:var(--card,#fff);color:var(--pri,#0a58ca)}' +
    '.bsa-btn[aria-current="step"]{background:var(--ink,#1b2733);border-color:var(--ink,#1b2733);color:var(--card,#fff)}' +
    '.bsa-btn[aria-disabled="true"]{background:var(--dis-bg,#e5e9ef);border-color:var(--dis-line,#94a3b8);color:var(--dis-ink,#475569);cursor:default}' +
    '.bsa-btn:focus-visible{outline:3px solid var(--focus,#111827);outline-offset:2px;box-shadow:0 0 0 6px var(--card,#fff)}' +
    '.bsa-btn[hidden]{display:none}' +
    '.bsa-note{margin:4px 0 8px;font-size:15px;color:var(--muted,#334155)}' +
    '.bsa-src{margin:4px 0 0;font-size:14px;line-height:1.5;color:var(--muted,#334155)}' +
    '.bsa-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '@media (prefers-reduced-motion:reduce){.bsa-p,.bsa-vi{transition:none}}';

  var SKIN = '#f0b98d', HAIR = '#2b2118', SHIRT = '#4f7cac', TROUSER = '#3d405b', APRON = '#f4d58d';

  var SVG =
    '<svg class="bsa-svg" viewBox="0 0 360 270" role="img" focusable="false" ' +
    'aria-label="Hoạt hình minh họa: người đàn ông lần lượt rót nước vào cốc, nhìn vào cốc, rồi chỉ vào chiếc tạp dề đang mặc">' +
    '<title>Người đàn ông rót nước, nhìn vào cốc, mặc tạp dề</title>' +
    '<desc>Ba động tác của một người đàn ông bên quầy bếp, dùng để minh họa cấu trúc be + V-ing: rót nước, nhìn vào cốc, mặc tạp dề.</desc>' +
    '<rect width="360" height="270" fill="#eef3fa"/>' +
    '<rect x="0" y="250" width="360" height="20" fill="#d5dde8"/>' +
    '<rect x="190" y="182" width="170" height="68" fill="#dfe6ee" stroke="#51657d" stroke-width="2"/>' +
    '<line x1="275" y1="182" x2="275" y2="250" stroke="#51657d" stroke-width="1.5"/>' +
    '<rect x="185" y="172" width="175" height="10" rx="2" fill="#7b8aa0" stroke="#51657d" stroke-width="2"/>' +
    '<rect data-r="water" x="231" y="171" width="18" height="0.01" fill="#4aa3df"/>' +
    '<path d="M229 152 L231 172 L249 172 L251 152 Z" fill="#fff" fill-opacity="0.35" stroke="#51657d" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M251 156 Q262 158 250 168" fill="none" stroke="#51657d" stroke-width="2" stroke-linecap="round"/>' +
    '<line data-r="stream" x1="0" y1="0" x2="0" y2="0" stroke="#4aa3df" stroke-width="3" stroke-dasharray="6 3" stroke-linecap="round" opacity="0"/>' +
    '<line data-r="gaze" x1="0" y1="0" x2="0" y2="0" stroke="#0a58ca" stroke-width="2.5" stroke-dasharray="5 5" stroke-linecap="round" opacity="0"/>' +
    '<g data-r="man">' +
      '<line x1="-7" y1="205" x2="-7" y2="244" stroke="' + TROUSER + '" stroke-width="10" stroke-linecap="round"/>' +
      '<line x1="7" y1="205" x2="7" y2="244" stroke="' + TROUSER + '" stroke-width="10" stroke-linecap="round"/>' +
      '<ellipse cx="-3" cy="248" rx="9" ry="3.5" fill="#222"/>' +
      '<ellipse cx="11" cy="248" rx="9" ry="3.5" fill="#222"/>' +
      '<path d="M-17 150 L17 150 L18 210 L-18 210 Z" fill="' + TROUSER + '"/>' +
      '<path d="M-17 106 Q0 99 17 106 L18 156 L-18 156 Z" fill="' + SHIRT + '"/>' +
      '<path d="M-12 112 L12 112 L16 192 L-16 192 Z" fill="' + APRON + '" stroke="#b08900" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M-12 112 L-4 100 M12 112 L4 100" fill="none" stroke="#b08900" stroke-width="1.5" stroke-linecap="round"/>' +
      '<rect x="-8" y="160" width="16" height="12" rx="2" fill="none" stroke="#b08900" stroke-width="1.2"/>' +
      '<rect data-r="aph" x="-23" y="104" width="46" height="94" rx="9" fill="none" stroke="#0a58ca" stroke-width="2.5" stroke-dasharray="5 4" opacity="0"/>' +
      '<rect x="-4" y="92" width="8" height="14" fill="' + SKIN + '"/>' +
      '<g data-r="head">' +
        '<ellipse cx="0" cy="77" rx="17.5" ry="19" fill="' + SKIN + '"/>' +
        '<path d="M-19 74 Q-20 54 0 54 Q20 54 19 74 Q12 63 0 64 Q-12 63 -19 74 Z" fill="' + HAIR + '"/>' +
        '<circle data-r="eyeL" cx="-7" cy="78" r="2.3" fill="#1b1b1b"/>' +
        '<circle data-r="eyeR" cx="7" cy="78" r="2.3" fill="#1b1b1b"/>' +
        '<path d="M-5 88 Q0 92 5 88" fill="none" stroke="#8a3b2a" stroke-width="1.8" stroke-linecap="round"/>' +
      '</g>' +
    '</g>' +
    '<path data-r="armL" fill="none" stroke="' + SHIRT + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path data-r="armR" fill="none" stroke="' + SHIRT + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<g data-r="kettle">' +
      '<path d="M2 -10 Q-10 -2 2 6" fill="none" stroke="#51657d" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M32 -8 L46 -17 L48 -14 L33 -2 Z" fill="#9aa9bb" stroke="#51657d" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<rect x="2" y="-14" width="32" height="24" rx="7" fill="#9aa9bb" stroke="#51657d" stroke-width="2"/>' +
      '<rect x="10" y="-18" width="16" height="4" rx="1.5" fill="#cfd9e4" stroke="#51657d" stroke-width="1.5"/>' +
      '<circle cx="18" cy="-21" r="2.5" fill="#51657d"/>' +
    '</g>' +
    '<circle data-r="handL" r="5.5" fill="' + SKIN + '"/>' +
    '<circle data-r="handR" r="5.5" fill="' + SKIN + '"/>' +
    '</svg>';

  function tpl(uid) {
    return '<style>' + CSS + '</style>' +
      '<div class="bsa-root" role="region" aria-label="Hoạt hình mẹo be + V-ing: người trong hình đang làm gì">' +
      SVG +
      '<p class="bsa-step" data-r="step"></p>' +
      '<p class="bsa-sent" lang="en" data-r="sent"></p>' +
      '<div class="bsa-vi" data-r="vi"></div>' +
      '<div class="bsa-bar" role="progressbar" aria-label="Tiến độ hoạt hình" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-r="bar2"><div class="bsa-fill" data-r="fill"></div></div>' +
      '<div class="bsa-row" role="group" aria-label="Điều khiển hoạt hình">' +
        '<button type="button" class="bsa-btn" data-a="play">Phát</button>' +
        '<button type="button" class="bsa-btn bsa-sec" data-a="pause">Tạm dừng</button>' +
        '<button type="button" class="bsa-btn bsa-sec" data-a="prev" hidden>Trước</button>' +
        '<button type="button" class="bsa-btn" data-a="next" hidden>Tiếp</button>' +
        '<button type="button" class="bsa-btn bsa-sec" data-a="replay">Xem lại</button>' +
      '</div>' +
      '<div class="bsa-row" role="group" aria-label="Chọn động tác">' +
        '<button type="button" class="bsa-btn bsa-sec" data-s="0" aria-label="Chuyển tới động tác 1: rót nước vào cốc">Bước 1</button>' +
        '<button type="button" class="bsa-btn bsa-sec" data-s="1" aria-label="Chuyển tới động tác 2: nhìn vào cốc">Bước 2</button>' +
        '<button type="button" class="bsa-btn bsa-sec" data-s="2" aria-label="Chuyển tới động tác 3: mặc tạp dề">Bước 3</button>' +
      '</div>' +
      '<p class="bsa-note" data-r="rnote" hidden>Bạn đang tắt chuyển động trên thiết bị, nên hoạt hình hiện từng bước tĩnh. Bấm &ldquo;Tiếp&rdquo; để sang bước sau.</p>' +
      '<p class="bsa-src" data-r="src">Hoạt hình minh họa do Từng Bước English soạn.</p>' +
      '<div class="bsa-sr" aria-live="polite" data-r="sr"></div>' +
      '</div>';
  }

  var VI_FORMULA = 'be (<span class="bsa-is">is</span>) + động từ-<span class="bsa-ing">ing</span> = đang làm gì';

  function c(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { x = c(x); return x * x * (3 - 2 * x); }
  function mix(a, b, k) { return a + (b - a) * k; }
  function mix2(a, b, k) { return [mix(a[0], b[0], k), mix(a[1], b[1], k)]; }

  // Khuyu tay bang IK hai doan; chon huong khuyu thap hon va huong ra ngoai.
  function elbow(s, h, side) {
    var L = 33, dx = h[0] - s[0], dy = h[1] - s[1], d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) d = 1;
    if (d > 2 * L - 0.5) { h = [s[0] + dx * (2 * L - 0.5) / d, s[1] + dy * (2 * L - 0.5) / d]; d = 2 * L - 0.5; dx = h[0] - s[0]; dy = h[1] - s[1]; }
    var a = d / 2, hh = Math.sqrt(Math.max(0, L * L - a * a));
    var mx = s[0] + dx / 2, my = s[1] + dy / 2, px = -dy / d, py = dx / d;
    var e1 = [mx + px * hh, my + py * hh], e2 = [mx - px * hh, my - py * hh];
    var s1 = e1[1] + side * e1[0] * 0.6, s2 = e2[1] + side * e2[0] * 0.6;
    return { e: s1 >= s2 ? e1 : e2, h: h };
  }

  function pose(i, lt) {
    var o = { wx: 140, tilt: 0, reach: 0, lift: 0, kt: 0, water: 0, stream: 0, gaze: 0, ap: 0, hl: 0 };
    // reach: tay phai tu vi tri nghi toi am; lift: am nang len; kt: goc nghieng am; ap: tay cham tap de; hl: vien nhan manh tap de
    if (i === 0) {
      o.reach = ease((lt - 0.3) / 0.9);
      o.lift = ease((lt - 1.2) / 0.8);
      o.kt = 25 * ease((lt - 1.8) / 0.7);
      o.stream = lt > 2.4 ? 1 : 0;
      o.water = c((lt - 2.4) / 3.8);
      o.tilt = 8 * ease((lt - 0.8) / 1);
    } else if (i === 1) {
      o.water = 1;
      o.kt = 25 * (1 - ease(lt / 0.7));
      o.stream = lt < 0.12 ? 1 : 0;
      o.lift = 1 - ease((lt - 0.2) / 0.9);
      o.reach = 1 - ease((lt - 1.5) / 0.8);
      o.tilt = mix(8, 16, ease(lt / 1.2));
      o.gaze = c((lt - 2.4) / 0.3) * (0.55 + 0.45 * Math.sin(lt * 7));
    } else {
      o.water = 1;
      o.tilt = 16 * (1 - ease(lt / 0.8));
      o.ap = ease((lt - 0.4) / 0.9);
      o.hl = c((lt - 1.6) / 0.4) * (0.6 + 0.4 * Math.sin(lt * 5));
    }
    return o;
  }

  function mount(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.__bsa) { el.__bsa.destroy(); }
    el.textContent = '';
    el.innerHTML = tpl();

    var q = function (s) { return el.querySelector(s); };
    var R = function (n) { return el.querySelector('[data-r="' + n + '"]'); };
    var N = {};
    ['water', 'stream', 'gaze', 'man', 'aph', 'kettle', 'head', 'eyeL', 'eyeR',
     'armL', 'armR', 'handL', 'handR', 'step', 'sent', 'vi', 'bar2', 'fill', 'rnote', 'sr'].forEach(function (n) { N[n] = R(n); });
    var B = {
      play: q('[data-a="play"]'), pause: q('[data-a="pause"]'), prev: q('[data-a="prev"]'),
      next: q('[data-a="next"]'), replay: q('[data-a="replay"]')
    };
    var chips = el.querySelectorAll('[data-s]');

    var mq = (global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null);
    var st = { t: 0, playing: false, raf: 0, last: 0, step: 0, reduced: !!(mq && mq.matches), scene: -1, ann: -1, outro: false, wasConn: false, dead: false };
    var pieceEls = [];

    function set(n, a, v) { N[n].setAttribute(a, v); }

    function buildSentence(i) {
      N.sent.textContent = '';
      pieceEls = [];
      SCENES[i].pieces.forEach(function (p) {
        var s = document.createElement('span');
        s.className = 'bsa-p' + (p[1] ? ' bsa-' + p[1] : '');
        s.textContent = p[0];
        N.sent.appendChild(s);
        pieceEls.push(s);
      });
    }

    function ui() {
      var rd = st.reduced;
      B.play.hidden = rd; B.pause.hidden = rd; B.prev.hidden = !rd; B.next.hidden = !rd;
      N.rnote.hidden = !rd;
      B.play.setAttribute('aria-disabled', st.playing ? 'true' : 'false');
      B.pause.setAttribute('aria-disabled', st.playing ? 'false' : 'true');
      B.prev.setAttribute('aria-disabled', st.step <= 0 ? 'true' : 'false');
      B.next.setAttribute('aria-disabled', st.step >= 2 ? 'true' : 'false');
      B.play.textContent = (!st.playing && st.t >= T) ? 'Phát lại' : (st.t > 0 && !st.playing ? 'Tiếp tục' : 'Phát');
    }

    function render() {
      var i, lt, rd = st.reduced, outro = false;
      if (rd) { i = st.step; lt = REDUCED_LT; }
      else { i = Math.min(2, Math.floor(st.t / SC)); lt = st.t - i * SC; outro = st.t >= OUT; }
      var o = pose(i, lt), wx = o.wx;

      // coc nuoc
      var wh = 16 * o.water;
      set('water', 'y', 171 - wh); set('water', 'height', Math.max(0.01, wh));

      // nhan vat
      set('man', 'transform', 'translate(' + wx + ',0)');
      set('aph', 'opacity', o.hl.toFixed(2));
      set('head', 'transform', 'rotate(' + o.tilt.toFixed(2) + ' 0 98)');
      var edx = 1.6 * c(o.tilt / 10), edy = 1.8 * c(o.tilt / 10);
      set('eyeL', 'cx', -7 + edx); set('eyeR', 'cx', 7 + edx);
      set('eyeL', 'cy', 78 + edy); set('eyeR', 'cy', 78 + edy);

      // am nuoc
      var kp = [192, 160 - 32 * o.lift];
      set('kettle', 'transform', 'translate(' + kp[0] + ',' + kp[1].toFixed(1) + ') rotate(' + o.kt.toFixed(2) + ')');
      if (o.stream) {
        var ar = o.kt * Math.PI / 180;
        var tx = kp[0] + 46 * Math.cos(ar) + 16 * Math.sin(ar), ty = kp[1] + 46 * Math.sin(ar) - 16 * Math.cos(ar);
        set('stream', 'x1', tx.toFixed(1)); set('stream', 'y1', (ty + 2).toFixed(1));
        set('stream', 'x2', tx.toFixed(1)); set('stream', 'y2', (171 - wh).toFixed(1));
        set('stream', 'stroke-dashoffset', (-(lt * 30) % 9).toFixed(1));
        set('stream', 'opacity', 1);
      } else set('stream', 'opacity', 0);

      // tay
      var restL = [wx - 26, 160], restR = [wx + 26, 160];
      var hl = mix2(restL, [wx - 14, 152], o.ap);
      var hr = mix2(mix2(restR, [wx + 14, 152], o.ap), kp, o.reach);
      var sL = [wx - 13, 110], sR = [wx + 13, 110];
      var aL = elbow(sL, hl, -1), aR = elbow(sR, hr, 1);
      set('armL', 'd', 'M' + sL[0] + ' ' + sL[1] + ' L' + aL.e[0].toFixed(1) + ' ' + aL.e[1].toFixed(1) + ' L' + aL.h[0].toFixed(1) + ' ' + aL.h[1].toFixed(1));
      set('armR', 'd', 'M' + sR[0] + ' ' + sR[1] + ' L' + aR.e[0].toFixed(1) + ' ' + aR.e[1].toFixed(1) + ' L' + aR.h[0].toFixed(1) + ' ' + aR.h[1].toFixed(1));
      set('handL', 'cx', aL.h[0]); set('handL', 'cy', aL.h[1]);
      set('handR', 'cx', aR.h[0]); set('handR', 'cy', aR.h[1]);

      // duong nhin
      if (o.gaze > 0.01) {
        set('gaze', 'x1', wx + 6 + edx); set('gaze', 'y1', 80 + edy);
        set('gaze', 'x2', 236); set('gaze', 'y2', 152);
        set('gaze', 'opacity', o.gaze.toFixed(2));
      } else set('gaze', 'opacity', 0);

      // chu
      if (st.scene !== i) { st.scene = i; buildSentence(i); }
      var allOn = true;
      for (var j = 0; j < pieceEls.length; j++) {
        var on = lt >= AT[j];
        pieceEls[j].classList.toggle('bsa-on', on);
        if (!on) allOn = false;
      }
      var viOn = lt >= VIAT;
      if (outro !== st.outro || N.vi.getAttribute('data-i') !== String(i)) {
        st.outro = outro;
        N.vi.setAttribute('data-i', String(i));
        N.vi.innerHTML = outro
          ? 'Ghi nhớ nhanh: tìm câu <span class="bsa-is">be</span> + động từ-<span class="bsa-ing">ing</span> mô tả đúng điều đang xảy ra trong hình. Mẹo: wearing = đang mặc sẵn trên người (trạng thái); putting on = đang mặc vào (hành động).'
          : VI_FORMULA + '<small>' + SCENES[i].note + '</small>';
      }
      N.vi.classList.toggle('bsa-on', viOn);
      N.step.textContent = outro ? 'Tổng kết' : ('Động tác ' + (i + 1) + '/3 · ' + SCENES[i].title);
      for (var m = 0; m < chips.length; m++) {
        if (+chips[m].getAttribute('data-s') === i) chips[m].setAttribute('aria-current', 'step');
        else chips[m].removeAttribute('aria-current');
      }
      var pct = rd ? Math.round((i + 1) / 3 * 100) : Math.round(st.t / T * 100);
      N.fill.style.width = pct + '%';
      N.bar2.setAttribute('aria-valuenow', pct);

      // doc cho trinh doc man hinh khi cau da day du
      var done = allOn && viOn;
      if (done && st.ann !== i) { st.ann = i; N.sr.textContent = 'Câu mẫu: ' + SCENES[i].en + ' Cấu trúc be + V-ing (ở đây là is + động từ-ing) nghĩa là đang làm gì.'; }
      else if (!done) st.ann = -1;
    }

    function frame(ts) {
      st.raf = 0;
      if (st.dead || !st.playing) return;
      if (!el.isConnected) {
        if (st.wasConn) { st.playing = false; ui(); return; }
      } else {
        st.wasConn = true;
        if (el.getClientRects().length === 0) { st.last = ts; st.raf = global.requestAnimationFrame(frame); return; } // dang an: khong chay
      }
      var dt = st.last ? Math.min(0.1, (ts - st.last) / 1000) : 0;
      st.last = ts;
      st.t += dt;
      if (st.t >= T) { st.t = T; st.playing = false; render(); ui(); return; }
      render();
      st.raf = global.requestAnimationFrame(frame);
    }

    function stopLoop() { if (st.raf) { global.cancelAnimationFrame(st.raf); st.raf = 0; } }

    var api = {
      duration: T,
      play: function () {
        if (st.reduced || st.dead) return;
        if (st.t >= T) st.t = 0;
        st.playing = true; st.last = 0;
        if (!st.raf) st.raf = global.requestAnimationFrame(frame);
        ui();
      },
      pause: function () { st.playing = false; stopLoop(); ui(); },
      replay: function () {
        stopLoop(); st.t = 0; st.step = 0; st.ann = -1; st.scene = -1;
        if (st.reduced) { st.playing = false; render(); ui(); } else { render(); api.play(); }
      },
      seek: function (t) { st.t = c(t / T) * T; render(); ui(); },
      go: function (n) {
        n = Math.max(0, Math.min(2, n | 0));
        st.step = n;
        if (!st.reduced) { st.t = n * SC; }
        render(); ui();
      },
      destroy: function () {
        st.dead = true; st.playing = false; stopLoop();
        if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq); }
        if (el.__bsa === api) el.__bsa = null;
        el.textContent = '';
      }
    };

    function onMq() {
      st.reduced = !!(mq && mq.matches);
      stopLoop(); st.playing = false;
      st.step = Math.min(2, Math.floor(st.t / SC));
      st.scene = -1;
      render(); ui();
    }
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }

    function enabled(b) { return b.getAttribute('aria-disabled') !== 'true'; }
    B.play.addEventListener('click', function () { if (enabled(B.play)) api.play(); });
    B.pause.addEventListener('click', function () { if (enabled(B.pause)) api.pause(); });
    B.replay.addEventListener('click', function () { api.replay(); });
    B.prev.addEventListener('click', function () { if (enabled(B.prev)) api.go(st.step - 1); });
    B.next.addEventListener('click', function () { if (enabled(B.next)) api.go(st.step + 1); });
    for (var ci = 0; ci < chips.length; ci++) {
      (function (b) { b.addEventListener('click', function () { api.go(+b.getAttribute('data-s')); }); })(chips[ci]);
    }

    el.__bsa = api;
    render(); ui();
    if (!st.reduced) api.play();
    return api;
  }

  global.BSAnim = { mount: mount };
})(window);
