/* pwa.js - đăng ký service worker, thanh "Đã có bản mới", nút cài ứng dụng. Không gọi mạng ngoài nguồn, không đụng tungbuoc.v1.
 * https: đăng ký sw.js. localhost/127.0.0.1/file: mặc định KHÔNG đăng ký (tránh dính cache khi biên soạn); ?pwa=1 để thử trên localhost.
 * ?pwa=0 (mọi nơi): gỡ service worker và xóa cache tb-*. Chèn DOM bằng textContent. */
(function () {
  "use strict";
  var win = window, doc = document, nav = win.navigator;
  var loc = win.location;

  function isLocalHost(h, proto) {
    h = String(h || "").toLowerCase();
    return proto === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
  }
  var param = null;
  try { param = new win.URLSearchParams(loc.search).get("pwa"); } catch (e) { param = null; }
  var local = isLocalHost(loc.hostname, loc.protocol);
  var sw = nav && nav.serviceWorker;

  var root = null;
  var statusEl = null;
  var reloading = false;
  var cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    try {
      var l = doc.createElement("link");
      l.rel = "stylesheet";
      l.href = "assets/css/pwa.css";
      doc.head.appendChild(l);
    } catch (e) { /* bỏ qua */ }
  }
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function isStandalone() {
    try {
      return (win.matchMedia && win.matchMedia("(display-mode: standalone)").matches) || nav.standalone === true;
    } catch (e) { return false; }
  }
  function isIos() {
    var ua = String((nav && nav.userAgent) || "");
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
  }

  /* ---------- thanh "Đã có bản mới" ---------- */
  var bar = null;
  function showUpdate(worker) {
    if (bar || !doc.body) return;
    ensureCss();
    bar = el("div", "pwa-bar");
    bar.setAttribute("role", "status");
    bar.appendChild(el("span", "pwa-bar-msg", "Đã có bản mới"));
    var btn = el("button", "pwa-btn pwa-btn-go", "Tải lại");
    btn.type = "button";
    btn.addEventListener("click", function () {
      btn.disabled = true;
      try { worker.postMessage("SKIP_WAITING"); } catch (e) { /* bỏ qua */ }
    });
    bar.appendChild(btn);
    doc.body.appendChild(bar);
  }
  function watch(reg) {
    if (reg.waiting && sw.controller) showUpdate(reg.waiting);
    reg.addEventListener("updatefound", function () {
      var w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", function () {
        if (w.state === "installed" && sw.controller) showUpdate(w);
      });
    });
  }

  /* ---------- khối cài đặt trong #pwa-root ---------- */
  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }
  function buildRoot() {
    root = doc.getElementById("pwa-root");
    if (!root) return;
    ensureCss();
    root.classList.add("pwa-box");
    statusEl = el("p", "pwa-status");
    statusEl.setAttribute("role", "status");
    root.appendChild(statusEl);
    if (isStandalone()) return;

    var installWrap = el("div", "pwa-install");
    installWrap.hidden = true;
    var btn = el("button", "pwa-btn pwa-btn-go", "Cài ứng dụng");
    btn.type = "button";
    installWrap.appendChild(btn);
    root.appendChild(installWrap);

    var deferred = null;
    win.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferred = e;
      installWrap.hidden = false;
      if (ios) ios.hidden = true;
    });
    btn.addEventListener("click", function () {
      if (!deferred) return;
      var d = deferred;
      deferred = null;
      installWrap.hidden = true;
      try { d.prompt(); } catch (e) { /* bỏ qua */ }
    });
    win.addEventListener("appinstalled", function () {
      installWrap.hidden = true;
      if (ios) ios.hidden = true;
    });

    var ios = null;
    if (isIos()) {
      ios = el("details", "pwa-ios");
      ios.appendChild(el("summary", "pwa-sum", "Cài về màn hình chính (iPhone, iPad)"));
      ios.appendChild(el("p", "pwa-help", "Mở trang này bằng Safari, chạm nút Chia sẻ, chọn “Thêm vào Màn hình chính” rồi chạm Thêm."));
      root.appendChild(ios);
    }
  }

  /* ---------- đăng ký / gỡ ---------- */
  function register() {
    sw.register("sw.js").then(function (reg) {
      watch(reg);
      return sw.ready;
    }).then(function (reg) {
      if (reg) setStatus("Đã sẵn sàng học khi không có mạng");
    }, function () { /* không đăng ký được: học bình thường khi có mạng */ });
    sw.addEventListener("controllerchange", function () {
      if (reloading || !bar) return; /* chỉ tải lại khi người học đã bấm "Tải lại" */
      reloading = true;
      loc.reload();
    });
  }
  function unregisterAll() {
    var jobs = [];
    try {
      if (sw && sw.getRegistrations) {
        jobs.push(sw.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }));
      }
      if (win.caches && win.caches.keys) {
        jobs.push(win.caches.keys().then(function (ks) {
          return Promise.all(ks.filter(function (k) { return k.indexOf("tb-") === 0; })
            .map(function (k) { return win.caches.delete(k); }));
        }));
      }
    } catch (e) { /* bỏ qua */ }
    Promise.all(jobs).then(function () {
      setStatus("Đã gỡ chế độ học ngoại tuyến và xóa bộ nhớ đệm.");
    }, function () { /* bỏ qua */ });
  }

  function init() {
    try { buildRoot(); } catch (e) { /* không để lỗi UI chặn trang */ }
    if (!sw) return;
    if (param === "0") { unregisterAll(); return; }
    var allow = loc.protocol === "https:" || (local && param === "1" && loc.protocol !== "file:");
    if (!allow) return;
    register();
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
