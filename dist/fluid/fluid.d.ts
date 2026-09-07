import { DungeonOutputs } from '../dungeon/bsp';
export interface FluidField {
    width: number;
    height: number;
    /** Fluid type id per cell, row-major. 0 = empty/no fluid. */
    cellType: Uint8Array;
    /**
     * Continuous fluid quantity per cell: 0 = dry, otherwise the real depth of
     * fluid above this cell's own floor, in the same mass-equivalent units as
     * `floorElevation`. Unbounded above `MAX_MASS` — a deep pit's lowest cell
     * legitimately holds much more than one "full cell's worth" once its
     * connected pool has enough total volume to reach the rim (see
     * `stepFast`'s drop-aware target).
     */
    mass: Float32Array;
    /** World-scale elevation of each cell's floor, in mass-equivalent units (see DEFAULT_STEP_HEIGHT). */
    floorElevation: Float32Array;
    /** 1 where no fluid may ever exist (walls, doors, pit holes). */
    isSolid: Uint8Array;
    /** Bumped whenever cellType/mass changes; drives renderer repaint. */
    version: number;
    /** Seconds of unspent time toward the next damped leveling tick. */
    accumulator: number;
    /** Seconds of unspent time toward the next fast steep-drop tick. */
    fastAccumulator: number;
    /**
     * Engine-owned bookkeeping, not part of the public simulation API — do not
     * read or mutate. Row-major indices of non-solid cells, computed once at
     * construction so the fast/damped passes (run up to 300x/sec) can skip
     * solid cells without re-checking `isSolid` for every cell on every tick.
     * Stays valid only as long as `isSolid` itself is never mutated after
     * creation (true of every constructor below; there is no public API for
     * changing which cells are solid on a live field).
     */
    openCells: Int32Array;
    /**
     * Engine-owned bookkeeping, not part of the public simulation API — do not
     * read or mutate. Reused double-buffer for the fast/damped passes, so they
     * don't allocate a fresh `Float32Array` on every one of up to 300 ticks/sec.
     */
    scratch: Float32Array;
}
export interface FluidDef {
    /** Display name, e.g. for a HUD/tooltip. */
    name: string;
    color: [number, number, number];
    /** Relative density; not consumed by the simulation itself, exposed for consumer use. */
    density: number;
    /** Strength of the fake surface-ripple shading (see rendering/fluidMask.ts). 0 = off. Default 0. */
    refractionIndex?: number;
    /** Per-type alpha multiplier, 0-1. Default matches FluidSurfaceOptions.opacity (0.85). */
    opacity?: number;
    /** Additive glow tint, e.g. for radiation/magic. Default [0, 0, 0] (no glow). */
    glowColor?: [number, number, number];
    /** Additive glow strength. Default 0. */
    glowIntensity?: number;
}
/** One full cell's worth of fluid. Everything else scales off this. */
export declare const MAX_MASS = 1;
/**
 * How much mass-equivalent elevation counts as a "step" for
 * `floorElevation`, i.e. how much fluid a one-step-deep cell holds before
 * its surface reaches the same height as a neighboring cell one step up.
 * `fluidFieldFromDungeon` scales `floorHeightOffset` steps by this.
 */
export declare const DEFAULT_STEP_HEIGHT = 1;
/** How much mass a cell needs before a renderer should draw it as fluid at all. */
export declare const FLUID_VISIBLE_THRESHOLD = 0.01;
export interface CreateFluidFieldOptions {
    isSolid?: Uint8Array;
    floorElevation?: Float32Array;
}
export declare function createFluidField(width: number, height: number, opts?: CreateFluidFieldOptions): FluidField;
/**
 * Builds a FluidField from a generated dungeon's raw per-cell textures —
 * `solid`/`colliderFlags` for blocking, `floorHeightOffset` (when present)
 * for elevation. A cell with no floor tile (raw offset byte 0, the "pit"
 * sentinel — see bsp.ts/cellular.ts) has nowhere to hold fluid and is
 * treated as solid for fluid purposes.
 *
 * `floorElevation` is populated in the same abstract mass-equivalent units
 * as `mass` (DEFAULT_STEP_HEIGHT per floor-height step) — deliberately
 * decoupled from any renderer's `tileSize`/`offsetFactor`, so the tuned CA
 * constants above stay valid regardless of world-space scale. Convert to
 * world Y only at render time — see `rendering/fluidMask.ts`.
 */
export declare function fluidFieldFromDungeon(outputs: DungeonOutputs): FluidField;
export declare function stepFluid(field: FluidField, dt: number): void;
export declare function fluidCellAt(f: FluidField, x: number, z: number): number;
export declare function fluidDepthAt(f: FluidField, x: number, z: number): number;
/**
 * Fills non-solid cells within radius r to `amount` mass of `cellType`,
 * overwriting whatever fluid (if any) was already there.
 */
export declare function placeFluidCircle(f: FluidField, cx: number, cz: number, r: number, cellType: number, amount?: number): void;
//# sourceMappingURL=fluid.d.ts.map