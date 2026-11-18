# Từng Bước English - Luyện thi TOEIC từng bước

Trang web tĩnh (HTML/CSS/JS thuần, không cần build) giúp luyện TOEIC, học từng unit một. Toàn bộ bài học và hình minh họa là nội dung gốc do dự án tự biên soạn. Hiện mới có Unit 1 (Part 1, nghe mô tả hình ảnh); các Part còn lại chưa có bài.

## Chạy thử

```
python -m http.server 8000
```

Mở `http://localhost:8000/` (thư mục gốc dự án). Không cần cài đặt gì thêm.

## Cấu trúc

- `index.html`: trang chủ (nút bắt đầu, lộ trình, giới thiệu). `404.html`: trang báo lỗi cho máy chủ hỗ trợ trang 404 tùy chỉnh. Lưu ý: `404.html` dùng đường dẫn gốc (`/assets/...`, `/`), giả định trang được phục vụ ở gốc tên miền; nếu đặt ở thư mục con thì phải đổi các đường dẫn đó.
- `review.html`: ôn tập. `sw.js`, `manifest.webmanifest`, `assets/icons/`, `_headers`: PWA và cấu hình Cloudflare Pages.
- `unit.html?u=<id>`: trang một unit với các tab theo thứ tự: Bài học, Hoạt hình, Từ vựng, Luyện nghe, Bài tập, Trò chơi. Tab Trò chơi có nút "Chia sẻ kết quả" (dùng chia sẻ của thiết bị hoặc chép vào bộ nhớ tạm).
- `data/catalog.js`: mục lục (Part, unit, `available`). `data/<id>.js`: nội dung unit; `data/<id>-game.js`: dữ liệu trò chơi.
- `assets/js/`: `core.js` (lưu trữ, tiến độ, HUD), `loader.js`, `home.js`, `lesson.js`, `flashcards.js`, `quiz.js`, `game.js`, `srs.js`, `review.js`, `backup.js`, `pwa.js`, `anim-being.js`, `fx.js`.
- `assets/css/`: `site.css` (token màu, giao diện chung, có chế độ tối), `nav.css`, `home-extra.css` (trang chủ và 404), `hud.css`, `learn.css`, `game.css`, `review.css`, `backup.css`, `pwa.css`. `assets/img/<id>/`: hình minh họa.

## Tiến độ học lưu ở đâu

Bài tập, thẻ đã thuộc, XP, chuỗi ngày học và giao diện sáng/tối chỉ lưu trong trình duyệt của người học (localStorage, khóa `tungbuoc.v1`). Không có máy chủ, không cookie, không công cụ theo dõi. XP từ hoạt động lặp lại (trò chơi, ôn lại thẻ) được tính tối đa 60 XP mỗi ngày. Xóa dữ liệu trình duyệt hoặc đổi trình duyệt/thiết bị thì mất tiến độ.

## Ôn tập và sao lưu

- **Ôn tập thông minh** (`review.html`, `assets/js/srs.js`): thẻ từ vựng được lặp lại ngắt quãng theo 6 hộp; mỗi phiên tối đa 20 thẻ đến hạn của mọi unit.
- **Sao lưu và khôi phục** (trang chủ, mục sao lưu): xuất tiến độ ra tệp JSON hoặc văn bản để dán, rồi nhập lại trên máy khác hoặc sau khi xóa dữ liệu. Khôi phục chỉ nhận các trường đã biết và hợp lệ; tệp sai định dạng bị từ chối nguyên tệp. Nên sao lưu định kỳ vì tiến độ chỉ nằm trên máy.

## Học khi không có mạng (PWA)

Trang là ứng dụng web cài được. Service worker (`sw.js`) **chỉ lưu các file của chính trang này** vào bộ nhớ đệm của trình duyệt để mở lại khi không có mạng; nó không gửi dữ liệu đi đâu, không gọi tên miền khác, không đọc hay ghi tiến độ học.

- Khung trang (HTML, CSS, JS dùng chung, `data/catalog.js`, icon) được lưu ngay khi cài. Dữ liệu và hình của từng unit chỉ được lưu khi người học mở unit đó lần đầu.
- Chỉ đăng ký trên https. Trên localhost mặc định **không** đăng ký (tránh dính cache khi biên soạn); thêm `?pwa=1` để thử, `?pwa=0` (ở mọi nơi) để gỡ service worker và xóa cache `tb-*`.
- Cài đặt: Chrome/Edge/Android dùng nút "Cài ứng dụng" ở mục "Về trang này" trên trang chủ (hoặc menu trình duyệt). iPhone/iPad: Safari, nút Chia sẻ, "Thêm vào Màn hình chính".
- Khi có bản mới, thanh "Đã có bản mới" hiện ra; bấm "Tải lại" để dùng bản mới. Trang không tự đổi bản khi người học đang học.

### Quy trình mỗi lần deploy (bắt buộc)

1. Sửa bất kỳ file nào thuộc khung (HTML, CSS, JS dùng chung, `data/catalog.js`, manifest, icon)? Đổi hằng `VERSION` ở đầu `sw.js` (vd "1" thành "2"). Nếu không đổi, người đã cài sẽ giữ bản cũ.
2. Chạy `node tools/check-sw.mjs --write` để cập nhật dòng `// content-hash:` trong `sw.js`. Lệnh này không tự đổi `VERSION`.
3. Chạy `node tools/check-sw.mjs` (phải ra "đạt", exit 0), `node tools/test-sw.mjs`, `node tools/check-units.mjs`.
4. Thêm/bớt file CSS hoặc JS dùng chung: cập nhật danh sách `PRECACHE` trong `sw.js` (check-sw báo thiếu/thừa). File hoạt hình riêng của từng unit (`anim` trong catalog) không vào PRECACHE.
5. Đổi icon: sửa `tools/make-icons.py` rồi chạy `python tools/make-icons.py`.

`_headers` (Cloudflare Pages) đặt noindex, nosniff, Referrer-Policy no-referrer và không cho cache `sw.js`. Chưa có CSP.

## Thêm một unit mới

Làm theo `tools/templates/HUONG-DAN-UNIT.txt` (mẫu nội dung và trò chơi nằm trong `tools/templates/`; kiểm bằng `node tools/check-units.mjs --unit <id>`). Trình nạp (`assets/js/loader.js`) tự nạp `data/<id>.js`, `data/<id>-game.js` và file hoạt hình khi `data/catalog.js` khai báo, nên không cần thêm thẻ `<script>` cho từng unit. Sau khi thêm unit, đổi `VERSION` của `sw.js` (vì `data/catalog.js` đổi) và chạy `node tools/check-sw.mjs --write`.

## Chế độ biên tập

Thêm `?edit=1` vào địa chỉ để hiện nhãn dành cho người biên soạn (mục "Chưa kiểm tra", bản dịch bổ sung, ghi chú thiếu bản dịch); `?edit=0` để tắt. Chỉ hoạt động trên máy cục bộ (localhost, 127.0.0.1, [::1] hoặc mở file trực tiếp); trên tên miền thật tham số này bị bỏ qua.

## Lưu ý

TOEIC là nhãn hiệu của ETS. Trang này độc lập, không liên kết với hay được ETS chứng nhận.
