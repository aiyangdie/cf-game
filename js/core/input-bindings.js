/**
 * @fileoverview 键位绑定（改键只改此文件）
 * @namespace CFGame.InputBindings
 */
(function (global) {
  "use strict";

  global.CFGame = global.CFGame || {};

  global.CFGame.InputBindings = Object.freeze({
    MOVE_FORWARD: "KeyW",
    MOVE_BACK: "KeyS",
    MOVE_LEFT: "KeyA",
    MOVE_RIGHT: "KeyD",
    SPRINT: "ShiftLeft",
    SPRINT_ALT: "ShiftRight",
    JUMP: "Space",
    RELOAD: "KeyR",
    GRENADE: "KeyG",
    WEAPON_1: "Digit1",
    WEAPON_2: "Digit2",
    WEAPON_3: "Digit3",
    SHOP: "KeyB",
    PAUSE: "Escape",
    PAUSE_ALT: "KeyP",
    MUTE: "KeyM",
    CONFIRM: "Enter",
  });
})(window);
