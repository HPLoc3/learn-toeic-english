/* l02-anim.js - du lieu hoat hinh anh tinh (v2, scenes) Unit 2. placeholder: anh tam (gradient + ten canh) cho den khi co anh that; check-units --release se tu choi. */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l02 = {
  v: 2, kind: "scenes", id: "l02", placeholder: true,
  region_vi: "Hoạt hình mẹo nhiều người: are + V-ing và One of the... is + V-ing",
  formula: [["Nhiều người: "], ["are", "be"], [" + V-"], ["ing", "ing"], ["  |  One of the...: "], ["is", "be"], [" + V-"], ["ing", "ing"]],
  sr_tail_vi: "Nhiều người thì dùng are cộng động từ-ing; One of the men hay One of the women thì dùng is cộng động từ-ing.",
  img: { base: "assets/img/l02/scene/", hd: "assets/img-hd/l02/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "shake", img: "duo-shake", dur: 9, alt_vi: "Một cô gái tóc đen ngang vai và một người đàn ông mặc áo vest xanh đậm đứng đối mặt nhau, mỉm cười và bắt tay.",
      en: "They are shaking hands.", vi: "Họ đang bắt tay nhau.",
      pieces: [["They", ""], [" are", "be"], [" shak", ""], ["ing", "ing"], [" hands.", ""]],
      note_vi: "They + are; shake → shaking: bỏ e rồi thêm ing (đang bắt tay)",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.58, 1.3] }, focus: { x: 0.5, y: 0.58, r: 0.12, at: 2.5, label_vi: "đang bắt tay" } },
    { id: "meeting", img: "duo-meeting", dur: 9, alt_vi: "Cô gái và người đàn ông ngồi hai bên một cái bàn, đối diện nhau, cô gái cầm bút ghi chép.",
      en: "They are sitting across from each other.", vi: "Họ đang ngồi đối diện nhau.",
      pieces: [["They", ""], [" are", "be"], [" sitt", ""], ["ing", "ing"], [" across from each other.", ""]],
      note_vi: "sit → sitting: gấp đôi t rồi thêm ing; across from each other = đối diện nhau",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.55, 1.25] }, focus: { x: 0.5, y: 0.55, r: 0.14, at: 2.5, label_vi: "đối diện nhau" } },
    { id: "line", img: "trio-line", dur: 9, alt_vi: "Ba người, một cô gái, một người đàn ông và một bà tóc búi, đứng thành hàng chờ đến lượt.",
      en: "Some people are waiting in line.", vi: "Vài người đang xếp hàng chờ.",
      pieces: [["Some people", ""], [" are", "be"], [" wait", ""], ["ing", "ing"], [" in line.", ""]],
      note_vi: "Some people + are; wait → waiting: thêm ing (đang chờ); in line = xếp hàng",
      kb: { from: [0.4, 0.5, 1.0], to: [0.6, 0.5, 1.2] }, focus: { x: 0.5, y: 0.45, r: 0.16, at: 2.5, label_vi: "xếp hàng" } },
    { id: "serve", img: "nam-serve", dur: 9, alt_vi: "Người pha chế mặc tạp dề vàng đưa một cốc cho cô gái, bên cạnh có một người đàn ông đứng chờ.",
      en: "One of the men is handing a cup to the woman.", vi: "Một trong hai người đàn ông đang đưa cho người phụ nữ một cái cốc.",
      pieces: [["One of the men", ""], [" is", "be"], [" hand", ""], ["ing", "ing"], [" a cup to the woman.", ""]],
      note_vi: "One of the men + is (số ít!); hand → handing: đang đưa",
      kb: { from: [0.5, 0.5, 1.0], to: [0.55, 0.55, 1.3] }, focus: { x: 0.55, y: 0.55, r: 0.12, at: 2.5, label_vi: "đang đưa cốc" } },
    { id: "flowers", img: "duo-flowers", dur: 9, alt_vi: "Cô gái tóc đen và bà chủ tiệm hoa đeo kính cùng cúi nhìn mấy bông hoa.",
      en: "The women are looking at some flowers.", vi: "Hai người phụ nữ đang nhìn mấy bông hoa.",
      pieces: [["The women", ""], [" are", "be"], [" look", ""], ["ing", "ing"], [" at some flowers.", ""]],
      note_vi: "The women + are; look at → looking at: thêm ing, giữ at (đang nhìn)",
      kb: { from: [0.45, 0.5, 1.0], to: [0.55, 0.55, 1.25] }, focus: { x: 0.5, y: 0.6, r: 0.13, at: 2.5, label_vi: "đang nhìn hoa" } },
    { id: "walk", img: "duo-walk", dur: 9, alt_vi: "Người pha chế và cô gái đi bộ cạnh nhau, cùng hướng về phía trước.",
      en: "Two people are walking side by side.", vi: "Hai người đang đi bộ sánh vai nhau.",
      pieces: [["Two people", ""], [" are", "be"], [" walk", ""], ["ing", "ing"], [" side by side.", ""]],
      note_vi: "Two people + are; walk → walking: thêm ing; side by side = sát cạnh nhau",
      kb: { from: [0.35, 0.5, 1.0], to: [0.6, 0.5, 1.25] }, focus: { x: 0.5, y: 0.55, r: 0.15, at: 2.5, label_vi: "đi sánh vai" } }
  ],
  outro: { img: "group-outro", dur: 2, alt_vi: "Bốn người bạn đứng cạnh nhau, cùng mỉm cười hướng về phía trước.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: nhiều người thì "], ["are", "be"], [" + động từ-"], ["ing", "ing"],
    [", còn One of the men chỉ một người nên dùng "], ["is", "be"],
    [". Luôn hỏi: hành động này có đúng với tất cả những người được nhắc đến không?"]
  ] }
};
