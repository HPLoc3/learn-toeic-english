/* l04-game.js - cau hinh mini-game "Nghe & chon hinh" cho Unit 4. Chi chua tham chieu (ref) toi cau trong BS_UNITS.l04; game.js tra cau tu do. "avoid" loai cac hinh co the cung dung voi cau (vd: hai hinh deu co thuyen). */
window.BS_GAMES = window.BS_GAMES || {};
window.BS_GAMES.l04 = {
  "rounds": [
    { "img": "assets/img/l04/focus.svg", "ref": { "tip": "tip1", "i": 0 }, "avoid": ["mc3"] },
    { "img": "assets/img/l04/focus.svg", "ref": { "tip": "tip1", "i": 1 }, "avoid": ["tf2"] },
    { "img": "assets/img/l04/tf1.svg", "ref": { "tip": "tip3", "i": 0 }, "avoid": [] },
    { "img": "assets/img/l04/tf1.svg", "ref": { "ex": "tf1", "item": "tf1-A" }, "avoid": [] },
    { "img": "assets/img/l04/tf2.svg", "ref": { "ex": "tf2", "item": "tf2-A" }, "avoid": ["mc4"] },
    { "img": "assets/img/l04/tf2.svg", "ref": { "ex": "tf2", "item": "tf2-C" }, "avoid": [] },
    { "img": "assets/img/l04/mc1.svg", "ref": { "ex": "mc1" }, "avoid": [] },
    { "img": "assets/img/l04/mc1.svg", "ref": { "ex": "mc5" }, "avoid": [] },
    { "img": "assets/img/l04/mc2.svg", "ref": { "ex": "mc2" }, "avoid": [] },
    { "img": "assets/img/l04/mc2.svg", "ref": { "ex": "mc6" }, "avoid": [] },
    { "img": "assets/img/l04/mc3.svg", "ref": { "ex": "mc3" }, "avoid": [] },
    { "img": "assets/img/l04/mc3.svg", "ref": { "ex": "mc7" }, "avoid": [] },
    { "img": "assets/img/l04/mc4.svg", "ref": { "ex": "mc4" }, "avoid": ["tf2"] },
    { "img": "assets/img/l04/mc4.svg", "ref": { "ex": "mc8" }, "avoid": ["tf1"] }
  ]
};
