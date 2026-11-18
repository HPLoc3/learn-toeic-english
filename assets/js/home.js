/* home.js - trang chu: ban do hanh trinh tu BS_CATALOG. Chi doc BS.unitProgress/BS.bar/BS.el; khong cham localStorage. */
(function () {
  "use strict";
  var BS = window.BS;
  if (!BS) return;
  var el = BS.el;

  function unitLabel(un) {
    return "Unit " + un.no + (un.title_vi && un.title_vi !== "Unit " + un.no ? ": " + un.title_vi : "");
  }

  function soonList(units) {
    var ul = el("ul", { class: "units" });
    units.forEach(function (un) {
      ul.appendChild(el("li", { class: "unit-row" }, [
        el("span", { class: "unit-name", text: unitLabel(un) }),
        el("span", { class: "badge badge-soon", text: "Sắp ra mắt" })
      ]));
    });
    return ul;
  }

  var loaded = false; /* da nap xong cac unit da mo (lan dau) */

  function node(un) {
    var pr = BS.unitProgress(un.id);
    if (!loaded) {
      return el("li", null, [
        el("a", { class: "node unit-link", href: "unit.html?u=" + encodeURIComponent(un.id), "aria-label": unitLabel(un) + ", đang tải" }, [
          el("span", { class: "node-body" }, [
            el("span", { class: "node-title unit-name", text: unitLabel(un) }),
            el("span", { class: "node-sub", text: "Đang tải..." })
          ])
        ])
      ]);
    }
    var ring = el("span", { class: "ring", "aria-hidden": "true", style: "--p:" + pr.pct }, [
      el("span", { class: "ring-in", text: pr.pct + "%" })
    ]);
    return el("li", null, [
      el("a", { class: "node unit-link", href: "unit.html?u=" + encodeURIComponent(un.id),
        "aria-label": unitLabel(un) + ", tiến độ " + pr.pct + "%" }, [
        ring,
        el("span", { class: "node-body" }, [
          el("span", { class: "node-title unit-name", text: unitLabel(un) }),
          el("span", { class: "node-sub", text: pr.done + "/" + pr.total + " mục" })
        ]),
        el("span", { class: "badge badge-ok", text: pr.pct > 0 ? "Tiếp tục" : "Học ngay" })
      ])
    ]);
  }

  /* ve lai nhung giu cac <details> dang mo va vi tri cuon (dong bo tu tab khac xay ra thuong xuyen) */
  function render() {
    var root = document.getElementById("catalog");
    var open = [], sx = 0, sy = 0;
    if (root) {
      var ds = root.querySelectorAll("details");
      for (var i = 0; i < ds.length; i++) if (ds[i].open) open.push(i);
      sx = window.pageXOffset || 0; sy = window.pageYOffset || 0;
    }
    build();
    if (root && open.length) {
      var nd = root.querySelectorAll("details");
      open.forEach(function (i) { if (nd[i]) nd[i].open = true; });
    }
    if (root && (sx || sy) && (window.pageXOffset !== sx || window.pageYOffset !== sy)) window.scrollTo(sx, sy);
  }

  function build() {
    var root = document.getElementById("catalog");
    var prog = document.getElementById("overall");
    if (!root) return;
    root.textContent = "";
    if (prog) prog.textContent = "";
    var cat = window.BS_CATALOG;
    if (!cat || !Array.isArray(cat.parts)) {
      root.appendChild(el("p", { class: "card", role: "alert", text: "Chưa có mục lục." }));
      return;
    }
    var sum = 0, n = 0, stageNo = 0, idleParts = [];
    cat.parts.forEach(function (p) {
      (p.units || []).forEach(function (un) {
        if (un.available && window.BS_UNITS && window.BS_UNITS[un.id]) { sum += BS.unitProgress(un.id).pct; n++; }
      });
    });
    var overall = n ? Math.round(sum / n) : 0;
    if (prog && !loaded) {
      prog.appendChild(el("p", { class: "label", role: "status", text: "Đang tải tiến độ..." }));
    } else if (prog) {
      prog.appendChild(el("p", { class: "label", text: "Tiến độ chung (các unit đã mở): " + overall + "%" }));
      prog.appendChild(BS.bar(overall, "Tiến độ chung"));
    }

    cat.parts.forEach(function (p) {
      var open = [], soon = [];
      (p.units || []).forEach(function (un) { (un.available ? open : soon).push(un); });
      if (!open.length) {
        if (soon.length) { idleParts.push({ title: p.title }); }
        return;
      }
      stageNo++;
      var ol = el("ol", { class: "journey" });
      open.forEach(function (un) { ol.appendChild(node(un)); });
      var kids = [
        el("div", { class: "stage-head" }, [
          el("h2", { text: p.title }),
          el("p", { class: "stage-no", text: "Chặng " + stageNo })
        ]),
        ol
      ];
      if (soon.length) {
        kids.push(el("details", { class: "fold soon-fold" }, [
          el("summary", { text: "Sắp ra mắt (" + soon.length + ")" }),
          soonList(soon)
        ]));
      }
      root.appendChild(el("section", { class: "card", "aria-label": p.title }, kids));
    });

    if (idleParts.length) {
      var ul = el("ul", { class: "units later-list" });
      idleParts.forEach(function (ip) { ul.appendChild(el("li", { class: "unit-row" }, [el("span", { class: "unit-name", text: ip.title })])); });
      root.appendChild(el("details", { class: "fold soon-fold later-fold" }, [
        el("summary", { text: "Lộ trình các Part còn lại (sắp ra mắt)" }), ul
      ]));
    }
    cta(cat);
  }

  /* nut bat dau: unit dau tien da mo; co tien do thi doi thanh "Tiep tuc" */
  function cta(cat) {
    var a = document.getElementById("start-cta");
    if (!a) return;
    var first = null, firstAny = null;
    cat.parts.forEach(function (p) {
      (p.units || []).forEach(function (un) {
        if (!un.available) return;
        if (!firstAny) firstAny = un;
        if (!first && BS.unitProgress(un.id).pct < 100) first = un;
      });
    });
    if (!first) first = firstAny; /* da xong het: tro ve unit dau de on lai */
    if (!first) { a.hidden = true; return; }
    var pr = loaded ? BS.unitProgress(first.id) : { pct: 0 };
    a.hidden = false;
    a.setAttribute("href", "unit.html?u=" + encodeURIComponent(first.id));
    a.textContent = pr.pct > 0 ? "Tiếp tục Unit " + first.no + " (" + pr.pct + "%)" : "Bắt đầu Unit " + first.no + " →";
  }

  /* nap cac unit da mo (loader), ve ngay lan dau roi ve lai khi co du lieu */
  function init() {
    render();
    if (typeof BS.loadUnits === "function" && typeof BS.availableUnits === "function") {
      BS.loadUnits(BS.availableUnits().map(function (u) { return u.id; }), function () { loaded = true; render(); });
    } else { loaded = true; render(); }
  }
  /* chi ve lai khi co unit nap muon sau lan nap dau (lan dau do callback loadUnits ve mot lan) */
  document.addEventListener("bs:units", function () { if (loaded) render(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  /* bfcache: core.js tu reload() roi phat bs:xp {reload:true}, nen khong nghe pageshow rieng (tranh ve hai lan) */
  document.addEventListener("bs:xp", function (e) { if (e && e.detail && e.detail.reload) render(); });
})();
