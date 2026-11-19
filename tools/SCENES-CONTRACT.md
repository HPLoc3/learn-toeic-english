# Hop dong "scenes" (hoat hinh anh tinh Ken Burns) - Executors A..E lam song song, khong hoi nhau

Mot dinh nghia duy nhat duoi day la hop dong. Engine SVG cu (anim-engine/rig/cast) KHONG sua. Chuoi du lieu chi vao DOM qua textContent/setAttribute (tru `srcset`/`src` do engine tu ghep tu `img.*`, da kiem regex).

## 0. Quan sat tu code hien co (de mirror)
- lesson.js `mountAnim`: `api = window.BSAnim.mount(host, def)` (host = #anim-root, da `textContent=""`); `null`/throw => hien "Hoat hinh chua chay duoc...". Sau do chi goi `api.pause()` (khi tab khac) va `api.destroy()` (khi mount lai). Khong dung su kien, khong tra gia tri nao khac.
- `BSAnim.mount(el, def)` tra `null` neu `!el||el.nodeType!==1||!def||validate lỗi`; tra api `{duration, play, pause, replay, seek(t), go(k), destroy}`; tu huy mount cu qua `el.__bsa`; tu `play()` luc dau neu khong reduced; dung `matchMedia('(prefers-reduced-motion: reduce)')` + listener `change`; `requestAnimationFrame` + `setTimeout 400ms` khi element an (`getClientRects().length===0`); dung `el.isConnected===false` => dung phat; **khong** phat CustomEvent, **khong** XP/mascot/storage/fetch.
- `BSAnim.validate(def, rig)` tra **mang chuoi loi** (rong = hop le); bao `try/catch` -> `['x']`. `BSAnim.validate` voi `v:2` tra mang khac rong (kiem tra bat buoc: mount cu tu choi v2).
- aria cu: root `role="region"` + `aria-label=region_vi`; nut `.bsa-btn` min 44px, `aria-disabled="true"` (khong dung `disabled`); chip buoc `aria-current="step"`; thanh `role="progressbar"`; `.bsa-sr` `aria-live="polite"`; ghi chu reduced-motion hien thong bao.

## 1. Schema du lieu v2 (`data/<id>-anim.js`, gan `window.BS_ANIMS.<id>`)
```
{ v:2, kind:"scenes", id:/^[a-z0-9_-]{1,32}$/, placeholder?:boolean,
  region_vi:str, formula:[[txt,tag?]...1..20], sr_tail_vi:str,
  img:{ base:str, hd:str, w:[800,1600], ratio:"16:9" },
  scenes:[1..8 x Scene], outro:Outro }
Scene = { id:/^[a-z][A-Za-z0-9]{0,15}$/ (duy nhat), img:/^[a-z0-9-]{1,32}$/, alt_vi:str(1..400, khong rong),
  dur:number 2..60, en:str, vi:str (khong rong), pieces:[[txt,tag?]...1..20], note_vi:str,
  pos?:[x,y] 0..1 (neo nhan cau, mac dinh [0.5,0.5]),
  kb:{ from:[cx,cy,z], to:[cx,cy,z] }  cx,cy in 0..1, z in 1..2 (tam cua so cat, he so phong),
  focus?:{ x:0..1, y:0..1, r:0.02..0.4 (ban kinh theo chieu rong anh), at:0..dur, label_vi:str } }
Outro = { img:basename, alt_vi:str, dur:2..60, title_vi:str, segs:[[txt,tag?]...] }
```
- `str` = chuoi <= 400 ky tu. `tag` in `""|"be"|"ing"` (dung lai bang tu vung cu). `pieces` noi lai PHAI bang dung `en` (so sanh `===`). Tong thoi luong (sum dur + outro.dur) <= 300. `img.base`/`img.hd` regex `^assets/img(-hd)?/[a-z0-9_-]+/(scene/)?$`; `img.w` dung `[800,1600]`. Moi `scenes[].img` va `outro.img` phai la basename hop le; `alt_vi` rong = loi. Khoa la bi bo qua (khong loi). `placeholder:true` => du lieu/anh tam (check-units --release se fail).
- Day la `BS_ANIMS.l01` day du (C ghi vao `data/l01-anim.js` nguyen van, ngoai comment dau file):
```js
window.BS_ANIMS = window.BS_ANIMS || {};
window.BS_ANIMS.l01 = {
  v: 2, kind: "scenes", id: "l01", placeholder: true,
  region_vi: "Hoạt hình mẹo be + V-ing: người trong hình đang làm gì",
  formula: [["be ("], ["is", "be"], [") + động từ-"], ["ing", "ing"], [" = đang làm gì"]],
  sr_tail_vi: "Cấu trúc be + V-ing (ở đây là is + động từ-ing) nghĩa là đang làm gì.",
  img: { base: "assets/img/l01/scene/", hd: "assets/img-hd/l01/", w: [800, 1600], ratio: "16:9" },
  scenes: [
    { id: "pour", img: "nam-pour", dur: 7, alt_vi: "Một người đàn ông trong quán cà phê đang nghiêng ấm rót nước vào chiếc cốc trên quầy.",
      en: "He is pouring water into a cup.", vi: "Anh ấy đang rót nước vào cốc.",
      pieces: [["He", ""], [" is", "be"], [" pour", ""], ["ing", "ing"], [" water into a cup.", ""]],
      note_vi: "pour → pouring: đang rót", pos: [0.7, 0.4],
      kb: { from: [0.5, 0.5, 1.0], to: [0.62, 0.55, 1.25] }, focus: { x: 0.62, y: 0.58, r: 0.12, at: 2.5, label_vi: "đang rót" } },
    { id: "wipe", img: "nam-wipe", dur: 7, alt_vi: "Người đàn ông cầm khăn lau mặt quầy bằng một tay.",
      en: "He is wiping the counter.", vi: "Anh ấy đang lau quầy.",
      pieces: [["He", ""], [" is", "be"], [" wip", ""], ["ing", "ing"], [" the counter.", ""]],
      note_vi: "wipe → wiping: bỏ e rồi thêm ing (đang lau)", pos: [0.3, 0.4],
      kb: { from: [0.6, 0.5, 1.0], to: [0.45, 0.6, 1.25] }, focus: { x: 0.45, y: 0.65, r: 0.12, at: 2.5, label_vi: "đang lau" } },
    { id: "look", img: "mai-look", dur: 7, alt_vi: "Một cô gái ngồi bàn làm việc, mắt nhìn vào tờ tài liệu cầm trên tay.",
      en: "She is looking at a document.", vi: "Cô ấy đang nhìn vào một tài liệu.",
      pieces: [["She", ""], [" is", "be"], [" look", ""], ["ing", "ing"], [" at a document.", ""]],
      note_vi: "look at → looking at: thêm ing sau động từ, giữ nguyên at (đang nhìn vào)", pos: [0.3, 0.35],
      kb: { from: [0.5, 0.5, 1.0], to: [0.4, 0.45, 1.3] }, focus: { x: 0.42, y: 0.5, r: 0.13, at: 2.5, label_vi: "đang nhìn" } },
    { id: "type", img: "mai-type", dur: 7, alt_vi: "Cô gái ngồi trước máy tính xách tay, hai tay đặt trên bàn phím.",
      en: "She is typing on a laptop.", vi: "Cô ấy đang gõ trên máy tính xách tay.",
      pieces: [["She", ""], [" is", "be"], [" typ", ""], ["ing", "ing"], [" on a laptop.", ""]],
      note_vi: "type → typing: bỏ e rồi thêm ing (đang gõ)", pos: [0.3, 0.35],
      kb: { from: [0.55, 0.5, 1.0], to: [0.5, 0.6, 1.3] }, focus: { x: 0.5, y: 0.66, r: 0.12, at: 2.5, label_vi: "đang gõ" } },
    { id: "wear", img: "hanh-wear", dur: 7, alt_vi: "Một cô gái đeo cặp kính tròn, mỉm cười nhìn thẳng về phía trước.",
      en: "She is wearing glasses.", vi: "Cô ấy đang đeo kính.",
      pieces: [["She", ""], [" is", "be"], [" wear", ""], ["ing", "ing"], [" glasses.", ""]],
      note_vi: "wear → wearing: đang đeo/mặc (trạng thái đang có trên người), khác putting on = đang mặc vào (hành động)", pos: [0.3, 0.3],
      kb: { from: [0.5, 0.5, 1.0], to: [0.5, 0.4, 1.35] }, focus: { x: 0.5, y: 0.38, r: 0.14, at: 2.5, label_vi: "đang đeo" } },
    { id: "point", img: "hanh-point", dur: 7, alt_vi: "Cô gái giơ một tay chỉ vào lọ hoa trên bàn bên cạnh.",
      en: "She is pointing at the flowers.", vi: "Cô ấy đang chỉ vào những bông hoa.",
      pieces: [["She", ""], [" is", "be"], [" point", ""], ["ing", "ing"], [" at the flowers.", ""]],
      note_vi: "point at → pointing at: thêm ing sau động từ, giữ nguyên at (đang chỉ vào)", pos: [0.3, 0.35],
      kb: { from: [0.45, 0.5, 1.0], to: [0.65, 0.5, 1.3] }, focus: { x: 0.7, y: 0.55, r: 0.13, at: 2.5, label_vi: "đang chỉ" } }
  ],
  outro: { img: "duo-cafe", dur: 2, alt_vi: "Hai người bạn ngồi cạnh nhau trong quán cà phê, cùng mỉm cười.", title_vi: "Tổng kết", segs: [
    ["Ghi nhớ nhanh: tìm câu "], ["be", "be"], [" + động từ-"], ["ing", "ing"],
    [" mô tả đúng điều đang xảy ra trong hình. Mẹo: wearing = đang mặc sẵn trên người (trạng thái); putting on = đang mặc vào (hành động)."]
  ] }
};
```
(`pos` chi dung dat vi tri nhan/ghi chu khong bat buoc; engine A co the bo qua nhung PHAI validate neu co. 7 muc = 6 scenes + outro.)

## 2. `window.BSScenes` (file `assets/js/anim-scenes.js`, <= 10240 bytes, owner A)
- `BSScenes.validate(def)` -> **mang chuoi loi** (rong = hop le), boc try/catch -> `['x']`. Kiem moi rang buoc muc 1 (v===2, kind==="scenes", alt rong, vi thieu, pieces!==en, kb/focus ngoai khoang, tong >300, img sai regex). Khong nem loi.
- `BSScenes.plan(def)` (thuan, khong DOM) -> `{ T, outroStart, scenes:[{ start, dur, at:[t_i...] , viAt, focusAt, rest }], outro:{start,dur} }`, thoi gian cuc bo giay: `at[i] = dur*(0.45+0.35*i/n)` (n = so pieces), `viAt = dur*0.88`, `focusAt = focus ? focus.at : null`, `rest = dur*0.97` (thoi diem "tinh" dung cho reduced-motion), `T = sum(dur)+outro.dur`, lam tron 3 so le.
- `BSScenes.mount(host, def)` -> `null` neu host khong phai Element, `!def` hoac `validate(def).length` (khong throw); tra api **cung hinh dang BSAnim**: `{ duration:T, play(), pause(), replay(), seek(t), go(k) (k 0..N, N = outro), destroy() }`. Huy mount cu qua `host.__bss`. Khong phat su kien, khong XP/mascot/storage/fetch. Auto `play()` neu khong reduced.
- Markup (CSS **tiem bang `<style>` trong host**, giong anim-engine; KHONG co file CSS rieng, owner A; lop tien to `bss-`):
```
<div class="bss-root" role="region" aria-label=region_vi data-r="root">
 <figure class="bss-fig"><div class="bss-stage" style="aspect-ratio:16/9">
   <img class="bss-img" alt=alt_vi srcset="<base><img>-800.webp 800w, <hd><img>-1600.webp 1600w" sizes="(max-width:720px) 100vw, 720px" src=<800 url> width=800 height=450 decoding="async" draggable="false">
   <span class="bss-ring" aria-hidden="true" hidden></span></div>
  <figcaption class="bss-cap"> <p class="bss-step"> <p class="bss-sent" lang="en"> (span.bss-p[.bss-be|.bss-ing]) <div class="bss-vi"> (formula spans + <small> note_vi) </figcaption></figure>
 <div class="bss-bar" role="progressbar" aria-label="Tiến độ hoạt hình" aria-valuemin/max/now> 
 <div class="bss-row" role="group" aria-label="Điều khiển hoạt hình"> button.bss-btn[data-a=play|pause|prev|next|replay] (type=button, min 44px, aria-disabled thay disabled)
 <div class="bss-row" role="group" aria-label="Chọn động tác"> button.bss-btn[data-s=k] "Bước k+1" aria-current="step" khi dang chon, aria-label "Chuyển tới động tác k: <note_vi hoac en>"
 <p class="bss-note" hidden> thong bao reduced-motion (cung chu voi .bsa-note)</p>
 <p class="bss-src">Ảnh minh họa do Từng Bước English tạo.</p> <div class="bss-sr" aria-live="polite">
```
  Caption nam DUOI anh. `.bss-focus` vong = `.bss-ring` dat bang `left/top` % + kich thuoc `r*2*100%` chieu rong, hien tu `focusAt`, kem nhan `label_vi` (span aria-hidden). Mau/bien lay tu CSS vars site (`--pri`, `--ink`, `--card`, ... co fallback giong `.bsa-*`). `.bss-be`/`.bss-ing` dung y style `.bsa-be/.bsa-ing`.
- Ken Burns: `transform: translate/scale` tren `<img>` (transform-origin 0 0), noi suy smoothstep `kb.from`->`kb.to` theo toan thoi luong canh; tam duoc kep de cua so khong lo ra ngoai anh (`c in [0.5/z, 1-0.5/z]`). Chuyen canh = doi `src/srcset/alt`, cap nhat chu, dat `.bss-p` bang class `bss-on` (opacity), vi `.bss-vi` hien o `viAt`.
- aria-live: mot lan moi canh khi cau + vi da hien: `"Câu mẫu: <en>. <vi>. <note_vi>. <sr_tail_vi>"`; outro: `title_vi + ". " + segs noi`. Khong noi lai trong cung canh.
- `prefers-reduced-motion: reduce`: khong Ken Burns (transform = none), khong autoplay, khong transition, doi canh tuc thi, vong `.bss-ring` hien tinh ngay, an Phat/Tam dung/hien Truoc/Tiep + `.bss-note`, moi canh o trang thai `rest` (pieces + vi + ghi chu da hien), thanh progress theo `(step+1)/(N+1)`. Doi cai dat khi dang chay => `change` listener cap nhat (dung phat, dung canh hien tai).
- onerror (moi `<img>`, theo tung anh): lan 1 -> go `srcset`, dat `src` = url 800 lai (cache-bust KHONG); lan 2 -> thay `.bss-stage` bang the `.bss-fb` (gradient `linear-gradient`, `role="img"`, `aria-label=alt_vi`, `data-fallback="1"`, chu `en` lon), van chay caption/dieu khien. Khong nem loi, khong lam gay bai hoc.
- Don dep: `destroy()` idempotent: huy raf + setTimeout, go moi listener (click, matchMedia, img error), `host.__bss=null`, `host.textContent=''`. Khi `host.isConnected===false` sau khi tung noi => tu dung phat; khi an (`getClientRects().length===0`) cho 400ms roi thu lai (nhu engine cu). Tat ca timer duoc dem de test.
- Cam trong file: `fetch(`, `XMLHttpRequest`, `localStorage`, `eval(`, `new Function`, `innerHTML` voi chuoi du lieu (chi cho khung tinh + gia tri da regex).

## 3. Catalog + loader (owner C: catalog, owner D: loader/lesson)
- `data/catalog.js` unit l01: giu `"anim": true` va them `"animKind": "scenes"`. Gia tri khac / thieu = engine SVG cu.
- `BS.loadAnim(id, cb)` (D): kind = `entry.animKind === "scenes" ? "scenes" : "rig"` (gia tri la => "rig", tuong thich nguoc). Danh sach dung chung: scenes -> `["assets/js/anim-scenes.js"]`, rig -> bo ba cu. Trang thai `sharedState` va hang doi **theo tung kind** (map). Ready check: scenes `!!window.BSScenes`, rig `!!(window.BSAnim && window.BSRig)`; thieu => state `null` (cho thu lai) va `cb(null,"load-error")`. Thu tu giu nguyen: nap shared roi `data/<id>-anim.js`; shortcut cache chi khi `BS_ANIMS[id]` co va state kind do `"ok"`; `not-found` neu `anim!==true`. Timeout 10s, goi cb mot lan.
- `lesson.js mountAnim` (D): `var eng = def.kind === "scenes" ? window.BSScenes : window.BSAnim; api = eng && typeof eng.mount==="function" ? eng.mount(host, def) : null;` phan con lai y nguyen (null => thong bao "chưa chạy được"). `def.kind` la/khong co => engine cu. Ket hop cu: loader cu + data v2 => nap trio cu, `BSAnim.mount` tu choi v2 (validate), hien thong bao "chưa chạy được", khong vo.
- Cap nhat `tools/check-units.mjs` (D): voi `anim:true` + `animKind:"scenes"`, kiem `data/<id>-anim.js` qua `BSScenes.validate`, kiem file anh 800 ton tai; `--release` fail neu `placeholder:true`.

## 4. File anh (owner B tao; ten co dinh)
- Kich thuoc dung `800x450` (precache) va `1600x900` (hd, KHONG precache); WebP, 16:9. Duong dan: `assets/img/l01/scene/<name>-800.webp`, `assets/img-hd/l01/<name>-1600.webp`.
- 7 ten goc (basename): `nam-pour`, `nam-wipe`, `mai-look`, `mai-type`, `hanh-wear`, `hanh-point`, `duo-cafe` => 14 file.
- Tran dung luong: 800 <= 110000 byte/file, 1600 <= 280000 byte/file; tong 7 file 800 <= 800000 byte/unit.

## 5. `tools/make-scenes.py` (owner B, Python 3 + Pillow, chay tu goc repo)
`python tools/make-scenes.py [--src DIR] [--unit l01] [--names a,b,...] [--out800 DIR] [--outhd DIR] [--cap800 110000] [--cap1600 280000] [--crop NAME=cx,cy] [--placeholder] [--dry-run]`
- Mac dinh: `--src ..\nguon-hinh\agy-anh`, `--unit l01`, `--names` = 7 ten muc 4, `--out800 assets/img/<unit>/scene`, `--outhd assets/img-hd/<unit>`. Anh nguon `<name>.png|jpg|jpeg` (bo qua ten `*-sheet.*`); thieu anh nguon (khi khong placeholder) => bao ten thieu, thoat ma 2.
- Xu ly: cat giua 16:9 (hoac tam `--crop NAME=cx,cy` 0..1), Lanczos ve 800x450 va 1600x900, WebP `method=6`, xoa metadata, `quality` bat dau 82 giam dan 4 buoc toi 60 den khi <= cap; khong dat cap => thoat ma 3 + in ten file.
- `--placeholder`: khong can nguon; ve gradient phang (mau dinh theo hash ten, khong ngau nhien => byte tai lap duoc) + ten canh bang `ImageFont.load_default()`, cung ten/kich thuoc/cap. In bang `file  WxH  bytes` va tong. Ma 0 neu thanh cong. Khong ghi file ngoai hai thu muc dau ra.
- B cung viet `CREDITS-IMAGES.md` (goc repo, khong precache): bang `file | cong cu | ngay | ghi chu`, noi ro anh do chu site tao bang AI, nhan vat goc, khong IP ben thu ba; hang placeholder ghi "placeholder".

## 6. Test (chi Node, moi lenh <= 60s) va tran kich thuoc
- `tools/test-anim-scenes.mjs` (A; vm + DOM gia nhu test-anim.mjs): (1) validate chap nhan l01 mau muc 1; tu choi: alt rong, thieu vi, pieces!==en, kb z=3, focus.at>dur, img sai regex, v:1, scenes rong, >8; (2) `plan` T=44, at tang dan, viAt>at cuoi, rest<dur; (3) mount tra api co 7 ham, markup co `alt`, `srcset` 800w+1600w, `aria-live`, `role=region`, `.bss-fig` truoc `.bss-cap`; (4) mount tu choi def sai -> null; (5) reduced-motion: khong raf, play/pause an, prev/next hien, transform none, ring hien; (6) onerror 1 -> bo srcset, 2 -> `.bss-fb`; (7) destroy: 0 timer/raf con, host rong, goi 2 lan an toan; (8) `BSAnim.validate` (engine cu) tu choi def v2; (9) `anim-scenes.js` <= 10240 byte, khong co API cam.
- `tools/test-scenes-l01.mjs` (C): doc `data/l01-anim.js`; `BSScenes.validate` rong; 7 anh 800 va 7 anh hd ton tai; parse RIFF/WEBP: chieu rong/cao dung 800x450 / 1600x900 (VP8/VP8L/VP8X); cap 110000/280000; tong 800 <= 800000; pieces noi lai = en; alt_vi khong rong; `data/l01-anim.js` <= 6144 byte; khong API cam; canh `id` va `img` duy nhat.
- Cap nhat co san: `tools/test-anim-l01.mjs` doi duong dan sang `tools/fixtures/l01-anim-rig.js` va dong gioi han 5KB (C); `tools/test-loader.mjs` them ca scenes: danh sach nap `[anim-scenes.js, data/l01-anim.js]`, kind la roi vao rig, hai kind khong dung chung state (D); `tools/test-sw.mjs`/`check-sw.mjs` (E): PRECACHE them `assets/js/anim-scenes.js` + 7 file 800 (khong co file hd; so file anim trong PRECACHE doi tuong ung), bump VERSION.

## 7. Ownership (khong chong file)
| Executor | File |
|---|---|
| 0 (hop dong) | `tools/SCENES-CONTRACT.md` |
| A | `assets/js/anim-scenes.js`, `tools/test-anim-scenes.mjs` |
| B | `tools/make-scenes.py`, `assets/img/l01/scene/*-800.webp` (7), `assets/img-hd/l01/*-1600.webp` (7), `CREDITS-IMAGES.md` |
| C | `data/l01-anim.js`, `data/catalog.js`, `tools/fixtures/l01-anim-rig.js` (git mv tu `data/l01-anim.js` ban cu), `tools/test-anim-l01.mjs`, `tools/test-scenes-l01.mjs`, `tools/templates/unit-template-scenes.js` |
| D | `assets/js/loader.js`, `assets/js/lesson.js`, `tools/test-loader.mjs`, `tools/check-units.mjs` |
| E (cuoi) | `sw.js` (PRECACHE + VERSION), `tools/check-sw.mjs`, `tools/test-sw.mjs`, chay toan bo bo test |
Ranh gioi: C khong sua loader/lesson; D khong sua engine; A khong dung file nam ngoai bang tren; moi nguoi chi commit file cua minh. Khong ai push.
