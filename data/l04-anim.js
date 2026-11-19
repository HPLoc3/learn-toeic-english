/* TODO khi co anh that (scn-*, scn-outro): bo "(Ảnh minh họa đang cập nhật)" khoi alt_vi cua outro, chinh lai kb/focus theo anh that, bo placeholder:true. Anh tong ket: python tools/make-outro-grid.py --src DIR --names scn-boat,scn-bridge,scn-trees,scn-mountains,scn-road,scn-harbor roi make-scenes.py --unit l04 --names scn-outro.
 * l04-anim.js - hoat hinh anh tinh (v2, scenes) Unit 4: canh vat, khong co nguoi. Anh tam (placeholder). */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l04 = {
  v: 2, kind: "scenes", id: "l04", placeholder: true,
  region_vi: "Hoạt hình mẹo cảnh vật: is/are + V-ing, is/are + V3 và hiện tại đơn",
  formula: [["Cảnh vật: "], ["is/are", "be"], [" + V-"], ["ing", "ing"], [" (đang diễn ra)  |  "], ["is/are", "be"], [" + V3 (trạng thái)  |  V-"], ["s", "ing"], [" (bố cục)"]],
  sr_tail_vi: "Cảnh vật: is hoặc are cộng động từ-ing cho điều đang diễn ra, is hoặc are cộng quá khứ phân từ cho trạng thái, hiện tại đơn cho bố cục như runs, extends.",
  img: { base: "assets/img/l04/scene/", hd: "assets/img-hd/l04/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "boat", img: "scn-boat", dur: 9, alt_vi: "Một chiếc thuyền gỗ nhỏ nổi một mình giữa mặt hồ phẳng lặng, nước xanh, xa xa là bờ cây mờ. Chỉ có một chiếc thuyền, không có người.",
      en: "A boat is floating on the water.", vi: "Một chiếc thuyền đang nổi trên mặt nước.",
      pieces: [["A boat", ""], [" is", "be"], [" float", ""], ["ing", "ing"], [" on the water.", ""]],
      note_vi: "A boat + is (số ít); float → floating: đang nổi",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.55, 1.15] }, focus: { x: 0.5, y: 0.55, r: 0.14, at: 2.5, label_vi: "đang nổi" } },
    { id: "bridge", img: "scn-bridge", dur: 9, alt_vi: "Một cây cầu duy nhất bắc ngang một con sông rộng, hai đầu cầu nối hai bờ, mặt nước xanh bên dưới. Không có người, không có xe, không có thuyền.",
      en: "A bridge extends over the river.", vi: "Một cây cầu bắc qua sông.",
      pieces: [["A bridge", ""], [" extend", ""], ["s", "ing"], [" over the river.", ""]],
      note_vi: "A bridge + extend + s: hiện tại đơn, cây cầu \"tự\" bắc ngang (bố cục)",
      kb: { from: [0.4, 0.5, 1.0], to: [0.55, 0.5, 1.15] }, focus: { x: 0.5, y: 0.5, r: 0.2, at: 2.5, label_vi: "bắc qua sông" } },
    { id: "trees", img: "scn-trees", dur: 9, alt_vi: "Một lối đi thẳng chạy vào xa, hai bên là hai hàng cây xanh thẳng hàng, mỗi bên khoảng năm cây. Không có người.",
      en: "Trees are lining the path.", vi: "Những hàng cây đứng dọc hai bên lối đi.",
      pieces: [["Trees", ""], [" are", "be"], [" lin", ""], ["ing", "ing"], [" the path.", ""]],
      note_vi: "Trees + are; line → lining (bỏ e): đứng thành hàng hai bên",
      kb: { from: [0.5, 0.5, 1.0], to: [0.35, 0.5, 1.2] }, focus: { x: 0.3, y: 0.5, r: 0.15, at: 2.5, label_vi: "hàng cây" } },
    { id: "mountains", img: "scn-mountains", dur: 9, alt_vi: "Ở phía gần là mặt hồ phẳng yên tĩnh; xa phía sau là một dãy núi xanh xám dưới trời trong. Không có người, không có thuyền, không có nhà.",
      en: "Mountains are visible in the distance.", vi: "Có thể nhìn thấy những ngọn núi ở phía xa.",
      pieces: [["Mountains", ""], [" are", "be"], [" visible in the distance.", ""]],
      note_vi: "Mountains + are (số nhiều); visible = nhìn thấy được; in the distance = ở xa",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.35, 1.2] }, focus: { x: 0.5, y: 0.3, r: 0.2, at: 2.5, label_vi: "ở phía xa" } },
    { id: "road", img: "scn-road", dur: 9, alt_vi: "Một con đường nhựa duy nhất chạy thẳng xuyên qua một cánh đồng xanh rộng, hai bên chỉ có cỏ. Không có người, không có xe.",
      en: "A road runs through the field.", vi: "Một con đường chạy xuyên qua cánh đồng.",
      pieces: [["A road", ""], [" run", ""], ["s", "ing"], [" through the field.", ""]],
      note_vi: "A road + run + s: hiện tại đơn, con đường \"tự\" chạy qua (bố cục)",
      kb: { from: [0.5, 0.45, 1.0], to: [0.5, 0.6, 1.15] }, focus: { x: 0.5, y: 0.6, r: 0.15, at: 2.5, label_vi: "chạy xuyên" } },
    { id: "harbor", img: "scn-harbor", dur: 9, alt_vi: "Một dãy khoảng năm tòa nhà nhiều màu đứng thành hàng dọc theo bờ nước của một bến cảng, mặt nước phẳng ở phía trước. Không có người.",
      en: "Several buildings are located along the harbor.", vi: "Vài tòa nhà nằm dọc theo bến cảng.",
      pieces: [["Several buildings", ""], [" are", "be"], [" locat", ""], ["ed", "ing"], [" along the harbor.", ""]],
      note_vi: "Several buildings + are; locate + d = located (V3): nằm ở, trạng thái",
      kb: { from: [0.6, 0.5, 1.0], to: [0.4, 0.5, 1.15] }, focus: { x: 0.45, y: 0.5, r: 0.2, at: 2.5, label_vi: "dọc bến cảng" } }
  ],
  outro: { img: "scn-outro", dur: 2, alt_vi: "(Ảnh minh họa đang cập nhật) Ảnh ghép lưới 3x2 gồm sáu ô nhỏ: thuyền trên mặt nước, cầu bắc qua sông, hàng cây hai bên lối đi, núi ở phía xa, con đường qua cánh đồng và dãy nhà ven bến cảng, không có người.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: cảnh vật dùng "], ["is/are", "be"], [" + V-"], ["ing", "ing"],
    [" cho điều đang diễn ra, "], ["is/are", "be"], [" + V3 cho trạng thái, và hiện tại đơn (runs, extends) cho bố cục. Ảnh không có người thì loại câu nhắc đến người, và cẩn thận với is being + V3 (trừ being displayed)."]
  ] }
};
