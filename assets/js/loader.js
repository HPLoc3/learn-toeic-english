/* loader.js - nap du lieu unit theo yeu cau (data/<id>.js, data/<id>-game.js, file hoat hinh). Khong goi mang ngoai.
 * Chi nap id co trong BS_CATALOG, khop ^[a-z0-9-]+$ va available:true (localhost + che do bien tap: xem truoc ca unit chua mo).
 * API: BS.catalogUnit(id), BS.availableUnits(), BS.loadUnit(id, cb(u|null, err)), BS.loadUnits(ids, cb(map)). Phat su kien bs:units. */
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
  function validAnim(p) {
    return typeof p === "string" && /^assets\/js\/[A-Za-z0-9._\/-]+\.js$/.test(p) && p.indexOf("..") < 0 && p.indexOf("//") < 0;
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
    if (entry.anim && validAnim(entry.anim)) files.push(entry.anim);
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
        /* chi file du lieu chinh la bat buoc; game/hoat hinh loi thi van mo bai */
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

  BS.catalogUnit = catalogUnit;
  BS.availableUnits = availableUnits;
  BS.loadUnit = loadUnit;
  BS.loadUnits = loadUnits;
})();
