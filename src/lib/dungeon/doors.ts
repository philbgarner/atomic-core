// src/lib/dungeon/doors.ts

import { IS_BLOCKED } from './colliderFlags';
import type { EasingFn, EasingName } from '../animations/easing';
import { resolveEasing } from '../animations/easing';

export type DoorCandidate = {
  x: number;
  z: number;
  dx: number;
  dz: number;
  yaw: number;
  /** Region ID of the room this opening leads into. */
  roomId: number;
  /** All threshold cells in this opening, sorted along the corridor axis. */
  groupCells: { x: number; z: number }[];
  /** Index into groupCells that is the chosen door position (median). */
  midIdx: number;
};

/** Slide direction for the animated door pane: straight up, or sideways. */
export type DoorAxis = 'vertical' | 'horizontal';

/** Logical open/closed state of a door (independent of in-flight animation progress). */
export type DoorState = 'closed' | 'open';

/**
 * Rendering and animation configuration for a door. Passed to
 * `game.dungeon.doors.add()` alongside the door's grid placement.
 */
export type DoorVisual = {
  /** Frame texture facing the side the door was approached from when placed (side A). */
  frameTile: string;
  /** Frame texture facing side B. Defaults to `frameTile`. */
  frameTileBack?: string;
  /** Pane texture (e.g. a portcullis grille) shown when the door is unlocked. */
  paneTile: string;
  /** Pane texture shown while the door is locked. Defaults to `paneTile`. */
  paneTileLocked?: string;
  /** Slide direction. Default `'vertical'` (portcullis-style, slides up into the ceiling). */
  axis?: DoorAxis;
  /** How far the pane slides, as a fraction of a cell. Default `1` (fully retracts). */
  slideDistance?: number;
  /** Slide animation duration in milliseconds. Default `400`. */
  duration?: number;
  /** Named easing or a custom `(t: number) => number` function. Default `'easeInOutQuad'`. */
  easing?: EasingName | EasingFn;
};

export type DoorRecord = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  /**
   * Key ID that locks/unlocks this door. -1 means the door is not lockable
   * by a key — only by scripted triggers.
   */
  keyId: number;
  /** Region ID of the room this door guards. */
  roomId: number;
  locked: boolean;
  open: boolean;
  /** Rendering/animation configuration for this door. */
  visual: DoorVisual;
};

/**
 * In-flight (or settled) slide-animation state for a door, tracked by the
 * renderer. `fromProgress`/`startTime` are captured whenever `open` flips so
 * a transition can be interrupted mid-slide without jumping.
 */
export type DoorAnimState = {
  /** Progress the current transition started from, in [0, 1] (0 = closed, 1 = open). */
  fromProgress: number;
  /** Target state of the in-flight transition. */
  toOpen: boolean;
  /** `performance.now()` timestamp the transition began. */
  startTime: number;
};

/**
 * Compute a door's pane slide progress at time `now`, in [0, 1]
 * (0 = fully closed, 1 = fully open). Pure function — no THREE.js dependency —
 * so it can be unit tested and shared between renderer implementations.
 */
export function computeDoorProgress(
  anim: DoorAnimState,
  now: number,
  visual: DoorVisual,
): number {
  const duration = visual.duration ?? 400;
  const target = anim.toOpen ? 1 : 0;
  if (duration <= 0) return target;
  const t = Math.min(Math.max((now - anim.startTime) / duration, 0), 1);
  const easing = resolveEasing(visual.easing);
  return anim.fromProgress + (target - anim.fromProgress) * easing(t);
}

/**
 * Find door candidate locations — one per corridor-to-room opening, centered
 * on the opening's median threshold cell.
 *
 * Identification convention (caller must match this):
 * - Corridor cell: solid=0 AND regionId=0
 * - Room cell:     solid=0 AND regionId≠0
 *
 * Pass the pre-assignment regionId data where corridors still have value 0.
 * After `generateBspDungeon` the regionId texture has unique non-zero IDs for
 * corridors (baked by `assignCorridorRegions`), so it cannot be used directly here.
 *
 * Grouping: threshold cells (corridor cells adjacent to a room cell) are grouped
 * by their corridor axis and fixed coordinate, so each opening (a contiguous run
 * of threshold cells along one wall) becomes a single candidate. The door is placed
 * at the median cell of each group.
 *
 * `yaw` is 0 for doors facing Z (dx=0) and π/2 for doors facing X.
 */
export function findDoorCandidates(
  regionIdData: Uint8Array,
  solidData: Uint8Array,
  W: number,
  H: number,
): DoorCandidate[] {
  function isCorridor(x: number, z: number): boolean {
    if (x < 0 || z < 0 || x >= W || z >= H) return false;
    const i = z * W + x;
    return solidData[i] === 0 && regionIdData[i] === 0;
  }

  function isRoom(x: number, z: number): boolean {
    if (x < 0 || z < 0 || x >= W || z >= H) return false;
    const i = z * W + x;
    return solidData[i] === 0 && (regionIdData[i] ?? 0) !== 0;
  }

  const DIRS4: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  // Group threshold cells (corridor cells adjacent to a room cell) by opening.
  // Key: "{dx}_{dz}_{fixed}" where fixed is the coordinate along the opening line.
  const groups = new Map<
    string,
    { x: number; z: number; dx: number; dz: number; roomId: number }[]
  >();

  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (!isCorridor(x, z)) continue;
      for (const [dx, dz] of DIRS4) {
        if (isRoom(x + dx, z + dz)) {
          // dx===0 means travel is vertical; fixed coord is z (the row).
          // dx!==0 means travel is horizontal; fixed coord is x (the column).
          const key = `${dx}_${dz}_${dx === 0 ? z : x}`;
          if (!groups.has(key)) groups.set(key, []);
          const adjRoomId = regionIdData[(z + dz) * W + (x + dx)] ?? 0;
          groups.get(key)!.push({ x, z, dx, dz, roomId: adjRoomId });
          break;
        }
      }
    }
  }

  const candidates: DoorCandidate[] = [];

  for (const cells of groups.values()) {
    if (cells.length === 0) continue;
    const first = cells[0]!;
    const { dx, dz } = first;
    // Sort along the axis perpendicular to travel so the median gives the centre.
    cells.sort((a, b) => (dx === 0 ? a.x - b.x : a.z - b.z));
    const midIdx = Math.floor(cells.length / 2);
    const mid = cells[midIdx]!;

    candidates.push({
      x: mid.x,
      z: mid.z,
      dx,
      dz,
      yaw: dx === 0 ? 0 : Math.PI / 2,
      roomId: mid.roomId,
      groupCells: cells.map((c) => ({ x: c.x, z: c.z })),
      midIdx,
    });
  }

  return candidates;
}

/**
 * Narrow a door opening to exactly one cell (the median) by walling off the
 * surrounding cells.
 *
 * Two kinds of cells are walled (solid set to 1, colliderFlags set to IS_BLOCKED):
 * 1. All cells in `candidate.groupCells` except the median at `midIdx`.
 * 2. The two corridor cells flanking the door perpendicularly — i.e., the cells at
 *    (doorX ± dz, doorZ ∓ dx) — if they are floor corridor cells (solid=0, regionId=0).
 *    This prevents diagonal walk-through at the door frame.
 *
 * Modifies `solidData`, `colliderFlagsData`, and `regionIdData` in-place.
 * The caller must set `needsUpdate = true` on the corresponding textures.
 */
export function wallOffDoorGroup(
  candidate: DoorCandidate,
  solidData: Uint8Array,
  colliderFlagsData: Uint8Array,
  regionIdData: Uint8Array,
  W: number,
  H: number,
): void {
  const { x: doorX, z: doorZ, dx, dz, groupCells, midIdx } = candidate;

  // Wall off the non-door cells in the opening group.
  for (let i = 0; i < groupCells.length; i++) {
    if (i === midIdx) continue;
    const cell = groupCells[i]!;
    const idx = cell.z * W + cell.x;
    solidData[idx] = 1;
    colliderFlagsData[idx] = IS_BLOCKED;
  }


  // Wall off the two flanking corridor cells perpendicular to the door direction.
  // Perpendicular offsets from (dx, dz) are (-dz, dx) and (dz, -dx).
  for (const [fx, fz] of [
    [doorX - dz, doorZ + dx],
    [doorX + dz, doorZ - dx],
  ] as [number, number][]) {
    if (fx < 0 || fz < 0 || fx >= W || fz >= H) continue;
    const fi = fz * W + fx;
    if (solidData[fi] === 0 && (regionIdData[fi] ?? 0) === 0) {
      solidData[fi] = 1;
      colliderFlagsData[fi] = IS_BLOCKED;
    }
  }
}
