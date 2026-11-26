/* core.js - tien ich chung, luu tru localStorage (khoa tungbuoc.v1), XP/streak, che do bien tap, giong doc, HUD. Khong goi mang.
 * GIOI HAN XP:
 *  - XP lan dau (the thuoc +5, bai tap +10, nghe +5...) dung opts.once, chi nhan mot lan.
 *  - XP lap lai (tro choi, on lai the) dung opts.rep: tong toi da REP_CAP = 60 XP moi ngay; qua muc do cong 0 XP
 *    nhung van danh dau ngay hoc (streak) va giao dien van chay. Bo dem luu o xp.days[ngay].rep (them moi, tuong thich cu).
 *  - On lai the: moi the chi tinh XP mot lan moi ngay (once = uid:r:idThe:YYYY-MM-DD).
 *  - ?edit=1 chi co tac dung tren localhost / 127.0.0.1 / [::1] / file:. */
(function () {
  "use strict";
  var KEY = "tungbuoc.v1";
  var REP_CAP = 60;
  var DOC = typeof document !== "undefined" ? document : null;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? "" : v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }

  /* ---------- ngay (gio may, khong dung toISOString) ---------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function yesterdayKey() {
    var d = new Date();
    return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  }

  /* ---------- trang thai ---------- */
  function emptyState() { return { v: 1, units: {} }; }

  function num(x, def, min) {
    x = Number(x);
    if (!isFinite(x)) return def;
    return x < min ? min : x;
  }

  function normalize(o) {
    if (!isObj(o) || !isObj(o.units)) o = emptyState();
    o.v = 1;
    var p = isObj(o.prefs) ? o.prefs : (o.prefs = {});
    if (p.theme !== "light" && p.theme !== "dark") p.theme = "auto";
    p.edit = p.edit === 1 || p.edit === true ? 1 : 0;
    p.goal = (p.goal === 30 || p.goal === 50 || p.goal === 100) ? p.goal : 50;
    p.autoSpeak = p.autoSpeak === 0 || p.autoSpeak === false ? 0 : 1;
    p.noTimer = p.noTimer === 1 || p.noTimer === true ? 1 : 0;
    p.mascot = (p.mascot === 0 || p.mascot === false) ? 0 : 1;
    var x = isObj(o.xp) ? o.xp : (o.xp = {});
    x.total = num(x.total, 0, 0);
    if (!isObj(x.days)) x.days = {};
    if (!isObj(x.streak)) x.streak = {};
    x.streak.n = num(x.streak.n, 0, 0);
    x.streak.best = num(x.streak.best, 0, 0);
    if (typeof x.streak.last !== "string") x.streak.last = "";
    if (!isObj(x.once)) x.once = {};
    Object.keys(o.units).forEach(function (id) {
      if (!isObj(o.units[id])) o.units[id] = {};
      ensureUnit(o.units[id]);
    });
    return o;
  }

  function ensureUnit(u) {
    ["known", "res", "scores", "last", "ans", "game", "srs"].forEach(function (k) { if (!isObj(u[k])) u[k] = {}; });
    u.game.best = num(u.game.best, 0, 0);
    u.game.bestCombo = num(u.game.bestCombo, 0, 0);
    u.game.plays = num(u.game.plays, 0, 0);
    return u;
  }

  /* doc localStorage; null neu khong co/hong/khong doc duoc */
  function readStored() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (e) { return null; }
  }
  function load() { return readStored() || normalize(emptyState()); }
  var state = load();

  /* chep src vao target tai cho, giu nguyen tham chieu cac doi tuong long nhau (BS.state, BS.unit(id)) */
  function syncInto(target, src) {
    Object.keys(target).forEach(function (k) { if (!(k in src)) delete target[k]; });
    Object.keys(src).forEach(function (k) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") return;
      if (isObj(target[k]) && isObj(src[k])) syncInto(target[k], src[k]);
      else target[k] = src[k];
    });
  }
  /* doc lai tu localStorage (khi tab khac ghi, hoac trang quay lai tu bfcache); khong ghi gi */
  function reload(quiet) {
    var fresh = readStored();
    if (!fresh) return false;
    syncInto(state, fresh);
    if (!quiet) {
      applyTheme();
      try { document.documentElement.setAttribute("data-edit", state.prefs.edit ? "1" : "0"); } catch (e) { /* bo qua */ }
      var st = stats();
      emit("bs:xp", { gain: 0, total: st.total, today: st.today, goal: st.goal, hit: 0, reload: true });
      emit("bs:pref", { key: null, value: null, reload: true });
    }
    return true;
  }
  var saveFailShown = false;
  function announceSaveFail() {
    if (saveFailShown) return;
    try {
      if (!document.body) return;
      saveFailShown = true;
      announce("Không lưu được tiến độ trên trình duyệt này.");
    } catch (e) { /* bo qua */ }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { announceSaveFail(); return false; }
  }
  function unit(id) {
    var u = state.units[id];
    if (!isObj(u)) u = state.units[id] = {};
    return ensureUnit(u);
  }

  function emit(name, detail) {
    try {
      var ev;
      if (typeof CustomEvent === "function") ev = new CustomEvent(name, { detail: detail });
      else { ev = document.createEvent("CustomEvent"); ev.initCustomEvent(name, false, false, detail); }
      document.dispatchEvent(ev);
    } catch (e) { /* bo qua */ }
  }

  /* ---------- giao dien sang/toi ---------- */
  function applyTheme() {
    try {
      var root = document.documentElement, t = state.prefs.theme;
      if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
      else root.removeAttribute("data-theme");
    } catch (e) { /* bo qua */ }
  }
  function pref(key) { return state.prefs[key]; }
  function setPref(key, val) {
    state.prefs[key] = val;
    if (key === "theme") applyTheme();
    var hitNow = 0;
    if (key === "goal") hitNow = evalHit(state.xp.days[today()], val);
    save();
    emit("bs:pref", { key: key, value: val });
    if (hitNow) {
      var st = stats();
      emit("bs:xp", { gain: 0, total: st.total, today: st.today, goal: st.goal, hit: 1 });
      celebrate("Đạt mục tiêu hôm nay: " + val + " XP!");
    }
  }

  /* ---------- che do bien tap ---------- */
  function isLocalHost(h, proto) {
    h = String(h || "").toLowerCase();
    return proto === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
  }
  (function readEditParam() {
    try {
      var loc = window.location;
      if (isLocalHost(loc.hostname, loc.protocol)) {
        var q = new URLSearchParams(loc.search).get("edit");
        var want = q === "1" ? 1 : q === "0" ? 0 : null;
        if (want !== null && state.prefs.edit !== want) { state.prefs.edit = want; save(); }
      } else if (state.prefs.edit) { state.prefs.edit = 0; save(); }
    } catch (e) { /* bo qua */ }
    try { document.documentElement.setAttribute("data-edit", state.prefs.edit ? "1" : "0"); } catch (e2) { /* bo qua */ }
    applyTheme();
  })();
  function isEdit() { return state.prefs.edit === 1; }

  /* ---------- XP / streak ---------- */
  function today() { return dayKey(); }

  function pruneDays() {
    var days = state.xp.days, keys = Object.keys(days).sort();
    while (keys.length > 60) delete days[keys.shift()];
    var t = today(), once = state.xp.once;
    Object.keys(once).forEach(function (k) {
      var m = /:r:.*:(\d{4}-\d\d-\d\d)$/.exec(k);
      if (m && m[1] !== t) delete once[k];
    });
  }

  /* cap nhat day.hit/day.hitGoal theo goal; tra 1 neu vua dat (can chuc mung) */
  function evalHit(day, goal) {
    if (!isObj(day)) return 0;
    if (day.hit && day.hitGoal === undefined) day.hitGoal = goal;
    var top = num(day.hitGoal, 0, 0);
    if (day.xp >= goal) {
      day.hit = 1;
      if (goal > top) { day.hitGoal = goal; return 1; }
      return 0;
    }
    day.hit = 0;
    return 0;
  }

  function addXP(n, opts) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n <= 0) return 0;
    var once = opts && opts.once;
    var x = state.xp;
    if (once) {
      if (x.once[once]) return 0;
      x.once[once] = 1;
    }
    var t = today();
    var day = x.days[t];
    if (!isObj(day)) day = x.days[t] = { xp: 0, hit: 0 };
    if (opts && opts.rep) {
      var used = num(day.rep, 0, 0);
      n = Math.max(0, Math.min(n, REP_CAP - used));
      day.rep = used + n;
    }
    day.xp = num(day.xp, 0, 0) + n;
    x.total += n;

    var s = x.streak;
    if (s.last === t) { /* giu nguyen */ }
    else if (s.last === yesterdayKey()) s.n = s.n + 1;
    else if (s.last && s.last > t) { /* dong ho lui: giu n */ }
    else s.n = 1;
    s.last = t;
    if (s.n > s.best) s.best = s.n;

    var goal = state.prefs.goal;
    var hitNow = evalHit(day, goal);
    pruneDays();
    save();
    emit("bs:xp", { gain: n, total: x.total, today: day.xp, goal: goal, hit: hitNow });
    if (hitNow) celebrate("Đạt mục tiêu hôm nay: " + goal + " XP!");
    return n;
  }

  function stats() {
    var x = state.xp, t = today(), d = x.days[t];
    var tdy = isObj(d) ? num(d.xp, 0, 0) : 0;
    var goal = state.prefs.goal;
    var s = x.streak, st = 0;
    if (s.last === t || s.last === yesterdayKey()) st = s.n;
    return {
      total: x.total, today: tdy, goal: goal,
      repLeft: Math.max(0, REP_CAP - (isObj(d) ? num(d.rep, 0, 0) : 0)),
      pct: goal ? Math.min(100, Math.round(tdy * 100 / goal)) : 0,
      streak: st, best: s.best, hitToday: !!(isObj(d) && d.hit), studiedToday: s.last === t
    };
  }

  /* ---------- toast + phao giay ---------- */
  var liveTimer = null;
  function ensureLive() {
    var l = document.getElementById("bs-live");
    if (l) return { node: l, fresh: false };
    l = el("div", { id: "bs-live", class: "bs-toast", role: "status", "aria-live": "polite" });
    document.body.appendChild(l);
    return { node: l, fresh: true };
  }
  function announce(msg) {
    var r = ensureLive(), node = r.node;
    var show = function () {
      node.textContent = msg;
      if (liveTimer) clearTimeout(liveTimer);
      liveTimer = setTimeout(function () { node.textContent = ""; }, 3500);
    };
    if (r.fresh) setTimeout(show, 60); else show();
  }
  function celebrate(msg) {
    try {
      if (msg) announce(msg);
      if (window.BSFx && typeof window.BSFx.confetti === "function") window.BSFx.confetti();
    } catch (e) { /* bo qua */ }
  }

  /* ---------- giong doc (chi core.js cham speechSynthesis) ---------- */
  function enVoices() {
    try {
      if (!("speechSynthesis" in window)) return [];
      return window.speechSynthesis.getVoices().filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ""); });
    } catch (e) { return []; }
  }
  function hasVoice() { return enVoices().length > 0; }
  /* speak(text) | speak(text, rate) | speak(text, {rate, accent: "us"|"gb"|"au"}) */
  function speak(text, opts) {
    try {
      var s = window.speechSynthesis;
      if (!s || typeof SpeechSynthesisUtterance === "undefined") return false;
      var rate = 0.9, accent = "us";
      if (typeof opts === "number") rate = opts || 0.9;
      else if (isObj(opts)) {
        if (isFinite(Number(opts.rate)) && Number(opts.rate) > 0) rate = Number(opts.rate);
        if (opts.accent === "gb" || opts.accent === "au" || opts.accent === "us") accent = opts.accent;
      }
      cancelSeq();
      s.cancel();
      var m = new SpeechSynthesisUtterance(text);
      var tag = { us: "US", gb: "GB", au: "AU" }[accent];
      m.lang = "en-" + tag; m.rate = rate;
      var vs = enVoices();
      var re = new RegExp("^en[-_]" + tag + "$", "i");
      var pick = vs.filter(function (v) { return re.test(v.lang); })[0];
      if (!pick) pick = vs.filter(function (v) { return /^en[-_]US$/i.test(v.lang); })[0] || vs[0];
      if (!pick) m.lang = "en-US";
      if (pick) m.voice = pick;
      s.speak(m);
      return true;
    } catch (e) { return false; }
  }
  /* Giong cho mot accent ("us"|"gb"|"au"): { v: giong | null, exact: co dung accent khong }. Chi dung khi co giong en-*. */
  function pickVoice(accent) {
    var vs = enVoices(), tag = { us: "US", gb: "GB", au: "AU" }[accent] || "US";
    var re = new RegExp("^en[-_]" + tag + "$", "i");
    var v = vs.filter(function (x) { return re.test(x.lang); })[0];
    if (v) return { v: v, exact: true };
    return { v: vs.filter(function (x) { return /^en[-_]US$/i.test(x.lang); })[0] || vs[0] || null, exact: false };
  }
  /* Chon giong cho nhieu nguoi noi (Part 3/4): cast = [{ id, accent: "us"|"gb"|"au", gender: "m"|"f" }] -> [{ id, v, lang, pitch, matched }].
   * Xac dinh, chi phu thuoc danh sach giong. Gioi tinh doan theo TEN giong (+4 neu khop, -4 neu lech), roi accent dung (+2),
   * giong da dung cho nguoi truoc (-3), giong mac dinh (+1); hoa nhau thi theo thu tu danh sach. Giong "la" (Bells, Zarvox...) bi loai.
   * pitch 1.0 khi ten giong khop gioi tinh; nguoc lai 0.8 (nam) / 1.2 (nu). Hai nguoi cung giong + cung pitch: nguoi sau lech them 0.15.
   * lang luon theo accent yeu cau (Chrome Android bo qua voice nhung nghe theo lang). */
  var VOICE_F = /\b(female|woman|samantha|victoria|karen|moira|tessa|fiona|susan|hazel|zira|catherine|serena|kate|jenny|aria|sonia|libby|natasha|emma|ava|allison|amy|joanna|salli|kimberly|ivy|nicole|veena|heera|linda|michelle|ana|clara|molly)\b/i;
  var VOICE_M = /\b(male|daniel|alex|tom|oliver|david|mark|george|james|guy|ryan|william|rishi|aaron|arthur|gordon|thomas|brian|matthew|joey|justin|russell|eric|liam|christopher|steffan|prabhat|sean)\b/i;
  var VOICE_NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|princess|ralph|kathy|deranged|hysterical|pipe organ)\b/i;
  function voiceGender(v) {
    var n = String(v && v.name || "");
    return VOICE_F.test(n) ? "f" : VOICE_M.test(n) ? "m" : "";
  }
  function castVoices(cast) {
    var vs = enVoices().filter(function (v) { return !VOICE_NOVELTY.test(String(v.name || "")); });
    var out = [], used = [];
    (Array.isArray(cast) ? cast : []).forEach(function (c) {
      c = isObj(c) ? c : {};
      var accent = c.accent === "gb" || c.accent === "au" ? c.accent : "us", g = c.gender === "f" ? "f" : "m";
      var tag = { us: "US", gb: "GB", au: "AU" }[accent], re = new RegExp("^en[-_]" + tag + "$", "i"), best = null, bs = -1e9;
      vs.forEach(function (v) {
        var vg = voiceGender(v), sc = (vg ? (vg === g ? 4 : -4) : 0) + (re.test(v.lang || "") ? 2 : 0) + (used.indexOf(v) > -1 ? -3 : 0) + (v["default"] ? 1 : 0);
        if (sc > bs) { bs = sc; best = v; }
      });
      var matched = !!best && voiceGender(best) === g;
      var pitch = matched ? 1 : g === "f" ? 1.2 : 0.8;
      for (var k = 0; k < out.length; k++) {
        if (out[k].v === best && out[k].pitch === pitch) { pitch = Math.min(1.6, Math.max(0.5, Math.round((pitch + 0.15) * 100) / 100)); k = -1; }
      }
      if (best) used.push(best);
      out.push({ id: c.id, v: best, lang: "en-" + tag, pitch: pitch, matched: matched });
    });
    return out;
  }
  /* Doc mot day cau lien tiep (vd cau hoi, A, B, C): parts = [{ text, accent: "us"|"gb"|"au", pause: ms sau phan nay }].
   * opts: { rate, onend, onstop }. onend chi chay khi doc het (khong chay khi huy). onstop({ completed, started }) chay DUNG MOT LAN khi day ket thuc
   * vi bat ky ly do nao (doc het, huy tu ben ngoai, loi); started = da thay phan nao bat dau doc. Tra ve { cancel() } hoac null (khong ho tro / khong co phan nao).
   * Khong nem loi. Dat dong ho canh chung vi onend khong dang tin tren mot so ban Android; Chrome Android hay bo qua `voice`
   * nen moi phan dat them utterance.lang theo accent. Khong co giong rieng cho accent: dung chung giong, nang cao do (pitch) de phan biet. */
  var seqCur = null;
  function cancelSeq() {
    var c = seqCur;
    seqCur = null;
    if (c) c.stop();
  }
  function speakSeq(parts, opts) {
    try {
      var s = window.speechSynthesis;
      if (!s || typeof SpeechSynthesisUtterance === "undefined" || !Array.isArray(parts)) return null;
      var list = parts.filter(function (p) { return isObj(p) && typeof p.text === "string" && p.text.trim(); });
      if (!list.length) return null;
      var rate = isObj(opts) && isFinite(Number(opts.rate)) && Number(opts.rate) > 0 ? Number(opts.rate) : 0.9;
      var onend = isObj(opts) && typeof opts.onend === "function" ? opts.onend : null;
      var onstop = isObj(opts) && typeof opts.onstop === "function" ? opts.onstop : null;
      var started = false, stopped = false, completed = false;
      var cast = isObj(opts) && Array.isArray(opts.cast) ? castVoices(opts.cast) : null;
      cancelSeq();
      s.cancel();
      var i = 0, over = false, wd = 0, gap = 0;
      var h = { cancel: function () { if (seqCur === h) seqCur = null; h.stop(); },
        stop: function () {
          over = true; clearTimeout(wd); clearTimeout(gap);
          if (stopped) return;
          stopped = true;
          if (onstop) { try { onstop({ completed: completed, started: started }); } catch (e) { /* bo qua */ } }
        } };
      function finish(done) {
        if (over) return;
        completed = !!done;
        h.cancel();
        if (done && onend) { try { onend(); } catch (e) { /* bo qua */ } }
      }
      function next() {
        if (over) return;
        if (i >= list.length) { finish(true); return; }
        var p = list[i++], moved = false;
        function adv(bad) {
          if (moved || over) return;
          moved = true;
          clearTimeout(wd);
          if (bad) { finish(false); return; }
          var pause = isFinite(Number(p.pause)) ? Number(p.pause) : 700;
          if (i >= list.length) pause = 0;
          gap = setTimeout(next, pause);
        }
        try {
          var accent = p.accent === "gb" || p.accent === "au" ? p.accent : "us";
          var who = cast && p.who !== undefined ? cast.filter(function (c) { return c.id === p.who; })[0] : null;
          var m = new SpeechSynthesisUtterance(p.text), pk = who ? null : pickVoice(accent);
          m.lang = who ? who.lang : "en-" + { us: "US", gb: "GB", au: "AU" }[accent];
          m.rate = rate;
          if (who) { if (who.v) m.voice = who.v; m.pitch = who.pitch; }
          else if (pk.v) m.voice = pk.v;
          h.keep = m; /* giu tham chieu: Chrome co the nuot onend neu utterance bi don rac */
          if (pk && !pk.exact && accent !== "us") m.pitch = 1.2;
          m.onstart = function () { started = true; };
          m.onend = function () { started = true; adv(false); };
          m.onerror = function (ev) { var er = ev && ev.error; adv(er === "canceled" || er === "interrupted"); };
          /* neu onend khong ve: sang phan sau (khi do cac phan xep hang trong hang doi cua trinh duyet) */
          wd = setTimeout(function () { adv(false); }, 2500 + Math.round(p.text.length * 95 / rate));
          s.speak(m);
        } catch (e) { finish(false); }
      }
      seqCur = h;
      next();
      return h;
    } catch (e) { return null; }
  }
  function stopSpeak() {
    cancelSeq();
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* bo qua */ }
  }
  function onVoices(cb) {
    if (typeof cb !== "function") return;
    var live = true, tid = 0, ss = null;
    function run() { if (live) try { cb(hasVoice()); } catch (e) { /* bo qua */ } }
    run();
    try {
      if ("speechSynthesis" in window) {
        ss = window.speechSynthesis;
        ss.getVoices();
        if (typeof ss.addEventListener === "function") ss.addEventListener("voiceschanged", run);
      }
    } catch (e) { /* bo qua */ }
    tid = setTimeout(run, 800);
    /* tra ve ham huy dang ky (go lang nghe voiceschanged, huy hen gio); noi goi cu khong dung ket qua nen khong doi */
    return function () {
      live = false;
      if (tid) { clearTimeout(tid); tid = 0; }
      try { if (ss && typeof ss.removeEventListener === "function") ss.removeEventListener("voiceschanged", run); } catch (e) { /* bo qua */ }
    };
  }

  /* ---------- tien ich hien thi ---------- */
  function countUnverified(node) {
    var n = 0;
    (function walk(x) {
      if (!x || typeof x !== "object") return;
      if (Array.isArray(x)) { x.forEach(walk); return; }
      if (x.v && typeof x.v === "object" && x.v.status === "unverified") n++;
      Object.keys(x).forEach(function (k) { if (k !== "v") walk(x[k]); });
    })(node);
    return n;
  }

  function badgeUnverified(v) {
    if (!isEdit()) return null;
    if (!v || v.status !== "unverified") return null;
    return el("span", { class: "badge badge-warn", title: v.note || "Chưa kiểm tra", text: "Chưa kiểm tra" });
  }

  /* null khi khong co ban dich va khong o che do bien tap; noi goi phai bo the boc rong */
  function viLine(o) {
    var has = !(o.vi === null || o.vi === undefined || o.vi === "");
    if (!has && !isEdit()) return null;
    var box = el("span", { class: "vi" });
    if (!has) {
      box.appendChild(el("em", { class: "muted", text: "Chưa có bản dịch" }));
    } else {
      box.appendChild(document.createTextNode(o.vi));
      if (o.vi_added && isEdit()) box.appendChild(el("span", { class: "badge badge-info", text: "bản dịch bổ sung" }));
    }
    return box;
  }

  /* Ảnh .webp (kể cả có ?query/#hash) là ảnh 16:9; dùng chung cho .fig và ô ảnh của game. */
  function isWide(src) { return /\.webp(?:[?#]|$)/i.test(String(src || "")); }

  function img(src, alt) {
    var i = el("img", { src: src, alt: alt, class: "fig" + (isWide(src) ? " fig--wide" : "") });
    i.addEventListener("error", function () {
      var p = el("p", { class: "muted fig-missing", text: "(Chưa có ảnh: " + alt + ")" });
      if (i.parentNode) i.parentNode.replaceChild(p, i);
    });
    return i;
  }

  function norm(s) {
    return String(s === null || s === undefined ? "" : s).toLowerCase()
      .replace(/[’‘]/g, "'").replace(/\s+/g, " ").replace(/^[\s.,;:!?"]+|[\s.,;:!?"]+$/g, "").trim();
  }

  /* ---------- tien do unit / thanh tien do (dung cho home.js) ---------- */
  function unitProgress(id) {
    var u = window.BS_UNITS && window.BS_UNITS[id];
    if (!u) return { done: 0, total: 0, pct: 0 };
    var st = unit(id), total = 0, done = 0;
    (u.vocab || []).forEach(function (w) { total++; if (st.known[w.id]) done++; });
    (u.phrases || []).forEach(function (w) { total++; if (st.known[w.id]) done++; });
    (u.exercises || []).forEach(function (ex) {
      if (ex.type === "mc") { total++; if (st.res[ex.id] !== undefined) done++; }
      else if (ex.type === "conv") (ex.sets || []).forEach(function (se) { (se.questions || []).forEach(function (q) { total++; if (st.res[q.id] !== undefined) done++; }); });
      else (ex.items || []).forEach(function (it) { total++; if (st.res[it.id] !== undefined) done++; });
    });
    return { done: done, total: total, pct: total ? Math.round(done * 100 / total) : 0 };
  }

  function bar(pct, label) {
    return el("div", { class: "bar", role: "progressbar", "aria-label": label, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct) },
      [el("div", { class: "bar-fill", style: "width:" + pct + "%" })]);
  }

  /* ---------- xuat / nhap trang thai (sao luu) ---------- */
  function exportState() {
    var c = JSON.parse(JSON.stringify(state));
    if (!isObj(c.prefs)) c.prefs = {};
    c.prefs.edit = 0;
    return c;
  }
  /* cleanObj: doi tuong da qua kiem tra. Tra true neu da ap dung; false (khong doi state) neu khong ghi duoc */
  function importState(cleanObj) {
    var fresh;
    try { fresh = normalize(JSON.parse(JSON.stringify(cleanObj))); } catch (e) { return false; }
    try { fresh.prefs.edit = state.prefs.edit; } catch (e1) { /* bo qua */ }
    try { window.localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e2) { return false; }
    syncInto(state, fresh);
    applyTheme();
    try { document.documentElement.setAttribute("data-edit", state.prefs.edit ? "1" : "0"); } catch (e3) { /* bo qua */ }
    var st = stats();
    emit("bs:xp", { gain: 0, total: st.total, today: st.today, goal: st.goal, hit: 0, reload: true });
    emit("bs:pref", { key: null, value: null, reload: true });
    emit("bs:import", { ok: true });
    return true;
  }

  /* ---------- HUD ---------- */
  function effectiveDark() {
    var t = state.prefs.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    try { return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); } catch (e) { return false; }
  }

  function mountHud(root) {
    if (!root || root.getAttribute("data-mounted")) return;
    root.setAttribute("data-mounted", "1");
    root.classList.add("hud");
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Tiến độ học hằng ngày");

    var streakTxt = el("span", { class: "hud-streak-n" });
    var streak = el("span", { class: "hud-item hud-streak" }, [
      el("span", { "aria-hidden": "true", text: "🔥" }), " ",
      el("span", { class: "hud-sr", text: "Chuỗi học liên tiếp: " }), streakTxt
    ]);
    var xpTxt = el("span", { class: "hud-xp-n" });
    var fill = el("div", { class: "bar-fill" });
    var meter = el("div", { class: "hud-meter bar", role: "progressbar", "aria-label": "XP hôm nay",
      "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, [fill]);
    var xp = el("span", { class: "hud-item hud-xp" }, [
      el("span", { "aria-hidden": "true", text: "⚡" }), " ", xpTxt, meter
    ]);
    var goalBtns = {};
    var goalLbl = el("span", { class: "hud-goal-lbl", "aria-hidden": "true", text: "Mục tiêu/ngày:" });
    var goals = el("span", { class: "hud-goals", role: "group", "aria-label": "Mục tiêu mỗi ngày (XP)" });
    [30, 50, 100].forEach(function (g) {
      var b = el("button", { type: "button", class: "btn hud-btn", "aria-pressed": "false", "aria-label": "Mục tiêu " + g + " XP mỗi ngày", text: String(g) });
      b.addEventListener("click", function () { setPref("goal", g); });
      goalBtns[g] = b;
      goals.appendChild(b);
    });
    var themeBtn = el("button", { type: "button", class: "btn hud-btn hud-theme", "aria-pressed": "false" }, [
      el("span", { "aria-hidden": "true", class: "hud-theme-ic", text: "🌙" }),
      el("span", { class: "hud-theme-tx", text: " Tối" })
    ]);
    themeBtn.addEventListener("click", function () { setPref("theme", effectiveDark() ? "light" : "dark"); });

    function render() {
      var s = stats();
      streakTxt.textContent = s.streak + " ngày";
      streak.setAttribute("title", "Chuỗi ngày học liên tiếp (cao nhất: " + s.best + ")");
      xpTxt.textContent = s.today + "/" + s.goal + " XP";
      fill.style.width = s.pct + "%";
      meter.setAttribute("aria-valuenow", String(s.pct));
      meter.setAttribute("aria-valuetext", s.today + " trên " + s.goal + " XP");
      [30, 50, 100].forEach(function (g) { goalBtns[g].setAttribute("aria-pressed", s.goal === g ? "true" : "false"); });
      var dark = effectiveDark();
      themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
      themeBtn.setAttribute("aria-label", "Giao diện tối");
    }
    root.appendChild(streak);
    root.appendChild(xp);
    root.appendChild(el("span", { class: "hud-item hud-goalbox" }, [goalLbl, goals]));
    root.appendChild(themeBtn);
    render();
    document.addEventListener("bs:xp", render);
    document.addEventListener("bs:pref", render);
    try {
      if (window.matchMedia) {
        var mq = window.matchMedia("(prefers-color-scheme: dark)");
        if (mq.addEventListener) mq.addEventListener("change", render);
      }
    } catch (e) { /* bo qua */ }
  }

  window.BS = {
    el: el, state: state, save: save, unit: unit, countUnverified: countUnverified,
    badgeUnverified: badgeUnverified, viLine: viLine, img: img, isWide: isWide, norm: norm, KEY: KEY,
    dayKey: dayKey, addXP: addXP, stats: stats, pref: pref, setPref: setPref, isEdit: isEdit,
    speak: speak, speakSeq: speakSeq, castVoices: castVoices, stopSpeak: stopSpeak, hasVoice: hasVoice, onVoices: onVoices,
    reload: reload, exportState: exportState, importState: importState, REP_CAP: REP_CAP, celebrate: celebrate, mountHud: mountHud, unitProgress: unitProgress, bar: bar,
    render: {}
  };

  try {
    window.addEventListener("storage", function (e) { if (e.key === KEY || e.key === null) reload(); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) reload(); });
  } catch (e) { /* bo qua */ }

  function init() {
    try { if (document.body) ensureLive(); } catch (e) { /* bo qua */ }
    var hud = document.getElementById("hud");
    if (hud) mountHud(hud);
    var unv = document.getElementById("unv-total");
    if (unv) {
      var calcUnv = function () {
        var total = 0;
        Object.keys(window.BS_UNITS || {}).forEach(function (k) { total += countUnverified(window.BS_UNITS[k]); });
        unv.textContent = "Tổng số mục chưa kiểm tra: " + total;
        unv.hidden = total === 0;
      };
      calcUnv();
      document.addEventListener("bs:units", calcUnv);
    }
  }
  if (DOC) {
    if (DOC.readyState === "loading") DOC.addEventListener("DOMContentLoaded", init);
    else init();
  }
})();
