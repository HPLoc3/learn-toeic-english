/* conv.js - bai tap Part 3/4 (type "conv"): nghe hoi thoai / bai noi, doc truoc 3 cau hoi, chon A-D. Cham theo tung doan (3 cau mot lan).
 * Dung BS.speakSeq + BS.castVoices (core.js) va BS.quizKit (quiz.js). Du lieu: ex.sets[] { kind, speakers, lines, graphic?, questions[3] }.
 * Cham: st.ans[qid] = "A".."D", st.res[qid] = 0|1; +10 XP mot lan cho moi cau dung (uid:q:qid), khong XP neu da "Hien loi thoai". */
(function () {
  "use strict";
  var BS = window.BS, K = BS && BS.quizKit;
  if (!BS || !K) return;
  var el = BS.el, SPEEDS = K.SPEEDS, L = "ABCD";
  var TRAPS = { "heard-word": "Từ nghe được nhưng sai ý", "wrong-speaker": "Nhầm người nói", "wrong-detail": "Sai chi tiết", "not-mentioned": "Không được nhắc đến",
    "changed-plan": "Kế hoạch đã đổi", "over-inference": "Suy luận quá đà", "literal": "Hiểu theo nghĩa đen", "graphic-only": "Chỉ có trong hình, không phải đáp án",
    "similar-sound": "Âm nghe giống nhau" };
  var exam = false, syncs = []; /* Chế độ thi: chỉ trong phiên này, không lưu */

  /* tach dong dai (> 140 ky tu) o cuoi cau thanh nhieu phan */
  function chunks(t) {
    if (t.length <= 140) return [t];
    var sn = t.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) || [t], out = [], cur = "";
    sn.forEach(function (s) { if (cur && (cur + s).length > 140) { out.push(cur.trim()); cur = ""; } cur += s; });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  /* parts + cast cho BS.speakSeq; only = danh sach chi so dong (mac dinh: tat ca). Khong co loi dan vao */
  function seqOf(set, only) {
    var sp = set.speakers || [], lines = set.lines || [], parts = [];
    var acc = {};
    sp.forEach(function (s) { acc[s.id] = s.accent; });
    lines.forEach(function (ln, i) {
      if (only && only.indexOf(i) < 0) return;
      var cs = chunks(String(ln.en || "")), nx = lines[i + 1], gap = nx && nx.s !== ln.s ? 350 : 250;
      cs.forEach(function (c, j) { parts.push({ text: c, who: ln.s, accent: acc[ln.s] || "us", pause: j < cs.length - 1 ? 150 : gap }); });
    });
    return { parts: parts, cast: sp.map(function (s) { return { id: s.id, accent: s.accent, gender: s.gender }; }) };
  }
  function labelsOf(set) {
    var n = { m: 0, f: 0 }, i = { m: 0, f: 0 }, out = {};
    (set.speakers || []).forEach(function (s) { n[s.gender === "f" ? "f" : "m"]++; });
    (set.speakers || []).forEach(function (s) {
      var g = s.gender === "f" ? "f" : "m";
      out[s.id] = set.kind === "talk" ? "Người nói" : (g === "f" ? "Người nữ" : "Người nam") + (n[g] > 1 ? " " + (++i[g]) : "");
    });
    return out;
  }
  function btn(text, label, fn, cls) {
    return el("button", { type: "button", class: "btn" + (cls ? " " + cls : ""), "aria-label": label, text: text, onclick: fn });
  }
  function graphicNode(g) {
    var box = el("div", { class: "cv-graphic", lang: "en" });
    if (g.type === "list") {
      box.appendChild(el("h5", { text: g.title }));
      box.appendChild(el("ul", {}, (g.items || []).map(function (t) { return el("li", { text: t }); })));
      return box;
    }
    var tb = el("table", { class: "cv-table" }, [el("caption", { text: g.title }),
      el("thead", {}, [el("tr", {}, (g.cols || []).map(function (c) { return el("th", { scope: "col", text: c }); }))]),
      el("tbody", {}, (g.rows || []).map(function (r) { return el("tr", {}, r.map(function (c) { return el("td", { text: c }); })); }))]);
    box.appendChild(el("div", { class: "cv-scroll", role: "region", tabindex: "0", "aria-label": g.title }, [tb]));
    return box;
  }

  function buildSet(ex, set, n, total, qa, ctx) {
    var qs = set.questions || [], labels = labelsOf(set);
    var graded = false, peeked = false, failed = false, played = 0, playing = false, cur = null, picks = [];
    var sec = el("section", { class: "cv-set", role: "group", "aria-label": "Đoạn " + n + " trên " + total });
    var play = el("button", { type: "button", class: "btn btn-primary cv-play" });
    var note = el("p", { class: "muted cv-note" });
    var peek = el("button", { type: "button", class: "btn cv-peek", hidden: true, text: "Hiện lời thoại (không được XP)" });
    var tr = el("div", { class: "cv-tr" });
    var chk = el("button", { type: "button", class: "btn btn-primary cv-check", disabled: true, text: "Kiểm tra" });
    var fb = el("div", { class: "fb cv-fb", tabindex: "-1", role: "group" });
    var qn = qs.map(function (q, i) {
      var opts = (q.options || []).map(function (o) {
        var b = el("button", { type: "button", class: "btn opt cv-opt", "aria-pressed": "false" }, [o.label + ". ", el("span", { lang: "en", text: o.en })]);
        b.addEventListener("click", function () { pick(i, o.label); });
        return { b: b, o: o };
      });
      var fs = el("fieldset", { class: "cv-q" }, [el("legend", {}, ["Câu " + (qa + i) + ". ", el("span", { lang: "en", text: q.q.en })]),
        el("div", { class: "cv-opts" }, opts.map(function (x) { return x.b; }))]);
      fs.addEventListener("keydown", function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
        var k = e.key, j = k && k.length === 1 ? "1234".indexOf(k) : -1;
        if (j > -1 && opts[j] && !opts[j].b.disabled) { e.preventDefault(); pick(i, opts[j].o.label); }
      });
      return { q: q, opts: opts, fs: fs };
    });
    function npicks() { return picks.filter(function (p) { return !!p; }).length; }
    function canPlay() { return graded || !exam || played === 0; }
    function unlocked() { return played > 0 || peeked || ctx.noVoice() || npicks() > 0; }
    function sync() {
      var can = canPlay();
      play.textContent = playing ? "Đang phát..." : (played || graded ? "Nghe lại" : "Nghe") + (set.kind === "talk" ? " bài nói" : " hội thoại");
      qn.forEach(function (x, i) {
        x.opts.forEach(function (y) { y.b.disabled = graded || !unlocked(); y.b.setAttribute("aria-pressed", picks[i] === y.o.label ? "true" : "false"); });
      });
      chk.disabled = graded || npicks() < qs.length; chk.hidden = graded;
      peek.hidden = graded || peeked || !(failed || ctx.noVoice());
      play.disabled = !can;
      note.textContent = failed && !graded ? "Không phát được âm thanh trên thiết bị này. Hãy dùng nút \"Hiện lời thoại\"." : exam && !graded && played ? "Chế độ thi: bạn đã dùng lượt nghe duy nhất của đoạn này." : (!graded && !unlocked() ? "Hãy nghe trước, rồi mới chọn đáp án." : "");
      if (!can && document.activeElement === play && qn[0] && qn[0].opts[0] && !qn[0].opts[0].b.disabled) { try { qn[0].opts[0].b.focus(); } catch (e) { /* bo qua */ } }
    }
    function stop() { if (typeof BS.stopSpeak === "function") BS.stopSpeak(); playing = false; }
    function speak(sq) {
      var mine = null;
      mine = typeof BS.speakSeq !== "function" ? null : BS.speakSeq(sq.parts, { rate: ctx.rate(), cast: sq.cast, onstop: function (r) {
        if (mine !== cur) return;
        playing = false; cur = null;
        /* Che do thi: bi huy truoc khi am thanh bat dau thi hoan lai luot nghe duy nhat */
        if (r && !r.completed && !r.started && !graded) played = Math.max(0, played - 1);
        sync();
      } });
      return mine;
    }
    function doPlay() {
      if (!canPlay()) return;
      var mine = speak(seqOf(set));
      if (!mine) { failed = true; sync(); return; }
      cur = mine; played++; playing = true;
      sync();
    }
    function pick(i, label) {
      if (graded || !unlocked()) return;
      picks[i] = label; sync();
    }
    function showPeek() {
      peeked = true; tr.textContent = "";
      tr.appendChild(el("p", { class: "muted", text: "Lời thoại (đoạn này không được XP):" }));
      (set.lines || []).forEach(function (ln) { tr.appendChild(el("p", { lang: "en" }, [labels[ln.s] + ": " + ln.en])); });
      sync();
    }
    function optMark(x, label, right, mine) {
      x.b.disabled = true; x.b.setAttribute("aria-pressed", mine ? "true" : "false");
      x.b.className = "btn opt cv-opt" + (right ? " opt-ok" : mine ? " opt-bad" : "");
      x.b.textContent = (right ? "✓ " : mine ? "✗ " : "") + x.o.label + ". ";
      x.b.appendChild(el("span", { lang: "en", text: x.o.en }));
    }
    function show(focus) {
      graded = true; tr.textContent = ""; fb.textContent = "";
      var good = 0, ev = {};
      qn.forEach(function (x, i) {
        var q = x.q, p = picks[i], ok = p === q.answer;
        if (ok) good++;
        (q.evidence || []).forEach(function (li) { (ev[li] = ev[li] || []).push(qa + i); });
        x.opts.forEach(function (y) { optMark(y, p, y.o.label === q.answer, y.o.label === p); });
        var ul = el("ul", { class: "list cv-lines" });
        x.opts.forEach(function (y) {
          var o = y.o, right = o.label === q.answer;
          var li = el("li", { class: right ? "cv-right" : "cv-wrong" }, [el("strong", { text: o.label + "." + (right ? " (đúng)" : o.label === p ? " (bạn chọn, sai)" : "") + " " }), el("span", { class: "en", lang: "en", text: o.en }), o.vi ? el("span", { class: "vi muted", text: " " + o.vi }) : null]);
          if (!right) li.appendChild(el("p", { class: "explain cv-trap" }, [el("strong", { text: "Bẫy: " + (TRAPS[o.trap] || o.trap || "") + ". " }), o.why_vi || ""]));
          ul.appendChild(li);
        });
        fb.appendChild(el("div", { class: "cv-qfb" }, [
          el("p", { class: "cv-res " + (ok ? "cv-res-ok" : "cv-res-bad") }, [(ok ? "✓ Câu " + (qa + i) + ": chính xác." : "✗ Câu " + (qa + i) + ": " + (p ? "chưa đúng. " : "") + "Đáp án đúng: " + q.answer + ".")]),
          el("p", { class: "vi muted", text: q.q.vi || "" }), ul, q.explain_vi ? el("p", { class: "explain", text: "Giải thích: " + q.explain_vi }) : null]));
      });
      fb.setAttribute("aria-label", "Kết quả đoạn " + n + ": đúng " + good + "/" + qs.length);
      fb.appendChild(el("h5", { text: "Lời thoại" }));
      var ul2 = el("ul", { class: "list cv-script" });
      (set.lines || []).forEach(function (ln, i) {
        var li = el("li", { class: ev[i] ? "cv-ev" : "" }, [el("strong", { text: labels[ln.s] + ": " }), el("span", { class: "en", lang: "en", text: ln.en }), " ",
          btn("🔊", "Nghe lại câu này", function () { speak(seqOf(set, [i])); }, "btn-speak"), el("span", { class: "vi muted", text: " " + (ln.vi || "") })]);
        if (ev[i]) li.appendChild(el("span", { class: "cv-sr", text: " (chứa đáp án câu " + ev[i].join(", ") + ")" }));
        ul2.appendChild(li);
      });
      fb.appendChild(ul2);
      sync();
      if (focus) { try { fb.focus(); } catch (e) { /* bo qua */ } }
    }
    function check() {
      if (graded || npicks() < qs.length) return;
      stop(); /* tat tieng truoc khi ghi vao vung aria-live */
      qn.forEach(function (x, i) {
        var q = x.q, ok = picks[i] === q.answer;
        ctx.st.ans[q.id] = picks[i]; ctx.st.res[q.id] = ok ? 1 : 0;
        if (ok && !peeked) BS.addXP(10, { once: ctx.uid + ":q:" + q.id });
      });
      ctx.score(); show(true);
    }
    function reset() {
      stop(); graded = false; peeked = false; failed = false; played = 0; picks = [];
      qn.forEach(function (x) { x.opts.forEach(function (y) { y.b.className = "btn opt cv-opt"; y.b.textContent = y.o.label + ". "; y.b.appendChild(el("span", { lang: "en", text: y.o.en })); }); });
      fb.textContent = ""; fb.removeAttribute("aria-label"); tr.textContent = ""; sync();
    }
    play.addEventListener("click", doPlay);
    peek.addEventListener("click", showPeek);
    chk.addEventListener("click", check);
    sec.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); doPlay(); }
    });
    sec.appendChild(el("h4", {}, ["Đoạn " + n + "/" + total + " (câu " + qa + (qs.length > 1 ? "–" + (qa + qs.length - 1) : "") + ")", " ", BS.badgeUnverified(set.v)]));
    if (set.graphic) sec.appendChild(graphicNode(set.graphic));
    sec.appendChild(el("div", { class: "row" }, [play, peek]));
    sec.appendChild(note);
    sec.appendChild(tr);
    qn.forEach(function (x) { sec.appendChild(x.fs); });
    sec.appendChild(el("div", { class: "row" }, [chk]));
    sec.appendChild(fb);
    if (qs.every(function (q) { return ctx.st.res[q.id] !== undefined; })) { /* khôi phục (không cộng XP) */
      picks = qs.map(function (q) { var a = ctx.st.ans[q.id]; return typeof a === "string" && /^[A-D]$/.test(a) ? a : (ctx.st.res[q.id] === 1 ? q.answer : null); });
      show(false);
    } else sync();
    return { node: sec, reset: reset, sync: sync, peek: peek, play: play, isGraded: function () { return graded; } };
  }

  BS.renderConv = function (ex, idx, st, uid) {
    var sets = ex.sets || [], rate = 0.9, noVoice = false, rows = [], all = [];
    sets.forEach(function (s) { (s.questions || []).forEach(function (q) { all.push(q); }); });
    var talk = sets.length && sets[0].kind === "talk";
    var scoreBox = el("p", { class: "score", "aria-live": "polite" });
    var card = el("section", { class: "card", "aria-label": "Bài tập " + (idx + 1) }, [
      el("div", {}, [el("h3", {}, ["Bài " + (idx + 1) + ": " + (talk ? "Nghe bài nói và chọn đáp án" : "Nghe hội thoại và chọn đáp án"), " ", BS.badgeUnverified(ex.v)]),
        ex.instruction_vi ? el("p", { text: ex.instruction_vi }) : null, scoreBox]),
      K.makeNotice()
    ]);
    var ctx = { st: st, uid: uid, rate: function () { return exam ? 1.0 : rate; }, noVoice: function () { return noVoice; },
      score: function () { scoreBox.textContent = K.scoreText(K.saveScore(st, ex, all)); } };
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
    syncs.push(function (on) { if (on) rows.forEach(function (r) { if (!r.isGraded()) r.reset(); }); syncCtl(); });
    card.appendChild(el("div", { class: "row cv-ctl" }, [el("span", { class: "listen-btns", role: "group", "aria-label": "Tốc độ nghe" }, speedBtns.map(function (x) { return x.b; })), examBtn]));
    card.appendChild(el("p", { class: "muted cv-keys", text: "Hãy đọc 3 câu hỏi trước khi nghe. Phím tắt: trong một câu, 1, 2, 3, 4 chọn đáp án A, B, C, D; R nghe lại cả đoạn. Đề thi thật chỉ đọc một lần: hãy thử Chế độ thi." }));
    var qa = 1;
    sets.forEach(function (s, i) { var r = buildSet(ex, s, i + 1, sets.length, qa, ctx); qa += (s.questions || []).length; rows.push(r); card.appendChild(r.node); });
    if (typeof BS.onVoices === "function") BS.onVoices(function (ok) {
      noVoice = !ok; rows.forEach(function (r) { r.sync(); });
    });
    var redo = el("button", { type: "button", class: "btn", text: "Làm lại" });
    redo.addEventListener("click", function () {
      K.resetEx(st, ex, all); rows.forEach(function (r) { r.reset(); }); scoreBox.textContent = "";
      if (rows[0] && !rows[0].play.disabled) { try { rows[0].play.focus(); } catch (e) { /* bo qua */ } }
    });
    card.appendChild(el("div", { class: "row" }, [redo]));
    var prev = st.scores[ex.id];
    if (prev) scoreBox.textContent = K.scoreText(prev);
    syncCtl();
    return card;
  };
  BS.convSeq = seqOf;
})();
