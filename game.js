(function () {
  "use strict";

  /* ========== 平衡参数（可调） ========== */
  const MAG_SIZE = 30;
  const RESERVE_MAX = 120;
  const RELOAD_TIME = 1800;
  const FIRE_RATE = 90;
  const PLAYER_MAX_HEALTH = 100;
  const MOVE_SPEED = 9;
  const SPRINT_MULT = 1.55;
  const WAVE_HEAL = 35;
  const INVINCIBLE_MS = 1200;
  const WAVE_GRACE_MS = 2500;
  const ENEMY_BASE_DAMAGE = 5;
  const PLAYER_DAMAGE = 28;

  let scene, camera, renderer;
  let enemies = [];
  let walls = [];
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

  const canvas = document.getElementById("game-canvas");
  const menu = document.getElementById("menu");
  const help = document.getElementById("help");
  const hud = document.getElementById("hud");
  const pauseScreen = document.getElementById("pause");
  const gameoverScreen = document.getElementById("gameover");
  const damageOverlay = document.getElementById("damage-overlay");
  const lowHealthWarn = document.getElementById("low-health-warn");

  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ec8e8);
    scene.fog = new THREE.Fog(0xb8d8f0, 45, 120);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 1.7, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const hemi = new THREE.HemisphereLight(0xdceeff, 0xc4a060, 0.85);
    scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff8ee, 1.15);
    sun.position.set(25, 55, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xffeedd, 0.35);
    fill.position.set(-20, 30, -10);
    scene.add(fill);

    buildArena();
    buildGun();
    buildSkyDecor();
  }

  function buildSkyDecor() {
    const skyGeo = new THREE.SphereGeometry(90, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0xb8e0ff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.35,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.y = -2;
    scene.add(sky);
  }

  function buildArena() {
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xd4b896,
      roughness: 0.92,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(60, 30, 0xff8833, 0xc8b090);
    grid.position.y = 0.03;
    scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe8e0d0,
      roughness: 0.75,
      metalness: 0.05,
    });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.85 });
    const sandBagMat = new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: 0.95 });

    const coverPositions = [
      [-10, 1.25, -8], [10, 1.25, -8], [-10, 1.25, 8], [10, 1.25, 8],
      [0, 1.25, -14], [-7, 1, 0], [7, 1, 0], [0, 1, 7],
      [-4, 0.6, -4], [4, 0.6, 4], [-5, 0.6, 5], [5, 0.6, -5],
      [-14, 0.5, 0], [14, 0.5, 0], [0, 0.5, 14],
    ];

    coverPositions.forEach((pos, i) => {
      let geo, mat;
      if (i < 4) {
        geo = new THREE.BoxGeometry(3.5, 2.5, 3.5);
        mat = wallMat;
      } else if (i < 8) {
        geo = new THREE.BoxGeometry(2.2, 1.8, 2.2);
        mat = crateMat;
      } else if (i < 12) {
        geo = new THREE.BoxGeometry(2.5, 1.2, 1.2);
        mat = sandBagMat;
      } else {
        geo = new THREE.BoxGeometry(3, 1, 1.5);
        mat = sandBagMat;
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.isCover = true;
      scene.add(mesh);
      walls.push(mesh);
      coverMeshes.push(mesh);
    });

    const borderMat = new THREE.MeshStandardMaterial({ color: 0xd0c8b8, roughness: 0.8 });
    const borderGeo = new THREE.BoxGeometry(60, 3, 1.2);
    [[0, 1.5, -30], [0, 1.5, 30], [-30, 1.5, 0], [30, 1.5, 0]].forEach(([x, y, z], i) => {
      const b = new THREE.Mesh(borderGeo, borderMat);
      b.position.set(x, y, z);
      if (i >= 2) b.rotation.y = Math.PI / 2;
      b.castShadow = true;
      b.userData.isCover = true;
      scene.add(b);
      walls.push(b);
      coverMeshes.push(b);
    });
  }

  function buildGun() {
    gunGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.75,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), bodyMat);
    body.position.set(0.25, -0.2, -0.4);
    gunGroup.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.25, -0.18, -0.65);
    gunGroup.add(barrel);

    muzzleFlash = new THREE.PointLight(0xffcc66, 0, 4);
    muzzleFlash.position.set(0.25, -0.18, -0.85);
    gunGroup.add(muzzleFlash);

    camera.add(gunGroup);
    scene.add(camera);
  }

  function createEnemy(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const vestMat = new THREE.MeshStandardMaterial({ color: 0x993333, roughness: 0.55 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.2, 8), vestMat);
    body.position.y = 1.6;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8c4a8, roughness: 0.6 })
    );
    head.position.y = 2.35;
    head.name = "head";
    head.castShadow = true;
    group.add(head);

    const hp = Math.floor(22 + wave * 6);
    const enemy = {
      mesh: group,
      health: hp,
      maxHealth: hp,
      lastShot: performance.now() + Math.random() * 2000,
      shootCooldown: 1400 + Math.random() * 900 + wave * 40,
      speed: 1.4 + wave * 0.12,
      alive: true,
      aiming: false,
      aimStart: 0,
    };
    scene.add(group);
    enemies.push(enemy);
    return enemy;
  }

  function spawnWave() {
    const count = Math.min(3 + Math.floor(wave * 1.2), 12);
    const spawns = [
      [-22, -22], [22, -22], [-22, 22], [22, 22],
      [0, -24], [-24, 0], [24, 0], [0, 24],
    ];
    let delay = 0;
    for (let i = 0; i < count; i++) {
      const [bx, bz] = spawns[i % spawns.length];
      const x = bx + (Math.random() - 0.5) * 4;
      const z = bz + (Math.random() - 0.5) * 4;
      setTimeout(() => {
        if (gameState === "playing") createEnemy(x, z);
      }, delay);
      delay += 400;
    }
    waveGraceUntil = performance.now() + WAVE_GRACE_MS;
    showMessage(`第 ${wave} 波 · 利用掩体，消灭敌人！`, 3000);
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

  function hasLineOfSight(from, to) {
    const origin = from.clone();
    origin.y = 1.5;
    const target = to.clone();
    target.y = 1.5;
    const dir = target.clone().sub(origin);
    const dist = dir.length();
    dir.normalize();
    raycaster.set(origin, dir);
    raycaster.far = dist - 0.3;
    const hits = raycaster.intersectObjects(coverMeshes, false);
    return hits.length === 0;
  }

  function getEnemyHitChance(dist) {
    if (dist > 28) return 0;
    if (dist > 20) return 0.12;
    if (dist > 12) return 0.22;
    if (dist > 6) return 0.32;
    return 0.42;
  }

  function playerTakeDamage(amount) {
    const now = performance.now();
    if (now < invincibleUntil) return;

    health -= amount;
    invincibleUntil = now + INVINCIBLE_MS;
    updateHUD();

    damageOverlay.classList.add("flash");
    setTimeout(() => damageOverlay.classList.remove("flash"), 300);

    if (health <= 0) endGame(false);
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

    muzzleFlash.intensity = 2.5;
    setTimeout(() => { muzzleFlash.intensity = 0; }, 40);
    gunGroup.position.z = 0.04;
    setTimeout(() => { gunGroup.position.z = 0; }, 40);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, dir, 0, 80);
    const hits = raycaster.intersectObjects(
      enemies.filter((e) => e.alive).map((e) => e.mesh),
      true
    );

    if (hits.length > 0) {
      let o = hits[0].object;
      const target = enemies.find((e) => {
        let node = o;
        while (node) {
          if (e.mesh === node) return true;
          node = node.parent;
        }
        return false;
      });
      if (target && target.alive) {
        const isHead = hits[0].object.name === "head";
        const dmg = isHead ? PLAYER_DAMAGE * 1.8 : PLAYER_DAMAGE + Math.random() * 8;
        target.health -= dmg;
        flashHitMarker(isHead);
        spawnHitSpark(hits[0].point);
        if (target.health <= 0) killEnemy(target);
      }
    }

    if (ammo <= 0) startReload();
  }

  function spawnHitSpark(pos) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xff4400 })
    );
    spark.position.copy(pos);
    scene.add(spark);
    setTimeout(() => scene.remove(spark), 120);
  }

  function flashHitMarker(headshot) {
    const hm = document.getElementById("hit-marker");
    hm.textContent = headshot ? "◎" : "✕";
    hm.style.color = headshot ? "#ffdd00" : "#ff3333";
    hm.classList.remove("hidden");
    setTimeout(() => hm.classList.add("hidden"), 180);
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
      showMessage(`第 ${cleared} 波完成！回复 ${WAVE_HEAL} 生命`, 2800);
      wave++;
      setTimeout(() => {
        if (gameState === "playing") spawnWave();
      }, 2800);
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

  function enemyAI(dt, now) {
    const inGrace = now < waveGraceUntil;

    enemies.forEach((enemy) => {
      if (!enemy.alive) return;

      const pos = enemy.mesh.position;
      const dx = camera.position.x - pos.x;
      const dz = camera.position.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 2) {
        const moveSpeed = enemy.speed * dt * (dist > 15 ? 1.1 : 0.75);
        pos.x += (dx / dist) * moveSpeed;
        pos.z += (dz / dist) * moveSpeed;
      }
      enemy.mesh.lookAt(camera.position.x, pos.y + 1, camera.position.z);

      if (inGrace || dist > 30) {
        enemy.aiming = false;
        return;
      }

      const canSee = hasLineOfSight(pos, camera.position);

      if (!canSee) {
        enemy.aiming = false;
        return;
      }

      if (!enemy.aiming) {
        enemy.aiming = true;
        enemy.aimStart = now;
        return;
      }

      const aimTime = 600 + (dist > 15 ? 400 : 0);
      if (now - enemy.aimStart < aimTime) return;

      if (now - enemy.lastShot < enemy.shootCooldown) return;

      enemy.lastShot = now;
      enemy.aiming = false;
      enemy.aimStart = now + 300;

      const hitChance = getEnemyHitChance(dist);
      if (Math.random() < hitChance) {
        const falloff = THREE.MathUtils.lerp(1, 0.45, dist / 28);
        const dmg = ENEMY_BASE_DAMAGE * falloff * (0.85 + Math.random() * 0.3);
        playerTakeDamage(dmg);
      }
    });
  }

  function endGame(won) {
    gameState = "gameover";
    document.exitPointerLock();
    hud.classList.add("hidden");
    gameoverScreen.classList.remove("hidden");
    gameoverScreen.classList.add("active");
    document.getElementById("result-title").textContent = won ? "任务完成！" : "阵亡";
    document.getElementById("result-score").textContent =
      `击杀 ${score} 人 · 坚持到第 ${wave} 波`;
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
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (reloading && now >= reloadEnd) finishReload();
    if (mouseDown && pointerLocked) shoot();

    const speed = MOVE_SPEED * (keys["Shift"] ? SPRINT_MULT : 1) * dt;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    if (keys["w"] || keys["W"]) camera.position.addScaledVector(forward, speed);
    if (keys["s"] || keys["S"]) camera.position.addScaledVector(forward, -speed);
    if (keys["a"] || keys["A"]) camera.position.addScaledVector(right, -speed);
    if (keys["d"] || keys["D"]) camera.position.addScaledVector(right, speed);

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -27, 27);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -27, 27);
    camera.position.y = 1.7;

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    enemyAI(dt, now);
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
      pauseScreen.classList.remove("hidden");
      pauseScreen.classList.add("active");
    }
  });
  document.addEventListener("keyup", (e) => { keys[e.key] = false; });

  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked || gameState !== "playing") return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
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
