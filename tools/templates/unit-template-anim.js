/* unit-template-anim.js - MAU hoat hinh theo du lieu cho mot unit moi. KHONG trang nao nap file nay.
 * Cach dung: sao chep thanh data/<id>-anim.js, doi het __ID__ thanh id unit (vd l02), sua noi dung,
 * dat "anim": true cho unit trong data/catalog.js, roi chay: node tools/check-units.mjs --unit <id>
 * Engine (assets/js/anim-engine.js), hinh (anim-rig.js, anim-cast.js) do loader.js tu nap; unit chi can file du lieu nay.
 * Quy tac: 1..8 canh; moi canh toi da 60 giay; tong toi da 300 giay. Chu trong du lieu chi vao trang bang textContent.
 * Dung dung ten trong danh sach: actor nam | mai | hanh; prop cup | kettle | counter | table | laptop | box;
 * backdrop kitchen | office | plain; fx stream | gaze | ring. Khong chuoi mang (http://, fetch(). */
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.__ID__ = {
  v: 1,
  id: "__ID__",                       /* phai bang id trong catalog */
  region_vi: "Hoạt hình minh họa __ID__",                     /* nhan vung cho trinh doc man hinh */
  svg_label_vi: "Hoạt hình: mô tả ngắn toàn bộ hoạt hình",   /* aria-label cua tranh */
  svg_title_vi: "Tên ngắn của tranh",
  svg_desc_vi: "Mô tả chi tiết các động tác cho người dùng trình đọc màn hình.",
  stage: { w: 360, h: 270, backdrop: "office" },              /* kich thuoc khung ve + phong */

  /* Nhan vat: khoa tuy dat (dung trong tracks/fx). actor = nam | mai | hanh. x = vi tri ngang.
   * outfit = lop trang phuc bat (apron, vest, nametag...). face = bieu cam. */
  cast: { woman: { actor: "mai", x: 120, outfit: ["nametag"], face: "smile" } },

  /* Do vat: type + toa do. z: "front" ve de len tren than nhan vat (mac dinh o sau). */
  props: {
    desk: { type: "table", x: 230, y: 190 },
    laptop: { type: "laptop", x: 230, y: 160 }
  },

  /* Hieu ung: noi cac diem neo "<doi tuong>.<neo>". Tuy chon pulse:{hz,depth} cho nhap nhay. */
  fx: {
    gaze: { type: "gaze", from: "woman.eye", to: "laptop.top", pulse: { hz: 1.1, depth: 0.45 } }
  },

  /* Cong thuc hien duoi canh: [chu, kieu]; kieu "" (thuong) | "be" | "ing" (to mau). */
  formula: [["be ("], ["is", "be"], [") + động từ-"], ["ing", "ing"], [" = đang làm gì"]],
  sr_tail_vi: "Cấu trúc be + V-ing nghĩa là đang làm gì.",     /* cau doc them cho trinh doc man hinh */

  scenes: [
    {
      id: "look",                       /* chu thuong, so, gach noi */
      dur: 7,                           /* do dai canh (giay) */
      rest: 6.8,                        /* khung tinh (che do giam chuyen dong) lay tai giay nay, 0 <= rest < dur */
      title_vi: "Nhìn màn hình",        /* tieu de canh va nhan nut "Buoc k" */
      label_vi: "nhìn màn hình",
      en: "The woman is looking at the laptop.",      /* PHAI bang cac pieces noi lai (check-units kiem) */
      /* pieces: [chu, kieu, giay-hien] theo thu tu; giay-hien tang dan, trong khoang 0..dur */
      pieces: [["The woman", "", 3.8], [" is", "be", 4.3], [" look", "", 4.8], ["ing", "ing", 5.2], [" at the laptop.", "", 5.7]],
      vi_at: 6.2,                       /* giay hien o nghia tieng Viet */
      note_vi: "look at → looking at: đang nhìn vào",
      /* tracks: moi muc dieu khien MOT kenh cua MOT doi tuong; keys = [giay, gia-tri, kieu-noi-suy?].
       * Kenh nhan vat: x, lean, headTilt, look, handL, handR (tay: "rest" | [dx,dy] | "@doi-tuong.neo"), face, sit, flip.
       * Kenh do vat: x, y, rot, opacity + tham so theo loai. Kenh hieu ung: on, opacity.
       * Kieu noi suy: mac dinh tuyen tinh; "ease" lam muot; "step" nhay ngay. Thoi gian tang dan trong canh. */
      tracks: [
        { of: "woman", ch: "headTilt", keys: [[0.5, 0], [1.5, 10, "ease"]] },
        { of: "woman", ch: "handR", keys: [[0.3, "rest"], [1.2, [14, -6], "ease"]] },
        { of: "gaze", ch: "opacity", keys: [[0, 0], [2.4, 0], [2.7, 1]] }
      ]
    }
  ],

  /* Tong ket cuoi: segs giong formula ([chu, kieu]). */
  outro: { dur: 2, title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: tìm câu "], ["be", "be"], [" + động từ-"], ["ing", "ing"], [" mô tả đúng điều đang xảy ra trong hình."]
  ] }
};
