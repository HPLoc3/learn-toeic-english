/* chat.js - "Chat Bot": hỏi AI về một câu bài tập đã chấm. Chỉ hiện khi máy chủ báo đã bật (POST /api/chat {status:true}).
   Không sửa các bộ máy bài tập: theo dõi ô kết quả .fb, có nội dung thì đặt nút ngay sau, bị xóa thì gỡ nút. */
(function () {
  "use strict";
  var API = "api/chat", MAX = { question: 9000, result: 6000, picked: 300, user: 500, assistant: 1500, history: 6 };
  var QUICK = ["Vì sao đáp án này đúng?", "Vì sao lựa chọn khác sai?", "Cho mình thêm 2 ví dụ."];
  var NOTE = "Chat Bot là AI nên có thể sai. Câu bạn hỏi, câu trả lời của bạn và nội dung bài tập được gửi đến AI của Cloudflare. Đừng nhập thông tin cá nhân.";

  function clip(s, n) { s = String(s || "").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); return s.length > n ? s.slice(0, n) : s; }
  function lines(root) {
    var out = [];
    (function walk(n) {
      if (n.nodeType === 3) { out.push(n.nodeValue); return; }
      if (n.nodeType !== 1 || n.hidden) return;
      var cl = n.classList;
      if (n !== root && cl && (cl.contains("fb") || cl.contains("cb-ask") || cl.contains("listen-btns"))) return;
      Array.prototype.forEach.call(n.childNodes, walk);
      out.push(/^(P|DIV|LI|H[1-6]|UL|OL|SECTION|TABLE|TR|BUTTON)$/.test(n.nodeName) ? "\n" : " ");
    })(root);
    return out.join("");
  }
  /* ngữ cảnh lấy từ khối chứa ô kết quả: đề, lựa chọn, lời giải đang hiển thị */
  function contextOf(fb) {
    var box = fb.parentNode, picked = [];
    Array.prototype.forEach.call(box.querySelectorAll('button[aria-pressed="true"]'), function (b) { picked.push(b.textContent); });
    Array.prototype.forEach.call(box.querySelectorAll("input"), function (i) {
      if (i.type === "radio" || i.type === "checkbox") { if (i.checked) picked.push(i.value); } else if (i.value) picked.push(i.value);
    });
    /* bài đọc: đoạn văn (.rd-doc) nằm ngoài khối câu hỏi nên phải lấy thêm */
    var set = fb.closest ? fb.closest(".rd-set") : null, doc = set ? set.querySelector(".rd-doc") : null;
    var head = doc && !box.contains(doc) ? "Đoạn văn:\n" + lines(doc) + "\nCâu hỏi:\n" : "";
    return { question: clip(head + lines(box), MAX.question) || "(không có nội dung)", result: clip(lines(fb), MAX.result), picked: clip(picked.join("; "), MAX.picked) };
  }

  /* gửi tối đa 7 tin: các cặp đã trả lời gần nhất + câu hỏi mới */
  function payload(ctx, history, question) {
    var msgs = history.slice(-MAX.history).map(function (m) { return { role: m.role, content: clip(m.content, MAX[m.role]) }; });
    msgs.push({ role: "user", content: clip(question, MAX.user) });
    return { context: ctx, messages: msgs };
  }
  function errorText(status, code) {
    if (status === 429 && code === "total") return "Hôm nay Chat Bot đã hết lượt chung của cả trang. Lượt mới có sau 7 giờ sáng (giờ Việt Nam).";
    if (status === 429) return "Bạn đã dùng hết lượt hỏi hôm nay. Lượt mới có sau 7 giờ sáng (giờ Việt Nam).";
    if (status === 503) return "Chat Bot đang tắt.";
    if (status === 400 || status === 413) return "Chat Bot chưa đọc được nội dung câu này. Bạn tải lại trang rồi thử lại.";
    if (status === 502) return "AI chưa trả lời được. Có thể hôm nay đã hết lượt chung, bạn thử lại sau nhé.";
    return "Không gửi được. Bạn kiểm tra mạng rồi thử lại.";
  }
  function post(body) {
    return fetch(API, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); });
  }

  window.BSChat = { contextOf: contextOf, payload: payload, errorText: errorText };
  var BS = window.BS;
  if (!BS || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  var el = BS.el, panel = null, ui = {}, cur = null, opener = null;

  function line(role, textValue) {
    var p = el("p", { class: "cb-msg cb-" + role }, [el("span", { class: "cb-sr", text: role === "user" ? "Bạn: " : "Chat Bot: " }), textValue]);
    ui.log.appendChild(p);
    ui.log.scrollTop = ui.log.scrollHeight;
    return p;
  }
  function busy(b) {
    ui.send.disabled = b; ui.input.readOnly = b;
    Array.prototype.forEach.call(ui.quick.children, function (x) { x.disabled = b; });
  }
  function ask(q) {
    var s = cur;
    q = clip(q, MAX.user);
    if (!q || !s || s.busy) return;
    s.busy = true; busy(true);
    var mine = line("user", q), wait = line("assistant", "Đang trả lời…");
    ui.input.value = "";
    post(payload(s.ctx, s.history, q)).catch(function () { return { status: 0, body: {} }; }).then(function (r) {
      s.busy = false;
      if (cur !== s) return; /* đã đóng hoặc mở câu khác: bỏ kết quả */
      busy(false);
      ui.log.removeChild(wait);
      if (r.status === 200 && r.body && typeof r.body.reply === "string") {
        s.history.push({ role: "user", content: q }, { role: "assistant", content: r.body.reply });
        line("assistant", r.body.reply);
        ui.left.textContent = typeof r.body.remaining === "number" ? "Còn " + r.body.remaining + " lượt hỏi hôm nay." : "";
      } else {
        ui.log.removeChild(mine);
        ui.input.value = q;
        line("error", errorText(r.status, r.body && r.body.error));
      }
    });
  }
  function close() {
    if (!panel || panel.hidden) return;
    panel.hidden = true; cur = null;
    if (opener && opener.isConnected) opener.focus();
  }
  function build() {
    ui.log = el("div", { class: "cb-log", role: "log", "aria-live": "polite" });
    ui.quick = el("div", { class: "cb-quick" }, QUICK.map(function (q) { return el("button", { type: "button", class: "btn cb-chip", text: q, onclick: function () { ask(q); } }); }));
    ui.input = el("textarea", { class: "inp cb-input", rows: "2", maxlength: String(MAX.user), "aria-label": "Câu hỏi cho Chat Bot", placeholder: "Gõ câu hỏi về câu này…" });
    ui.send = el("button", { type: "submit", class: "btn btn-primary", text: "Gửi" });
    ui.left = el("p", { class: "muted cb-left", role: "status" });
    var form = el("form", { class: "cb-form" }, [ui.input, ui.send]);
    form.addEventListener("submit", function (e) { e.preventDefault(); ask(ui.input.value); });
    ui.input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(ui.input.value); } });
    panel = el("div", { class: "cb-panel", role: "dialog", "aria-labelledby": "cb-title", hidden: true }, [
      el("div", { class: "cb-head" }, [el("h2", { id: "cb-title", text: "Chat Bot" }), el("button", { type: "button", class: "btn cb-close", "aria-label": "Đóng Chat Bot", text: "✕", onclick: close })]),
      el("p", { class: "muted cb-note", text: NOTE }), ui.log, ui.quick, form, ui.left]);
    panel.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Escape") close(); });
    document.body.appendChild(panel);
  }
  function open(fb, btn) {
    if (!panel) build();
    opener = btn;
    cur = { fb: fb, ctx: contextOf(fb), history: [], busy: false };
    ui.log.textContent = ""; ui.left.textContent = ""; ui.input.value = "";
    busy(false);
    line("assistant", "Mình đã đọc câu bạn vừa làm. Bạn muốn hỏi gì?");
    panel.hidden = false;
    ui.input.focus();
  }

  function sync(root) {
    /* câu đang hỏi bị "Làm lại" hay vẽ lại: đóng khung, bỏ ngữ cảnh cũ */
    if (cur && (!cur.fb.isConnected || !cur.fb.textContent.trim())) close();
    Array.prototype.forEach.call(root.querySelectorAll(".fb"), function (fb) {
      var btn = fb.cbBtn, has = !!fb.textContent.trim();
      if (has && (!btn || !btn.isConnected)) {
        btn = el("button", { type: "button", class: "btn cb-ask", text: "💬 Hỏi Chat Bot" });
        btn.addEventListener("click", function (b) { return function () { open(fb, b); }; }(btn));
        fb.cbBtn = btn;
        fb.parentNode.insertBefore(btn, fb.nextSibling);
      } else if (!has && btn) {
        if (btn.isConnected) btn.parentNode.removeChild(btn);
        fb.cbBtn = null;
      }
    });
  }
  function start() {
    var root = document.getElementById("unit-main");
    if (!root) return;
    var queued = false;
    function queue() { if (queued) return; queued = true; setTimeout(function () { queued = false; sync(root); }, 0); }
    new MutationObserver(queue).observe(root, { childList: true, subtree: true, characterData: true });
    document.addEventListener("bs:tab", close);
    sync(root);
  }
  post({ status: true }).then(function (r) { if (r.status === 200 && r.body && r.body.enabled === true) start(); }).catch(function () { /* ngoại tuyến hoặc chưa có máy chủ: ẩn */ });
})();
