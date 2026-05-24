/**
 * @fileoverview 武器数据表（与 data/weapons.json 保持同步，供 Mod 参考）
 * @namespace CFGame.Weapons
 */
(function (global) {
  "use strict";

  global.CFGame = global.CFGame || {};

  /** @type {Record<string, object>} */
  const BASE = {
    rifle: {
      id: "rifle",
      name: "AK47",
      magSize: 30,
      maxReserve: 90,
      fireRate: 85,
      reloadTime: 1600,
      damage: 30,
      headMult: 2.2,
      range: 100,
    },
    pistol: {
      id: "pistol",
      name: "沙鹰",
      magSize: 12,
      maxReserve: 60,
      fireRate: 220,
      reloadTime: 1100,
      damage: 48,
      headMult: 2.5,
      range: 70,
    },
    knife: {
      id: "knife",
      name: "军刀",
      magSize: 0,
      maxReserve: 0,
      fireRate: 380,
      reloadTime: 0,
      damage: 90,
      headMult: 3,
      range: 3.2,
      melee: true,
    },
  };

  function get(id) {
    return BASE[id] ? { ...BASE[id] } : null;
  }

  function getSwitchableIds() {
    return ["rifle", "pistol", "knife"];
  }

  global.CFGame.Weapons = Object.freeze({
    BASE,
    get,
    getSwitchableIds,
  });
})(window);
