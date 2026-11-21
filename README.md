# Từng Bước English - Luyện thi TOEIC từng bước

Trang web tĩnh (HTML/CSS/JS thuần, không cần build) giúp luyện TOEIC, học từng unit một. Toàn bộ bài học và hình minh họa là nội dung gốc do dự án tự biên soạn. Hiện có Unit 1 đến Unit 4 (Part 1, nghe mô tả hình ảnh) và Unit 5, Unit 6 (Part 2, nghe hỏi - đáp: Who/Where, When/Why); các unit và Part còn lại chưa có bài.

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
- `assets/js/`: `core.js` (lưu trữ, tiến độ, HUD), `loader.js`, `home.js`, `lesson.js`, `flashcards.js`, `quiz.js`, `qr.js` (bài tập nghe hỏi - đáp của Part 2), `game.js`, `srs.js`, `review.js`, `backup.js`, `pwa.js`, `fx.js`, `mascot.js` (linh vật Bước), `anim-engine.js`, `anim-rig.js`, `anim-cast.js` (hoạt hình theo dữ liệu, kiểu `rig`), `anim-scenes.js` (hoạt hình ảnh tĩnh, kiểu `scenes`).
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

Giá trị `VERSION` hiện hành xem hằng số `VERSION` ở đầu `sw.js` (do `check-sw --bump` tự tăng; tài liệu này không ghi số để khỏi lỗi thời).

1. Có sửa file nào thuộc khung hoặc unit (HTML, CSS, JS, `data/*`, hình, manifest, icon)? Chạy `node tools/check-sw.mjs --bump`: lệnh tự tăng `VERSION` (số nguyên) ở đầu `sw.js` và ghi dòng `// content-hash: <VERSION>@<hash>`. Hoặc tự đổi `VERSION` rồi chạy `node tools/check-sw.mjs --write`. Nếu nội dung đổi mà `VERSION` không đổi, check-sw báo lỗi (người đã cài sẽ tiếp tục dùng cache của `VERSION` cũ cho đến khi `VERSION` đổi).
2. `--write` chỉ ghi hash khi `VERSION` đã đổi; nó không tự đổi `VERSION`.
3. Chạy `node tools/check-sw.mjs` (phải ra "đạt", exit 0), `node tools/test-sw.mjs`, `node tools/check-units.mjs`.
4. Thêm/bớt file CSS hoặc JS dùng chung, hoặc thêm unit `available: true`: cập nhật danh sách `PRECACHE` trong `sw.js` (check-sw báo thiếu/thừa theo thư mục và catalog). Hoạt hình, dữ liệu và hình của unit chưa `available` không vào PRECACHE.
5. Trước khi phát hành lần đầu: đặt `LEGACY_ANCHOR` trong `assets/js/srs.js` bằng ngày deploy thật (không để giá trị tạm). Đã đặt `"2026-11-21"` cho lần deploy đầu; chỉ là mốc cho thẻ đã thuộc từ trước khi có ôn tập, không cần đổi ở các lần sau.
6. Trước khi deploy lên https: chạy `node tools/check-units.mjs --release`. Lệnh này cố ý báo lỗi khi còn unit có `placeholder: true` (dữ liệu hoặc ảnh tạm), để không deploy nhầm ảnh tạm. Hiện không unit nào còn placeholder nên lệnh phải ra exit 0; nếu sau này có unit mới dùng `placeholder: true`, không được deploy cho đến khi thay ảnh thật và bỏ `placeholder: true`, hoặc chủ site chủ động bỏ qua cổng này (ghi lại quyết định đó). `node tools/build-dist.mjs` tự chạy cổng này (cùng `check-sw`) trước khi dựng `dist/`, nên build trên Cloudflare Pages sẽ dừng nếu cổng không qua.
7. Đổi icon: sửa `tools/make-icons.py` rồi chạy `python tools/make-icons.py`.
8. Commit rồi đẩy lên nhánh `main`: Cloudflare Pages tự build và deploy.

`_headers` (Cloudflare Pages) đặt noindex, nosniff, Referrer-Policy no-referrer và không cho cache `sw.js`. Hiện đang giữ noindex (chưa muốn lên công cụ tìm kiếm); chưa có canonical, `og:url` hay CSP. Trang được phục vụ ở gốc tên miền, không giả định thư mục con.

### Deploy lên Cloudflare Pages

Chỉ file của website được phát hành, không phải cả kho. `node tools/build-dist.mjs` làm lần lượt: chạy cổng phát hành (`check-units --release` và `check-sw`), xóa `dist/` cũ, chép vào `dist/` các file theo danh sách cho phép lấy từ `git ls-files` (nên file chưa commit không bao giờ được phát hành), rồi kiểm lại `dist/` (mọi mục `PRECACHE` và mọi file mà HTML tham chiếu đều có; không có `.md`, `.txt`, `tools/`). Danh sách cho phép: các trang `.html` ở gốc, `_headers`, `_redirects` (nếu có), `sw.js`, `manifest.webmanifest`, `favicon.ico`, thư mục `assets/` (gồm `assets/img-hd/`) và `data/`. `tools/`, các file `.md`, `HUONG-DAN.txt`, `.gitignore`, `.nojekyll` không vào `dist/`. `dist/` nằm trong `.gitignore`. Chỉ dùng thư viện chuẩn của Node (chạy được trên Node 18); kiểm bằng `node tools/test-build-dist.mjs`.

Thiết lập dự án trên Cloudflare Pages (kết nối kho Git):

| Mục | Giá trị |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | `node tools/build-dist.mjs` |
| Build output directory | `dist` |
| Root directory | để trống |
| Biến môi trường `NODE_VERSION` | không bắt buộc: script chỉ dùng API có từ Node 18 và image build của Cloudflare có sẵn Node từ 18 trở lên. Muốn cố định thì đặt `NODE_VERSION` = `20` |
| Custom domain | `hophuloc.online` (thêm ở tab Custom domains; gốc `*.pages.dev` cũng chạy được) |

Chạy thử cục bộ: `node tools/build-dist.mjs`, rồi `cd dist` và `python -m http.server 8000`.

Sau khi deploy, kiểm bằng `curl -I`: `/sw.js` có `Cache-Control: no-cache`, `/manifest.webmanifest` trả `Content-Type: application/manifest+json` (hoặc JSON), các trang có `X-Robots-Tag`. Kiểm thêm `/README.md` và `/tools/check-units.mjs` phải trả 404.

## Thêm một unit mới

Làm theo `tools/templates/HUONG-DAN-UNIT.txt` (mẫu nội dung và trò chơi nằm trong `tools/templates/`; kiểm bằng `node tools/check-units.mjs --unit <id>`). Trình nạp (`assets/js/loader.js`) tự nạp `data/<id>.js` và `data/<id>-game.js` khi `data/catalog.js` khai báo; hoạt hình chỉ nạp khi người học mở tab Hoạt hình (`BS.loadAnim`). Không cần thêm thẻ `<script>` cho từng unit. Sau khi thêm unit và đặt `available: true`, thêm các file của unit vào `PRECACHE` trong `sw.js`, rồi chạy `node tools/check-sw.mjs --bump`.

## Part 2 (Hỏi - đáp)

Part 2 của TOEIC là nghe một câu hỏi (hoặc câu nói) rồi chọn câu trả lời tốt nhất trong ba đáp án A, B, C; trên đề không in gì. Bài tập loại này là `type: "qr"` (`assets/js/qr.js`). Catalog có bảy unit `p2-01` đến `p2-07` (đã mở `p2-01` và `p2-02`; `p2-03` đến `p2-07` chưa có bài).

- Giọng đọc: chỉ dùng giọng của trình duyệt (`BS.speakSeq` trong `core.js`, file duy nhất chạm `speechSynthesis`): câu hỏi giọng en-US, ba đáp án giọng en-GB, cách nhau khoảng 0,7 giây. Không có tệp âm thanh; mỗi câu qr có trường tùy chọn `audio` ({q, A, B, C}, đường dẫn tương đối) dành cho sau này, hiện chưa được phát.
- Trước khi trả lời không in gì ra (chỉ nút Nghe và A, B, C). Sau khi chọn: hiện câu hỏi và cả ba đáp án (tiếng Anh và tiếng Việt), đáp án đúng/sai, tên bẫy kèm `why_vi` của từng đáp án sai, giải thích. Luyện tập nghe lại không giới hạn; "Chế độ thi" (chỉ trong phiên, không lưu, không nằm trong sao lưu) chỉ cho nghe một lần, tốc độ 1.0. Phím 1/2/3 chọn A/B/C và R nghe lại (chỉ tác dụng trong câu đang được focus). Máy không có giọng tiếng Anh: có thông báo và nút "Hiện lời thoại" (câu đó không được XP).
- Điểm lưu như các bài khác: `ans[id]` là "A", "B" hoặc "C", `res[id]` là 0 hoặc 1, +10 XP một lần mỗi câu; sao lưu không cần đổi định dạng. Tab Trò chơi và Hoạt hình tắt với unit Part 2.
- Cách soạn một unit: sao chép `tools/templates/unit-template-p2.js` thành `data/p2-0N.js`. Mỗi unit gồm 24 câu qr (ba bài, mỗi bài 8 câu: theo dạng câu hỏi, theo bẫy, tổng hợp) cộng một bài `fill` về từ để hỏi. Câu hỏi và đáp án đúng của qr không được trùng nguyên văn với mẹo (`q`, `en`), cụm từ, `sentences` (tab Luyện nghe) hay bài `fill` của cùng unit (lỗi của check-units, kể cả khi chạy `--unit`): viết câu khác cùng dạng; đáp án sai thì được dùng lại. Mỗi đáp án sai bắt buộc có `trap` (similar-sound, repeat-word, wrong-wh, wrong-tense, wrong-subject, related-word, yesno-to-wh) và `why_vi`; đáp án đúng không có hai trường này. Thứ tự A/B/C cố định (lời giải nhắc theo chữ cái); `kind` thuộc danh sách trong `tools/check-units.mjs`.
- Quy trình kiểm: (1) soạn (có thể đánh dấu `"v": {"status": "unverified"}` ở các câu chưa kiểm); (2) `node tools/check-units.mjs --unit p2-0N` (lỗi phải sửa; cảnh báo: dưới 20 câu qr, một chữ cái đáp án chiếm dưới 20% hoặc trên 45%, đáp án đúng lặp từ nội dung của câu hỏi); (3) mở `unit.html?u=p2-0N&edit=1` trên localhost (xem được unit chưa mở), nghe từng câu trên thiết bị thật có giọng en-US và en-GB, sửa rồi bỏ `unverified`; (4) đặt `available: true`, thêm file vào `PRECACHE`, `node tools/check-sw.mjs --bump`, rồi `node tools/check-units.mjs --release` (cổng này báo lỗi nếu còn mục `unverified` trong câu qr, kể cả trên từng đáp án). `build-dist` không phát hành `data/<id>.js` (và `-game`, `-anim`) của unit còn `available: false`; unit vẫn nằm trong catalog (lộ trình).
- Kiểm tự động: `node tools/test-qr.mjs` (speakSeq, bộ chọn giọng, đồng hồ canh, hủy, chấm điểm, khôi phục, phím tắt, Chế độ thi), `node tools/test-check-units.mjs` (luật qr, dữ liệu mẫu ở `tools/fixtures/qr-*.js`), `node tools/test-backup.mjs`.

## Hoạt hình theo dữ liệu

Hoạt hình không còn là mã riêng cho từng unit. Một engine chung (`assets/js/anim-engine.js`) đọc dữ liệu cảnh của unit (`data/<id>-anim.js`, đặt `window.BS_ANIMS.<id>`) và vẽ bằng bộ hình `anim-rig.js` (khung nhân vật, đạo cụ, phông, hiệu ứng) cùng danh sách diễn viên/đạo cụ/phông ở `anim-cast.js`. Mọi hình đều tự vẽ SVG, không tải gì từ ngoài.

- Bật: trong `data/catalog.js` đặt `"anim": true` cho unit (chỉ nhận `true`, không còn dạng đường dẫn). Khi mở tab Hoạt hình, `BS.loadAnim(id)` nạp lần lượt engine, rig, cast rồi `data/<id>-anim.js` (chỉ một lần). Trang chủ và trang ôn tập không nạp phần này.
- Thêm cảnh mới: sao chép `tools/templates/unit-template-anim.js` thành `data/<id>-anim.js`, thay `__ID__`, thêm mục vào `scenes` (1 đến 8 cảnh; mỗi cảnh có `en`, `pieces`, `tracks`...). Câu `en` của cảnh phải bằng các `pieces` nối lại. Chạy `node tools/check-units.mjs --unit <id>` để kiểm (gồm `BSAnim.validate`).
- Kiểu `scenes` (ảnh tĩnh Ken Burns): cả bốn unit hiện dùng kiểu này, bật bằng `"anim": true` cùng `"animKind": "scenes"` trong `data/catalog.js`. Engine là `assets/js/anim-scenes.js` (`window.BSScenes`), dữ liệu `data/<id>-anim.js` có dạng `v: 2, kind: "scenes"`, mẫu `tools/templates/unit-template-scenes.js`, hợp đồng ở `tools/SCENES-CONTRACT.md`. Ảnh 800w nằm ở `assets/img/<id>/scene/` (có trong precache), ảnh HD 1600w ở `assets/img-hd/<id>/` (không precache); tạo ảnh bằng `tools/make-scenes.py`. Kiểu `rig` (engine SVG ở trên) vẫn được hỗ trợ cho unit đặt `animKind` là `"rig"` hoặc không đặt.
- Đọc to câu tiếng Anh (kiểu `scenes`): khi câu mẫu của mỗi cảnh hiện ra, trình phát đọc câu tiếng Anh bằng giọng có sẵn của trình duyệt (qua `BS.speak`, không đọc phần tiếng Việt). Chỉ đọc sau khi người học bấm nút; có nút 🔊 "Nghe câu tiếng Anh" và nút bật/tắt "Tự đọc" (lưu trong tùy chọn `animSpeak`). Máy không có giọng tiếng Anh thì nút 🔊 bị vô hiệu, hoạt hình vẫn chạy bình thường.
- Nhân vật của kiểu `rig`: Nam (nam, khoảng 28 tuổi, nhân viên quán cà phê, đóng "The man" của Unit 1), Mai (nữ, khoảng 24 tuổi, nhân viên văn phòng) và cô Hạnh (nữ, khoảng 55 tuổi, chủ tiệm hoa). Muốn thêm nhân vật hoặc đạo cụ mới: đăng ký trong `anim-cast.js` theo `tools/ANIM-RIG-CONTRACT.md`.
- Giảm chuyển động của hệ điều hành: hoạt hình dừng tự phát và có nút Trước/Tiếp; rời tab Hoạt hình thì hoạt hình tạm dừng.
- Lỗi tải: tab hiện "Không tải được hoạt hình" kèm nút "Thử lại"; phần học còn lại không ảnh hưởng.

## Linh vật Bước

Bước là chú cáo con (`assets/js/mascot.js`, `assets/css/mascot.css`) xuất hiện ở trang chủ, ôn tập và nút nhỏ trên thanh HUD. Bước chỉ chào, nhắc nhẹ giữ chuỗi ngày học và mừng khi đạt mục tiêu; không gắn XP, không âm thanh. Nút "Linh vật Bước" trên HUD bật/tắt linh vật (lưu ở `prefs.mascot`, mặc định bật, có trong sao lưu). Tắt thì mọi hình và lời nhắn của Bước ẩn, nút vẫn còn để bật lại.

## Chế độ biên tập

Thêm `?edit=1` vào địa chỉ để hiện nhãn dành cho người biên soạn (mục "Chưa kiểm tra", bản dịch bổ sung, ghi chú thiếu bản dịch); `?edit=0` để tắt. Chỉ hoạt động trên máy cục bộ (localhost, 127.0.0.1, [::1] hoặc mở file trực tiếp); trên tên miền thật tham số này bị bỏ qua.

## Lưu ý

TOEIC là nhãn hiệu của ETS. Trang này độc lập, không liên kết với hay được ETS chứng nhận.
