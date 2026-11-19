/* lesson.js - tab Bai hoc + khung dieu khien trang unit.html */
(function () {
  "use strict";
  var BS = window.BS, el = BS.el;
  BS.render = BS.render || {};

  function details(title, kids, open) {
    var a = { class: "fold" };
    if (open) a.open = "";
    return el("details", a, [el("summary", { text: title })].concat(kids));
  }

  function exampleItem(ex) {
    var vi = BS.viLine(ex);
    var kids = [
      el("p", { class: "en", lang: "en" }, [
        ex.en || "", " ",
        el("button", { type: "button", class: "btn btn-speak", "aria-label": "Nghe câu: " + (ex.en || ""),
          onclick: function () { BS.speak(ex.en || "", 0.9); } }, [el("span", { "aria-hidden": "true", text: "🔊" }), " Nghe"]),
        " ", BS.badgeUnverified(ex.v)
      ])
    ];
    if (vi) kids.push(el("p", { class: "vi-line" }, [vi]));
    return el("li", { class: "ex" }, kids);
  }

  BS.render.lesson = function (u, root) {
    var f = u.focus || {};
    root.appendChild(el("h2", { text: "Trọng tâm bài học" }));
    if (f.intro_vi) root.appendChild(details("Giới thiệu trọng tâm", [el("p", { text: f.intro_vi })], true));
    (f.tips || []).forEach(function (t, i) {
      var card = el("section", { class: "card", "aria-label": "Mẹo " + (i + 1) }, [
        el("h3", {}, ["Mẹo " + (i + 1), " ", BS.badgeUnverified(t.v)]),
        el("p", { text: t.text_vi || "" })
      ]);
      if (t.examples && t.examples.length) {
        card.appendChild(details("Câu mẫu (" + t.examples.length + ")", [el("ul", { class: "list" }, t.examples.map(exampleItem))]));
      }
      if (t.image) card.appendChild(BS.img(t.image, "Hình minh họa cho mẹo " + (i + 1) + ": " + (t.text_vi || "")));
      root.appendChild(card);
    });
    if (u.sentences && u.sentences.length) {
      root.appendChild(el("h2", { text: "Luyện tập mô tả hành động trong hình" }));
      root.appendChild(el("ul", { class: "list card" }, u.sentences.map(exampleItem)));
    }
    if (u.phrases && u.phrases.length) {
      root.appendChild(el("h2", { text: "Cụm từ thường gặp" }));
      var groups = [], byG = {};
      u.phrases.forEach(function (p) {
        var g = p.group_vi || "";
        if (!byG[g]) { byG[g] = []; groups.push(g); }
        byG[g].push(p);
      });
      groups.forEach(function (g) {
        root.appendChild(details((g || "Cụm từ") + " (" + byG[g].length + ")", [el("ul", { class: "list card" }, byG[g].map(exampleItem))]));
      });
    }
  };

  var ALL_TABS = [
    { id: "lesson", label: "Bài học", icon: "📖" },
    { id: "anim", label: "Hoạt hình", icon: "🎬" },
    { id: "vocab", label: "Từ vựng", icon: "🃏" },
    { id: "listen", label: "Luyện nghe", icon: "🎧" },
    { id: "quiz", label: "Bài tập", icon: "✏️" },
    { id: "game", label: "Trò chơi", icon: "🎮" }
  ];

  function emitTab(tab) {
    try { document.dispatchEvent(new CustomEvent("bs:tab", { detail: { tab: tab } })); } catch (e) { /* bo qua */ }
  }

  var animApi = null;
  function mountAnim(id) {
    var host = document.getElementById("anim-root");
    if (!host) return;
    if (animApi) { try { animApi.destroy(); } catch (e) { /* bo qua */ } animApi = null; }
    host.textContent = "";
    /* lesson.js cu + catalog moi (hoac nguoc lai): khong co loadAnim thi bao sap ra mat, khong vo */
    if (typeof BS.loadAnim !== "function") {
      host.appendChild(el("p", { class: "muted", role: "status", text: "Hoạt hình sắp ra mắt" }));
      return;
    }
    host.appendChild(el("p", { class: "muted", role: "status", text: "Đang tải hoạt hình..." }));
    BS.loadAnim(id, function (def, err) {
      host.textContent = "";
      if (!def) {
        if (err === "not-found") { host.appendChild(el("p", { class: "muted", role: "status", text: "Hoạt hình sắp ra mắt" })); return; }
        host.appendChild(el("div", { class: "card nf-card", role: "alert" }, [
          el("h3", { text: "Không tải được hoạt hình" }),
          el("p", { text: "Có thể do mạng chập chờn. Phần học còn lại vẫn dùng bình thường, bạn thử tải lại hoạt hình nhé." }),
          el("p", {}, [el("button", { type: "button", class: "btn btn-primary next-btn", onclick: function () { mountAnim(id); } }, ["Thử lại"])])
        ]));
        return;
      }
      var api = null;
      var eng = def.kind === "scenes" ? window.BSScenes : window.BSAnim;
      try { api = eng && typeof eng.mount === "function" ? eng.mount(host, def) : null; }
      catch (e) { api = null; }
      if (!api) {
        host.textContent = "";
        host.appendChild(el("p", { class: "muted", role: "status", text: "Hoạt hình chưa chạy được trên bản này. Bạn tải lại trang hoặc quay lại sau nhé." }));
        return;
      }
      animApi = api;
      if (currentTabId() !== "anim") { try { api.pause(); } catch (e) { /* bo qua */ } }
    });
  }
  var curTab = "lesson";
  function currentTabId() { return curTab; }

  function hideChrome() {
    var tabs = document.getElementById("unit-tabs"); if (tabs) tabs.hidden = true;
    var tw = document.querySelector(".tabs-wrap"); if (tw) tw.hidden = true;
    var hud = document.getElementById("hud"); if (hud) hud.hidden = true;
    var up = document.getElementById("unit-part"); if (up) up.hidden = true;
    var nx = document.getElementById("unit-next"); if (nx) nx.hidden = true;
    var unv = document.getElementById("unit-unv"); if (unv) unv.hidden = true;
  }

  function showNotFound(main) {
    hideChrome();
    document.title = "Chưa có bài này | Từng Bước English";
    document.getElementById("unit-title").textContent = "Chưa có bài này";
    main.appendChild(el("div", { class: "card nf-card", role: "status" }, [
      el("p", { text: "Bài này sắp ra mắt. Bạn quay lại mục lục để chọn bài khác nhé." }),
      el("p", {}, [el("a", { class: "btn btn-primary next-btn", href: "index.html", text: "Về mục lục" })])
    ]));
  }

  function init() {
    var main = document.getElementById("unit-main");
    if (!main) return;
    var id = (new URLSearchParams(window.location.search).get("u") || "l01");
    if (!/^[a-z0-9_-]+$/i.test(id)) id = "l01";
    var holder = null;
    function clearHolder() { if (holder && holder.parentNode) holder.parentNode.removeChild(holder); holder = null; }
    function load() {
      clearHolder();
      holder = el("div", { class: "card nf-card", role: "status" }, [el("p", { text: "Đang tải bài học..." })]);
      main.appendChild(holder);
      var done = false;
      function got(u, err) {
        if (done) return;
        done = true;
        clearHolder();
        if (u) { build(u, id); return; }
        if (err === "not-found") { showNotFound(main); return; }
        holder = el("div", { class: "card nf-card", role: "alert" }, [
          el("h2", { text: "Không tải được bài học" }),
          el("p", { text: "Có thể do mạng chập chờn hoặc tệp bài học bị thiếu. Bạn thử tải lại nhé." }),
          el("p", {}, [
            el("button", { type: "button", class: "btn btn-primary next-btn", onclick: load }, ["Thử lại"]), " ",
            el("a", { class: "btn next-btn", href: "index.html", text: "Về mục lục" })
          ])
        ]);
        main.appendChild(holder);
      }
      if (typeof BS.loadUnit === "function") BS.loadUnit(id, got);
      else got(window.BS_UNITS && window.BS_UNITS[id] || null, "not-found");
    }
    load();
  }

  function nextUnitOf(id) {
    var list = typeof BS.availableUnits === "function" ? BS.availableUnits() : [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i + 1] || null;
    return null;
  }

  function build(u, id) {
    var entry = (typeof BS.catalogUnit === "function" && BS.catalogUnit(id)) || {};
    var TABS = ALL_TABS.filter(function (t) {
      if (t.id === "anim") return entry.anim === true;
      if (t.id === "game") return !!entry.game;
      return true;
    });
    document.title = "Unit " + u.unitNo + ": " + u.title_vi + " | Từng Bước English";
    document.getElementById("unit-title").textContent = "Unit " + u.unitNo + ": " + u.title_vi;
    document.getElementById("unit-part").textContent = u.part;
    var unv = BS.countUnverified(u);
    var unvEl = document.getElementById("unit-unv");
    unvEl.textContent = unv + " mục chưa kiểm tra";
    unvEl.hidden = unv === 0;

    var st = BS.unit(id);
    var panels = {};
    var rendered = {};
    var tablist = document.getElementById("unit-tabs");
    var btns = {};

    TABS.forEach(function (t) {
      panels[t.id] = document.getElementById("panel-" + t.id);
      var b = el("button", { type: "button", role: "tab", id: "tab-" + t.id, class: "tab",
        "aria-controls": "panel-" + t.id, "aria-selected": "false", tabindex: "-1" },
        [el("span", { "aria-hidden": "true", text: t.icon }), " " + t.label]);
      b.addEventListener("click", function () { select(t.id, true); });
      b.addEventListener("keydown", function (e) {
        var i = TABS.findIndex(function (x) { return x.id === t.id; });
        var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
        if (n === null) return;
        n = (n + TABS.length) % TABS.length;
        e.preventDefault();
        select(TABS[n].id, true);
        btns[TABS[n].id].focus();
      });
      btns[t.id] = b;
      tablist.appendChild(b);
    });

    var currentTab = TABS[0].id;
    function select(tid, persist) {
      currentTab = tid;
      curTab = tid;
      BS.stopSpeak();
      if (tid !== "anim" && animApi) { try { animApi.pause(); } catch (e) { /* bo qua */ } }
      TABS.forEach(function (t) {
        var on = t.id === tid;
        btns[t.id].setAttribute("aria-selected", on ? "true" : "false");
        btns[t.id].setAttribute("tabindex", on ? "0" : "-1");
        panels[t.id].hidden = !on;
      });
      if (!rendered[tid]) {
        rendered[tid] = true;
        if (tid === "anim") mountAnim(id);
        else if (tid === "game" && typeof BS.render.game !== "function") {
          panels.game.appendChild(el("p", { class: "card", role: "status", text: "Trò chơi đang được chuẩn bị, bạn quay lại sau nhé." }));
        }
        else if (BS.render[tid]) {
          try { BS.render[tid](u, panels[tid]); }
          catch (e) { panels[tid].appendChild(el("p", { class: "card", role: "alert", text: "Không hiển thị được phần này." })); }
        }
      }
      revealTab(tid, persist);
      renderNext(tid);
      if (persist) { st.last.tab = tid; BS.save(); }
      emitTab(tid);
    }

    var nextHost = document.getElementById("unit-next");
    function renderNext(tid) {
      if (!nextHost) return;
      nextHost.textContent = "";
      var i = TABS.findIndex(function (x) { return x.id === tid; });
      var nt = TABS[i + 1];
      var node;
      if (nt) {
        node = el("button", { type: "button", class: "btn btn-primary next-btn" }, ["Tiếp: " + nt.label + " →"]);
        node.addEventListener("click", function () { goTab(nt.id); });
      } else {
        var nu = nextUnitOf(id);
        if (nu) {
          nextHost.appendChild(el("a", { class: "btn btn-primary next-btn", href: "unit.html?u=" + encodeURIComponent(nu.id),
            text: "Unit kế tiếp: Unit " + nu.no + " →" }));
          nextHost.appendChild(document.createTextNode(" "));
          node = el("a", { class: "btn next-btn", href: "index.html", text: "Về mục lục" });
        } else {
          node = el("a", { class: "btn btn-primary next-btn", href: "index.html", text: "Về mục lục" });
        }
      }
      nextHost.appendChild(node);
      nextHost.hidden = false;
    }

    function goTab(tid) {
      select(tid, true);
      var p = panels[tid];
      var h = p.querySelector("h2, h1") || p;
      if (h !== p && h.getAttribute("tabindex") === null) h.setAttribute("tabindex", "-1");
      try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var tabsH = (document.querySelector(".tabs-wrap") || { offsetHeight: 0 }).offsetHeight;
      var y = h.getBoundingClientRect().top + window.pageYOffset - tabsH - 8;
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
    }

    var revealTimer = 0;
    function tabInView(tid) {
      var tr = tablist.getBoundingClientRect(), br = btns[tid].getBoundingClientRect();
      return br.left >= tr.left - 0.5 && br.right <= tr.right + 0.5;
    }
    function revealTab(tid, smooth) {
      clearTimeout(revealTimer);
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      function target() {
        var tr = tablist.getBoundingClientRect(), br = btns[tid].getBoundingClientRect();
        var left = tablist.scrollLeft + (br.left - tr.left) - (tr.width - br.width) / 2;
        return Math.max(0, Math.min(left, tablist.scrollWidth - tablist.clientWidth));
      }
      try {
        if (tabInView(tid) && tablist.scrollLeft > -1 && !smooth) { updateFade(); return; }
        if (smooth && !reduce) tablist.scrollTo({ left: target(), behavior: "smooth" });
        else tablist.scrollLeft = target();
      } catch (e) { /* bo qua */ }
      updateFade();
      /* sau khi cuon xong (hoac neu trinh duyet bo qua cuon muot): dam bao tab nam trong khung, roi tinh lai mo canh */
      revealTimer = setTimeout(function () {
        if (!tabInView(tid)) tablist.scrollLeft = target();
        updateFade();
      }, reduce || !smooth ? 0 : 450);
    }

    function updateFade() {
      var max = tablist.scrollWidth - tablist.clientWidth;
      tablist.classList.toggle("fade-l", tablist.scrollLeft > 2);
      tablist.classList.toggle("fade-r", max > 2 && tablist.scrollLeft < max - 2);
    }
    tablist.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", function () { revealTab(currentTab, false); });

    var start = st.last.tab;
    if (!TABS.some(function (t) { return t.id === start; })) start = "lesson";
    select(start, false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
