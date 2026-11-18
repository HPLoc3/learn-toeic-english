/* mascot.js - linh vat "Buoc" (cao con, SVG tu ve). Khong rAF/am thanh/mang/XP. Chi dung prefs.mascot qua BS.pref/setPref. */
(function () {
  "use strict";
  var BS = window.BS;
  if (!BS) return;
  var MOODS = ["idle", "wave", "cheer", "proud", "worried"];
  var DOC = typeof document !== "undefined" ? document : null;

  function mood(m) { return MOODS.indexOf(m) >= 0 ? m : "idle"; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; });
  }

  /* hinh (ham thuan): o.mini cat ve dau; o.bare bo data-mood (host giu) */
  function svg(m, o) {
    o = o || {};
    var F = ' class="mf"', C = ' class="mc"', D = ' class="md"';
    return '<svg class="mascot' + (o.mini ? " mascot-mini" : "") + '" viewBox="' + (o.mini ? "34 12 52 56" : "0 0 120 120") +
      '" aria-hidden="true" focusable="false"' + (o.bare ? "" : ' data-mood="' + mood(m) + '"') + ">" +
      '<g class="m-steps"><rect x="16" y="106" width="88" height="10" rx="3"/><rect x="28" y="98" width="64" height="9" rx="3"/><rect x="40" y="90" width="40" height="9" rx="3"/></g>' +
      '<g class="m-all"><g class="m-tail"><g transform="rotate(25 86 72)"><ellipse' + F + ' cx="86" cy="72" rx="9" ry="20"/>' +
      '<path class="mt" d="M78.8 60A9 20 0 0 1 93.2 60Z"/><path class="ms" d="M81 66h10M79.5 72h13M78.5 78h15"/></g></g>' +
      "<rect" + F + ' x="46" y="60" width="28" height="30" rx="10"/><rect' + C + ' x="52" y="68" width="16" height="19" rx="7"/>' +
      "<rect" + D + ' x="49" y="86" width="9" height="5" rx="2.5"/><rect' + D + ' x="62" y="86" width="9" height="5" rx="2.5"/>' +
      '<rect class="mf m-armL" x="40" y="66" width="8" height="19" rx="4"/><rect class="mf m-armR" x="72" y="66" width="8" height="19" rx="4"/>' +
      '<g class="m-head"><polygon class="mo" points="42,34 43,17 57,30"/><polygon class="mo" points="78,34 77,17 63,30"/>' +
      '<polygon class="mi" points="46,31 46,23 53,29"/><polygon class="mi" points="74,31 74,23 67,29"/>' +
      "<rect" + F + ' x="40" y="28" width="40" height="35" rx="12"/>' +
      "<path" + C + ' d="M44 50Q60 44 76 50V53Q76 63 66 63H54Q44 63 44 53Z"/><ellipse' + D + ' cx="60" cy="52" rx="3.2" ry="2.4"/>' +
      '<g class="m-eyes"><circle' + D + ' cx="51" cy="43" r="2.6"/><circle' + D + ' cx="69" cy="43" r="2.6"/></g>' +
      '<path class="ml m-happy" d="M48.5 44Q51 40.5 53.5 44M66.5 44Q69 40.5 71.5 44"/><path class="ml m-brows" d="M47 38L54 40M73 38L66 40"/>' +
      '<path class="ml m-smile" d="M55 57Q60 61 65 57"/><path class="ml m-flat" d="M55 59Q60 56 65 59"/>' +
      '<path class="md m-open" d="M55.5 56Q60 64 64.5 56Z"/></g>' +
      '<rect class="m-scarf" x="44" y="61" width="32" height="8" rx="4"/><rect class="m-scarf" x="67" y="65" width="8" height="16" rx="3"/></g></svg>';
  }

  /* cau thoai (ham thuan, tat dinh khi tiem rnd) */
  function pick(a, rnd) {
    var r = typeof rnd === "function" ? Number(rnd()) : Math.random();
    if (!isFinite(r) || r < 0) r = 0;
    if (r >= 1) r = 0.999999;
    return a[Math.floor(r * a.length)];
  }
  var GREET = [
    "Chào bạn! Hôm nay mình học một chút nhé?",
    "Xin chào! Mỗi bước nhỏ đều đáng giá đấy.",
    "Chào mừng quay lại! Sẵn sàng cho vài phút học chưa?",
    "Mình là Bước. Cùng đi từng bậc một nhé!",
    "Rất vui được gặp lại bạn!"
  ];
  var GREET_DONE = ["Hôm nay bạn đã học rồi, tuyệt! Học thêm hay nghỉ đều ổn.", "Hôm nay bạn đã có một bước rồi. Giỏi lắm!"];
  var GREET_NEW = ["Chào bạn mới! Mình là Bước, mình đi cùng bạn nhé."];
  var RISK = [
    function (n) { return "Chuỗi " + n + " ngày vẫn đang chờ bạn. Vài phút là đủ nhé."; },
    function (n) { return "Mình nhớ chuỗi " + n + " ngày của bạn. Một thẻ nhỏ cũng được!"; },
    function (n) { return "Chưa học hôm nay cũng không sao. Một bước nhỏ giữ chuỗi " + n + " ngày."; },
    function (n) { return "Chuỗi " + n + " ngày đang đợi, không vội đâu. Sẵn sàng thì mình đi nhé."; }
  ];
  var GOAL = ["Đạt mục tiêu hôm nay rồi! Bạn giỏi quá!", "Đủ XP hôm nay rồi. Nghỉ ngơi cũng là một bước đấy!", "Mục tiêu xong! Mình tự hào về bạn."];
  var DONE = [
    "Ôn xong rồi, bạn làm tốt lắm!",
    "Phiên ôn kết thúc. Mỗi lần ôn là một bậc vững hơn.",
    "Giỏi lắm! Các thẻ này sẽ quay lại đúng lúc."
  ];
  /* streak-risk chi khi chuoi >= 2 va hom nay chua hoc; nguoc lai tra loi chao (khong nhac chuoi) */
  function pickLine(kind, st, rnd) {
    st = st && typeof st === "object" ? st : {};
    if (kind === "streak-risk" && Number(st.streak) >= 2 && !st.studiedToday) return pick(RISK, rnd)(Math.floor(Number(st.streak)));
    if (kind === "goal") return pick(GOAL, rnd);
    if (kind === "review-done") return pick(DONE, rnd);
    var pool = GREET;
    if (st.studiedToday) pool = pool.concat(GREET_DONE);
    else if (!(Number(st.total) > 0)) pool = pool.concat(GREET_NEW);
    return pick(pool, rnd);
  }

  function enabled() { return BS.pref("mascot") !== 0; }
  function setEnabled(b) { BS.setPref("mascot", b ? 1 : 0); }

  var insts = [], face = null, faceTimer = null, wasOn = null;

  function draw(it) {
    var h = it.host;
    if (!enabled()) { h.innerHTML = ""; h.hidden = true; return; }
    h.hidden = false;
    h.innerHTML = svg(it.mood, { mini: it.variant === "mini", bare: true }) +
      (it.text && it.variant !== "mini" ? '<p class="mascot-say">' + esc(it.text) + "</p>" : "");
    h.setAttribute("data-mood", it.mood);
  }

  function mount(host, o) {
    var noop = { set: function () {}, say: function () {}, destroy: function () {} };
    if (!host) return noop;
    o = o || {};
    insts = insts.filter(function (x) { return x.host !== host; });
    var it = { host: host, variant: o.variant === "mini" || o.variant === "inline" ? o.variant : "hero", mood: mood(o.mood), text: "", timer: null, dead: false };
    try { host.classList.add("mascot-host", "mascot-" + it.variant); } catch (e) { /* bo qua */ }
    insts.push(it);
    draw(it);
    return {
      set: function (m) {
        if (it.dead) return;
        it.mood = mood(m);
        if (enabled()) host.setAttribute("data-mood", it.mood);
      },
      say: function (t) {
        if (it.dead) return;
        it.text = String(t === null || t === undefined ? "" : t);
        draw(it);
      },
      destroy: function () {
        it.dead = true;
        if (it.timer) clearTimeout(it.timer);
        insts = insts.filter(function (x) { return x !== it; });
        host.innerHTML = "";
      }
    };
  }

  function faceMood(m, ms) {
    if (faceTimer) { clearTimeout(faceTimer); faceTimer = null; }
    if (!face) return;
    face.setAttribute("data-mood", m);
    if (ms) faceTimer = setTimeout(function () { faceTimer = null; face.setAttribute("data-mood", "idle"); }, ms);
  }

  function react(kind) {
    if (!enabled()) return;
    if (kind === "goal") {
      faceMood("cheer", 2500);
      insts.forEach(function (it) {
        if (it.variant !== "hero" || it.dead) return;
        it.mood = "cheer"; it.text = pickLine("goal", BS.stats()); draw(it);
        if (it.timer) clearTimeout(it.timer);
        it.timer = setTimeout(function () { it.timer = null; it.mood = "idle"; if (enabled()) it.host.setAttribute("data-mood", "idle"); }, 2500);
      });
    } else if (kind === "review-done") faceMood("proud", 2500);
  }

  function hudButton() {
    var hud = DOC && DOC.getElementById("hud");
    if (!hud || (hud.querySelector && hud.querySelector(".hud-mascot"))) return;
    face = BS.el("span", { class: "hud-mascot-face", "aria-hidden": "true" });
    var b = BS.el("button", { type: "button", class: "btn hud-btn hud-mascot", "aria-pressed": "false", "aria-label": "Linh vật Bước" },
      [face, BS.el("span", { class: "hud-mascot-tx", text: " Bước" })]);
    function sync() { b.setAttribute("aria-pressed", enabled() ? "true" : "false"); }
    b.addEventListener("click", function () { setEnabled(!enabled()); });
    face.innerHTML = svg("idle", { mini: true, bare: true });
    face.setAttribute("data-mood", "idle");
    sync();
    hud.appendChild(b);
    document.addEventListener("bs:pref", sync);
  }

  BS.mascot = { svg: svg, pickLine: pickLine, mount: mount, react: react, enabled: enabled, setEnabled: setEnabled };

  if (DOC) {
    wasOn = enabled();
    document.addEventListener("bs:pref", function () {
      var on = enabled();
      if (on === wasOn) return;
      wasOn = on;
      insts.forEach(draw);
    });
    document.addEventListener("bs:xp", function (e) { if (e && e.detail && e.detail.hit) react("goal"); });
    if (DOC.readyState === "loading") DOC.addEventListener("DOMContentLoaded", hudButton);
    else hudButton();
  }
})();
