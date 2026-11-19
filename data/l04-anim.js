/* l04-anim.js - hoat hinh anh tinh (v2, scenes) Unit 4: canh vat, khong co nguoi. Anh that do chu site cung cap (xem CREDITS-IMAGES.md); anh scn-outro tao bang tools/make-outro-grid.py. */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l04 = {
  v: 2, kind: "scenes", id: "l04",
  region_vi: "Hoạt hình mẹo cảnh vật: is/are + V-ing, is/are + V3 và hiện tại đơn",
  formula: [["Cảnh vật: "], ["is/are", "be"], [" + V-"], ["ing", "ing"], [" (đang diễn ra)  |  "], ["is/are", "be"], [" + V3 (trạng thái)  |  hiện tại đơn: runs / rise (bố cục)"]],
  sr_tail_vi: "Cảnh vật: is hoặc are cộng động từ-ing cho điều đang diễn ra, is hoặc are cộng quá khứ phân từ cho trạng thái, hiện tại đơn như runs, rise cho bố cục.",
  img: { base: "assets/img/l04/scene/", hd: "assets/img-hd/l04/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "boat", img: "scn-boat", dur: 9, alt_vi: "Một chiếc thuyền gỗ nhỏ, bên trong có ba tấm ván ngồi, nổi một mình giữa mặt hồ phẳng lặng màu tím nhạt; phía dưới là bờ cỏ, phía trên là chân trời và bầu trời. Không có mái chèo, không có cầu tàu, không có người.",
      en: "A boat is floating on the water.", vi: "Một chiếc thuyền đang nổi trên mặt nước.",
      pieces: [["A boat", ""], [" is", "be"], [" float", ""], ["ing", "ing"], [" on the water.", ""]],
      note_vi: "A boat + is (số ít); float → floating: đang nổi",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.5, 1.25] }, focus: { x: 0.5, y: 0.5, r: 0.16, at: 2.5, label_vi: "đang nổi" } },
    { id: "bridge", img: "scn-bridge", dur: 9, alt_vi: "Nhìn ngang từ bờ sông, một cây cầu đá một nhịp vòm duy nhất nằm ngang giữa khung hình, bắc qua một con sông; hai đầu cầu có lan can đá, nối hai bờ cỏ, nước sông chảy bên dưới. Không có người, không có xe, không có thuyền.",
      en: "A bridge extends over the river.", vi: "Một cây cầu bắc qua sông.",
      pieces: [["A bridge", ""], [" extends", ""], [" over the river.", ""]],
      note_vi: "A bridge (số ít) + extends: hiện tại đơn, thêm s; cây cầu \"tự\" bắc ngang",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.5, 1.1] }, focus: { x: 0.5, y: 0.52, r: 0.2, at: 2.5, label_vi: "bắc qua sông" } },
    { id: "trees", img: "scn-trees", dur: 9, alt_vi: "Một lối đi đất thẳng chạy vào xa; hai bên là hai hàng cây lớn thẳng hàng, mỗi bên năm cây, nhỏ dần về phía xa, sau hàng cây là cánh đồng vàng nhạt. Không có ghế, không có cột đèn, không có người.",
      en: "Trees are lining the path.", vi: "Những hàng cây đứng dọc hai bên lối đi.",
      pieces: [["Trees", ""], [" are", "be"], [" lin", ""], ["ing", "ing"], [" the path.", ""]],
      note_vi: "Trees + are; line → lining (bỏ e): đứng thành hàng hai bên",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.5, 1.1] }, focus: { x: 0.3, y: 0.45, r: 0.18, at: 2.5, label_vi: "hàng cây" } },
    { id: "mountains", img: "scn-mountains", dur: 9, alt_vi: "Mặt hồ phẳng yên tĩnh ở phía gần; ngay phía sau hồ là một dãy núi cao nhô lên với nhiều đỉnh nhọn màu tím nhạt, dưới bầu trời có mây. Không có người, không có thuyền, không có nhà.",
      en: "Mountains rise above the lake.", vi: "Những ngọn núi nhô cao phía trên mặt hồ.",
      pieces: [["Mountains", ""], [" rise", ""], [" above the lake.", ""]],
      note_vi: "Mountains (số nhiều) + rise: hiện tại đơn, không thêm s",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.45, 1.15] }, focus: { x: 0.33, y: 0.45, r: 0.22, at: 2.5, label_vi: "nhô cao" } },
    { id: "road", img: "scn-road", dur: 9, alt_vi: "Một con đường nhựa duy nhất, có vạch trắng ở giữa, chạy qua một cánh đồng cỏ xanh rộng rồi uốn cong ra xa phía chân trời. Hai bên chỉ có cỏ và vài bụi cây. Không có người, không có xe.",
      en: "A road runs through the field.", vi: "Một con đường chạy xuyên qua cánh đồng.",
      pieces: [["A road", ""], [" runs", ""], [" through the field.", ""]],
      note_vi: "A road (số ít) + runs: hiện tại đơn, thêm s; con đường \"tự\" chạy qua",
      kb: { from: [0.4, 0.55, 1.0], to: [0.55, 0.55, 1.15] }, focus: { x: 0.45, y: 0.58, r: 0.18, at: 2.5, label_vi: "chạy xuyên" } },
    { id: "harbor", img: "scn-harbor", dur: 9, alt_vi: "Đúng năm ngôi nhà nhiều tầng đứng thành một hàng trên bờ kè đá, mỗi nhà một màu (xanh dương, vàng, hồng đỏ, xanh lá, kem), ở phía sau, bên kia mặt nước xanh của bến cảng; phía sau nhà là đồi cây. Không có người.",
      en: "Several buildings are located along the harbor.", vi: "Vài tòa nhà nằm dọc theo bến cảng.",
      pieces: [["Several buildings", ""], [" are", "be"], [" located", ""], [" along the harbor.", ""]],
      note_vi: "Several buildings + are; located = V3 của locate: nằm ở (trạng thái)",
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.52, 1.1] }, focus: { x: 0.5, y: 0.55, r: 0.22, at: 2.5, label_vi: "dọc bến cảng" } }
  ],
  outro: { img: "scn-outro", dur: 2, alt_vi: "Ảnh ghép lưới 3x2 gồm sáu ô: thuyền gỗ trên hồ, cầu đá bắc qua sông, lối đi có hai hàng cây, núi nhô cao sau mặt hồ, con đường qua cánh đồng và dãy nhà ven bến cảng; không có người.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: cảnh vật dùng "], ["is/are", "be"], [" + V-"], ["ing", "ing"],
    [" cho điều đang diễn ra, "], ["is/are", "be"], [" + V3 cho trạng thái, và hiện tại đơn (runs, rise) cho bố cục. Ảnh không có người thì loại câu nhắc đến người, và cẩn thận với is being + V3 (thường là bẫy; ngoại lệ hay gặp: being displayed)."]
  ] }
};
