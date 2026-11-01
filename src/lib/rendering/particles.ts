// src/lib/rendering/particles.ts
//
// Palette-safe particle effects (gas clouds, flames, sparks, dust, projectiles).
//
// Particles are hard-edged square points drawn in exact colours from a ramp —
// no alpha blending, no shading — so they stay inside a fixed art palette and
// pass `validatePalette()`. Each particle steps through its emitter's colour
// ramp (brightest first) over its life. In `'paletteBands'` lighting,
// non-emissive particles are pushed further down the ramp by their cell's
// light level and culled in dark cells; emissive ones (fire, flashes) ignore
// the light grid.
//
// The simulation (`createParticleSim`) is plain CPU code with no Three.js, so
// it can be unit-tested; `createParticleLayer` draws it as one THREE.Points
// and is stepped from the dungeon renderer's frame loop, so effects animate
// in real time between turns.

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A 3-component vector in tiles (or tiles/s). */
export type ParticleVec = { x: number; y: number; z: number };

/**
 * A point on the dungeon grid for particle paths. `y` is a fraction of the
 * ceiling height above the cell's floor (default `0.5`).
 */
export type ParticlePoint = { x: number; z: number; y?: number };

/** Configuration for {@link DungeonRenderer.addEmitter}. Distances are in tiles. */
export type ParticleEmitterSpec = {
  /**
   * Grid cells particles spawn in, chosen at random per particle. Ignored
   * while `path` is set (particles spawn around the moving head instead).
   */
  cells?: { x: number; z: number }[];
  /**
   * Fraction of each cell's footprint particles spawn in, centred. `1` = the
   * whole cell, `0` = the exact centre. Also the spawn radius (in tiles)
   * around a `path` head. Default: `1` (cells) / `0.1` (path).
   */
  spread?: number;
  /** Spawn height range as fractions of the ceiling height above the floor. Default: `[0, 1]`. */
  height?: [number, number];
  /** Particles spawned per second. Default: `0`. */
  rate?: number;
  /** Particles spawned immediately. Default: `0`. */
  burst?: number;
  /**
   * Seconds the emitter keeps spawning (`Infinity` = until `stop()`).
   * Default: `Infinity` when `rate` is set, otherwise `0` (burst only).
   */
  duration?: number;
  /** Particle lifetime range in seconds. */
  lifetime: [number, number];
  /** Initial velocity in tiles/s. Default: zero. */
  velocity?: Partial<ParticleVec>;
  /** Random ± velocity per axis in tiles/s (a number applies to all axes). Default: `0`. */
  jitter?: number | Partial<ParticleVec>;
  /** Downward acceleration in tiles/s² (negative = rises). Default: `0`. */
  gravity?: number;
  /** Velocity damping per second (`v *= exp(-drag · dt)`). Default: `0`. */
  drag?: number;
  /** Particle size in tiles, or a random range. */
  size: number | [number, number];
  /**
   * Colour ramp, brightest first (CSS hex strings or `0xRRGGBB`). Each
   * particle steps evenly through it over its life; in palette mode lit
   * non-emissive particles also shift one step darker per light level.
   */
  colors: (string | number)[];
  /** Ignore `'paletteBands'` light levels (fire, flashes, magic). Default: `false`. */
  emissive?: boolean;
  /**
   * Move the emitter head from `from` to `to` at `speed` tiles/s (e.g. a
   * projectile and its trail). Spawning stops on arrival and `onArrive` fires.
   */
  path?: { from: ParticlePoint; to: ParticlePoint; speed: number };
  /** Called once when a `path` emitter reaches `to`. */
  onArrive?: () => void;
};

/** Handle returned by {@link DungeonRenderer.addEmitter}. */
export type EmitterHandle = {
  /** Stop spawning; live particles finish their lives. */
  stop(): void;
  /** Remove the emitter and all of its particles immediately. */
  kill(): void;
  /** True while the emitter is spawning or any of its particles are alive. */
  readonly alive: boolean;
};

/** One live particle as seen by {@link ParticleSim.forEach}. Positions are in tiles. */
export type ParticleView = {
  x: number;
  /** Height above the cell's floor as a fraction of the ceiling height. */
  y: number;
  z: number;
  /** Age ÷ lifetime, in [0, 1). */
  t: number;
  size: number;
  colors: number[];
  emissive: boolean;
};

/** CPU particle simulation (no Three.js). */
export type ParticleSim = {
  addEmitter(spec: ParticleEmitterSpec): EmitterHandle;
  /** Advance every emitter and particle by `dt` seconds. */
  step(dt: number): void;
  /** Visit every live particle. */
  forEach(fn: (p: ParticleView) => void): void;
  /** Kill every emitter and particle. */
  clear(): void;
  /** Live particle count. */
  readonly count: number;
};

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/** Parse a CSS hex string (`#rgb` / `#rrggbb`) or `0xRRGGBB` number to `0xRRGGBB`. */
export function parseHexColor(c: string | number): number {
  if (typeof c === "number") return c & 0xffffff;
  let s = c.trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map((ch) => ch + ch).join("");
  const v = parseInt(s, 16);
  return Number.isNaN(v) ? 0 : v & 0xffffff;
}

/**
 * Pick a ramp colour for a particle at life fraction `t` (0..1), shifted
 * `shift` steps darker (clamped to the last entry). Returns `0xRRGGBB`.
 */
export function rampColor(colors: number[], t: number, shift = 0): number {
  if (colors.length === 0) return 0;
  const i = Math.floor(Math.max(0, Math.min(0.999999, t)) * colors.length) + Math.max(0, shift);
  return colors[Math.min(colors.length - 1, i)]!;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

type Emitter = {
  spec: ParticleEmitterSpec;
  colors: number[];
  elapsed: number;
  duration: number;
  carry: number;
  spawning: boolean;
  live: number;
  dead: boolean;
  head: ParticleVec | null;
};

type Particle = {
  em: Emitter;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
};

/**
 * Create a CPU particle simulation. `capacity` caps live particles (new
 * spawns are dropped when full); `rng` defaults to `Math.random`.
 */
export function createParticleSim(
  capacity = 4096,
  rng: () => number = Math.random,
): ParticleSim {
  const emitters = new Set<Emitter>();
  let particles: Particle[] = [];
  const range = (r: [number, number]) => r[0] + (r[1] - r[0]) * rng();
  const pm = (a: number) => (rng() * 2 - 1) * a;

  function spawn(em: Emitter): void {
    if (particles.length >= capacity) return;
    const s = em.spec;
    const [h0, h1] = s.height ?? [0, 1];
    let x: number;
    let y: number;
    let z: number;
    if (em.head) {
      const r = s.spread ?? 0.1;
      x = em.head.x + pm(r);
      y = em.head.y + pm(r);
      z = em.head.z + pm(r);
    } else {
      const cells = s.cells ?? [];
      if (cells.length === 0) return;
      const c = cells[Math.floor(rng() * cells.length)]!;
      const sp = Math.max(0, Math.min(1, s.spread ?? 1));
      x = c.x + 0.5 + (rng() - 0.5) * sp;
      z = c.z + 0.5 + (rng() - 0.5) * sp;
      y = h0 + (h1 - h0) * rng();
    }
    const v = s.velocity ?? {};
    const j = typeof s.jitter === "number" ? { x: s.jitter, y: s.jitter, z: s.jitter } : (s.jitter ?? {});
    particles.push({
      em,
      x,
      y,
      z,
      vx: (v.x ?? 0) + pm(j.x ?? 0),
      vy: (v.y ?? 0) + pm(j.y ?? 0),
      vz: (v.z ?? 0) + pm(j.z ?? 0),
      age: 0,
      life: Math.max(1e-3, range(s.lifetime)),
      size: typeof s.size === "number" ? s.size : range(s.size),
    });
    em.live++;
  }

  const sim: ParticleSim = {
    addEmitter(spec) {
      const em: Emitter = {
        spec,
        colors: spec.colors.map(parseHexColor),
        elapsed: 0,
        duration: spec.duration ?? (spec.rate ? Infinity : 0),
        carry: 0,
        spawning: true,
        live: 0,
        dead: false,
        head: spec.path
          ? { x: spec.path.from.x + 0.5, y: spec.path.from.y ?? 0.5, z: spec.path.from.z + 0.5 }
          : null,
      };
      emitters.add(em);
      for (let i = 0; i < (spec.burst ?? 0); i++) spawn(em);
      if (!spec.rate && !spec.path) em.spawning = false;
      return {
        stop() {
          em.spawning = false;
        },
        kill() {
          em.dead = true;
          em.spawning = false;
          emitters.delete(em);
          particles = particles.filter((p) => p.em !== em);
          em.live = 0;
        },
        get alive() {
          return !em.dead && (em.spawning || em.live > 0);
        },
      };
    },

    step(dt) {
      for (const em of emitters) {
        const s = em.spec;
        if (em.spawning && em.head && s.path) {
          const to = { x: s.path.to.x + 0.5, y: s.path.to.y ?? 0.5, z: s.path.to.z + 0.5 };
          const dx = to.x - em.head.x;
          const dy = to.y - em.head.y;
          const dz = to.z - em.head.z;
          const dist = Math.hypot(dx, dy, dz);
          const move = s.path.speed * dt;
          if (dist <= move || dist === 0) {
            em.head = to;
            em.spawning = false;
            s.onArrive?.();
          } else {
            em.head.x += (dx / dist) * move;
            em.head.y += (dy / dist) * move;
            em.head.z += (dz / dist) * move;
          }
        }
        if (em.spawning && s.rate) {
          em.carry += s.rate * dt;
          while (em.carry >= 1) {
            em.carry -= 1;
            spawn(em);
          }
        }
        em.elapsed += dt;
        if (em.elapsed >= em.duration && !s.path) em.spawning = false;
      }

      const next: Particle[] = [];
      for (const p of particles) {
        p.age += dt;
        if (p.age >= p.life || p.em.dead) {
          p.em.live--;
          continue;
        }
        const s = p.em.spec;
        if (s.drag) {
          const k = Math.exp(-s.drag * dt);
          p.vx *= k;
          p.vy *= k;
          p.vz *= k;
        }
        if (s.gravity) p.vy -= s.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        next.push(p);
      }
      particles = next;

      for (const em of emitters)
        if (!em.spawning && em.live <= 0) {
          em.dead = true;
          emitters.delete(em);
        }
    },

    forEach(fn) {
      for (const p of particles)
        fn({
          x: p.x,
          y: p.y,
          z: p.z,
          t: p.age / p.life,
          size: p.size,
          colors: p.em.colors,
          emissive: !!p.em.spec.emissive,
        });
    },

    clear() {
      for (const em of emitters) {
        em.dead = true;
        em.spawning = false;
        em.live = 0;
      }
      emitters.clear();
      particles = [];
    },

    get count() {
      return particles.length;
    },
  };
  return sim;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const PARTICLE_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
uniform float uPixelScale;
varying vec3 vColor;
varying float vFogDist;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vColor = aColor;
  vFogDist = length(mv.xyz);
  // Whole pixels keep particles crisp squares.
  gl_PointSize = max(1.0, floor(aSize * uPixelScale / max(-mv.z, 1e-3)));
  gl_Position = projectionMatrix * mv;
}
`;

const PARTICLE_FRAG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uPaletteMode;
varying vec3 vColor;
varying float vFogDist;

void main() {
  // Palette mode: exact ramp colour (light already applied on the CPU).
  if (uPaletteMode > 0.5) { gl_FragColor = vec4(vColor, 1.0); return; }
  float f = smoothstep(uFogNear, uFogFar, vFogDist);
  gl_FragColor = vec4(mix(vColor, uFogColor, f), 1.0);
}
`;

/** Options for {@link createParticleLayer}. */
export type ParticleLayerOptions = {
  scene: THREE.Scene;
  tileSize: number;
  ceilingHeight: number;
  /** World-space floor height offset of a cell. */
  floorAt: (x: number, z: number) => number;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  /** Max live particles. Default: 4096. */
  capacity?: number;
};

/** Per-frame lighting hooks for {@link ParticleLayer.update}. */
export type ParticleLighting = {
  /** True in `'paletteBands'` lighting: exact ramp colours, no fog. */
  palette: boolean;
  /** Light level at a cell (0 = brightest), or `null` when `'paletteBands'` is off. */
  levelAt(x: number, z: number): number | null;
  /** Number of lit levels; a level equal to this is dark. */
  levelCount: number;
};

/** A particle simulation drawn as one THREE.Points. */
export type ParticleLayer = {
  sim: ParticleSim;
  /** Step the simulation and upload it. `pixelScale` = drawing-buffer height ÷ (2·tan(fov/2)). */
  update(dt: number, pixelScale: number, lighting: ParticleLighting): void;
  dispose(): void;
};

/** Create the particle layer used by the dungeon renderer. */
export function createParticleLayer(opts: ParticleLayerOptions): ParticleLayer {
  const capacity = opts.capacity ?? 4096;
  const sim = createParticleSim(capacity);
  const { tileSize, ceilingHeight } = opts;

  const positions = new Float32Array(capacity * 3);
  const colors = new Float32Array(capacity * 3);
  const sizes = new Float32Array(capacity);
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  const sizeAttr = new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("aColor", colAttr);
  geo.setAttribute("aSize", sizeAttr);
  geo.setDrawRange(0, 0);

  const mat = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    uniforms: {
      uPixelScale: { value: 1 },
      uFogColor: { value: opts.fogColor },
      uFogNear: { value: opts.fogNear },
      uFogFar: { value: opts.fogFar },
      uPaletteMode: { value: 0 },
    },
    transparent: false,
    depthTest: true,
    depthWrite: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 1;
  opts.scene.add(points);

  return {
    sim,
    update(dt, pixelScale, lighting) {
      sim.step(dt);
      let n = 0;
      sim.forEach((p) => {
        const cx = Math.floor(p.x);
        const cz = Math.floor(p.z);
        let shift = 0;
        if (lighting.palette && !p.emissive) {
          const lvl = lighting.levelAt(cx, cz) ?? 0;
          if (lvl >= lighting.levelCount) return; // dark cell: culled
          shift = lvl;
        }
        const hex = rampColor(p.colors, p.t, shift);
        positions[n * 3] = p.x * tileSize;
        positions[n * 3 + 1] = opts.floorAt(cx, cz) + p.y * ceilingHeight;
        positions[n * 3 + 2] = p.z * tileSize;
        colors[n * 3] = ((hex >> 16) & 0xff) / 255;
        colors[n * 3 + 1] = ((hex >> 8) & 0xff) / 255;
        colors[n * 3 + 2] = (hex & 0xff) / 255;
        sizes[n] = p.size * tileSize;
        n++;
      });
      mat.uniforms["uPixelScale"]!.value = pixelScale;
      mat.uniforms["uPaletteMode"]!.value = lighting.palette ? 1 : 0;
      geo.setDrawRange(0, n);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    },
    dispose() {
      sim.clear();
      opts.scene.remove(points);
      geo.dispose();
      mat.dispose();
    },
  };
}
