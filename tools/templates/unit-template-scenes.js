/* unit-template-scenes.js - MAU hoat hinh anh tinh (Ken Burns) cho mot unit moi. KHONG trang nao nap file nay.
 * Cach dung: sao chep thanh data/<id>-anim.js, doi het __ID__ thanh id unit (vd l02), sua noi dung,
 * trong data/catalog.js dat "anim": true va "animKind": "scenes" cho unit, roi chay: node tools/check-units.mjs --unit <id>
 * Anh: tao bang tools/make-scenes.py (--unit <id> --names a,b,...): assets/img/<id>/scene/<ten>-800.webp (precache, 800x450)
 * va assets/img-hd/<id>/<ten>-1600.webp (khong precache, 1600x900). Engine assets/js/anim-scenes.js do loader.js tu nap.
 * Quy tac: 1..8 canh, moi canh 2..60 giay, tong (ca outro) toi da 300 giay. Cac manh pieces noi lai PHAI bang dung en.
 * alt_vi bat buoc (mo ta anh cho trinh doc man hinh), vi bat buoc. Tag manh: "" | "be" | "ing".
 * Xoa placeholder:true khi da dung anh that (check-units --release se tu choi placeholder). Khong chuoi mang. */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.__ID__ = {
  v: 2, kind: "scenes", id: "__ID__", placeholder: true,
  region_vi: "Hoạt hình mẹo __ID__: mô tả ngắn",
  formula: [["be ("], ["is", "be"], [") + động từ-"], ["ing", "ing"], [" = đang làm gì"]],
  sr_tail_vi: "Câu tóm tắt cho trình đọc màn hình sau mỗi câu mẫu.",
  img: { base: "assets/img/__ID__/scene/", hd: "assets/img-hd/__ID__/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "pour",                                /* duy nhat; chu thuong dau, <= 16 ky tu chu/so */
      img: "nam-pour",                           /* ten file goc: nam-pour-800.webp / nam-pour-1600.webp */
      alt_vi: "Mô tả anh: ai đang làm gì, ở đâu.",
      dur: 7,                                    /* giay, 2..60 */
      en: "He is pouring water into a cup.",
      vi: "Anh ấy đang rót nước vào cốc.",
      pieces: [["He", ""], [" is", "be"], [" pour", ""], ["ing", "ing"], [" water into a cup.", ""]],  /* noi lai === en */
      note_vi: "pour → pouring: đang rót",
      pos: [0.7, 0.4],                           /* tuy chon: neo nhan cau 0..1 */
      kb: { from: [0.5, 0.5, 1.0], to: [0.62, 0.55, 1.25] },   /* Ken Burns: [tam x, tam y, he so phong 1..2] */
      focus: { x: 0.62, y: 0.58, r: 0.12, at: 2.5, label_vi: "đang rót" } }  /* tuy chon: vong nhan manh */
  ],
  outro: { img: "duo-cafe", dur: 2, alt_vi: "Mô tả ảnh kết.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: tìm câu "], ["be", "be"], [" + động từ-"], ["ing", "ing"], [" mô tả đúng điều đang xảy ra trong hình."]
  ] }
};
