(function (global) {
  "use strict";

  const STORAGE_KEY = "cf-game-progress-v2";
  const MAX_LEVEL = 5;

  const RANK_TITLES = [
    "列兵", "上等兵", "下士", "中士", "上士", "少尉", "中尉", "上尉",
    "少校", "中校", "上校", "大校", "少将", "中将", "上将", "元帅",
  ];

  const UPGRADE_DEFS = [
    { id: "riflePower", tier: "basic", cat: "武器", name: "AK47 火力", desc: "伤害 +6 / 射速略升", baseCost: 80, weapon: "rifle" },
    { id: "pistolPower", tier: "basic", cat: "武器", name: "沙鹰 火力", desc: "伤害 +8", baseCost: 70, weapon: "pistol" },
    { id: "knifePower", tier: "basic", cat: "武器", name: "军刀 锻造", desc: "近战伤害 +18", baseCost: 60, weapon: "knife" },
    { id: "magBoost", tier: "basic", cat: "武器", name: "扩容弹匣", desc: "AK +4 发 / 沙鹰 +2 发", baseCost: 90, maxLv: 3 },
    { id: "reload", tier: "basic", cat: "装备", name: "快速换弹", desc: "换弹时间 -8%", baseCost: 75 },
    { id: "hpBoost", tier: "basic", cat: "角色", name: "生命强化", desc: "生命上限 +18", baseCost: 85 },
    { id: "armor", tier: "basic", cat: "角色", name: "防弹背心", desc: "受到伤害 -5%", baseCost: 100 },
    { id: "speed", tier: "basic", cat: "角色", name: "战术靴", desc: "移动速度 +4%", baseCost: 70 },
    { id: "sprint", tier: "basic", cat: "角色", name: "冲刺训练", desc: "冲刺速度 +5%", baseCost: 65 },
    { id: "headshotMaster", tier: "elite", cat: "精英", name: "爆头专精", desc: "爆头伤害 +8% / 爆头 GP +4", baseCost: 120, maxLv: 3, req: "basic" },
    { id: "gpExpert", tier: "elite", cat: "精英", name: "赏金猎人", desc: "GP 获取 +10%", baseCost: 110, maxLv: 3, req: "basic" },
    { id: "combatMedic", tier: "elite", cat: "精英", name: "战地医生", desc: "清场 +10 HP / 击杀回血 +2", baseCost: 100, maxLv: 3, req: "basic" },
    { id: "scavenger", tier: "elite", cat: "精英", name: "拾荒者", desc: "拾取范围 +20%", baseCost: 95, maxLv: 3, req: "basic" },
    { id: "steadyHand", tier: "elite", cat: "精英", name: "稳定据枪", desc: "伤害 +4 / 射速 +3%", baseCost: 105, maxLv: 3, req: "basic" },
    { id: "honorMedal", tier: "honor", cat: "荣誉", name: "荣誉勋章", desc: "永久 GP +1%（可叠 10 次）", baseCost: 500, maxLv: 10, req: "all" },
  ];

  const CONSUMABLE_DEFS = [
    { id: "cMed", name: "战地医疗包", desc: "下波开始 +50 生命", cost: 55, maxStack: 2 },
    { id: "cAmmo", name: "弹药箱", desc: "下波备弹 +35%", cost: 50, maxStack: 2 },
    { id: "cStim", name: "战斗兴奋剂", desc: "下波伤害 +15%", cost: 65, maxStack: 1 },
  ];

  let state = null;
  let onChange = null;

  function defaultState() {
    const upgrades = {};
    UPGRADE_DEFS.forEach((d) => { upgrades[d.id] = 0; });
    return {
      gp: 0,
      totalXp: 0,
      rank: 1,
      upgrades,
      wavePrep: { cMed: 0, cAmmo: 0, cStim: 0 },
    };
  }

  function migrate(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;
    const upgrades = { ...base.upgrades, ...(raw.upgrades || {}) };
    return {
      ...base,
      ...raw,
      upgrades,
      wavePrep: { ...base.wavePrep, ...(raw.wavePrep || {}) },
    };
  }

  function load() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const legacy = localStorage.getItem("cf-game-progress-v1");
        if (legacy) {
          raw = legacy;
          state = migrate(JSON.parse(legacy));
          save();
          return;
        }
      }
      if (raw) {
        state = migrate(JSON.parse(raw));
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

  function getDefs(tier) {
    return UPGRADE_DEFS.filter((d) => d.tier === tier);
  }

  function getMaxLv(id) {
    const def = UPGRADE_DEFS.find((d) => d.id === id);
    return def && def.maxLv ? def.maxLv : MAX_LEVEL;
  }

  function isBasicMaxed() {
    return getDefs("basic").every((d) => (state.upgrades[d.id] || 0) >= getMaxLv(d.id));
  }

  function isEliteMaxed() {
    return getDefs("elite").every((d) => (state.upgrades[d.id] || 0) >= getMaxLv(d.id));
  }

  function isEliteUnlocked() {
    return isBasicMaxed();
  }

  function isHonorUnlocked() {
    return isBasicMaxed() && isEliteMaxed();
  }

  function canBuyUpgrade(def) {
    if (def.tier === "elite" && !isEliteUnlocked()) return false;
    if (def.tier === "honor" && !isHonorUnlocked()) return false;
    return true;
  }

  function getUpgradeCost(id) {
    const lv = state.upgrades[id] || 0;
    const def = UPGRADE_DEFS.find((d) => d.id === id);
    if (!def || lv >= getMaxLv(id)) return null;
    if (def.tier === "honor") {
      return Math.floor(def.baseCost * (1 + lv * 0.35));
    }
    return Math.floor(def.baseCost * Math.pow(1.52, lv));
  }

  function getUpgradeProgress() {
    const countTier = (tier) => {
      const defs = getDefs(tier);
      const done = defs.filter((d) => (state.upgrades[d.id] || 0) >= getMaxLv(d.id)).length;
      return { done, total: defs.length };
    };
    const basic = countTier("basic");
    const elite = countTier("elite");
    const honor = countTier("honor");
    const totalDone = basic.done + elite.done + (state.upgrades.honorMedal || 0);
    const totalMax = basic.total + elite.total + getMaxLv("honorMedal");
    return { basic, elite, honor, totalDone, totalMax, pct: totalMax ? Math.floor((totalDone / totalMax) * 100) : 0 };
  }

  function getRankTitle(rank) {
    if (rank <= 0) return RANK_TITLES[0];
    if (rank > RANK_TITLES.length) return `元帅+${rank - RANK_TITLES.length}`;
    return RANK_TITLES[rank - 1];
  }

  function getGpMult() {
    let m = 1 + (state.upgrades.gpExpert || 0) * 0.1;
    m += (state.upgrades.honorMedal || 0) * 0.01;
    return m;
  }

  function grantGp(n) {
    const amount = Math.max(0, Math.floor(n * getGpMult()));
    state.gp += amount;
    save();
    if (onChange) onChange();
    return amount;
  }

  /** 连杀等额外 GP（已含赏金加成） */
  function addBonusGp(n) {
    return grantGp(n);
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
    const gp = headshot ? 22 + (state.upgrades.headshotMaster || 0) * 4 : 12;
    grantGp(gp);
    addXp(headshot ? 28 : 15);
  }

  function onWaveClear(waveNum) {
    grantGp(35 + waveNum * 18);
    addXp(40 + waveNum * 12);
  }

  function tryBuy(id) {
    const def = UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) return { ok: false, msg: "无效升级" };
    if (!canBuyUpgrade(def)) return { ok: false, msg: def.tier === "honor" ? "精英满级后解锁" : "基础满级后解锁" };
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

  function tryBuyConsumable(id) {
    const def = CONSUMABLE_DEFS.find((d) => d.id === id);
    if (!def) return { ok: false, msg: "无效补给" };
    const cur = state.wavePrep[id] || 0;
    if (cur >= def.maxStack) return { ok: false, msg: "本波已达上限" };
    if (state.gp < def.cost) return { ok: false, msg: "GP 不足" };
    state.gp -= def.cost;
    state.wavePrep[id] = cur + 1;
    save();
    if (onChange) onChange();
    if (global.CFAudio) global.CFAudio.play("pickup");
    return { ok: true, msg: "已加入下波补给" };
  }

  function resetWavePrep() {
    state.wavePrep = { cMed: 0, cAmmo: 0, cStim: 0 };
    save();
  }

  function consumeWavePrep() {
    const prep = { ...state.wavePrep };
    resetWavePrep();
    return prep;
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

  function getHeadshotDamageMult() {
    return 1 + (state.upgrades.headshotMaster || 0) * 0.08;
  }

  function getKillHeal() {
    return (state.upgrades.combatMedic || 0) * 2;
  }

  function getExtraWaveHeal() {
    return (state.upgrades.combatMedic || 0) * 10;
  }

  function getPickupRadiusMult() {
    return 1 + (state.upgrades.scavenger || 0) * 0.2;
  }

  function getSteadyDamageBonus() {
    return (state.upgrades.steadyHand || 0) * 4;
  }

  function getSteadyFireRateMult(weaponId) {
    if (weaponId === "knife") return 1;
    return 1 - (state.upgrades.steadyHand || 0) * 0.03;
  }

  function applyWeapon(base, weaponId) {
    const u = state.upgrades;
    const out = { ...base };
    const reloadMult = 1 - (u.reload || 0) * 0.08;
    const steadyDmg = getSteadyDamageBonus();

    if (weaponId === "rifle") {
      out.damage = base.damage + (u.riflePower || 0) * 6 + steadyDmg;
      out.fireRate = Math.max(55, base.fireRate * (1 - (u.riflePower || 0) * 0.025) * getSteadyFireRateMult(weaponId));
      out.magSize = base.magSize + (u.magBoost || 0) * 4;
      out.reloadTime = Math.floor(base.reloadTime * reloadMult);
    } else if (weaponId === "pistol") {
      out.damage = base.damage + (u.pistolPower || 0) * 8 + steadyDmg;
      out.fireRate = Math.max(140, base.fireRate * (1 - (u.pistolPower || 0) * 0.02) * getSteadyFireRateMult(weaponId));
      out.magSize = base.magSize + (u.magBoost || 0) * 2;
      out.reloadTime = Math.floor(base.reloadTime * reloadMult);
    } else if (weaponId === "knife") {
      out.damage = base.damage + (u.knifePower || 0) * 18 + steadyDmg;
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

  function renderUpgradeRow(def, container, toastFn) {
    const lv = state.upgrades[def.id] || 0;
    const max = getMaxLv(def.id);
    const cost = getUpgradeCost(def.id);
    const unlocked = canBuyUpgrade(def);
    const row = document.createElement("div");
    row.className = "shop-row" + (lv >= max ? " maxed" : "") + (!unlocked ? " locked" : "");

    const info = document.createElement("div");
    info.className = "shop-info";
    const lockHint = !unlocked
      ? `<span class="shop-lock">${def.tier === "honor" ? "精英满级解锁" : "基础满级解锁"}</span>`
      : "";
    info.innerHTML =
      `<strong>${def.name}</strong> <span class="shop-lv">Lv.${lv}/${max}</span>${lockHint}` +
      `<br><span class="shop-desc">${def.desc}</span>`;

    const btn = document.createElement("button");
    btn.className = "btn-secondary shop-buy";
    if (!unlocked) {
      btn.textContent = "未解锁";
      btn.disabled = true;
    } else if (lv >= max) {
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
  }

  function renderShop(container, toastFn) {
    if (!container) return;

    const progressEl = document.getElementById("shop-progress-text");
    const progressBar = document.getElementById("shop-progress-bar");
    const statusEl = document.getElementById("shop-status-text");
    const header = document.getElementById("shop-gp-text");
    const prog = getUpgradeProgress();
    const title = getRankTitle(state.rank);
    const need = state.rank * 120;

    if (header) {
      header.textContent =
        `${title} · Lv.${state.rank} · GP ${state.gp} · 军械 ${prog.totalDone}/${prog.totalMax}`;
    }
    if (progressEl) {
      progressEl.textContent = `基础 ${prog.basic.done}/${prog.basic.total} · 精英 ${prog.elite.done}/${prog.elite.total}` +
        (isHonorUnlocked() ? ` · 荣誉 ${state.upgrades.honorMedal || 0}/${getMaxLv("honorMedal")}` : "");
    }
    if (progressBar) {
      progressBar.style.width = `${prog.pct}%`;
    }
    if (statusEl) {
      if (isHonorUnlocked() && (state.upgrades.honorMedal || 0) >= getMaxLv("honorMedal")) {
        statusEl.textContent = "★ 全部满级！GP 仍可购买波次补给，军衔随战斗继续提升";
        statusEl.className = "shop-status complete";
      } else if (isBasicMaxed() && !isEliteMaxed()) {
        statusEl.textContent = "基础军械已满 — 精英升级已开放";
        statusEl.className = "shop-status elite";
      } else if (isEliteUnlocked() && !isHonorUnlocked()) {
        statusEl.textContent = "精英军械升级中… 满级后将解锁荣誉勋章";
        statusEl.className = "shop-status";
      } else if (!isBasicMaxed()) {
        statusEl.textContent = `距离精英军械：还需 ${prog.basic.total - prog.basic.done} 项基础满级`;
        statusEl.className = "shop-status";
      } else {
        statusEl.textContent = "";
        statusEl.className = "shop-status hidden";
      }
    }

    container.innerHTML = "";

    const tiers = [
      { key: "basic", label: null },
      { key: "elite", label: "精英军械" },
      { key: "honor", label: "荣誉殿堂" },
    ];

    tiers.forEach(({ key, label }) => {
      const defs = getDefs(key);
      if (key === "honor" && !isHonorUnlocked()) return;
      if (defs.length === 0) return;

      let lastCat = "";
      if (label) {
        const h = document.createElement("h3");
        h.className = "shop-cat" + (key === "elite" ? " elite" : " honor");
        h.textContent = key === "elite" && !isEliteUnlocked()
          ? "精英军械（基础满级后解锁）"
          : label;
        container.appendChild(h);
      }

      if (key === "elite" && !isEliteUnlocked()) {
        const lock = document.createElement("p");
        lock.className = "shop-locked-note";
        lock.textContent = "完成全部基础升级后，精英军械将自动开放";
        container.appendChild(lock);
        return;
      }

      defs.forEach((def) => {
        if (def.cat !== lastCat && !label) {
          lastCat = def.cat;
          const h = document.createElement("h3");
          h.className = "shop-cat";
          h.textContent = def.cat;
          container.appendChild(h);
        }
        renderUpgradeRow(def, container, toastFn);
      });
    });

    const prepHeader = document.createElement("h3");
    prepHeader.className = "shop-cat supply";
    prepHeader.textContent = "波次补给（下波生效，GP 消耗品）";
    container.appendChild(prepHeader);

    CONSUMABLE_DEFS.forEach((def) => {
      const cur = state.wavePrep[def.id] || 0;
      const row = document.createElement("div");
      row.className = "shop-row consumable" + (cur >= def.maxStack ? " maxed" : "");

      const info = document.createElement("div");
      info.className = "shop-info";
      info.innerHTML =
        `<strong>${def.name}</strong> <span class="shop-lv">${cur}/${def.maxStack}</span>` +
        `<br><span class="shop-desc">${def.desc}</span>`;

      const btn = document.createElement("button");
      btn.className = "btn-secondary shop-buy";
      if (cur >= def.maxStack) {
        btn.textContent = "已满";
        btn.disabled = true;
      } else {
        btn.textContent = `${def.cost} GP`;
        btn.disabled = state.gp < def.cost;
        btn.addEventListener("click", () => {
          const res = tryBuyConsumable(def.id);
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
    getHeadshotDamageMult,
    getKillHeal,
    getExtraWaveHeal,
    getPickupRadiusMult,
    getGpMult,
    getRankTitle,
    getUpgradeProgress,
    isBasicMaxed,
    isEliteUnlocked,
    isHonorUnlocked,
    applyWeapon,
    initWeaponAmmo,
    refillMagazines,
    consumeWavePrep,
    resetWavePrep,
    onKill,
    onWaveClear,
    addBonusGp,
    tryBuy,
    tryBuyConsumable,
    renderShop,
    resetProgress,
    setOnChange(fn) { onChange = fn; },
    UPGRADE_DEFS,
    CONSUMABLE_DEFS,
  };
})(window);
