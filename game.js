(function () {
  "use strict";

  const MAG_SIZE = 30;
  const RESERVE_MAX = 120;
  const RELOAD_TIME = 1600;
  const FIRE_RATE = 85;
  const PLAYER_MAX_HEALTH = 100;
  const MOVE_SPEED = 11;
  const SPRINT_MULT = 1.5;
  const WAVE_HEAL = 35;
  const INVINCIBLE_MS = 1200;
  const WAVE_GRACE_MS = 2800;
  const ENEMY_BASE_DAMAGE = 5;
  const PLAYER_DAMAGE = 30;
  const PLAYER_RADIUS = 0.45;
  const ENEMY_RADIUS = 0.5;
  const MOUSE_SENS = 0.0018;
  const ARENA_LIMIT = 26;

  let scene, camera, renderer;
  let enemies = [];
  let colliders = [];
  let coverMeshes = [];
  let gameState = "menu";
  let health = PLAYER_MAX_HEALTH;
  let ammo = MAG_SIZE;
  let reserve = RESERVE_MAX - MAG_SIZE;
  let score = 0;
  let wave = 1;
  let lastShot = 0;
  let reloading = false;
  let reloadEnd = 0;
  let pointerLocked = false;
  let mouseDown = false;
  let keys = {};
  let yaw = 0;
  let pitch = 0;
  let muzzleFlash = null;
  let gunGroup = null;
  let animId = null;
  let invincibleUntil = 0;
  let waveGraceUntil = 0;
  let lastTime = 0;
  let raycaster = new THREE.Raycaster();
  const moveDir = new THREE.Vector3();
  const tmpVec = new THREE.Vector3();

  const canvas = document.getElementById("game-canvas");
  const menu = document.getElementById("menu");
  const help = document.getElementById("help");
  const hud = document.getElementById("hud");
  const pauseScreen = document.getElementById("pause");
  const gameoverScreen = document.getElementById("gameover");
  const damageOverlay = document.getElementById("damage-overlay");
  const lowHealthWarn = document.getElementById("low-health-warn");
  const enemyMarkers = document.getElementById("enemy-markers");

  /* ---------- 碰撞：圆形角色 vs 矩形障碍 ---------- */
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
    x += (dx / dist) * push;
    z += (dz / dist) * push;
    return { x, z, hit: true };
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

    nx = clamp(nx, -ARENA_LIMIT, ARENA_LIMIT);
    nz = clamp(nz, -ARENA_LIMIT, ARENA_LIMIT);
    return { x: nx, z: nz };
  }

  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ed0f0);
    scene.fog = new THREE.Fog(0xc8e4f8, 55, 100);

    camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.set(0, 1.7, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;

    scene.add(new THREE.HemisphereLight(0xe8f4ff, 0xd4b080, 1.0));
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(20, 40, 10);
    scene.add(sun);

    buildArena();
    buildGun();
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

  function buildGun() {
    gunGroup = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.45), mat);
    body.position.set(0.22, -0.18, -0.35);
    gunGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), mat);
    barrel.position.set(0.22, -0.16, -0.58);
    gunGroup.add(barrel);
    muzzleFlash = new THREE.PointLight(0xffcc44, 0, 3);
    muzzleFlash.position.set(0.22, -0.16, -0.72);
    gunGroup.add(muzzleFlash);
    camera.add(gunGroup);
    scene.add(camera);
  }

  function createHealthBarSprite() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 10;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.22, 1);
    sprite.position.y = 2.75;
    sprite.renderOrder = 999;
    return { sprite, canvas: c, tex, ctx: c.getContext("2d") };
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
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.75, 24),
      new THREE.MeshBasicMaterial({ color: 0xff2200, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x660000 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.45), bodyMat);
    body.position.y = 1.35;
    group.add(body);

    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.9, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x222222, emissive: 0x111111 })
    );
    vest.position.y = 1.2;
    group.add(vest);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.42),
      new THREE.MeshLambertMaterial({ color: 0xffdd88, emissive: 0x332200 })
    );
    head.position.y = 2.15;
    head.name = "head";
    group.add(head);

    const hb = createHealthBarSprite();
    group.add(hb.sprite);

    const hp = Math.floor(24 + wave * 5);
    const enemy = {
      mesh: group,
      ring,
      healthBar: hb,
      health: hp,
      maxHealth: hp,
      lastShot: performance.now() + Math.random() * 1500,
      shootCooldown: 1500 + Math.random() * 800,
      speed: 1.6 + wave * 0.1,
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
    const count = Math.min(3 + Math.floor(wave * 1.1), 10);
    const spawns = [
      [-20, -20], [20, -20], [-20, 20], [20, 20],
      [0, -22], [-22, 0], [22, 0], [0, 22],
    ];
    for (let i = 0; i < count; i++) {
      const [bx, bz] = spawns[i % spawns.length];
      let x = bx + (Math.random() - 0.5) * 3;
      let z = bz + (Math.random() - 0.5) * 3;
      const safe = moveWithCollision(x, z, 0, 0, ENEMY_RADIUS);
      createEnemy(safe.x, safe.z);
    }
    waveGraceUntil = performance.now() + WAVE_GRACE_MS;
    showMessage(`第 ${wave} 波 · 红色敌人 · 躲掩体`, 2800);
  }

  function showMessage(text, duration = 2500) {
    const el = document.getElementById("message");
    el.textContent = text;
    el.classList.remove("hidden");
    clearTimeout(showMessage._t);
    showMessage._t = setTimeout(() => el.classList.add("hidden"), duration);
  }

  function updateHUD() {
    const pct = Math.max(0, (health / PLAYER_MAX_HEALTH) * 100);
    document.getElementById("health-bar").style.width = `${pct}%`;
    document.getElementById("health-text").textContent = Math.max(0, Math.ceil(health));
    document.getElementById("ammo-text").textContent = `${ammo} / ${reserve}`;
    document.getElementById("score-text").textContent = `击杀: ${score}`;
    document.getElementById("wave-text").textContent = `第 ${wave} 波`;

    const bar = document.getElementById("health-bar");
    if (pct <= 30) {
      bar.style.background = "linear-gradient(90deg, #cc2200, #ff6644)";
      lowHealthWarn.classList.remove("hidden");
    } else {
      bar.style.background = "linear-gradient(90deg, #00aa44, #44dd88)";
      lowHealthWarn.classList.add("hidden");
    }
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
      const onScreen = sx > 40 && sx < w - 40 && sy > 60 && sy < h - 60 && tmpVec.z < 1;

      if (onScreen) return;

      const cx = w / 2;
      const cy = h / 2;
      const angle = Math.atan2(sy - cy, sx - cx);
      const margin = 48;
      const ax = cx + Math.cos(angle) * (Math.min(w, h) * 0.38);
      const ay = cy + Math.sin(angle) * (Math.min(w, h) * 0.32);

      const el = document.createElement("div");
      el.className = "enemy-arrow";
      el.style.left = `${clamp(ax, margin, w - margin)}px`;
      el.style.top = `${clamp(ay, margin, h - margin)}px`;
      el.style.transform = `translate(-50%,-50%) rotate(${angle + Math.PI / 2}rad)`;
      enemyMarkers.appendChild(el);
    });
  }

  function hasLineOfSight(from, to) {
    const origin = tmpVec.set(from.x, 1.5, from.z);
    const target = new THREE.Vector3(to.x, 1.5, to.z);
    const dir = target.clone().sub(origin);
    const dist = dir.length();
    dir.normalize();
    raycaster.set(origin, dir);
    raycaster.far = dist - 0.25;
    return raycaster.intersectObjects(coverMeshes, false).length === 0;
  }

  function getEnemyHitChance(dist) {
    if (dist > 28) return 0;
    if (dist > 18) return 0.1;
    if (dist > 10) return 0.2;
    if (dist > 5) return 0.3;
    return 0.38;
  }

  function playerTakeDamage(amount) {
    const now = performance.now();
    if (now < invincibleUntil) return;
    health -= amount;
    invincibleUntil = now + INVINCIBLE_MS;
    updateHUD();
    damageOverlay.classList.add("flash");
    setTimeout(() => damageOverlay.classList.remove("flash"), 250);
    if (health <= 0) endGame(false);
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

  function shoot() {
    const now = performance.now();
    if (reloading || now - lastShot < FIRE_RATE || ammo <= 0) {
      if (ammo <= 0 && !reloading) startReload();
      return;
    }

    lastShot = now;
    ammo--;
    updateHUD();

    muzzleFlash.intensity = 2;
    setTimeout(() => { muzzleFlash.intensity = 0; }, 35);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, dir, 0, 80);

    const coverHits = raycaster.intersectObjects(coverMeshes, false);
    const maxDist = coverHits.length > 0 ? coverHits[0].distance : 80;

    raycaster.far = maxDist;
    const enemyHits = raycaster.intersectObjects(
      enemies.filter((e) => e.alive).map((e) => e.mesh),
      true
    );

    if (enemyHits.length > 0 && enemyHits[0].distance <= maxDist + 0.01) {
      const target = findEnemyFromHit(enemyHits[0].object);
      if (target) {
        const isHead = enemyHits[0].object.name === "head";
        target.health -= isHead ? PLAYER_DAMAGE * 2 : PLAYER_DAMAGE + Math.random() * 6;
        updateHealthBar(target.healthBar, target.health / target.maxHealth);
        flashHitMarker(isHead);
        if (target.health <= 0) killEnemy(target);
      }
    }

    if (ammo <= 0) startReload();
  }

  function flashHitMarker(headshot) {
    const hm = document.getElementById("hit-marker");
    hm.textContent = headshot ? "◎" : "✕";
    hm.style.color = headshot ? "#ffdd00" : "#ff3333";
    hm.classList.remove("hidden");
    setTimeout(() => hm.classList.add("hidden"), 150);
  }

  function killEnemy(enemy) {
    enemy.alive = false;
    score++;
    scene.remove(enemy.mesh);
    updateHUD();

    if (enemies.every((e) => !e.alive)) {
      const cleared = wave;
      health = Math.min(PLAYER_MAX_HEALTH, health + WAVE_HEAL);
      updateHUD();
      showMessage(`第 ${cleared} 波完成！+${WAVE_HEAL} 生命`, 2600);
      wave++;
      setTimeout(() => {
        if (gameState === "playing") spawnWave();
      }, 2600);
    }
  }

  function startReload() {
    if (reloading || reserve <= 0 || ammo === MAG_SIZE) return;
    reloading = true;
    document.getElementById("reload-hint").classList.remove("hidden");
    reloadEnd = performance.now() + RELOAD_TIME;
  }

  function finishReload() {
    const need = MAG_SIZE - ammo;
    const take = Math.min(need, reserve);
    ammo += take;
    reserve -= take;
    reloading = false;
    document.getElementById("reload-hint").classList.add("hidden");
    updateHUD();
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
        const spd = enemy.speed * dt;
        tryMoveEnemy(enemy, (dx / dist) * spd, (dz / dist) * spd);
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

      if (now - enemy.aimStart < 550) return;
      if (now - enemy.lastShot < enemy.shootCooldown) return;

      enemy.lastShot = now;
      enemy.aiming = false;

      if (Math.random() < getEnemyHitChance(dist)) {
        const falloff = THREE.MathUtils.lerp(1, 0.5, dist / 28);
        playerTakeDamage(ENEMY_BASE_DAMAGE * falloff * (0.9 + Math.random() * 0.2));
      }
    });
  }

  function endGame(won) {
    gameState = "gameover";
    document.exitPointerLock();
    hud.classList.add("hidden");
    if (enemyMarkers) enemyMarkers.innerHTML = "";
    gameoverScreen.classList.remove("hidden");
    gameoverScreen.classList.add("active");
    document.getElementById("result-title").textContent = won ? "任务完成！" : "阵亡";
    document.getElementById("result-score").textContent =
      `击杀 ${score} 人 · 第 ${wave} 波`;
    cancelAnimationFrame(animId);
  }

  function resetGame() {
    enemies.forEach((e) => scene.remove(e.mesh));
    enemies = [];
    health = PLAYER_MAX_HEALTH;
    ammo = MAG_SIZE;
    reserve = RESERVE_MAX - MAG_SIZE;
    score = 0;
    wave = 1;
    reloading = false;
    invincibleUntil = 0;
    waveGraceUntil = 0;
    camera.position.set(0, 1.7, 0);
    yaw = 0;
    pitch = 0;
    updateHUD();
    spawnWave();
  }

  function startGame() {
    if (!scene) initThree();
    resetGame();
    gameState = "playing";
    menu.classList.remove("active");
    menu.classList.add("hidden");
    hud.classList.remove("hidden");
    canvas.requestPointerLock();
    lastTime = performance.now();
    animate();
  }

  function animate() {
    if (gameState !== "playing") return;
    animId = requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;

    if (reloading && now >= reloadEnd) finishReload();
    if (mouseDown && pointerLocked) shoot();

    let mdx = 0;
    let mdz = 0;
    const spd = MOVE_SPEED * (keys["Shift"] ? SPRINT_MULT : 1) * dt;

    if (keys["w"] || keys["W"]) mdz -= spd;
    if (keys["s"] || keys["S"]) mdz += spd;
    if (keys["a"] || keys["A"]) mdx -= spd;
    if (keys["d"] || keys["D"]) mdx += spd;

    if (mdx !== 0 || mdz !== 0) {
      moveDir.set(mdx, 0, mdz);
      const len = moveDir.length();
      if (len > 0) {
        moveDir.multiplyScalar(1 / len);
        const forward = tmpVec.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const wx = forward.x * (-moveDir.z) + right.x * moveDir.x;
        const wz = forward.z * (-moveDir.z) + right.z * moveDir.x;
        const moved = moveWithCollision(camera.position.x, camera.position.z, wx * len, wz * len, PLAYER_RADIUS);
        camera.position.x = moved.x;
        camera.position.z = moved.z;
      }
    }

    camera.position.y = 1.7;
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    enemyAI(dt, now);
    updateEnemyScreenMarkers();
    renderer.render(scene, camera);
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
  document.getElementById("btn-resume").addEventListener("click", () => {
    pauseScreen.classList.add("hidden");
    pauseScreen.classList.remove("active");
    gameState = "playing";
    canvas.requestPointerLock();
    lastTime = performance.now();
    animate();
  });
  document.getElementById("btn-menu").addEventListener("click", () => location.reload());
  document.getElementById("btn-retry").addEventListener("click", () => location.reload());
  document.getElementById("btn-menu2").addEventListener("click", () => location.reload());

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === "r" || e.key === "R") startReload();
    if (e.key === "Escape" && gameState === "playing") {
      gameState = "pause";
      mouseDown = false;
      document.exitPointerLock();
      cancelAnimationFrame(animId);
      if (enemyMarkers) enemyMarkers.innerHTML = "";
      pauseScreen.classList.remove("hidden");
      pauseScreen.classList.add("active");
    }
  });
  document.addEventListener("keyup", (e) => { keys[e.key] = false; });

  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked || gameState !== "playing") return;
    yaw -= e.movementX * MOUSE_SENS;
    pitch -= e.movementY * MOUSE_SENS;
    pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
  });

  document.addEventListener("mousedown", (e) => {
    if (e.button === 0 && gameState === "playing") mouseDown = true;
  });
  document.addEventListener("mouseup", () => { mouseDown = false; });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
    if (!pointerLocked) mouseDown = false;
  });

  window.addEventListener("resize", () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
