/* backup.js - sao luu / khoi phuc tien do (tep JSON hoac van ban dan). Khong goi mang, khong theo doi.
 * Logic thuan nam trong window.BSBackup (parse, merge, summarize) de kiem tra bang node.
 * Quy tac: dung doi tuong MOI theo danh sach cho phep; khoa la bi bo va dem; truong da biet sai kieu/vuot gioi han -> tu choi ca tep. */
(function () {
  "use strict";
  var MAX_BYTES = 1048576, REP_CAP = 60;
  var BAD = Object.create(null); BAD["__proto__"] = 1; BAD["constructor"] = 1; BAD["prototype"] = 1;
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function nul(o) { return Object.assign(Object.create(null), isObj(o) ? o : {}); }
  var UNIT_ID = /^[a-z0-9_-]{1,24}$/;
  var ITEM_ID = /^[A-Za-z0-9_.:-]{1,64}$/;
  var ONCE_KEY = /^[A-Za-z0-9_-]{1,24}(:[A-Za-z0-9_.-]{1,40}){2,3}$/;
  var DAY_RE = /^(\d{4})-(\d\d)-(\d\d)$/;

  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function keys(o) { return Object.keys(o); }
  function isDay(s) {
    if (typeof s !== "string") return false;
    var m = DAY_RE.exec(s);
    if (!m) return false;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1) return false;
    return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
  }
  function isInt(x, lo, hi) { return typeof x === "number" && isFinite(x) && Math.floor(x) === x && x >= lo && x <= hi; }

  function Fail(code, msg) { this.code = code; this.msg = msg; }
  function bad(path) { throw new Fail("SAI_CAU_TRUC", "Tệp không hợp lệ ở mục: " + path + "."); }

  var MSG = {
    QUA_LON: "Tệp quá lớn (tối đa 1 MB). Đây có vẻ không phải tệp sao lưu của trang này.",
    KHONG_PHAI_JSON: "Nội dung không đọc được. Hãy chọn đúng tệp sao lưu (.json) hoặc dán nguyên văn bản đã sao chép.",
    SAI_UNG_DUNG: "Tệp này không phải tệp sao lưu của Từng Bước English.",
    SAI_PHIEN_BAN: "Tệp sao lưu có phiên bản không được hỗ trợ.",
    KHONG_LUU_DUOC: "Không lưu được vào trình duyệt này (có thể đầy bộ nhớ hoặc đang ở chế độ riêng tư). Tiến độ cũ vẫn nguyên vẹn."
  };

  /* ---------- parse ---------- */
  function parse(text, todayKey) {
    var dropped = 0;
    function drop() { dropped++; }
    function fail(code) { return { ok: false, code: code, msg: MSG[code] }; }
    try {
      if (typeof text !== "string") return fail("KHONG_PHAI_JSON");
      if (text.length > MAX_BYTES) return fail("QUA_LON");
      var raw;
      try { raw = JSON.parse(text); } catch (e) { return fail("KHONG_PHAI_JSON"); }
      if (!isObj(raw)) return fail("KHONG_PHAI_JSON");
      if (raw.app !== "tungbuoc") return fail("SAI_UNG_DUNG");
      if (raw.format !== 1) return fail("SAI_PHIEN_BAN");
      var d = raw.data;
      if (!isObj(d)) bad("data");
      if (!isObj(d.units)) bad("data.units");
      var today = isDay(todayKey) ? todayKey : "9999-12-31";

      function known(o, allowed) {
        keys(o).forEach(function (k) { if (allowed.indexOf(k) < 0 || BAD[k]) drop(); });
      }
      function map(o, path, max, check) {
        if (!isObj(o)) bad(path);
        var ks = keys(o), out = {};
        if (ks.length > max) bad(path + " (quá " + max + " mục)");
        ks.forEach(function (k) {
          if (BAD[k] || !ITEM_ID.test(k)) { drop(); return; }
          out[k] = check(o[k], path + "." + k);
        });
        return out;
      }

      var out = { v: 1, prefs: {}, xp: { total: 0, days: {}, streak: { n: 0, best: 0, last: "" }, once: {} }, units: {} };
      known(d, ["v", "prefs", "xp", "units"]);

      if (d.prefs !== undefined) {
        if (!isObj(d.prefs)) bad("prefs");
        var p = d.prefs;
        known(p, ["theme", "goal", "autoSpeak", "noTimer", "edit", "mascot"]);
        if (p.theme !== undefined) { if (["auto", "light", "dark"].indexOf(p.theme) < 0) bad("prefs.theme"); out.prefs.theme = p.theme; }
        if (p.goal !== undefined) { if (p.goal !== 30 && p.goal !== 50 && p.goal !== 100) bad("prefs.goal"); out.prefs.goal = p.goal; }
        ["autoSpeak", "noTimer", "mascot"].forEach(function (k) {
          if (p[k] === undefined) return;
          if (p[k] !== 0 && p[k] !== 1) bad("prefs." + k);
          out.prefs[k] = p[k];
        });
      }

      if (d.xp !== undefined) {
        if (!isObj(d.xp)) bad("xp");
        var x = d.xp;
        known(x, ["total", "days", "streak", "once"]);
        if (x.total !== undefined) { if (!isInt(x.total, 0, 1e7)) bad("xp.total"); out.xp.total = x.total; }
        if (x.days !== undefined) {
          if (!isObj(x.days)) bad("xp.days");
          if (keys(x.days).length > 400) bad("xp.days (quá 400 ngày)");
          var dk = keys(x.days).filter(function (k) { if (BAD[k]) { drop(); return false; } return true; });
          dk.forEach(function (k) {
            if (!isDay(k)) bad("xp.days." + k);
            if (k > today) { drop(); return; } /* dong ho lech/lui: bo ngay tuong lai, khong tu choi tep */
            var e = x.days[k];
            if (!isObj(e)) bad("xp.days." + k);
            known(e, ["xp", "rep", "hit", "hitGoal"]);
            if (!isInt(e.xp, 0, 1e5)) bad("xp.days." + k + ".xp");
            var o = { xp: e.xp };
            if (e.rep !== undefined) { if (!isInt(e.rep, 0, REP_CAP)) bad("xp.days." + k + ".rep"); o.rep = e.rep; }
            if (e.hit !== undefined) { if (e.hit !== 0 && e.hit !== 1) bad("xp.days." + k + ".hit"); o.hit = e.hit; }
            if (e.hitGoal !== undefined) { if (e.hitGoal !== 30 && e.hitGoal !== 50 && e.hitGoal !== 100) bad("xp.days." + k + ".hitGoal"); o.hitGoal = e.hitGoal; }
            out.xp.days[k] = o;
          });
          /* toi da 400 khoa (da kiem o tren), roi cat con 60 ngay gan nhat */
          var sorted = keys(out.xp.days).sort();
          while (sorted.length > 60) delete out.xp.days[sorted.shift()];
        }
        if (x.streak !== undefined) {
          if (!isObj(x.streak)) bad("xp.streak");
          var s = x.streak;
          known(s, ["n", "best", "last"]);
          if (s.n !== undefined) { if (!isInt(s.n, 0, 36500)) bad("xp.streak.n"); out.xp.streak.n = s.n; }
          if (s.best !== undefined) { if (!isInt(s.best, 0, 36500)) bad("xp.streak.best"); out.xp.streak.best = s.best; }
          if (s.last !== undefined) {
            if (s.last !== "" && !isDay(s.last)) bad("xp.streak.last");
            out.xp.streak.last = s.last;
            if (s.last > today) { out.xp.streak.n = 0; out.xp.streak.last = ""; }
          }
        }
        if (x.once !== undefined) {
          if (!isObj(x.once)) bad("xp.once");
          var ok = keys(x.once);
          if (ok.length > 20000) bad("xp.once (quá 20000 mục)");
          ok.forEach(function (k) {
            if (BAD[k] || !ONCE_KEY.test(k)) { drop(); return; }
            if (x.once[k] !== 1) bad("xp.once." + k);
            out.xp.once[k] = 1;
          });
        }
      }

      var uids = keys(d.units);
      if (uids.length > 200) bad("units (quá 200 bài)");
      uids.forEach(function (id) {
        if (BAD[id] || !UNIT_ID.test(id)) { drop(); return; }
        var u = d.units[id], P = "units." + id;
        if (!isObj(u)) bad(P);
        known(u, ["known", "res", "scores", "ans", "last", "game", "srs"]);
        var ou = {};
        if (u.known !== undefined) ou.known = map(u.known, P + ".known", 2000, function (v, pp) { if (v !== 1) bad(pp); return 1; });
        if (u.res !== undefined) ou.res = map(u.res, P + ".res", 2000, function (v, pp) { if (v !== 0 && v !== 1) bad(pp); return v; });
        if (u.scores !== undefined) ou.scores = map(u.scores, P + ".scores", 2000, function (v, pp) {
          if (!isObj(v)) bad(pp);
          known(v, ["c", "t", "a"]);
          if (!isInt(v.c, 0, 1e6) || !isInt(v.t, 0, 1e6) || !isInt(v.a, 0, 1e6) || v.c > v.t || v.a > v.t) bad(pp);
          return { c: v.c, t: v.t, a: v.a };
        });
        if (u.ans !== undefined) ou.ans = map(u.ans, P + ".ans", 2000, function (v, pp) {
          if (typeof v === "boolean") return v;
          if (typeof v === "string") return v.length > 500 ? v.slice(0, 500) : v;
          if (isObj(v) && typeof v.t === "string") { known(v, ["t"]); return { t: v.t.length > 500 ? v.t.slice(0, 500) : v.t }; }
          bad(pp);
        });
        if (u.last !== undefined) {
          if (!isObj(u.last)) bad(P + ".last");
          known(u.last, ["tab", "card"]);
          ou.last = {};
          ["tab", "card"].forEach(function (k) {
            var v = u.last[k];
            if (v === undefined) return;
            if (typeof v === "string" && v.length <= 80) ou.last[k] = v;
            else if (isInt(v, 0, 1e6)) ou.last[k] = v;
            else bad(P + ".last." + k);
          });
        }
        if (u.game !== undefined) {
          if (!isObj(u.game)) bad(P + ".game");
          known(u.game, ["best", "bestCombo", "plays"]);
          ou.game = {};
          ["best", "bestCombo", "plays"].forEach(function (k) {
            var v = u.game[k];
            if (v === undefined) return;
            if (!isInt(v, 0, 1e7)) bad(P + ".game." + k);
            ou.game[k] = v;
          });
        }
        if (u.srs !== undefined) ou.srs = map(u.srs, P + ".srs", 2000, function (v, pp) {
          if (!isObj(v)) bad(pp);
          known(v, ["b", "d", "l", "w", "n"]);
          if (!isInt(v.b, 0, 5) || !isDay(v.d) || !isDay(v.l) || !isInt(v.w, 0, 1000) || !isInt(v.n, 0, 100000)) bad(pp);
          return { b: v.b, d: v.d, l: v.l, w: v.w, n: v.n };
        });
        out.units[id] = ou;
      });

      return { ok: true, data: out, dropped: dropped, summary: summarize(out) };
    } catch (e) {
      if (e instanceof Fail) return { ok: false, code: e.code, msg: e.msg };
      return { ok: false, code: "KHONG_PHAI_JSON", msg: MSG.KHONG_PHAI_JSON };
    }
  }

  /* ---------- tom tat ---------- */
  function summarize(st) {
    var r = { xp: 0, units: 0, cards: 0, streak: 0, best: 0 };
    if (!isObj(st)) return r;
    if (isObj(st.xp)) {
      r.xp = Number(st.xp.total) || 0;
      if (isObj(st.xp.streak)) { r.streak = Number(st.xp.streak.n) || 0; r.best = Number(st.xp.streak.best) || 0; }
    }
    if (isObj(st.units)) keys(st.units).forEach(function (id) {
      var u = st.units[id];
      if (!isObj(u)) return;
      var k = isObj(u.known) ? keys(u.known).length : 0;
      var any = k || (isObj(u.res) && keys(u.res).length) || (isObj(u.scores) && keys(u.scores).length) ||
        (isObj(u.srs) && keys(u.srs).length) || (isObj(u.game) && Number(u.game.plays) > 0);
      if (any) r.units++;
      r.cards += k;
    });
    return r;
  }

  /* ---------- gop (khong bao gio cong don) ---------- */
  function dmax(a, b) { a = Number(a) || 0; b = Number(b) || 0; return a > b ? a : b; }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(local, incoming) {
    local = isObj(local) ? local : {};
    incoming = isObj(incoming) ? incoming : {};
    var out = {};
    out.v = 1;
    out.prefs = isObj(local.prefs) ? copy(local.prefs) : {};
    var lx = isObj(local.xp) ? local.xp : {}, ix = isObj(incoming.xp) ? incoming.xp : {};
    var xp = { total: dmax(lx.total, ix.total), days: {}, streak: {}, once: {} };

    var ld = nul(lx.days), id = nul(ix.days);
    keys(ld).concat(keys(id)).forEach(function (k) {
      if (BAD[k] || has(xp.days, k)) return;
      var a = isObj(ld[k]) ? ld[k] : null, b = isObj(id[k]) ? id[k] : null;
      var pick = !a ? b : !b ? a : (Number(a.xp) || 0) >= (Number(b.xp) || 0) ? a : b;
      var e = copy(pick);
      if (e.rep !== undefined || (a && a.rep !== undefined) || (b && b.rep !== undefined)) e.rep = Math.min(REP_CAP, dmax(a && a.rep, b && b.rep));
      xp.days[k] = e;
    });
    var dkeys = keys(xp.days).sort();
    while (dkeys.length > 60) delete xp.days[dkeys.shift()];

    var ls = isObj(lx.streak) ? lx.streak : {}, is = isObj(ix.streak) ? ix.streak : {};
    var ll = typeof ls.last === "string" ? ls.last : "", il = typeof is.last === "string" ? is.last : "";
    var win = ll > il ? ls : il > ll ? is : ((Number(ls.n) || 0) >= (Number(is.n) || 0) ? ls : is);
    xp.streak = { n: Number(win.n) || 0, best: dmax(ls.best, is.best), last: ll > il ? ll : il };
    if (xp.streak.best < xp.streak.n) xp.streak.best = xp.streak.n;

    [lx.once, ix.once].forEach(function (o) {
      if (isObj(o)) keys(o).forEach(function (k) { if (!BAD[k]) xp.once[k] = 1; });
    });
    out.xp = xp;

    var lu = nul(local.units), iu = nul(incoming.units);
    out.units = {};
    keys(lu).concat(keys(iu)).forEach(function (uid) {
      if (BAD[uid] || has(out.units, uid)) return;
      out.units[uid] = mergeUnit(isObj(lu[uid]) ? lu[uid] : {}, isObj(iu[uid]) ? iu[uid] : {});
    });
    return out;
  }

  function sub(u, k) { return nul(u[k]); }
  function mergeUnit(a, b) {
    var o = {};
    o.known = {};
    [sub(a, "known"), sub(b, "known")].forEach(function (m) { keys(m).forEach(function (id) { if (!BAD[id]) o.known[id] = 1; }); });

    var ar = sub(a, "res"), br = sub(b, "res"), aa = sub(a, "ans"), ba = sub(b, "ans");
    o.res = {}; o.ans = {};
    keys(ar).concat(keys(br)).forEach(function (id) {
      if (BAD[id] || has(o.res, id)) return;
      var x = ar[id], y = br[id], useA;
      if (x === undefined) useA = false;
      else if (y === undefined) useA = true;
      else useA = x >= y;
      o.res[id] = useA ? x : y;
      var first = useA ? aa : ba, second = useA ? ba : aa;
      if (has(first, id)) o.ans[id] = copy(first[id]); else if (has(second, id)) o.ans[id] = copy(second[id]);
    });
    keys(aa).concat(keys(ba)).forEach(function (id) {
      if (BAD[id] || has(o.ans, id) || has(o.res, id)) return;
      o.ans[id] = copy(has(aa, id) ? aa[id] : ba[id]);
    });

    /* scores khoa theo id bai tap (ex.id), res khoa theo id cau hoi con (it.id): hai khong gian khoa khac nhau nen khong the "di cung ben"; giu luat lay ben co a lon hon (diem tot nhat) */
    var as = sub(a, "scores"), bs = sub(b, "scores");
    o.scores = {};
    keys(as).concat(keys(bs)).forEach(function (id) {
      if (BAD[id] || has(o.scores, id)) return;
      var x = as[id], y = bs[id];
      var pick = !isObj(y) ? x : !isObj(x) ? y : (Number(x.a) || 0) >= (Number(y.a) || 0) ? x : y;
      o.scores[id] = copy(pick);
    });

    var ag = sub(a, "game"), bg = sub(b, "game");
    o.game = { best: dmax(ag.best, bg.best), bestCombo: dmax(ag.bestCombo, bg.bestCombo), plays: dmax(ag.plays, bg.plays) };

    var asr = sub(a, "srs"), bsr = sub(b, "srs");
    o.srs = {};
    keys(asr).concat(keys(bsr)).forEach(function (id) {
      if (BAD[id] || has(o.srs, id)) return;
      var x = asr[id], y = bsr[id], pick;
      if (!isObj(y)) pick = x; else if (!isObj(x)) pick = y;
      else if (x.l !== y.l) pick = String(x.l) > String(y.l) ? x : y;
      else pick = (Number(x.b) || 0) <= (Number(y.b) || 0) ? x : y;
      o.srs[id] = copy(pick);
    });

    /* last: giu cua may; chi lay cua tep neu may chua co */
    o.last = keys(sub(a, "last")).length ? copy(a.last) : copy(sub(b, "last"));
    return o;
  }

  /* ---------- tep xuat ---------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function buildFile(state, now) {
    now = now || new Date();
    var data = copy(state);
    if (!isObj(data.prefs)) data.prefs = {};
    data.prefs.edit = 0;
    var stamp = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    return JSON.stringify({ app: "tungbuoc", format: 1, exported: stamp, data: data }, null, 1);
  }

  /* ghi cur vao .bak roi ap dung; neu ap dung that bai thi tra lai chuoi .bak cu (nguyen van) */
  function safeApply(storage, key, cur, apply) {
    var old = null, had = false;
    try { old = storage.getItem(key); had = old !== null; } catch (e) { /* bo qua */ }
    try { storage.setItem(key, JSON.stringify({ t: Date.now(), data: cur })); } catch (e2) { return false; }
    var ok = false;
    try { ok = apply() === true; } catch (e3) { ok = false; }
    if (!ok) {
      try { if (had) storage.setItem(key, old); else storage.removeItem(key); } catch (e4) { /* bo qua */ }
    }
    return ok;
  }

  window.BSBackup = { safeApply: safeApply, parse: parse, merge: merge, summarize: summarize, buildFile: buildFile, MESSAGES: MSG };

  /* ---------- giao dien ---------- */
  if (typeof document === "undefined") return;

  function ui() {
    var root = document.getElementById("backup-root");
    if (!root || !window.BS || root.getAttribute("data-mounted")) return;
    root.setAttribute("data-mounted", "1");
    var BS = window.BS, el = BS.el, BAK = BS.KEY + ".bak";

    if (!document.querySelector('link[href="assets/css/backup.css"]')) {
      var lk = document.createElement("link");
      lk.rel = "stylesheet"; lk.href = "assets/css/backup.css";
      document.head.appendChild(lk);
    }

    var errBox = el("p", { class: "bk-msg bk-err", role: "alert" });
    var okBox = el("p", { class: "bk-msg bk-ok", role: "status" });
    function showErr(m) { okBox.textContent = ""; errBox.textContent = m || ""; }
    function showOk(m) { errBox.textContent = ""; okBox.textContent = m || ""; }

    var mine = el("p", { class: "bk-mine" });
    function refreshMine() {
      var s = summarize(BS.exportState());
      mine.textContent = "Trên máy này: " + s.xp + " XP, " + s.units + " bài có tiến độ, " + s.cards + " thẻ đã thuộc, chuỗi " + s.streak + " ngày.";
    }

    /* xuat */
    var ta = el("textarea", { class: "bk-ta", readonly: true, rows: "5", "aria-label": "Văn bản sao lưu để sao chép", spellcheck: "false" });
    function fillExport() { ta.value = buildFile(BS.exportState()); return ta.value; }
    var dl = el("button", { type: "button", class: "btn bk-btn", text: "Tải tệp sao lưu" });
    dl.addEventListener("click", function () {
      try {
        var txt = fillExport();
        var blob = new Blob([txt], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "tungbuoc-tien-do-" + BS.dayKey() + ".json";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        showOk("Đã tạo tệp sao lưu. Hãy cất tệp ở nơi an toàn.");
      } catch (e) { showErr("Không tạo được tệp. Hãy dùng cách dự phòng bên dưới (sao chép văn bản)."); }
    });
    var cp = el("button", { type: "button", class: "btn bk-btn", text: "Sao chép" });
    cp.addEventListener("click", function () {
      fillExport();
      var done = function () { showOk("Đã sao chép. Hãy dán vào ghi chú hoặc tin nhắn cho chính bạn."); };
      var fallback = function () { ta.focus(); ta.select(); showOk("Văn bản đã được chọn sẵn, hãy dùng chức năng Sao chép của máy."); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fallback);
        else { ta.focus(); ta.select(); if (document.execCommand && document.execCommand("copy")) done(); else fallback(); }
      } catch (e) { fallback(); }
    });

    /* nhap */
    var panel = el("div", { class: "bk-panel" });
    var pending = null;
    var fileIn = el("input", { type: "file", id: "bk-file", class: "bk-file", accept: ".json,application/json" });
    var paste = el("textarea", { class: "bk-ta", id: "bk-paste", rows: "4", "aria-label": "Dán văn bản sao lưu", spellcheck: "false", placeholder: "Dán văn bản sao lưu vào đây" });
    var readPaste = el("button", { type: "button", class: "btn bk-btn", text: "Kiểm tra văn bản đã dán" });

    function handleText(text) {
      panel.textContent = "";
      pending = null;
      var r = parse(text, BS.dayKey());
      if (!r.ok) { showErr(r.msg); return; }
      pending = r;
      showOk("");
      renderPanel(r);
    }
    fileIn.addEventListener("change", function () {
      var f = fileIn.files && fileIn.files[0];
      panel.textContent = ""; pending = null;
      if (!f) return;
      if (f.size > MAX_BYTES) { showErr(MSG.QUA_LON); return; }
      var rd = new FileReader();
      rd.onerror = function () { showErr(MSG.KHONG_PHAI_JSON); };
      rd.onload = function () { handleText(String(rd.result)); };
      rd.readAsText(f);
    });
    readPaste.addEventListener("click", function () { handleText(paste.value); });

    function row(label, a, b) {
      return el("tr", null, [el("th", { scope: "row", text: label }), el("td", { text: String(a) }), el("td", { text: String(b) })]);
    }
    function renderPanel(r) {
      var f = r.summary, m = summarize(BS.exportState());
      var table = el("table", { class: "bk-table" }, [
        el("caption", { class: "bk-sr", text: "So sánh tiến độ trong tệp và trên máy này" }),
        el("thead", null, [el("tr", null, [el("th", { scope: "col", text: "Mục" }), el("th", { scope: "col", text: "Trong tệp" }), el("th", { scope: "col", text: "Trên máy này" })])]),
        el("tbody", null, [
          row("XP", f.xp, m.xp), row("Số bài có tiến độ", f.units, m.units),
          row("Thẻ đã thuộc", f.cards, m.cards), row("Chuỗi ngày", f.streak, m.streak)
        ])
      ]);
      var rMerge = el("input", { type: "radio", name: "bk-mode", id: "bk-m1", value: "merge", checked: true });
      var rRepl = el("input", { type: "radio", name: "bk-mode", id: "bk-m2", value: "replace" });
      var chk = el("input", { type: "checkbox", id: "bk-sure" });
      var chkRow = el("div", { class: "bk-opt bk-sure", hidden: true }, [chk, el("label", { for: "bk-sure", text: "Tôi hiểu tiến độ trên máy sẽ bị thay thế" })]);
      var go = el("button", { type: "button", class: "btn bk-btn bk-go", text: "Nhập" });
      function sync() {
        var rep = rRepl.checked;
        chkRow.hidden = !rep;
        go.disabled = rep && !chk.checked;
      }
      [rMerge, rRepl, chk].forEach(function (n) { n.addEventListener("change", sync); });
      sync();
      go.addEventListener("click", function () {
        if (go.disabled || !pending) return;
        var replace = rRepl.checked;
        var cur = BS.exportState();
        var next = replace ? pending.data : merge(cur, pending.data);
        if (!safeApply(localStorage, BAK, cur, function () { return BS.importState(next); })) { showErr(MSG.KHONG_LUU_DUOC); return; }
        var extra = pending.dropped ? " Đã bỏ qua " + pending.dropped + " mục không nhận ra." : "";
        panel.textContent = ""; pending = null; fileIn.value = ""; paste.value = "";
        showOk((replace ? "Đã thay thế toàn bộ tiến độ." : "Đã gộp tiến độ từ tệp (XP không bị cộng dồn).") + extra + " Bạn có thể hoàn tác lần nhập này.");
        refreshUndo(); refreshMine();
      });
      panel.appendChild(el("h4", { class: "bk-h", text: "Bước 2. So sánh" }));
      panel.appendChild(table);
      if (r.dropped) panel.appendChild(el("p", { class: "bk-note", text: "Đã bỏ qua " + r.dropped + " mục không nhận ra." }));
      panel.appendChild(el("h4", { class: "bk-h", text: "Bước 3. Chọn cách nhập" }));
      panel.appendChild(el("div", { class: "bk-opt" }, [rMerge, el("label", { for: "bk-m1", text: "Gộp (khuyên dùng): giữ phần tốt nhất của cả hai" })]));
      panel.appendChild(el("div", { class: "bk-opt" }, [rRepl, el("label", { for: "bk-m2", text: "Thay thế toàn bộ bằng nội dung tệp" })]));
      panel.appendChild(chkRow);
      panel.appendChild(el("h4", { class: "bk-h", text: "Bước 4. Nhập" }));
      panel.appendChild(go);
    }

    /* hoan tac */
    var undo = el("button", { type: "button", class: "btn bk-btn", text: "Hoàn tác lần nhập gần nhất", hidden: true });
    /* hai buoc: xem thoi diem -> xac nhan. Truoc khi khoi phuc, ban hien tai duoc ghi vao .bak nen hoan tac duoc lai (khong mat du lieu). */
    var undoBox = el("div", { class: "bk-panel" });
    function readBak() {
      try {
        var b = JSON.parse(localStorage.getItem(BAK));
        if (!b || !isObj(b.data)) return null;
        var r = parse(buildFile(b.data), BS.dayKey()); /* lam sach truoc khi nap vao importState */
        return r.ok ? { t: Number(b.t) || 0, data: r.data } : null;
      } catch (e) { return null; }
    }
    function fmtT(ms) {
      if (!ms) return "không rõ";
      var d = new Date(ms);
      return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
    function refreshUndo() { undo.hidden = !readBak(); }
    undo.addEventListener("click", function () {
      var b = readBak();
      undoBox.textContent = "";
      if (!b) { refreshUndo(); return; }
      var sm = summarize(b.data);
      var yes = el("button", { type: "button", class: "btn bk-btn bk-go", text: "Khôi phục bản này" });
      var no = el("button", { type: "button", class: "btn bk-btn", text: "Giữ nguyên" });
      no.addEventListener("click", function () { undoBox.textContent = ""; undo.focus(); });
      yes.addEventListener("click", function () {
        var cur = BS.exportState();
        if (!safeApply(localStorage, BAK, cur, function () { return BS.importState(b.data); })) { showErr(MSG.KHONG_LUU_DUOC); return; }
        undoBox.textContent = ""; panel.textContent = ""; pending = null;
        showOk("Đã khôi phục bản lúc " + fmtT(b.t) + ". Bản trước đó vẫn được cất, bạn có thể hoàn tác lại.");
        refreshUndo(); refreshMine();
      });
      undoBox.appendChild(el("p", { class: "bk-note", text: "Bản tự động cất lúc " + fmtT(b.t) + ": " + sm.xp + " XP, " + sm.units + " bài, " + sm.cards + " thẻ đã thuộc. Tiến độ hiện tại sẽ được thay thế bằng bản này (bản hiện tại được cất lại để hoàn tác)." }));
      undoBox.appendChild(el("div", { class: "bk-row" }, [yes, no]));
      yes.focus();
    });

    var alt = el("details", { class: "bk-alt" }, [
      el("summary", { text: "Cách khác (iPhone, iPad hoặc không tải được tệp)" }),
      el("p", { class: "bk-note", text: "Sao chép văn bản dưới đây, dán vào ghi chú để cất. Khi cần, dán lại vào ô nhập." }),
      ta, el("div", { class: "bk-row" }, [cp]),
      el("label", { class: "bk-lbl", for: "bk-paste", text: "Dán văn bản sao lưu để nhập" }),
      paste, el("div", { class: "bk-row" }, [readPaste])
    ]);
    alt.addEventListener("toggle", function () { if (alt.open) fillExport(); });

    var body = el("div", { class: "bk-body" }, [
      el("p", { class: "bk-note", text: "Tiến độ chỉ lưu trong trình duyệt này. Hãy sao lưu để chuyển sang máy khác hoặc phòng khi xóa dữ liệu trình duyệt. Tệp không chứa thông tin cá nhân." }),
      mine,
      el("h3", { class: "bk-h", text: "Xuất" }),
      el("div", { class: "bk-row" }, [dl]),
      el("h3", { class: "bk-h", text: "Nhập" }),
      el("p", { class: "bk-note", text: "Bước 1. Chọn tệp sao lưu (.json) hoặc dán văn bản ở mục Cách khác." }),
      el("label", { class: "bk-lbl", for: "bk-file", text: "Chọn tệp sao lưu" }),
      fileIn, alt, panel,
      el("div", { class: "bk-row" }, [undo]), undoBox,
      errBox, okBox
    ]);
    root.appendChild(el("details", { class: "fold bk" }, [el("summary", { text: "Sao lưu & khôi phục" }), body]));
    refreshMine(); refreshUndo();
    document.addEventListener("bs:import", refreshMine);
    document.addEventListener("bs:xp", refreshMine);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ui);
  else ui();
})();
