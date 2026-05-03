// Cellular-automata cave dungeon generator.
// Produces irregular, organic floor regions well-suited for cave/ruin themes.
// Output shares the same DungeonOutputs texture layout as BspDungeonOutputs,
// so it works directly with generateContent, aStar8, computeFov, etc.

import * as THREE from "three";
import type { DungeonOutputs, RoomedDungeonOutputs, RoomInfo } from "./bsp";
import { buildColliderFlags } from "./colliderFlags";

export type { DungeonOutputs, RoomedDungeonOutputs };

// --------------------------------
// Types
// --------------------------------

export type CellularOptions = {
  width: number;
  height: number;
  seed?: number | string;

  /** Initial wall fill probability. Default: 0.45 */
  fillProbability?: number;
  /** Number of smoothing passes. Default: 5 */
  iterations?: number;
  /**
   * A cell becomes wall if it has >= this many wall neighbours (Moore neighbourhood).
   * Default: 5
   */
  birthThreshold?: number;
  /**
   * A wall cell survives if it has >= this many wall neighbours. Default: 4
   */
  survivalThreshold?: number;

  keepOuterWalls?: boolean;

  /**
   * Raise the ceiling toward room centers, producing a vaulted cave effect.
   * Uses `distanceToWall` (normalized) plus Perlin noise for organic variation.
   * Default: true
   */
  vaultedCeiling?: boolean;
  /**
   * Maximum ceiling raise (in offset steps) at the deepest room center.
   * One step = mapCellGeometrySize * offsetFactor (default: tileSize * 0.5).
   * Default: 3
   */
  vaultMaxSteps?: number;
  /**
   * Perlin noise spatial frequency (cycles per cell) for ceiling perturbation.
   * Lower values give broader, smoother waves; higher values give tighter bumps.
   * Default: 0.08
   */
  noiseFrequency?: number;
  /**
   * Amplitude of the Perlin noise ceiling perturbation in offset steps.
   * This is added to (or subtracted from) the vault raise before rounding.
   * Default: 2
   */
  noiseSteps?: number;
  /**
   * Overall multiplier applied to the combined ceiling raise (DTW + noise).
   * Values > 1 produce taller vaults; values < 1 produce lower, flatter ceilings.
   * Default: 1
   */
  vaultHeightScale?: number;
  /**
   * Weight of the distance-to-wall term in the ceiling raise formula.
   * 0 = no DTW contribution (ceiling height comes entirely from Perlin noise);
   * 1 = full DTW contribution. Both this and `noiseWeight` at 0 → flat ceiling.
   * Default: 1
   */
  distanceToWallWeight?: number;
  /**
   * Weight of the Perlin noise term in the ceiling raise formula.
   * 0 = no noise contribution (ceiling height comes entirely from distance-to-wall);
   * 1 = full noise contribution. Both this and `distanceToWallWeight` at 0 → flat ceiling.
   * Default: 1
   */
  noiseWeight?: number;
};

export type CellularDungeonOutputs = RoomedDungeonOutputs & {
  textures: {
    solid: THREE.DataTexture;
    /**
     * Voronoi region ID per cell — 0 = wall, 1..N = room IDs assigned by the
     * local-maxima Voronoi decomposition of the distanceToWall field.
     * Matches startRoomId / endRoomId and the keys in `rooms`.
     */
    regionId: THREE.DataTexture;
    distanceToWall: THREE.DataTexture;
    hazards: THREE.DataTexture;
    /** Per-cell temperature, 0 = coldest, 255 = hottest. Default: 127 for all floor cells. */
    temperature: THREE.DataTexture;
    floorType: THREE.DataTexture;
    overlays: THREE.DataTexture;
    wallType: THREE.DataTexture;
    wallOverlays: THREE.DataTexture;
    ceilingType: THREE.DataTexture;
    ceilingOverlays: THREE.DataTexture;
    /**
     * Per-cell ceiling height offset (R8). Encoding: 128 = no offset, 127 = +1 step up
     * (ceiling raised), 129 = +1 step down (ceiling lowered), 0 = open sky.
     * When `vaultedCeiling` is enabled, values are derived from `distanceToWall`
     * (weighted by `distanceToWallWeight`, scaled to `vaultMaxSteps`) combined with
     * Perlin noise (weighted by `noiseWeight`, amplitude `noiseSteps`), then scaled
     * by `vaultHeightScale`. Setting both weights to 0 produces a flat ceiling.
     */
    ceilingHeightOffset: THREE.DataTexture;
    colliderFlags: THREE.DataTexture;
    floorSkirtType: THREE.DataTexture;
    ceilSkirtType: THREE.DataTexture;
  };
};

// --------------------------------
// RNG (seeded mulberry32)
// --------------------------------

/**
 * Convert a seed to a 32-bit unsigned integer for use with mulberry32.
 * Strings are hashed with FNV-1a (32-bit). Numbers are used directly.
 * `undefined` or `0` falls back to 0x12345678.
 */
function hashSeed(seed: number | string | undefined): number {
  if (seed === undefined) return 0x12345678;
  if (typeof seed === "number") return seed >>> 0 || 0x12345678;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Create a mulberry32 PRNG from a 32-bit seed.
 * Returns a bare `() => number` closure yielding floats uniformly in [0, 1).
 */
function makeRng(seedU32: number) {
  let t = seedU32 >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded 2D Perlin noise using a Fisher-Yates shuffled permutation table.
 * Returns a closure `(x, y) => number` with output approximately in [-0.7, 0.7].
 * The permutation table is derived from the given 32-bit seed via `makeRng`.
 */
function makePerlin2D(seed: number): (x: number, y: number) => number {
  const rng = makeRng(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = p[i]!; p[i] = p[j]!; p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!;

  function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a: number, b: number, t: number) { return a + t * (b - a); }
  function grad(h: number, x: number, y: number): number {
    return ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  }

  return function(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[xi]!     + yi    ]!;
    const ab = perm[perm[xi]!     + yi + 1]!;
    const ba = perm[perm[xi + 1]! + yi    ]!;
    const bb = perm[perm[xi + 1]! + yi + 1]!;
    return lerp(
      lerp(grad(aa, xf,     yf    ), grad(ba, xf - 1, yf    ), u),
      lerp(grad(ab, xf,     yf - 1), grad(bb, xf - 1, yf - 1), u),
      v,
    );
  };
}

// --------------------------------
// Helpers
// --------------------------------

function idx(x: number, y: number, W: number): number {
  return y * W + x;
}

/**
 * Count wall neighbours of cell (x, y) in the Moore (8-direction) neighbourhood.
 * Out-of-bounds positions are treated as walls, so the outer border of the grid
 * always appears fully walled during cellular-automata smoothing passes.
 */
function countWallNeighbours(solid: Uint8Array, x: number, y: number, W: number, H: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || solid[idx(nx, ny, W)] !== 0) {
        count++;
      }
    }
  }
  return count;
}

/**
 * 4-connected BFS flood fill starting from cell index `startIdx`.
 * Expands into neighbouring floor cells (solid=0) that have not yet been visited.
 * Marks each visited cell in `visited` (caller-supplied Uint8Array) to prevent re-entry.
 * Returns the flat indices of all cells in the connected component.
 */
function floodFill(
  solid: Uint8Array,
  W: number,
  H: number,
  startIdx: number,
  visited: Uint8Array,
): number[] {
  const region: number[] = [];
  const queue: number[] = [startIdx];
  visited[startIdx] = 1;

  let head = 0;
  while (head < queue.length) {
    const i = queue[head++]!;
    region.push(i);
    const x = i % W;
    const y = (i / W) | 0;

    const neighbours = [
      x - 1 >= 0 ? idx(x - 1, y, W) : -1,
      x + 1 < W  ? idx(x + 1, y, W) : -1,
      y - 1 >= 0 ? idx(x, y - 1, W) : -1,
      y + 1 < H  ? idx(x, y + 1, W) : -1,
    ];
    for (const ni of neighbours) {
      if (ni !== -1 && !visited[ni] && solid[ni] === 0) {
        visited[ni] = 1;
        queue.push(ni);
      }
    }
  }

  return region;
}

/**
 * Multi-source BFS from all wall cells (solid !== 0).
 * Each floor cell receives the Manhattan distance to its nearest wall.
 * Values are clamped to [0, 255] and returned as a Uint8Array (same length as `solid`).
 */
function computeDistanceToWall(solid: Uint8Array, W: number, H: number): Uint8Array {
  const dist = new Uint16Array(W * H).fill(0xffff);
  const queue = new Int32Array(W * H);
  let qh = 0;
  let qt = 0;

  for (let i = 0; i < W * H; i++) {
    if (solid[i] !== 0) {
      dist[i] = 0;
      queue[qt++] = i;
    }
  }

  const DX = [1, -1, 0, 0];
  const DY = [0, 0, 1, -1];

  while (qh < qt) {
    const i = queue[qh++]!;
    const x = i % W;
    const y = (i / W) | 0;
    const next = dist[i]! + 1;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]!;
      const ny = y + DY[d]!;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = idx(nx, ny, W);
      if (next < dist[ni]!) {
        dist[ni] = next;
        queue[qt++] = ni;
      }
    }
  }

  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const d = dist[i]!;
    out[i] = d === 0xffff ? 255 : d > 255 ? 255 : d;
  }
  return out;
}

/**
 * Wrap a Uint8Array as an R8 THREE.DataTexture (one byte per texel).
 * Shares the buffer with `mask`; set `tex.needsUpdate = true` after mutations.
 * NearestFilter, ClampToEdge, no mipmaps, no color-space conversion, flipY=false.
 */
function maskToDataTextureR8(mask: Uint8Array, W: number, H: number, name: string): THREE.DataTexture {
  const tex = new THREE.DataTexture(mask, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  tex.name = name;
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  return tex;
}

/**
 * Wrap a Uint8Array as an RGBA8 THREE.DataTexture (4 bytes per texel).
 * Shares the buffer with `mask`; set `tex.needsUpdate = true` after mutations.
 * NearestFilter, ClampToEdge, no mipmaps, no color-space conversion, flipY=false.
 */
function maskToDataTextureRGBA(mask: Uint8Array, W: number, H: number, name: string): THREE.DataTexture {
  const tex = new THREE.DataTexture(mask, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.name = name;
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  return tex;
}

// --------------------------------
// Room graph helpers
// --------------------------------

/**
 * Assign Voronoi room IDs by multi-source BFS seeded from strict local maxima of
 * the `distanceToWall` field.
 *
 * Seed selection: a floor cell is a seed if its `distanceToWall` value strictly exceeds
 * all four 4-connected neighbours AND is ≥ MIN_SEED_DIST (2). If no seeds pass that
 * threshold, the single cell with the highest `distanceToWall` is used as a fallback.
 * Room count is capped at 254 to keep region IDs within an R8 texture (0=wall, 1..254=room).
 *
 * Voronoi expansion: all seeds are enqueued simultaneously and BFS claims each unvisited
 * floor cell for the seed that reaches it first, producing contiguous Voronoi regions.
 * Because the cellular dungeon has no explicit corridors, `firstCorridorRegionId = N + 1`
 * and no corridor entries are added to the `rooms` map.
 *
 * Bounding rects and the adjacency graph (two regions are adjacent if they share a border
 * cell) are computed in a single scan pass after expansion.
 * `startRoomId` / `endRoomId` are then chosen via `pickStartEndRooms`.
 */
function buildVoronoiRooms(
  solid: Uint8Array,
  dtw: Uint8Array,
  W: number,
  H: number,
): {
  regionIdArr: Uint8Array;
  rooms: Map<number, RoomInfo>;
  firstCorridorRegionId: number;
  startRoomId: number;
  endRoomId: number;
} {
  const MIN_SEED_DIST = 2;
  const DX = [1, -1, 0, 0];
  const DY = [0, 0, 1, -1];

  // Collect strict 4-connected local maxima above the threshold
  const seeds: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y, W);
      if (solid[i] !== 0) continue;
      const d = dtw[i]!;
      if (d < MIN_SEED_DIST) continue;
      if (
        d > (x > 0     ? dtw[idx(x - 1, y, W)]! : 0) &&
        d > (x < W - 1 ? dtw[idx(x + 1, y, W)]! : 0) &&
        d > (y > 0     ? dtw[idx(x, y - 1, W)]! : 0) &&
        d > (y < H - 1 ? dtw[idx(x, y + 1, W)]! : 0)
      ) {
        seeds.push(i);
      }
    }
  }

  // Fallback: use the single cell with the highest distanceToWall
  if (seeds.length === 0) {
    let bestIdx = -1, bestDist = -1;
    for (let i = 0; i < W * H; i++) {
      if (solid[i] === 0 && dtw[i]! > bestDist) { bestDist = dtw[i]!; bestIdx = i; }
    }
    if (bestIdx >= 0) seeds.push(bestIdx);
  }

  // regionId is R8 — cap at 254 rooms (0 = wall, 1..254 = rooms)
  if (seeds.length > 254) seeds.length = 254;

  const N = seeds.length;

  // Multi-source BFS (Voronoi expansion)
  const regionIdArr = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let qh = 0, qt = 0;
  for (let s = 0; s < N; s++) {
    const si = seeds[s]!;
    regionIdArr[si] = s + 1;
    queue[qt++] = si;
  }
  while (qh < qt) {
    const i = queue[qh++]!;
    const x = i % W, y = (i / W) | 0;
    const rid = regionIdArr[i]!;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]!, ny = y + DY[d]!;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = idx(nx, ny, W);
      if (solid[ni] !== 0 || regionIdArr[ni] !== 0) continue;
      regionIdArr[ni] = rid;
      queue[qt++] = ni;
    }
  }

  // Compute bounding rects and adjacency in one pass
  const minX = new Int32Array(N + 1).fill(W);
  const minY = new Int32Array(N + 1).fill(H);
  const maxX = new Int32Array(N + 1).fill(-1);
  const maxY = new Int32Array(N + 1).fill(-1);
  const adj = new Map<number, Set<number>>();
  for (let i = 1; i <= N; i++) adj.set(i, new Set());

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y, W);
      const rid = regionIdArr[i] ?? 0;
      if (rid === 0) continue;
      if (x < (minX[rid] ?? W))  minX[rid] = x;
      if (x > (maxX[rid] ?? -1)) maxX[rid] = x;
      if (y < (minY[rid] ?? H))  minY[rid] = y;
      if (y > (maxY[rid] ?? -1)) maxY[rid] = y;
      if (x + 1 < W) {
        const nr = regionIdArr[idx(x + 1, y, W)] ?? 0;
        if (nr !== 0 && nr !== rid) { adj.get(rid)!.add(nr); adj.get(nr)!.add(rid); }
      }
      if (y + 1 < H) {
        const nr = regionIdArr[idx(x, y + 1, W)] ?? 0;
        if (nr !== 0 && nr !== rid) { adj.get(rid)!.add(nr); adj.get(nr)!.add(rid); }
      }
    }
  }

  const rooms = new Map<number, RoomInfo>();
  for (let i = 1; i <= N; i++) {
    const rx = minX[i] ?? 0, ry = minY[i] ?? 0;
    const rw = (maxX[i] ?? rx) - rx + 1, rh = (maxY[i] ?? ry) - ry + 1;
    rooms.set(i, {
      id: i,
      type: "room",
      rect: { x: rx, y: ry, w: rw, h: rh },
      connections: [...(adj.get(i) ?? [])],
    });
  }

  const { startRoomId, endRoomId } = pickStartEndRooms(adj);
  return { regionIdArr, rooms, firstCorridorRegionId: N + 1, startRoomId, endRoomId };
}

/**
 * Choose start and end room IDs from a room adjacency graph so they are maximally
 * far apart, preferring dead-end rooms (degree = 1).
 *
 * Algorithm (identical to BSP):
 * 1. Collect dead-end candidates (degree = 1); fall back to all rooms if none exist.
 * 2. BFS-furthest from every candidate; the one yielding the longest path becomes `endRoomId`.
 * 3. BFS-furthest from `endRoomId` gives `startRoomId`.
 */
function pickStartEndRooms(adjacency: Map<number, Set<number>>): { startRoomId: number; endRoomId: number } {
  const allRooms = Array.from(adjacency.keys());
  if (allRooms.length === 0) return { startRoomId: 1, endRoomId: 1 };
  if (allRooms.length === 1) return { startRoomId: allRooms[0]!, endRoomId: allRooms[0]! };

  const deadEnds = allRooms.filter(id => (adjacency.get(id)?.size ?? 0) === 1);
  const candidates = deadEnds.length > 0 ? deadEnds : allRooms;

  function bfsFurthest(startId: number): { id: number; dist: number } {
    const dist = new Map<number, number>();
    dist.set(startId, 0);
    const q = [startId];
    let head = 0, furthestId = startId, furthestDist = 0;
    while (head < q.length) {
      const cur = q[head++]!;
      const d = dist.get(cur)!;
      for (const nb of adjacency.get(cur) ?? []) {
        if (!dist.has(nb)) {
          dist.set(nb, d + 1);
          q.push(nb);
          if (d + 1 > furthestDist) { furthestDist = d + 1; furthestId = nb; }
        }
      }
    }
    return { id: furthestId, dist: furthestDist };
  }

  let endRoomId = candidates[0]!;
  let bestDist = -1;
  for (const cand of candidates) {
    const { dist: d } = bfsFurthest(cand);
    if (d > bestDist) { bestDist = d; endRoomId = cand; }
  }
  const { id: startRoomId } = bfsFurthest(endRoomId);
  return { startRoomId, endRoomId };
}

// --------------------------------
// Public generator
// --------------------------------

/**
 * Generate a cellular-automata cave dungeon and return the full texture set.
 *
 * Pipeline:
 * 1. Seed the mulberry32 PRNG from `options.seed` (FNV-1a for strings).
 * 2. Fill the grid randomly: each interior cell becomes wall with probability `fillProbability`.
 *    Outer border is always wall when `keepOuterWalls` is true.
 * 3. Smooth `iterations` times using Moore-neighbourhood rules:
 *    - Floor cell: becomes wall if wall-neighbour count ≥ `birthThreshold`.
 *    - Wall cell: stays wall if wall-neighbour count ≥ `survivalThreshold`; otherwise → floor.
 * 4. Identify all 4-connected floor regions via flood fill; keep only the largest and
 *    re-solidify all others (eliminates disconnected pockets).
 * 5. Compute `distanceToWall` (multi-source BFS from all wall cells), then derive Voronoi
 *    room IDs from its strict 4-connected local maxima (`buildVoronoiRooms`).
 *    `startRoomId` / `endRoomId` are chosen via double-BFS on the room adjacency graph.
 *
 * Output is compatible with `generateContent`, `aStar8`, `computeFov`, and all rendering
 * APIs. Unlike BSP, corridor entries are not added to `rooms`; `firstCorridorRegionId = N + 1`.
 * @throws if width or height ≤ 2.
 */
export function generateCellularDungeon(options: CellularOptions): CellularDungeonOutputs {
  const W = options.width;
  const H = options.height;

  if (W <= 2 || H <= 2) throw new Error("generateCellularDungeon: width/height must be > 2");

  const fillProbability   = options.fillProbability   ?? 0.45;
  const iterations        = options.iterations        ?? 5;
  const birthThreshold    = options.birthThreshold    ?? 5;
  const survivalThreshold = options.survivalThreshold ?? 4;
  const keepOuterWalls    = options.keepOuterWalls    ?? true;
  const vaultedCeiling      = options.vaultedCeiling      ?? true;
  const vaultMaxSteps       = options.vaultMaxSteps       ?? 3;
  const noiseFrequency      = options.noiseFrequency      ?? 0.08;
  const noiseSteps          = options.noiseSteps          ?? 2;
  const vaultHeightScale    = options.vaultHeightScale    ?? 1;
  const distanceToWallWeight = options.distanceToWallWeight ?? 1;
  const noiseWeight          = options.noiseWeight          ?? 1;

  const seedU32 = hashSeed(options.seed);
  const rand = makeRng(seedU32);

  // Step 1: initialise with random walls
  let solid = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (keepOuterWalls && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) {
        solid[idx(x, y, W)] = 255;
      } else {
        solid[idx(x, y, W)] = rand() < fillProbability ? 255 : 0;
      }
    }
  }

  // Step 2: smooth with cellular automata rules
  const next = new Uint8Array(W * H);
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (keepOuterWalls && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) {
          next[idx(x, y, W)] = 255;
          continue;
        }
        const walls = countWallNeighbours(solid, x, y, W, H);
        const isWall = solid[idx(x, y, W)] !== 0;
        next[idx(x, y, W)] = isWall
          ? (walls >= survivalThreshold ? 255 : 0)
          : (walls >= birthThreshold   ? 255 : 0);
      }
    }
    solid.set(next);
  }

  // Step 3: find all connected floor regions via flood fill
  const visited = new Uint8Array(W * H);
  let largestRegion: number[] = [];

  for (let i = 0; i < W * H; i++) {
    if (solid[i] === 0 && !visited[i]) {
      const region = floodFill(solid, W, H, i, visited);
      if (region.length > largestRegion.length) {
        largestRegion = region;
      }
    }
  }

  // Step 4: re-solidify all cells not in the largest region
  solid.fill(255);
  for (const i of largestRegion) {
    solid[i] = 0;
  }

  // Step 5: compute distanceToWall, then derive Voronoi room IDs from its local maxima
  const distanceToWall = computeDistanceToWall(solid, W, H);
  const { regionIdArr, rooms, firstCorridorRegionId, startRoomId, endRoomId } =
    buildVoronoiRooms(solid, distanceToWall, W, H);

  // Vaulted ceiling: raise ceiling proportional to distanceToWall, perturbed by Perlin noise.
  // Encoding: 128 = no offset; value < 128 raises the ceiling (128 - n = n steps up).
  const ceilingHeightOffsetArr = new Uint8Array(W * H);
  ceilingHeightOffsetArr.fill(128);
  if (vaultedCeiling) {
    let maxDtw = 0;
    for (let i = 0; i < W * H; i++) {
      if (solid[i] === 0 && distanceToWall[i]! > maxDtw) maxDtw = distanceToWall[i]!;
    }
    if (maxDtw > 0) {
      const perlin = makePerlin2D(seedU32 ^ 0xdeadbeef);
      for (let cy = 0; cy < H; cy++) {
        for (let cx = 0; cx < W; cx++) {
          const i = idx(cx, cy, W);
          if (solid[i] !== 0) continue;
          const normalizedDtw = distanceToWall[i]! / maxDtw;
          const noise = perlin(cx * noiseFrequency, cy * noiseFrequency);
          const raise = Math.max(0, vaultHeightScale * (
            normalizedDtw * vaultMaxSteps * distanceToWallWeight +
            noise * noiseSteps * noiseWeight
          ));
          // 0 = open sky sentinel; keep minimum raw value at 2 to avoid that
          ceilingHeightOffsetArr[i] = Math.max(2, Math.min(128, 128 - Math.round(raise)));
        }
      }
    }
  }

  const hazards = new Uint8Array(W * H);
  const colliderFlagsArr = buildColliderFlags(solid);
  const temperature = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (solid[i] === 0) temperature[i] = 127;
  }
  const floorType = new Uint8Array(W * H);
  const wallType = new Uint8Array(W * H);
  const overlays = new Uint8Array(4 * W * H);
  const wallOverlays = new Uint8Array(4 * W * H);
  const ceilingType = new Uint8Array(W * H);
  const ceilingOverlays = new Uint8Array(4 * W * H);
  const floorSkirtType = new Uint8Array(4 * W * H);
  const ceilSkirtType = new Uint8Array(4 * W * H);

  for (let i = 0; i < W * H; i++) {
    if (solid[i] === 0) ceilingType[i] = 1; // default ceiling type id 1
  }

  return {
    width: W,
    height: H,
    seed: seedU32,
    startRoomId,
    endRoomId,
    rooms,
    fullRegionIds: regionIdArr,
    firstCorridorRegionId,
    textures: {
      solid:           maskToDataTextureR8(solid,           W, H, "cellular_solid"),
      regionId:        maskToDataTextureR8(regionIdArr,     W, H, "cellular_region_id"),
      distanceToWall:  maskToDataTextureR8(distanceToWall,  W, H, "cellular_distance_to_wall"),
      hazards:         maskToDataTextureR8(hazards,         W, H, "cellular_hazards"),
      temperature:     maskToDataTextureR8(temperature,     W, H, "cellular_temperature"),
      floorType:       maskToDataTextureR8(floorType,       W, H, "cellular_floor_type"),
      overlays:        maskToDataTextureRGBA(overlays,      W, H, "cellular_overlays"),
      wallType:        maskToDataTextureR8(wallType,        W, H, "cellular_wall_type"),
      wallOverlays:    maskToDataTextureRGBA(wallOverlays,  W, H, "cellular_wall_overlays"),
      ceilingType:          maskToDataTextureR8(ceilingType,           W, H, "cellular_ceiling_type"),
      ceilingOverlays:      maskToDataTextureRGBA(ceilingOverlays,     W, H, "cellular_ceiling_overlays"),
      ceilingHeightOffset:  maskToDataTextureR8(ceilingHeightOffsetArr, W, H, "cellular_ceiling_height_offset"),
      colliderFlags:        maskToDataTextureR8(colliderFlagsArr,       W, H, "cellular_collider_flags"),
      floorSkirtType:  maskToDataTextureRGBA(floorSkirtType, W, H, "cellular_floor_skirt_type"),
      ceilSkirtType:   maskToDataTextureRGBA(ceilSkirtType,  W, H, "cellular_ceil_skirt_type"),
      skyPanelCount:   maskToDataTextureR8(new Uint8Array(W * H), W, H, "cellular_sky_panel_count"),
      ceilingPanelCount: maskToDataTextureR8(new Uint8Array(W * H), W, H, "cellular_ceiling_panel_count"),
    },
  };
}
