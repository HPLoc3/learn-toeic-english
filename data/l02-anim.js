/* l02-anim.js - du lieu hoat hinh anh tinh (v2, scenes) Unit 2. Anh that: nguoi do chu site tao (AI, nhan vat goc), nen va do vat ve boi tools/compose-scenes.py. */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l02 = {
  v: 2, kind: "scenes", id: "l02",
  region_vi: "Hoạt hình mẹo nhiều người: are + V-ing và One of the... is + V-ing",
  formula: [["Nhiều người: "], ["are", "be"], [" + V-"], ["ing", "ing"], ["  |  One of the...: "], ["is", "be"], [" + V-"], ["ing", "ing"]],
  sr_tail_vi: "Nhiều người thì dùng are cộng động từ-ing; One of the men hay One of the women thì dùng is cộng động từ-ing.",
  img: { base: "assets/img/l02/scene/", hd: "assets/img-hd/l02/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "shake", img: "duo-shake", dur: 9, alt_vi: "Trong sảnh văn phòng, một cô gái tóc đen ngang vai mặc áo xanh lục và một người đàn ông mặc áo vest xanh đậm đứng đối mặt nhau, mỉm cười và bắt tay.",
      en: "They are shaking hands.", vi: "Họ đang bắt tay nhau.",
      pieces: [["They", ""], [" are", "be"], [" shak", ""], ["ing", "ing"], [" hands.", ""]],
      note_vi: "They + are; shake → shaking: bỏ e rồi thêm ing (đang bắt tay)",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.47, 1.2] }, focus: { x: 0.49, y: 0.75, r: 0.075, at: 2.5, label_vi: "đang bắt tay" } },
    { id: "meeting", img: "duo-meeting", dur: 9, alt_vi: "Trong quán cà phê, cô gái và người đàn ông ngồi trên hai chiếc ghế gỗ ở hai bên một cái bàn nhỏ, đối diện nhau; cô gái cầm bút ghi vào sổ, người đàn ông cầm một cái cốc.",
      en: "They are sitting across from each other.", vi: "Họ đang ngồi đối diện nhau.",
      pieces: [["They", ""], [" are", "be"], [" sitt", ""], ["ing", "ing"], [" across from each other.", ""]],
      note_vi: "sit → sitting: gấp đôi t rồi thêm ing; across from each other = đối diện nhau",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.48, 1.25] }, focus: { x: 0.48, y: 0.6, r: 0.13, at: 2.5, label_vi: "đối diện nhau" } },
    { id: "line", img: "trio-line", dur: 9, alt_vi: "Trong quán cà phê, ba người đứng thành một hàng thẳng, cùng quay mặt về bên phải, hướng về quầy gọi đồ có máy tính tiền và mấy cốc mang đi: bà tóc búi đeo kính ở đầu hàng, sát quầy, cô gái đứng giữa, người đàn ông ở cuối hàng đang cúi nhìn điện thoại.",
      en: "Some people are waiting in line.", vi: "Vài người đang xếp hàng chờ.",
      pieces: [["Some people", ""], [" are", "be"], [" wait", ""], ["ing", "ing"], [" in line.", ""]],
      note_vi: "Some people + are; wait → waiting: thêm ing (đang chờ); in line = xếp hàng",
      kb: { from: [0.4, 0.5, 1.0], to: [0.49, 0.5, 1.2] }, focus: { x: 0.7, y: 0.56, r: 0.17, at: 2.5, label_vi: "xếp hàng" } },
    { id: "serve", img: "nam-serve", dur: 9, alt_vi: "Người pha chế mặc tạp dề vàng đứng sau quầy, đưa một cốc mang đi cho cô gái; một người đàn ông mặc vest đứng cạnh cô.",
      en: "One of the men is handing a cup to the woman.", vi: "Một trong hai người đàn ông đang đưa cho người phụ nữ một cái cốc.",
      pieces: [["One of the men", ""], [" is", "be"], [" hand", ""], ["ing", "ing"], [" a cup to the woman.", ""]],
      note_vi: "One of the men + is (số ít!); hand → handing: đang đưa",
      kb: { from: [0.45, 0.5, 1.0], to: [0.5, 0.5, 1.2] }, focus: { x: 0.45, y: 0.64, r: 0.1, at: 2.5, label_vi: "đang đưa cốc" } },
    { id: "flowers", img: "duo-flowers", dur: 9, alt_vi: "Trong tiệm hoa, bà chủ tóc bạc đeo kính cầm một bó hoa nhiều màu, còn cô gái tóc đen đưa tay chạm vào một bông hoa; cả hai cùng nhìn bó hoa.",
      en: "The women are looking at some flowers.", vi: "Hai người phụ nữ đang nhìn mấy bông hoa.",
      pieces: [["The women", ""], [" are", "be"], [" look", ""], ["ing", "ing"], [" at some flowers.", ""]],
      note_vi: "The women + are; look at → looking at: thêm ing, giữ at (đang nhìn)",
      kb: { from: [0.45, 0.5, 1.0], to: [0.5, 0.5, 1.2] }, focus: { x: 0.51, y: 0.66, r: 0.12, at: 2.5, label_vi: "đang nhìn hoa" } },
    { id: "walk", img: "duo-walk", dur: 9, alt_vi: "Người pha chế mặc tạp dề vàng và cô gái đi bộ cạnh nhau trên vỉa hè trước những cửa hàng, hai người nhìn nhau mỉm cười, hai tay buông xuôi, không nắm tay nhau.",
      en: "Two people are walking side by side.", vi: "Hai người đang đi bộ sánh vai nhau.",
      pieces: [["Two people", ""], [" are", "be"], [" walk", ""], ["ing", "ing"], [" side by side.", ""]],
      note_vi: "Two people + are; walk → walking: thêm ing; side by side = sát cạnh nhau",
      kb: { from: [0.35, 0.5, 1.0], to: [0.5, 0.5, 1.2] }, focus: { x: 0.49, y: 0.7, r: 0.12, at: 2.5, label_vi: "đi sánh vai" } }
  ],
  outro: { img: "group-outro", dur: 2, alt_vi: "Bốn người bạn đứng thành một hàng, cùng mỉm cười: người pha chế mặc tạp dề vàng, cô gái, người đàn ông mặc vest và bà tóc búi đeo kính đang giơ tay vẫy.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: nhiều người thì "], ["are", "be"], [" + động từ-"], ["ing", "ing"],
    [", còn One of the men chỉ một người nên dùng "], ["is", "be"],
    [". Luôn hỏi: hành động này có đúng với tất cả những người được nhắc đến không?"]
  ] }
};
