(function (global) {
  "use strict";

  const STORAGE_KEY = "cf-game-progress-v1";
  const MAX_LEVEL = 5;

  const UPGRADE_DEFS = [
    { id: "riflePower", cat: "武器", name: "AK47 火力", desc: "伤害 +6 / 射速略升", baseCost: 80, weapon: "rifle" },
    { id: "pistolPower", cat: "武器", name: "沙鹰 火力", desc: "伤害 +8", baseCost: 70, weapon: "pistol" },
    { id: "knifePower", cat: "武器", name: "军刀 锻造", desc: "近战伤害 +18", baseCost: 60, weapon: "knife" },
    { id: "magBoost", cat: "武器", name: "扩容弹匣", desc: "AK +4 发 / 沙鹰 +2 发", baseCost: 90, maxLv: 3 },
    { id: "reload", cat: "装备", name: "快速换弹", desc: "换弹时间 -8%", baseCost: 75 },
    { id: "hpBoost", cat: "角色", name: "生命强化", desc: "生命上限 +18", baseCost: 85 },
    { id: "armor", cat: "角色", name: "防弹背心", desc: "受到伤害 -5%", baseCost: 100 },
    { id: "speed", cat: "角色", name: "战术靴", desc: "移动速度 +4%", baseCost: 70 },
    { id: "sprint", cat: "角色", name: "冲刺训练", desc: "冲刺速度 +5%", baseCost: 65 },
  ];

  let state = null;
  let onChange = null;

  function defaultState() {
    const upgrades = {};
    UPGRADE_DEFS.forEach((d) => { upgrades[d.id] = 0; });
    return { gp: 0, totalXp: 0, rank: 1, upgrades };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = { ...defaultState(), ...parsed, upgrades: { ...defaultState().upgrades, ...parsed.upgrades } };
        return;
      }
    } catch (_) { /* ignore */ }
    state = defaultState();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* ignore */ }
  }

  function getMaxLv(id) {
    const def = UPGRADE_DEFS.find((d) => d.id === id);
    return def && def.maxLv ? def.maxLv : MAX_LEVEL;
  }

  function getUpgradeCost(id) {
    const lv = state.upgrades[id] || 0;
    const def = UPGRADE_DEFS.find((d) => d.id === id);
    if (!def || lv >= getMaxLv(id)) return null;
    return Math.floor(def.baseCost * Math.pow(1.52, lv));
  }

  function addGp(n) {
    state.gp += n;
    save();
    if (onChange) onChange();
  }

  function addXp(n) {
    state.totalXp += n;
    while (state.totalXp >= state.rank * 120) {
      state.totalXp -= state.rank * 120;
      state.rank += 1;
    }
    save();
    if (onChange) onChange();
  }

  function onKill(headshot) {
    addGp(headshot ? 22 : 12);
    addXp(headshot ? 28 : 15);
  }

  function onWaveClear(waveNum) {
    const bonus = 35 + waveNum * 18;
    addGp(bonus);
    addXp(40 + waveNum * 12);
  }

  function tryBuy(id) {
    const lv = state.upgrades[id] || 0;
    if (lv >= getMaxLv(id)) return { ok: false, msg: "已满级" };
    const cost = getUpgradeCost(id);
    if (cost == null) return { ok: false, msg: "无法升级" };
    if (state.gp < cost) return { ok: false, msg: "GP 不足" };
    state.gp -= cost;
    state.upgrades[id] = lv + 1;
    save();
    if (onChange) onChange();
    if (global.CFAudio) global.CFAudio.play("pickup");
    return { ok: true, msg: "升级成功!" };
  }

  function getMaxHealth(base) {
    return base + (state.upgrades.hpBoost || 0) * 18;
  }

  function getDamageReduction() {
    return Math.min(0.25, (state.upgrades.armor || 0) * 0.05);
  }

  function getSpeedMult() {
    return 1 + (state.upgrades.speed || 0) * 0.04;
  }

  function getSprintMult(base) {
    return base + (state.upgrades.sprint || 0) * 0.05;
  }

  function applyWeapon(base, weaponId) {
    const u = state.upgrades;
    const out = { ...base };
    const reloadMult = 1 - (u.reload || 0) * 0.08;

    if (weaponId === "rifle") {
      out.damage = base.damage + (u.riflePower || 0) * 6;
      out.fireRate = Math.max(55, base.fireRate * (1 - (u.riflePower || 0) * 0.025));
      out.magSize = base.magSize + (u.magBoost || 0) * 4;
      out.reloadTime = Math.floor(base.reloadTime * reloadMult);
    } else if (weaponId === "pistol") {
      out.damage = base.damage + (u.pistolPower || 0) * 8;
      out.fireRate = Math.max(140, base.fireRate * (1 - (u.pistolPower || 0) * 0.02));
      out.magSize = base.magSize + (u.magBoost || 0) * 2;
      out.reloadTime = Math.floor(base.reloadTime * reloadMult);
    } else if (weaponId === "knife") {
      out.damage = base.damage + (u.knifePower || 0) * 18;
    }
    return out;
  }

  function initWeaponAmmo(ammoState, weapons) {
    ["rifle", "pistol"].forEach((id) => {
      const w = applyWeapon(weapons[id], id);
      if (!ammoState[id]) ammoState[id] = { ammo: 0, reserve: 0 };
      ammoState[id].ammo = w.magSize;
      ammoState[id].reserve = w.maxReserve;
    });
  }

  function refillMagazines(ammoState, weapons) {
    ["rifle", "pistol"].forEach((id) => {
      const w = applyWeapon(weapons[id], id);
      const st = ammoState[id];
      if (!st) return;
      const need = w.magSize - st.ammo;
      if (need > 0 && st.reserve > 0) {
        const take = Math.min(need, st.reserve);
        st.ammo += take;
        st.reserve -= take;
      }
    });
  }

  function renderShop(container, toastFn) {
    if (!container) return;
    container.innerHTML = "";
    const header = document.getElementById("shop-gp-text");
    if (header) {
      header.textContent = `军衔 Lv.${state.rank} · GP ${state.gp} · 总经验 ${state.totalXp}`;
    }

    let lastCat = "";
    UPGRADE_DEFS.forEach((def) => {
      if (def.cat !== lastCat) {
        lastCat = def.cat;
        const h = document.createElement("h3");
        h.className = "shop-cat";
        h.textContent = def.cat;
        container.appendChild(h);
      }
      const lv = state.upgrades[def.id] || 0;
      const max = getMaxLv(def.id);
      const cost = getUpgradeCost(def.id);
      const row = document.createElement("div");
      row.className = "shop-row" + (lv >= max ? " maxed" : "");

      const info = document.createElement("div");
      info.className = "shop-info";
      info.innerHTML = `<strong>${def.name}</strong> <span class="shop-lv">Lv.${lv}/${max}</span><br><span class="shop-desc">${def.desc}</span>`;

      const btn = document.createElement("button");
      btn.className = "btn-secondary shop-buy";
      if (lv >= max) {
        btn.textContent = "已满";
        btn.disabled = true;
      } else {
        btn.textContent = `${cost} GP`;
        btn.disabled = state.gp < cost;
        btn.addEventListener("click", () => {
          const res = tryBuy(def.id);
          if (toastFn) toastFn(res.msg, res.ok);
          renderShop(container, toastFn);
        });
      }

      row.appendChild(info);
      row.appendChild(btn);
      container.appendChild(row);
    });
  }

  function resetProgress() {
    state = defaultState();
    save();
  }

  load();

  global.CFProgression = {
    getState: () => state,
    getUpgradeCost,
    getMaxHealth,
    getDamageReduction,
    getSpeedMult,
    getSprintMult,
    applyWeapon,
    initWeaponAmmo,
    refillMagazines,
    onKill,
    onWaveClear,
    tryBuy,
    renderShop,
    resetProgress,
    setOnChange(fn) { onChange = fn; },
    UPGRADE_DEFS,
  };
})(window);
