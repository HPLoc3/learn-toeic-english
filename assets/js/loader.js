/* loader.js - nap du lieu unit theo yeu cau (data/<id>.js, data/<id>-game.js; hoat hinh nap rieng bang loadAnim). Khong goi mang ngoai.
 * Chi nap id co trong BS_CATALOG, khop ^[a-z0-9-]+$ va available:true (localhost + che do bien tap: xem truoc ca unit chua mo).
 * API: BS.catalogUnit(id), BS.availableUnits(), BS.loadUnit(id, cb(u|null, err)), BS.loadUnits(ids, cb(map)),
 * BS.loadAnim(id, cb(def|null, err)) (chi khi catalog anim === true; animKind "scenes" nap anim-scenes.js, con lai nap engine/rig/cast). Phat su kien bs:units. */
(function () {
  "use strict";
  var BS = window.BS;
  if (!BS) return;
  var ID_RE = /^[a-z0-9-]+$/;
  var TIMEOUT = 10000;
  var pending = {}; /* id -> [callbacks] */

  function catalogUnit(id) {
    if (typeof id !== "string" || !ID_RE.test(id)) return null;
    var parts = (window.BS_CATALOG && window.BS_CATALOG.parts) || [];
    for (var i = 0; i < parts.length; i++) {
      var us = parts[i].units || [];
      for (var j = 0; j < us.length; j++) if (us[j].id === id) return us[j];
    }
    return null;
  }
  function availableUnits() {
    var out = [];
    ((window.BS_CATALOG && window.BS_CATALOG.parts) || []).forEach(function (p) {
      (p.units || []).forEach(function (u) { if (u.available && ID_RE.test(u.id || "")) out.push(u); });
    });
    return out;
  }
  function allowed(entry) {
    return !!entry && (entry.available === true || BS.isEdit());
  }
  function emitUnits(id, ok) {
    try {
      var ev, d = { id: id, ok: ok };
      if (typeof CustomEvent === "function") ev = new CustomEvent("bs:units", { detail: d });
      else { ev = document.createEvent("CustomEvent"); ev.initCustomEvent("bs:units", false, false, d); }
      document.dispatchEvent(ev);
    } catch (e) { /* bo qua */ }
  }
  function finish(id, ok, err) {
    var cbs = pending[id] || [];
    delete pending[id];
    var u = ok ? window.BS_UNITS[id] : null;
    emitUnits(id, ok);
    cbs.forEach(function (cb) { try { cb(u, ok ? null : err); } catch (e) { /* bo qua */ } });
  }
  function addScript(src, onload, onerror) {
    var s = document.createElement("script");
    s.async = false;
    s.src = src;
    s.onload = onload;
    s.onerror = onerror;
    document.head.appendChild(s);
  }

  function loadUnit(id, cb) {
    cb = typeof cb === "function" ? cb : function () {};
    var entry = catalogUnit(id);
    if (!entry || !allowed(entry)) { setTimeout(function () { cb(null, "not-found"); }, 0); return; }
    if (window.BS_UNITS && window.BS_UNITS[id]) { setTimeout(function () { cb(window.BS_UNITS[id], null); }, 0); return; }
    if (pending[id]) { pending[id].push(cb); return; }
    pending[id] = [cb];
    var files = ["data/" + id + ".js"];
    if (entry.game === true) files.push("data/" + id + "-game.js");
    var left = files.length, finished = false, timer = null;
    function end(ok, err) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      finish(id, ok, err);
    }
    function step() {
      left--;
      if (left === 0) {
        if (window.BS_UNITS && window.BS_UNITS[id]) end(true); else end(false, "missing");
      }
    }
    timer = setTimeout(function () { end(false, "timeout"); }, TIMEOUT);
    files.forEach(function (f, i) {
      addScript(f, step, function () {
        /* chi file du lieu chinh la bat buoc; game loi thi van mo bai */
        if (i === 0) end(false, "load-error"); else step();
      });
    });
  }

  function loadUnits(ids, cb) {
    cb = typeof cb === "function" ? cb : function () {};
    ids = Array.isArray(ids) ? ids : [];
    var res = {}, n = ids.length;
    if (!n) { setTimeout(function () { cb(res); }, 0); return; }
    ids.forEach(function (id) {
      loadUnit(id, function (u) {
        res[id] = u;
        if (--n === 0) cb(res);
      });
    });
  }

  /* ---- hoat hinh: nap rieng khi mo tab; moi kind (rig | scenes) co danh sach chung, trang thai va hang doi rieng ---- */
  var ANIM_SHARED = {
    rig: ["assets/js/anim-engine.js", "assets/js/anim-rig.js", "assets/js/anim-cast.js"],
    scenes: ["assets/js/anim-scenes.js"]
  };
  var kindReady = {
    rig: function () { return !!(window.BSAnim && window.BSRig); },
    scenes: function () { return !!window.BSScenes; }
  };
  var shared = {}; /* kind -> { state: null|"loading"|"ok", wait: [] } */
  var animPending = {}; /* id -> [callbacks] */

  function animKind(entry) { return entry && entry.animKind === "scenes" ? "scenes" : "rig"; }

  function loadShared(kind, cb) {
    var st = shared[kind] || (shared[kind] = { state: null, wait: [] });
    if (st.state === "ok") { cb(true); return; }
    st.wait.push(cb);
    if (st.state === "loading") return;
    st.state = "loading";
    var files = ANIM_SHARED[kind], left = files.length, bad = false;
    function one(ok) {
      if (!ok) bad = true;
      if (--left > 0) return;
      st.state = (!bad && kindReady[kind]()) ? "ok" : null; /* loi thi cho phep thu lai */
      var w = st.wait; st.wait = [];
      w.forEach(function (f) { f(st.state === "ok"); });
    }
    files.forEach(function (f) { addScript(f, function () { one(true); }, function () { one(false); }); });
  }

  function loadAnim(id, cb) {
    cb = typeof cb === "function" ? cb : function () {};
    var entry = catalogUnit(id);
    if (!entry || !allowed(entry) || entry.anim !== true) { setTimeout(function () { cb(null, "not-found"); }, 0); return; }
    var kind = animKind(entry);
    if (window.BS_ANIMS && window.BS_ANIMS[id] && shared[kind] && shared[kind].state === "ok") { setTimeout(function () { cb(window.BS_ANIMS[id], null); }, 0); return; }
    if (animPending[id]) { animPending[id].push(cb); return; }
    animPending[id] = [cb];
    var finished = false, timer = null;
    function end(def, err) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      var cbs = animPending[id] || [];
      delete animPending[id];
      cbs.forEach(function (f) { try { f(def, def ? null : err); } catch (e) { /* bo qua */ } });
    }
    timer = setTimeout(function () { end(null, "timeout"); }, TIMEOUT);
    loadShared(kind, function (ok) {
      if (finished) return;
      if (!ok) { end(null, "load-error"); return; }
      if (window.BS_ANIMS && window.BS_ANIMS[id]) { end(window.BS_ANIMS[id]); return; }
      addScript("data/" + id + "-anim.js", function () {
        if (window.BS_ANIMS && window.BS_ANIMS[id]) end(window.BS_ANIMS[id]); else end(null, "missing");
      }, function () { end(null, "load-error"); });
    });
  }

  BS.catalogUnit = catalogUnit;
  BS.availableUnits = availableUnits;
  BS.loadUnit = loadUnit;
  BS.loadUnits = loadUnits;
  BS.loadAnim = loadAnim;
})();
