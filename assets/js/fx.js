/* fx.js - phao giay (confetti) bang canvas. Khong phu thuoc, khong goi mang. Tu don sau toi da 2,5 giay. */
(function () {
  "use strict";
  var current = null;

  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  function cleanup() {
    if (!current) return;
    try { if (current.raf) cancelAnimationFrame(current.raf); } catch (e) { /* bo qua */ }
    try { clearTimeout(current.timer); } catch (e2) { /* bo qua */ }
    try { if (current.canvas.parentNode) current.canvas.parentNode.removeChild(current.canvas); } catch (e3) { /* bo qua */ }
    try { window.removeEventListener("resize", current.onResize); } catch (e4) { /* bo qua */ }
    current = null;
  }

  function confetti(opts) {
    if (reduced() || !document.body) return;
    opts = opts || {};
    cleanup();
    var count = opts.count || 120;
    var life = Math.min(opts.duration || 2500, 2500);
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2000";
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    function size() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    document.body.appendChild(canvas);

    var hues = [262, 330, 24, 190, 48, 150];
    var ps = [];
    for (var i = 0; i < count; i++) {
      var a = (-90 + (Math.random() - 0.5) * 80) * Math.PI / 180;
      var sp = 8 + Math.random() * 9;
      ps.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.7,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        s: 6 + Math.random() * 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        c: "hsl(" + hues[i % hues.length] + ",90%,60%)"
      });
    }
    var start = Date.now();
    current = { canvas: canvas, raf: 0, timer: 0, onResize: size };
    window.addEventListener("resize", size);
    current.timer = setTimeout(cleanup, life + 100);

    function frame() {
      if (!current || current.canvas !== canvas) return;
      var t = Date.now() - start;
      if (t >= life) { cleanup(); return; }
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, Math.min(1, (life - t) / 600));
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j];
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      current.raf = requestAnimationFrame(frame);
    }
    current.raf = requestAnimationFrame(frame);
  }

  window.BSFx = { confetti: confetti };
})();
