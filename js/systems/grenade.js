/**
 * @fileoverview 手雷投掷与范围伤害
 * @namespace CFGame.Grenade
 */
(function (global) {
  "use strict";

  const C = () => global.CFGame.Constants;

  let count = 0;
  let maxCount = 0;
  let lastThrowAt = 0;
  /** @type {Array<{ mesh: THREE.Object3D, vel: THREE.Vector3, fuseAt: number }>} */
  let active = [];

  function reset() {
    count = C().GRENADE_MAX;
    maxCount = C().GRENADE_MAX;
    lastThrowAt = 0;
    active.forEach((g) => {
      if (g.mesh.parent) g.mesh.parent.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
    });
    active = [];
  }

  function getCount() {
    return count;
  }

  function getCooldownRemaining(now) {
    const left = C().GRENADE_COOLDOWN_MS - (now - lastThrowAt);
    return left > 0 ? left : 0;
  }

  function canThrow(now) {
    return count > 0 && getCooldownRemaining(now) <= 0 && active.length < 3;
  }

  /**
   * @param {object} ctx
   * @param {THREE.Scene} ctx.scene
   * @param {THREE.Camera} ctx.camera
   * @param {() => THREE.Vector3} ctx.getShootDirection
   * @param {(x: number, z: number, damage: number, radius: number) => void} ctx.onExplode
   */
  function tryThrow(ctx, now) {
    if (!canThrow(now)) return false;

    const dir = ctx.getShootDirection().clone();
    dir.y = Math.max(dir.y, -0.05) + 0.35;
    dir.normalize();

    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      emissive: 0x442200,
      emissiveIntensity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const pos = ctx.camera.position.clone();
    pos.y -= 0.35;
    mesh.position.copy(pos);
    ctx.scene.add(mesh);

    const vel = dir.multiplyScalar(C().GRENADE_THROW_SPEED);
    vel.y += 2.2;
    active.push({
      mesh,
      vel,
      fuseAt: now + C().GRENADE_FUSE_MS,
    });

    count -= 1;
    lastThrowAt = now;
    if (global.CFAudio) global.CFAudio.play("throw");
    return true;
  }

  function explode(g, ctx, now) {
    const p = g.mesh.position;
    ctx.scene.remove(g.mesh);
    g.mesh.geometry.dispose();
    g.mesh.material.dispose();

    const ringGeo = new THREE.RingGeometry(0.3, C().GRENADE_RADIUS, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.08, p.z);
    ctx.scene.add(ring);
    setTimeout(() => {
      ctx.scene.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
    }, 450);

    ctx.onExplode(p.x, p.z, C().GRENADE_DAMAGE, C().GRENADE_RADIUS);
    if (global.CFAudio) global.CFAudio.play("explosion");
  }

  /**
   * @param {object} ctx
   * @param {THREE.Scene} ctx.scene
   * @param {number} ctx.arenaLimit
   * @param {(x: number, z: number, damage: number, radius: number) => void} ctx.onExplode
   */
  function update(dt, ctx, now) {
    const limit = ctx.arenaLimit != null ? ctx.arenaLimit : C().ARENA_LIMIT;
    const gravity = C().GRAVITY * 0.85;

    active = active.filter((g) => {
      g.vel.y -= gravity * dt;
      g.mesh.position.addScaledVector(g.vel, dt);

      if (g.mesh.position.y < 0.15) {
        g.mesh.position.y = 0.15;
        g.vel.y *= -0.35;
        g.vel.x *= 0.72;
        g.vel.z *= 0.72;
      }

      const x = g.mesh.position.x;
      const z = g.mesh.position.z;
      if (Math.abs(x) > limit || Math.abs(z) > limit) {
        explode(g, ctx, now);
        return false;
      }

      if (now >= g.fuseAt) {
        explode(g, ctx, now);
        return false;
      }
      return true;
    });
  }

  global.CFGame = global.CFGame || {};
  global.CFGame.Grenade = Object.freeze({
    reset,
    tryThrow,
    update,
    canThrow,
    getCount,
    getMaxCount: () => maxCount,
    getCooldownRemaining,
  });
})(window);
