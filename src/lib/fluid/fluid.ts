// src/lib/fluid/fluid.ts
//
// Generic 2D fluid pooling for a top-down dungeon floor plan.
//
// Ported from a side-on cellular automaton (mass-conserving, Noita-style
// continuous liquids) where "down" was a literal grid direction. This grid
// has no such axis — the floor plan is already horizontal, and verticality
// is a per-cell scalar (`floorElevation`, e.g. from `floorHeightOffset`).
// The port generalizes the original left/right/up flow rules into a single
// 4-neighbor rule driven by `surfaceHeight = floorElevation + mass`, which
// is what makes the same "flat pools regardless of floor shape" guarantee
// hold on stepped/sloped floors instead of only flat ones.
//
// Two passes remain, run on independent fixed-tick schedules exactly like
// the source (see FAST_TICK_HZ / LEVEL_TICK_HZ below for why they're kept
// separate). Which pass handles a given neighbor is gated on the
// *structural* floor-elevation difference alone, not the combined
// surfaceHeight — gating on surfaceHeight would also fire between two
// same-elevation cells whenever one is full and the other empty (remaining
// mass alone can reach the threshold), incorrectly fast-falling sideways
// across flat ground instead of leaving lateral spreading to the damped pass:
//  - Fast pass: neighbors whose *floor* is at least one step below the
//    current cell's get a full-strength transfer, capped at one cell's mass
//    per tick — this is what makes fluid rush into a deep depression instead
//    of trickling in.
//  - Damped pass: every other neighbor moves a quarter of the surfaceHeight
//    difference per tick (a hard stability ceiling, not an arbitrary
//    slowness — see MAX_SPEED's comment) so pools settle to one flat
//    surface, including across the steps a deep pit is carved from.
//
// Deliberately dropped from the source: fluid-vs-fluid chemistry, status
// effects, and the vertical density-stacking swap. The stacking swap fixed
// a side-on-specific bug (denser fluid rendered on top of lighter fluid in
// the same column); there is no such column here — each cell holds exactly
// one fluid type, so two different fluids meeting at a cell boundary simply
// don't merge, which needs no special-casing. `FluidDef.density` is still
// exposed for consumer-side use (sound/visual cues, future extensions).
//
// One addition beyond the source: evaporation (see `evaporate` below).
// Fluid spread thin across open flat ground, or the trailing residue of a
// shrinking puddle, never accumulates enough mass to matter and would
// otherwise sit there forever — real pools are naturally exempt since their
// low point holds mass near MAX_MASS by construction of the two passes above.

import type { DungeonOutputs } from "../dungeon/bsp";
import { isBlockedCell } from "../dungeon/colliderFlags";

// ─── Types ───────────────────────────────────────────────────────────────

export interface FluidField {
  width: number;
  height: number;
  /** Fluid type id per cell, row-major. 0 = empty/no fluid. */
  cellType: Uint8Array;
  /** Continuous fluid quantity per cell: 0 = dry, up to ~1 + a small compression allowance. */
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
}

export interface FluidDef {
  /** Display name, e.g. for a HUD/tooltip. */
  name: string;
  color: [number, number, number];
  /** Relative density; not consumed by the simulation itself, exposed for consumer use. */
  density: number;
}

// ─── Tuning constants ───────────────────────────────────────────────────

/** One full cell's worth of fluid. Everything else scales off this. */
export const MAX_MASS = 1.0;
/** A cell can briefly hold a little more than MAX_MASS when pressed from a higher neighbor. */
const MAX_COMPRESS = 0.02;
/** Below this, a cell counts as dry and its type resets to 0. */
const MIN_MASS = 0.0001;
/** Transfers smaller than this are dropped rather than applied, so near-equal cells stop nudging forever. */
const MIN_FLOW = 0.01;
/**
 * Upper bound on how much mass can cross a cell boundary in one damped-pass
 * tick. The damped pass moves a quarter of the imbalance per tick, and that
 * factor is a hard stability ceiling: for a single pair exchanging mass each
 * tick, the remaining difference scales by (1 - 2*fraction) per tick, so any
 * fraction above 1/2 flips the difference's sign and grows it every tick
 * instead of shrinking it. Raising this cap (or the 1/4 factor in
 * stepLevelFlow) reintroduces that oscillation. To make leveling faster,
 * raise LEVEL_TICK_HZ instead — running the same damped math more often per
 * real second has no such ceiling.
 */
const MAX_SPEED = 0.25;
/** Fast pass's own transfer cap — a full cell can move in one fast tick. */
const FAST_TRANSFER = MAX_MASS;
/**
 * How much mass-equivalent elevation counts as a "step" for
 * `floorElevation`, i.e. how much fluid a one-step-deep cell holds before
 * its surface reaches the same height as a neighboring cell one step up.
 * `fluidFieldFromDungeon` scales `floorHeightOffset` steps by this.
 */
export const DEFAULT_STEP_HEIGHT = 1.0;
/**
 * Minimum surfaceHeight imbalance between two neighbors before the fast
 * pass (rather than the damped pass) handles the flow between them.
 */
const STEEP_DROP_THRESHOLD = DEFAULT_STEP_HEIGHT;

/** Fast pass rate — independent of, and much slower than, the damped pass. */
const FAST_TICK_HZ = 15;
const FAST_TICK_DT = 1 / FAST_TICK_HZ;
/** Damped leveling rate — the only safe knob for making leveling faster (see MAX_SPEED). */
const LEVEL_TICK_HZ = 300;
const LEVEL_TICK_DT = 1 / LEVEL_TICK_HZ;

/** How much mass a cell needs before a renderer should draw it as fluid at all. */
export const FLUID_VISIBLE_THRESHOLD = 0.01;

/**
 * Only cells strictly below this mass evaporate — this is what distinguishes
 * "spread too thin to collect" from an actual pool: a pool's low point holds
 * mass approaching MAX_MASS by construction of the fast/damped passes above
 * (they keep pushing mass toward the lowest reachable point until it's full
 * there), so real pools sit well above this threshold and are naturally
 * exempt. Only thin residue left spread across flat ground, or the trailing
 * edge of a shrinking puddle, ever drops this low. No separate slope/pooling
 * detection needed.
 */
const EVAPORATE_THRESHOLD = 0.15;
/** How fast sub-threshold mass drains away, in mass/sec. */
const EVAPORATE_RATE = 0.03;

/**
 * Given the total mass shared between a cell and a lower neighbor, returns
 * how much of that total the lower cell should hold at rest. Up to
 * MAX_MASS the lower cell just holds everything; beyond that it's allowed
 * to compress slightly, which is what lets a filled cell push its excess
 * onward to the next-lowest neighbor instead of just piling up forever.
 */
function stableRestingMass(totalMass: number): number {
  if (totalMass <= MAX_MASS) return MAX_MASS;
  if (totalMass < 2 * MAX_MASS + MAX_COMPRESS) {
    return (MAX_MASS * MAX_MASS + totalMass * MAX_COMPRESS) / (MAX_MASS + MAX_COMPRESS);
  }
  return (totalMass + MAX_COMPRESS) / 2;
}

// ─── Construction ────────────────────────────────────────────────────────

export interface CreateFluidFieldOptions {
  isSolid?: Uint8Array;
  floorElevation?: Float32Array;
}

export function createFluidField(width: number, height: number, opts: CreateFluidFieldOptions = {}): FluidField {
  const size = width * height;
  return {
    width,
    height,
    cellType: new Uint8Array(size),
    mass: new Float32Array(size),
    floorElevation: opts.floorElevation ?? new Float32Array(size),
    isSolid: opts.isSolid ?? new Uint8Array(size),
    version: 0,
    accumulator: 0,
    fastAccumulator: 0,
  };
}

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
export function fluidFieldFromDungeon(outputs: DungeonOutputs): FluidField {
  const { width, height } = outputs;
  const size = width * height;

  const solidData = outputs.textures.solid.image.data as Uint8Array;
  const flagsData = outputs.textures.colliderFlags.image.data as Uint8Array;
  const offsetData = outputs.textures.floorHeightOffset?.image.data as Uint8Array | undefined;

  const isSolid = new Uint8Array(size);
  const floorElevation = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    let blocked = solidData[i] !== 0 || isBlockedCell(flagsData[i]!);
    let elevation = 0;
    if (offsetData) {
      const raw = offsetData[i]!;
      if (raw === 0) blocked = true; // pit sentinel: no floor tile to hold fluid
      else elevation = (raw - 128) * DEFAULT_STEP_HEIGHT;
    }
    isSolid[i] = blocked ? 1 : 0;
    floorElevation[i] = elevation;
  }

  return createFluidField(width, height, { isSolid, floorElevation });
}

// ─── Neighbor helpers ────────────────────────────────────────────────────

/** Grid-relative (dx, dz) offsets for the 4-neighborhood, in a fixed priority order. */
const NEIGHBOR_DX = [0, 0, -1, 1];
const NEIGHBOR_DZ = [-1, 1, 0, 0];

// ─── Fast pass (steep drop) ──────────────────────────────────────────────

function stepFast(f: FluidField): boolean {
  const { width, height, cellType, mass, floorElevation, isSolid } = f;
  const size = width * height;
  const newMass = mass.slice();
  let changed = false;

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      if (isSolid[i]) continue;
      const startMass = mass[i]!;
      if (startMass <= MIN_MASS) continue;
      const myType = cellType[i]!;
      let remaining = startMass;

      for (let n = 0; n < 4; n++) {
        if (remaining <= MIN_MASS) break;
        const nx = x + NEIGHBOR_DX[n]!;
        const nz = z + NEIGHBOR_DZ[n]!;
        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
        const j = nz * width + nx;
        if (isSolid[j]) continue;
        const jMass = mass[j]!;
        if (!(cellType[j] === myType || jMass <= MIN_MASS)) continue;

        // Gate on the *structural* elevation difference alone, not the
        // combined surfaceHeight (elevation + mass) — otherwise a full cell
        // next to an empty same-elevation neighbor also reads as "steep"
        // (remaining alone can reach the threshold), incorrectly fast-falling
        // sideways across flat ground instead of leaving lateral spreading to
        // the damped pass below.
        if (floorElevation[i]! - floorElevation[j]! < STEEP_DROP_THRESHOLD) continue;

        const stable = stableRestingMass(remaining + jMass);
        const flow = Math.min(Math.max(0, stable - jMass), remaining, FAST_TRANSFER);
        if (flow > MIN_FLOW) {
          newMass[i]! -= flow;
          newMass[j]! += flow;
          if (jMass <= MIN_MASS) cellType[j] = myType;
          remaining -= flow;
          changed = true;
        }
      }
    }
  }

  finalize(f, newMass, size);
  return changed;
}

// ─── Damped pass (leveling) ──────────────────────────────────────────────

function stepLevel(f: FluidField): boolean {
  const { width, height, cellType, mass, floorElevation, isSolid } = f;
  const size = width * height;
  const newMass = mass.slice();
  let changed = false;

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      if (isSolid[i]) continue;
      const startMass = mass[i]!;
      if (startMass <= MIN_MASS) continue;
      const myType = cellType[i]!;
      let remaining = startMass;

      for (let n = 0; n < 4; n++) {
        if (remaining <= MIN_MASS) break;
        const nx = x + NEIGHBOR_DX[n]!;
        const nz = z + NEIGHBOR_DZ[n]!;
        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
        const j = nz * width + nx;
        if (isSolid[j]) continue;
        const jMass = mass[j]!;
        if (!(cellType[j] === myType || jMass <= MIN_MASS)) continue;

        // Steep structural drops are the fast pass's job — see stepFast's
        // comment on why this must gate on elevation alone, not surfaceHeight.
        if (floorElevation[i]! - floorElevation[j]! >= STEEP_DROP_THRESHOLD) continue;

        const delta = floorElevation[i]! + remaining - (floorElevation[j]! + jMass);
        const flow = Math.min(Math.max(0, delta / 4), remaining, MAX_SPEED);
        if (flow > MIN_FLOW) {
          newMass[i]! -= flow;
          newMass[j]! += flow;
          if (jMass <= MIN_MASS) cellType[j] = myType;
          remaining -= flow;
          changed = true;
        }
      }
    }
  }

  finalize(f, newMass, size);
  return changed;
}

function finalize(f: FluidField, newMass: Float32Array, size: number): void {
  for (let i = 0; i < size; i++) {
    if (newMass[i]! < MIN_MASS) {
      newMass[i] = 0;
      f.cellType[i] = 0;
    }
  }
  f.mass.set(newMass);
}

// ─── Evaporation ─────────────────────────────────────────────────────────

/**
 * Drains mass from thin, unpooled cells at a slow real-time rate — run once
 * per `stepFluid` call using the real `dt`, like the source's `reactFluid`,
 * not inside the fixed-tick fast/damped loops (evaporation doesn't need
 * their precision, and doing it there would scale the rate with tick
 * frequency instead of wall-clock time).
 */
function evaporate(f: FluidField, dt: number): boolean {
  const { mass, cellType, isSolid, width, height } = f;
  const size = width * height;
  let changed = false;

  for (let i = 0; i < size; i++) {
    if (isSolid[i]) continue;
    const m = mass[i]!;
    if (m <= 0 || m >= EVAPORATE_THRESHOLD) continue;

    const next = m - EVAPORATE_RATE * dt;
    if (next < MIN_MASS) {
      mass[i] = 0;
      cellType[i] = 0;
    } else {
      mass[i] = next;
    }
    changed = true;
  }

  return changed;
}

// ─── Step ────────────────────────────────────────────────────────────────

export function stepFluid(field: FluidField, dt: number): void {
  field.fastAccumulator += dt;
  field.accumulator += dt;
  let changed = false;

  while (field.fastAccumulator >= FAST_TICK_DT) {
    changed = stepFast(field) || changed;
    field.fastAccumulator -= FAST_TICK_DT;
  }
  while (field.accumulator >= LEVEL_TICK_DT) {
    changed = stepLevel(field) || changed;
    field.accumulator -= LEVEL_TICK_DT;
  }
  changed = evaporate(field, dt) || changed;

  if (changed) field.version++;
}

// ─── Query ───────────────────────────────────────────────────────────────

export function fluidCellAt(f: FluidField, x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  if (xi < 0 || xi >= f.width || zi < 0 || zi >= f.height) return 0;
  const i = zi * f.width + xi;
  return f.mass[i]! > MIN_MASS ? f.cellType[i]! : 0;
}

export function fluidDepthAt(f: FluidField, x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  if (xi < 0 || xi >= f.width || zi < 0 || zi >= f.height) return 0;
  return f.mass[zi * f.width + xi]!;
}

// ─── Mutation ────────────────────────────────────────────────────────────

/**
 * Fills non-solid cells within radius r to `amount` mass of `cellType`,
 * overwriting whatever fluid (if any) was already there.
 */
export function placeFluidCircle(
  f: FluidField,
  cx: number,
  cz: number,
  r: number,
  cellType: number,
  amount = MAX_MASS,
): void {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(f.width - 1, Math.ceil(cx + r));
  const z0 = Math.max(0, Math.floor(cz - r));
  const z1 = Math.min(f.height - 1, Math.ceil(cz + r));
  const r2 = r * r;
  let changed = false;

  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dz = z + 0.5 - cz;
      if (dx * dx + dz * dz > r2) continue;
      const i = z * f.width + x;
      if (f.isSolid[i]) continue;
      f.cellType[i] = cellType;
      f.mass[i] = amount;
      changed = true;
    }
  }

  if (changed) f.version++;
}
