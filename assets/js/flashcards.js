/* flashcards.js - tab Tu vung: the vuot (phai = Thuoc, trai = On lai), cham de lat, ban phim, XP */
(function () {
  "use strict";
  var BS = window.BS, el = BS.el;
  BS.render = BS.render || {};

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  BS.render.vocab = function (u, root) {
    var st = BS.unit(u.id);
    var deck = (u.vocab || []).map(function (w) { return w; });
    (u.phrases || []).forEach(function (p) { deck.push({ id: p.id, en: p.en, vi: p.vi, group: "phrases", v: p.v }); });
    root.appendChild(el("h2", { text: "Từ vựng (" + deck.length + ")" }));
    if (!deck.length) { root.appendChild(el("p", { text: "Chưa có từ vựng." })); return; }

    var onlyNew = false, idx = 0, flipped = false, finished = false, busy = false;
    var voiceOk = true;

    var info = el("p", { class: "muted", "aria-live": "polite" });
    var hint = el("p", { class: "muted flash-hint", text: "Chạm thẻ để lật. Vuốt phải = đã thuộc, vuốt trái = ôn lại (hoặc phím mũi tên phải / trái)." });
    var card = el("div", { class: "flash flash-swipe", role: "button", tabindex: "0" });
    var wrap = el("div", { class: "flash-wrap" }, [card]);
    var summary = el("div", { class: "card flash-summary", hidden: true });

    var reviewBtn = el("button", { type: "button", class: "btn btn-review" }, [el("span", { "aria-hidden": "true", text: "↺" }), " Ôn lại"]);
    var flipBtn = el("button", { type: "button", class: "btn btn-primary", text: "Lật thẻ" });
    var knownBtn = el("button", { type: "button", class: "btn btn-known" }, ["Thuộc ", el("span", { "aria-hidden": "true", text: "✓" })]);
    var listenBtn = el("button", { type: "button", class: "btn" }, [el("span", { "aria-hidden": "true", text: "🔊" }), " Nghe"]);
    var prev = el("button", { type: "button", class: "btn", text: "Thẻ trước" });
    var next = el("button", { type: "button", class: "btn", text: "Thẻ sau" });
    var filter = el("button", { type: "button", class: "btn", "aria-pressed": "false", text: "Chỉ hiện thẻ chưa thuộc" });
    var autoBtn = el("button", { type: "button", class: "btn", "aria-pressed": "false" });
    var notice = el("div", { class: "notice", role: "status", hidden: true });

    function list() { return deck.filter(function (w) { return !onlyNew || !st.known[w.id]; }); }
    function knownCount() { return deck.filter(function (w) { return st.known[w.id]; }).length; }
    function cur() { var l = list(); return l[idx] || null; }

    function drawAuto() {
      var on = BS.pref("autoSpeak") !== 0;
      autoBtn.setAttribute("aria-pressed", on ? "true" : "false");
      autoBtn.textContent = on ? "Tự đọc: Bật" : "Tự đọc: Tắt";
    }

    function resetCardVisual() {
      card.style.transition = "";
      card.style.transform = "";
      card.classList.remove("is-drag-right", "is-drag-left", "is-dragging");
    }

    function setDisabled(d) {
      reviewBtn.disabled = flipBtn.disabled = knownBtn.disabled = listenBtn.disabled = d;
      prev.disabled = next.disabled = d || list().length < 2;
    }

    function drawSummary() {
      var kc = knownCount();
      summary.textContent = "";
      summary.appendChild(el("h3", { text: "Hết bộ thẻ" }));
      summary.appendChild(el("p", { text: "Bạn đã thuộc " + kc + "/" + deck.length + " thẻ." }));
      var row = el("div", { class: "row" });
      if (kc < deck.length) {
        row.appendChild(el("button", { type: "button", class: "btn btn-primary", text: "Ôn thẻ chưa thuộc", onclick: function () {
          if (busy) return;
          onlyNew = true; idx = 0; flipped = false; finished = false;
          filter.setAttribute("aria-pressed", "true"); draw(); card.focus();
        } }));
      }
      row.appendChild(el("button", { type: "button", class: "btn", text: "Học lại từ đầu", onclick: function () {
        if (busy) return;
        onlyNew = false; idx = 0; flipped = false; finished = false;
        filter.setAttribute("aria-pressed", "false"); draw(); card.focus();
      } }));
      summary.appendChild(row);
      var fb = row.querySelector("button");
      if (fb) fb.focus();
    }

    function draw() {
      resetCardVisual();
      summary.hidden = !finished;
      wrap.hidden = finished;
      hint.hidden = finished;
      var l = list();
      if (finished) {
        drawSummary();
        info.textContent = "Đã thuộc " + knownCount() + "/" + deck.length;
        setDisabled(true);
        return;
      }
      if (!l.length) {
        card.textContent = "";
        card.removeAttribute("aria-label");
        card.setAttribute("aria-disabled", "true");
        card.appendChild(el("p", { text: onlyNew ? "Bạn đã thuộc tất cả thẻ." : "Không có thẻ." }));
        info.textContent = "Đã thuộc " + knownCount() + "/" + deck.length;
        setDisabled(true);
        return;
      }
      card.removeAttribute("aria-disabled");
      setDisabled(false);
      if (idx >= l.length) idx = 0;
      if (idx < 0) idx = l.length - 1;
      var w = l[idx];
      var k = !!st.known[w.id];
      card.textContent = "";
      card.className = "flash flash-swipe" + (flipped ? " is-back" : "") + (k ? " is-known" : "");
      var viTxt = w.vi || (BS.isEdit() ? "Chưa có bản dịch" : "");
      if (!flipped) card.appendChild(el("p", { class: "flash-main", lang: "en", text: w.en || "" }));
      else if (viTxt) {
        card.appendChild(el("p", { class: "flash-main", text: viTxt }));
        card.appendChild(el("p", { class: "muted", lang: "en", text: w.en || "" }));
      } else card.appendChild(el("p", { class: "flash-main", lang: "en", text: w.en || "" }));
      var meta = el("p", { class: "flash-meta" }, [BS.badgeUnverified(w.v)]);
      if (k) meta.appendChild(el("span", { class: "badge badge-ok", text: "Đã thuộc" }));
      card.appendChild(meta);
      var face = flipped ? "Mặt sau: " + (viTxt || "") + (viTxt ? ", tiếng Anh: " : "") + (w.en || "") : "Mặt trước: " + (w.en || "");
      card.setAttribute("aria-label", "Thẻ " + (idx + 1) + " trên " + l.length + (k ? ", đã thuộc" : "") + ". " + face +
        ". Nhấn Enter hoặc Space để lật, mũi tên phải là đã thuộc, mũi tên trái là ôn lại.");
      info.textContent = "Thẻ " + (idx + 1) + "/" + l.length + " - Đã thuộc " + knownCount() + "/" + deck.length;
      flipBtn.textContent = flipped ? "Lật về mặt trước" : "Lật thẻ";
      st.last.card = w.id;
    }

    function speakCur() {
      var w = cur();
      if (w && w.en) BS.speak(w.en, 0.9);
    }
    function autoSpeak() {
      if (BS.pref("autoSpeak") !== 0 && voiceOk && !root.closest("[hidden]")) speakCur();
    }

    /* chuyen the; doSpeak = tu doc mat EN cua the moi */
    function move(delta) {
      if (busy) return;
      var l = list();
      if (!l.length) return;
      idx += delta; flipped = false;
      if (idx >= l.length) idx = 0;
      if (idx < 0) idx = l.length - 1;
      draw(); BS.save(); autoSpeak();
    }
    function advance(removed) {
      /* removed = the vua roi khoi danh sach (dang loc chua thuoc va vua danh dau thuoc) */
      var l = list();
      if (!removed) idx++;
      flipped = false;
      if (idx >= l.length) { finished = true; BS.stopSpeak(); }
      draw(); BS.save();
      if (!finished) autoSpeak();
    }

    /* ghi trang thai + XP NGAY khi nguoi dung thao tac; BS.addXP tu save */
    function applyMark(dir) {
      var w = cur();
      if (!w || finished) return false;
      if (dir > 0) {
        st.known[w.id] = 1;
        BS.addXP(5, { once: u.id + ":k:" + w.id });
      } else {
        delete st.known[w.id];
        BS.addXP(1, { once: u.id + ":r:" + w.id + ":" + BS.dayKey(), rep: true });
      }
      BS.save();
      return true;
    }

    function commit(dir) {
      if (busy) return;
      var removed = dir > 0 && onlyNew;
      if (!applyMark(dir)) return;
      if (reducedMotion()) { advance(removed); return; }
      busy = true;
      card.style.transition = "transform .16s ease, opacity .16s ease";
      card.style.transform = "translateX(" + (dir > 0 ? 120 : -120) + "%)";
      card.style.opacity = "0";
      setTimeout(function () { card.style.opacity = ""; busy = false; advance(removed); }, 160);
    }

    /* ---- vuot / cham bang Pointer Events ---- */
    var drag = null;
    card.addEventListener("pointerdown", function (e) {
      if (busy || finished || (e.pointerType === "mouse" && e.button !== 0)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, moved: false };
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* bo qua */ }
    });
    card.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.dx = dx;
      if (!drag.moved && Math.abs(dx) >= 10 && Math.abs(dx) > Math.abs(dy)) drag.moved = true;
      if (!drag.moved) return;
      card.classList.add("is-dragging");
      card.classList.toggle("is-drag-right", dx > 0);
      card.classList.toggle("is-drag-left", dx < 0);
      if (!reducedMotion()) card.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 40) + "deg)";
    });
    function endDrag(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      try { card.releasePointerCapture(e.pointerId); } catch (err) { /* bo qua */ }
      if (cancelled) { resetCardVisual(); return; }
      var dy = e.clientY - d.y;
      var thr = Math.min(80, card.getBoundingClientRect().width * 0.25);
      if (d.moved && Math.abs(d.dx) > thr && Math.abs(d.dx) > Math.abs(dy)) { commit(d.dx > 0 ? 1 : -1); return; }
      resetCardVisual();
      if (!d.moved && Math.abs(e.clientX - d.x) < 10 && Math.abs(dy) < 10) { flipped = !flipped; draw(); }
    }
    card.addEventListener("pointerup", function (e) { endDrag(e, false); });
    card.addEventListener("pointercancel", function (e) { endDrag(e, true); });
    card.addEventListener("keydown", function (e) {
      if (finished || busy) return;
      if (e.key === "ArrowRight") { e.preventDefault(); commit(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); commit(-1); }
      else if (e.key === " " || e.key === "Spacebar" || e.key === "Enter") { e.preventDefault(); flipped = !flipped; draw(); }
    });

    flipBtn.addEventListener("click", function () { if (busy) return; flipped = !flipped; draw(); });
    knownBtn.addEventListener("click", function () { commit(1); });
    reviewBtn.addEventListener("click", function () { commit(-1); });
    listenBtn.addEventListener("click", speakCur);
    next.addEventListener("click", function () { move(1); });
    prev.addEventListener("click", function () { move(-1); });
    filter.addEventListener("click", function () {
      if (busy) return;
      onlyNew = !onlyNew; idx = 0; flipped = false; finished = false;
      filter.setAttribute("aria-pressed", onlyNew ? "true" : "false");
      draw();
    });
    autoBtn.addEventListener("click", function () { BS.setPref("autoSpeak", BS.pref("autoSpeak") !== 0 ? 0 : 1); drawAuto(); });

    BS.onVoices(function (ok) {
      voiceOk = ok;
      notice.hidden = ok;
      notice.textContent = ok ? "" : "Thiết bị này không có giọng đọc tiếng Anh nên không nghe được âm thanh. Bạn vẫn học bằng chữ bình thường.";
      listenBtn.setAttribute("aria-disabled", ok ? "false" : "true");
    });

    root.appendChild(info);
    root.appendChild(notice);
    root.appendChild(wrap);
    root.appendChild(summary);
    root.appendChild(hint);
    root.appendChild(el("div", { class: "row flash-actions" }, [reviewBtn, flipBtn, knownBtn]));
    root.appendChild(el("div", { class: "row" }, [listenBtn, prev, next]));
    root.appendChild(el("div", { class: "row" }, [filter, autoBtn]));

    var last = deck.findIndex(function (w) { return w.id === st.last.card; });
    if (last > 0) idx = last;
    drawAuto();
    draw();

    var det = el("details", { class: "flash-list" }, [el("summary", { text: "Danh sách từ (" + deck.length + ")" })]);
    var ul = el("ul", { class: "list card" });
    deck.forEach(function (w) {
      var vi = w.vi || (BS.isEdit() ? "Chưa có bản dịch" : "");
      ul.appendChild(el("li", {}, [
        el("strong", { lang: "en", text: w.en || "" }), vi ? " - " + vi : "", " ", BS.badgeUnverified(w.v)
      ]));
    });
    det.appendChild(ul);
    root.appendChild(det);
  };
})();
