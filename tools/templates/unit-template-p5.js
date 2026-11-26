/* MAU UNIT PART 5 (Hoan thanh cau) - KHONG duoc nap boi trang nao. Sao chep thanh data/p5-0N.js, thay __ID__ (vd p5-02),
 * "unitNo" = "no" trong catalog, "title_vi" = title_vi trong catalog.
 * Part 5: nguoi hoc DOC mot cau co mot cho trong "------" va chon 1 trong 4 tu A-D. Bai tap loai nay la type "gram" (assets/js/read.js): moi cau la mot muc trong "items"
 * va cham NGAY khi chon. Khong co anh, audio, tro choi, hoat hinh (de nguyen catalog khong co "game" va "anim"). Tab Luyen nghe doc cau tu tips, sentences va bai fill (khong doc cau gram).
 *
 * Moi unit (Part 5): 4 tips, 24 vocab, 10 phrases, 8 sentences ("sentences_title_vi": "Nghe va chep lai cau"), 30 cau gram chia 3 bai (g1, g2, g3 - moi bai 10 cau), 1 bai fill >= 5 cau.
 * Cau truc moi cau (item):
 *   id duy nhat TRONG CA UNIT (vd g1-01); cat: word-form, tense, voice, agreement, verb-pattern, preposition, conjunction, pronoun, relative, comparison, determiner, vocabulary, collocation
 *   pos (tuy chon, CHI cho cat word-form): noun, adjective, adverb, verb, participle - loai tu cua dap an dung
 *   en: cau tieng Anh co DUNG MOT cho trong "------" (6 dau gach), ket thuc bang . ? hoac !, 8-25 tu; khong co chuoi gach ngang nao khac
 *   vi: ban dich cau da dien dung (hien sau khi cham); answer: A-D; explain_vi: giai thich ngan (nhac vi tri, dau hieu)
 *   options: DUNG 4 muc, label A, B, C, D theo thu tu, moi muc co en (tu hoac cum tu) va vi (nghia, co the ghi loai tu: "(n) quyet dinh");
 *     dap an SAI bat buoc co "trap" + "why_vi"; dap an DUNG khong duoc co hai truong do.
 *   trap (cau): wrong-form (sai dang tu), wrong-tense, wrong-voice, wrong-agreement, wrong-structure, wrong-case, wrong-meaning, wrong-collocation, wrong-connector
 *   "v": { "status": "unverified", "note": "..." } tuy chon o bai, cau hoac dap an (check-units --release se LOI neu unit available:true con muc nay).
 * Phan bo: 23 cau word-form (danh tu, tinh tu, trang tu, dong tu, phan tu) + 7 cau khac (tense 2, preposition 2, conjunction 1, pronoun 1, vocabulary 1).
 *   Chu cai dap an dung: moi chu A-D chiem 15-35%, khong co 4 cau lien tiep cung chu; xep dap an theo luan phien da dinh truoc, KHONG chinh chu cai bang cach chi di chuyen dap an dung.
 *   Thu tu 4 dang tu phai xao tron de chu cai khong theo loai tu.
 * LUAT SOAN (ap dung tu ban nhap dau):
 *   G1: moi dap an SAI bi chan boi mot su that cu phap/ket hop tu ghi trong why_vi; "nghe it tu nhien hon" KHONG phai ly do; moi dap an phai la tu that.
 *   G2: tranh khung nhap nhang tru khi co chan ro rang: danh tu ghep vs tinh tu + danh tu; "the ___ of" cho ca danh tu va -ing; tinh tu vs phan tu deu co nghia;
 *       trang tu vs tinh tu sau look/feel/remain/prove; tinh tu gan nghia (economic/economical) ngoai cat vocabulary.
 *   G3: word-form = bon dang cua MOT goc; vocabulary/preposition/conjunction = bon tu cung loai tu, cung muc do trang trong; khong de hai lien tu cung quan he.
 *   G4: voi moi dap an sai cua vocabulary/preposition/conjunction, viet ra khung cau ma no se dung; neu khong viet duoc thi thay dap an.
 * check-units.mjs: LOI neu sai cau truc (xem tren); CANH BAO: cau ngoai 8-25 tu, < 30 cau, chu cai dap an lech, 4 cau lien tiep cung dap an, "guessability" (article: truoc cho trong la a/an ma dap an lan nguyen am/phu am;
 *   cap: chu hoa/thuong lan; root: bon dap an word-form khong chung goc; dupkey: cung dap an dung > 2 cau; len-unit: dap an dung luon dai nhat); --release: UNVERIFIED va cau gram lo o tips/phrases/sentences/fill thanh LOI.
 * KHONG LO DAP AN: cau gram (da dien dap an dung) khong duoc xuat hien nguyen van hay gan giong o tips, phrases, sentences, intro_vi, vocab, bai fill: dung kich ban KHAC. Tu vung 1-3 tu bang dap an dung thi duoc.
 * Quy trinh: README.md muc "Part 5, 6 va 7 (Doc)". Noi dung phai la GOC (ten, cong ty, dia diem tu dat). */
window.BS_UNITS = window.BS_UNITS || {};
window.BS_UNITS["__ID__"] = {
  "id": "__ID__",
  "part": "Part 5 - Hoàn thành câu",
  "unitNo": 26,   /* PHAI bang "no" trong catalog */
  "title_vi": "Tiêu đề bài học",   /* PHAI bang title_vi trong catalog */
  "focus": {
    "intro_vi": "Giới thiệu ngắn: loại câu của unit và cách làm (xác định loại từ / đọc câu hỏi trước, tìm bằng chứng trong bài).",
    "tips": [
      {
        "id": "tip1",
        "text_vi": "Nhìn vị trí chỗ trống, không dịch cả câu: sau mạo từ hoặc tính từ thường là danh từ, trước danh từ thường là tính từ, giữa trợ động từ và động từ thường là trạng từ.",
        "examples": [
          {
            "en": "She wrote a clear summary.",
            "vi": "Cô ấy viết một bản tóm tắt rõ ràng."
          },
          {
            "en": "They have almost finished.",
            "vi": "Họ gần như đã hoàn thành."
          }
        ]
      },
      {
        "id": "tip2",
        "text_vi": "Học theo họ từ: đuôi -tion, -ment, -ness thường là danh từ; đuôi -ive, -ous, -al thường là tính từ; thêm -ly thường tạo trạng từ.",
        "examples": [
          {
            "en": "The payment arrived on time.",
            "vi": "Khoản thanh toán đã đến đúng hạn."
          }
        ]
      }
    ]
  },
  "vocab": [   /* 24 muc; id v001...; group la nhom chu de */
    {
      "id": "v001",
      "en": "supervisor",
      "vi": "người giám sát",
      "group": "Công việc"
    }
  ],
  "phrases": [   /* 10 muc; id p01... */
    {
      "id": "p01",
      "en": "I'd like to request a refund.",
      "vi": "Tôi muốn yêu cầu hoàn tiền.",
      "group_vi": "Yêu cầu"
    }
  ],
  "sentences_title_vi": "Nghe và chép lại câu",
  "sentences": [   /* 8 muc; id s01...; doc bang giong trinh duyet o tab Luyen nghe */
    {
      "id": "s01",
      "en": "The vendor sent a revised estimate this morning.",
      "vi": "Sáng nay nhà cung cấp đã gửi bảng báo giá mới."
    }
  ],
  "exercises": [
    {
      "id": "g1",
      "type": "gram",   /* bai gram: mang items; chia 3 bai g1, g2, g3 (moi bai 10 cau); id cau duy nhat trong ca unit */
      "instruction_vi": "Chọn từ đúng để hoàn thành câu.",
      "items": [
        {
          "id": "g1-01",
          "cat": "word-form",   /* cat + pos (pos chi cho word-form) */
          "pos": "noun",
          "en": "The committee will announce its final ------ on the budget next Monday.",   /* mot cho trong ------; vi la ban dich cau da dien dung */
          "vi": "Ủy ban sẽ công bố quyết định cuối cùng về ngân sách vào thứ Hai tới.",
          "answer": "C",
          "explain_vi": "Sau tính từ sở hữu 'its' và tính từ 'final' cần một danh từ làm tân ngữ của 'announce'.",
          "options": [
            {
              "label": "A",
              "en": "decide",
              "vi": "(v) quyết định",
              "trap": "wrong-form",
              "why_vi": "Động từ không đứng sau 'its final'."
            },
            {
              "label": "B",
              "en": "decisive",
              "vi": "(adj) quyết đoán",
              "trap": "wrong-form",
              "why_vi": "Hai tính từ liền nhau, thiếu danh từ làm tân ngữ."
            },
            {
              "label": "C",
              "en": "decision",
              "vi": "(n) quyết định"
            },
            {
              "label": "D",
              "en": "decisively",
              "vi": "(adv) dứt khoát",
              "trap": "wrong-form",
              "why_vi": "Trạng từ không làm tân ngữ của 'announce'."
            }
          ]
        },
        {
          "id": "g1-02",
          "cat": "word-form",
          "pos": "participle",
          "en": "The manager was ------ with the results of the safety inspection.",
          "vi": "Người quản lý hài lòng với kết quả kiểm tra an toàn.",
          "answer": "B",
          "explain_vi": "Sau 'was' + 'with' cần tính từ dạng -ed chỉ cảm giác của người: 'satisfied with'.",
          "options": [
            {
              "label": "A",
              "en": "satisfy",
              "vi": "(v) làm hài lòng",
              "trap": "wrong-form",
              "why_vi": "Sau 'was' không dùng động từ nguyên mẫu."
            },
            {
              "label": "B",
              "en": "satisfied",
              "vi": "(adj) hài lòng"
            },
            {
              "label": "C",
              "en": "satisfying",
              "vi": "(adj) thỏa mãn",
              "trap": "wrong-form",
              "why_vi": "Dạng -ing nói về sự vật gây hài lòng, không đi với 'with' ở đây."
            },
            {
              "label": "D",
              "en": "satisfaction",
              "vi": "(n) sự hài lòng",
              "trap": "wrong-form",
              "why_vi": "Danh từ không đứng sau 'was' để chỉ trạng thái của người."
            }
          ]
        },
        {
          "id": "g1-03",
          "cat": "word-form",
          "pos": "adverb",
          "en": "Our technicians ------ inspect every machine before it leaves the factory.",
          "vi": "Các kỹ thuật viên của chúng tôi kiểm tra cẩn thận từng máy trước khi máy rời nhà máy.",
          "answer": "D",
          "explain_vi": "Giữa chủ ngữ và động từ 'inspect' cần một trạng từ bổ nghĩa cho động từ.",
          "options": [
            {
              "label": "A",
              "en": "careful",
              "vi": "(adj) cẩn thận",
              "trap": "wrong-form",
              "why_vi": "Tính từ không bổ nghĩa cho động từ."
            },
            {
              "label": "B",
              "en": "carefulness",
              "vi": "(n) sự cẩn thận",
              "trap": "wrong-form",
              "why_vi": "Danh từ không đứng trước động từ ở vị trí này."
            },
            {
              "label": "C",
              "en": "care",
              "vi": "(n, v) sự chăm sóc",
              "trap": "wrong-form",
              "why_vi": "Động từ nguyên mẫu không đứng liền trước động từ 'inspect' sau chủ ngữ số nhiều."
            },
            {
              "label": "D",
              "en": "carefully",
              "vi": "(adv) một cách cẩn thận"
            }
          ]
        }
      ]
    },
    {
      "id": "fill1",
      "type": "fill",   /* dien hau to/tu (khong can anh); dung kich ban KHAC voi cac cau gram */
      "instruction_vi": "Điền hậu tố còn thiếu để hoàn thành từ.",
      "items": [
        {
          "id": "fill1-1",
          "before": "The new policy is very benefic",
          "after": "to our staff.",
          "answers": [
            "ial"
          ]
        },
        {
          "id": "fill1-2",
          "before": "Please speak clear",
          "after": "so everyone can hear.",
          "answers": [
            "ly"
          ]
        },
        {
          "id": "fill1-3",
          "before": "We need an accur",
          "after": "count of the stock.",
          "answers": [
            "ate"
          ]
        },
        {
          "id": "fill1-4",
          "before": "Her apprecia",
          "after": "was shown in a short note.",
          "answers": [
            "tion"
          ]
        },
        {
          "id": "fill1-5",
          "before": "The meeting was both long and tir",
          "after": ".",
          "answers": [
            "ing"
          ]
        }
      ]
    }
  ]
};
