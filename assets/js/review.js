/* review.js - trang on tap: gom the den han cua moi unit, phien toi da 20 the. Khong goi mang. */
(function () {
  "use strict";
  var BS = window.BS;
  if (!BS || !BS.srs) return;
  var el = BS.el;
  var SESSION = 20;
  var app = document.getElementById("review-app");
  if (!app) return;

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  var failedUnits = [];   /* uid nap that bai */
  var allUnits = {};      /* uid -> unit da nap */
  var session = null;     /* {queue, total, done, ok, forgot:{}, remembered:{}, flipped, busy} */
  var live = el("p", { class: "review-live", role: "status", "aria-live": "polite" });

  function deckOf(u) {
    var d = [];
    (u.vocab || []).forEach(function (w) { d.push({ id: w.id, en: w.en, vi: w.vi }); });
    (u.phrases || []).forEach(function (p) { d.push({ id: p.id, en: p.en, vi: p.vi }); });
    return d;
  }

  /* gom the den han cua moi unit da nap, sap xep chung */
  function collectDue() {
    var items = [];
    Object.keys(allUnits).forEach(function (uid) {
      var u = allUnits[uid];
      if (!u) return;
      var deck = deckOf(u), map = {};
      deck.forEach(function (w) { map[w.id] = w; });
      BS.srs.due(uid, deck.map(function (w) { return w.id; })).forEach(function (it) {
        it.card = map[it.id];
        items.push(it);
      });
    });
    items.sort(BS.srs.compare);
    return items;
  }

  function clear() { app.textContent = ""; }

  /* unit nap loi nhung state van co the da hoc / co srs */
  function failedWithCards() {
    return failedUnits.filter(function (uid) {
      var u = BS.state.units && BS.state.units[uid];
      if (!u) return false;
      return Object.keys(u.known || {}).length > 0 || Object.keys(u.srs || {}).length > 0;
    });
  }

  function showEmpty() {
    clear();
    var s = BS.srs.summary();
    var box = el("section", { class: "card review-empty" });
    var nt = BS.srs.nextText(s), msg;
    if (failedWithCards().length) {
      box.appendChild(el("h2", { text: "Chưa tải được dữ liệu bài học" }));
      msg = "Chưa tải được dữ liệu bài học (có thể đang offline). Hãy kết nối mạng rồi thử lại.";
      box.appendChild(el("p", { text: msg }));
      var row = el("div", { class: "row" }, [
        el("button", { type: "button", class: "btn btn-primary", text: "Thử lại", onclick: init }),
        el("a", { class: "btn", href: "index.html", text: "Về trang chủ" })
      ]);
      box.appendChild(row);
      app.appendChild(box);
      return;
    }
    if (nt) {
      box.appendChild(el("h2", { text: "Chưa có thẻ nào đến hạn" }));
      msg = "Bạn đã ôn xong rồi, giỏi lắm! Lần ôn tiếp theo: " + nt + ".";
    } else {
      box.appendChild(el("h2", { text: "Chưa có thẻ để ôn" }));
      msg = "Bạn chưa học thẻ từ vựng nào. Hãy học từ vựng trong các unit để có thẻ ôn lại.";
    }
    box.appendChild(el("p", { text: msg }));
    box.appendChild(el("a", { class: "btn btn-primary", href: "index.html", text: "Về trang chủ" }));
    app.appendChild(box);
  }

  function startSession() {
    var items = collectDue();
    if (!items.length) { showEmpty(); return; }
    var q = items.slice(0, SESSION);
    session = { queue: q, total: q.length, done: 0, ok: 0, forgot: {}, flipped: false, busy: false, left: items.length - q.length };
    drawCard(true);
  }

  var refs = null;
  function drawCard(first) {
    var s = session;
    if (!s.queue.length) { showEnd(); return; }
    var it = s.queue[0];
    if (!refs || !refs.root.parentNode) buildShell();
    var w = it.card;
    var c = refs.card;
    c.textContent = "";
    c.className = "flash flash-swipe review-card-face" + (s.flipped ? " is-back" : "");
    if (!s.flipped) c.appendChild(el("p", { class: "flash-main", lang: "en", text: w.en || "" }));
    else {
      if (w.vi) {
        c.appendChild(el("p", { class: "flash-main", text: w.vi }));
        c.appendChild(el("p", { class: "muted", lang: "en", text: w.en || "" }));
      } else c.appendChild(el("p", { class: "flash-main", lang: "en", text: w.en || "" }));
    }
    var pos = Math.min(s.done + 1, s.total);
    refs.count.textContent = "Thẻ " + pos + "/" + s.total;
    refs.bar.style.width = Math.round(s.done * 100 / s.total) + "%";
    var face = s.flipped ? "Mặt sau: " + (w.vi || "") + (w.vi ? ", tiếng Anh: " : "") + (w.en || "") : "Mặt trước: " + (w.en || "");
    c.setAttribute("aria-label", face);
    refs.flip.textContent = s.flipped ? "Lật về mặt trước" : "Lật thẻ";
    live.textContent = s.flipped ? "Mặt sau: " + (w.vi || w.en || "") : "Thẻ " + pos + "/" + s.total + ": " + (w.en || "");
    if (first) { try { c.focus(); } catch (e) { /* bo qua */ } }
    if (!s.flipped && BS.pref("autoSpeak") !== 0 && w.en) BS.speak(w.en, 0.9);
  }

  function buildShell() {
    clear();
    var count = el("p", { class: "review-count muted" });
    var fill = el("div", { class: "bar-fill" });
    var bar = el("div", { class: "bar review-bar", role: "presentation" }, [fill]);
    var card = el("div", { class: "flash flash-swipe review-card-face", role: "button", tabindex: "0" });
    var flip = el("button", { type: "button", class: "btn btn-primary", text: "Lật thẻ" });
    var no = el("button", { type: "button", class: "btn btn-review" }, ["Chưa nhớ ", el("span", { "aria-hidden": "true", text: "✗" })]);
    var yes = el("button", { type: "button", class: "btn btn-known" }, ["Nhớ rồi ", el("span", { "aria-hidden": "true", text: "✓" })]);
    var listen = el("button", { type: "button", class: "btn", "aria-label": "Nghe phát âm" }, [el("span", { "aria-hidden": "true", text: "🔊" }), " Nghe"]);
    var hint = el("p", { class: "muted flash-hint", text: "Phím: Space/Enter lật thẻ, mũi tên phải = nhớ rồi, mũi tên trái = chưa nhớ." });
    var root = el("section", { class: "review-session", "aria-label": "Phiên ôn tập" }, [
      count, bar, el("div", { class: "flash-wrap" }, [card]),
      el("div", { class: "row review-actions" }, [no, flip, yes]),
      el("div", { class: "row" }, [listen]),
      hint, live
    ]);
    app.appendChild(root);
    refs = { root: root, card: card, count: count, bar: fill, flip: flip };
    function toggle() { if (session.busy) return; session.flipped = !session.flipped; drawCard(false); }
    card.addEventListener("click", toggle);
    flip.addEventListener("click", toggle);
    no.addEventListener("click", function () { answer(false); });
    yes.addEventListener("click", function () { answer(true); });
    listen.addEventListener("click", function () {
      var it = session && session.queue[0];
      if (it && it.card.en) BS.speak(it.card.en, 0.9);
    });
  }

  function answer(ok) {
    var s = session;
    if (!s || s.busy || !s.queue.length) return;
    var it = s.queue.shift();
    BS.srs.review(it.uid, it.id, ok);
    if (ok) { s.done++; if (!s.forgot[it.uid + ":" + it.id]) s.ok++; }
    else { s.forgot[it.uid + ":" + it.id] = 1; s.queue.push(it); }
    s.flipped = false;
    var next = function () { s.busy = false; if (refs) refs.card.style.opacity = ""; drawCard(false); };
    if (reducedMotion() || !refs) { next(); return; }
    s.busy = true;
    refs.card.style.transition = "opacity .12s ease";
    refs.card.style.opacity = "0";
    setTimeout(next, 120);
  }

  function showEnd() {
    var s = session;
    BS.stopSpeak();
    refs = null;
    clear();
    var forgotN = Object.keys(s.forgot).length;
    var sum = BS.srs.summary();
    var box = el("section", { class: "card review-end", "aria-label": "Kết quả phiên ôn" });
    box.appendChild(el("h2", { text: "Xong phiên ôn!" }));
    box.appendChild(el("p", { class: "review-result", text: "Nhớ ngay: " + s.ok + " thẻ. Cần ôn thêm: " + forgotN + " thẻ." }));
    var nt = BS.srs.nextText(sum);
    var lines = [];
    if (sum.due > 0) lines.push("Còn " + sum.due + " thẻ đến hạn hôm nay.");
    if (nt) lines.push("Lần ôn tiếp theo: " + nt + ".");
    if (!lines.length) lines.push("Hôm nay bạn không còn thẻ nào đến hạn.");
    box.appendChild(el("p", { text: lines.join(" ") }));
    var row = el("div", { class: "row" });
    if (sum.due > 0) row.appendChild(el("button", { type: "button", class: "btn btn-primary", text: "Ôn tiếp", onclick: startSession }));
    row.appendChild(el("a", { class: "btn" + (sum.due > 0 ? "" : " btn-primary"), href: "index.html", text: "Về trang chủ" }));
    box.appendChild(row);
    app.appendChild(box);
    session = null;
    var b = box.querySelector("button, a");
    if (b) { try { b.focus(); } catch (e) { /* bo qua */ } }
  }

  document.addEventListener("keydown", function (e) {
    if (!session || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (e.key === "ArrowRight") { e.preventDefault(); answer(true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); answer(false); }
    else if (e.key === " " || e.key === "Spacebar" || e.key === "Enter") {
      if (tag === "BUTTON" || tag === "A" || tag === "INPUT") return;
      e.preventDefault();
      if (!session.busy) { session.flipped = !session.flipped; drawCard(false); }
    }
  });

  function init() {
    var ids = BS.availableUnits().map(function (u) { return u.id; });
    BS.loadUnits(ids, function (map) {
      failedUnits = [];
      Object.keys(map).forEach(function (k) { if (map[k]) allUnits[k] = map[k]; else failedUnits.push(k); });
      startSession();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
