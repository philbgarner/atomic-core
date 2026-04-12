/**
 * dungeonRenderer.ts
 *
 * Plain Three.js first-person dungeon renderer — no React or R3F required.
 * Designed for script-tag usage: create it after `game.generate()` is wired
 * up, and it will visualise the dungeon and player/entity positions.
 *
 * Usage:
 *   const renderer = createDungeonRenderer(document.getElementById('viewport'), game);
 *   // Pass live entity list on every turn:
 *   game.events.on('turn', () => renderer.setEntities(enemies));
 */

import * as THREE from 'three';
import type { GameHandle } from '../api/createGame';
import type { EntityBase } from '../entities/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DungeonRendererOptions = {
  /** Camera field of view in degrees. Default: 75. */
  fov?: number;
  /** World units per grid cell. Default: 3. */
  tileSize?: number;
  /** World-unit height of each corridor/room. Default: 3. */
  ceilingHeight?: number;
  /** Distance at which fog begins. Default: 5. */
  fogNear?: number;
  /** Distance at which fog is fully opaque (== background colour). Default: 24. */
  fogFar?: number;
  /** CSS colour string for fog / background. Default: '#000000'. */
  fogColor?: string;
  /** Smoothing factor for camera animation (0 = instant, 1 = never arrives). Default: 0.18. */
  lerpFactor?: number;
};

export type DungeonRenderer = {
  /**
   * Update the renderer's entity list. Call this on every 'turn' event
   * (or whenever entity positions change) to keep the scene in sync.
   */
  setEntities(entities: EntityBase[]): void;
  /** Unmount the canvas and release all Three.js resources. */
  destroy(): void;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const HALF_PI = Math.PI / 2;
/** Eye height as a fraction of ceiling height (same as PerspectiveDungeonView). */
const EYE_HEIGHT_FACTOR = 0.4;

/** Build a Matrix4 that positions, rotates, and scales a unit PlaneGeometry quad. */
function makeFaceMatrix(
  x: number, y: number, z: number,
  rx: number, ry: number, rz: number,
  w: number, h: number,
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(w, h, 1),
  );
}

// ---------------------------------------------------------------------------
// createDungeonRenderer
// ---------------------------------------------------------------------------

export function createDungeonRenderer(
  element: HTMLElement,
  game: GameHandle,
  options: DungeonRendererOptions = {},
): DungeonRenderer {
  const tileSize     = options.tileSize     ?? 3;
  const ceilingH     = options.ceilingHeight ?? 3;
  const fov          = options.fov          ?? 75;
  const fogNear      = options.fogNear      ?? 5;
  const fogFar       = options.fogFar       ?? 24;
  const fogHex       = options.fogColor     ?? '#000000';
  const lerpFactor   = options.lerpFactor   ?? 0.18;
  const fogColor     = new THREE.Color(fogHex);

  // ── WebGL renderer ────────────────────────────────────────────────────────
  const glRenderer = new THREE.WebGLRenderer({ antialias: false });
  glRenderer.setPixelRatio(window.devicePixelRatio);
  glRenderer.setClearColor(fogColor);
  const canvas = glRenderer.domElement;
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  element.appendChild(canvas);

  // ── Scene ─────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

  // ── Camera ────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, fogFar * 2);

  // ── Lighting ──────────────────────────────────────────────────────────────
  // Faint ambient keeps pitch-black areas slightly visible.
  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  // Warm torch point-light that follows the camera each frame.
  const torchLight = new THREE.PointLight(0xffe8c0, 3, tileSize * 5, 2);
  scene.add(torchLight);

  // ── Dungeon geometry ──────────────────────────────────────────────────────
  const quadGeo  = new THREE.PlaneGeometry(1, 1);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x555566 });
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x222233 });
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x6b6070 });

  let floorMesh: THREE.InstancedMesh | null = null;
  let ceilMesh:  THREE.InstancedMesh | null = null;
  let wallMesh:  THREE.InstancedMesh | null = null;
  let dungeonBuilt = false;

  function buildDungeon() {
    if (dungeonBuilt) return;
    const outputs = game.dungeon.outputs;
    if (!outputs) return;
    dungeonBuilt = true;

    const { width, height } = outputs;
    const solid = outputs.textures.solid.image.data as Uint8Array;
    const wallMidY = ceilingH / 2;

    const floors: THREE.Matrix4[] = [];
    const ceils:  THREE.Matrix4[] = [];
    const walls:  THREE.Matrix4[] = [];

    function isSolid(cx: number, cz: number) {
      if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
      return (solid[cz * width + cx] ?? 0) > 0;
    }

    for (let cz = 0; cz < height; cz++) {
      for (let cx = 0; cx < width; cx++) {
        if (isSolid(cx, cz)) continue;

        const wx = (cx + 0.5) * tileSize;
        const wz = (cz + 0.5) * tileSize;

        floors.push(makeFaceMatrix(wx, 0, wz, -HALF_PI, 0, 0, tileSize, tileSize));
        ceils.push(makeFaceMatrix(wx, ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize));

        // Emit a wall face wherever a neighbouring cell is solid.
        if (isSolid(cx, cz - 1)) walls.push(makeFaceMatrix(wx, wallMidY, cz * tileSize, 0, 0, 0, tileSize, ceilingH));
        if (isSolid(cx, cz + 1)) walls.push(makeFaceMatrix(wx, wallMidY, (cz + 1) * tileSize, 0, Math.PI, 0, tileSize, ceilingH));
        if (isSolid(cx - 1, cz)) walls.push(makeFaceMatrix(cx * tileSize, wallMidY, wz, 0, HALF_PI, 0, tileSize, ceilingH));
        if (isSolid(cx + 1, cz)) walls.push(makeFaceMatrix((cx + 1) * tileSize, wallMidY, wz, 0, -HALF_PI, 0, tileSize, ceilingH));
      }
    }

    floorMesh = new THREE.InstancedMesh(quadGeo, floorMat, floors.length);
    floors.forEach((m, i) => floorMesh!.setMatrixAt(i, m));
    floorMesh.instanceMatrix.needsUpdate = true;
    scene.add(floorMesh);

    ceilMesh = new THREE.InstancedMesh(quadGeo, ceilMat, ceils.length);
    ceils.forEach((m, i) => ceilMesh!.setMatrixAt(i, m));
    ceilMesh.instanceMatrix.needsUpdate = true;
    scene.add(ceilMesh);

    wallMesh = new THREE.InstancedMesh(quadGeo, wallMat, walls.length);
    walls.forEach((m, i) => wallMesh!.setMatrixAt(i, m));
    wallMesh.instanceMatrix.needsUpdate = true;
    scene.add(wallMesh);
  }

  // ── Entity rendering ──────────────────────────────────────────────────────
  const entityGeo = new THREE.BoxGeometry(
    tileSize * 0.35,
    ceilingH * 0.55,
    tileSize * 0.35,
  );
  const entityMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
  const entityMeshMap = new Map<string, THREE.Mesh>();

  function syncEntities(entities: EntityBase[]) {
    const aliveIds = new Set(entities.filter(e => e.alive).map(e => e.id));

    for (const [id, mesh] of entityMeshMap) {
      if (!aliveIds.has(id)) {
        scene.remove(mesh);
        entityMeshMap.delete(id);
      }
    }

    for (const e of entities) {
      if (!e.alive) continue;
      if (!entityMeshMap.has(e.id)) {
        const newMesh = new THREE.Mesh(entityGeo, entityMat);
        entityMeshMap.set(e.id, newMesh);
        scene.add(newMesh);
      }
      entityMeshMap.get(e.id)!.position.set(
        (e.x + 0.5) * tileSize,
        ceilingH * EYE_HEIGHT_FACTOR,
        (e.z + 0.5) * tileSize,
      );
    }
  }

  // ── Camera lerp state ─────────────────────────────────────────────────────
  let tgtX = 0, tgtZ = 0, tgtYaw = 0;
  let curX = 0, curZ = 0, curYaw = 0;
  let initialized = false;

  const onTurn = () => {
    buildDungeon();
    tgtX   = (game.player.x + 0.5) * tileSize;
    tgtZ   = (game.player.z + 0.5) * tileSize;
    tgtYaw = game.player.facing;
    if (!initialized) {
      curX = tgtX; curZ = tgtZ; curYaw = tgtYaw;
      initialized = true;
    }
  };

  game.events.on('turn', onTurn);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  let rafId = 0;
  let lastT = 0;

  function tick(t: number) {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((t - lastT) / 1000, 0.1);
    lastT = t;

    if (initialized) {
      // Exponential lerp: base^(dt*60) gives frame-rate-independent smoothing.
      const k = 1 - Math.pow(1 - lerpFactor, dt * 60);
      curX += (tgtX - curX) * k;
      curZ += (tgtZ - curZ) * k;

      // Shortest-path yaw lerp to avoid spinning the long way round.
      let dy = tgtYaw - curYaw;
      if (dy >  Math.PI) dy -= 2 * Math.PI;
      if (dy < -Math.PI) dy += 2 * Math.PI;
      curYaw += dy * k;

      camera.position.set(curX, ceilingH * EYE_HEIGHT_FACTOR, curZ);
      camera.rotation.set(0, curYaw, 0, 'YXZ');
      torchLight.position.copy(camera.position);
    }

    glRenderer.render(scene, camera);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    const w = element.clientWidth  || 1;
    const h = element.clientHeight || 1;
    glRenderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(element);
  resize();

  rafId = requestAnimationFrame(tick);

  // ── Public handle ─────────────────────────────────────────────────────────
  return {
    setEntities(entities) {
      syncEntities(entities);
    },
    destroy() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      game.events.off('turn', onTurn);
      glRenderer.dispose();
      canvas.remove();
    },
  };
}
