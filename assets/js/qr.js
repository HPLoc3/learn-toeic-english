/* qr.js - bai tap Part 2 (type "qr"): nghe cau hoi + 3 dap an A/B/C, chon cau tra loi tot nhat. Khong in gi truoc khi tra loi.
 * Dung BS.speakSeq (core.js) va BS.quizKit (quiz.js). Cham: st.ans[id] = "A"|"B"|"C", st.res[id] = 0|1; +10 XP mot lan (uid:q:id).
 * Truong tuy chon it.audio (tep am thanh sau nay) hien chua duoc dung: chi doc bang giong trinh duyet. */
(function () {
  "use strict";
  var BS = window.BS, K = BS && BS.quizKit;
  if (!BS || !K) return;
  var el = BS.el, SPEEDS = K.SPEEDS;
  var TRAPS = { "similar-sound": "Âm nghe giống nhau", "repeat-word": "Lặp lại từ trong câu hỏi", "wrong-wh": "Trả lời sai loại câu hỏi",
    "wrong-tense": "Sai thì", "wrong-subject": "Sai chủ ngữ", "related-word": "Từ liên quan nhưng lạc đề", "yesno-to-wh": "Trả lời Yes/No cho câu hỏi Wh" };
  var exam = false, syncs = []; /* Chế độ thi: chỉ trong phiên này, không lưu (không phải pref) */

  /* câu hỏi (en-US), rồi 3 đáp án (en-GB) cách nhau ~0.7 giây */
  function seqOf(it) {
    return [{ text: it.q.en, accent: "us", pause: 900 }].concat((it.options || []).map(function (o) { return { text: o.en, accent: "gb" }; }));
  }
  function btn(text, label, fn, cls) {
    return el("button", { type: "button", class: "btn" + (cls ? " " + cls : ""), "aria-label": label, text: text, onclick: fn });
  }

  function buildItem(ex, it, n, total, ctx) {
    var answered = false, peeked = false, played = 0, playing = false;
    var sec = el("section", { class: "qr-item", role: "group", "aria-label": "Câu " + n + " trên " + total });
    var play = el("button", { type: "button", class: "btn btn-primary qr-play" });
    var note = el("p", { class: "muted qr-note" });
    var peek = el("button", { type: "button", class: "btn qr-peek", hidden: true, text: "Hiện lời thoại (không được XP)" });
    var tr = el("div", { class: "qr-tr" });
    var fb = el("div", { class: "fb", tabindex: "-1", role: "group" });
    var opts = (it.options || []).map(function (o) {
      var b = el("button", { type: "button", class: "btn opt qr-opt", lang: "en", "aria-pressed": "false", "aria-label": "Chọn đáp án " + o.label, text: o.label });
      b.addEventListener("click", function () { pick(o.label); });
      return { b: b, o: o };
    });
    function canPlay() { return answered || !exam || played === 0; }
    function sync() {
      play.textContent = playing ? "Đang phát..." : (played || answered ? "Nghe lại câu hỏi và 3 đáp án" : "Nghe câu hỏi và 3 đáp án");
      play.disabled = !canPlay();
      note.textContent = exam && !answered && played ? "Chế độ thi: bạn đã dùng lượt nghe duy nhất của câu này." : "";
    }
    function stop() { BS.stopSpeak(); playing = false; }
    function doPlay() {
      if (!canPlay()) return;
      var h = BS.speakSeq(seqOf(it), { rate: ctx.rate(), onend: function () { playing = false; sync(); } });
      if (!h) { note.textContent = "Không phát được âm thanh trên thiết bị này. Hãy dùng nút \"Hiện lời thoại\"."; peek.hidden = false; return; }
      played++; playing = true; sync();
    }
    function line(en, vi, accent, what) {
      return [el("span", { class: "en", lang: "en", text: en }), " ",
        btn("🔊", "Nghe lại " + what, function () { BS.speakSeq([{ text: en, accent: accent }], { rate: ctx.rate() }); }, "btn-speak"),
        vi ? el("span", { class: "vi muted", text: " " + vi }) : null];
    }
    function showPeek() {
      peeked = true; peek.hidden = true; tr.textContent = "";
      tr.appendChild(el("p", { class: "muted", text: "Lời thoại (câu này không được XP):" }));
      tr.appendChild(el("p", { lang: "en", text: "Hỏi: " + it.q.en }));
      opts.forEach(function (x) { tr.appendChild(el("p", { lang: "en", text: x.o.label + ". " + x.o.en })); });
    }
    function show(label, ok, focus) {
      answered = true; tr.textContent = ""; peek.hidden = true;
      opts.forEach(function (x) {
        var mine = x.o.label === label, right = x.o.label === it.answer;
        x.b.disabled = true;
        x.b.setAttribute("aria-pressed", mine ? "true" : "false");
        x.b.removeAttribute("aria-label");
        x.b.className = "btn opt qr-opt" + (right ? " opt-ok" : mine ? " opt-bad" : "");
        x.b.textContent = (right ? "✓ " : mine ? "✗ " : "") + x.o.label + ". " + x.o.en;
      });
      fb.textContent = ""; fb.className = "fb";
      fb.setAttribute("aria-label", "Kết quả câu " + n + ": " + (ok ? "chính xác" : "chưa đúng, đáp án đúng là " + it.answer));
      fb.appendChild(el("p", { class: "qr-res " + (ok ? "qr-res-ok" : "qr-res-bad"), text: ok ? "Chính xác." : (label ? "Chưa đúng. " : "") + "Đáp án đúng: " + it.answer + "." }));
      var ul = el("ul", { class: "list qr-lines" });
      ul.appendChild(el("li", {}, [el("strong", { text: "Hỏi: " })].concat(line(it.q.en, it.q.vi, "us", "câu hỏi"))));
      opts.forEach(function (x) {
        var o = x.o, right = o.label === it.answer;
        var tag = right ? " (đúng)" : o.label === label ? " (bạn chọn, sai)" : "";
        var li = el("li", { class: right ? "qr-right" : "qr-wrong" }, [el("strong", { text: o.label + "." + tag + " " })].concat(line(o.en, o.vi, "gb", "đáp án " + o.label)));
        if (!right) li.appendChild(el("p", { class: "explain qr-trap" }, [el("strong", { text: "Bẫy: " + (TRAPS[o.trap] || o.trap || "") + ". " }), o.why_vi || ""]));
        ul.appendChild(li);
      });
      fb.appendChild(ul);
      if (it.explain_vi) fb.appendChild(el("p", { class: "explain", text: "Giải thích: " + it.explain_vi }));
      sync();
      if (focus) { try { fb.focus(); } catch (e) { /* bỏ qua */ } }
    }
    function pick(label) {
      if (answered) return;
      stop(); /* tắt tiếng trước khi ghi vào vùng thông báo (aria-live) */
      var ok = label === it.answer;
      ctx.st.res[it.id] = ok ? 1 : 0; ctx.st.ans[it.id] = label;
      if (ok && !peeked) BS.addXP(10, { once: ctx.uid + ":q:" + it.id });
      show(label, ok, true);
      ctx.score();
    }
    function reset() {
      stop(); answered = false; peeked = false; played = 0;
      opts.forEach(function (x) { x.b.disabled = false; x.b.className = "btn opt qr-opt"; x.b.setAttribute("aria-pressed", "false"); x.b.setAttribute("aria-label", "Chọn đáp án " + x.o.label); x.b.textContent = x.o.label; });
      fb.textContent = ""; fb.className = "fb"; fb.removeAttribute("aria-label"); tr.textContent = ""; peek.hidden = !ctx.noVoice(); sync();
    }
    play.addEventListener("click", doPlay);
    peek.addEventListener("click", showPeek);
    sec.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      var k = e.key, i = k && k.length === 1 ? "123".indexOf(k) : -1;
      if (i > -1 && !answered && opts[i]) { e.preventDefault(); pick(opts[i].o.label); }
      else if (k === "r" || k === "R") { e.preventDefault(); doPlay(); }
    });
    sec.appendChild(el("h4", {}, ["Câu " + n + "/" + total, " ", BS.badgeUnverified(it.v)]));
    sec.appendChild(el("div", { class: "row" }, [play, peek]));
    sec.appendChild(note);
    sec.appendChild(tr);
    sec.appendChild(el("div", { class: "qr-opts", role: "group", "aria-label": "Chọn đáp án câu " + n }, opts.map(function (x) { return x.b; })));
    sec.appendChild(fb);
    var s0 = ctx.st.res[it.id];
    if (s0 !== undefined) { /* khôi phục (không cộng XP) */
      var a0 = ctx.st.ans[it.id];
      show(typeof a0 === "string" && /^[A-C]$/.test(a0) ? a0 : (s0 === 1 ? it.answer : null), s0 === 1, false);
    } else sync();
    return { node: sec, reset: reset, sync: sync, peek: peek, isAnswered: function () { return answered; } };
  }

  BS.renderQR = function (ex, idx, st, uid) {
    var items = ex.items || [], rate = 0.9, noVoice = false, rows = [];
    var scoreBox = el("p", { class: "score", "aria-live": "polite" });
    var card = el("section", { class: "card", "aria-label": "Bài tập " + (idx + 1) }, [
      el("div", {}, [el("h3", {}, ["Bài " + (idx + 1) + ": Nghe và chọn câu trả lời", " ", BS.badgeUnverified(ex.v)]),
        ex.instruction_vi ? el("p", { text: ex.instruction_vi }) : null, scoreBox]),
      K.makeNotice()
    ]);
    var ctx = { st: st, uid: uid, rate: function () { return exam ? 1.0 : rate; }, noVoice: function () { return noVoice; },
      score: function () { scoreBox.textContent = K.scoreText(K.saveScore(st, ex, items)); } };
    var speedBtns = SPEEDS.map(function (sp) {
      var b = el("button", { type: "button", class: "btn", "aria-pressed": "false", "aria-label": "Tốc độ " + sp.say + " " + sp.rate, text: sp.name + " " + sp.rate.toFixed(1) });
      b.addEventListener("click", function () { rate = sp.rate; syncCtl(); });
      return { b: b, sp: sp };
    });
    var examBtn = el("button", { type: "button", class: "btn", "aria-pressed": "false", title: "Chỉ nghe một lần, tốc độ bình thường 1.0 (chỉ trong lần mở trang này)" });
    function syncCtl() {
      speedBtns.forEach(function (x) { x.b.disabled = exam; x.b.setAttribute("aria-pressed", !exam && x.sp.rate === rate ? "true" : "false"); });
      examBtn.setAttribute("aria-pressed", exam ? "true" : "false");
      examBtn.textContent = "Chế độ thi: " + (exam ? "bật" : "tắt");
      rows.forEach(function (r) { r.sync(); });
    }
    examBtn.addEventListener("click", function () { exam = !exam; syncs.forEach(function (f) { f(exam); }); });
    syncs.push(function (on) { if (on) rows.forEach(function (r) { if (!r.isAnswered()) r.reset(); }); syncCtl(); });
    card.appendChild(el("div", { class: "row qr-ctl" }, [el("span", { class: "listen-btns", role: "group", "aria-label": "Tốc độ nghe" }, speedBtns.map(function (x) { return x.b; })), examBtn]));
    card.appendChild(el("p", { class: "muted qr-keys", text: "Phím tắt khi đang chọn một câu: 1, 2, 3 chọn đáp án A, B, C; R nghe lại. Đề thi thật chỉ đọc một lần: hãy thử Chế độ thi." }));
    items.forEach(function (it, i) { var r = buildItem(ex, it, i + 1, items.length, ctx); rows.push(r); card.appendChild(r.node); });
    BS.onVoices(function (ok) { noVoice = !ok; rows.forEach(function (r) { if (!r.isAnswered()) r.peek.hidden = ok; }); });
    var redo = el("button", { type: "button", class: "btn", text: "Làm lại" });
    redo.addEventListener("click", function () { K.resetEx(st, ex, items); rows.forEach(function (r) { r.reset(); }); scoreBox.textContent = ""; });
    card.appendChild(el("div", { class: "row" }, [redo]));
    var prev = st.scores[ex.id];
    if (prev) scoreBox.textContent = K.scoreText(prev);
    syncCtl();
    return card;
  };
  BS.qrSeq = seqOf;
})();
