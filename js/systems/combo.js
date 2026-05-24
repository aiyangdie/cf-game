/**
 * @fileoverview 连杀计数与奖励
 * @namespace CFGame.Combo
 */
(function (global) {
  "use strict";

  const C = () => global.CFGame.Constants;

  const LABELS = Object.freeze([
    "",
    "双杀!",
    "三杀!",
    "四杀!",
    "五杀!",
    "超神!",
    "无人能挡!",
  ]);

  let streak = 0;
  let lastKillAt = 0;
  let displayUntil = 0;
  let lastLabel = "";

  function reset() {
    streak = 0;
    lastKillAt = 0;
    displayUntil = 0;
    lastLabel = "";
  }

  /**
   * @returns {{ label: string, bonusGp: number, streak: number }}
   */
  function onKill(now) {
    const win = C().COMBO_WINDOW_MS;
    if (now - lastKillAt > win) streak = 0;
    streak += 1;
    lastKillAt = now;

    const idx = Math.min(streak - 1, LABELS.length - 1);
    const label = streak > 1 ? LABELS[idx] || "连杀!" : "";
    const bonusGp = streak > 1 ? (streak - 1) * C().COMBO_BONUS_GP : 0;

    if (label) {
      lastLabel = label;
      displayUntil = now + 2200;
    }

    return { label, bonusGp, streak };
  }

  function update(now) {
    if (now > lastKillAt + C().COMBO_WINDOW_MS && streak > 0) {
      streak = 0;
    }
  }

  function getDisplay(now) {
    if (!lastLabel || now > displayUntil) return null;
    return { label: lastLabel, streak };
  }

  global.CFGame = global.CFGame || {};
  global.CFGame.Combo = Object.freeze({
    onKill,
    update,
    getDisplay,
    reset,
    getStreak: () => streak,
  });
})(window);
