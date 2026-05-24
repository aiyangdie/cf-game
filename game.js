(function () {
  "use strict";

  const PLAYER_MAX_HEALTH = 100;
  const EYE_HEIGHT = 1.7;
  const MOVE_SPEED = 10.5;
  const SPRINT_MULT = 1.55;
  const BACKWARD_MULT = 0.72;
  const AIR_CONTROL = 0.55;
  const JUMP_VELOCITY = 6.8;
  const GRAVITY = 24;
  const HEAD_BOB_AMOUNT = 0.035;
  const HEAD_BOB_SPEED = 11;
  const FOOTSTEP_WALK = 0.42;
  const FOOTSTEP_SPRINT = 0.28;
  const WAVE_HEAL = 30;
  const INVINCIBLE_MS = 1200;
  const WAVE_GRACE_MS = 2800;
  const ENEMY_BASE_DAMAGE = 5;
  const BULLET_PLAYER_SPEED = 130;
  const BULLET_PISTOL_SPEED = 100;
  const BULLET_ENEMY_SPEED = 82;
  const PLAYER_RADIUS = 0.45;
  const ENEMY_RADIUS = 0.5;
  const MOUSE_SENS = 0.0018;
  const ARENA_LIMIT = 26;
  const PICKUP_RADIUS = 1.35;

  const WEAPONS = {
    rifle: {
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

  let scene, camera, renderer;
  let enemies = [];
  let pickups = [];
  let colliders = [];
  let coverMeshes = [];
  let gameState = "menu";
  let health = PLAYER_MAX_HEALTH;
  let score = 0;
  let headshots = 0;
  let wave = 1;
  let lastShot = 0;
  let reloading = false;
  let reloadEnd = 0;
  let pointerLocked = false;
  let mouseDown = false;
  const keysDown = new Set();
  let yaw = 0;
  let pitch = 0;
  let muzzleFlash = null;
  let weaponsGroup = null;
  let weaponModels = {};
  let currentWeapon = "rifle";
  let weaponAmmo = {
    rifle: { ammo: 30, reserve: 90 },
    pistol: { ammo: 12, reserve: 60 },
  };
  let animId = null;
  let invincibleUntil = 0;
  let waveGraceUntil = 0;
  let lastTime = 0;
  let waveTimerId = null;
  let raycaster = new THREE.Raycaster();
  const moveDir = new THREE.Vector3();
  const tmpVec = new THREE.Vector3();
  const shootDir = new THREE.Vector3();
  const shootOrigin = new THREE.Vector3();
  const losOrigin = new THREE.Vector3();
  const losTarget = new THREE.Vector3();
  const losDir = new THREE.Vector3();
  const shootEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const rightVec = new THREE.Vector3();
  const axisY = new THREE.Vector3(0, 1, 0);
  let headBobPhase = 0;
  let footstepTimer = 0;
  let wasOnGround = true;
  let hitSparks = [];
  let tracers = [];
  let bullets = [];
  let velY = 0;
  let eyeY = EYE_HEIGHT;
  let onGround = true;

  function clearAllKeys() {
    keysDown.clear();
  }

  function isKey(code) {
    return keysDown.has(code);
  }

  function isSprinting() {
    return onGround
      && (isKey("ShiftLeft") || isKey("ShiftRight"))
      && isKey("KeyW") && !isKey("KeyS");
  }

  function isMovingInput() {
    return isKey("KeyW") || isKey("KeyA") || isKey("KeyS") || isKey("KeyD");
  }

  function getMoveSpeed() {
    let speed = MOVE_SPEED;
    if (window.CFProgression) speed *= CFProgression.getSpeedMult();
    if (isSprinting()) {
      const sm = window.CFProgression
        ? CFProgression.getSprintMult(SPRINT_MULT)
        : SPRINT_MULT;
      speed *= sm;
    } else if (isKey("KeyS") && !isKey("KeyW")) speed *= BACKWARD_MULT;
    if (!onGround) speed *= AIR_CONTROL;
    return speed;
  }

  function isMovingKey(code) {
    return code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD"
      || code === "ShiftLeft" || code === "ShiftRight" || code === "Space";
  }

  const canvas = document.getElementById("game-canvas");
  const menu = document.getElementById("menu");
  const help = document.getElementById("help");
  const hud = document.getElementById("hud");
  const pauseScreen = document.getElementById("pause");
  const gameoverScreen = document.getElementById("gameover");
  const damageOverlay = document.getElementById("damage-overlay");
  const lowHealthWarn = document.getElementById("low-health-warn");
  const enemyMarkers = document.getElementById("enemy-markers");
  const crosshair = document.getElementById("crosshair");
  const sprintTag = document.getElementById("sprint-tag");
  const shopScreen = document.getElementById("upgrade-shop");
  let shopPendingWave = false;

  function getPlayerMaxHealth() {
    return window.CFProgression
      ? CFProgression.getMaxHealth(PLAYER_MAX_HEALTH)
      : PLAYER_MAX_HEALTH;
  }

  function getWep() {
    const base = WEAPONS[currentWeapon];
    return window.CFProgression
      ? CFProgression.applyWeapon(base, currentWeapon)
      : base;
  }

  function getAmmoState() {
    return weaponAmmo[currentWeapon] || { ammo: 0, reserve: 0 };
  }

  /* ---------- 碰撞 ---------- */
  function buildCollider(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const pad = 0.15;
    return {
      minX: box.min.x - pad,
      maxX: box.max.x + pad,
      minZ: box.min.z - pad,
      maxZ: box.max.z + pad,
    };
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function pushOutOfBox(x, z, r, c) {
    const cx = clamp(x, c.minX, c.maxX);
    const cz = clamp(z, c.minZ, c.maxZ);
    let dx = x - cx;
    let dz = z - cz;
    let distSq = dx * dx + dz * dz;
    if (distSq >= r * r) return { x, z, hit: false };
    if (distSq < 1e-6) {
      const toLeft = x - c.minX;
      const toRight = c.maxX - x;
      const toFront = z - c.minZ;
      const toBack = c.maxZ - z;
      const min = Math.min(toLeft, toRight, toFront, toBack);
      if (min === toLeft) return { x: c.minX - r - 0.01, z, hit: true };
      if (min === toRight) return { x: c.maxX + r + 0.01, z, hit: true };
      if (min === toFront) return { x, z: c.minZ - r - 0.01, hit: true };
      return { x, z: c.maxZ + r + 0.01, hit: true };
    }
    const dist = Math.sqrt(distSq);
    const push = r - dist + 0.02;
    return { x: x + (dx / dist) * push, z: z + (dz / dist) * push, hit: true };
  }

  function moveWithCollision(x, z, dx, dz, radius) {
    let nx = x + dx;
    let nz = z + dz;
    for (let pass = 0; pass < 6; pass++) {
      let any = false;
      for (let i = 0; i < colliders.length; i++) {
        const res = pushOutOfBox(nx, nz, radius, colliders[i]);
        if (res.hit) {
          nx = res.x;
          nz = res.z;
          any = true;
        }
      }
      if (!any) break;
    }
    return { x: clamp(nx, -ARENA_LIMIT, ARENA_LIMIT), z: clamp(nz, -ARENA_LIMIT, ARENA_LIMIT) };
  }

  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ed0f0);
    scene.fog = new THREE.Fog(0xc8e4f8, 55, 100);

    camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.set(0, EYE_HEIGHT, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    scene.add(new THREE.HemisphereLight(0xe8f4ff, 0xd4b080, 1.0));
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(20, 40, 10);
    scene.add(sun);

    buildArena();
    buildWeapons();
  }

  function buildArena() {
    colliders = [];
    coverMeshes = [];
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshLambertMaterial({ color: 0xe0c898 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(60, 30, 0xff7722, 0xd8c8a0);
    grid.position.y = 0.04;
    scene.add(grid);

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xf0ebe0 });
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xe8a020 });
    const bagMat = new THREE.MeshLambertMaterial({ color: 0x8a7048 });
    const layouts = [
      { pos: [-10, 1.25, -8], size: [3.5, 2.5, 3.5], mat: wallMat },
      { pos: [10, 1.25, -8], size: [3.5, 2.5, 3.5], mat: wallMat },
      { pos: [-10, 1.25, 8], size: [3.5, 2.5, 3.5], mat: wallMat },
      { pos: [10, 1.25, 8], size: [3.5, 2.5, 3.5], mat: wallMat },
      { pos: [0, 1.25, -14], size: [3.5, 2.5, 3.5], mat: wallMat },
      { pos: [-7, 1, 0], size: [2.4, 2, 2.4], mat: crateMat },
      { pos: [7, 1, 0], size: [2.4, 2, 2.4], mat: crateMat },
      { pos: [0, 1, 7], size: [2.4, 2, 2.4], mat: crateMat },
      { pos: [-4, 0.55, -4], size: [2.6, 1.1, 1.1], mat: bagMat },
      { pos: [4, 0.55, 4], size: [2.6, 1.1, 1.1], mat: bagMat },
      { pos: [-5, 0.55, 5], size: [2.6, 1.1, 1.1], mat: bagMat },
      { pos: [5, 0.55, -5], size: [2.6, 1.1, 1.1], mat: bagMat },
    ];
    layouts.forEach(({ pos, size, mat }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      scene.add(mesh);
      coverMeshes.push(mesh);
      colliders.push(buildCollider(mesh));
    });
    const borderMat = new THREE.MeshLambertMaterial({ color: 0xe0d8c8 });
    [[0, 1.5, -29], [0, 1.5, 29], [-29, 1.5, 0], [29, 1.5, 0]].forEach(([x, y, z], i) => {
      const geo = i < 2 ? new THREE.BoxGeometry(58, 3, 1.5) : new THREE.BoxGeometry(1.5, 3, 58);
      const b = new THREE.Mesh(geo, borderMat);
      b.position.set(x, y, z);
      scene.add(b);
      coverMeshes.push(b);
      colliders.push(buildCollider(b));
    });
  }

  function buildWeapons() {
    weaponsGroup = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const steel = new THREE.MeshLambertMaterial({ color: 0x555555 });

    const rifle = new THREE.Group();
    const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.55), dark);
    rBody.position.set(0.24, -0.2, -0.42);
    const rBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.35), steel);
    rBarrel.position.set(0.24, -0.17, -0.68);
    rifle.add(rBody);
    rifle.add(rBarrel);
    weaponModels.rifle = rifle;

    const pistol = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.22), dark);
    pBody.position.set(0.2, -0.2, -0.28);
    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.08), steel);
    pSlide.position.set(0.2, -0.18, -0.42);
    pistol.add(pBody);
    pistol.add(pSlide);
    weaponModels.pistol = pistol;

    const knife = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.45), new THREE.MeshLambertMaterial({ color: 0x99bbdd }));
    blade.position.set(0.18, -0.15, -0.42);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.12), dark);
    handle.position.set(0.18, -0.16, -0.18);
    knife.add(blade);
    knife.add(handle);
    weaponModels.knife = knife;

    Object.values(weaponModels).forEach((g) => weaponsGroup.add(g));
    muzzleFlash = new THREE.PointLight(0xffcc44, 0, 3);
    muzzleFlash.position.set(0.24, -0.16, -0.75);
    weaponsGroup.add(muzzleFlash);
    camera.add(weaponsGroup);
    scene.add(camera);
    applyWeaponVisual("rifle");
  }

  function applyWeaponVisual(id) {
    Object.keys(weaponModels).forEach((k) => {
      weaponModels[k].visible = k === id;
    });
    crosshair.classList.toggle("knife-mode", !!WEAPONS[id].melee);
    document.querySelectorAll(".wslot").forEach((el) => {
      el.classList.toggle("active", el.dataset.w === id);
    });
  }

  function switchWeapon(id, silent) {
    if (!WEAPONS[id]) return;
    if (id !== currentWeapon) {
      if (!WEAPONS[currentWeapon].melee) {
        weaponAmmo[currentWeapon] = getAmmoState();
      }
      cancelReload();
      currentWeapon = id;
    }
    applyWeaponVisual(id);
    updateHUD();
    if (!silent) {
      showPickupToast(`切换: ${WEAPONS[id].name}`);
      if (window.CFAudio) {
        CFAudio.init();
        CFAudio.play("switchWep");
      }
    }
  }

  /* ---------- 道具 ---------- */
  function createPickup(type, x, z) {
    const group = new THREE.Group();
    const safe = moveWithCollision(x, z, 0, 0, 0.3);
    group.position.set(safe.x, 0, safe.z);

    if (type === "health") {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshLambertMaterial({ color: 0x22cc55, emissive: 0x115522 })
      );
      box.position.y = 0.55;
      group.add(box);
      const cross1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      cross1.position.y = 0.55;
      const cross2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      cross2.position.y = 0.55;
      group.add(cross1);
      group.add(cross2);
    } else {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.55, 0.75),
        new THREE.MeshLambertMaterial({ color: 0xff8800, emissive: 0x553300 })
      );
      box.position.y = 0.45;
      group.add(box);
      const bullets = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6),
        new THREE.MeshLambertMaterial({ color: 0xddaa00 })
      );
      bullets.position.y = 0.75;
      group.add(bullets);
    }

    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 20),
      new THREE.MeshBasicMaterial({
        color: type === "health" ? 0x22ff66 : 0xffaa00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.05;
    group.add(glow);

    const pickup = { mesh: group, type, alive: true, phase: Math.random() * Math.PI * 2, baseY: 0 };
    scene.add(group);
    pickups.push(pickup);
    return pickup;
  }

  function spawnPickups(count) {
    const types = ["health", "ammo", "ammo", "health"];
    const spots = [
      [-6, 6], [6, -6], [-8, -3], [8, 3], [0, 12], [-12, 0], [12, 0], [5, 5],
    ];
    for (let i = 0; i < count; i++) {
      const [bx, bz] = spots[i % spots.length];
      const x = bx + (Math.random() - 0.5) * 4;
      const z = bz + (Math.random() - 0.5) * 4;
      createPickup(types[i % types.length], x, z);
    }
  }

  function collectPickup(p) {
    if (!p.alive) return;
    p.alive = false;
    scene.remove(p.mesh);
    if (p.type === "health") {
      const before = health;
      health = Math.min(getPlayerMaxHealth(), health + 45);
      showPickupToast(`+${Math.ceil(health - before)} 生命`);
      if (window.CFAudio) CFAudio.play("pickup");
    } else {
      weaponAmmo.rifle.reserve = Math.min(WEAPONS.rifle.maxReserve, weaponAmmo.rifle.reserve + 35);
      weaponAmmo.pistol.reserve = Math.min(WEAPONS.pistol.maxReserve, weaponAmmo.pistol.reserve + 20);
      const st = getAmmoState();
      if (!WEAPONS[currentWeapon].melee && st.ammo < getWep().magSize) {
        const need = getWep().magSize - st.ammo;
        const take = Math.min(need, st.reserve);
        st.ammo += take;
        st.reserve -= take;
      }
      showPickupToast("弹药补给 +35", true);
      if (window.CFAudio) CFAudio.play("pickup");
    }
    updateHUD();
  }

  function updatePickups(dt) {
    const px = camera.position.x;
    const pz = camera.position.z;
    pickups = pickups.filter((p) => {
      if (!p.alive) return false;
      p.phase += dt * 3;
      const baseY = p.baseY || 0;
      p.mesh.position.y = baseY + Math.sin(p.phase) * 0.08;
      p.mesh.rotation.y += dt * 1.2;
      const dx = px - p.mesh.position.x;
      const dz = pz - p.mesh.position.z;
      if (dx * dx + dz * dz < PICKUP_RADIUS * PICKUP_RADIUS) {
        collectPickup(p);
        return false;
      }
      return true;
    });
  }

  function showPickupToast(text, isAmmo) {
    const el = document.getElementById("pickup-toast");
    el.textContent = text;
    el.classList.toggle("ammo-toast", !!isAmmo);
    el.classList.remove("hidden");
    clearTimeout(showPickupToast._t);
    showPickupToast._t = setTimeout(() => el.classList.add("hidden"), 1400);
  }

  /* ---------- 敌人 ---------- */
  function createHealthBarSprite() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 10;
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(1.4, 0.22, 1);
    sprite.position.y = 2.75;
    sprite.raycast = function () {};
    return { sprite, tex, ctx: c.getContext("2d") };
  }

  function updateHealthBar(hb, ratio) {
    const ctx = hb.ctx;
    ctx.clearRect(0, 0, 64, 10);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, 64, 10);
    ctx.fillStyle = ratio > 0.35 ? "#22ee44" : "#ff4422";
    ctx.fillRect(2, 2, Math.max(0, 60 * ratio), 6);
    hb.tex.needsUpdate = true;
  }

  function createEnemy(x, z) {
    const stats = getWaveStats(wave);
    const tier = stats.tier;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (tier >= 1) group.scale.setScalar(1 + tier * 0.06);

    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.5, 1.1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.y = 1.25;
    hitbox.name = "hitbox";
    hitbox.raycast = function () {};
    group.add(hitbox);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.95, 24),
      new THREE.MeshBasicMaterial({
        color: tier >= 2 ? 0xff4400 : 0xff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    ring.raycast = function () {};
    group.add(ring);

    const bodyColor = tier === 0 ? 0xff1111 : tier === 1 ? 0xcc0022 : 0x990033;
    const emissive = tier === 0 ? 0xaa0000 : tier === 1 ? 0x880022 : 0x660033;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.45, 0.55),
      new THREE.MeshLambertMaterial({ color: bodyColor, emissive })
    );
    body.position.y = 1.35;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.42),
      new THREE.MeshLambertMaterial({ color: 0xffdd88, emissive: 0x443300 })
    );
    head.position.y = 2.15;
    head.name = "head";
    group.add(head);

    const hb = createHealthBarSprite();
    group.add(hb.sprite);

    const hp = stats.hp;
    const enemy = {
      mesh: group,
      healthBar: hb,
      health: hp,
      maxHealth: hp,
      tier,
      lastShot: performance.now() + Math.random() * 1500,
      shootCooldown: stats.shootCooldown * (0.82 + Math.random() * 0.36),
      aimTimeRequired: stats.aimTime,
      speed: stats.speed * (0.92 + Math.random() * 0.16),
      alive: true,
      aiming: false,
      aimStart: 0,
    };
    updateHealthBar(hb, 1);
    scene.add(group);
    enemies.push(enemy);
    return enemy;
  }

  function spawnWave() {
    enemies = enemies.filter((e) => e.alive);
    const stats = getWaveStats(wave);
    const count = stats.spawnCount;
    const spawns = [
      [-20, -20], [20, -20], [-20, 20], [20, 20],
      [0, -22], [-22, 0], [22, 0], [0, 22],
    ];
    for (let i = 0; i < count; i++) {
      const [bx, bz] = spawns[i % spawns.length];
      const safe = moveWithCollision(bx + (Math.random() - 0.5) * 3, bz + (Math.random() - 0.5) * 3, 0, 0, ENEMY_RADIUS);
      createEnemy(safe.x, safe.z);
    }
    spawnPickups(2 + Math.floor(wave / 2));
    waveGraceUntil = performance.now() + WAVE_GRACE_MS;
    const ver = (window.CF_CONFIG && window.CF_CONFIG.version) || "";
    const tierHint = stats.tier >= 1 ? ` · ${stats.tierName}出现` : "";
    showMessage(
      ver ? `v${ver} · 第 ${wave} 波${tierHint} · ${count} 敌人` : `第 ${wave} 波 · ${count} 敌人`,
      3200
    );
  }

  function openUpgradeShop(pendingWave) {
    shopPendingWave = !!pendingWave;
    gameState = "shop";
    clearAllKeys();
    mouseDown = false;
    document.exitPointerLock();
    if (window.CFProgression) {
      CFProgression.renderShop(
        document.getElementById("upgrade-grid"),
        (msg, ok) => showPickupToast(msg, ok)
      );
    }
    if (shopScreen) {
      shopScreen.classList.remove("hidden");
      shopScreen.classList.add("active");
    }
    updateProgHUD();
  }

  function closeUpgradeShop(startWave) {
    if (shopScreen) {
      shopScreen.classList.add("hidden");
      shopScreen.classList.remove("active");
    }
    gameState = "playing";
    clearAllKeys();
    mouseDown = false;
    if (startWave && shopPendingWave) {
      shopPendingWave = false;
      spawnWave();
    }
    canvas.requestPointerLock();
    lastTime = performance.now();
  }

  function canOpenShop() {
    return gameState === "playing"
      && enemies.length > 0
      && enemies.every((e) => !e.alive);
  }

  function showMessage(text, duration = 2500) {
    const el = document.getElementById("message");
    el.textContent = text;
    el.classList.remove("hidden");
    clearTimeout(showMessage._t);
    showMessage._t = setTimeout(() => el.classList.add("hidden"), duration);
  }

  function hideTransientHud() {
    ["reload-hint", "low-health-warn", "hit-marker", "headshot-popup", "pickup-toast"].forEach((id) => {
      document.getElementById(id).classList.add("hidden");
    });
    document.getElementById("headshot-popup").classList.remove("show");
  }

  function updateProgHUD() {
    const gpEl = document.getElementById("gp-text");
    const rankEl = document.getElementById("rank-text");
    const xpBar = document.getElementById("xp-bar");
    if (!window.CFProgression || !gpEl) return;
    const st = CFProgression.getState();
    gpEl.textContent = `GP ${st.gp}`;
    rankEl.textContent = `Lv.${st.rank}`;
    if (xpBar) {
      const need = st.rank * 120;
      xpBar.style.width = `${Math.min(100, (st.totalXp / need) * 100)}%`;
    }
  }

  function updateHUD() {
    const maxHp = getPlayerMaxHealth();
    const pct = Math.max(0, (health / maxHp) * 100);
    document.getElementById("health-bar").style.width = `${pct}%`;
    document.getElementById("health-text").textContent = Math.max(0, Math.ceil(health));
    document.getElementById("score-text").textContent = `击杀: ${score} · 爆头: ${headshots}`;
    document.getElementById("wave-text").textContent = `第 ${wave} 波`;
    updateProgHUD();

    const wep = getWep();
    document.getElementById("weapon-name").textContent = wep.name;

    const ammoEl = document.getElementById("ammo-text");
    if (wep.melee) {
      ammoEl.textContent = "近战";
    } else {
      const st = getAmmoState();
      ammoEl.textContent = `${st.ammo} / ${st.reserve}`;
    }

    const bar = document.getElementById("health-bar");
    if (pct <= 30) {
      bar.style.background = "linear-gradient(90deg, #cc2200, #ff6644)";
      lowHealthWarn.classList.remove("hidden");
    } else {
      bar.style.background = "linear-gradient(90deg, #00aa44, #44dd88)";
      lowHealthWarn.classList.add("hidden");
    }

    if (sprintTag) {
      const sprinting = gameState === "playing" && isSprinting() && isMovingInput();
      sprintTag.classList.toggle("hidden", !sprinting);
    }
  }

  function showHeadshotPopup() {
    const el = document.getElementById("headshot-popup");
    el.classList.remove("hidden");
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(showHeadshotPopup._t);
    showHeadshotPopup._t = setTimeout(() => {
      el.classList.remove("show");
      el.classList.add("hidden");
    }, 700);
  }

  function cancelReload() {
    if (!reloading) return;
    reloading = false;
    document.getElementById("reload-hint").classList.add("hidden");
  }

  function startReload() {
    const wep = getWep();
    if (wep.melee || reloading) return;
    const st = getAmmoState();
    if (st.reserve <= 0 || st.ammo === wep.magSize) return;
    reloading = true;
    document.getElementById("reload-hint").classList.remove("hidden");
    reloadEnd = performance.now() + wep.reloadTime;
    if (window.CFAudio) CFAudio.play("reload");
  }

  function finishReload() {
    const wep = getWep();
    const st = getAmmoState();
    const need = wep.magSize - st.ammo;
    const take = Math.min(need, st.reserve);
    st.ammo += take;
    st.reserve -= take;
    reloading = false;
    document.getElementById("reload-hint").classList.add("hidden");
    updateHUD();
  }

  function syncCameraRotation() {
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.updateMatrixWorld(true);
  }

  function getShootDirection(out) {
    shootEuler.set(pitch, yaw, 0, "YXZ");
    out.set(0, 0, -1).applyEuler(shootEuler);
    return out;
  }

  function findEnemyFromHit(object) {
    let node = object;
    while (node) {
      const found = enemies.find((e) => e.alive && e.mesh === node);
      if (found) return found;
      node = node.parent;
    }
    return null;
  }

  function damageEnemy(target, isHead, baseDmg, headMult) {
    const dmg = isHead ? baseDmg * headMult : baseDmg + Math.random() * 6;
    target.health -= dmg;
    updateHealthBar(target.healthBar, Math.max(0, target.health / target.maxHealth));
    if (isHead) {
      headshots++;
      showHeadshotPopup();
      flashHitMarker(true);
      if (window.CFAudio) CFAudio.play("headshot");
    } else {
      flashHitMarker(false);
      if (window.CFAudio) CFAudio.play("hit");
    }
    if (target.health <= 0) killEnemy(target, isHead);
    else updateHUD();
  }

  function updateTracers(dt) {
    tracers = tracers.filter((t) => {
      t.life -= dt;
      if (t.life <= 0) {
        scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        return false;
      }
      t.line.material.opacity = t.life / 0.12;
      return true;
    });
  }

  function spawnTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffdd66,
      transparent: true,
      opacity: 0.95,
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    tracers.push({ line, life: 0.12 });
  }

  function kickCrosshair() {
    crosshair.classList.remove("kick");
    void crosshair.offsetWidth;
    crosshair.classList.add("kick");
  }

  function fuzzyTargetEnemy(range, maxAngle) {
    getShootDirection(shootDir);
    let best = null;
    let bestAngle = maxAngle;
    enemies.forEach((e) => {
      if (!e.alive) return;
      const pos = e.mesh.position;
      const dx = pos.x - camera.position.x;
      const dy = (pos.y + 1.35) - camera.position.y;
      const dz = pos.z - camera.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > range || dist < 0.5) return;
      const toEnemy = losTarget.set(dx, dy, dz).normalize();
      const ang = shootDir.angleTo(toEnemy);
      if (ang < bestAngle && hasLineOfSight(pos, camera.position)) {
        bestAngle = ang;
        best = e;
      }
    });
    if (!best) return null;
    getShootDirection(shootDir);
    const dy = (best.mesh.position.y + 2.15) - camera.position.y;
    const isHead = shootDir.y < -0.08 && dy > 0.6;
    return { target: best, isHead, hitCover: false };
  }

  function tracerEndPoint(range, hitPoint) {
    if (hitPoint) return hitPoint.clone();
    camera.getWorldPosition(shootOrigin);
    getShootDirection(shootDir);
    return shootOrigin.clone().add(shootDir.clone().multiplyScalar(range));
  }

  function raycastAttack(range) {
    syncCameraRotation();
    camera.getWorldPosition(shootOrigin);
    getShootDirection(shootDir);

    const aliveMeshes = enemies.filter((e) => e.alive).map((e) => e.mesh);

    raycaster.set(shootOrigin, shootDir, 0, range);
    const enemyHits = aliveMeshes.length
      ? raycaster.intersectObjects(aliveMeshes, true)
      : [];
    const coverHits = coverMeshes.length
      ? raycaster.intersectObjects(coverMeshes, false)
      : [];

    const eh = enemyHits[0];
    const ch = coverHits[0];

    if (eh && (!ch || eh.distance < ch.distance)) {
      const target = findEnemyFromHit(eh.object);
      if (target) {
        return { target, isHead: eh.object.name === "head", hitCover: false, point: eh.point };
      }
    }

    if (ch) {
      return { target: null, isHead: false, hitCover: true, point: ch.point };
    }

    const fuzzy = fuzzyTargetEnemy(range, 0.22);
    if (fuzzy) return fuzzy;

    return meleeFallback(range);
  }

  function spawnHitSpark(pos) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6600 })
    );
    spark.position.copy(pos);
    scene.add(spark);
    hitSparks.push({ mesh: spark, life: 0.15 });
  }

  function updateHitSparks(dt) {
    hitSparks = hitSparks.filter((s) => {
      s.life -= dt;
      if (s.life <= 0) {
        scene.remove(s.mesh);
        return false;
      }
      s.mesh.scale.multiplyScalar(0.92);
      return true;
    });
  }

  function meleeFallback(range) {
    const wep = getWep();
    if (!wep.melee) return null;
    let best = null;
    let bestDist = range;
    let bestHead = false;
    enemies.forEach((e) => {
      if (!e.alive) return;
      const pos = e.mesh.position;
      const dx = camera.position.x - pos.x;
      const dz = camera.position.z - pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d >= bestDist || !hasLineOfSight(pos, camera.position)) return;
      bestDist = d;
      best = e;
      camera.getWorldDirection(shootDir);
      const toHeadY = (pos.y + 2.15) - camera.position.y;
      const aimY = shootDir.y;
      bestHead = aimY > 0.05 && toHeadY > 0.8 && d < 2.6;
    });
    if (!best) return null;
    return { target: best, isHead: bestHead, hitCover: false };
  }

  function attack() {
    const now = performance.now();
    const wep = getWep();
    if (now - lastShot < wep.fireRate) return;

    if (wep.melee) {
      lastShot = now;
      const res = raycastAttack(wep.range);
      camera.getWorldPosition(shootOrigin);
      if (window.CFAudio) CFAudio.play("knife");
      kickCrosshair();
      if (res && res.target && !res.hitCover) {
        damageEnemy(res.target, res.isHead, wep.damage, wep.headMult);
        if (res.point) spawnHitSpark(res.point);
        spawnTracer(shootOrigin, res.point || tracerEndPoint(wep.range, null));
        weaponModels.knife.position.z = -0.08;
        setTimeout(() => { weaponModels.knife.position.z = 0; }, 80);
      }
      return;
    }

    if (reloading) cancelReload();
    const st = getAmmoState();
    if (st.ammo <= 0) {
      if (window.CFAudio) CFAudio.play("empty");
      startReload();
      return;
    }

    lastShot = now;
    st.ammo--;
    updateHUD();

    muzzleFlash.intensity = 3;
    setTimeout(() => { muzzleFlash.intensity = 0; }, 45);
    weaponsGroup.position.z = 0.05;
    setTimeout(() => { weaponsGroup.position.z = 0; }, 45);
    kickCrosshair();
    if (window.CFAudio) CFAudio.play(currentWeapon === "pistol" ? "pistol" : "rifle");

    const res = raycastAttack(wep.range);
    camera.getWorldPosition(shootOrigin);
    const endPoint = tracerEndPoint(wep.range, res && res.point);
    spawnFlyingBullet(shootOrigin.clone(), endPoint, {
      isEnemy: false,
      speed: currentWeapon === "pistol" ? BULLET_PISTOL_SPEED : BULLET_PLAYER_SPEED,
      color: currentWeapon === "pistol" ? 0xffcc44 : 0xffee66,
      size: currentWeapon === "pistol" ? 0.038 : 0.045,
    });
    spawnTracer(shootOrigin, endPoint);
    if (res && res.point) spawnHitSpark(res.point);
    if (res && res.target && !res.hitCover) {
      damageEnemy(res.target, res.isHead, wep.damage, wep.headMult);
    }

    if (getAmmoState().ammo <= 0) startReload();
  }

  function flashHitMarker(headshot) {
    const hm = document.getElementById("hit-marker");
    hm.textContent = headshot ? "◎" : "✕";
    hm.style.color = headshot ? "#ffdd00" : "#ff3333";
    hm.classList.remove("hidden");
    setTimeout(() => hm.classList.add("hidden"), 150);
  }

  function killEnemy(enemy, wasHeadshot) {
    const pos = enemy.mesh.position;
    enemy.alive = false;
    score++;
    scene.remove(enemy.mesh);
    if (window.CFProgression) CFProgression.onKill(wasHeadshot);
    updateHUD();
    if (window.CFAudio) CFAudio.play("kill");

    if (Math.random() < 0.42) {
      createPickup(Math.random() < 0.45 ? "health" : "ammo", pos.x, pos.z);
    }

    if (enemies.every((e) => !e.alive)) {
      const cleared = wave;
      health = Math.min(getPlayerMaxHealth(), health + WAVE_HEAL);
      if (window.CFProgression) {
        CFProgression.onWaveClear(cleared);
        CFProgression.refillMagazines(weaponAmmo, WEAPONS);
      }
      updateHUD();
      showMessage(`第 ${cleared} 波清场！+${WAVE_HEAL} HP · 军械库开放`, 2800);
      if (window.CFAudio) CFAudio.play("wave");
      wave++;
      clearTimeout(waveTimerId);
      openUpgradeShop(true);
    }
  }

  function hasLineOfSight(from, to) {
    losOrigin.set(from.x, 1.5, from.z);
    losTarget.set(to.x, 1.5, to.z);
    losDir.subVectors(losTarget, losOrigin);
    const dist = losDir.length();
    if (dist < 0.01) return true;
    losDir.normalize();
    raycaster.set(losOrigin, losDir);
    raycaster.far = dist - 0.25;
    return raycaster.intersectObjects(coverMeshes, false).length === 0;
  }

  function getWaveStats(w) {
    const tier = w <= 3 ? 0 : w <= 7 ? 1 : 2;
    const hpBase = Math.floor(26 + w * 7 + Math.floor(w / 4) * 8);
    const hpMult = tier === 0 ? 1 : tier === 1 ? 1.18 : 1.38;
    return {
      tier,
      tierName: tier === 0 ? "新兵" : tier === 1 ? "老兵" : "精英",
      hp: Math.floor(hpBase * hpMult),
      speed: Math.min(4.6, 1.5 + w * 0.12 + tier * 0.15),
      shootCooldown: Math.max(480, 1550 - w * 62 - tier * 80),
      aimTime: Math.max(220, 540 - w * 17 - tier * 40),
      damage: ENEMY_BASE_DAMAGE + Math.floor(w * 0.7) + tier * 2,
      spawnCount: Math.min(14, 3 + Math.floor(w * 1.15 + Math.sqrt(w))),
    };
  }

  function getEnemyHitChance(dist, w) {
    if (dist > 32) return 0;
    let base;
    if (dist > 24) base = 0.07;
    else if (dist > 16) base = 0.15;
    else if (dist > 9) base = 0.26;
    else if (dist > 5) base = 0.36;
    else base = 0.46;
    const stats = getWaveStats(w);
    return Math.min(0.68, base + w * 0.011 + stats.tier * 0.04);
  }

  function clearBullets() {
    bullets.forEach((b) => {
      scene.remove(b.mesh);
      scene.remove(b.trail);
      b.trail.geometry.dispose();
      b.trail.material.dispose();
    });
    bullets = [];
  }

  function spawnFlyingBullet(from, to, opts) {
    const totalDist = from.distanceTo(to);
    if (totalDist < 0.08) return;

    const color = opts.color || 0xffee55;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(opts.size || 0.04, 6, 6),
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.position.copy(from);
    scene.add(mesh);

    const trailGeo = new THREE.BufferGeometry().setFromPoints([from.clone(), from.clone()]);
    const trailMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: opts.isEnemy ? 0.75 : 0.9,
    });
    const trail = new THREE.Line(trailGeo, trailMat);
    scene.add(trail);

    bullets.push({
      mesh,
      trail,
      from: from.clone(),
      end: to.clone(),
      totalDist,
      traveled: 0,
      speed: opts.speed || 100,
      isEnemy: !!opts.isEnemy,
      willHit: !!opts.willHit,
      damage: opts.damage || 0,
    });
  }

  function updateBullets(dt) {
    bullets = bullets.filter((b) => {
      b.traveled += b.speed * dt;
      const t = Math.min(1, b.traveled / b.totalDist);
      b.mesh.position.lerpVectors(b.from, b.end, t);

      const posAttr = b.trail.geometry.attributes.position;
      posAttr.setXYZ(0, b.from.x, b.from.y, b.from.z);
      posAttr.setXYZ(1, b.mesh.position.x, b.mesh.position.y, b.mesh.position.z);
      posAttr.needsUpdate = true;
      b.trail.material.opacity = (b.isEnemy ? 0.75 : 0.9) * (1 - t * 0.35);

      if (t < 1) return true;

      if (b.isEnemy && b.willHit) playerTakeDamage(b.damage);
      spawnHitSpark(b.mesh.position);
      scene.remove(b.mesh);
      scene.remove(b.trail);
      b.trail.geometry.dispose();
      b.trail.material.dispose();
      return false;
    });
  }

  function enemyFire(enemy, dist) {
    const pos = enemy.mesh.position;
    const stats = getWaveStats(wave);
    const muzzle = losOrigin.set(pos.x, 1.42, pos.z);
    enemy.mesh.getWorldDirection(losDir);
    muzzle.add(losDir.multiplyScalar(0.55));

    const aimPos = losTarget.set(camera.position.x, 1.45, camera.position.z);
    losDir.subVectors(aimPos, muzzle);
    const fullDist = losDir.length();
    losDir.normalize();

    raycaster.set(muzzle, losDir, 0, fullDist);
    const coverHit = raycaster.intersectObjects(coverMeshes, false)[0];

    const hitRoll = Math.random() < getEnemyHitChance(dist, wave);
    let endPoint = aimPos.clone();
    let willHit = hitRoll;

    if (coverHit && coverHit.distance < fullDist - 0.4) {
      endPoint = coverHit.point.clone();
      willHit = false;
    } else if (!hitRoll) {
      endPoint.x += (Math.random() - 0.5) * 2.8;
      endPoint.z += (Math.random() - 0.5) * 2.8;
      endPoint.y = 1.1 + Math.random() * 0.6;
      willHit = false;
    }

    const falloff = THREE.MathUtils.lerp(1, 0.5, dist / 30);
    const damage = stats.damage * falloff * (0.88 + Math.random() * 0.24);

    spawnFlyingBullet(muzzle.clone(), endPoint, {
      isEnemy: true,
      speed: BULLET_ENEMY_SPEED + stats.tier * 6,
      color: stats.tier >= 2 ? 0xff2200 : 0xff5522,
      size: 0.06 + stats.tier * 0.015,
      willHit,
      damage,
    });

    if (window.CFAudio) CFAudio.play("enemyShot");
  }

  function playerTakeDamage(amount) {
    const now = performance.now();
    if (now < invincibleUntil) return;
    let dmg = amount;
    if (window.CFProgression) {
      dmg *= 1 - CFProgression.getDamageReduction();
    }
    health -= dmg;
    invincibleUntil = now + INVINCIBLE_MS;
    updateHUD();
    damageOverlay.classList.add("flash");
    setTimeout(() => damageOverlay.classList.remove("flash"), 250);
    if (window.CFAudio) CFAudio.play("damage");
    if (health <= 0) endGame(false);
  }

  function tryMoveEnemy(enemy, dx, dz) {
    const pos = enemy.mesh.position;
    const next = moveWithCollision(pos.x, pos.z, dx, dz, ENEMY_RADIUS);
    pos.x = next.x;
    pos.z = next.z;
  }

  function enemyAI(dt, now) {
    const inGrace = now < waveGraceUntil;
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const pos = enemy.mesh.position;
      const dx = camera.position.x - pos.x;
      const dz = camera.position.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 2.2 && !inGrace) {
        tryMoveEnemy(enemy, (dx / dist) * enemy.speed * dt, (dz / dist) * enemy.speed * dt);
      }
      enemy.mesh.lookAt(camera.position.x, pos.y + 1.2, camera.position.z);

      if (inGrace || dist > 32) {
        enemy.aiming = false;
        return;
      }
      if (!hasLineOfSight(pos, camera.position)) {
        enemy.aiming = false;
        return;
      }
      if (!enemy.aiming) {
        enemy.aiming = true;
        enemy.aimStart = now;
        return;
      }
      if (now - enemy.aimStart < enemy.aimTimeRequired) return;
      if (now - enemy.lastShot < enemy.shootCooldown) return;
      enemy.lastShot = now;
      enemy.aiming = false;
      enemyFire(enemy, dist);
    });
  }

  function updateEnemyScreenMarkers() {
    if (!enemyMarkers || gameState !== "playing") return;
    enemyMarkers.innerHTML = "";
    const w = window.innerWidth;
    const h = window.innerHeight;
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      tmpVec.set(enemy.mesh.position.x, enemy.mesh.position.y + 2.2, enemy.mesh.position.z);
      tmpVec.project(camera);
      if (tmpVec.z > 1) return;
      const sx = (tmpVec.x * 0.5 + 0.5) * w;
      const sy = (-tmpVec.y * 0.5 + 0.5) * h;
      if (sx > 40 && sx < w - 40 && sy > 60 && sy < h - 60 && tmpVec.z < 1) return;
      const cx = w / 2;
      const cy = h / 2;
      const angle = Math.atan2(sy - cy, sx - cx);
      const el = document.createElement("div");
      el.className = "enemy-arrow";
      el.style.left = `${clamp(cx + Math.cos(angle) * Math.min(w, h) * 0.38, 48, w - 48)}px`;
      el.style.top = `${clamp(cy + Math.sin(angle) * Math.min(w, h) * 0.32, 48, h - 48)}px`;
      el.style.transform = `translate(-50%,-50%) rotate(${angle + Math.PI / 2}rad)`;
      enemyMarkers.appendChild(el);
    });
  }

  function clearPickups() {
    pickups.forEach((p) => scene.remove(p.mesh));
    pickups = [];
  }

  function endGame(won) {
    clearTimers();
    clearAllKeys();
    mouseDown = false;
    gameState = "gameover";
    document.exitPointerLock();
    hud.classList.add("hidden");
    if (enemyMarkers) enemyMarkers.innerHTML = "";
    gameoverScreen.classList.remove("hidden");
    gameoverScreen.classList.add("active");
    document.getElementById("result-title").textContent = won ? "任务完成！" : "阵亡";
    document.getElementById("result-score").textContent =
      `击杀 ${score} · 爆头 ${headshots} · 第 ${wave} 波` +
      (window.CFProgression ? ` · GP ${CFProgression.getState().gp}` : "");
    cancelAnimationFrame(animId);
  }

  function clearTimers() {
    clearTimeout(waveTimerId);
    clearTimeout(showMessage._t);
    clearTimeout(showPickupToast._t);
    clearTimeout(showHeadshotPopup._t);
  }

  function resetGame() {
    clearTimers();
    hitSparks.forEach((s) => scene.remove(s.mesh));
    hitSparks = [];
    tracers.forEach((t) => {
      scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
    });
    tracers = [];
    clearBullets();
    clearAllKeys();
    enemies.forEach((e) => scene.remove(e.mesh));
    enemies = [];
    clearPickups();
    health = getPlayerMaxHealth();
    score = 0;
    headshots = 0;
    wave = 1;
    weaponAmmo = { rifle: { ammo: 30, reserve: 90 }, pistol: { ammo: 12, reserve: 60 } };
    if (window.CFProgression) CFProgression.initWeaponAmmo(weaponAmmo, WEAPONS);
    currentWeapon = "rifle";
    cancelReload();
    applyWeaponVisual("rifle");
    reloading = false;
    reloadEnd = 0;
    invincibleUntil = 0;
    waveGraceUntil = 0;
    mouseDown = false;
    velY = 0;
    eyeY = EYE_HEIGHT;
    onGround = true;
    headBobPhase = 0;
    footstepTimer = 0;
    wasOnGround = true;
    camera.position.set(0, EYE_HEIGHT, 0);
    yaw = 0;
    pitch = 0;
    hideTransientHud();
    if (shopScreen) shopScreen.classList.add("hidden");
    shopPendingWave = false;
    updateHUD();
    spawnWave();
  }

  function startGame() {
    if (typeof THREE === "undefined") {
      alert("游戏资源加载失败，请检查网络后刷新页面（需要加载 Three.js）");
      return;
    }
    if (gameState === "playing") return;
    cancelAnimationFrame(animId);
    if (!scene) initThree();
    resetGame();
    gameState = "playing";
    menu.classList.remove("active");
    menu.classList.add("hidden");
    hud.classList.remove("hidden");
    if (window.CFAudio) CFAudio.init();
    if (window.CFProgression) {
      CFProgression.setOnChange(() => {
        updateProgHUD();
        if (gameState === "shop") {
          CFProgression.refillMagazines(weaponAmmo, WEAPONS);
          updateHUD();
        }
      });
    }
    canvas.requestPointerLock();
    lastTime = performance.now();
    animate();
  }

  function tryJump() {
    if (!onGround || velY > 0.1) return;
    velY = JUMP_VELOCITY;
    onGround = false;
    if (window.CFAudio) CFAudio.play("jump");
  }

  function updatePlayerMovement(dt) {
    let ix = 0;
    let iz = 0;
    if (isKey("KeyW")) iz -= 1;
    if (isKey("KeyS")) iz += 1;
    if (isKey("KeyA")) ix -= 1;
    if (isKey("KeyD")) ix += 1;

    const moving = ix !== 0 || iz !== 0;
    if (moving) {
      const inputLen = Math.sqrt(ix * ix + iz * iz);
      ix /= inputLen;
      iz /= inputLen;
      const moveAmount = getMoveSpeed() * dt;
      const forward = tmpVec.set(0, 0, -1).applyAxisAngle(axisY, yaw);
      rightVec.set(1, 0, 0).applyAxisAngle(axisY, yaw);
      const wx = forward.x * (-iz) + rightVec.x * ix;
      const wz = forward.z * (-iz) + rightVec.z * ix;
      const moved = moveWithCollision(
        camera.position.x, camera.position.z, wx * moveAmount, wz * moveAmount, PLAYER_RADIUS
      );
      camera.position.x = moved.x;
      camera.position.z = moved.z;
    }

    velY -= GRAVITY * dt;
    eyeY += velY * dt;
    if (eyeY <= EYE_HEIGHT) {
      if (!wasOnGround && velY < -2 && window.CFAudio) CFAudio.play("land");
      eyeY = EYE_HEIGHT;
      velY = 0;
      onGround = true;
    } else {
      onGround = false;
    }
    wasOnGround = onGround;

    let bob = 0;
    if (onGround && moving) {
      headBobPhase += dt * HEAD_BOB_SPEED * (isSprinting() ? 1.35 : 1);
      bob = Math.sin(headBobPhase) * HEAD_BOB_AMOUNT;
      footstepTimer -= dt;
      const interval = isSprinting() ? FOOTSTEP_SPRINT : FOOTSTEP_WALK;
      if (footstepTimer <= 0) {
        if (window.CFAudio) CFAudio.play("footstep");
        footstepTimer = interval;
      }
    } else if (onGround) {
      headBobPhase = 0;
      footstepTimer = 0;
    }

    camera.position.y = eyeY + bob;
  }

  function animate() {
    if (gameState !== "playing") return;
    animId = requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;

    if (reloading && now >= reloadEnd) finishReload();

    updatePlayerMovement(dt);
    syncCameraRotation();

    if (mouseDown) attack();

    updatePickups(dt);
    updateHitSparks(dt);
    updateTracers(dt);
    updateBullets(dt);
    enemyAI(dt, now);
    updateEnemyScreenMarkers();

    if (sprintTag) {
      const sprinting = isSprinting() && isMovingInput();
      sprintTag.classList.toggle("hidden", !sprinting);
    }

    renderer.render(scene, camera);
  }

  function pauseGame() {
    if (gameState !== "playing") return;
    clearTimers();
    clearAllKeys();
    clearBullets();
    mouseDown = false;
    gameState = "pause";
    document.exitPointerLock();
    cancelAnimationFrame(animId);
    if (enemyMarkers) enemyMarkers.innerHTML = "";
    pauseScreen.classList.remove("hidden");
    pauseScreen.classList.add("active");
    if (window.CFAudio) CFAudio.play("pause");
  }

  function resumeGame() {
    pauseScreen.classList.add("hidden");
    pauseScreen.classList.remove("active");
    gameState = "playing";
    clearAllKeys();
    mouseDown = false;
    canvas.requestPointerLock();
    lastTime = performance.now();
    animate();
  }

  document.getElementById("btn-start").addEventListener("click", startGame);
  document.getElementById("btn-help").addEventListener("click", () => {
    menu.classList.remove("active");
    help.classList.add("active");
  });
  document.getElementById("btn-back").addEventListener("click", () => {
    help.classList.remove("active");
    menu.classList.add("active");
  });
  document.getElementById("btn-resume").addEventListener("click", resumeGame);
  function returnToMenu() {
    clearTimers();
    clearAllKeys();
    gameState = "menu";
    mouseDown = false;
    document.exitPointerLock();
    cancelAnimationFrame(animId);
    hideTransientHud();
    if (enemyMarkers) enemyMarkers.innerHTML = "";
    hud.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    gameoverScreen.classList.remove("active");
    pauseScreen.classList.add("hidden");
    pauseScreen.classList.remove("active");
    if (shopScreen) {
      shopScreen.classList.add("hidden");
      shopScreen.classList.remove("active");
    }
    shopPendingWave = false;
    help.classList.remove("active");
    menu.classList.remove("hidden");
    menu.classList.add("active");
    if (scene) {
      enemies.forEach((e) => scene.remove(e.mesh));
      clearPickups();
    }
    enemies = [];
  }

  document.getElementById("btn-retry").addEventListener("click", () => {
    returnToMenu();
    startGame();
  });
  document.getElementById("btn-menu2").addEventListener("click", returnToMenu);
  document.getElementById("btn-menu").addEventListener("click", returnToMenu);

  const btnShopNext = document.getElementById("btn-shop-next");
  if (btnShopNext) btnShopNext.addEventListener("click", () => closeUpgradeShop(true));

  document.querySelectorAll(".wslot").forEach((el) => {
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (gameState === "playing") switchWeapon(el.dataset.w);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (isMovingKey(e.code)) e.preventDefault();
    keysDown.add(e.code);

    if (gameState === "playing") {
      if (e.code === "Digit1") { e.preventDefault(); switchWeapon("rifle"); }
      if (e.code === "Digit2") { e.preventDefault(); switchWeapon("pistol"); }
      if (e.code === "Digit3") { e.preventDefault(); switchWeapon("knife"); }
      if (e.code === "KeyR") { e.preventDefault(); startReload(); }
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        pauseGame();
      }
      if (e.code === "KeyM") {
        e.preventDefault();
        if (window.CFAudio) {
          const m = CFAudio.toggleMute();
          showPickupToast(m ? "音效已关闭" : "音效已开启", true);
        }
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) tryJump();
      }
      if (e.code === "KeyB" && canOpenShop()) {
        e.preventDefault();
        openUpgradeShop(true);
      }
    } else if (gameState === "shop") {
      if (e.code === "KeyB" || e.code === "Enter") {
        e.preventDefault();
        closeUpgradeShop(true);
      }
    } else if (gameState === "pause") {
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        resumeGame();
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    keysDown.delete(e.code);
  });

  window.addEventListener("blur", clearAllKeys);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearAllKeys();
  });

  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked || gameState !== "playing") return;
    yaw -= e.movementX * MOUSE_SENS;
    pitch -= e.movementY * MOUSE_SENS;
    pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
  });


  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || gameState !== "playing") return;
    mouseDown = true;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
    syncCameraRotation();
    attack();
  });
  document.addEventListener("mouseup", () => { mouseDown = false; });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
    if (!pointerLocked) {
      mouseDown = false;
      clearAllKeys();
    }
  });

  window.addEventListener("resize", () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
