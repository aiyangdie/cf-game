/**
 * @fileoverview 游戏状态机枚举
 * @namespace CFGame.GameState
 */
(function (global) {
  "use strict";

  global.CFGame = global.CFGame || {};

  global.CFGame.GameState = Object.freeze({
    MENU: "menu",
    PLAYING: "playing",
    PAUSE: "pause",
    SHOP: "shop",
    GAMEOVER: "gameover",
  });
})(window);
