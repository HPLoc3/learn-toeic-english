/* quiz.js - tab Luyen nghe (BS.speak) va tab Bai tap (cham diem) */
(function () {
  "use strict";
  var BS = window.BS, el = BS.el;
  BS.render = BS.render || {};

  /* ---------- doc: BS.speak(text, {rate, accent}) ---------- */
  var SPEEDS = [
    { rate: 0.7, name: "Chậm", say: "chậm" },
    { rate: 0.9, name: "Vừa", say: "vừa" },
    { rate: 1.0, name: "Bình thường", say: "bình thường (tốc độ thi)" }
  ];
  function say(text, rate, accent) {
    var o = { rate: rate };
    if (accent) o.accent = accent;
    try { BS.speak(text, o); } catch (e) { /* bo qua */ }
  }
  function speedBtns(getText, what, getAccent) {
    return el("span", { class: "listen-btns", role: "group", "aria-label": "Nghe " + what }, SPEEDS.map(function (sp) {
      return el("button", { type: "button", class: "btn", "aria-label": "Nghe " + what + ", tốc độ " + sp.say + " " + sp.rate,
        text: sp.name + " " + sp.rate.toFixed(1),
        onclick: function () { say(getText(), sp.rate, getAccent ? getAccent() : null); } });
    }));
  }
  function listenBtns(getText, what) { return speedBtns(getText, what, null); }

  /* ---------- Luyen nghe ---------- */
  function fillSentence(it) {
    if (!it.answers || !it.answers.length) return null;
    return [it.before, it.answers[0], it.after].filter(Boolean).join(" ");
  }

  function collect(u) {
    var out = [];
    (u.sentences || []).forEach(function (s) { out.push({ sid: s.id, group: u.sentences_title_vi || "Luyện tập mô tả hành động trong hình", en: s.en, obj: s, v: s.v }); });
    (u.exercises || []).forEach(function (ex, exIdx) {
      (ex.items || []).forEach(function (it) {
        if (ex.type === "fill") { var t = fillSentence(it); if (t) out.push({ sid: it.id, group: "Điền chỗ trống (Bài " + (exIdx + 1) + ")", en: t, obj: null, v: it.v }); }
        else if (ex.type === "tf" && it.en) out.push({ sid: it.id, group: "Nghe và chọn đúng/sai (Bài " + (exIdx + 1) + ")", en: it.en, obj: null, v: it.v, label: it.label });
      });
    });
    return out;
  }

  /* so sanh tung tu (LCS): danh dau tu khop (keep) */
  function wordsOf(str) { return String(str || "").split(/\s+/).filter(function (w) { return w; }); }
  function diffWords(typed, answer) {
    var a = wordsOf(typed), b = wordsOf(answer);
    var na = a.map(BS.norm), nb = b.map(BS.norm);
    var L = [], i, j;
    for (i = 0; i <= a.length; i++) { L[i] = []; for (j = 0; j <= b.length; j++) L[i][j] = 0; }
    for (i = a.length - 1; i >= 0; i--) for (j = b.length - 1; j >= 0; j--)
      L[i][j] = na[i] === nb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var ka = a.map(function () { return false; }), kb = b.map(function () { return false; });
    i = 0; j = 0;
    while (i < a.length && j < b.length) {
      if (na[i] === nb[j]) { ka[i] = kb[j] = true; i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
    }
    return { a: a, ka: ka, b: b, kb: kb };
  }
  function markedLine(words, keep, cls, icon, srText) {
    var p = el("p", { class: "ls-words", lang: "en" });
    words.forEach(function (w, k) {
      if (k) p.appendChild(document.createTextNode(" "));
      if (keep[k]) p.appendChild(document.createTextNode(w));
      else p.appendChild(el("mark", { class: cls }, [el("span", { class: "ls-ic", "aria-hidden": "true", text: icon }), el("span", { class: "ls-sr", text: srText + " " }), w]));
    });
    return p;
  }

  BS.render.listen = function (u, root) {
    var st = BS.unit(u.id);
    root.appendChild(el("h2", { text: "Luyện nghe" }));
    var items = collect(u);
    var notice = el("div", { class: "notice", role: "status", hidden: true });
    var showBtn = el("button", { type: "button", class: "btn", hidden: true, text: "Hiện lời thoại câu này" });
    BS.onVoices(function (ok) {
      notice.hidden = ok; showBtn.hidden = ok;
      notice.textContent = ok ? "" : "Thiết bị này không có giọng đọc tiếng Anh (en-*). Bạn không nghe được âm thanh; hãy dùng nút \"Hiện lời thoại câu này\" để đọc chữ.";
    });

    root.appendChild(el("p", { text: "Nghe từng câu (chậm 0.7, vừa 0.9 hoặc bình thường 1.0 như đề thi), gõ lại điều bạn nghe được rồi bấm Nộp hoặc nhấn Enter để xem lời thoại. Nhấn Enter lần nữa để sang câu kế." }));
    root.appendChild(notice);
    if (!items.length) { root.appendChild(el("p", { text: "Chưa có câu để nghe." })); return; }

    var n = items.length;
    var shown = {}; /* i -> "g" (da nop, co luu) | "s" (chi hien chu, khong luu) */
    var cur = 0;
    /* khoa on dinh theo id cau; van doc khoa cu theo vi tri "ls:i" (ban truoc) */
    function key(i) { return items[i].sid ? "ls:" + items[i].sid : "ls:" + i; }
    function saved(i) {
      var a = st.ans[key(i)] || st.ans["ls:" + i];
      return a && typeof a === "object" && typeof a.t === "string" ? a : null;
    }
    items.forEach(function (it, i) { if (saved(i)) shown[i] = "g"; });
    while (cur < n && shown[cur] === "g") cur++;
    if (cur >= n) cur = n - 1;

    var label = el("p", { class: "ls-count", "aria-live": "polite" });
    var fill = el("div", { class: "bar-fill", style: "width:0%" });
    var bar = el("div", { class: "bar ls-bar", role: "progressbar", "aria-label": "Tiến độ luyện nghe", "aria-valuemin": "1", "aria-valuemax": String(n), "aria-valuenow": "1" }, [fill]);
    var groupH = el("h3", {});
    var input = el("input", { type: "text", class: "inp", id: "ls-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false", lang: "en", enterkeyhint: "done" });
    var result = el("div", { class: "reveal", "aria-live": "polite" });
    var submit = el("button", { type: "button", class: "btn btn-primary", text: "Nộp" });
    var prevB = el("button", { type: "button", class: "btn", text: "Trước" });
    var nextB = el("button", { type: "button", class: "btn", text: "Sau" });
    var speed = el("div", {});
    var redoB = el("button", { type: "button", class: "btn", hidden: true, text: "Làm lại câu này" });
    var card = el("div", { class: "card ls-card" });

    /* XP moi loai mot lan/cau; khoa on dinh theo id, van ton trong khoa cu theo vi tri */
    function award(i, kind, pts) {
      var once = (BS.state && BS.state.xp && BS.state.xp.once) || {};
      var sid = items[i].sid;
      if (once[u.id + ":" + kind + ":" + i] || (sid && once[u.id + ":" + kind + ":" + sid])) return;
      BS.addXP(pts, { once: u.id + ":" + kind + ":" + (sid || i) });
    }
    function reveal(i, mode) { /* mode: "g" nop (cong XP), "r" khoi phuc, "s" chi hien chu */
      var it = items[i];
      shown[i] = mode === "s" ? "s" : "g";
      result.textContent = "";
      result.appendChild(el("p", { class: "en", lang: "en" }, [(it.label ? it.label + ". " : "") + it.en, " ", BS.badgeUnverified(it.v)]));
      if (it.obj) { var vl = BS.viLine(it.obj); if (vl) result.appendChild(el("p", {}, [vl])); }
      var typed = input.value;
      var same = !!BS.norm(typed) && BS.norm(typed) === BS.norm(it.en);
      if (BS.norm(typed)) {
        if (same) result.appendChild(el("p", { class: "ok", text: "✓ Bạn gõ đúng." }));
        else {
          var d = diffWords(typed, it.en);
          result.appendChild(el("p", { class: "bad", text: "Chưa khớp. Từ sai hoặc thừa có dấu ✗ và gạch chân; từ bạn bỏ sót trong đáp án có dấu +." }));
          result.appendChild(el("p", { class: "label", text: "Bạn gõ:" }));
          result.appendChild(markedLine(d.a, d.ka, "ls-wrong", "✗", "(sai)"));
          result.appendChild(el("p", { class: "label", text: "Đáp án:" }));
          result.appendChild(markedLine(d.b, d.kb, "ls-miss", "+", "(bạn thiếu)"));
        }
      }
      if (mode === "g" && BS.norm(typed)) {
        if (same) award(i, "l", 5); else award(i, "ls", 1);
      }
      input.readOnly = true;
      submit.disabled = true;
      showBtn.disabled = true;
      redoB.hidden = false;
    }
    function doSubmit() {
      if (shown[cur]) return;
      if (!BS.norm(input.value)) {
        result.textContent = "";
        result.appendChild(el("p", { class: "bad", text: "Hãy gõ điều bạn nghe được trước khi nộp (hoặc dùng \"Hiện lời thoại câu này\" nếu chỉ muốn xem chữ)." }));
        input.focus();
        return;
      }
      st.ans[key(cur)] = { t: input.value };
      BS.save();
      reveal(cur, "g");
    }
    function updateDone() {
      var c = 0; for (var k = 0; k < n; k++) if (shown[k] === "g") c++;
      doneP.textContent = "Đã nộp " + c + "/" + n;
    }
    function go(i) {
      if (i < 0 || i >= n) return;
      cur = i;
      var it = items[i];
      groupH.textContent = it.group;
      label.textContent = "Câu " + (i + 1) + "/" + n;
      fill.style.width = Math.round((i + 1) * 100 / n) + "%";
      bar.setAttribute("aria-valuenow", String(i + 1));
      bar.setAttribute("aria-valuetext", "Câu " + (i + 1) + " trên " + n);
      speed.textContent = "";
      speed.appendChild(speedBtns(function () { return it.en; }, "câu " + (i + 1), function () { return i % 2 ? "gb" : "us"; }));
      input.value = ""; input.readOnly = false; submit.disabled = false; showBtn.disabled = false; redoB.hidden = true;
      result.textContent = "";
      var sv = saved(i);
      if (shown[i] === "g" && sv) { input.value = sv.t; reveal(i, "r"); }
      else if (shown[i] === "s") reveal(i, "s");
      prevB.disabled = i === 0; nextB.disabled = i === n - 1;
      updateDone();
    }
    var doneP = el("p", { class: "ls-done muted" });
    submit.addEventListener("click", function () { doSubmit(); updateDone(); });
    redoB.addEventListener("click", function () {
      /* xoa dap an da luu; khong dung toi XP (khoa once giu nguyen) */
      delete st.ans[key(cur)]; delete st.ans["ls:" + cur]; delete shown[cur];
      BS.save();
      go(cur); updateDone(); input.focus();
    });
    showBtn.addEventListener("click", function () { if (!shown[cur]) reveal(cur, "s"); });
    prevB.addEventListener("click", function () { go(cur - 1); });
    nextB.addEventListener("click", function () { go(cur + 1); });
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.isComposing) return;
      e.preventDefault();
      if (!shown[cur]) { doSubmit(); updateDone(); }
      else if (cur < n - 1) { go(cur + 1); input.focus(); }
    });

    card.appendChild(el("div", { class: "ls-head" }, [label, doneP]));
    card.appendChild(bar);
    card.appendChild(groupH);
    card.appendChild(speed);
    card.appendChild(el("label", { for: "ls-input", class: "label", text: "Bạn nghe được gì?" }));
    card.appendChild(input);
    card.appendChild(el("div", { class: "row" }, [submit, showBtn, redoB]));
    card.appendChild(result);
    card.appendChild(el("div", { class: "row ls-nav" }, [prevB, nextB]));
    root.appendChild(card);
    go(cur);
  };

  /* thong bao khong co giong; dung cho tab Bai tap */
  var notices = [];
  var voiceOk = true, voiceHooked = false;
  function updateNotices() {
    notices.forEach(function (n) { n.hidden = voiceOk; n.textContent = voiceOk ? "" : "Thiết bị này không có giọng đọc tiếng Anh (en-*). Hãy dùng nút \"Hiện lời thoại\" để đọc chữ."; });
  }
  function makeNotice() {
    var n = el("div", { class: "notice", role: "status", hidden: true });
    notices.push(n);
    if (!voiceHooked) {
      voiceHooked = true;
      BS.onVoices(function (ok) { voiceOk = ok; updateNotices(); });
    }
    updateNotices();
    return n;
  }

  /* ---------- Bai tap ---------- */
  function saveScore(st, ex, items) {
    var c = 0, t = items.length, a = 0;
    items.forEach(function (it) { if (st.res[it.id] !== undefined) { a++; if (st.res[it.id] === 1) c++; } });
    st.scores[ex.id] = { c: c, t: t, a: a };
    BS.save();
    return st.scores[ex.id];
  }
  function resetEx(st, ex, items) {
    items.forEach(function (it) { delete st.res[it.id]; delete st.ans[it.id]; });
    delete st.scores[ex.id];
    BS.save();
  }
  function scoreText(s) { return "Điểm: " + s.c + "/" + s.t + (s.a < s.t ? " (đã làm " + s.a + "/" + s.t + ")" : ""); }

  function exHeader(ex, idx, scoreBox) {
    var kind = ex.type === "fill" ? "Điền chỗ trống" : ex.type === "tf" ? "Đúng / Sai theo hình" : "Chọn đáp án theo hình";
    return el("div", {}, [
      el("h3", {}, ["Bài " + (idx + 1) + ": " + kind, " ", BS.badgeUnverified(ex.v)]),
      ex.instruction_vi ? el("p", { text: ex.instruction_vi }) : null,
      scoreBox
    ]);
  }
  function figure(ex) { return ex.image ? BS.img(ex.image, "Hình cho bài tập " + ex.id) : null; }

  function showAllBtn(reveals) {
    return el("button", { type: "button", class: "btn", text: "Hiện lời thoại", onclick: function () { reveals.forEach(function (r) { r(); }); } });
  }

  function renderFill(ex, idx, st, uid) {
    var items = ex.items || [];
    var scoreBox = el("p", { class: "score", "aria-live": "polite" });
    var card = el("section", { class: "card", "aria-label": "Bài tập " + (idx + 1) }, [exHeader(ex, idx, scoreBox), figure(ex), makeNotice()]);
    var rows = [], reveals = [];
    function refresh() { var s = saveScore(st, ex, items); scoreBox.textContent = scoreText(s); }
    function showResult(r, ok) {
      r.fb.textContent = "";
      r.fb.className = "fb " + (ok ? "ok" : "bad");
      r.fb.appendChild(document.createTextNode(ok ? "Đúng" : "Chưa đúng. Đáp án: " + ((r.it.answers || []).join(" / ") || "(chưa có đáp án)")));
      r.inp.readOnly = true;
      r.reveal();
    }
    items.forEach(function (it, j) {
      var inp = el("input", { type: "text", class: "inp inp-inline", id: "in-" + it.id, autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        enterkeyhint: j === items.length - 1 ? "done" : "next", "aria-label": "Chỗ trống câu " + (j + 1) });
      var fb = el("div", { class: "fb", "aria-live": "polite" });
      var full = el("p", { class: "muted", lang: "en" });
      var sentence = fillSentence(it);
      function reveal() { if (sentence) full.textContent = "Lời thoại: " + sentence; }
      reveals.push(reveal);
      inp.addEventListener("input", function () { st.ans[it.id] = inp.value; BS.save(); });
      inp.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" || e.isComposing) return;
        e.preventDefault();
        if (inp.readOnly) return;
        for (var k = j + 1; k < rows.length; k++) if (!rows[k].inp.readOnly) { rows[k].inp.focus(); return; }
        gradeAll();
      });
      var row = el("div", { class: "qrow" }, [
        el("p", { class: "en", lang: "en" }, [(it.before || "") + " ", inp, " " + (it.after || ""), " ", BS.badgeUnverified(it.v)]),
        sentence ? listenBtns(function () { return sentence; }, "câu " + (j + 1)) : null, fb, full]);
      var r = { it: it, inp: inp, fb: fb, full: full, reveal: reveal };
      rows.push(r);
      card.appendChild(row);
      /* khoi phuc (khong cong XP) */
      if (typeof st.ans[it.id] === "string") inp.value = st.ans[it.id];
      if (st.res[it.id] !== undefined) {
        if (typeof st.ans[it.id] !== "string" && st.res[it.id] === 1 && it.answers && it.answers.length) inp.value = it.answers[0];
        showResult(r, st.res[it.id] === 1);
      }
    });
    var check = el("button", { type: "button", class: "btn btn-primary", text: "Chấm điểm" });
    var redo = el("button", { type: "button", class: "btn", text: "Làm lại" });
    function gradeAll() {
      rows.forEach(function (r) {
        var ans = (r.it.answers || []).map(BS.norm);
        var ok = ans.length > 0 && ans.indexOf(BS.norm(r.inp.value)) !== -1;
        st.res[r.it.id] = ok ? 1 : 0;
        st.ans[r.it.id] = r.inp.value;
        showResult(r, ok);
        if (ok) BS.addXP(10, { once: uid + ":q:" + r.it.id });
      });
      refresh();
    }
    check.addEventListener("click", gradeAll);
    redo.addEventListener("click", function () {
      resetEx(st, ex, items);
      rows.forEach(function (r) { r.inp.readOnly = false; r.inp.value = ""; r.fb.textContent = ""; r.fb.className = "fb"; r.full.textContent = ""; });
      scoreBox.textContent = "";
    });
    card.appendChild(el("div", { class: "row sticky-actions" }, [check, redo, showAllBtn(reveals)]));
    var prev = st.scores[ex.id];
    if (prev) scoreBox.textContent = scoreText(prev);
    return card;
  }

  function renderTF(ex, idx, st, uid) {
    var items = ex.items || [];
    var scoreBox = el("p", { class: "score", "aria-live": "polite" });
    var card = el("section", { class: "card", "aria-label": "Bài tập " + (idx + 1) }, [exHeader(ex, idx, scoreBox), figure(ex), makeNotice()]);
    var rows = [], reveals = [];
    items.forEach(function (it) {
      var fb = el("div", { class: "fb", "aria-live": "polite" });
      var txt = el("span", { class: "en", lang: "en" });
      var bT = el("button", { type: "button", class: "btn", "aria-pressed": "false", text: "Đúng" });
      var bF = el("button", { type: "button", class: "btn", "aria-pressed": "false", text: "Sai" });
      function reveal() { txt.textContent = it.en || ""; }
      reveals.push(reveal);
      function show(val, ok) {
        bT.disabled = bF.disabled = true;
        bT.setAttribute("aria-pressed", val === true ? "true" : "false");
        bF.setAttribute("aria-pressed", val === false ? "true" : "false");
        reveal();
        fb.textContent = ""; fb.className = "fb " + (ok ? "ok" : "bad");
        fb.appendChild(el("p", { text: (ok ? "Chính xác. " : "Chưa đúng. ") + "Đáp án: " + (it.answer ? "Đúng" : "Sai") }));
        if (it.explain_vi) fb.appendChild(el("p", { class: "explain", text: "Giải thích: " + it.explain_vi }));
      }
      function pick(val) {
        var ok = val === it.answer;
        st.res[it.id] = ok ? 1 : 0;
        st.ans[it.id] = val;
        show(val, ok);
        if (ok) BS.addXP(10, { once: uid + ":q:" + it.id });
        scoreBox.textContent = scoreText(saveScore(st, ex, items));
      }
      bT.addEventListener("click", function () { pick(true); });
      bF.addEventListener("click", function () { pick(false); });
      rows.push({ bT: bT, bF: bF, fb: fb, txt: txt });
      card.appendChild(el("div", { class: "qrow" }, [
        el("p", { class: "en" }, [el("strong", { text: "Câu " + (it.label || "") }), " ", txt, " ", BS.badgeUnverified(it.v)]),
        listenBtns(function () { return it.en || ""; }, "câu " + (it.label || "")),
        el("div", { class: "row" }, [bT, bF]), fb]));
      /* khoi phuc (khong cong XP) */
      if (st.res[it.id] !== undefined) {
        var val = typeof st.ans[it.id] === "boolean" ? st.ans[it.id] : (st.res[it.id] === 1 ? it.answer : !it.answer);
        show(val, st.res[it.id] === 1);
      }
    });
    var redo = el("button", { type: "button", class: "btn", text: "Làm lại" });
    redo.addEventListener("click", function () {
      resetEx(st, ex, items);
      rows.forEach(function (r) {
        r.bT.disabled = r.bF.disabled = false;
        r.bT.setAttribute("aria-pressed", "false"); r.bF.setAttribute("aria-pressed", "false");
        r.fb.textContent = ""; r.fb.className = "fb"; r.txt.textContent = "";
      });
      scoreBox.textContent = "";
    });
    card.appendChild(el("div", { class: "row" }, [redo, showAllBtn(reveals)]));
    var prev = st.scores[ex.id];
    if (prev) scoreBox.textContent = scoreText(prev);
    return card;
  }

  function renderMC(ex, idx, st, uid) {
    var scoreBox = el("p", { class: "score", "aria-live": "polite" });
    var fb = el("div", { class: "fb", "aria-live": "polite" });
    var card = el("section", { class: "card", "aria-label": "Bài tập " + (idx + 1) }, [exHeader(ex, idx, scoreBox), figure(ex), makeNotice()]);
    var one = [{ id: ex.id }];
    var opts = [], reveals = [];
    var list = el("div", { class: "opts" });
    function show(label, ok) {
      var chosen = null;
      (ex.options || []).forEach(function (o) { if (o.label === label) chosen = o; });
      opts.forEach(function (x) {
        x.b.disabled = true;
        x.b.setAttribute("aria-pressed", x.o.label === label ? "true" : "false");
      });
      reveals.forEach(function (r) { r(); });
      fb.textContent = ""; fb.className = "fb " + (ok ? "ok" : "bad");
      fb.appendChild(el("p", { text: ok ? "Chính xác." : "Chưa đúng. Đáp án: " + ex.answer }));
      if (!ok && chosen && chosen.why_vi) fb.appendChild(el("p", { class: "explain", text: "Vì sao đáp án " + chosen.label + " chưa đúng — " + chosen.why_vi }));
      if (ex.explain_vi) {
        var exp = String(ex.explain_vi).replace(/^\s*Đúng là\s+[A-D]\s*[:：]\s*/i, "");
        if (exp) fb.appendChild(el("p", { class: "explain", text: "Giải thích: " + exp }));
      }
    }
    (ex.options || []).forEach(function (o) {
      var b = el("button", { type: "button", class: "btn opt", lang: "en", "aria-pressed": "false", "aria-label": "Chọn đáp án " + (o.label || ""), text: o.label || "" });
      function reveal() { b.textContent = (o.label || "") + ". " + (o.en || ""); b.removeAttribute("aria-label"); }
      reveals.push(reveal);
      b.addEventListener("click", function () {
        var ok = o.label === ex.answer;
        st.res[ex.id] = ok ? 1 : 0;
        st.ans[ex.id] = o.label;
        show(o.label, ok);
        if (ok) BS.addXP(10, { once: uid + ":q:" + ex.id });
        scoreBox.textContent = scoreText(saveScore(st, ex, one));
      });
      opts.push({ b: b, o: o });
      list.appendChild(el("div", { class: "opt-row" }, [listenBtns(function () { return o.en || ""; }, "đáp án " + (o.label || "")), b]));
    });
    card.appendChild(list); card.appendChild(fb);
    /* khoi phuc (khong cong XP) */
    if (st.res[ex.id] !== undefined) {
      var lab = typeof st.ans[ex.id] === "string" ? st.ans[ex.id] : (st.res[ex.id] === 1 ? ex.answer : null);
      show(lab, st.res[ex.id] === 1);
    }
    var redo = el("button", { type: "button", class: "btn", text: "Làm lại" });
    redo.addEventListener("click", function () {
      resetEx(st, ex, one);
      opts.forEach(function (x) { x.b.disabled = false; x.b.setAttribute("aria-pressed", "false"); x.b.textContent = x.o.label || ""; x.b.setAttribute("aria-label", "Chọn đáp án " + (x.o.label || "")); });
      fb.textContent = ""; fb.className = "fb"; scoreBox.textContent = "";
    });
    card.appendChild(el("div", { class: "row" }, [redo, showAllBtn(reveals)]));
    var prev = st.scores[ex.id];
    if (prev) scoreBox.textContent = scoreText(prev);
    return card;
  }

  /* dung chung cho qr.js (Part 2) */
  BS.quizKit = { saveScore: saveScore, resetEx: resetEx, scoreText: scoreText, makeNotice: makeNotice, SPEEDS: SPEEDS };

  BS.render.quiz = function (u, root) {
    var st = BS.unit(u.id);
    root.appendChild(el("h2", { text: "Bài tập" }));
    var exs = u.exercises || [];
    if (!exs.length) { root.appendChild(el("p", { text: "Chưa có bài tập." })); return; }
    exs.forEach(function (ex, i) {
      var card = ex.type === "fill" ? renderFill(ex, i, st, u.id) : ex.type === "tf" ? renderTF(ex, i, st, u.id) : ex.type === "mc" ? renderMC(ex, i, st, u.id)
        : ex.type === "qr" && typeof BS.renderQR === "function" ? BS.renderQR(ex, i, st, u.id) : null;
      if (card) root.appendChild(card);
    });
  };
})();
