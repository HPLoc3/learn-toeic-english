window.BS_UNITS = window.BS_UNITS || {};
/* Fixture cho tools/test-check-units.mjs: unit Part 2 hop le (khong co v unverified). Chi 4 cau qr nen chi co canh bao so luong/phan bo. */
window.BS_UNITS["p2-01"] = {
  "id": "p2-01",
  "part": "Part 2 - Hỏi - đáp",
  "unitNo": 5,
  "title_vi": "Câu hỏi Who và Where",
  "focus": {
    "intro_vi": "Ở Part 2, bạn chỉ nghe một câu hỏi (hoặc câu nói) và ba đáp án A, B, C; không có gì được in ra. Hãy nghe từ để hỏi đầu câu: Who hỏi về người, Where hỏi về nơi chốn. Đáp án đúng thường nêu tên người, chức danh, bộ phận hoặc địa điểm.",
    "tips": [
      {
        "id": "tip1",
        "text_vi": "Với Who, đáp án đúng thường là tên người, chức danh hoặc bộ phận. Đáp án trả lời giờ giấc hoặc Yes/No là bẫy.",
        "examples": [
          {
            "q": "Who is in charge of the hiring plan?",
            "en": "Our director, Mr. Okada.",
            "vi": "Giám đốc của chúng tôi, ông Okada.",
            "q_vi": "Ai phụ trách kế hoạch tuyển dụng?"
          }
        ]
      },
      {
        "id": "tip2",
        "text_vi": "Với Where, hãy nghe cụm chỉ nơi chốn: in the storage room, at the information counter, on the second floor.",
        "examples": [
          {
            "q": "Where should I leave these boxes?",
            "en": "Over by the loading dock.",
            "vi": "Ở chỗ bốc dỡ hàng kia.",
            "q_vi": "Tôi nên để những hộp này ở đâu?"
          }
        ]
      }
    ]
  },
  "vocab": [
    {
      "id": "v001",
      "en": "head office",
      "vi": "trụ sở chính",
      "group": "Công sở"
    },
    {
      "id": "v002",
      "en": "supply closet",
      "vi": "tủ đựng văn phòng phẩm",
      "group": "Công sở"
    },
    {
      "id": "v003",
      "en": "front desk",
      "vi": "quầy lễ tân",
      "group": "Công sở"
    }
  ],
  "phrases": [
    {
      "id": "p01",
      "en": "I think it's Mr. Chen.",
      "vi": "Tôi nghĩ là ông Chen.",
      "group_vi": "Trả lời cho câu hỏi Who"
    },
    {
      "id": "p02",
      "en": "It's in the storage room.",
      "vi": "Nó ở trong phòng kho.",
      "group_vi": "Trả lời cho câu hỏi Where"
    }
  ],
  "sentences_title_vi": "Nghe và chép lại câu trả lời",
  "sentences": [
    {
      "id": "s01",
      "en": "Mr. Park from the marketing team.",
      "vi": "Ông Park ở nhóm tiếp thị."
    },
    {
      "id": "s02",
      "en": "It's on the third floor, past the elevators.",
      "vi": "Ở tầng ba, qua khỏi thang máy."
    }
  ],
  "exercises": [
    {
      "id": "qr1",
      "type": "qr",
      "instruction_vi": "Nghe câu hỏi và ba đáp án, rồi chọn câu trả lời phù hợp nhất.",
      "items": [
        {
          "id": "qr1-01",
          "kind": "who",
          "q": {
            "en": "Who is leading the sales meeting this afternoon?",
            "vi": "Ai sẽ chủ trì cuộc họp bán hàng chiều nay?"
          },
          "answer": "B",
          "explain_vi": "Who hỏi về người; B nêu tên và nơi công tác của người đó.",
          "options": [
            {
              "label": "A",
              "en": "It starts at three o'clock.",
              "vi": "Nó bắt đầu lúc ba giờ.",
              "trap": "wrong-wh",
              "why_vi": "Câu này trả lời cho When (mấy giờ), không phải Who."
            },
            {
              "label": "B",
              "en": "Ms. Alvarez from the head office.",
              "vi": "Cô Alvarez từ trụ sở chính."
            },
            {
              "label": "C",
              "en": "Yes, I led it last year.",
              "vi": "Vâng, năm ngoái tôi đã chủ trì.",
              "trap": "yesno-to-wh",
              "why_vi": "Who là câu hỏi Wh, không thể trả lời bằng Yes."
            }
          ]
        },
        {
          "id": "qr1-02",
          "kind": "where",
          "q": {
            "en": "Where did you put the new printer paper?",
            "vi": "Bạn để giấy in mới ở đâu?"
          },
          "answer": "A",
          "explain_vi": "Where hỏi nơi chốn; A nêu rõ vị trí: trong tủ văn phòng phẩm.",
          "options": [
            {
              "label": "A",
              "en": "In the supply closet, next to the copier.",
              "vi": "Trong tủ văn phòng phẩm, cạnh máy photocopy."
            },
            {
              "label": "B",
              "en": "I printed two copies.",
              "vi": "Tôi đã in hai bản.",
              "trap": "similar-sound",
              "why_vi": "\"printed\" nghe gần giống \"printer\" nhưng không nói về vị trí."
            },
            {
              "label": "C",
              "en": "About twenty dollars a box.",
              "vi": "Khoảng hai mươi đô la một hộp.",
              "trap": "wrong-wh",
              "why_vi": "Đây là câu trả lời cho How much (giá), không phải Where."
            }
          ]
        },
        {
          "id": "qr1-03",
          "kind": "where",
          "q": {
            "en": "Where can I find the visitor passes?",
            "vi": "Tôi có thể lấy thẻ khách ở đâu?"
          },
          "answer": "C",
          "explain_vi": "C chỉ nơi lấy thẻ: ở quầy lễ tân.",
          "options": [
            {
              "label": "A",
              "en": "I'm sorry, the visitors left already.",
              "vi": "Xin lỗi, khách đã về rồi.",
              "trap": "repeat-word",
              "why_vi": "Lặp lại từ visitor trong câu hỏi nhưng không nói thẻ ở đâu."
            },
            {
              "label": "B",
              "en": "At about ten past nine.",
              "vi": "Khoảng chín giờ mười.",
              "trap": "wrong-wh",
              "why_vi": "Trả lời giờ giấc (When), không phải nơi chốn."
            },
            {
              "label": "C",
              "en": "They're at the front desk.",
              "vi": "Chúng ở quầy lễ tân."
            }
          ]
        },
        {
          "id": "qr1-04",
          "kind": "who",
          "q": {
            "en": "Who should I send the invoice to?",
            "vi": "Tôi nên gửi hóa đơn cho ai?"
          },
          "answer": "B",
          "explain_vi": "B nêu người phụ trách: ông Chen ở bộ phận kế toán.",
          "options": [
            {
              "label": "A",
              "en": "Yes, I sent it yesterday.",
              "vi": "Vâng, hôm qua tôi đã gửi rồi.",
              "trap": "wrong-tense",
              "why_vi": "Câu hỏi về việc sắp làm (should I send), đáp án nói việc đã làm, và Yes không hợp với câu hỏi Who."
            },
            {
              "label": "B",
              "en": "Mr. Chen in accounting handles those.",
              "vi": "Ông Chen ở bộ phận kế toán xử lý việc đó."
            },
            {
              "label": "C",
              "en": "In a large envelope, please.",
              "vi": "Vui lòng cho vào phong bì lớn.",
              "trap": "related-word",
              "why_vi": "Envelope liên quan tới việc gửi thư nhưng không nêu người nhận."
            }
          ]
        }
      ]
    },
    {
      "id": "fill1",
      "type": "fill",
      "instruction_vi": "Điền từ để hỏi (Who hoặc Where) vào chỗ trống.",
      "items": [
        {
          "id": "fill1-1",
          "before": "",
          "after": "wrote the quarterly report?",
          "answers": [
            "Who"
          ]
        },
        {
          "id": "fill1-2",
          "before": "",
          "after": "is the nearest post office?",
          "answers": [
            "Where"
          ]
        }
      ]
    }
  ]
};
