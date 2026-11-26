/* Fixture cho tools/test-check-units.mjs, test-read.mjs va test-export-blind.mjs: MOT bo triple hop le (thong bao, e-mail, tin nhan) de ghep vao unit cua read-pass.js. Khong dung that. */
window.BS_TRIPLE = {
  "id": "r2-s6",
  "kind": "triple",
  "passages": [
    {
      "id": "r2-s6-p1",
      "genre": "notice",
      "title": "Loading Bay Booking Rules",
      "paras": [
        { "en": "From next month, every outside carrier must reserve a time at Dock Three before arriving. Reservations are made through the warehouse desk, and each one lasts forty-five minutes. Drivers who come without a reservation will be asked to wait in the parking lot behind the building.", "vi": "Từ tháng sau, mọi đơn vị vận chuyển bên ngoài phải đặt giờ tại Cửa số Ba trước khi đến. Việc đặt giờ thực hiện qua quầy kho, mỗi lượt kéo dài bốn mươi lăm phút. Tài xế đến mà không đặt trước sẽ được yêu cầu chờ ở bãi xe sau tòa nhà." },
        { "en": "Loads heavier than two tons require a forklift operator, who must be requested at least one working day ahead. The desk closes at four o'clock on Fridays, so plan requests for the following week with this in mind.", "vi": "Kiện hàng nặng hơn hai tấn cần một người lái xe nâng, phải được yêu cầu trước ít nhất một ngày làm việc. Quầy đóng cửa lúc bốn giờ vào thứ Sáu, vì vậy hãy tính trước khi gửi yêu cầu cho tuần sau." }
      ]
    },
    {
      "id": "r2-s6-p2",
      "genre": "email",
      "head": [["To", "Warehouse Desk"], ["From", "Lucia Ferro, Office Manager"], ["Subject", "Cabinet delivery"]],
      "paras": [
        { "en": "Hello, our supplier is sending eight steel filing cabinets next Monday morning. Together they weigh about three whole tons. I would like the first reservation of the day, and I understand we will also need extra help to unload them.", "vi": "Xin chào, nhà cung cấp của chúng tôi sẽ gửi tám tủ hồ sơ bằng thép vào sáng thứ Hai tuần sau. Tổng cộng chúng nặng khoảng ba tấn. Tôi muốn lượt đặt đầu tiên trong ngày, và tôi hiểu rằng chúng tôi cũng sẽ cần thêm người hỗ trợ dỡ hàng." },
        { "en": "Could you also tell me whether there is a charge for this service? Please confirm by Friday afternoon so that I can send the carrier the details before the weekend.", "vi": "Bạn cũng cho tôi biết dịch vụ này có tính phí không? Vui lòng xác nhận trước chiều thứ Sáu để tôi gửi thông tin cho đơn vị vận chuyển trước cuối tuần." }
      ]
    },
    {
      "id": "r2-s6-p3",
      "genre": "chat",
      "paras": [
        { "who": "Dana Whitlock", "time": "2:10 P.M.", "en": "Lucia, I have put your cabinets down for eight o'clock on Monday.", "vi": "Lucia, tôi đã ghi tủ hồ sơ của bạn vào lúc tám giờ thứ Hai." },
        { "who": "Lucia Ferro", "time": "2:14 P.M.", "en": "Great, thank you. Is the forklift driver arranged as well?", "vi": "Tuyệt, cảm ơn bạn. Người lái xe nâng cũng được sắp xếp rồi chứ?" },
        { "who": "Dana Whitlock", "time": "2:15 P.M.", "en": "Yes, Omar will meet the truck at the dock. Please tell the carrier to check in with the gate guard first, because the north entrance is being repainted that morning.", "vi": "Rồi, Omar sẽ đón xe tải tại cửa. Vui lòng dặn đơn vị vận chuyển trình báo với bảo vệ cổng trước, vì lối vào phía bắc được sơn lại sáng hôm đó." },
        { "who": "Lucia Ferro", "time": "2:17 P.M.", "en": "Understood. I will pass that along to them this afternoon, together with your name as the contact person.", "vi": "Đã hiểu. Chiều nay tôi sẽ chuyển lời cho họ, kèm tên bạn làm người liên hệ." }
      ]
    }
  ],
  "questions": [
    {
      "id": "r2-s6-q1", "kind": "main", "q": { "en": "What is the notice mainly about?", "vi": "Thông báo chủ yếu nói về điều gì?" }, "answer": "B", "evidence": [[0, 0]], "explain_vi": "Thông báo nêu quy định đặt giờ ở khu dỡ hàng.",
      "options": [
        { "label": "A", "en": "A change in staff parking fees", "vi": "Thay đổi phí đỗ xe của nhân viên", "trap": "not-mentioned", "why_vi": "Không nói về phí." },
        { "label": "B", "en": "A new rule for arriving carriers", "vi": "Quy định mới cho đơn vị vận chuyển đến" },
        { "label": "C", "en": "A repair project at the warehouse", "vi": "Dự án sửa chữa tại kho", "trap": "other-passage", "why_vi": "Việc sơn lại nằm ở đoạn tin nhắn." },
        { "label": "D", "en": "A job opening for lift drivers", "vi": "Vị trí tuyển người lái xe nâng", "trap": "word-match", "why_vi": "Chỉ trùng từ về xe nâng." }
      ]
    },
    {
      "id": "r2-s6-q2", "kind": "detail", "cross": true, "q": { "en": "Why will Ms. Ferro's shipment need a forklift operator?", "vi": "Vì sao lô hàng của cô Ferro cần người lái xe nâng?" }, "answer": "C", "evidence": [[0, 1], [1, 0]], "explain_vi": "Ba tấn vượt quá ngưỡng hai tấn trong thông báo.",
      "options": [
        { "label": "A", "en": "It will arrive on a Friday.", "vi": "Hàng đến vào thứ Sáu.", "trap": "wrong-detail", "why_vi": "Hàng đến thứ Hai." },
        { "label": "B", "en": "It contains fragile glass panels.", "vi": "Hàng có tấm kính dễ vỡ.", "trap": "not-mentioned", "why_vi": "Không nhắc đến kính." },
        { "label": "C", "en": "It is over the stated weight limit.", "vi": "Hàng vượt mức cân nặng đã nêu." },
        { "label": "D", "en": "It must be taken to an upper floor.", "vi": "Hàng phải đưa lên tầng trên.", "trap": "over-inference", "why_vi": "Không nói về tầng lầu." }
      ]
    },
    {
      "id": "r2-s6-q3", "kind": "inference", "cross": true, "q": { "en": "What is suggested about the time given to Ms. Ferro?", "vi": "Có gợi ý gì về giờ được xếp cho cô Ferro?" }, "answer": "A", "evidence": [[1, 0], [2, 0]], "explain_vi": "Cô xin lượt đầu tiên và được xếp lúc tám giờ.",
      "options": [
        { "label": "A", "en": "It is the earliest one offered that day.", "vi": "Đó là lượt sớm nhất trong ngày." },
        { "label": "B", "en": "It is longer than a usual visit.", "vi": "Lượt này dài hơn bình thường.", "trap": "over-inference", "why_vi": "Không có thông tin về độ dài khác." },
        { "label": "C", "en": "It was changed after a complaint.", "vi": "Giờ bị đổi sau một khiếu nại.", "trap": "not-mentioned", "why_vi": "Không có khiếu nại." },
        { "label": "D", "en": "It falls after the desk has closed.", "vi": "Giờ này sau khi quầy đóng cửa.", "trap": "opposite", "why_vi": "Tám giờ sáng không phải sau giờ đóng cửa." }
      ]
    },
    {
      "id": "r2-s6-q4", "kind": "detail", "q": { "en": "By when does Ms. Ferro ask for a reply?", "vi": "Cô Ferro muốn được trả lời trước khi nào?" }, "answer": "D", "evidence": [[1, 1]], "explain_vi": "E-mail đề nghị xác nhận trước chiều thứ Sáu.",
      "options": [
        { "label": "A", "en": "Monday at eight", "vi": "Tám giờ thứ Hai", "trap": "wrong-detail", "why_vi": "Đó là giờ hàng đến." },
        { "label": "B", "en": "Thursday at noon", "vi": "Trưa thứ Năm", "trap": "not-mentioned", "why_vi": "Không nhắc thứ Năm." },
        { "label": "C", "en": "Saturday morning", "vi": "Sáng thứ Bảy", "trap": "wrong-detail", "why_vi": "Cô muốn gửi thông tin trước cuối tuần." },
        { "label": "D", "en": "Friday after lunch", "vi": "Thứ Sáu sau bữa trưa" }
      ]
    },
    {
      "id": "r2-s6-q5", "kind": "detail", "q": { "en": "What should the visiting driver do first?", "vi": "Tài xế đến nên làm gì trước?" }, "answer": "B", "evidence": [[2, 2]], "explain_vi": "Dana dặn trình báo với bảo vệ cổng trước.",
      "options": [
        { "label": "A", "en": "Wait beside the north doorway", "vi": "Chờ cạnh cửa phía bắc", "trap": "word-match", "why_vi": "Lối vào phía bắc đang được sơn." },
        { "label": "B", "en": "Report to a security worker", "vi": "Trình báo với nhân viên bảo vệ" },
        { "label": "C", "en": "Phone the office manager", "vi": "Gọi cho trưởng văn phòng", "trap": "not-mentioned", "why_vi": "Không dặn gọi điện." },
        { "label": "D", "en": "Unload the cabinets alone", "vi": "Tự dỡ tủ hồ sơ", "trap": "opposite", "why_vi": "Đã có người lái xe nâng hỗ trợ." }
      ]
    }
  ]
};
