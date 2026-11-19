/* l01-anim.js - du lieu hoat hinh anh tinh (v2, scenes) Unit 1. Anh that: nguoi do chu site tao (AI, nhan vat goc), nen va do vat ve boi tools/compose-scenes.py. */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l01 = {
  v: 2, kind: "scenes", id: "l01",
  region_vi: "Hoạt hình mẹo be + V-ing: người trong hình đang làm gì",
  formula: [["be ("], ["is", "be"], [") + động từ-"], ["ing", "ing"], [" = đang làm gì"]],
  sr_tail_vi: "Cấu trúc be + V-ing (ở đây là is + động từ-ing) nghĩa là đang làm gì.",
  img: { base: "assets/img/l01/scene/", hd: "assets/img-hd/l01/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "pour", img: "nam-pour", dur: 9, alt_vi: "Một người đàn ông trong quán cà phê đang nghiêng ấm rót nước vào chiếc cốc trên quầy.",
      en: "He is pouring water into a cup.", vi: "Anh ấy đang rót nước vào cốc.",
      pieces: [["He", ""], [" is", "be"], [" pour", ""], ["ing", "ing"], [" water into a cup.", ""]],
      note_vi: "pour → pouring: đang rót",
      kb: { from: [0.55, 0.45, 1.0], to: [0.62, 0.6, 1.25] }, focus: { x: 0.62, y: 0.77, r: 0.1, at: 2.5, label_vi: "đang rót" } },
    { id: "wipe", img: "nam-wipe", dur: 9, alt_vi: "Người đàn ông đặt hai tay lên chiếc khăn trắng và lau mặt quầy.",
      en: "He is wiping the counter.", vi: "Anh ấy đang lau quầy.",
      pieces: [["He", ""], [" is", "be"], [" wip", ""], ["ing", "ing"], [" the counter.", ""]],
      note_vi: "wipe → wiping: bỏ e rồi thêm ing (đang lau)",
      kb: { from: [0.55, 0.45, 1.0], to: [0.6, 0.6, 1.25] }, focus: { x: 0.61, y: 0.87, r: 0.11, at: 2.5, label_vi: "đang lau" } },
    { id: "look", img: "mai-look", dur: 9, alt_vi: "Một cô gái đứng trong văn phòng, hai tay cầm tờ tài liệu và nhìn xuống đọc.",
      en: "She is looking at a document.", vi: "Cô ấy đang nhìn vào một tài liệu.",
      pieces: [["She", ""], [" is", "be"], [" look", ""], ["ing", "ing"], [" at a document.", ""]],
      note_vi: "look at → looking at: thêm ing sau động từ, giữ nguyên at (đang nhìn vào)",
      kb: { from: [0.5, 0.45, 1.0], to: [0.38, 0.6, 1.3] }, focus: { x: 0.35, y: 0.83, r: 0.12, at: 2.5, label_vi: "đang nhìn" } },
    { id: "type", img: "mai-type", dur: 9, alt_vi: "Cô gái ngồi bên bàn, hai tay đặt trên bàn phím máy tính xách tay.",
      en: "She is typing on a laptop.", vi: "Cô ấy đang gõ trên máy tính xách tay.",
      pieces: [["She", ""], [" is", "be"], [" typ", ""], ["ing", "ing"], [" on a laptop.", ""]],
      note_vi: "type → typing: bỏ e rồi thêm ing (đang gõ)",
      kb: { from: [0.5, 0.45, 1.0], to: [0.5, 0.6, 1.3] }, focus: { x: 0.5, y: 0.84, r: 0.11, at: 2.5, label_vi: "đang gõ" } },
    { id: "wear", img: "hanh-wear", dur: 9, alt_vi: "Một bà tóc bạc đeo cặp kính tròn, một tay chỉnh kính và mỉm cười.",
      en: "She is wearing glasses.", vi: "Cô ấy đang đeo kính.",
      pieces: [["She", ""], [" is", "be"], [" wear", ""], ["ing", "ing"], [" glasses.", ""]],
      note_vi: "wear → wearing: đang đeo/mặc (trạng thái đang có trên người), khác putting on = đang mặc vào (hành động)",
      kb: { from: [0.55, 0.5, 1.0], to: [0.64, 0.4, 1.35] }, focus: { x: 0.65, y: 0.3, r: 0.13, at: 2.5, label_vi: "đang đeo" } },
    { id: "point", img: "hanh-point", dur: 9, alt_vi: "Một bà tóc bạc giơ một tay, ngón trỏ chỉ vào bó hoa trên giá bên cạnh.",
      en: "She is pointing at the flowers.", vi: "Cô ấy đang chỉ vào những bông hoa.",
      pieces: [["She", ""], [" is", "be"], [" point", ""], ["ing", "ing"], [" at the flowers.", ""]],
      note_vi: "point at → pointing at: thêm ing sau động từ, giữ nguyên at (đang chỉ vào)",
      kb: { from: [0.5, 0.5, 1.0], to: [0.68, 0.5, 1.3] }, focus: { x: 0.71, y: 0.53, r: 0.13, at: 2.5, label_vi: "đang chỉ" } }
  ],
  outro: { img: "duo-cafe", dur: 2, alt_vi: "Người pha chế đưa chiếc cốc cho một cô gái đứng bên quầy cà phê, cả hai cùng mỉm cười.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: tìm câu "], ["be", "be"], [" + động từ-"], ["ing", "ing"],
    [" mô tả đúng điều đang xảy ra trong hình. Mẹo: wearing = đang mặc sẵn trên người (trạng thái); putting on = đang mặc vào (hành động)."]
  ] }
};
