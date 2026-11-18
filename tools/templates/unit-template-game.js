/* MAU GAME "Nghe & chon hinh" - KHONG duoc nap boi trang nao. Sao chep thanh data/<id>-game.js, thay __ID__.
 * Trong catalog phai dat "game": true cho unit nay. Can it nhat 10 vong va nhieu anh khac nhau (>= 4 anh).
 * Moi vong:
 *   img   : anh dung (assets/img/<id>/...), ton tai that
 *   ref   : tro toi CAU duoc doc len, mot trong ba dang:
 *             { "tip": "tip1", "i": 0 }            -> vi du so i (tu 0) cua tip1 trong focus.tips
 *             { "ex": "tf1", "item": "tf1-A" }     -> mot item cua bai tf (phai co "en")
 *             { "ex": "mc1" }                      -> dap an dung cua bai mc
 *   avoid : mang id bai tap co anh KHONG duoc dung lam hinh nhieu (vi giong anh dung); bai do phai co "image" */
window.BS_GAMES = window.BS_GAMES || {};
window.BS_GAMES.__ID__ = {
  "rounds": [
    { "img": "assets/img/__ID__/focus.svg", "ref": { "tip": "tip1", "i": 0 }, "avoid": ["tf1"] },
    { "img": "assets/img/__ID__/tf1.svg", "ref": { "ex": "tf1", "item": "tf1-A" }, "avoid": [] },
    { "img": "assets/img/__ID__/mc1.svg", "ref": { "ex": "mc1" }, "avoid": [] }
    /* ... them cho du >= 10 vong */
  ]
};
