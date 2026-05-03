import * as THREE from "three";
import { buildColliderFlags } from "./colliderFlags";

// -----------------------------
// Types
// -----------------------------

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

/** Minimum shape required by generateContent, aStar8, computeFov, and generateCellularDungeon. */
export type DungeonOutputs = {
  width: number;
  height: number;
  seed: number;
  textures: {
    solid: THREE.DataTexture;
    regionId: THREE.DataTexture;
    distanceToWall: THREE.DataTexture;
    hazards: THREE.DataTexture;
    /** Per-cell temperature, 0 = coldest, 255 = hottest. Default: 127 for all floor cells. */
    temperature: THREE.DataTexture;
    /**
     * Per-cell floor type index (R8). Value matches the `id` field in atlas.json `floorTypes`.
     * 0 = wall/no floor. Corridors inherit the floor type of the nearest room.
     */
    floorType: THREE.DataTexture;
    /**
     * Per-cell overlay bit-flags for floor cells (RGBA). Each channel stores 8 overlay slots as individual bits.
     * R = overlay IDs 1–8, G = 9–16, B = 17–24, A = 25–32.
     * IDs correspond to the `id` field in atlas.json `overlays`. All zeros by default.
     */
    overlays: THREE.DataTexture;
    /**
     * Per-cell wall type index (R8). Value matches the `id` field in atlas.json `wallTypes`.
     * 0 = floor/no wall. Wall cells inherit the type of the nearest floor cell.
     */
    wallType: THREE.DataTexture;
    /**
     * Per-cell overlay bit-flags for wall cells (RGBA). Same encoding as `overlays`.
     * IDs correspond to the `id` field in atlas.json `wallOverlays`. All zeros by default.
     */
    wallOverlays: THREE.DataTexture;
    /**
     * Per-cell ceiling type index (R8). Value matches the `id` field in atlas.json `ceilingTypes`.
     * 0 = no ceiling type assigned. Floor cells default to 1 (Cobblestone).
     */
    ceilingType: THREE.DataTexture;
    /**
     * Per-cell overlay bit-flags for ceiling cells (RGBA). Same encoding as `overlays`.
     * IDs correspond to the `id` field in atlas.json `ceilingOverlays`. All zeros by default.
     */
    ceilingOverlays: THREE.DataTexture;
    /**
     * Per-cell floor height offset (R8). Encoding: 128 = no offset, 129 = +1 step up,
     * 127 = -1 step down, 0 = pit (floor tile omitted entirely).
     * One step = mapCellGeometrySize * offsetFactor (default: tileSize * 0.5).
     * All floor cells default to 128. Wall cells are 128.
     * Not present for cellular/tiled dungeon outputs.
     */
    floorHeightOffset?: THREE.DataTexture;
    /**
     * Per-cell ceiling height offset (R8). Encoding is inverted relative to floor:
     * 128 = no offset, 127 = +1 step up (ceiling raised), 129 = +1 step down (ceiling lowered),
     * 0 = open sky (ceiling tile omitted entirely; a thin rim skirt of one offsetStep is
     * rendered at the hole edges instead). Symmetric with floor pits (also 0) — both
     * sentinels use the minimum raw value because the encodings run in opposite directions.
     * One step = mapCellGeometrySize * offsetFactor (default: tileSize * 0.5).
     * All floor cells default to 128. Wall cells are 128.
     * Present in cellular outputs (vaulted ceiling via distanceToWall + Perlin noise).
     * Not present for tiled dungeon outputs.
     */
    ceilingHeightOffset?: THREE.DataTexture;
    /**
     * Per-cell collision and LOS flags (R8). Bitwise combination of:
     * - IS_WALKABLE (0x01): normal movement permitted
     * - IS_BLOCKED  (0x02): no entity may enter by any means
     * - IS_LIGHT_PASSABLE (0x04): LOS/light rays pass through
     * Default values are derived from the `solid` texture.
     */
    colliderFlags: THREE.DataTexture;
    /**
     * Per-cell floor skirt overlay slots (RGBA). Same encoding as `overlays`:
     * R = slot 1, G = slot 2, B = slot 3, A = slot 4. Value 0 = empty slot.
     * All non-zero slots are composited on top of the skirt base tile in the fragment shader.
     */
    floorSkirtType: THREE.DataTexture;
    /**
     * Per-cell ceiling skirt overlay slots (RGBA). Same encoding as `ceilingOverlays`:
     * R = slot 1, G = slot 2, B = slot 3, A = slot 4. Value 0 = empty slot.
     * All non-zero slots are composited on top of the skirt base tile in the fragment shader.
     */
    ceilSkirtType: THREE.DataTexture;
    /**
     * Per-cell sky panel count (R8). Value = number of upward-facing vertical panels
     * to emit above the wall for this cell (0–4). Use setSkyPanelCount() to write.
     * Intended for open-sky cells (ceilingHeightOffset === 0); panels appear on all
     * wall faces (adjacent to solid neighbours) going upward from y = ceilingHeight.
     */
    skyPanelCount?: THREE.DataTexture;
    /**
     * Per-cell ceiling panel count (R8). Value = number of downward-facing vertical
     * panels to emit below the ceiling for this cell (0–4). Use setCeilingPanelCount().
     * Panels appear on all wall faces (adjacent to solid neighbours) hanging down
     * from y = ceilingHeight.
     */
    ceilingPanelCount?: THREE.DataTexture;
  };
};

export type RoomRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RoomInfo = {
  id: number;
  /** Whether this entry represents a carved room or a corridor segment. */
  type: "room" | "corridor";
  /** Bounding rect of the room (carved area) or tight bounding box of the corridor cells. */
  rect: RoomRect;
  /**
   * For rooms: IDs of rooms connected via a corridor.
   * For corridors: IDs of the rooms this corridor segment touches.
   */
  connections: number[];
};

export type BspDungeonOptions = {
  width: number;
  height: number;

  seed?: number | string;

  maxDepth?: number;
  minLeafSize?: number;
  maxLeafSize?: number;
  splitPadding?: number;

  roomPadding?: number;
  minRoomSize?: number;
  maxRoomSize?: number;
  roomFillLeafChance?: number;

  corridorWidth?: number;
  corridorStyle?: "straight-or-z";

  keepOuterWalls?: boolean;
};

/**
 * Shared output fields for any dungeon type that has a room graph.
 * Both BSP and cellular dungeons produce this structure.
 */
export type RoomedDungeonOutputs = DungeonOutputs & {
  /** Room ID (matches regionId texture values) chosen as the dungeon exit. */
  endRoomId: number;
  /** Room ID furthest from endRoomId — used as the default player spawn room. */
  startRoomId: number;
  /**
   * Map from regionId → RoomInfo for every room (and corridor segment for BSP).
   * Room entries have `type: "room"` and IDs matching textures.regionId values (1+).
   * Corridor entries have `type: "corridor"` and IDs starting at `firstCorridorRegionId`.
   * startRoomId and endRoomId are guaranteed keys.
   */
  rooms: Map<number, RoomInfo>;
  /**
   * Region-id array with unique IDs for every cell: room cells keep their
   * original IDs (1..maxRoomId), corridor cells have IDs starting at
   * `firstCorridorRegionId`, wall cells are 0.
   * Identical in content to `textures.regionId`.
   */
  fullRegionIds: Uint8Array;
  /** Lowest regionId assigned to a corridor segment. For cellular dungeons, equals numRooms + 1 (no corridor entries). */
  firstCorridorRegionId: number;
};

/** BSP-generated dungeon outputs. Identical shape to RoomedDungeonOutputs. */
export type BspDungeonOutputs = RoomedDungeonOutputs;

// -----------------------------
// RNG (seeded)
// -----------------------------

/**
 * Convert a seed value to a 32-bit unsigned integer for use with mulberry32.
 * Strings are hashed with FNV-1a (32-bit): XOR each char code into a running hash,
 * then multiply by the FNV prime 0x01000193. Numbers are used directly (0 falls back
 * to 0x12345678). `undefined` also falls back to 0x12345678.
 */
function hashSeedToUint32(seed: number | string | undefined): number {
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
 * Mulberry32 — a fast, high-quality 32-bit PRNG.
 * Returns a closure that yields uniformly distributed floats in [0, 1).
 * State is a single 32-bit integer advanced each call by the Weyl constant 0x6d2b79f5,
 * then mixed through a series of multiply-and-shift rounds.
 */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

type RNG = {
  next(): number;
  int(minIncl: number, maxIncl: number): number;
  chance(p: number): boolean;
};

/**
 * Wrap a mulberry32 seed into a convenience RNG object with:
 * - `next()` — float in [0, 1)
 * - `int(min, max)` — inclusive integer in [min, max]; arguments are clamped so min ≤ max
 * - `chance(p)` — true with probability p
 */
function makeRng(seedU32: number): RNG {
  const r = mulberry32(seedU32);
  return {
    next: () => r(),
    int: (minIncl, maxIncl) => {
      const lo = Math.min(minIncl, maxIncl);
      const hi = Math.max(minIncl, maxIncl);
      return lo + Math.floor(r() * (hi - lo + 1));
    },
    chance: (p) => r() < p,
  };
}

// -----------------------------
// Grid helpers
// -----------------------------

function inBounds(x: number, y: number, W: number, H: number) {
  return x >= 0 && y >= 0 && x < W && y < H;
}

function idx(x: number, y: number, w: number) {
  return y * w + x;
}

/**
 * Clear all cells within rect `r` to floor (solid=0).
 * Out-of-bounds cells are silently skipped.
 * When `keepOuterWalls` is true, the outermost row/column border is never cleared.
 */
function carveRect(
  solid: Uint8Array,
  W: number,
  H: number,
  r: Rect,
  keepOuterWalls: boolean,
) {
  for (let y = r.y; y <= r.y + r.h - 1; y++) {
    for (let x = r.x; x <= r.x + r.w - 1; x++) {
      if (!inBounds(x, y, W, H)) continue;
      if (keepOuterWalls && (x === 0 || y === 0 || x === W - 1 || y === H - 1))
        continue;
      solid[idx(x, y, W)] = 0;
    }
  }
}

/**
 * Clear a single cell at `p` to floor (solid=0).
 * No-ops if `p` is out of bounds or if `keepOuterWalls` is true and the cell
 * is on the outermost row or column.
 */
function carvePoint(
  solid: Uint8Array,
  W: number,
  H: number,
  p: Point,
  keepOuterWalls: boolean,
) {
  if (!inBounds(p.x, p.y, W, H)) return;
  if (
    keepOuterWalls &&
    (p.x === 0 || p.y === 0 || p.x === W - 1 || p.y === H - 1)
  )
    return;
  solid[idx(p.x, p.y, W)] = 0;
}

/**
 * Carve a straight corridor from `a` to `b` with a square cross-section of
 * `corridorWidth` cells. At each step a `corridorWidth × corridorWidth` square
 * centred on the current position is cleared. Movement advances one cell per step
 * along the dominant axis (Chebyshev walk without diagonals), so use two calls
 * with a shared midpoint to produce L- or Z-shaped bends.
 */
function carveCorridor(
  solid: Uint8Array,
  W: number,
  H: number,
  a: Point,
  b: Point,
  corridorWidth: number,
  keepOuterWalls: boolean,
) {
  const w = Math.max(1, corridorWidth);
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  let x = a.x;
  let y = a.y;

  for (let i = 0; i <= steps; i++) {
    const half = Math.floor(w / 2);
    for (let oy = -half; oy <= half; oy++) {
      for (let ox = -half; ox <= half; ox++) {
        carvePoint(solid, W, H, { x: x + ox, y: y + oy }, keepOuterWalls);
      }
    }
    x += dx;
    y += dy;
  }
}

// -----------------------------
// BSP tree
// -----------------------------

type BspNode = {
  rect: Rect;
  depth: number;
  left?: BspNode;
  right?: BspNode;
  room?: Rect;
  rep?: Point;
  roomId?: number;
};

function rectCenter(r: Rect): Point {
  return { x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) };
}

function clampInt(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Recursively partition `rect` using Binary Space Partitioning.
 *
 * Split axis selection (per node):
 * - w/h > 1.25 → vertical split (cut along X)
 * - w/h < 0.80 → horizontal split (cut along Y)
 * - otherwise  → 50/50 random
 *
 * The split position is drawn uniformly from
 * [start + splitPadding + minLeafSize, end − splitPadding − minLeafSize].
 * If that range is empty the node becomes a leaf with no further splits.
 * Recursion also stops when `depth >= maxDepth` AND the rect fits within `maxLeafSize`
 * on both axes.
 *
 * Returns the root BspNode and the maximum depth actually reached.
 */
function buildBsp(
  rect: Rect,
  depth: number,
  opts: Required<
    Pick<
      BspDungeonOptions,
      "maxDepth" | "minLeafSize" | "maxLeafSize" | "splitPadding"
    >
  >,
  rng: RNG,
): { node: BspNode; maxDepthReached: number } {
  const node: BspNode = { rect, depth };

  const canSplitBySize = rect.w > opts.maxLeafSize || rect.h > opts.maxLeafSize;
  const shouldSplitByDepth = depth < opts.maxDepth;

  if (!shouldSplitByDepth && !canSplitBySize)
    return { node, maxDepthReached: depth };

  const aspect = rect.w / rect.h;
  let splitVertical: boolean;
  if (aspect > 1.25) splitVertical = true;
  else if (aspect < 0.8) splitVertical = false;
  else splitVertical = rng.chance(0.5);

  if (splitVertical) {
    const minSplitX = rect.x + opts.splitPadding + opts.minLeafSize;
    const maxSplitX = rect.x + rect.w - opts.splitPadding - opts.minLeafSize;
    if (minSplitX > maxSplitX) return { node, maxDepthReached: depth };

    const splitX = rng.int(minSplitX, maxSplitX);
    const L = buildBsp(
      { x: rect.x, y: rect.y, w: splitX - rect.x, h: rect.h },
      depth + 1,
      opts,
      rng,
    );
    const R = buildBsp(
      { x: splitX, y: rect.y, w: rect.x + rect.w - splitX, h: rect.h },
      depth + 1,
      opts,
      rng,
    );
    node.left = L.node;
    node.right = R.node;
    return {
      node,
      maxDepthReached: Math.max(L.maxDepthReached, R.maxDepthReached),
    };
  } else {
    const minSplitY = rect.y + opts.splitPadding + opts.minLeafSize;
    const maxSplitY = rect.y + rect.h - opts.splitPadding - opts.minLeafSize;
    if (minSplitY > maxSplitY) return { node, maxDepthReached: depth };

    const splitY = rng.int(minSplitY, maxSplitY);
    const L = buildBsp(
      { x: rect.x, y: rect.y, w: rect.w, h: splitY - rect.y },
      depth + 1,
      opts,
      rng,
    );
    const R = buildBsp(
      { x: rect.x, y: splitY, w: rect.w, h: rect.y + rect.h - splitY },
      depth + 1,
      opts,
      rng,
    );
    node.left = L.node;
    node.right = R.node;
    return {
      node,
      maxDepthReached: Math.max(L.maxDepthReached, R.maxDepthReached),
    };
  }
}

/**
 * Call `fn` for every leaf node in a BSP tree (nodes with no children).
 * Traversal is depth-first, left then right.
 */
function forEachLeaf(node: BspNode, fn: (leaf: BspNode) => void) {
  if (!node.left && !node.right) {
    fn(node);
    return;
  }
  if (node.left) forEachLeaf(node.left, fn);
  if (node.right) forEachLeaf(node.right, fn);
}

function pickRandomPointInRect(r: Rect, rng: RNG): Point {
  return { x: rng.int(r.x, r.x + r.w - 1), y: rng.int(r.y, r.y + r.h - 1) };
}

// -----------------------------
// Rooms + regionId labeling
// -----------------------------

/**
 * Write `idVal` into every in-bounds cell of rect `r` in the flat `regionId` array.
 * Used to label all cells of a newly carved room with that room's region ID.
 */
function writeRegionRect(
  regionId: Uint8Array,
  W: number,
  H: number,
  r: Rect,
  idVal: number,
) {
  for (let y = r.y; y <= r.y + r.h - 1; y++) {
    for (let x = r.x; x <= r.x + r.w - 1; x++) {
      if (!inBounds(x, y, W, H)) continue;
      regionId[idx(x, y, W)] = idVal;
    }
  }
}

/**
 * Place one room rectangle inside each BSP leaf and carve it into `solid`.
 *
 * For each leaf the available area is the leaf rect shrunk by `roomPadding` on all sides.
 * Room dimensions are drawn from [minRoomSize, maxRoomSize] clamped to the available area.
 * When `rng.chance(roomFillLeafChance)` is true the room fills the entire available area.
 * The room origin is placed at a random position that keeps it within the padded leaf.
 *
 * Side effects (all written in-place):
 * - `solid`: room cells set to 0 (floor)
 * - `regionId`: room cells labelled with an auto-incrementing ID (1–255, wraps at 256)
 * - `floorType`: room cells set to 1 (default floor type; override via theme painting)
 * - `leaf.room`, `leaf.roomId`, `leaf.rep` populated on every leaf node
 */
function createRooms(
  root: BspNode,
  solid: Uint8Array,
  regionId: Uint8Array,
  floorType: Uint8Array,
  W: number,
  H: number,
  opts: Required<
    Pick<
      BspDungeonOptions,
      | "roomPadding"
      | "minRoomSize"
      | "maxRoomSize"
      | "roomFillLeafChance"
      | "keepOuterWalls"
    >
  >,
  rng: RNG,
) {
  let nextRoomId = 1;
  forEachLeaf(root, (leaf) => {
    const pad = Math.max(0, opts.roomPadding);
    const availW = Math.max(1, leaf.rect.w - pad * 2);
    const availH = Math.max(1, leaf.rect.h - pad * 2);

    let rw: number;
    let rh: number;

    if (rng.chance(opts.roomFillLeafChance)) {
      rw = clampInt(availW, Math.min(opts.minRoomSize, availW), availW);
      rh = clampInt(availH, Math.min(opts.minRoomSize, availH), availH);
    } else {
      rw = clampInt(rng.int(opts.minRoomSize, opts.maxRoomSize), 1, availW);
      rh = clampInt(rng.int(opts.minRoomSize, opts.maxRoomSize), 1, availH);
    }

    const minX = leaf.rect.x + pad;
    const minY = leaf.rect.y + pad;
    const rx = rng.int(
      minX,
      Math.max(minX, leaf.rect.x + leaf.rect.w - pad - rw),
    );
    const ry = rng.int(
      minY,
      Math.max(minY, leaf.rect.y + leaf.rect.h - pad - rh),
    );
    const room: Rect = { x: rx, y: ry, w: rw, h: rh };

    leaf.room = room;
    leaf.roomId = nextRoomId;
    leaf.rep = pickRandomPointInRect(room, rng);
    nextRoomId++;
    if (nextRoomId > 255) nextRoomId = 1;

    carveRect(solid, W, H, room, opts.keepOuterWalls);
    writeRegionRect(regionId, W, H, room, leaf.roomId);

    for (let y = room.y; y <= room.y + room.h - 1; y++) {
      for (let x = room.x; x <= room.x + room.w - 1; x++) {
        if (!inBounds(x, y, W, H)) continue;
        floorType[idx(x, y, W)] = 1; // default floor type id 1; override via theme painting
      }
    }
  });
}

// -----------------------------
// Corridors
// -----------------------------

/**
 * Recursively connect BSP sibling subtrees with corridors, bottom-up.
 *
 * At each internal node the representative points of the left (L) and right (R)
 * subtrees are connected:
 * - If L and R share an X or Y coordinate, a single straight corridor is carved.
 * - Otherwise a Z-bend is used: with 50/50 probability either
 *   L→(R.x, L.y)→R  or  L→(L.x, R.y)→R  (two perpendicular straight segments).
 *
 * The adjacency graph receives a bidirectional edge between the two subtree room IDs.
 *
 * Returns the merged subtree's representative point and room ID (randomly chosen from
 * L or R), which propagates upward for the next level's connection.
 */
function connectSiblings(
  node: BspNode,
  solid: Uint8Array,
  W: number,
  H: number,
  opts: Required<Pick<BspDungeonOptions, "corridorWidth" | "keepOuterWalls">>,
  rng: RNG,
  adjacency: Map<number, Set<number>>,
): { rep: Point; roomId: number } {
  if (!node.left && !node.right) {
    if (!node.rep)
      node.rep = node.room ? rectCenter(node.room) : rectCenter(node.rect);
    return { rep: node.rep, roomId: node.roomId! };
  }

  const L = connectSiblings(node.left!, solid, W, H, opts, rng, adjacency);
  const R = connectSiblings(node.right!, solid, W, H, opts, rng, adjacency);

  // Record the room-to-room connection
  if (L.roomId !== R.roomId) {
    if (!adjacency.has(L.roomId)) adjacency.set(L.roomId, new Set());
    if (!adjacency.has(R.roomId)) adjacency.set(R.roomId, new Set());
    adjacency.get(L.roomId)!.add(R.roomId);
    adjacency.get(R.roomId)!.add(L.roomId);
  }

  if (L.rep.x === R.rep.x || L.rep.y === R.rep.y) {
    carveCorridor(
      solid,
      W,
      H,
      L.rep,
      R.rep,
      opts.corridorWidth,
      opts.keepOuterWalls,
    );
  } else if (rng.chance(0.5)) {
    const mid: Point = { x: R.rep.x, y: L.rep.y };
    carveCorridor(solid, W, H, L.rep, mid, opts.corridorWidth, opts.keepOuterWalls);
    carveCorridor(solid, W, H, mid, R.rep, opts.corridorWidth, opts.keepOuterWalls);
  } else {
    const mid: Point = { x: L.rep.x, y: R.rep.y };
    carveCorridor(solid, W, H, L.rep, mid, opts.corridorWidth, opts.keepOuterWalls);
    carveCorridor(solid, W, H, mid, R.rep, opts.corridorWidth, opts.keepOuterWalls);
  }

  const useLeft = rng.chance(0.5);
  node.rep = useLeft ? L.rep : R.rep;
  return { rep: node.rep, roomId: useLeft ? L.roomId : R.roomId };
}

// -----------------------------
// Room metadata
// -----------------------------

/**
 * Build the public `rooms` Map from BSP leaf nodes and the room adjacency graph.
 * Each leaf with a room gets a `RoomInfo` entry (type="room") whose `connections`
 * array lists all room IDs connected to it via corridors.
 * Corridor segment entries are appended separately by `assignCorridorRegions`.
 */
function buildRoomsMap(
  root: BspNode,
  adjacency: Map<number, Set<number>>,
): Map<number, RoomInfo> {
  const rooms = new Map<number, RoomInfo>();
  forEachLeaf(root, (leaf) => {
    if (leaf.roomId === undefined || !leaf.room) return;
    rooms.set(leaf.roomId, {
      id: leaf.roomId,
      type: "room",
      rect: { x: leaf.room.x, y: leaf.room.y, w: leaf.room.w, h: leaf.room.h },
      connections: Array.from(adjacency.get(leaf.roomId) ?? []),
    });
  });
  return rooms;
}

// -----------------------------
// Corridor region assignment
// -----------------------------

/**
 * Flood-fills corridor floor cells (regionId === 0) into unique connected
 * components, assigning IDs starting from `firstId`. Returns:
 * - `fullRegionIds` - copy of `regionIdData` with corridor cells re-labelled
 * - `corridorRooms`  - a `RoomInfo` entry for every corridor segment, with
 *    its bounding rect and the room IDs it borders in `connections`
 */
function assignCorridorRegions(
  regionIdData: Uint8Array,
  solidData: Uint8Array,
  W: number,
  H: number,
  firstId: number,
): { fullRegionIds: Uint8Array; corridorRooms: RoomInfo[] } {
  const full = new Uint8Array(regionIdData);
  const visited = new Uint8Array(W * H);
  const corridorRooms: RoomInfo[] = [];
  let nextId = firstId;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solidData[i] !== 0) continue;
      if (regionIdData[i] !== 0) continue;
      if (visited[i]) continue;

      const corridorId = ((nextId - 1) & 0xff) + 1;
      nextId++;

      let minX = x, minY = y, maxX = x, maxY = y;
      const adjacentRooms = new Set<number>();
      const queue: number[] = [i];
      visited[i] = 1;
      let head = 0;

      while (head < queue.length) {
        const ci = queue[head++]!;
        full[ci] = corridorId;
        const cx = ci % W;
        const cy = (ci / W) | 0;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          const nReg = regionIdData[ni]!;
          if (nReg !== 0) {
            if (solidData[ni] === 0) adjacentRooms.add(nReg);
            continue;
          }
          if (visited[ni] || solidData[ni] !== 0) continue;
          visited[ni] = 1;
          queue.push(ni);
        }
      }

      corridorRooms.push({
        id: corridorId,
        type: "corridor",
        rect: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
        connections: Array.from(adjacentRooms),
      });
    }
  }

  return { fullRegionIds: full, corridorRooms };
}

/**
 * Builds a combined region-id array where corridor floor cells (regionId === 0
 * in the original texture) are flood-filled into unique IDs.
 *
 * Useful when working with a plain `DungeonOutputs` that lacks the
 * pre-computed `fullRegionIds` field (e.g. after deserialization).
 */
export function buildFullRegionIds(
  regionIdData: Uint8Array,
  solidData: Uint8Array,
  W: number,
  H: number,
  firstId: number,
): { fullRegionIds: Uint8Array; corridorRegionIds: number[] } {
  const full = new Uint8Array(regionIdData);
  const visited = new Uint8Array(W * H);
  const corridorRegionIds: number[] = [];
  let nextId = firstId;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solidData[i] !== 0) continue;
      if (regionIdData[i] !== 0) continue;
      if (visited[i]) continue;

      const corridorId = ((nextId - 1) & 0xff) + 1;
      nextId++;
      corridorRegionIds.push(corridorId);

      const queue: number[] = [i];
      visited[i] = 1;
      let head = 0;
      while (head < queue.length) {
        const ci = queue[head++]!;
        full[ci] = corridorId;
        const cx = ci % W;
        const cy = (ci / W) | 0;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          if (visited[ni]) continue;
          if (solidData[ni] !== 0) continue;
          if (regionIdData[ni] !== 0) continue;
          visited[ni] = 1;
          queue.push(ni);
        }
      }
    }
  }

  return { fullRegionIds: full, corridorRegionIds };
}

// -----------------------------
// Start/end room selection
// -----------------------------

/**
 * Choose start and end room IDs from a room adjacency graph so they are
 * maximally far apart, preferring dead-end rooms (rooms with exactly one neighbour).
 *
 * Algorithm:
 * 1. Collect dead-end candidates (degree = 1). If none exist, use all rooms.
 * 2. Run BFS-furthest from every candidate; the one that yields the longest
 *    shortest-path distance to any other room becomes `endRoomId`.
 * 3. Run BFS-furthest from `endRoomId`; the room reached last becomes `startRoomId`.
 *
 * Edge cases: returns `{ startRoomId: 1, endRoomId: 1 }` when the graph is empty;
 * returns the sole room ID for both when there is only one room.
 */
function pickStartEndRooms(adjacency: Map<number, Set<number>>): {
  startRoomId: number;
  endRoomId: number;
} {
  const allRooms = Array.from(adjacency.keys());
  if (allRooms.length === 0) return { startRoomId: 1, endRoomId: 1 };
  if (allRooms.length === 1)
    return { startRoomId: allRooms[0]!, endRoomId: allRooms[0]! };

  const deadEnds = allRooms.filter(
    (id) => (adjacency.get(id)?.size ?? 0) === 1,
  );
  const candidates = deadEnds.length > 0 ? deadEnds : allRooms;

  function bfsFurthest(startId: number): { id: number; dist: number } {
    const dist = new Map<number, number>();
    dist.set(startId, 0);
    const queue = [startId];
    let furthestId = startId;
    let furthestDist = 0;
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++]!;
      const d = dist.get(cur)!;
      for (const nb of adjacency.get(cur) ?? []) {
        if (!dist.has(nb)) {
          dist.set(nb, d + 1);
          queue.push(nb);
          if (d + 1 > furthestDist) {
            furthestDist = d + 1;
            furthestId = nb;
          }
        }
      }
    }
    return { id: furthestId, dist: furthestDist };
  }

  let endRoomId: number = candidates[0]!;
  let bestDist = -1;
  for (const cand of candidates) {
    const { dist: d } = bfsFurthest(cand);
    if (d > bestDist) {
      bestDist = d;
      endRoomId = cand;
    }
  }

  const { id: startRoomId } = bfsFurthest(endRoomId);

  return { startRoomId, endRoomId };
}

// -----------------------------
// Distance-to-wall (BFS)
// -----------------------------

/**
 * Multi-source BFS from all wall cells (solid !== 0).
 * Each floor cell receives the Manhattan distance to its nearest wall cell.
 * Values are clamped to [0, 255] and returned as a Uint8Array (same length as `solid`).
 * Floor cells on maps with no reachable wall (degenerate input) get value 255.
 */
function computeDistanceToWall(
  solid: Uint8Array,
  W: number,
  H: number,
): Uint8Array {
  const dist = new Uint16Array(W * H);
  const INF = 0xffff;
  dist.fill(INF);

  const q = new Int32Array(W * H);
  let qh = 0;
  let qt = 0;

  for (let i = 0; i < W * H; i++) {
    if (solid[i] === 255) {
      dist[i] = 0;
      q[qt++] = i;
    }
  }

  if (qt === 0) {
    const out = new Uint8Array(W * H);
    out.fill(255);
    return out;
  }

  const neighbors = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  while (qh < qt) {
    const i = q[qh++]!;
    const x = i % W;
    const y = (i / W) | 0;
    const next = dist[i]! + 1;
    for (const n of neighbors) {
      const nx = x + n.dx;
      const ny = y + n.dy;
      if (!inBounds(nx, ny, W, H)) continue;
      const ni = idx(nx, ny, W);
      if (next < dist[ni]!) {
        dist[ni] = next;
        q[qt++] = ni;
      }
    }
  }

  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const d = dist[i]!;
    out[i] = d === INF ? 255 : d > 255 ? 255 : d;
  }
  return out;
}

// -----------------------------
// Texture helpers
// -----------------------------

/**
 * Wrap a Uint8Array as an R8 THREE.DataTexture (one byte per texel).
 * The texture shares the buffer with `mask` — mutations to `mask` are visible
 * after setting `tex.needsUpdate = true`.
 * NearestFilter on both min/mag, ClampToEdge wrap, no mipmaps, no color-space
 * conversion, flipY=false.
 */
function maskToDataTextureR8(
  mask: Uint8Array,
  W: number,
  H: number,
  name: string,
): THREE.DataTexture {
  const tex = new THREE.DataTexture(
    mask,
    W,
    H,
    THREE.RedFormat,
    THREE.UnsignedByteType,
  );
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
 * The texture shares the buffer with `mask`.
 * NearestFilter on both min/mag, ClampToEdge wrap, no mipmaps, no color-space
 * conversion, flipY=false.
 */
function maskToDataTextureRGBA(
  mask: Uint8Array,
  W: number,
  H: number,
  name: string,
): THREE.DataTexture {
  const tex = new THREE.DataTexture(
    mask,
    W,
    H,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
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

// -----------------------------
// Public generator
// -----------------------------

/**
 * Generate a BSP dungeon and return the full texture set as `BspDungeonOutputs`.
 *
 * Pipeline:
 * 1. Hash `options.seed` to a 32-bit integer (FNV-1a for strings); seed a mulberry32 PRNG.
 * 2. Recursively partition the map rect into a BSP tree (`buildBsp`). Split axis is chosen
 *    by aspect ratio; position is randomised within [minLeafSize, maxLeafSize] padding.
 * 3. Place one room per BSP leaf (`createRooms`); rooms are labelled 1..N in `regionId`
 *    and carved into `solid`.
 * 4. Connect sibling subtrees bottom-up with straight or Z-shaped corridors
 *    (`connectSiblings`); the adjacency graph records all room-to-room connections.
 * 5. Pick `startRoomId` / `endRoomId` via double-BFS on the room graph
 *    (`pickStartEndRooms`): furthest dead-end pair preferred.
 * 6. Flood-fill corridor floor cells into unique region IDs starting at `maxRoomId + 1`
 *    (`assignCorridorRegions`); bake those IDs back into the `regionId` texture so every
 *    floor cell has a non-zero region ID.
 * 7. BFS-propagate `floorType` from room cells into unassigned corridor cells; then
 *    propagate outward into wall cells for `wallType`.
 * 8. Compute `distanceToWall` (multi-source BFS from all wall cells; clamped to [0, 255]).
 * 9. Initialize remaining textures: `temperature` = 127 for floor cells, `ceilingType` = 1
 *    for floor cells, height offsets = 128 (no offset), `colliderFlags` derived from solid.
 *
 * @throws if width or height ≤ 2, or if minLeafSize < 4.
 */
export function generateBspDungeon(
  options: BspDungeonOptions,
): BspDungeonOutputs {
  const opts = {
    width: options.width,
    height: options.height,
    seed: options.seed ?? 0x12345678,
    maxDepth: options.maxDepth ?? 6,
    minLeafSize: options.minLeafSize ?? 12,
    maxLeafSize: options.maxLeafSize ?? 28,
    splitPadding: options.splitPadding ?? 2,
    roomPadding: options.roomPadding ?? 1,
    minRoomSize: options.minRoomSize ?? 5,
    maxRoomSize: options.maxRoomSize ?? 14,
    roomFillLeafChance: options.roomFillLeafChance ?? 0.08,
    corridorWidth: options.corridorWidth ?? 1,
    corridorStyle: options.corridorStyle ?? ("straight-or-z" as const),
    keepOuterWalls: options.keepOuterWalls ?? true,
  };

  if (opts.width <= 2 || opts.height <= 2)
    throw new Error("generateBspDungeon: width/height must be > 2");
  if (opts.minLeafSize < 4)
    throw new Error(
      "generateBspDungeon: minLeafSize too small (recommend >= 4)",
    );

  const seedUsed = hashSeedToUint32(opts.seed);
  const rng = makeRng(seedUsed);
  const W = opts.width;
  const H = opts.height;

  const solid = new Uint8Array(W * H);
  solid.fill(255);
  const regionId = new Uint8Array(W * H);
  const floorType = new Uint8Array(W * H);
  const wallType = new Uint8Array(W * H);
  const overlays = new Uint8Array(4 * W * H);
  const wallOverlays = new Uint8Array(4 * W * H);
  const ceilingType = new Uint8Array(W * H);
  const ceilingOverlays = new Uint8Array(4 * W * H);
  const floorSkirtType = new Uint8Array(4 * W * H);
  const ceilSkirtType = new Uint8Array(4 * W * H);
  const skyPanelCount = new Uint8Array(W * H);
  const ceilingPanelCount = new Uint8Array(W * H);
  const floorHeightOffset = new Uint8Array(W * H);
  floorHeightOffset.fill(128);
  const ceilingHeightOffset = new Uint8Array(W * H);
  ceilingHeightOffset.fill(128);

  const { node: root } = buildBsp(
    { x: 0, y: 0, w: W, h: H },
    0,
    {
      maxDepth: opts.maxDepth,
      minLeafSize: opts.minLeafSize,
      maxLeafSize: opts.maxLeafSize,
      splitPadding: opts.splitPadding,
    },
    rng,
  );

  createRooms(
    root,
    solid,
    regionId,
    floorType,
    W,
    H,
    {
      roomPadding: opts.roomPadding,
      minRoomSize: opts.minRoomSize,
      maxRoomSize: opts.maxRoomSize,
      roomFillLeafChance: opts.roomFillLeafChance,
      keepOuterWalls: opts.keepOuterWalls,
    },
    rng,
  );

  const adjacency = new Map<number, Set<number>>();
  connectSiblings(
    root,
    solid,
    W,
    H,
    {
      corridorWidth: opts.corridorWidth,
      keepOuterWalls: opts.keepOuterWalls,
    },
    rng,
    adjacency,
  );

  const { startRoomId, endRoomId } = pickStartEndRooms(adjacency);
  const rooms = buildRoomsMap(root, adjacency);

  const maxRoomId = rooms.size > 0 ? Math.max(...rooms.keys()) : 0;
  const firstCorridorRegionId = maxRoomId + 1;
  const { fullRegionIds, corridorRooms } = assignCorridorRegions(
    regionId,
    solid,
    W,
    H,
    firstCorridorRegionId,
  );
  for (const cr of corridorRooms) {
    rooms.set(cr.id, cr);
  }

  // Bake unique corridor IDs into regionId so textures.regionId has non-zero
  // values for every floor cell (rooms and corridors alike).
  regionId.set(fullRegionIds);

  // Flood-fill floor types from room cells into corridor cells
  {
    const queue: number[] = [];
    for (let i = 0; i < W * H; i++) {
      if (solid[i]! === 0 && floorType[i]! > 0) queue.push(i);
    }
    let qh = 0;
    while (qh < queue.length) {
      const ci = queue[qh++]!;
      const cx = ci % W;
      const cy = (ci / W) | 0;
      const neighbors = [
        cy > 0 ? ci - W : -1,
        cy < H - 1 ? ci + W : -1,
        cx > 0 ? ci - 1 : -1,
        cx < W - 1 ? ci + 1 : -1,
      ];
      for (const ni of neighbors) {
        if (ni < 0) continue;
        if (solid[ni]! !== 0 || floorType[ni]! !== 0) continue;
        floorType[ni] = floorType[ci]!;
        queue.push(ni);
      }
    }
  }

  // Flood-fill wall types outward from floor cells into wall cells
  {
    const queue: number[] = [];
    for (let i = 0; i < W * H; i++) {
      if (solid[i]! === 0 && floorType[i]! > 0) queue.push(i);
    }
    let qh = 0;
    while (qh < queue.length) {
      const ci = queue[qh++]!;
      const cx = ci % W;
      const cy = (ci / W) | 0;
      const neighbors = [
        cy > 0 ? ci - W : -1,
        cy < H - 1 ? ci + W : -1,
        cx > 0 ? ci - 1 : -1,
        cx < W - 1 ? ci + 1 : -1,
      ];
      for (const ni of neighbors) {
        if (ni < 0) continue;
        if (solid[ni]! === 0 || wallType[ni]! !== 0) continue;
        wallType[ni] = solid[ci]! === 0 ? floorType[ci]! : wallType[ci]!;
        queue.push(ni);
      }
    }
  }

  // Ceiling type: default id 1 for all floor cells; override via theme painting
  for (let i = 0; i < W * H; i++) {
    if (solid[i] === 0) ceilingType[i] = 1;
  }

  // Temperature mask: 127 (middle) for all floor cells, 0 for walls
  const temperature = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (solid[i] === 0) temperature[i] = 127;
  }

  const distanceToWall = computeDistanceToWall(solid, W, H);
  const hazards = new Uint8Array(W * H);
  const colliderFlagsArr = buildColliderFlags(solid);

  return {
    width: W,
    height: H,
    seed: seedUsed,
    endRoomId,
    startRoomId,
    rooms,
    fullRegionIds,
    firstCorridorRegionId,
    textures: {
      solid: maskToDataTextureR8(solid, W, H, "bsp_dungeon_solid"),
      regionId: maskToDataTextureR8(regionId, W, H, "bsp_dungeon_region_id"),
      distanceToWall: maskToDataTextureR8(distanceToWall, W, H, "bsp_dungeon_distance_to_wall"),
      hazards: maskToDataTextureR8(hazards, W, H, "bsp_dungeon_hazards"),
      temperature: maskToDataTextureR8(temperature, W, H, "bsp_dungeon_temperature"),
      floorType: maskToDataTextureR8(floorType, W, H, "bsp_dungeon_floor_type"),
      overlays: maskToDataTextureRGBA(overlays, W, H, "bsp_dungeon_overlays"),
      wallType: maskToDataTextureR8(wallType, W, H, "bsp_dungeon_wall_type"),
      wallOverlays: maskToDataTextureRGBA(wallOverlays, W, H, "bsp_dungeon_wall_overlays"),
      ceilingType: maskToDataTextureR8(ceilingType, W, H, "bsp_dungeon_ceiling_type"),
      ceilingOverlays: maskToDataTextureRGBA(ceilingOverlays, W, H, "bsp_dungeon_ceiling_overlays"),
      floorSkirtType: maskToDataTextureRGBA(floorSkirtType, W, H, "bsp_dungeon_floor_skirt_type"),
      ceilSkirtType: maskToDataTextureRGBA(ceilSkirtType, W, H, "bsp_dungeon_ceil_skirt_type"),
      skyPanelCount: maskToDataTextureR8(skyPanelCount, W, H, "bsp_dungeon_sky_panel_count"),
      ceilingPanelCount: maskToDataTextureR8(ceilingPanelCount, W, H, "bsp_dungeon_ceiling_panel_count"),
      floorHeightOffset: maskToDataTextureR8(floorHeightOffset, W, H, "bsp_dungeon_floor_height_offset"),
      ceilingHeightOffset: maskToDataTextureR8(ceilingHeightOffset, W, H, "bsp_dungeon_ceiling_height_offset"),
      colliderFlags: maskToDataTextureR8(colliderFlagsArr, W, H, "bsp_dungeon_collider_flags"),
    },
  };
}

// ---------------------------------------------------------------------------
// Per-cell skirt overlay helpers
// ---------------------------------------------------------------------------

/**
 * Write floor skirt overlay tile IDs for a single cell.
 * `tiles` is an array of up to 4 numeric tile IDs corresponding to RGBA slots 1–4.
 * Missing entries are left unchanged; pass 0 to clear a slot.
 */
export function setFloorSkirtTiles(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  tiles: number[],
): void {
  const data = outputs.textures.floorSkirtType.image.data as Uint8Array;
  const base = (cz * outputs.width + cx) * 4;
  for (let i = 0; i < 4 && i < tiles.length; i++) {
    if (tiles[i] !== undefined) data[base + i] = tiles[i]!;
  }
  outputs.textures.floorSkirtType.needsUpdate = true;
}

/**
 * Write ceiling skirt overlay tile IDs for a single cell.
 * `tiles` is an array of up to 4 numeric tile IDs corresponding to RGBA slots 1–4.
 * Missing entries are left unchanged; pass 0 to clear a slot.
 */
export function setCeilSkirtTiles(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  tiles: number[],
): void {
  const data = outputs.textures.ceilSkirtType.image.data as Uint8Array;
  const base = (cz * outputs.width + cx) * 4;
  for (let i = 0; i < 4 && i < tiles.length; i++) {
    if (tiles[i] !== undefined) data[base + i] = tiles[i]!;
  }
  outputs.textures.ceilSkirtType.needsUpdate = true;
}

/**
 * Set the number of sky panels (upward-facing vertical quads above the wall) for
 * a single cell. Panels are emitted on all wall faces (adjacent to solid neighbours)
 * going up from y = ceilingHeight; row 0 is immediately above the wall.
 *
 * Intended for open-sky cells (ceilingHeightOffset === 0) so the panels extend
 * visibly through the sky opening. Count is clamped to [0, 4].
 */
export function setSkyPanelCount(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  count: number,
): void {
  if (!outputs.textures.skyPanelCount) return;
  const data = outputs.textures.skyPanelCount.image.data as Uint8Array;
  data[cz * outputs.width + cx] = Math.max(0, Math.min(4, count));
  outputs.textures.skyPanelCount.needsUpdate = true;
}

/**
 * Set the number of ceiling panels (downward-facing vertical quads below the ceiling)
 * for a single cell. Panels are emitted on all wall faces (adjacent to solid neighbours)
 * hanging down from y = ceilingHeight; row 0 is immediately below the ceiling.
 *
 * Count is clamped to [0, 4].
 */
export function setCeilingPanelCount(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  count: number,
): void {
  if (!outputs.textures.ceilingPanelCount) return;
  const data = outputs.textures.ceilingPanelCount.image.data as Uint8Array;
  data[cz * outputs.width + cx] = Math.max(0, Math.min(4, count));
  outputs.textures.ceilingPanelCount.needsUpdate = true;
}
