# Từng Bước English - Luyện thi TOEIC từng bước

Trang web tĩnh (HTML/CSS/JS thuần, không cần build) giúp luyện TOEIC, học từng unit một. Toàn bộ bài học và hình minh họa là nội dung gốc do dự án tự biên soạn. Hiện có Unit 1 và Unit 2 (Part 1, nghe mô tả hình ảnh); các Part còn lại chưa có bài.

## Chạy thử

```
python -m http.server 8000
```

Mở `http://localhost:8000/` (thư mục gốc dự án). Không cần cài đặt gì thêm.

## Cấu trúc

- `index.html`: trang chủ (nút bắt đầu, lộ trình, giới thiệu). `404.html`: trang báo lỗi cho máy chủ hỗ trợ trang 404 tùy chỉnh. Lưu ý: `404.html` dùng đường dẫn gốc (`/assets/...`, `/`), giả định trang được phục vụ ở gốc tên miền; nếu đặt ở thư mục con thì phải đổi các đường dẫn đó.
- `review.html`: ôn tập. `sw.js`, `manifest.webmanifest`, `assets/icons/`, `_headers`: PWA và cấu hình Cloudflare Pages.
- `unit.html?u=<id>`: trang một unit với các tab theo thứ tự: Bài học, Hoạt hình, Từ vựng, Luyện nghe, Bài tập, Trò chơi. Tab Trò chơi có nút "Chia sẻ kết quả" (dùng chia sẻ của thiết bị hoặc chép vào bộ nhớ tạm).
- `data/catalog.js`: mục lục (Part, unit, `available`). `data/<id>.js`: nội dung unit; `data/<id>-game.js`: dữ liệu trò chơi; `data/<id>-anim.js`: dữ liệu hoạt hình (khi catalog có `"anim": true`).
- `assets/js/`: `core.js` (lưu trữ, tiến độ, HUD), `loader.js`, `home.js`, `lesson.js`, `flashcards.js`, `quiz.js`, `game.js`, `srs.js`, `review.js`, `backup.js`, `pwa.js`, `fx.js`, `mascot.js` (linh vật Bước), `anim-engine.js`, `anim-rig.js`, `anim-cast.js` (hoạt hình theo dữ liệu).
- `assets/css/`: `site.css` (token màu, giao diện chung, có chế độ tối), `nav.css`, `home-extra.css` (trang chủ và 404), `hud.css`, `learn.css`, `game.css`, `review.css`, `backup.css`, `pwa.css`, `mascot.css`. `assets/img/<id>/`: hình minh họa.

## Tiến độ học lưu ở đâu

Bài tập, thẻ đã thuộc, XP, chuỗi ngày học và giao diện sáng/tối chỉ lưu trong trình duyệt của người học (localStorage, khóa `tungbuoc.v1`). Không có máy chủ, không cookie, không công cụ theo dõi. XP từ hoạt động lặp lại (trò chơi, ôn lại thẻ) được tính tối đa 60 XP mỗi ngày. Xóa dữ liệu trình duyệt hoặc đổi trình duyệt/thiết bị thì mất tiến độ.

## Ôn tập và sao lưu

- **Ôn tập thông minh** (`review.html`, `assets/js/srs.js`): thẻ từ vựng được lặp lại ngắt quãng theo 6 hộp; mỗi phiên tối đa 20 thẻ đến hạn của mọi unit.
- **Sao lưu và khôi phục** (trang chủ, mục sao lưu): xuất tiến độ ra tệp JSON hoặc văn bản để dán, rồi nhập lại trên máy khác hoặc sau khi xóa dữ liệu. Khôi phục chỉ nhận các trường đã biết và hợp lệ; tệp sai định dạng bị từ chối nguyên tệp. Nên sao lưu định kỳ vì tiến độ chỉ nằm trên máy.

## Học khi không có mạng (PWA)

Trang là ứng dụng web cài được. Service worker (`sw.js`) **chỉ lưu các file của chính trang này** vào bộ nhớ đệm của trình duyệt để mở lại khi không có mạng; nó không gửi dữ liệu đi đâu, không gọi tên miền khác, không đọc hay ghi tiến độ học.

- Khi cài, service worker lưu sẵn khung trang (HTML, CSS, JS dùng chung, `data/catalog.js`, icon) và toàn bộ unit đã mở (`available: true` trong `data/catalog.js`: dữ liệu, trò chơi, `data/<id>-anim.js` nếu có hoạt hình, hình minh họa), nên học và ôn tập được ngay khi không có mạng. Danh sách này nằm trong `PRECACHE` của `sw.js` và do `tools/check-sw.mjs` kiểm theo catalog. Khi đổi bản, mục đã lưu lúc chạy được chép sang bản mới trước khi xóa bản cũ.
- Chỉ đăng ký trên https. Trên localhost mặc định **không** đăng ký (tránh dính cache khi biên soạn); thêm `?pwa=1` để thử. `?pwa=0` chỉ gỡ **tạm thời** service worker và xóa cache `tb-*` của lần đó; lần vào https bình thường sau đó sẽ đăng ký lại.
- Cài đặt: Chrome/Edge/Android dùng nút "Cài ứng dụng" ở mục "Về trang này" trên trang chủ (hoặc menu trình duyệt). iPhone/iPad: Safari, nút Chia sẻ, "Thêm vào Màn hình chính".
- HTML, CSS, JS và dữ liệu lấy từ mạng trước (chờ tối đa 3 giây) rồi mới dùng bản đã lưu, nên trang mới không chạy với JS cũ; ảnh và icon dùng bản đã lưu rồi cập nhật ngầm. Khi service worker mới sẵn sàng, thanh "Đã có bản mới" hiện ra: bấm "Tải lại" để chuyển sang bản mới (chỉ tab bấm mới tự tải lại), hoặc "Để sau". Phiên đang học không tự bị tải lại.

### Quy trình mỗi lần deploy (bắt buộc)

Bản hiện tại có `VERSION` là `4` (thêm hoạt hình theo dữ liệu, linh vật Bước).

1. Có sửa file nào thuộc khung hoặc unit (HTML, CSS, JS, `data/*`, hình, manifest, icon)? Chạy `node tools/check-sw.mjs --bump`: lệnh tự tăng `VERSION` (số nguyên) ở đầu `sw.js` và ghi dòng `// content-hash: <VERSION>@<hash>`. Hoặc tự đổi `VERSION` rồi chạy `node tools/check-sw.mjs --write`. Nếu nội dung đổi mà `VERSION` không đổi, check-sw báo lỗi (người đã cài sẽ tiếp tục dùng cache của `VERSION` cũ cho đến khi `VERSION` đổi).
2. `--write` chỉ ghi hash khi `VERSION` đã đổi; nó không tự đổi `VERSION`.
3. Chạy `node tools/check-sw.mjs` (phải ra "đạt", exit 0), `node tools/test-sw.mjs`, `node tools/check-units.mjs`.
4. Thêm/bớt file CSS hoặc JS dùng chung, hoặc thêm unit `available: true`: cập nhật danh sách `PRECACHE` trong `sw.js` (check-sw báo thiếu/thừa theo thư mục và catalog). Hoạt hình, dữ liệu và hình của unit chưa `available` không vào PRECACHE.
5. Trước khi phát hành lần đầu: đặt `LEGACY_ANCHOR` trong `assets/js/srs.js` bằng ngày deploy thật (không để giá trị tạm).
6. Đổi icon: sửa `tools/make-icons.py` rồi chạy `python tools/make-icons.py`.

`_headers` (Cloudflare Pages) đặt noindex, nosniff, Referrer-Policy no-referrer và không cho cache `sw.js`. Chưa có CSP. Sau khi deploy, kiểm bằng `curl -I`: `/sw.js` có `Cache-Control: no-cache`, `/manifest.webmanifest` trả `Content-Type: application/manifest+json` (hoặc JSON), các trang có `X-Robots-Tag`.

## Thêm một unit mới

Làm theo `tools/templates/HUONG-DAN-UNIT.txt` (mẫu nội dung và trò chơi nằm trong `tools/templates/`; kiểm bằng `node tools/check-units.mjs --unit <id>`). Trình nạp (`assets/js/loader.js`) tự nạp `data/<id>.js` và `data/<id>-game.js` khi `data/catalog.js` khai báo; hoạt hình chỉ nạp khi người học mở tab Hoạt hình (`BS.loadAnim`). Không cần thêm thẻ `<script>` cho từng unit. Sau khi thêm unit và đặt `available: true`, thêm các file của unit vào `PRECACHE` trong `sw.js`, rồi chạy `node tools/check-sw.mjs --bump`.

## Hoạt hình theo dữ liệu

Hoạt hình không còn là mã riêng cho từng unit. Một engine chung (`assets/js/anim-engine.js`) đọc dữ liệu cảnh của unit (`data/<id>-anim.js`, đặt `window.BS_ANIMS.<id>`) và vẽ bằng bộ hình `anim-rig.js` (khung nhân vật, đạo cụ, phông, hiệu ứng) cùng danh sách diễn viên/đạo cụ/phông ở `anim-cast.js`. Mọi hình đều tự vẽ SVG, không tải gì từ ngoài.

- Bật: trong `data/catalog.js` đặt `"anim": true` cho unit (chỉ nhận `true`, không còn dạng đường dẫn). Khi mở tab Hoạt hình, `BS.loadAnim(id)` nạp lần lượt engine, rig, cast rồi `data/<id>-anim.js` (chỉ một lần). Trang chủ và trang ôn tập không nạp phần này.
- Thêm cảnh mới: sao chép `tools/templates/unit-template-anim.js` thành `data/<id>-anim.js`, thay `__ID__`, thêm mục vào `scenes` (1 đến 8 cảnh; mỗi cảnh có `en`, `pieces`, `tracks`...). Câu `en` của cảnh phải bằng các `pieces` nối lại. Chạy `node tools/check-units.mjs --unit <id>` để kiểm (gồm `BSAnim.validate`).
- Nhân vật: Nam (nam, khoảng 28 tuổi, nhân viên quán cà phê, đóng "The man" của Unit 1), Mai (nữ, khoảng 24 tuổi, nhân viên văn phòng) và cô Hạnh (nữ, khoảng 55 tuổi, chủ tiệm hoa). Muốn thêm nhân vật hoặc đạo cụ mới: đăng ký trong `anim-cast.js` theo `tools/ANIM-RIG-CONTRACT.md`.
- Giảm chuyển động của hệ điều hành: hoạt hình dừng tự phát và có nút Trước/Tiếp; rời tab Hoạt hình thì hoạt hình tạm dừng.
- Lỗi tải: tab hiện "Không tải được hoạt hình" kèm nút "Thử lại"; phần học còn lại không ảnh hưởng.

## Linh vật Bước

Bước là chú cáo con (`assets/js/mascot.js`, `assets/css/mascot.css`) xuất hiện ở trang chủ, ôn tập và nút nhỏ trên thanh HUD. Bước chỉ chào, nhắc nhẹ giữ chuỗi ngày học và mừng khi đạt mục tiêu; không gắn XP, không âm thanh. Nút "Linh vật Bước" trên HUD bật/tắt linh vật (lưu ở `prefs.mascot`, mặc định bật, có trong sao lưu). Tắt thì mọi hình và lời nhắn của Bước ẩn, nút vẫn còn để bật lại.

## Chế độ biên tập

Thêm `?edit=1` vào địa chỉ để hiện nhãn dành cho người biên soạn (mục "Chưa kiểm tra", bản dịch bổ sung, ghi chú thiếu bản dịch); `?edit=0` để tắt. Chỉ hoạt động trên máy cục bộ (localhost, 127.0.0.1, [::1] hoặc mở file trực tiếp); trên tên miền thật tham số này bị bỏ qua.

## Lưu ý

TOEIC là nhãn hiệu của ETS. Trang này độc lập, không liên kết với hay được ETS chứng nhận.
