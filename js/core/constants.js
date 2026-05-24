/**
 * @fileoverview 全局数值常量（平衡调参集中在此）
 * @namespace CFGame.Constants
 */
(function (global) {
  "use strict";

  global.CFGame = global.CFGame || {};

  global.CFGame.Constants = Object.freeze({
    PLAYER_MAX_HEALTH: 100,
    EYE_HEIGHT: 1.7,
    MOVE_SPEED: 10.5,
    SPRINT_MULT: 1.55,
    BACKWARD_MULT: 0.72,
    AIR_CONTROL: 0.55,
    JUMP_VELOCITY: 6.8,
    GRAVITY: 24,
    HEAD_BOB_AMOUNT: 0.035,
    HEAD_BOB_SPEED: 11,
    FOOTSTEP_WALK: 0.42,
    FOOTSTEP_SPRINT: 0.28,
    WAVE_HEAL: 30,
    INVINCIBLE_MS: 1200,
    WAVE_GRACE_MS: 2800,
    ENEMY_BASE_DAMAGE: 5,
    BULLET_PLAYER_SPEED: 130,
    BULLET_PISTOL_SPEED: 100,
    BULLET_ENEMY_SPEED: 82,
    PLAYER_RADIUS: 0.45,
    ENEMY_RADIUS: 0.5,
    MOUSE_SENS: 0.0018,
    ARENA_LIMIT: 26,
    PICKUP_RADIUS: 1.35,
    GRENADE_MAX: 2,
    GRENADE_COOLDOWN_MS: 3200,
    GRENADE_DAMAGE: 95,
    GRENADE_RADIUS: 5.5,
    GRENADE_THROW_SPEED: 16,
    GRENADE_FUSE_MS: 1400,
    COMBO_WINDOW_MS: 4000,
    COMBO_BONUS_GP: 8,
  });
})(window);
