/* game.js - mini-game "Nghe & chon hinh" (BS.render.game). Khong goi mang, khong cham localStorage/speechSynthesis truc tiep. */
(function () {
  "use strict";

  var ROUNDS_PER_GAME = 10;
  var CHOICES = 4;
  var TIME_MS = 10000;

  /* ---------- ham thuan (co the test bang node) ---------- */
  function shuffle(arr, rnd) {
    var a = arr.slice(), i, j, t;
    rnd = rnd || Math.random;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Chon `n` anh nhieu khac anh dung, khong thuoc avoidImgs, khong trung nhau. */
  function pickDistractors(correctImg, avoidImgs, pool, rnd, n) {
    var seen = {}, cand = [];
    seen[correctImg] = true;
    (avoidImgs || []).forEach(function (x) { seen[x] = true; });
    (pool || []).forEach(function (p) {
      if (!seen[p]) { seen[p] = true; cand.push(p); }
    });
    return shuffle(cand, rnd).slice(0, n === undefined ? CHOICES - 1 : n);
  }

  function exById(u, id) {
    var list = u.exercises || [], i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* Tra ve doi tuong cau {en, vi?...} tu ref; null neu khong tim thay. */
  function resolveSentence(u, ref) {
    var i, ex, it;
    if (!ref) return null;
    if (ref.tip) {
      var tips = (u.focus && u.focus.tips) || [];
      for (i = 0; i < tips.length; i++) {
        if (tips[i].id === ref.tip) return (tips[i].examples || [])[ref.i] || null;
      }
      return null;
    }
    ex = exById(u, ref.ex);
    if (!ex) return null;
    if (ref.item) {
      var items = ex.items || [];
      for (i = 0; i < items.length; i++) if (items[i].id === ref.item) return items[i];
      return null;
    }
    var opts = ex.options || [];
    for (i = 0; i < opts.length; i++) if (opts[i].label === ex.answer) return opts[i];
    return null;
  }

  function avoidImages(u, avoid) {
    var out = [];
    (avoid || []).forEach(function (id) {
      var ex = exById(u, id);
      if (ex && ex.image) out.push(ex.image);
    });
    return out;
  }

  /* Chon toi da n vong, moi anh dung toi da maxPer vong, khong lien tiep cung anh dung neu co the. */
  function pickRounds(rounds, n, rnd, maxPer) {
    maxPer = maxPer || 2;
    var cnt = {}, chosen = [];
    shuffle(rounds, rnd).forEach(function (r) {
      if (chosen.length >= n) return;
      if ((cnt[r.img] || 0) >= maxPer) return;
      cnt[r.img] = (cnt[r.img] || 0) + 1;
      chosen.push(r);
    });
    /* sap xep lai de tranh hai vong lien tiep cung dap an */
    var out = [], rest = chosen.slice();
    while (rest.length) {
      var prev = out.length ? out[out.length - 1].img : null, k = -1, best = 0, i, c = {};
      rest.forEach(function (r) { c[r.img] = (c[r.img] || 0) + 1; });
      for (i = 0; i < rest.length; i++) {
        if (rest[i].img !== prev && c[rest[i].img] > best) { best = c[rest[i].img]; k = i; }
      }
      if (k < 0) k = 0;
      out.push(rest.splice(k, 1)[0]);
    }
    return out;
  }

  function gainFor(combo) {
    return 2 + (combo >= 5 ? 2 : combo >= 3 ? 1 : 0);
  }

  /* Lop CSS cho luoi hinh theo cfg.ratio ("16:9" cho anh nen 16:9); moi gia tri khac giu 4:3. */
  function gridClass(cfg) {
    return "game-grid" + (cfg && cfg.ratio === "16:9" ? " game-grid--16x9" : "");
  }

  var api = { gridClass: gridClass, shuffle: shuffle, pickDistractors: pickDistractors, resolveSentence: resolveSentence,
    avoidImages: avoidImages, pickRounds: pickRounds, gainFor: gainFor, ROUNDS_PER_GAME: ROUNDS_PER_GAME };

  if (typeof window === "undefined") return;
  window.BSGame = api;
  if (!window.BS || typeof document === "undefined") return;

  var BS = window.BS, el = BS.el;
  BS.render = BS.render || {};

  /* ---------- giao dien ---------- */
  BS.render.game = function (u, root) {
    var uid = u.id;
    var cfg = window.BS_GAMES && window.BS_GAMES[uid];
    root.textContent = "";
    if (!cfg || !cfg.rounds || !cfg.rounds.length) {
      root.appendChild(el("p", { class: "card", role: "status", text: "Trò chơi cho bài này đang được chuẩn bị." }));
      return;
    }

    var rounds = cfg.rounds.map(function (r) {
      return { img: r.img, sent: resolveSentence(u, r.ref), avoid: avoidImages(u, r.avoid) };
    }).filter(function (r) { return r.sent && r.sent.en; });
    var pool = [];
    rounds.forEach(function (r) { if (pool.indexOf(r.img) < 0) pool.push(r.img); });

    var voiceOK = BS.hasVoice();
    var S = null; /* trang thai van choi */
    var timer = null;

    var wrap = el("div", { class: "game" });
    root.appendChild(wrap);

    BS.onVoices(function (ok) {
      var changed = ok !== voiceOK;
      voiceOK = ok; /* chi ap dung tu cau sau; khong doi che do giua mot cau */
      if (changed && !S) renderStart();
    });

    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function panelVisible() { return !root.hidden; }

    /* ----- man hinh bat dau ----- */
    function renderStart() {
      stopTimer();
      S = null;
      BS.stopSpeak();
      wrap.textContent = "";
      var g = BS.unit(uid).game;
      var noTimer = el("input", { type: "checkbox", id: "game-notimer", class: "game-check" });
      noTimer.checked = !!BS.pref("noTimer");
      noTimer.addEventListener("change", function () { BS.setPref("noTimer", noTimer.checked ? 1 : 0); });
      wrap.appendChild(el("section", { class: "card game-card" }, [
        el("h2", { text: "Nghe & chọn hình" }),
        el("p", { text: voiceOK
          ? "Nghe một câu tiếng Anh rồi chọn hình mô tả đúng. Bạn có 10 giây cho mỗi câu. Dùng phím 1–4 để chọn nhanh."
          : "Thiết bị của bạn chưa có giọng đọc tiếng Anh, nên đây là chế độ “Đọc & chọn hình”: đọc câu rồi chọn hình mô tả đúng. Dùng phím 1–4 để chọn nhanh." }),
        el("p", { class: "game-a11y", text: "Trò chơi này cần nhìn hình. Nếu bạn dùng trình đọc màn hình, hãy luyện ở tab Bài tập." }),
        el("p", { class: "game-rules muted", text: "Mỗi câu đúng được 2 XP; đúng liên tiếp 3 câu thêm 1 XP, 5 câu thêm 2 XP. Hoàn thành ván được thêm 10 XP. Mỗi ngày tối đa 60 XP từ trò chơi và ôn lại thẻ; vẫn tính chuỗi học." }),
        el("label", { class: "game-toggle", for: "game-notimer" }, [noTimer, " Không giới hạn thời gian"]),
        el("p", { class: "game-best muted", text: "Điểm cao nhất: " + g.best + "/" + Math.min(ROUNDS_PER_GAME, rounds.length) +
          " · Combo cao nhất: " + g.bestCombo + " · Số ván đã chơi: " + g.plays }),
        el("button", { type: "button", class: "btn btn-primary game-btn", text: "Bắt đầu chơi", onclick: startGame })
      ]));
    }

    function startGame() {
      var order = pickRounds(rounds, ROUNDS_PER_GAME, Math.random, 2);
      S = { order: order, idx: 0, score: 0, combo: 0, maxCombo: 0, xp: 0, answered: false, paused: false,
        remaining: TIME_MS, opts: null, total: order.length, voice: voiceOK };
      renderQuestion(false);
    }

    function buildOpts(r) {
      var d = pickDistractors(r.img, r.avoid, pool, Math.random, CHOICES - 1);
      return shuffle([r.img].concat(d));
    }

    /* ----- 1 cau hoi ----- */
    var ui = {};
    function renderQuestion(keepState) {
      stopTimer();
      var r = S.order[S.idx];
      if (!keepState || !S.opts) { S.voice = voiceOK; S.opts = buildOpts(r); S.answered = false; S.remaining = TIME_MS; S.paused = false; }
      wrap.textContent = "";

      var head = el("div", { class: "game-head" }, [
        el("span", { class: "game-count", text: "Câu " + (S.idx + 1) + "/" + S.total }),
        el("span", { class: "game-combo", text: "Combo: " + S.combo }),
        el("span", { class: "game-xp", text: "XP: " + S.xp })
      ]);
      var fill = el("div", { class: "bar-fill game-time-fill" });
      var bar = el("div", { class: "bar game-time", role: "progressbar", "aria-label": "Thời gian còn lại",
        "aria-valuemin": "0", "aria-valuemax": String(TIME_MS / 1000), "aria-valuenow": String(TIME_MS / 1000) }, [fill]);
      var timeTx = el("span", { class: "game-time-tx muted" });

      var sentBox = el("div", { class: "game-sent", lang: "en" });
      var listenBtn = el("button", { type: "button", class: "btn game-btn", onclick: function () { say(); } },
        [el("span", { "aria-hidden": "true", text: "🔊" }), " Nghe lại"]);
      var prompt = el("div", { class: "game-prompt" }, [
        el("p", { class: "game-q", id: "game-q", text: S.voice ? "Nghe câu và chọn hình đúng." : "Đọc câu và chọn hình đúng." })
      ]);
      if (S.voice) prompt.appendChild(listenBtn);
      prompt.appendChild(sentBox);

      var grid = el("div", { class: gridClass(cfg), role: "group", "aria-labelledby": "game-q" });
      ui.opts = S.opts.map(function (src, i) {
        var b = el("button", { type: "button", class: "game-opt", "aria-keyshortcuts": String(i + 1), "aria-label": "Hình " + (i + 1),
          onclick: function () { choose(i); } }, [
          el("span", { class: "game-num", "aria-hidden": "true", text: String(i + 1) }),
          el("img", { src: src, alt: "Hình " + (i + 1), draggable: "false" }),
          el("span", { class: "game-mark", "aria-hidden": "true" })
        ]);
        grid.appendChild(b);
        return b;
      });

      var fb = el("p", { class: "game-fb", role: "status" });
      var next = el("button", { type: "button", class: "btn btn-primary game-btn game-next", hidden: true,
        text: S.idx + 1 >= S.total ? "Xem kết quả" : "Câu tiếp ›", onclick: nextQ });
      var pauseBox = el("div", { class: "game-pause", hidden: true }, [
        el("p", { text: "Trò chơi đang tạm dừng." }),
        el("button", { type: "button", class: "btn btn-primary game-btn", text: "Tiếp tục", onclick: resume })
      ]);
      var noTimer = BS.pref("noTimer");
      var timeRow = el("div", { class: "game-timerow" }, noTimer ? [timeTx] : [bar, timeTx]);

      wrap.appendChild(el("section", { class: "card game-card" }, [head, timeRow, prompt, grid, fb, next, pauseBox,
        el("button", { type: "button", class: "btn game-btn game-quit", text: "Thoát ván", onclick: function () { renderStart(); } })]));

      ui.fill = fill; ui.bar = bar; ui.timeTx = timeTx; ui.fb = fb; ui.next = next; ui.sent = sentBox;
      ui.pause = pauseBox; ui.grid = grid; ui.listen = listenBtn; ui.timeRow = timeRow;
      ui.lastSec = -1;

      if (S.answered) { showResult(S.picked, true); return; }
      paintTime();
      if (noTimer) timeTx.textContent = "Không giới hạn thời gian";
      if (!S.voice) showSentence();
      else if (!keepState) say();
      if (S.paused) setPaused(true); else startTimer();
    }

    function showSentence() {
      ui.sent.textContent = "";
      var r = S.order[S.idx];
      ui.sent.appendChild(el("p", { class: "game-en", text: r.sent.en }));
    }

    function say() {
      var r = S.order[S.idx];
      if (!BS.speak(r.sent.en, { rate: 0.9 })) {
        voiceOK = false; S.voice = false;
        if (ui.listen && ui.listen.parentNode) ui.listen.parentNode.removeChild(ui.listen);
        var q = document.getElementById("game-q");
        if (q) q.textContent = "Đọc câu và chọn hình đúng.";
        showSentence();
      }
    }

    /* ----- dong ho ----- */
    function paintTime() {
      var sec = Math.ceil(S.remaining / 1000);
      ui.fill.style.width = Math.max(0, S.remaining * 100 / TIME_MS) + "%";
      if (sec !== ui.lastSec) {
        ui.lastSec = sec;
        ui.bar.setAttribute("aria-valuenow", String(sec));
        ui.bar.setAttribute("aria-valuetext", "Còn " + sec + " giây");
        if (!BS.pref("noTimer")) ui.timeTx.textContent = sec + " giây";
      }
    }

    function startTimer() {
      stopTimer();
      if (BS.pref("noTimer") || S.answered) return;
      var last = Date.now();
      timer = setInterval(function () {
        var now = Date.now();
        S.remaining -= now - last;
        last = now;
        if (S.remaining <= 0) { S.remaining = 0; paintTime(); stopTimer(); answer(-1); }
        else paintTime();
      }, 100);
    }

    function setPaused(p) {
      S.paused = p;
      ui.pause.hidden = !p;
      ui.grid.hidden = p;
      if (p) stopTimer();
    }
    function pauseGame() {
      if (!S || S.answered || S.paused) return;
      BS.stopSpeak();
      setPaused(true);
    }
    function resume() {
      if (!S || !S.paused) return;
      setPaused(false);
      startTimer();
      if (S.voice) say();
      if (ui.opts && ui.opts[0]) ui.opts[0].focus();
    }

    /* ----- tra loi ----- */
    function choose(i) {
      if (!S || S.answered || S.paused) return;
      answer(i);
    }

    function answer(i) {
      if (S.answered) return;
      stopTimer();
      BS.stopSpeak();
      var r = S.order[S.idx];
      var right = i >= 0 && S.opts[i] === r.img;
      S.answered = true; S.picked = i; S.right = right;
      if (right) {
        S.combo++;
        if (S.combo > S.maxCombo) S.maxCombo = S.combo;
        S.score++;
        var g = gainFor(S.combo);
        S.gain = BS.addXP(g, { rep: true }) || 0;
        if (S.gain < g) S.capped = true;
        S.xp += S.gain;
      } else {
        S.combo = 0;
        S.gain = 0;
      }
      showResult(i, false);
    }

    function showResult(i, restore) {
      var r = S.order[S.idx];
      ui.opts.forEach(function (b, k) {
        b.disabled = true;
        var isRight = S.opts[k] === r.img;
        if (isRight) { b.classList.add("is-ok"); b.querySelector(".game-mark").textContent = "✓"; }
        else if (k === i) { b.classList.add("is-bad"); b.querySelector(".game-mark").textContent = "✗"; }
      });
      var correctNo = S.opts.indexOf(r.img) + 1;
      var msg;
      if (S.right) msg = "Chính xác! +" + S.gain + " XP" + (S.combo >= 3 ? " (combo " + S.combo + ")" : "");
      else if (i < 0) msg = "Hết giờ! Đáp án đúng là Hình " + correctNo + ".";
      else msg = "Chưa đúng. Đáp án đúng là Hình " + correctNo + ".";
      ui.fb.textContent = msg;
      ui.fb.className = "game-fb " + (S.right ? "is-ok" : "is-bad");
      showSentence();
      var vi = BS.viLine(r.sent);
      if (vi) ui.sent.appendChild(el("p", { class: "game-vi" }, [vi]));
      var head = wrap.querySelector(".game-combo");
      if (head) head.textContent = "Combo: " + S.combo;
      var hx = wrap.querySelector(".game-xp");
      if (hx) hx.textContent = "XP: " + S.xp;
      ui.next.hidden = false;
      if (!restore) ui.next.focus();
    }

    function nextQ() {
      if (!S || !S.answered) return;
      S.idx++;
      if (S.idx >= S.total) { finish(); return; }
      S.opts = null;
      renderQuestion(false);
    }

    /* ----- ket thuc van ----- */
    function finish() {
      stopTimer();
      BS.stopSpeak();
      var bonus = BS.addXP(10, { rep: true }) || 0;
      var capped = S.capped || bonus < 10 || BS.stats().repLeft <= 0;
      S.xp += bonus;
      var g = BS.unit(uid).game;
      var newBest = S.score > g.best;
      if (newBest) g.best = S.score;
      if (S.maxCombo > g.bestCombo) g.bestCombo = S.maxCombo;
      g.plays++;
      BS.save();
      var res = S;
      wrap.textContent = "";
      var shareNote = el("p", { class: "muted game-sharenote", role: "status", "aria-live": "polite" });
      function shareBtn(r) {
        var canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
        var canCopy = typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function";
        if (!canShare && !canCopy) return null;
        var text = "Mình đúng " + r.score + "/" + r.total + " câu Nghe & chọn hình trên Từng Bước English";
        var url = location.origin + location.pathname;
        if (/^https?:/.test(location.protocol)) text += " " + url;
        return el("button", { type: "button", class: "btn game-btn", text: "Chia sẻ kết quả", onclick: function () {
          function copy() {
            if (!canCopy) return;
            navigator.clipboard.writeText(text).then(function () { shareNote.textContent = "Đã chép"; },
              function () { shareNote.textContent = "Không chép được."; });
          }
          if (canShare) {
            var p;
            try { p = navigator.share({ title: "Từng Bước English", text: text }); } catch (e) { copy(); return; }
            if (p && p.catch) p.catch(function (err) { if (!err || err.name !== "AbortError") copy(); });
          } else copy();
        } });
      }
      var again = el("button", { type: "button", class: "btn btn-primary game-btn", text: "Chơi lại", onclick: startGame });
      wrap.appendChild(el("section", { class: "card game-card game-end" }, [
        el("h2", { text: "Kết thúc ván chơi" }),
        el("p", { class: "game-score", text: "Bạn đúng " + res.score + "/" + res.total + " câu." + (newBest ? " Đây là điểm cao nhất của bạn!" : "") }),
        el("ul", { class: "game-sum" }, [
          el("li", { text: "Combo cao nhất: " + res.maxCombo }),
          el("li", { text: "XP nhận được: " + res.xp + " (gồm " + bonus + " XP hoàn thành ván)" }),
          el("li", { text: "Điểm cao nhất: " + g.best + "/" + res.total })
        ]),
        capped ? el("p", { class: "muted game-capnote", role: "status", text: "Bạn đã đạt giới hạn XP hôm nay (60 XP), vẫn tính chuỗi học." }) : null,
        again,
        shareBtn(res),
        shareNote,
        el("button", { type: "button", class: "btn game-btn", text: "Về màn hình chính", onclick: renderStart })
      ]));
      S = null;
      again.focus();
    }

    /* ----- su kien toan cuc ----- */
    document.addEventListener("bs:tab", function (e) {
      var t = e && e.detail && e.detail.tab;
      if (t !== "game") pauseGame();
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) pauseGame(); });
    window.addEventListener("pagehide", pauseGame);
    document.addEventListener("keydown", function (e) {
      if (!S || !panelVisible() || e.ctrlKey || e.metaKey || e.altKey) return;
      var tg = e.target && e.target.tagName;
      if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") return;
      if (e.key >= "1" && e.key <= "4") {
        if (S.answered || S.paused) return;
        e.preventDefault();
        choose(Number(e.key) - 1);
      }
    });

    renderStart();
  };
})();
