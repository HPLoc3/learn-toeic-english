/* l02-game.js - cau hinh mini-game "Nghe & chon hinh" cho Unit 2. Chi chua tham chieu (ref) toi cau trong BS_UNITS.l02; game.js tra cau tu do. */
window.BS_GAMES = window.BS_GAMES || {};
window.BS_GAMES.l02 = {
  "ratio": "16:9",
  "rounds": [
    { "img": "assets/img/l02/scene/duo-shake-800.webp", "ref": { "tip": "tip1", "i": 0 }, "avoid": [] },
    { "img": "assets/img/l02/scene/duo-shake-800.webp", "ref": { "tip": "tip1", "i": 1 }, "avoid": [] },
    { "img": "assets/img/l02/pic/tf1-800.webp", "ref": { "tip": "tip2", "i": 0 }, "avoid": ["mc3"] },
    { "img": "assets/img/l02/pic/tf1-800.webp", "ref": { "ex": "tf1", "item": "tf1-A" }, "avoid": [] },
    { "img": "assets/img/l02/scene/duo-meeting-800.webp", "ref": { "ex": "tf2", "item": "tf2-A" }, "avoid": [] },
    { "img": "assets/img/l02/scene/duo-meeting-800.webp", "ref": { "ex": "tf2", "item": "tf2-C" }, "avoid": [] },
    { "img": "assets/img/l02/scene/duo-walk-800.webp", "ref": { "ex": "mc1" }, "avoid": [] },
    { "img": "assets/img/l02/scene/duo-walk-800.webp", "ref": { "ex": "mc5" }, "avoid": [] },
    { "img": "assets/img/l02/pic/mc2-800.webp", "ref": { "ex": "mc2" }, "avoid": [] },
    { "img": "assets/img/l02/pic/mc2-800.webp", "ref": { "ex": "mc6" }, "avoid": [] },
    { "img": "assets/img/l02/pic/mc3-800.webp", "ref": { "ex": "mc3" }, "avoid": [] },
    { "img": "assets/img/l02/pic/mc3-800.webp", "ref": { "ex": "mc7" }, "avoid": [] },
    { "img": "assets/img/l02/scene/duo-flowers-800.webp", "ref": { "ex": "mc4" }, "avoid": [] },
    { "img": "assets/img/l02/scene/duo-flowers-800.webp", "ref": { "ex": "mc8" }, "avoid": [] }
  ]
};
