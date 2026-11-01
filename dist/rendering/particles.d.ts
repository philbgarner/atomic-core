import * as THREE from "three";
/** A 3-component vector in tiles (or tiles/s). */
export type ParticleVec = {
    x: number;
    y: number;
    z: number;
};
/**
 * A point on the dungeon grid for particle paths. `y` is a fraction of the
 * ceiling height above the cell's floor (default `0.5`).
 */
export type ParticlePoint = {
    x: number;
    z: number;
    y?: number;
};
/** Configuration for {@link DungeonRenderer.addEmitter}. Distances are in tiles. */
export type ParticleEmitterSpec = {
    /**
     * Grid cells particles spawn in, chosen at random per particle. Ignored
     * while `path` is set (particles spawn around the moving head instead).
     */
    cells?: {
        x: number;
        z: number;
    }[];
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
    path?: {
        from: ParticlePoint;
        to: ParticlePoint;
        speed: number;
    };
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
/** Parse a CSS hex string (`#rgb` / `#rrggbb`) or `0xRRGGBB` number to `0xRRGGBB`. */
export declare function parseHexColor(c: string | number): number;
/**
 * Pick a ramp colour for a particle at life fraction `t` (0..1), shifted
 * `shift` steps darker (clamped to the last entry). Returns `0xRRGGBB`.
 */
export declare function rampColor(colors: number[], t: number, shift?: number): number;
/**
 * Create a CPU particle simulation. `capacity` caps live particles (new
 * spawns are dropped when full); `rng` defaults to `Math.random`.
 */
export declare function createParticleSim(capacity?: number, rng?: () => number): ParticleSim;
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
export declare function createParticleLayer(opts: ParticleLayerOptions): ParticleLayer;
//# sourceMappingURL=particles.d.ts.map