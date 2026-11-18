/* srs.js - on tap thong minh (lap lai ngat quang, 6 hop). Khong goi mang, khong theo doi.
 * Luu tai BS.state.units[uid].srs[idThe] = { b: hop 0..5, d: han "YYYY-MM-DD", l: lan on cuoi, w: so lan quen, n: so lan on }.
 * Du lieu cu: the da thuoc (known) ma chua co srs duoc coi AO la hop 1, han rai trong 3 ngay (khong ghi khi chi doc).
 * The chua hoc (khong known, khong srs) khong bao gio den han.
 * API: BS.srs.get / grade / review / due / dueCount / summary / nextLabel / compare / INTERVALS.
 * XP khong doi luat: moi the on = addXP(1, {once: uid:r:id:ngay, rep:true}); "Nho" tren the chua known = known + addXP(5, {once: uid:k:id}). */
(function () {
  "use strict";
  var W = typeof window !== "undefined" ? window : null;
  var BS = W && W.BS;
  if (!BS || BS.srs) return;

  var INTERVALS = [0, 1, 3, 7, 14, 30];
  var MAX_BOX = 5;
  var LEGACY_ANCHOR = "2026-11-18"; /* ngay phat hanh SRS: moc cho the known cu chua co srs */
  var DAY_RE = /^\d{4}-\d\d-\d\d$/;

  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function today() { return BS.dayKey(); }

  /* so ngay (kieu so) tu khoa YYYY-MM-DD, doc lap mui gio */
  function dayNum(k) {
    var p = String(k).split("-");
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function addDays(k, n) {
    var p = String(k).split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function hash(s) {
    var h = 5381;
    s = String(s);
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h;
  }
  function validDay(k) { return typeof k === "string" && DAY_RE.test(k); }

  function rawUnit(uid) {
    var u = BS.state && BS.state.units && BS.state.units[uid];
    return isObj(u) ? u : null;
  }

  /* muc ghi that (khong tao moi) hoac null */
  function stored(uid, id) {
    var u = rawUnit(uid);
    if (!u || !isObj(u.srs)) return null;
    var e = u.srs[id];
    if (!isObj(e)) return null;
    return e;
  }

  /* tra ve ban sao da lam sach: {b,d,l,w,n,virtual}; null neu the chua hoc. KHONG ghi state. */
  function get(uid, id, day) {
    var t = day || today();
    var e = stored(uid, id);
    if (e) {
      var b = Math.max(0, Math.min(MAX_BOX, Math.floor(Number(e.b)) || 0));
      var l = validDay(e.l) ? e.l : "";
      if (l && l > t) l = t; /* dong ho lui */
      var d = validDay(e.d) ? e.d : t;
      return { b: b, d: d, l: l, w: Math.max(0, Math.floor(Number(e.w)) || 0), n: Math.max(0, Math.floor(Number(e.n)) || 0), virtual: false };
    }
    var u = rawUnit(uid);
    if (u && isObj(u.known) && u.known[id]) {
      /* neo vao ngay co dinh: rai 3 ngay, van den han (qua han dan) cho toi khi duoc on */
      return { b: 1, d: addDays(LEGACY_ANCHOR, hash(id) % 3), l: "", w: 0, n: 0, virtual: true };
    }
    return null;
  }

  /* cham mot the (ghi + save). ok = true nho, false quen. Tra ve muc moi. */
  function grade(uid, id, ok, day) {
    var t = day || today();
    var cur = get(uid, id, t) || { b: 0, d: t, l: "", w: 0, n: 0, virtual: false };
    var b = cur.b, w = cur.w;
    var d;
    if (ok && !cur.virtual && cur.n > 0 && cur.d > t) {
      /* chua den han (vd duyet bo the o tab Tu vung): khong len hop, chi dem so lan */
      var keep = { b: cur.b, d: cur.d, l: cur.l, w: cur.w, n: cur.n + 1 };
      BS.unit(uid).srs[id] = keep;
      BS.save();
      return { b: keep.b, d: keep.d, l: keep.l, w: keep.w, n: keep.n, virtual: false };
    }
    if (ok) {
      if (cur.l !== t) b = Math.min(MAX_BOX, b + 1);
      var days = Math.round(INTERVALS[b] * (w >= 3 ? 0.5 : 1));
      if (days < 1) days = 1;
      d = addDays(t, days);
    } else {
      w += 1; b = 0; d = t;
    }
    var entry = { b: b, d: d, l: t, w: w, n: cur.n + 1 };
    BS.unit(uid).srs[id] = entry;
    BS.save();
    return { b: b, d: d, l: t, w: w, n: entry.n, virtual: false };
  }

  /* cham + XP theo luat hien co. Dung cho trang on tap. */
  function review(uid, id, ok) {
    var t = today();
    var st = BS.unit(uid);
    var entry = grade(uid, id, ok, t);
    BS.addXP(1, { once: uid + ":r:" + id + ":" + t, rep: true });
    if (ok && !st.known[id]) {
      st.known[id] = 1;
      BS.addXP(5, { once: uid + ":k:" + id });
    }
    BS.save();
    return entry;
  }

  /* so ngay qua han (>=0) cua muc */
  function overdue(e, t) { return Math.max(0, dayNum(t) - dayNum(e.d)); }

  /* sap xep: qua han lau truoc, hop thap, quen nhieu */
  function compare(a, b) {
    return (b.over - a.over) || (a.b - b.b) || (b.w - a.w) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  /* danh sach the den han trong deckIds: [{uid,id,b,d,w,n,over}] da sap xep */
  function due(uid, deckIds, day) {
    var t = day || today();
    var out = [];
    (deckIds || []).forEach(function (id) {
      var e = get(uid, id, t);
      if (!e || e.d > t) return;
      out.push({ uid: uid, id: id, b: e.b, d: e.d, w: e.w, n: e.n, over: overdue(e, t) });
    });
    out.sort(compare);
    return out;
  }

  /* id the cua unit: unit da nap thi theo bo the that (loai id mo coi), chua nap thi theo khoa dang co */
  function deckIdsOf(uid) {
    var loaded = W.BS_UNITS && W.BS_UNITS[uid];
    if (loaded) {
      var ids = [];
      (loaded.vocab || []).forEach(function (w) { ids.push(w.id); });
      (loaded.phrases || []).forEach(function (w) { ids.push(w.id); });
      return ids;
    }
    var u = rawUnit(uid), seen = {}, res = [];
    if (!u) return res;
    [u.srs, u.known].forEach(function (m) {
      if (!isObj(m)) return;
      Object.keys(m).forEach(function (k) { if (!seen[k]) { seen[k] = 1; res.push(k); } });
    });
    return res;
  }

  /* tong hop: {due, next:{d,count}|null} tren moi unit trong state */
  function summary(day) {
    var t = day || today();
    var total = 0, nextD = "", nextC = 0;
    var allowed = null;
    try {
      if (typeof BS.availableUnits === "function") {
        allowed = {};
        BS.availableUnits().forEach(function (u) { allowed[u.id] = 1; });
      }
    } catch (e) { allowed = null; }
    Object.keys((BS.state && BS.state.units) || {}).forEach(function (uid) {
      if (allowed && !allowed[uid]) return;
      deckIdsOf(uid).forEach(function (id) {
        var e = get(uid, id, t);
        if (!e) return;
        if (e.d <= t) { total++; return; }
        if (!nextD || e.d < nextD) { nextD = e.d; nextC = 1; } else if (e.d === nextD) nextC++;
      });
    });
    return { due: total, next: nextD ? { d: nextD, count: nextC } : null };
  }
  function dueCount(day) { return summary(day).due; }

  function dateVi(k) {
    var p = String(k).split("-");
    return p[2] + "/" + p[1];
  }
  function nextLabel(e, day) {
    if (!e) return "";
    var t = day || today();
    if (e.d <= t) return "Đến hạn ôn";
    var n = dayNum(e.d) - dayNum(t);
    return n === 1 ? "Ôn lại ngày mai" : "Ôn lại sau " + n + " ngày";
  }
  function nextText(s, day) {
    if (!s || !s.next) return "";
    var t = day || today();
    var n = dayNum(s.next.d) - dayNum(t);
    var when = n === 1 ? "ngày mai" : n + " ngày nữa (" + dateVi(s.next.d) + ")";
    return when + ", " + s.next.count + " thẻ";
  }

  BS.srs = {
    INTERVALS: INTERVALS, get: get, grade: grade, review: review, due: due, dueCount: dueCount,
    summary: summary, nextLabel: nextLabel, nextText: nextText, compare: compare, deckIdsOf: deckIdsOf,
    addDays: addDays, dayNum: dayNum
  };

  /* ---------- widget trang chu ---------- */
  if (typeof document === "undefined") return;
  var el = BS.el;

  function ensureCss() {
    try {
      var links = document.getElementsByTagName("link");
      for (var i = 0; i < links.length; i++) {
        if ((links[i].getAttribute("href") || "").indexOf("assets/css/review.css") >= 0) return;
      }
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "assets/css/review.css";
      document.head.appendChild(l);
    } catch (e) { /* bo qua */ }
  }

  function drawWidget(root) {
    var s;
    try { s = summary(); } catch (e) { return; }
    root.textContent = "";
    var card = el("section", { class: "card review-card", "aria-label": "Ôn tập hôm nay" });
    card.appendChild(el("h2", { class: "review-h", text: "Ôn tập hôm nay" }));
    if (s.due > 0) {
      card.appendChild(el("p", { class: "review-line", text: s.due + " thẻ đến hạn" }));
      card.appendChild(el("a", { class: "btn btn-primary review-go", href: "review.html", text: "Ôn ngay" }));
    } else {
      var msg = "Hôm nay không có thẻ đến hạn.";
      var nt = nextText(s);
      if (nt) msg += " Lần tới: " + nt + ".";
      card.appendChild(el("p", { class: "review-line", text: msg }));
    }
    root.appendChild(card);
  }

  function initWidget() {
    var root = document.getElementById("review-root");
    if (!root) return;
    ensureCss();
    var redraw = function () { drawWidget(root); };
    redraw();
    document.addEventListener("bs:xp", redraw);
    document.addEventListener("bs:import", redraw);
    document.addEventListener("bs:units", redraw);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initWidget);
  else initWidget();
})();
