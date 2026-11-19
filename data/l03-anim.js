/* l03-anim.js - du lieu hoat hinh anh tinh (v2, scenes) Unit 3: do vat va vi tri, khong co nguoi. Anh tam (placeholder), thay bang anh that roi bo placeholder. */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l03 = {
  v: 2, kind: "scenes", id: "l03", placeholder: true,
  region_vi: "Hoạt hình mẹo đồ vật: is/are + V3 (trạng thái) và is/are + V-ing (tư thế)",
  formula: [["Đồ vật: "], ["is/are", "be"], [" + "], ["V3", "ing"], [" (stacked, parked)  |  "], ["is/are", "be"], [" + V-"], ["ing", "ing"], [" (leaning, hanging)"]],
  sr_tail_vi: "Đồ vật nằm yên thì dùng is hoặc are cộng quá khứ phân từ, như stacked, parked; một số vật dùng is hoặc are cộng động từ-ing để tả tư thế, như leaning, hanging.",
  img: { base: "assets/img/l03/scene/", hd: "assets/img-hd/l03/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "table", img: "obj-table", dur: 9, alt_vi: "Một góc quán cà phê có cửa sổ lớn, không có người. Bốn chiếc ghế gỗ được xếp quanh một chiếc bàn tròn ở giữa; ở hai góc dưới có hai bộ bàn ghế nhỏ hơn.",
      en: "The chairs are arranged around a table.", vi: "Những cái ghế được sắp xếp quanh một cái bàn.",
      pieces: [["The chairs", ""], [" are", "be"], [" arrange", ""], ["d", "ing"], [" around a table.", ""]],
      note_vi: "The chairs + are; arrange + d = arranged (V3): trạng thái, không ai đang xếp",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.53, 1.06] }, focus: { x: 0.5, y: 0.52, r: 0.22, at: 2.5, label_vi: "quanh cái bàn" } },
    { id: "boxes", img: "obj-boxes", dur: 9, alt_vi: "Trong một phòng kho trống, một cái kệ kim loại bốn tầng; ba thùng giấy xếp chồng lên nhau ở trên cùng của kệ, không có người.",
      en: "Some boxes are stacked on a shelf.", vi: "Một vài cái thùng được xếp chồng trên kệ.",
      pieces: [["Some boxes", ""], [" are", "be"], [" stack", ""], ["ed", "ing"], [" on a shelf.", ""]],
      note_vi: "Some boxes + are; stack + ed = stacked: xếp chồng (trạng thái)",
      kb: { from: [0.5, 0.5, 1.0], to: [0.46, 0.4, 1.15] }, focus: { x: 0.42, y: 0.22, r: 0.1, at: 2.5, label_vi: "xếp chồng" } },
    { id: "bike", img: "obj-bike", dur: 9, alt_vi: "Một chiếc xe đạp màu kem đứng thẳng dựa vào bức tường gạch đỏ, hai bánh xe đặt trên vỉa hè, không có người ở gần.",
      en: "A bicycle is leaning against the wall.", vi: "Một chiếc xe đạp đang dựa vào tường.",
      pieces: [["A bicycle", ""], [" is", "be"], [" lean", ""], ["ing", "ing"], [" against the wall.", ""]],
      note_vi: "A bicycle + is (số ít); lean → leaning: tư thế dựa vào",
      kb: { from: [0.5, 0.5, 1.0], to: [0.58, 0.5, 1.08] }, focus: { x: 0.68, y: 0.55, r: 0.2, at: 2.5, label_vi: "dựa vào tường" } },
    { id: "cars", img: "obj-cars", dur: 9, alt_vi: "Trên một con phố, nhiều xe hơi đậu nối đuôi nhau dọc theo mép đường, không có người.",
      en: "Cars are parked along the street.", vi: "Những chiếc xe hơi đang đậu dọc theo con đường.",
      pieces: [["Cars", ""], [" are", "be"], [" park", ""], ["ed", "ing"], [" along the street.", ""]],
      note_vi: "Cars + are; park + ed = parked: đang đậu (trạng thái); along = dọc theo",
      kb: { from: [0.4, 0.5, 1.0], to: [0.55, 0.55, 1.2] }, focus: { x: 0.5, y: 0.65, r: 0.18, at: 2.5, label_vi: "đậu dọc đường" } },
    { id: "lamp", img: "obj-lamp", dur: 9, alt_vi: "Một chiếc đèn treo bằng dây từ trần nhà, ngay phía trên một chiếc bàn làm việc. Không có ai ở đó, trên bàn chỉ có một cuốn sổ và một cái cốc.",
      en: "A lamp is hanging above the desk.", vi: "Một cái đèn đang treo phía trên bàn làm việc.",
      pieces: [["A lamp", ""], [" is", "be"], [" hang", ""], ["ing", "ing"], [" above the desk.", ""]],
      note_vi: "A lamp + is; hang → hanging: đang treo; above = phía trên (không chạm)",
      kb: { from: [0.5, 0.45, 1.0], to: [0.5, 0.45, 1.12] }, focus: { x: 0.5, y: 0.26, r: 0.1, at: 2.5, label_vi: "đèn treo" } },
    { id: "books", img: "obj-books", dur: 9, alt_vi: "Trên một kệ sách bằng gỗ, khoảng mười một cuốn sách nhiều màu đứng sát nhau thành một hàng, gáy quay ra ngoài; các tầng khác có chậu cây nhỏ và vài món đồ trang trí, không có người.",
      en: "The books are lined up on the shelf.", vi: "Những cuốn sách được xếp thành hàng trên kệ.",
      pieces: [["The books", ""], [" are", "be"], [" line", ""], ["d", "ing"], [" up on the shelf.", ""]],
      note_vi: "The books + are; line + d = lined (V3); lined up = xếp thành hàng",
      kb: { from: [0.4, 0.5, 1.0], to: [0.36, 0.5, 1.2] }, focus: { x: 0.34, y: 0.5, r: 0.2, at: 2.5, label_vi: "xếp thành hàng" } }
  ],
  outro: { img: "obj-outro", dur: 2, alt_vi: "Ảnh ghép lưới 3x2 gồm sáu ô nhỏ: bàn ghế, thùng xếp chồng, xe đạp dựa tường, xe hơi đậu, đèn treo và kệ sách, không có người.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: đồ vật nằm yên thì dùng "], ["is/are", "be"], [" + "], ["V3", "ing"],
    [" (stacked, parked), hoặc "], ["is/are", "be"], [" + V-"], ["ing", "ing"],
    [" tả tư thế (leaning, hanging). Ảnh không có người thì loại câu nhắc đến người, và cẩn thận với is being + V3 (trừ being displayed)."]
  ] }
};
