(function () {
  "use strict";

  const MAG_SIZE = 30;
  const RESERVE_MAX = 90;
  const RELOAD_TIME = 2000;
  const FIRE_RATE = 100;
  const ENEMY_DAMAGE = 12;
  const PLAYER_MAX_HEALTH = 100;
  const MOVE_SPEED = 8;
  const SPRINT_MULT = 1.6;

  let scene, camera, renderer;
  let enemies = [];
  let bullets = [];
  let walls = [];
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
  let keys = {};
  let yaw = 0;
  let pitch = 0;
  let muzzleFlash = null;
  let gunGroup = null;
  let animId = null;
  let lastEnemySpawn = 0;
  let enemyShootInterval = 800;

  const canvas = document.getElementById("game-canvas");
  const menu = document.getElementById("menu");
  const help = document.getElementById("help");
  const hud = document.getElementById("hud");
  const pauseScreen = document.getElementById("pause");
  const gameoverScreen = document.getElementById("gameover");

  function showScreen(id) {
    [menu, help, pauseScreen, gameoverScreen].forEach((el) => {
      el.classList.remove("active");
      el.classList.add("hidden");
    });
    hud.classList.add("hidden");
    const target = document.getElementById(id);
    if (target) {
      target.classList.remove("hidden");
      target.classList.add("active");
    }
  }

  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2030);
    scene.fog = new THREE.Fog(0x1a2030, 20, 80);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 1.7, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 0.9);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    const orangeLight = new THREE.PointLight(0xff6600, 0.5, 40);
    orangeLight.position.set(0, 8, -15);
    scene.add(orangeLight);

    buildArena();
    buildGun();
  }

  function buildArena() {
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a32,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(60, 30, 0xff6600, 0x333344);
    grid.position.y = 0.02;
    scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a48,
      roughness: 0.7,
      metalness: 0.3,
    });

    const crateMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });

    const positions = [
      [-12, 1.5, -12], [12, 1.5, -12], [-12, 1.5, 12], [12, 1.5, 12],
      [0, 1.5, -18], [-8, 1, 0], [8, 1, 0], [0, 1, 8],
      [-5, 0.75, -5], [5, 0.75, 5], [-6, 0.75, 6], [6, 0.75, -6],
    ];

    positions.forEach((pos, i) => {
      const isCrate = i >= 4;
      const geo = isCrate
        ? new THREE.BoxGeometry(2, 1.5, 2)
        : new THREE.BoxGeometry(3, 3, 3);
      const mesh = new THREE.Mesh(geo, isCrate ? crateMat : wallMat);
      mesh.position.set(...pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      walls.push(mesh);
    });

    const borderGeo = new THREE.BoxGeometry(60, 4, 1);
    [
      [0, 2, -30], [0, 2, 30], [-30, 2, 0], [30, 2, 0],
    ].forEach(([x, y, z], i) => {
      const b = new THREE.Mesh(borderGeo, wallMat);
      b.position.set(x, y, z);
      if (i < 2) b.rotation.y = 0;
      else {
        b.rotation.y = Math.PI / 2;
      }
      b.castShadow = true;
      scene.add(b);
      walls.push(b);
    });
  }

  function buildGun() {
    gunGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0.25, -0.2, -0.4);
    gunGroup.add(body);

    const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
    const barrel = new THREE.Mesh(barrelGeo, bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.25, -0.18, -0.65);
    gunGroup.add(barrel);

    muzzleFlash = new THREE.PointLight(0xffaa00, 0, 3);
    muzzleFlash.position.set(0.25, -0.18, -0.85);
    gunGroup.add(muzzleFlash);

    camera.add(gunGroup);
    scene.add(camera);
  }

  function createEnemy(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.28, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xcc9988 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2;
    head.castShadow = true;
    group.add(head);

    const hp = 30 + wave * 10;
    const enemy = {
      mesh: group,
      health: hp,
      maxHealth: hp,
      lastShot: 0,
      speed: 2 + wave * 0.3,
      alive: true,
    };
    scene.add(group);
    enemies.push(enemy);
    return enemy;
  }

  function spawnWave() {
    const count = 3 + wave * 2;
    const spawns = [
      [-20, -20], [20, -20], [-20, 20], [20, 20],
      [0, -22], [-22, 0], [22, 0], [0, 22],
    ];
    for (let i = 0; i < count; i++) {
      const [x, z] = spawns[i % spawns.length];
      const offset = (Math.random() - 0.5) * 6;
      createEnemy(x + offset, z + offset);
    }
    showMessage(`第 ${wave} 波 - 消灭所有敌人！`);
  }

  function showMessage(text, duration = 2500) {
    const el = document.getElementById("message");
    el.textContent = text;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), duration);
  }

  function updateHUD() {
    document.getElementById("health-bar").style.width = `${(health / PLAYER_MAX_HEALTH) * 100}%`;
    document.getElementById("health-text").textContent = Math.max(0, Math.ceil(health));
    document.getElementById("ammo-text").textContent = `${ammo} / ${reserve}`;
    document.getElementById("score-text").textContent = `击杀: ${score}`;
    document.getElementById("wave-text").textContent = `第 ${wave} 波`;
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

    muzzleFlash.intensity = 3;
    setTimeout(() => { muzzleFlash.intensity = 0; }, 50);

    gunGroup.position.z += 0.05;
    setTimeout(() => { gunGroup.position.z = 0; }, 50);

    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(camera.quaternion);

    const raycaster = new THREE.Raycaster(camera.position, dir, 0, 100);
    const enemyMeshes = enemies.filter((e) => e.alive).map((e) => e.mesh);
    const hits = raycaster.intersectObjects(enemyMeshes, true);

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && !enemies.find((e) => e.mesh === obj)) {
        obj = obj.parent;
      }
      const enemy = enemies.find((e) => e.mesh === obj || e.mesh.children.includes(hits[0].object));
      const target = enemies.find((e) => {
        let o = hits[0].object;
        while (o) {
          if (e.mesh === o) return true;
          o = o.parent;
        }
        return false;
      });
      if (target && target.alive) {
        target.health -= 25 + Math.random() * 10;
        flashHitMarker();
        if (target.health <= 0) killEnemy(target);
      }
    }

    if (ammo <= 0) startReload();
  }

  function flashHitMarker() {
    const hm = document.getElementById("hit-marker");
    hm.classList.remove("hidden");
    setTimeout(() => hm.classList.add("hidden"), 200);
  }

  function killEnemy(enemy) {
    enemy.alive = false;
    score++;
    scene.remove(enemy.mesh);
    updateHUD();

    if (enemies.every((e) => !e.alive)) {
      wave++;
      setTimeout(() => {
        if (gameState === "playing") spawnWave();
      }, 2000);
      showMessage(`第 ${wave - 1} 波完成！`);
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

  function enemyAI(dt) {
    const now = performance.now();
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;

      const pos = enemy.mesh.position;
      const dx = camera.position.x - pos.x;
      const dz = camera.position.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 1.5) {
        pos.x += (dx / dist) * enemy.speed * dt;
        pos.z += (dz / dist) * enemy.speed * dt;
        enemy.mesh.lookAt(camera.position.x, pos.y, camera.position.z);
      }

      if (dist < 35 && now - enemy.lastShot > enemyShootInterval) {
        enemy.lastShot = now;
        if (dist < 25 && Math.random() > 0.35) {
          health -= ENEMY_DAMAGE * (0.5 + Math.random() * 0.5);
          updateHUD();
          document.getElementById("health-bar").parentElement.style.animation = "none";
          void document.getElementById("health-bar").offsetWidth;
          if (health <= 0) endGame(false);
        }
      }
    });
  }

  function endGame(won) {
    gameState = "gameover";
    document.exitPointerLock();
    hud.classList.add("hidden");
    gameoverScreen.classList.remove("hidden");
    gameoverScreen.classList.add("active");
    document.getElementById("result-title").textContent = won ? "任务完成！" : "任务失败";
    document.getElementById("result-score").textContent = `击杀: ${score} · 到达第 ${wave} 波`;
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
    camera.position.set(0, 1.7, 0);
    yaw = 0;
    pitch = 0;
    camera.rotation.set(0, 0, 0);
    updateHUD();
    spawnWave();
  }

  function startGame() {
    initThree();
    resetGame();
    gameState = "playing";
    menu.classList.remove("active");
    menu.classList.add("hidden");
    hud.classList.remove("hidden");
    canvas.requestPointerLock();
    lastTime = performance.now();
    animate();
  }

  let lastTime = 0;
  function animate() {
    if (gameState !== "playing") return;
    animId = requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (reloading && now >= reloadEnd) finishReload();

    const speed = MOVE_SPEED * (keys["Shift"] ? SPRINT_MULT : 1) * dt;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    if (keys["w"] || keys["W"]) camera.position.addScaledVector(forward, speed);
    if (keys["s"] || keys["S"]) camera.position.addScaledVector(forward, -speed);
    if (keys["a"] || keys["A"]) camera.position.addScaledVector(right, -speed);
    if (keys["d"] || keys["D"]) camera.position.addScaledVector(right, speed);

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -28, 28);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -28, 28);
    camera.position.y = 1.7;

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    enemyAI(dt);
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
    if (e.key === "Escape") {
      if (gameState === "playing") {
        gameState = "pause";
        document.exitPointerLock();
        cancelAnimationFrame(animId);
        pauseScreen.classList.remove("hidden");
        pauseScreen.classList.add("active");
      }
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
    if (e.button === 0 && gameState === "playing" && pointerLocked) shoot();
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
  });

  window.addEventListener("resize", () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
