/* l01-anim.js - hoat hinh Unit 1 (be + V-ing) theo du lieu: 3 canh x 7 giay + tong ket 2 giay. Engine: anim-engine.js, hinh: anim-cast.js. */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l01 = {
  v: 1, id: "l01",
  region_vi: "Hoạt hình mẹo be + V-ing: người trong hình đang làm gì",
  svg_label_vi: "Hoạt hình minh họa: người đàn ông lần lượt rót nước vào cốc, nhìn vào cốc, rồi chỉ vào chiếc tạp dề đang mặc",
  svg_title_vi: "Người đàn ông rót nước, nhìn vào cốc, mặc tạp dề",
  svg_desc_vi: "Ba động tác của một người đàn ông bên quầy bếp, dùng để minh họa cấu trúc be + V-ing: rót nước, nhìn vào cốc, mặc tạp dề.",
  stage: { w: 360, h: 270, backdrop: "kitchen" },
  cast: { man: { actor: "nam", x: 140, outfit: ["apron"], face: "smile" } },
  props: {
    cup: { type: "cup", x: 240, y: 172 },
    kettle: { type: "kettle", x: 192, y: 160, z: "front" }
  },
  fx: {
    stream: { type: "stream", from: "kettle.spout", to: "cup.surface" },
    gaze: { type: "gaze", from: "man.eye", to: "cup.rim", pulse: { hz: 1.1, depth: 0.45 } },
    ring: { type: "ring", around: "man.apron", pulse: { hz: 0.8, depth: 0.4 } }
  },
  formula: [["be ("], ["is", "be"], [") + động từ-"], ["ing", "ing"], [" = đang làm gì"]],
  sr_tail_vi: "Cấu trúc be + V-ing (ở đây là is + động từ-ing) nghĩa là đang làm gì.",
  scenes: [
    { id: "pour", dur: 7, rest: 6.8, title_vi: "Rót nước vào cốc", label_vi: "rót nước vào cốc",
      en: "The man is pouring water into a cup.",
      pieces: [["The man", "", 3.8], [" is", "be", 4.3], [" pour", "", 4.8], ["ing", "ing", 5.2], [" water into a cup.", "", 5.7]],
      vi_at: 6.2, note_vi: "pour → pouring: đang rót",
      tracks: [
        { of: "man", ch: "handR", keys: [[0.3, "rest"], [1.2, "@kettle.handle", "ease"]] },
        { of: "kettle", ch: "y", keys: [[1.2, 160], [2, 128, "ease"]] },
        { of: "kettle", ch: "rot", keys: [[1.8, 0], [2.5, 25, "ease"]] },
        { of: "stream", ch: "on", keys: [[0, 0], [2.4, 1, "step"]] },
        { of: "cup", ch: "fill", keys: [[2.4, 0], [6.2, 1]] },
        { of: "man", ch: "headTilt", keys: [[0.8, 0], [1.8, 8, "ease"]] }
      ] },
    { id: "look", dur: 7, rest: 6.8, title_vi: "Nhìn vào cốc", label_vi: "nhìn vào cốc",
      en: "The man is looking at the cup.",
      pieces: [["The man", "", 3.8], [" is", "be", 4.3], [" look", "", 4.8], ["ing", "ing", 5.2], [" at the cup.", "", 5.7]],
      vi_at: 6.2, note_vi: "look at → looking at: thêm ing sau động từ, giữ nguyên at (đang nhìn vào)",
      tracks: [
        { of: "man", ch: "handR", keys: [[0, "@kettle.handle"], [1.5, "@kettle.handle"], [2.3, "rest", "ease"]] },
        { of: "kettle", ch: "y", keys: [[0.2, 128], [1.1, 160, "ease"]] },
        { of: "kettle", ch: "rot", keys: [[0, 25], [0.7, 0, "ease"]] },
        { of: "stream", ch: "on", keys: [[0, 1], [0.12, 0, "step"]] },
        { of: "man", ch: "headTilt", keys: [[0, 8], [1.2, 16, "ease"]] },
        { of: "gaze", ch: "opacity", keys: [[0, 0], [2.4, 0], [2.7, 1]] }
      ] },
    { id: "wear", dur: 7, rest: 6.8, title_vi: "Mặc tạp dề", label_vi: "mặc tạp dề",
      en: "The man is wearing an apron.",
      pieces: [["The man", "", 3.8], [" is", "be", 4.3], [" wear", "", 4.8], ["ing", "ing", 5.2], [" an apron.", "", 5.7]],
      vi_at: 6.2, note_vi: "wear → wearing: đang mặc (trạng thái đang có tạp dề trên người), khác putting on = đang mặc vào (hành động)",
      tracks: [
        { of: "man", ch: "headTilt", keys: [[0, 16], [0.8, 0, "ease"]] },
        { of: "man", ch: "handL", keys: [[0.4, "rest"], [1.3, [0, 40], "ease"]] },
        { of: "man", ch: "handR", keys: [[0.4, "rest"], [1.3, [0, 40], "ease"]] },
        { of: "gaze", ch: "opacity", keys: [[0, 0, "step"]] },
        { of: "ring", ch: "on", keys: [[0, 0], [1.6, 0], [2, 1]] }
      ] }
  ],
  outro: { dur: 2, title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: tìm câu "], ["be", "be"], [" + động từ-"], ["ing", "ing"],
    [" mô tả đúng điều đang xảy ra trong hình. Mẹo: wearing = đang mặc sẵn trên người (trạng thái); putting on = đang mặc vào (hành động)."]
  ] }
};
