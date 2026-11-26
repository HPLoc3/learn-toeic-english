/* MAU UNIT PART 3 / PART 4 (hoi thoai / bai noi) - KHONG duoc nap boi trang nao. Sao chep thanh data/p3-0N.js hoac data/p4-0N.js, thay __ID__ (vd p3-03),
 * "unitNo" = "no" trong catalog, "part" = "Part 3 - Hội thoại ngắn" hoac "Part 4 - Bài nói ngắn".
 * Part 3/4: nguoi hoc DOC TRUOC 3 cau hoi (tieng Anh, 4 dap an A-D), roi NGHE mot hoi thoai (Part 3) hoac mot bai noi (Part 4), roi chon dap an.
 * Loi thoai KHONG in ra truoc khi cham; cham theo tung doan (3 cau mot lan). Bai tap loai nay la type "conv" (assets/js/conv.js).
 * Giong doc: chi dung giong trinh duyet (BS.speakSeq + BS.castVoices). Moi nguoi noi co "gender" (m|f) va "accent" (us|gb|au) de chon giong khac nhau.
 * Khong co anh, khong co audio, khong co tro choi, khong co hoat hinh (de nguyen catalog khong co "game" va "anim").
 *
 * Moi unit (Part 3/4): 4 tips, 24 vocab, 10 phrases, 8 sentences, 6 doan (sets) x 3 cau = 18 cau, 2 doan co hinh (graphic), 1 bai fill >= 5 cau.
 * Chia thanh 3 bai conv (c1: doan 1-3, c2: doan 4-6) + fill1 de du 3 bai tap. Moi bai conv co mang "sets".
 * Cau truc moi doan (set):
 *   kind: "conversation" (Part 3: 2-3 nguoi noi, it nhat 2 gioi tinh hoac 2 accent) | "talk" (Part 4: dung 1 nguoi noi)
 *   talk_type (CHI cho talk, bat buoc): announcement, advertisement, voicemail, recorded-message, tour, meeting, broadcast, speech
 *   speakers: 1-3 nguoi { id, gender: "m"|"f", accent: "us"|"gb"|"au" }; moi nguoi phai co it nhat 1 dong
 *   lines: conversation >= 4 dong, talk >= 3 dong; { s: id nguoi noi, en (<= 240 ky tu), vi }; ca doan nen 60-160 tu, moi cau <= 160 ky tu
 *   graphic (tuy chon): { type: "table", title, cols: [>= 2], rows: [>= 2 hang, moi hang du so o] } hoac { type: "list", title, items: [>= 3] }
 *   questions: DUNG 3 cau
 * Cau hoi: id duy nhat TRONG CA UNIT; kind: main, speaker, detail, problem, request, inference, next, intent, graphic.
 *   answer: A-D; options: DUNG 4 muc, label A, B, C, D theo thu tu. evidence: mang chi so dong (tinh tu 0) chua dap an (bat buoc, khong rong).
 *   Dap an SAI bat buoc co "trap" va "why_vi"; dap an DUNG khong duoc co hai truong nay.
 *   trap: heard-word (tu nghe duoc nhung sai y), wrong-speaker (nham nguoi noi), wrong-detail (sai chi tiet), not-mentioned (khong nhac den),
 *         changed-plan (ke hoach da doi), over-inference (suy luan qua da), literal (hieu theo nghia den), graphic-only (chi co trong hinh), similar-sound.
 *   kind "intent": co "quote" = nguyen van loi noi co trong mot dong (check-units kiem). Cau hoi dang: What does the man mean when he says, "..."?
 *   Cau dung hinh: "uses_graphic": true, q.en bat dau bang "Look at the graphic."; dap an dung la mot O/MUC cua hinh va KHONG xuat hien trong loi thoai.
 *   Doan co "graphic" phai co it nhat 1 cau uses_graphic. Dap an dung >= 4 tu khong duoc chep nguyen van tu loi thoai (viet lai).
 * KHONG LO LOI THOAI/DAP AN: cau trong loi thoai (>= 5 tu, >= 2 tu noi dung) va dap an DUNG (>= 4 tu) khong duoc xuat hien (nguyen van hoac gan giong) o
 * tips, phrases, sentences (tab Luyen nghe), intro_vi, vocab hay bai fill: dung KICH BAN KHAC trong cac muc do. check-units bao LOI (--release: ca canh bao gan trung
 * thanh LOI). Cau dem ngan ("Sure, no problem.") va dap an ngan khong bi bao ve. Ngoai le co chu dich khai trong QR_LEAK_ALLOW (check-units.mjs),
 * vi du "p3-03/c1-s2|*overlap*|phrases[4].en" (id doan o giua, khong phai id cau).
 * Cau chua duoc nghe/kiem: them "v": {"status":"unverified","note":"..."} o doan, cau hoac dap an (check-units --release se LOI neu unit available:true con muc nay).
 * Nghe thu tung doan tren thiet bi that (giong en-US, en-GB, en-AU) truoc khi bo unverified. Quy trinh: README.md muc "Part 3 và Part 4".
 *
 * THU TU VIET (bat buoc; ly do: viet loi thoai truoc roi bia 3 dap an sai thi 3 cau hoi + 12 dap an + hinh cung ke lai chuyen, chi dap an dung khop):
 *   1. World sheet cho tung doan: liet ke moi su that ma 3 cau hoi va hinh ngam gia dinh. MOI dap an cua moi cau phai tuong thich voi tat ca.
 *   2. Viet 3 cau hoi va TAT CA dap an, tuong thich voi world sheet.
 *   3. Dat dap an dung theo chu cai DA DUOC GIAO TRUOC (va loai cau, hang dap an cua hinh da giao), khong tu chon theo thoi quen.
 *   4. Viet loi thoai SAU CUNG sao cho dap an da dat la dung (loi thoai duoc phep sua: audio la TTS).
 *   5. Viet cac tab bai hoc (tips, vocab, phrases, sentences, fill) sau cung, dung kich ban khac. Moi noi dung de "v" unverified.
 * LUAT R1-R8 (chong doan duoc; ma loi D1-D7: D1 cau nay suy ra dap an cau kia, D2 quote thanh ngu, D3 dap an dung la muc "ôn hoa/dien hinh" duy nhat,
 * D4 dap an sai trai world sheet, D5 hinh lo dap an, D6 hinh thuc lech, D7 cau khong dung hinh lai hoi bien quyet dinh cua hinh):
 *   R1 Intent: the quote is a plain, literal sentence of fact with no idiom (e.g. "We have a waiting list for that morning"). All four options are different
 *      pragmatic functions the quote could serve. Two-context test: for at least 2 distractors you can write the alternative preceding line that would make that
 *      distractor correct; if not, rewrite. Idioms may stay in scripts/vocab but are not tested as intent. "evidence" must include a line other than the quote line.
 *   R2 Cross-question independence: no stem or option may contain or entail another question's key. Neutral stems ("Which item is the speaker calling about?",
 *      "What does the man offer?"). Where two questions are causally linked (problem and next, main and request), build a pairing matrix: each option of one has a
 *      matching option in the other, so the correlation carries no information.
 *   R3 Counterfactual-line test for every distractor of detail/problem/request/next/inference: write the single script line that would make it true in this same set;
 *      if that line is odd for the genre or contradicts the world sheet, replace the distractor.
 *   R4 Valence/typicality parity: ad options all selling points; inference options equally moderate; next/request options four equally default closings
 *      (e.g. four notification channels, four callback timings). For next/request, take the key by rotation (the assigned letter), not by schema default, then edit
 *      the script line to make it true.
 *   R5 Main/speaker: all four options consistent with the world sheet (four kinds of sale, four order changes, four scheduling purposes). If that makes the script
 *      ambiguous, replace with a detail question. Keep at least 2 speaker items per unit (unless the unit brief says otherwise).
 *   R6 Graphic: neutral titles (company name + generic noun; never a word that a question asks about, e.g. no "Weekend", "Evening", "Discounts"). Key rows: the two
 *      graphic items of a unit use different rows (use the assigned rows); across units each row is used about equally. Key is not the max/min of the relevant column
 *      unless a distractor is equally salient. No other question in the set asks about the deciding variable.
 *   R7 Form: each option length within plus or minus 30% of the mean of the other three; all four options same shape; a number option is never a sum or difference
 *      of two others.
 *   R8 Uniqueness guard: after each rewrite, re-check that the script supports exactly one option. */
window.BS_UNITS = window.BS_UNITS || {};
window.BS_UNITS["__ID__"] = {
  "id": "__ID__",
  "part": "Part 3 - Hội thoại ngắn",
  "unitNo": 12,                             /* PHAI bang "no" trong catalog */
  "title_vi": "Tiêu đề bài học",            /* PHAI bang title_vi trong catalog */
  "focus": {
    "intro_vi": "Giới thiệu ngắn: dạng hội thoại/bài nói của unit và cách tìm đáp án (đọc trước câu hỏi, nghe theo thứ tự).",
    "tips": [
      {
        "id": "tip1",
        "text_vi": "Mẹo 1: đọc trước ba câu hỏi và các đáp án; thứ tự câu hỏi thường theo thứ tự trong hội thoại.",
        "examples": [
          /* en = cau tieng Anh (doc bang en-US), vi = nghia. Dung kich ban KHAC voi cac doan nghe. */
          { "en": "What problem does the customer mention?", "vi": "Khách hàng nhắc đến vấn đề gì?" }
        ]
      },
      { "id": "tip2", "text_vi": "Mẹo 2.", "examples": [{ "en": "I'll call the vendor this afternoon.", "vi": "Chiều nay tôi sẽ gọi nhà cung cấp." }] }
    ]
  },
  "vocab": [
    { "id": "v001", "en": "invoice", "vi": "hóa đơn", "group": "Tài chính" }
  ],
  "phrases": [
    { "id": "p01", "en": "I'm calling about my order.", "vi": "Tôi gọi về đơn hàng của tôi.", "group_vi": "Mở đầu cuộc gọi" }
  ],
  "sentences_title_vi": "Nghe và chép lại câu",
  "sentences": [
    { "id": "s01", "en": "The supplier sent a revised price list.", "vi": "Nhà cung cấp đã gửi bảng giá mới." }
  ],
  "exercises": [
    {
      "id": "c1",
      "type": "conv",
      "instruction_vi": "Đọc trước 3 câu hỏi, nghe hội thoại rồi chọn đáp án.",
      "sets": [
        {
          "id": "c1-s1",
          "kind": "conversation",
          "speakers": [
            { "id": "W", "gender": "f", "accent": "gb" },
            { "id": "M", "gender": "m", "accent": "us" }
          ],
          "lines": [
            { "s": "W", "en": "Kenji, the client meeting on Tuesday has grown, and we now have ten people coming.", "vi": "Kenji, buổi họp với khách hàng vào thứ Ba đã đông hơn, giờ có mười người tham dự." },
            { "s": "M", "en": "Then the room I booked is too small. Let me look at the schedule.", "vi": "Vậy phòng tôi đặt quá nhỏ. Để tôi xem lịch." },
            { "s": "W", "en": "Is anything open? We need at least ten seats, and it has to be free by one o'clock.", "vi": "Còn phòng nào trống không? Cần ít nhất mười chỗ và phải trống trước một giờ." },
            { "s": "M", "en": "Only one room fits both. I'll reserve it right now.", "vi": "Chỉ một phòng đáp ứng cả hai. Tôi sẽ đặt ngay." },
            { "s": "W", "en": "Good. I'll ask the kitchen to send up some coffee.", "vi": "Tốt. Tôi sẽ nhờ nhà bếp mang cà phê lên." },
            { "s": "M", "en": "Sure, and I'll email everyone about the change this afternoon.", "vi": "Được, và chiều nay tôi sẽ gửi email cho mọi người về thay đổi." }
          ],
          /* hinh: bang (table) hoac danh sach (list). Ban do/thu muc cung bieu dien bang bang. */
          "graphic": {
            "type": "table", "title": "Meeting Rooms - Tuesday", "cols": ["Room", "Seats", "Free from"],
            "rows": [["Maple", "6", "1:00 P.M."], ["Cedar", "12", "3:00 P.M."], ["Birch", "10", "12:30 P.M."], ["Aspen", "8", "12:00 P.M."]]
          },
          /* "v": { "status": "unverified", "note": "..." }   tuy chon, o doan / cau / dap an */
          "questions": [
            {
              "id": "c1-s1-q1", "kind": "detail",
              "q": { "en": "Why does the man need a different room?", "vi": "Tại sao người đàn ông cần phòng khác?" },
              "answer": "B", "evidence": [0, 1],
              "explain_vi": "Số người tham dự tăng lên mười nên phòng đã đặt quá nhỏ.",
              "options": [
                { "label": "A", "en": "The projector is broken.", "vi": "Máy chiếu bị hỏng.", "trap": "not-mentioned", "why_vi": "Không có đoạn nào nhắc đến máy chiếu." },
                { "label": "B", "en": "More people will attend.", "vi": "Sẽ có nhiều người tham dự hơn." },
                { "label": "C", "en": "The client changed the date.", "vi": "Khách hàng đổi ngày.", "trap": "wrong-detail", "why_vi": "Cuộc họp vẫn vào thứ Ba." },
                { "label": "D", "en": "The room is being cleaned.", "vi": "Phòng đang được dọn.", "trap": "not-mentioned", "why_vi": "Không ai nói về việc dọn phòng." }
              ]
            },
            {
              "id": "c1-s1-q2", "kind": "graphic", "uses_graphic": true,
              "q": { "en": "Look at the graphic. Which room will the man most likely reserve?", "vi": "Nhìn hình. Người đàn ông nhiều khả năng sẽ đặt phòng nào?" },
              "answer": "C", "evidence": [2, 3],
              "explain_vi": "Cần ít nhất mười chỗ và trống trước một giờ: chỉ Birch thỏa cả hai.",
              "options": [
                { "label": "A", "en": "Maple", "vi": "Maple", "trap": "graphic-only", "why_vi": "Chỉ có 6 chỗ." },
                { "label": "B", "en": "Cedar", "vi": "Cedar", "trap": "wrong-detail", "why_vi": "Đủ chỗ nhưng chỉ trống từ 3 giờ chiều." },
                { "label": "C", "en": "Birch", "vi": "Birch" },
                { "label": "D", "en": "Aspen", "vi": "Aspen", "trap": "graphic-only", "why_vi": "Chỉ có 8 chỗ." }
              ]
            },
            {
              "id": "c1-s1-q3", "kind": "next",
              "q": { "en": "What will the man probably do next?", "vi": "Người đàn ông có thể sẽ làm gì tiếp theo?" },
              "answer": "A", "evidence": [5],
              "explain_vi": "Anh ấy nói sẽ gửi email cho mọi người về sự thay đổi.",
              "options": [
                { "label": "A", "en": "Notify the attendees of a change.", "vi": "Thông báo thay đổi cho người tham dự." },
                { "label": "B", "en": "Order coffee for the guests.", "vi": "Gọi cà phê cho khách.", "trap": "wrong-speaker", "why_vi": "Người phụ nữ mới là người nhờ nhà bếp." },
                { "label": "C", "en": "Cancel the client meeting today.", "vi": "Hủy cuộc họp với khách hôm nay.", "trap": "not-mentioned", "why_vi": "Cuộc họp vẫn diễn ra." },
                { "label": "D", "en": "Print the schedule for everyone.", "vi": "In lịch cho mọi người.", "trap": "heard-word", "why_vi": "Từ schedule được nghe thấy nhưng không có kế hoạch in." }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "c2",
      "type": "conv",
      "instruction_vi": "Đọc trước 3 câu hỏi, nghe bài nói rồi chọn đáp án.",
      "sets": [
        {
          "id": "c2-s1",
          "kind": "talk",
          "talk_type": "announcement",           /* chi cho talk: announcement, advertisement, voicemail, recorded-message, tour, meeting, broadcast, speech */
          "speakers": [{ "id": "A", "gender": "f", "accent": "au" }],
          "lines": [
            { "s": "A", "en": "Attention, shoppers. Our store will close in ten minutes, so please bring your items to the registers.", "vi": "Xin chú ý, quý khách. Cửa hàng sẽ đóng cửa sau mười phút, vui lòng mang hàng đến quầy thu ngân." },
            { "s": "A", "en": "Tonight only, every customer who spends fifty dollars will receive a free canvas bag at the front counter.", "vi": "Chỉ tối nay, mỗi khách chi năm mươi đô sẽ nhận một túi vải miễn phí tại quầy phía trước." },
            { "s": "A", "en": "We reopen tomorrow at nine. Thank you for shopping with us.", "vi": "Chúng tôi mở cửa lại lúc chín giờ sáng mai. Cảm ơn quý khách." }
          ],
          "questions": [
            {
              "id": "c2-s1-q1", "kind": "main",
              "q": { "en": "What is the purpose of the announcement?", "vi": "Mục đích của thông báo là gì?" },
              "answer": "D", "evidence": [0],
              "explain_vi": "Thông báo cửa hàng sắp đóng cửa và nhắc khách thanh toán.",
              "options": [
                { "label": "A", "en": "To advertise a new product", "vi": "Quảng cáo sản phẩm mới", "trap": "not-mentioned", "why_vi": "Không có sản phẩm mới." },
                { "label": "B", "en": "To report a delay", "vi": "Báo sự chậm trễ", "trap": "not-mentioned", "why_vi": "Không có sự chậm trễ." },
                { "label": "C", "en": "To announce a sale", "vi": "Thông báo giảm giá", "trap": "over-inference", "why_vi": "Chỉ có quà tặng, không có giảm giá." },
                { "label": "D", "en": "To say the store is closing soon", "vi": "Báo cửa hàng sắp đóng cửa" }
              ]
            },
            {
              "id": "c2-s1-q2", "kind": "detail",
              "q": { "en": "What will customers receive tonight?", "vi": "Khách sẽ nhận gì tối nay?" },
              "answer": "A", "evidence": [1],
              "explain_vi": "Khách chi năm mươi đô được tặng một túi vải.",
              "options": [
                { "label": "A", "en": "A bag", "vi": "Một chiếc túi" },
                { "label": "B", "en": "A coupon", "vi": "Một phiếu giảm giá", "trap": "not-mentioned", "why_vi": "Không có phiếu." },
                { "label": "C", "en": "A catalog", "vi": "Một cuốn danh mục", "trap": "not-mentioned", "why_vi": "Không có danh mục." },
                { "label": "D", "en": "A gift card", "vi": "Thẻ quà tặng", "trap": "similar-sound", "why_vi": "Dễ nhầm với free gift nhưng không được nhắc." }
              ]
            },
            {
              "id": "c2-s1-q3", "kind": "detail",
              "q": { "en": "When will the store open again?", "vi": "Khi nào cửa hàng mở lại?" },
              "answer": "C", "evidence": [2],
              "explain_vi": "Mở lại lúc chín giờ sáng mai.",
              "options": [
                { "label": "A", "en": "In ten minutes", "vi": "Sau mười phút", "trap": "changed-plan", "why_vi": "Mười phút là thời gian đến lúc đóng cửa." },
                { "label": "B", "en": "Tonight", "vi": "Tối nay", "trap": "wrong-detail", "why_vi": "Tối nay chỉ là lúc có quà." },
                { "label": "C", "en": "Tomorrow morning", "vi": "Sáng mai" },
                { "label": "D", "en": "Next week", "vi": "Tuần sau", "trap": "not-mentioned", "why_vi": "Không được nhắc đến." }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "fill1",
      "type": "fill",                       /* dien cum tin hieu (khong can anh); dung kich ban KHAC voi cac doan nghe */
      "instruction_vi": "Điền từ còn thiếu vào chỗ trống.",
      "items": [
        { "id": "fill1-1", "before": "I'm calling", "after": "my delivery.", "answers": ["about"] }
      ]
    }
  ]
};
