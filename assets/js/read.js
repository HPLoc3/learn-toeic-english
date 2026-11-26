/* read.js - Part 5/6/7: type "gram" (items) va "read" (sets: passages + questions). st.ans/st.res theo id cau; +10 XP/cau dung (mot lan). Khong doc to. */
(function () {
  "use strict";
  var BS = window.BS, K = BS && BS.quizKit;
  if (!BS || !K) return;
  var el = BS.el, BLANK = "------";
  var TR = { "wrong-form": "Sai dạng từ", "wrong-tense": "Sai thì", "wrong-voice": "Sai thể", "wrong-agreement": "Sai hòa hợp", "wrong-structure": "Sai cấu trúc",
    "wrong-case": "Sai cách", "wrong-meaning": "Sai nghĩa", "wrong-collocation": "Sai kết hợp từ", "wrong-connector": "Sai từ nối", "wrong-detail": "Sai chi tiết",
    "not-mentioned": "Không được nhắc đến", "over-inference": "Suy luận quá đà", "word-match": "Trùng từ nhưng sai ý", "other-passage": "Thuộc bài đọc khác",
    "opposite": "Ngược nghĩa", "too-broad": "Quá rộng", "too-narrow": "Quá hẹp", "stated": "Được nêu trong bài", "other-meaning": "Nghĩa khác của từ",
    "breaks-flow": "Không nối mạch", "wrong-reference": "Sai từ chỉ định" };
  var exam = false, syncs = [];

  function foc(n) { try { n.focus(); } catch (e) { /* bo qua */ } }
  function fill(n, kids) {
    n.textContent = "";
    kids.forEach(function (c) { if (c !== null && c !== undefined) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
  }
  function okLetter(a) { return typeof a === "string" && /^[A-D]$/.test(a) ? a : null; }
  function optOf(q, l) { return (q.options || []).filter(function (o) { return o.label === l; })[0] || { label: l, en: "" }; }
  function setOpt(x, cls, mark) {
    x.b.className = "btn opt rd-opt" + (cls ? " " + cls : "");
    fill(x.b, [(mark || "") + x.o.label + ". ", el("span", { lang: "en", text: x.o.en })]);
  }
  function paint(x, right, mine) { x.b.disabled = true; x.b.setAttribute("aria-pressed", mine ? "true" : "false"); setOpt(x, right ? "opt-ok" : mine ? "opt-bad" : "", right ? "✓ " : mine ? "✗ " : ""); }
  function makeQ(head, options, pick) {
    var opts = options.map(function (o) {
      var b = el("button", { type: "button", class: "btn opt rd-opt", "aria-pressed": "false" });
      var x = { b: b, o: o }; setOpt(x);
      b.addEventListener("click", function () { pick(o.label); });
      return x;
    });
    var fs = el("fieldset", { class: "rd-q" }, [el("legend", {}, head), el("div", { class: "rd-opts" }, opts.map(function (x) { return x.b; }))]);
    fs.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      var j = e.key && e.key.length === 1 ? "1234".indexOf(e.key) : -1;
      if (j > -1 && opts[j] && !opts[j].b.disabled) { e.preventDefault(); pick(opts[j].o.label); }
    });
    return { fs: fs, opts: opts };
  }
  function optList(opts, answer, p) {
    var ul = el("ul", { class: "list rd-ol" });
    opts.forEach(function (y) {
      var o = y.o, right = o.label === answer;
      var li = el("li", { class: right ? "rd-right" : "rd-wrong" }, [el("strong", { text: o.label + "." + (right ? " (đúng)" : o.label === p ? " (bạn chọn, sai)" : "") + " " }),
        el("span", { class: "en", lang: "en", text: o.en }), o.vi && o.vi.toLowerCase() !== o.en.toLowerCase() ? el("span", { class: "vi muted", text: " " + o.vi }) : null]);
      if (!right) li.appendChild(el("p", { class: "explain rd-trap" }, [el("strong", { text: "Bẫy: " + (TR[o.trap] || o.trap || "") + ". " }), o.why_vi || ""]));
      ul.appendChild(li);
    });
    return ul;
  }
  function resLine(ok, n, p, ans) {
    return el("p", { class: "rd-res " + (ok ? "rd-res-ok" : "rd-res-bad") }, [ok ? "✓ Câu " + n + ": chính xác." : "✗ Câu " + n + ": " + (p ? "chưa đúng. " : "") + "Đáp án đúng: " + ans + "."]);
  }
  function makeCard(ex, idx, st, title, all) {
    var scoreBox = el("p", { class: "score", "aria-live": "polite" });
    var card = el("section", { class: "card rd-card", "aria-label": "Bài tập " + (idx + 1) }, [
      el("div", {}, [el("h3", {}, ["Bài " + (idx + 1) + ": " + title, " ", BS.badgeUnverified(ex.v)]), ex.instruction_vi ? el("p", { text: ex.instruction_vi }) : null, scoreBox])]);
    var examBtn = el("button", { type: "button", class: "btn", "aria-pressed": "false" });
    function syncExam() { examBtn.setAttribute("aria-pressed", exam ? "true" : "false"); examBtn.textContent = "Chế độ thi: " + (exam ? "bật" : "tắt"); }
    examBtn.addEventListener("click", function () { exam = !exam; syncs.forEach(function (f) { f(exam); }); });
    var c = { st: st, card: card, examBtn: examBtn, syncExam: syncExam, scoreBox: scoreBox, score: function () {
      var s = K.saveScore(st, ex, all);
      if (s.a) scoreBox.textContent = K.scoreText(s); else { delete st.scores[ex.id]; scoreBox.textContent = ""; BS.save(); }
    } };
    if (st.scores[ex.id]) scoreBox.textContent = K.scoreText(st.scores[ex.id]);
    return c;
  }
  function addRedo(c, ex, all, rows, first) {
    var redo = el("button", { type: "button", class: "btn", text: "Làm lại" });
    redo.addEventListener("click", function () {
      K.resetEx(c.st, ex, all); rows.forEach(function (r) { r.reset(); }); c.scoreBox.textContent = "";
      if (c.sync) c.sync();
      var f = first(); if (f) foc(f);
    });
    c.card.appendChild(el("div", { class: "row" }, [redo]));
  }

  /* ---------- Part 5 ---------- */
  function buildGram(it, n, c, uid) {
    var graded = false, pick = null, parts = String(it.en || "").split(BLANK);
    var sent = el("span", { class: "rd-sent", lang: "en" });
    var fb = el("div", { class: "fb rd-fb", tabindex: "-1", role: "group" });
    var q = makeQ(["Câu " + n + ". ", sent, " ", BS.badgeUnverified(it.v)], it.options || [], function (l) { choose(l); });
    var opts = q.opts;
    function sentence(t) { fill(sent, [parts[0], el("strong", { class: t ? "rd-key" : "rd-gap", text: t || BLANK }), parts.slice(1).join(BLANK)]); }
    function sync() { opts.forEach(function (y) { y.b.disabled = graded; y.b.setAttribute("aria-pressed", pick === y.o.label ? "true" : "false"); }); }
    function show(focus) {
      graded = true;
      var ok = pick === it.answer;
      opts.forEach(function (y) { paint(y, y.o.label === it.answer, y.o.label === pick); });
      sentence(optOf(it, it.answer).en);
      fill(fb, [resLine(ok, n, pick, it.answer), el("p", { class: "vi muted", text: it.vi || "" }), optList(opts, it.answer, pick), it.explain_vi ? el("p", { class: "explain", text: "Giải thích: " + it.explain_vi }) : null]);
      fb.setAttribute("aria-label", "Kết quả câu " + n);
      if (focus) foc(fb);
    }
    function grade(l, focus) {
      if (graded) return;
      pick = l; c.st.ans[it.id] = l; c.st.res[it.id] = l === it.answer ? 1 : 0;
      if (l === it.answer) BS.addXP(10, { once: uid + ":q:" + it.id });
      c.score(); show(focus);
    }
    function choose(l) { if (graded) return; if (exam) { pick = l; sync(); c.sync(); } else grade(l, true); }
    function reset() { graded = false; pick = null; opts.forEach(function (y) { setOpt(y); }); sentence(null); fill(fb, []); fb.removeAttribute("aria-label"); sync(); }
    sentence(null);
    if (c.st.res[it.id] !== undefined) { var a = okLetter(c.st.ans[it.id]); pick = a || (c.st.res[it.id] === 1 ? it.answer : null); show(false); } else sync();
    return { node: el("div", { class: "rd-item" }, [q.fs, fb]), reset: reset, grade: grade, isGraded: function () { return graded; }, picked: function () { return pick; }, first: function () { return opts[0].b; } };
  }
  BS.renderGram = function (ex, idx, st, uid) {
    var items = ex.items || [], rows = [];
    var c = makeCard(ex, idx, st, "Chọn từ đúng để hoàn thành câu", items);
    var submit = el("button", { type: "button", class: "btn btn-primary rd-submit", hidden: true, disabled: true, text: "Nộp bài" });
    c.sync = function () {
      var open = rows.filter(function (r) { return !r.isGraded(); });
      submit.hidden = !exam || !open.length;
      submit.disabled = !open.length || open.some(function (r) { return !r.picked(); });
    };
    submit.addEventListener("click", function () {
      if (submit.disabled) return;
      rows.forEach(function (r) { r.grade(r.picked(), false); });
      c.sync();
    });
    c.card.appendChild(el("div", { class: "row rd-ctl" }, [c.examBtn, submit]));
    c.card.appendChild(el("p", { class: "muted rd-keys", text: "Phím 1, 2, 3, 4 chọn A, B, C, D. Chế độ thi: chọn lại được, bấm Nộp bài để chấm." }));
    items.forEach(function (it, i) { var r = buildGram(it, i + 1, c, uid); rows.push(r); c.card.appendChild(r.node); });
    syncs.push(function (on) { if (on) rows.forEach(function (r) { if (!r.isGraded()) r.reset(); }); c.syncExam(); c.sync(); });
    addRedo(c, ex, items, rows, function () { return rows[0] && rows[0].first(); });
    c.syncExam(); c.sync();
    return c.card;
  };

  /* ---------- Part 6/7 ---------- */
  function tableNode(g) {
    var tb = el("table", { class: "cv-table" }, [el("caption", { text: g.title }),
      el("thead", {}, [el("tr", {}, (g.cols || []).map(function (h) { return el("th", { scope: "col", text: h }); }))]),
      el("tbody", {}, (g.rows || []).map(function (r) { return el("tr", {}, r.map(function (x) { return el("td", { text: x }); })); }))]);
    return el("div", { class: "cv-scroll", role: "region", tabindex: "0", "aria-label": g.title }, [tb]);
  }
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function buildSet(set, n, total, qa, c, uid) {
    var qs = set.questions || [], pas = set.passages || [], cloze = set.kind === "cloze";
    var graded = false, picks = [], blanks = {}, marks = {}, paras = {}, hasPin = false;
    var sec = el("section", { class: "rd-set", role: "group", "aria-label": "Bài đọc " + n + " trên " + total });
    var fb = el("div", { class: "fb rd-fb", tabindex: "-1", role: "group" });
    var chk = el("button", { type: "button", class: "btn btn-primary rd-check", disabled: true, text: "Kiểm tra" });
    var pinBtn = el("button", { type: "button", class: "btn rd-pinbtn", "aria-pressed": "false", text: "Ghim bài đọc" });
    var doc = el("div", { class: "rd-doc" });
    var body = el("div", { class: "rd-body" });
    var vocab = {};
    qs.forEach(function (q) { if (q.kind === "vocab" && q.at && q.word) vocab[q.at[0] + "." + q.at[1]] = q.word; });

    function paraNodes(p, pi, ri) {
      var kids = [], tx = String(p.en || ""), vw = vocab[pi + "." + ri], used = false, r, rx = vw && new RegExp("\\b" + esc(vw) + "\\b", "i");
      tx.split(/(\{\d\}|\[\d\])/).forEach(function (seg) {
        var m = /^\{(\d)\}$/.exec(seg), k = /^\[(\d)\]$/.exec(seg);
        if (m) {
          var bn = +m[1], b = el("button", { type: "button", class: "rd-blank" });
          b.addEventListener("click", function () { var x = qn[bn - 1]; if (x) foc(x.opts[0].b); });
          blanks[bn] = b; kids.push(b);
        } else if (k) {
          var ins = el("span", { class: "rd-ins" });
          marks[pi + "." + k[1]] = ins; kids.push(el("strong", { class: "rd-mark", text: seg }), ins);
        } else if (rx && !used && (r = rx.exec(seg))) {
          used = true;
          kids.push(seg.slice(0, r.index), el("mark", { class: "rd-word", text: r[0] }), seg.slice(r.index + r[0].length));
        } else kids.push(seg);
      });
      return kids;
    }
    function passage(p, pi) {
      var g = p.genre || "", multi = pas.length > 1;
      var art = el("article", { class: "rd-pass", lang: "en", "aria-label": "Bài đọc " + (pi + 1) + ": " + g });
      if (multi) art.appendChild(el("h5", { class: "rd-ph", text: "Bài đọc " + (pi + 1) + "/" + pas.length + " (" + g + ")" }));
      if (p.title) art.appendChild(el("h5", { class: "rd-pt", text: p.title }));
      if (p.head && p.head.length) {
        var dl = el("dl", { class: "rd-head" });
        p.head.forEach(function (h) { dl.appendChild(el("dt", { text: h[0] })); dl.appendChild(el("dd", { text: h[1] })); });
        art.appendChild(dl);
      }
      var chat = p.genre === "chat", list = chat ? el("ol", { class: "rd-chat" }) : art;
      paras[pi] = [];
      (p.paras || []).forEach(function (pp, ri) {
        var w = el(chat ? "li" : "div", { class: "rd-pw" });
        if (chat) w.appendChild(el("p", { class: "rd-who" }, [el("strong", { text: pp.who || "" }), " ", el("span", { class: "rd-time", text: pp.time || "" })]));
        var pe = el("p", { class: "rd-p" }, paraNodes(pp, pi, ri));
        var sr = el("span", { class: "rd-sr" }), tr = el("details", { class: "rd-tr", hidden: true }, [el("summary", { text: "Bản dịch" }), el("p", { class: "vi", text: pp.vi || "" })]);
        w.appendChild(pe); w.appendChild(sr); w.appendChild(tr); list.appendChild(w);
        paras[pi][ri] = { w: w, sr: sr, tr: tr };
      });
      if (chat) art.appendChild(list);
      if (p.table) art.appendChild(tableNode(p.table));
      return art;
    }
    pas.forEach(function (p, pi) { doc.appendChild(passage(p, pi)); });
    var qn = qs.map(function (q, i) {
      var head = ["Câu " + (qa + i) + ". "];
      if (q.q) head.push(el("span", { lang: "en", text: q.q.en }));
      else head.push(el("span", { text: "Chỗ trống (" + q.blank + ")" }));
      if (q.kind === "position" && q.sentence) head.push(" ", el("em", { class: "rd-possent", lang: "en", text: q.sentence }));
      head.push(" ", BS.badgeUnverified(q.v));
      var x = makeQ(head, q.options || [], function (l) { pickQ(i, l); });
      x.q = q;
      return x;
    });
    function npicks() { return picks.filter(function (p) { return !!p; }).length; }
    function blankText(i) {
      var q = qs[i], bn = q.blank, b = blanks[bn];
      if (!b) return;
      var p = picks[i], o = optOf(q, graded ? q.answer : p), ok = p === q.answer;
      b.className = "rd-blank" + (graded ? (ok ? " rd-ok" : " rd-bad") : p ? " rd-on" : "");
      fill(b, [graded ? (ok ? "✓ " : "✗ ") + o.en : p ? "(" + bn + ") " + o.en : "(" + bn + ") " + BLANK]);
      b.setAttribute("aria-label", "Chỗ trống " + bn + ": " + (graded ? (ok ? "đúng, " : "sai, đáp án ") + o.en : p ? "đã chọn " + o.en : "chưa chọn"));
    }
    function sync() {
      chk.hidden = graded;
      qn.forEach(function (x, i) {
        x.opts.forEach(function (y) { y.b.disabled = graded; y.b.setAttribute("aria-pressed", picks[i] === y.o.label ? "true" : "false"); });
        if (cloze) blankText(i);
      });
      chk.disabled = graded || npicks() < qs.length;
    }
    function pickQ(i, l) { if (graded) return; picks[i] = l; c.st.ans[qs[i].id] = l; BS.save(); sync(); }
    function show(focus) {
      graded = true;
      var good = 0, ev = {}, items = [];
      qn.forEach(function (x, i) {
        var q = x.q, p = picks[i], ok = p === q.answer;
        if (ok) good++;
        (q.evidence || []).forEach(function (e) { var k = e[0] + "." + e[1]; (ev[k] = ev[k] || []).push(qa + i); });
        x.opts.forEach(function (y) { paint(y, y.o.label === q.answer, y.o.label === p); });
        if (q.kind === "position") {
          var mk = /\d/.exec(optOf(q, q.answer).en), sp = mk && marks[(q.at || 0) + "." + mk[0]];
          if (sp) fill(sp, [" ", el("em", { class: "rd-added", text: q.sentence })]);
        }
        items.push(el("div", { class: "rd-qfb" }, [resLine(ok, qa + i, p, q.answer), q.q && q.q.vi ? el("p", { class: "vi muted", text: q.q.vi }) : null, optList(x.opts, q.answer, p),
          q.clue ? el("p", { class: "rd-clue" }, ["Manh mối: \"" + q.clue + "\""]) : null, q.explain_vi ? el("p", { class: "explain", text: "Giải thích: " + q.explain_vi }) : null]));
      });
      Object.keys(paras).forEach(function (pi) {
        paras[pi].forEach(function (r, ri) {
          var e = ev[pi + "." + ri];
          r.w.className = "rd-pw" + (e ? " rd-ev" : ""); fill(r.sr, e ? [" (chứa đáp án câu " + e.join(", ") + ")"] : []); r.tr.hidden = false;
        });
      });
      fill(fb, items);
      fb.setAttribute("aria-label", "Kết quả bài đọc " + n + ": đúng " + good + "/" + qs.length);
      sync();
      if (focus) foc(fb);
    }
    function check() {
      if (graded || npicks() < qs.length) return;
      qn.forEach(function (x, i) {
        var q = x.q, ok = picks[i] === q.answer;
        c.st.ans[q.id] = picks[i]; c.st.res[q.id] = ok ? 1 : 0;
        if (ok) BS.addXP(10, { once: uid + ":q:" + q.id });
      });
      c.score(); show(true);
    }
    function reset() {
      graded = false; picks = [];
      qn.forEach(function (x) { x.opts.forEach(function (y) { setOpt(y); }); });
      Object.keys(paras).forEach(function (pi) { paras[pi].forEach(function (r) { r.w.className = "rd-pw"; fill(r.sr, []); r.tr.hidden = true; }); });
      Object.keys(marks).forEach(function (k) { fill(marks[k], []); });
      fill(fb, []); fb.removeAttribute("aria-label"); sync();
    }
    pinBtn.addEventListener("click", function () {
      hasPin = !hasPin;
      pinBtn.setAttribute("aria-pressed", hasPin ? "true" : "false");
      doc.className = "rd-doc" + (hasPin ? " rd-pin" : "");
      if (hasPin) { doc.setAttribute("role", "region"); doc.setAttribute("tabindex", "0"); doc.setAttribute("aria-label", "Bài đọc (đã ghim)"); }
      else { doc.removeAttribute("role"); doc.removeAttribute("tabindex"); doc.removeAttribute("aria-label"); }
    });
    chk.addEventListener("click", check);
    sec.appendChild(el("h4", {}, ["Bài đọc " + n + "/" + total + " (câu " + qa + (qs.length > 1 ? "–" + (qa + qs.length - 1) : "") + ")", " ", BS.badgeUnverified(set.v)]));
    sec.appendChild(el("div", { class: "row rd-bar" }, [pinBtn]));
    qn.forEach(function (x) { body.appendChild(x.fs); });
    body.appendChild(el("div", { class: "row" }, [chk]));
    body.appendChild(fb);
    sec.appendChild(el("div", { class: "rd-grid" }, [doc, body]));
    var has = qs.filter(function (q) { return c.st.res[q.id] !== undefined; }).length;
    if (has && has < qs.length) { qs.forEach(function (q) { delete c.st.res[q.id]; }); c.score(); has = 0; }
    picks = qs.map(function (q) { var a = okLetter(c.st.ans[q.id]); return a || (has && c.st.res[q.id] === 1 ? q.answer : null); });
    if (has) show(false); else sync();
    return { node: sec, reset: reset, sync: sync, isGraded: function () { return graded; }, first: function () { return qn[0].opts[0].b; } };
  }

  BS.renderRead = function (ex, idx, st, uid) {
    var sets = ex.sets || [], rows = [], all = [];
    sets.forEach(function (s) { (s.questions || []).forEach(function (q) { all.push(q); }); });
    var c = makeCard(ex, idx, st, sets.length && sets[0].kind === "cloze" ? "Điền vào đoạn văn" : "Đọc hiểu và chọn đáp án", all);
    c.card.appendChild(el("p", { class: "muted rd-keys", text: "Phím 1, 2, 3, 4 chọn A, B, C, D trong một câu. Chọn hết các câu rồi bấm Kiểm tra." }));
    var qa = 1;
    sets.forEach(function (s, i) { var r = buildSet(s, i + 1, sets.length, qa, c, uid); qa += (s.questions || []).length; rows.push(r); c.card.appendChild(r.node); });
    addRedo(c, ex, all, rows, function () { return rows[0] && rows[0].first(); });
    return c.card;
  };
})();
