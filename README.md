# Từng Bước English - Luyện thi TOEIC từng bước

Trang web tĩnh (HTML/CSS/JS thuần, không cần build) giúp luyện TOEIC, học từng unit một. Toàn bộ bài học và hình minh họa là nội dung gốc do dự án tự biên soạn. Hiện mới có Unit 1 (Part 1, nghe mô tả hình ảnh); các Part còn lại chưa có bài.

## Chạy thử

```
python -m http.server 8000
```

Mở `http://localhost:8000/` (thư mục gốc dự án). Không cần cài đặt gì thêm.

## Cấu trúc

- `index.html`: trang chủ (nút bắt đầu, lộ trình, giới thiệu). `404.html`: trang báo lỗi cho máy chủ hỗ trợ trang 404 tùy chỉnh. Lưu ý: `404.html` dùng đường dẫn gốc (`/assets/...`, `/`), giả định trang được phục vụ ở gốc tên miền; nếu đặt ở thư mục con thì phải đổi các đường dẫn đó.
- `unit.html?u=<id>`: trang một unit với các tab theo thứ tự: Bài học, Hoạt hình, Từ vựng, Luyện nghe, Bài tập, Trò chơi. Tab Trò chơi có nút "Chia sẻ kết quả" (dùng chia sẻ của thiết bị hoặc chép vào bộ nhớ tạm).
- `data/catalog.js`: mục lục (Part, unit, `available`). `data/<id>.js`: nội dung unit; `data/<id>-game.js`: dữ liệu trò chơi.
- `assets/js/`: `core.js` (lưu trữ, tiến độ, HUD), `home.js`, `lesson.js`, `flashcards.js`, `quiz.js`, `game.js`, `anim-being.js`, `fx.js`.
- `assets/css/`: `site.css` (token màu, giao diện chung, có chế độ tối), `nav.css`, `home-extra.css` (trang chủ và 404), `hud.css`, `learn.css`, `game.css`. `assets/img/<id>/`: hình minh họa.

## Tiến độ học lưu ở đâu

Bài tập, thẻ đã thuộc, XP, chuỗi ngày học và giao diện sáng/tối chỉ lưu trong trình duyệt của người học (localStorage, khóa `tungbuoc.v1`). Không có máy chủ, không cookie, không công cụ theo dõi. XP từ hoạt động lặp lại (trò chơi, ôn lại thẻ) được tính tối đa 60 XP mỗi ngày. Xóa dữ liệu trình duyệt hoặc đổi trình duyệt/thiết bị thì mất tiến độ.

## Thêm một unit mới (các bước thủ công hiện tại)

1. Tạo `data/<id>.js` (đăng ký nội dung vào `window.BS_UNITS`, theo mẫu `data/l01.js`) và `data/<id>-game.js` (theo mẫu `data/l01-game.js`). Thêm hình vào `assets/img/<id>/`.
2. Trong `data/catalog.js`, đặt `"available": true` cho unit đó (giữ nguyên `id`, `no`, `title_vi`).
3. Thêm hai thẻ `<script>` của `data/<id>.js` và `data/<id>-game.js` vào `unit.html`; thêm `data/<id>.js` vào `index.html` (để tính tiến độ trên trang chủ), đặt trước `assets/js/core.js`.
4. Tab hoạt hình hiện chỉ làm cho `l01` (`assets/js/anim-being.js`); unit khác chưa có.

Hạn chế: chưa có công cụ build hay kiểm tra tự động, nên bước 3 dễ bị quên; mỗi unit làm thêm một script trên mỗi trang. Chưa có kênh liên hệ công khai trên trang.

## Chế độ biên tập

Thêm `?edit=1` vào địa chỉ để hiện nhãn dành cho người biên soạn (mục "Chưa kiểm tra", bản dịch bổ sung, ghi chú thiếu bản dịch); `?edit=0` để tắt. Chỉ hoạt động trên máy cục bộ (localhost, 127.0.0.1, [::1] hoặc mở file trực tiếp); trên tên miền thật tham số này bị bỏ qua.

## Lưu ý

TOEIC là nhãn hiệu của ETS. Trang này độc lập, không liên kết với hay được ETS chứng nhận.
