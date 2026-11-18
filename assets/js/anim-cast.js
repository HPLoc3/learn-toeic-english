/* anim-cast.js - dien vien, dao cu, phong nen cho hoat hinh Tung Buoc. Ve SVG tu thiet ke, goc 100%.
   Dang ky qua BSRig.register(kind,name,spec); hinh dang spec: tools/ANIM-RIG-CONTRACT.md. Khong dung id. */
(function (g) {
  'use strict';
  var R = g.BSRig;
  if (!R || !R.register) return;
  var INK = '#2b2350', PUR = '#4a2ad6', BL = '#ff9aa8';
  function P(d, f, x) { return '<path d="' + d + '" fill="' + f + '"' + (x || '') + '/>'; }
  function E(cx, cy, rx, ry, f, x) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + (x || '') + '/>'; }
  function B(x, y, w, h, r, f, s) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + f + '"' + (s || '') + '/>'; }
  function L(x1, y1, x2, y2, c, w) { return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round"/>'; }
  var LN = ' stroke-linecap="round" stroke-linejoin="round"';
  function S(c, w) { return ' stroke="' + c + '" stroke-width="' + w + '"' + LN; }

  var FACES = {
    smile: P('M-6 92Q0 98 6 92', 'none', S(INK, 2.2)),
    open: E(0, 93, 4.5, 4, '#8a2f4a'),
    flat: L(-4, 93, 4, 93, INK, 2.2)
  };
  var OUTFITS = {
    apron: P('M-13 113L13 113L19 197L-19 197Z', '#f7c948', S('#c99410', 1.6)) + L(-13, 113, -6, 104, '#c99410', 2) + L(13, 113, 6, 104, '#c99410', 2) + B(-9, 160, 18, 13, 3, 'none', S('#c99410', 1.4)),
    vest: P('M-20 110L-6 110L0 150L-4 198L-20 198Z M20 110L6 110L0 150L4 198L20 198Z', '#5b44d9'),
    nametag: B(5, 126, 15, 10, 2, '#fff', S(PUR, 1.2)) + B(7.5, 129, 8, 2, 1, PUR) + L(11, 116, 12, 126, PUR, 1.2)
  };

  function actor(o) {
    var sk = o.skin;
    return {
      name: o.name, age: o.age, job: o.job,
      pivot: [0, 106], hip: [0, 205],
      eye: { L: [-10, 80], R: [10, 80], r: 2.7, c: INK },
      faces: FACES, outfit: OUTFITS,
      arm: { L: 34, s: [14, 112], rest: [26, 160], w: 10, c: o.top, hr: 6, hc: sk },
      leg: { L: 21, hip: [8, 203], foot: [8, 242], w: 12, c: o.pants, shoe: { rx: 10, ry: 4.5, c: o.shoe, dx: 1, dy: 5 }, sit: { dy: 30, fx: 24 } },
      anchors: { eye: [7, 80], apron: [0, 151, 46, 94] }, headAnchors: ['eye'],
      body: B(-20, 186, 40, 28, 8, o.pants) + (o.skirt || '') + B(-5, 98, 10, 14, 3, sk) + B(-20, 106, 40, 94, 14, o.top) + (o.bodyX || ''),
      head: E(-28, 82, 4.5, 6, sk) + E(28, 82, 4.5, 6, sk) + E(0, 78, 28, 31, sk) + E(-17, 90, 5.5, 3.4, BL, ' opacity=".55"') + E(17, 90, 5.5, 3.4, BL, ' opacity=".55"') + o.hair + (o.headX || ''),

    };
  }

  R.register('actor', 'nam', actor({
    name: 'Nam', age: 28, job: 'Nhân viên quán cà phê',
    skin: '#f2c29b', top: '#4f86e0', pants: '#3b3f66', shoe: '#2a2540',
    hair: P('M-29 76Q-33 44 0 45Q33 44 29 76Q25 62 10 58Q-4 66 -29 76Z', '#3a2a22') + P('M-6 49Q4 38 16 47Q6 47 -6 49Z', '#3a2a22')
  }));

  R.register('actor', 'mai', actor({
    name: 'Mai', age: 24, job: 'Nhân viên văn phòng',
    skin: '#f5cdb0', top: '#2fb8a7', pants: '#44476b', shoe: '#2a2540',
    skirt: P('M-21 188L21 188L25 218L-25 218Z', '#44476b'),
    bodyX: OUTFITS.nametag,
    hair: P('M-32 92Q-37 44 0 45Q37 44 32 92Q31 98 24 97L24 72Q6 66 -6 54Q-16 66 -24 72L-24 97Q-31 98 -32 92Z', '#2c2233')
  }));

  R.register('actor', 'hanh', actor({
    name: 'cô Hạnh', age: 55, job: 'Chủ tiệm hoa',
    skin: '#e9b894', top: '#b5753f', pants: '#6b4a3a', shoe: '#3b2a24',
    skirt: P('M-21 188L21 188L26 232L-26 232Z', '#6b4a3a'),
    bodyX: P('M-9 106L0 128L9 106Z', '#f3e4cf') + L(0, 128, 0, 196, '#8f5a2c', 1.5) + B(-17, 160, 10, 11, 2, 'none', S('#8f5a2c', 1.3)),
    hair: P('M-29 76Q-33 46 0 46Q33 46 29 76Q24 62 8 58Q-8 64 -29 76Z', '#a9a3b0') + E(0, 40, 12, 10, '#a9a3b0') + L(-14, 56, -4, 52, '#f0eef4', 2),
    headX: '<circle cx="-10" cy="80" r="8.5" fill="none"' + S('#5a3d2b', 1.8) + '/><circle cx="10" cy="80" r="8.5" fill="none"' + S('#5a3d2b', 1.8) + '/>' + L(-1.5, 80, 1.5, 80, '#5a3d2b', 1.8)
  }));

  /* Dao cu */
  R.register('prop', 'cup', {
    w: 22, h: 20, z: 'back',
    svg: '<rect data-r="~water" x="-9" y="-1" width="18" height="0.01" fill="#5cc8ff"/>' +
      P('M-11 -20L11 -20L9 0L-9 0Z', '#fff', ' fill-opacity=".4"' + S(INK, 1.8)) + B(-10, -14, 20, 5, 0, PUR, ' opacity=".8"') + P('M11 -15Q22 -14 10 -5', 'none', S(INK, 1.8)),
    params: { fill: { def: 0, bind: [['water', 'height', 0.01, 16], ['water', 'y', -1, -17]] } },
    anchors: { rim: [-4, -20], surface: function (p) { return [0, -1 - 16 * (p.fill || 0)]; } }
  });

  R.register('prop', 'kettle', {
    w: 50, h: 40, z: 'front',
    svg: P('M2 -10Q-10 -2 2 6', 'none', S(INK, 3)) + P('M32 -8L46 -17L49 -13L33 -2Z', '#ffb08f', S(INK, 1.5)) +
      B(2, -14, 32, 24, 8, '#ff9b71', S(INK, 1.8)) + E(10, -4, 3, 5, '#fff', ' opacity=".45"') + B(10, -18, 16, 4, 2, '#ffd2bd', S(INK, 1.4)) + '<circle cx="18" cy="-21" r="2.5" fill="' + PUR + '"/>',
    anchors: { handle: [0, 0], spout: [46, -16] }
  });

  R.register('prop', 'counter', {
    w: 175, h: 78, z: 'back',
    svg: B(5, 10, 165, 68, 2, '#ddd5fa', S('#a99ae8', 1.5)) + L(88, 10, 88, 78, '#a99ae8', 1.5) + B(0, 0, 175, 10, 3, '#5a3fdc'),
    anchors: { top: [88, 0] }
  });

  R.register('prop', 'table', {
    w: 120, h: 70, z: 'back',
    svg: B(0, 0, 120, 9, 3, '#c98c52') + B(10, 9, 8, 61, 2, '#a96f3c') + B(102, 9, 8, 61, 2, '#a96f3c'),
    anchors: { top: [60, 0] }
  });

  R.register('prop', 'laptop', {
    w: 56, h: 40, z: 'back',
    svg: B(-24, -32, 48, 32, 4, '#3a3560') + B(-20, -28, 40, 24, 2, '#e8e2ff') + L(-14, -22, 6, -22, PUR, 2.5) + L(-14, -15, 12, -15, '#b7a9f5', 2.5) + P('M-30 0L30 0L26 6L-26 6Z', '#a99ae8', S('#8576d6', 1)),
    anchors: { top: [0, -32] }
  });

  R.register('prop', 'box', {
    w: 44, h: 36, z: 'back',
    svg: B(-22, -36, 44, 36, 3, '#d9a066', S('#a8733a', 1.5)) + B(-5, -36, 10, 36, 0, '#ecc590', ' opacity=".8"') + L(-22, -26, 22, -26, '#a8733a', 1),
    anchors: { top: [0, -36] }
  });

  /* Phong nen */
  R.register('backdrop', 'kitchen', {
    svg: B(0, 0, 360, 270, 0, '#f1eefc') + B(0, 150, 360, 100, 0, '#e6e0fa') + B(0, 250, 360, 20, 0, '#d4cbf3') +
      B(24, 34, 70, 56, 6, '#fff', S(PUR, 3)) + L(59, 34, 59, 90, '#cfc6f5', 2) + L(24, 62, 94, 62, '#cfc6f5', 2) +
      B(120, 54, 90, 6, 3, '#a99ae8') + B(132, 36, 16, 18, 3, '#ffb08f') + B(160, 40, 14, 14, 3, '#fff', S('#a99ae8', 1.5)) + B(184, 34, 16, 20, 3, '#ffd45e') +
      B(185, 182, 175, 68, 0, '#ddd5fa', S('#a99ae8', 1.5)) + L(275, 182, 275, 250, '#a99ae8', 1.5) + B(180, 172, 180, 10, 3, '#5a3fdc'),
    desc: 'Bếp quán cà phê'
  });

  R.register('backdrop', 'office', {
    svg: B(0, 0, 360, 270, 0, '#f1eefc') + B(0, 160, 360, 90, 0, '#e6e0fa') + B(0, 250, 360, 20, 0, '#cfd6f3') +
      B(220, 30, 110, 80, 6, '#e3f1ff', S(PUR, 3)) + B(236, 70, 16, 40, 0, '#a9bff0') + B(258, 52, 20, 58, 0, '#8fa8e6') + B(284, 78, 18, 32, 0, '#a9bff0') +
      B(30, 40, 60, 40, 4, '#fff', S('#a99ae8', 2)) + L(40, 54, 80, 54, PUR, 3) + L(40, 66, 70, 66, '#b7a9f5', 3) +
      B(300, 218, 22, 32, 4, '#ffd2bd') + E(311, 206, 20, 18, '#69c48f') + E(300, 212, 10, 12, '#4fae78'),
    desc: 'Văn phòng'
  });

  R.register('backdrop', 'plain', {
    svg: B(0, 0, 360, 270, 0, '#f1eefc') + B(0, 250, 360, 20, 0, '#d4cbf3'),
    desc: 'Nền trơn'
  });
})(window);
