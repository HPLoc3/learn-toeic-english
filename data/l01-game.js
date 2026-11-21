/* l01-game.js - cau hinh mini-game "Nghe & chon hinh" cho Unit 1. Chi chua tham chieu (ref) toi cau trong BS_UNITS.l01; game.js tra cau tu do. */
window.BS_GAMES = window.BS_GAMES || {};
window.BS_GAMES.l01 = {
  "ratio": "16:9",
  "rounds": [
    { "img": "assets/img/l01/pic/focus-800.webp", "ref": { "tip": "tip1", "i": 0 }, "avoid": ["tf2"] },
    { "img": "assets/img/l01/pic/focus-800.webp", "ref": { "tip": "tip2", "i": 1 }, "avoid": ["mc4"] },
    { "img": "assets/img/l01/pic/tf1-800.webp", "ref": { "ex": "tf1", "item": "tf1-A" }, "avoid": [] },
    { "img": "assets/img/l01/pic/tf1-800.webp", "ref": { "ex": "tf1", "item": "tf1-D" }, "avoid": [] },
    { "img": "assets/img/l01/pic/tf2-800.webp", "ref": { "ex": "tf2", "item": "tf2-B" }, "avoid": [] },
    { "img": "assets/img/l01/pic/tf2-800.webp", "ref": { "ex": "tf2", "item": "tf2-E" }, "avoid": [] },
    { "img": "assets/img/l01/pic/mc1-800.webp", "ref": { "ex": "mc1" }, "avoid": [] },
    { "img": "assets/img/l01/scene/hanh-wear-800.webp", "ref": { "ex": "mc5" }, "avoid": ["tf1"] },
    { "img": "assets/img/l01/pic/mc2-800.webp", "ref": { "ex": "mc2" }, "avoid": [] },
    { "img": "assets/img/l01/pic/mc2-800.webp", "ref": { "ex": "mc6" }, "avoid": ["tf2"] },
    { "img": "assets/img/l01/pic/mc3-800.webp", "ref": { "ex": "mc3" }, "avoid": [] },
    { "img": "assets/img/l01/pic/mc3-800.webp", "ref": { "ex": "mc8" }, "avoid": ["tf1"] },
    { "img": "assets/img/l01/pic/mc4-800.webp", "ref": { "ex": "mc4" }, "avoid": [] },
    { "img": "assets/img/l01/pic/mc4-800.webp", "ref": { "ex": "mc7" }, "avoid": [] }
  ]
};
