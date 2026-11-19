/* l01-anim.js - du lieu hoat hinh anh tinh (v2, scenes) Unit 1. placeholder:true = anh tam; bo co nay khi co anh that. */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l01 = {
  v: 2, kind: "scenes", id: "l01", placeholder: true,
  region_vi: "Hoạt hình mẹo be + V-ing: người trong hình đang làm gì",
  formula: [["be ("], ["is", "be"], [") + động từ-"], ["ing", "ing"], [" = đang làm gì"]],
  sr_tail_vi: "Cấu trúc be + V-ing (ở đây là is + động từ-ing) nghĩa là đang làm gì.",
  img: { base: "assets/img/l01/scene/", hd: "assets/img-hd/l01/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "pour", img: "nam-pour", dur: 7, alt_vi: "Một người đàn ông trong quán cà phê đang nghiêng ấm rót nước vào chiếc cốc trên quầy.",
      en: "He is pouring water into a cup.", vi: "Anh ấy đang rót nước vào cốc.",
      pieces: [["He", ""], [" is", "be"], [" pour", ""], ["ing", "ing"], [" water into a cup.", ""]],
      note_vi: "pour → pouring: đang rót", pos: [0.7, 0.4],
      kb: { from: [0.5, 0.5, 1.0], to: [0.62, 0.55, 1.25] }, focus: { x: 0.62, y: 0.58, r: 0.12, at: 2.5, label_vi: "đang rót" } },
    { id: "wipe", img: "nam-wipe", dur: 7, alt_vi: "Người đàn ông cầm khăn lau mặt quầy bằng một tay.",
      en: "He is wiping the counter.", vi: "Anh ấy đang lau quầy.",
      pieces: [["He", ""], [" is", "be"], [" wip", ""], ["ing", "ing"], [" the counter.", ""]],
      note_vi: "wipe → wiping: bỏ e rồi thêm ing (đang lau)", pos: [0.3, 0.4],
      kb: { from: [0.6, 0.5, 1.0], to: [0.45, 0.6, 1.25] }, focus: { x: 0.45, y: 0.65, r: 0.12, at: 2.5, label_vi: "đang lau" } },
    { id: "look", img: "mai-look", dur: 7, alt_vi: "Một cô gái ngồi bàn làm việc, mắt nhìn vào tờ tài liệu cầm trên tay.",
      en: "She is looking at a document.", vi: "Cô ấy đang nhìn vào một tài liệu.",
      pieces: [["She", ""], [" is", "be"], [" look", ""], ["ing", "ing"], [" at a document.", ""]],
      note_vi: "look at → looking at: thêm ing sau động từ, giữ nguyên at (đang nhìn vào)", pos: [0.3, 0.35],
      kb: { from: [0.5, 0.5, 1.0], to: [0.4, 0.45, 1.3] }, focus: { x: 0.42, y: 0.5, r: 0.13, at: 2.5, label_vi: "đang nhìn" } },
    { id: "type", img: "mai-type", dur: 7, alt_vi: "Cô gái ngồi trước máy tính xách tay, hai tay đặt trên bàn phím.",
      en: "She is typing on a laptop.", vi: "Cô ấy đang gõ trên máy tính xách tay.",
      pieces: [["She", ""], [" is", "be"], [" typ", ""], ["ing", "ing"], [" on a laptop.", ""]],
      note_vi: "type → typing: bỏ e rồi thêm ing (đang gõ)", pos: [0.3, 0.35],
      kb: { from: [0.55, 0.5, 1.0], to: [0.5, 0.6, 1.3] }, focus: { x: 0.5, y: 0.66, r: 0.12, at: 2.5, label_vi: "đang gõ" } },
    { id: "wear", img: "hanh-wear", dur: 7, alt_vi: "Một cô gái đeo cặp kính tròn, mỉm cười nhìn thẳng về phía trước.",
      en: "She is wearing glasses.", vi: "Cô ấy đang đeo kính.",
      pieces: [["She", ""], [" is", "be"], [" wear", ""], ["ing", "ing"], [" glasses.", ""]],
      note_vi: "wear → wearing: đang đeo/mặc (trạng thái đang có trên người), khác putting on = đang mặc vào (hành động)", pos: [0.3, 0.3],
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.4, 1.35] }, focus: { x: 0.5, y: 0.38, r: 0.14, at: 2.5, label_vi: "đang đeo" } },
    { id: "point", img: "hanh-point", dur: 7, alt_vi: "Cô gái giơ một tay chỉ vào lọ hoa trên bàn bên cạnh.",
      en: "She is pointing at the flowers.", vi: "Cô ấy đang chỉ vào những bông hoa.",
      pieces: [["She", ""], [" is", "be"], [" point", ""], ["ing", "ing"], [" at the flowers.", ""]],
      note_vi: "point at → pointing at: thêm ing sau động từ, giữ nguyên at (đang chỉ vào)", pos: [0.3, 0.35],
      kb: { from: [0.45, 0.5, 1.0], to: [0.65, 0.5, 1.3] }, focus: { x: 0.7, y: 0.55, r: 0.13, at: 2.5, label_vi: "đang chỉ" } }
  ],
  outro: { img: "duo-cafe", dur: 2, alt_vi: "Hai người bạn ngồi cạnh nhau trong quán cà phê, cùng mỉm cười.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: tìm câu "], ["be", "be"], [" + động từ-"], ["ing", "ing"],
    [" mô tả đúng điều đang xảy ra trong hình. Mẹo: wearing = đang mặc sẵn trên người (trạng thái); putting on = đang mặc vào (hành động)."]
  ] }
};
