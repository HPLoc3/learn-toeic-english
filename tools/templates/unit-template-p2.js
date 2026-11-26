/* MAU UNIT PART 2 (Hoi - dap) - KHONG duoc nap boi trang nao. Sao chep thanh data/p2-0N.js (vd p2-03), thay __ID__ = p2-03, "unitNo" = "no" trong catalog.
 * Part 2: nguoi hoc NGHE mot cau hoi/cau tran thuat va 3 cau tra loi A/B/C (khong in gi ra), chon cau tra loi tot nhat.
 * Giong doc: chi dung giong trinh duyet (cau hoi en-US, 3 dap an en-GB). Truong "audio" cua tung cau da duoc de san (chua dung).
 * KHONG LO DAP AN: cau hoi va dap an DUNG cua qr khong duoc xuat hien (nguyen van) o tips, phrases, sentences (tab Luyen nghe) hay bai fill: viet cau KHAC, cung dang
 * (check-units bao LOI, ke ca khi chay --unit). Dap an SAI (bay) thi duoc dung o noi khac. Mau duoi day dung noi dung rieng cho tips/sentences/fill.
 * Quy tac: moi id duy nhat trong unit; khong dua dia chi mang vao du lieu; unit Part 2 khong co anh, khong co tro choi, khong co hoat hinh
 * (de nguyen catalog khong co "game" va "anim"). Moi unit: 24 cau qr (3 bai x 8: theo dang, theo bay, tong hop) + 1 bai fill >= 5 cau.
 * Moi dap an SAI bat buoc co "trap" (xem danh sach duoi) va "why_vi" (vi sao sai, tieng Viet); dap an DUNG khong duoc co hai truong nay.
 * Quy trinh kiem tra noi dung: xem README.md, muc "Part 2". Cau chua duoc nguoi khac nghe/kiem: them  "v": {"status":"unverified","note":"..."}
 * (check-units --release se LOI neu con cau qr unverified trong unit available:true).
 *
 * THU TU VIET (bat buoc):
 *   1. World sheet: boi canh cua unit (nguoi, to chuc, dia diem trong danh sach ten duoc giao) va moi dieu cau hoi ngam gia dinh; dap an phai tuong thich.
 *   2. Viet cau hoi (stem) va TAT CA 3 dap an tuong thich voi world sheet.
 *   3. Dat dap an dung theo chu cai DA DUOC GIAO TRUOC (va loai cau da giao), khong tu chon theo thoi quen.
 *   4. Sua cau hoi/cau tra loi sao cho dap an da dat la dap an duy nhat dung.
 *   5. Viet cac tab bai hoc (tips, vocab, phrases, sentences, fill) sau cung, dung cau va kich ban khac. Moi noi dung de "v" unverified.
 * LUAT R1-R8 (viet cho Part 3/4; voi Part 2 doc "set" = mot cau qr, "script" = cau hoi + dap an dung):
 *   R1 Intent (Part 2 khong co cau intent): where an utterance's purpose matters, use a plain, literal sentence of fact with no idiom; idioms may stay in vocab
 *      but must not decide the key.
 *   R2 Cross-question independence: no stem or option may contain or entail another item's key.
 *   R3 Counterfactual-line test for every distractor: write the question that WOULD make that reply correct in this same world; if it is odd or contradicts the world
 *      sheet, replace the distractor (a trap must be tempting, not absurd).
 *   R4 Valence/typicality parity: the key must not be the only polite, positive or schema-default reply; take the key by rotation (the assigned letter), then edit
 *      the question to make it true.
 *   R5 All three options consistent with the world sheet; none can be dropped without hearing the question.
 *   R6 Graphic: not used in Part 2 (no graphic, no image).
 *   R7 Form: option lengths within plus or minus 30% of the mean of the others; same shape; the key is not systematically the longest or the only indirect reply.
 *   R8 Uniqueness guard: after each rewrite, re-check that exactly ONE reply answers the question naturally (indirect replies included). */
window.BS_UNITS = window.BS_UNITS || {};
window.BS_UNITS["__ID__"] = {
  "id": "__ID__",
  "part": "Part 2 - Hỏi - đáp",
  "unitNo": 5,                              /* PHAI bang "no" trong catalog */
  "title_vi": "Tiêu đề bài học",            /* PHAI bang title_vi trong catalog */
  "focus": {
    "intro_vi": "Giới thiệu ngắn: loại câu hỏi của bài và cách nhận ra đáp án đúng.",
    "tips": [
      {
        "id": "tip1",
        "text_vi": "Mẹo 1: dấu hiệu của đáp án đúng và bẫy thường gặp.",
        "examples": [
          /* q = cau hoi (en-US), en = cau tra loi (en-GB), vi = nghia cua cau tra loi, q_vi = nghia cua cau hoi (tuy chon). Nut "Nghe" doc ca hai. */
          { "q": "Who is in charge of the hiring plan?", "en": "Our director, Mr. Okada.", "vi": "Giám đốc của chúng tôi, ông Okada.", "q_vi": "Ai phụ trách kế hoạch tuyển dụng?" }
        ]
      }
    ]
  },
  "vocab": [
    { "id": "v001", "en": "head office", "vi": "trụ sở chính", "group": "Công sở" }
  ],
  "phrases": [
    /* cum tra loi dung lai duoc, nhom theo group_vi */
    { "id": "p01", "en": "I think it's Mr. Chen.", "vi": "Tôi nghĩ là ông Chen.", "group_vi": "Trả lời cho câu hỏi Who" }
  ],
  "sentences_title_vi": "Nghe và chép lại câu trả lời",   /* tuy chon: thay tieu de cua muc cau luyen nghe/chep chinh ta */
  "sentences": [
    { "id": "s01", "en": "Mr. Park from the marketing team.", "vi": "Ông Park ở nhóm tiếp thị." }
  ],
  "exercises": [
    {
      "id": "qr1",
      "type": "qr",
      "instruction_vi": "Nghe câu hỏi và ba đáp án, rồi chọn câu trả lời phù hợp nhất.",
      "items": [
        {
          "id": "qr1-01",
          /* kind: who, where, when, why, what, which, how, yesno, negative, tag, request, suggestion, offer, choice, statement, indirect */
          "kind": "who",
          "q": { "en": "Who is leading the sales meeting this afternoon?", "vi": "Ai sẽ chủ trì cuộc họp bán hàng chiều nay?" },
          "answer": "B",                    /* A, B hoac C; trat tu A/B/C co dinh (khong xao tron) vi loi giai nhac theo chu cai */
          "explain_vi": "Who hỏi về người; B nêu tên người đó.",
          /* options: DUNG 3 muc, label A, B, C theo thu tu.
           * trap (dap an sai): similar-sound (nghe gan giong), repeat-word (lap tu trong cau hoi), wrong-wh (tra loi sai loai cau hoi),
           * wrong-tense (sai thi), wrong-subject (sai chu ngu), related-word (tu lien quan nhung lac de), yesno-to-wh (Yes/No cho cau Wh). */
          "options": [
            { "label": "A", "en": "It starts at three o'clock.", "vi": "Nó bắt đầu lúc ba giờ.", "trap": "wrong-wh", "why_vi": "Trả lời cho When, không phải Who." },
            { "label": "B", "en": "Ms. Alvarez from the head office.", "vi": "Cô Alvarez từ trụ sở chính." },
            { "label": "C", "en": "Yes, I led it last year.", "vi": "Vâng, năm ngoái tôi đã chủ trì.", "trap": "yesno-to-wh", "why_vi": "Câu hỏi Wh không trả lời bằng Yes." }
          ]
          /* "audio": { "q": "assets/audio/__ID__/qr1-01-q.mp3", "A": "...", "B": "...", "C": "..." }   tuy chon, danh cho ban sau; chua duoc phat */
          /* "v": { "status": "unverified", "note": "..." }   tuy chon */
        }
      ]
    },
    {
      "id": "fill1",
      "type": "fill",                       /* dien tu hoi (khong can anh) */
      "instruction_vi": "Điền từ để hỏi vào chỗ trống.",
      "items": [
        { "id": "fill1-1", "before": "", "after": "wrote the quarterly report?", "answers": ["Who"] }
      ]
    }
  ]
};
