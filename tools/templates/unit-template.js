/* MAU UNIT - KHONG duoc nap boi trang nao. Sao chep thanh data/<id>.js, thay __ID__ bang id that (vd: l02), roi sua noi dung.
 * Quy tac chung: khong dua dia chi mang hay lenh goi mang vao du lieu; moi id la duy nhat trong toan unit;
 * anh chi nam duoi assets/img/<id>/ va ten tep khop dung hoa/thuong.
 * Muc can nguoi xem lai: them  "v": { "status": "unverified", "note": "ly do" }  vao muc do (xoa khi da kiem tra). */
window.BS_UNITS = window.BS_UNITS || {};
window.BS_UNITS.__ID__ = {
  "id": "__ID__",                         /* PHAI bang id trong data/catalog.js va ten tep */
  "part": "Part 1 - Mô tả hình ảnh",      /* tieu de Part, hien tren dau trang */
  "unitNo": 2,                            /* PHAI bang "no" trong catalog */
  "title_vi": "Tiêu đề bài học",          /* PHAI bang title_vi trong catalog */
  "focus": {
    "intro_vi": "Giới thiệu ngắn trọng tâm bài học.",
    "tips": [
      {
        "id": "tip1",                     /* duy nhat; game co the tro toi qua {tip:"tip1", i:0} */
        "text_vi": "Nội dung mẹo 1.",
        "image": "assets/img/__ID__/focus.svg",   /* tuy chon */
        "examples": [
          { "en": "The man is standing.", "vi": "Người đàn ông đang đứng." }  /* vi tuy chon nhung nen co */
        ]
      }
    ]
  },
  "vocab": [
    /* group: nhan nhom tu (vd "focus", "fill") */
    { "id": "v001", "en": "kitchen", "vi": "nhà bếp", "group": "focus" }
  ],
  "phrases": [
    { "id": "p01", "en": "fill a cup", "vi": "rót đầy cốc", "group_vi": "Động tác với đồ vật" }
  ],
  "sentences": [
    { "id": "s01", "en": "The man is working in a kitchen.", "vi": "Người đàn ông đang làm việc trong nhà bếp." }
  ],
  "exercises": [
    {
      "id": "fill1",
      "type": "fill",                     /* dien tu */
      "instruction_vi": "Điền động từ dạng V-ing vào chỗ trống.",
      "items": [
        /* before + (cho trong) + after; answers: cac dap an chap nhan, khong rong */
        { "id": "fill1-1", "before": "The man is", "after": "an apron.", "answers": ["wearing"] }
      ]
    },
    {
      "id": "tf1",
      "type": "tf",                       /* dung / sai */
      "image": "assets/img/__ID__/tf1.svg",
      "instruction_vi": "Nhìn hình và chọn Đúng hoặc Sai.",
      "items": [
        /* label khong trung nhau; answer la true/false (boolean, khong phai chuoi) */
        { "id": "tf1-A", "label": "A", "en": "The woman is sitting on a bench.", "answer": true, "explain_vi": "Đúng: ..." },
        { "id": "tf1-B", "label": "B", "en": "The woman is holding an umbrella.", "answer": false, "explain_vi": "Sai: ..." }
      ]
    },
    {
      "id": "mc1",
      "type": "mc",                       /* trac nghiem; it nhat 2 lua chon */
      "image": "assets/img/__ID__/mc1.svg",
      "instruction_vi": "Nhìn hình và chọn câu mô tả đúng nhất.",
      "options": [
        /* why_vi chi dat o lua chon SAI (giai thich vi sao sai); lua chon dung khong can why_vi */
        { "label": "A", "en": "The woman is drinking from a mug.", "why_vi": "Vì sao sai." },
        { "label": "B", "en": "The woman is typing on a laptop." }
      ],
      "answer": "B",                     /* phai la mot trong cac label */
      "explain_vi": "Giải thích đáp án đúng."
    }
  ]
};
