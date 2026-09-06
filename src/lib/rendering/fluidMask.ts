// src/lib/rendering/fluidMask.ts
//
// Rendering adapter for `fluid/fluid.ts`.
//
// `FluidMask` follows the same DataTexture-per-concern pattern as
// temperatureMask.ts: plain typed arrays backing THREE.DataTexture
// instances, re-synced on demand — a general-purpose primitive for any
// custom fluid visualization (minimap overlays, etc.), independent of the
// mesh helper below.
//
// `createFluidSurface` builds an actual visible mesh: one flat quad per
// non-solid cell (not a subdivided single plane), with per-vertex
// attributes for height/depth/type updated directly on the BufferGeometry
// each frame — not sampled from a texture. Vertex texture fetch (sampling
// a DataTexture in the *vertex* shader to displace geometry) was the first
// approach tried here and produced garbage geometry on a software/headless
// GL backend; per-vertex attributes need no VTF support at all and are the
// standard, portable way to drive small per-cell displacement in three.js.
// One quad per cell (not a shared-vertex grid) also gives the surface a
// blocky, stair-stepped look between differently-elevated neighbors, which
// reads well for this CA's inherently discrete cells. Added straight to
// `renderer.scene` rather than built on `addLayer`/`LayerSpec` — that API
// instances per tile-face geometry, which doesn't fit a continuously
// updated fluid surface any better than it fits camera-facing billboards
// (see billboardSprites.ts, which hand-rolls its own ShaderMaterial for the
// same reason).
//
// Alongside each cell's flat top quad, a vertical "wall" quad is added on
// every one of its 4 edges, so a pool reads as a volume sitting in its
// space rather than a flat sheet with nothing behind its edge. A slot exists
// for every edge unconditionally (allocated once at construction, never
// added/removed at runtime); only its top/bottom Y are recomputed each
// sync(), same as the top quads. Most slots render as zero-height and
// therefore invisible — same-type fluid connected across equal floor
// elevation always levels to a matching surface — but a wall is not purely
// a function of structural floor elevation: two *different* fluid types
// sitting at the same elevation never level with each other (the CA's
// compatible-neighbor check only flows same-type-or-empty), so their
// surfaces can differ persistently even on flat ground, same as at an
// actual structural drop or a solid/off-grid boundary. sync() treats all
// three cases identically — compare this cell's current surface to
// whatever is on the other side of the edge — which is what lets a slot
// stay allocated forever while only rendering when there's actually
// something to show. "Something to show" has a floor (MIN_WALL_HEIGHT,
// below): the damped pass leaves small resting imbalances between connected
// same-type cells by design (see fluid.ts's MIN_FLOW), and without a floor
// that ordinary settling noise would render as a wall on nearly every
// internal boundary of an unsettled pool — a field of tiny cracks instead
// of one smooth surface.

import * as THREE from "three";
import type { FluidDef, FluidField } from "../fluid/fluid";
import { MAX_MASS, FLUID_VISIBLE_THRESHOLD } from "../fluid/fluid";
import type { DungeonRenderer } from "./dungeonRenderer";

// ─── FluidMask (data textures) ─────────────────────────────────────────────

export interface FluidMask {
  field: FluidField;
  /** Quantized mass (0-255, 255 = >=MAX_MASS) per cell, row-major. Backs `depthTexture`. */
  depthData: Uint8Array;
  /** RedFormat/UnsignedByteType. */
  depthTexture: THREE.DataTexture;
  /** Fluid type id (0 = dry) per cell, row-major. Backs `typeTexture`. */
  typeData: Uint8Array;
  /** RedFormat/UnsignedByteType. */
  typeTexture: THREE.DataTexture;
  /** field.version as of the last sync. */
  syncedVersion: number;
}

function makeDataTexture(data: Uint8Array, W: number, H: number, name: string): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
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

export function createFluidMask(field: FluidField): FluidMask {
  const { width, height } = field;
  const size = width * height;
  const mask: FluidMask = {
    field,
    depthData: new Uint8Array(size),
    depthTexture: makeDataTexture(new Uint8Array(size), width, height, "fluid_depth"),
    typeData: new Uint8Array(size),
    typeTexture: makeDataTexture(new Uint8Array(size), width, height, "fluid_type"),
    syncedVersion: -1,
  };
  syncFluidMask(mask);
  return mask;
}

/** Re-syncs the mask's textures from `mask.field`. No-op if the field hasn't changed. */
export function updateFluidMask(mask: FluidMask): void {
  if (mask.field.version === mask.syncedVersion) return;
  syncFluidMask(mask);
}

function syncFluidMask(mask: FluidMask): void {
  const { field, depthData, typeData } = mask;
  const size = field.width * field.height;

  for (let i = 0; i < size; i++) {
    const mass = field.mass[i]!;
    depthData[i] = Math.max(0, Math.min(255, Math.round((mass / MAX_MASS) * 255)));
    typeData[i] = mass > FLUID_VISIBLE_THRESHOLD ? field.cellType[i]! : 0;
  }

  mask.depthTexture.needsUpdate = true;
  mask.typeTexture.needsUpdate = true;
  mask.syncedVersion = field.version;
}

// ─── Surface mesh ────────────────────────────────────────────────────────

const MAX_PALETTE_SIZE = 16;

const SURFACE_VERT = /* glsl */ `
attribute float aDepth;
attribute float aType;

varying float vDepth;
varying float vType;
varying float vFogDist;

void main() {
  vDepth = aDepth;
  vType = aType;
  vec4 eyePos = modelViewMatrix * vec4(position, 1.0);
  vFogDist = length(eyePos.xyz);
  gl_Position = projectionMatrix * eyePos;
}
`;

const SURFACE_FRAG = /* glsl */ `
uniform vec3 uPalette[${MAX_PALETTE_SIZE}];
uniform float uOpacity;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying float vDepth;
varying float vType;
varying float vFogDist;

void main() {
  if (vDepth < 0.02) discard;
  vec3 color = uPalette[int(vType + 0.5)];

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);
  float alpha = clamp(vDepth * 1.5, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(mix(color, uFogColor, fogFactor), alpha);
}
`;

export interface FluidSurfaceOptions {
  tileSize: number;
  /**
   * World-space units per unit of `surfaceHeight` (`floorElevation + mass`,
   * both already in the same abstract mass-equivalent scale — see
   * `fluid.ts`'s DEFAULT_STEP_HEIGHT). Must be a single factor applied to
   * the combined sum, not split across elevation and mass separately:
   * two cells the simulation considers at equal water level (equal
   * `surfaceHeight`) only render at the same world Y if both terms share
   * one scale. Splitting it — e.g. a smaller factor for `mass` alone, to
   * make a fresh puddle look shallower — breaks that equivalence and makes
   * the surface visibly non-flat (or clip into the floor) across any
   * stepped pit, which defeats the point of the simulation. Default:
   * `tileSize * 0.5`, matching the renderer's own floor-height step so the
   * dry-cell baseline (mass = 0) lines up with the dungeon's real geometry.
   * To make a single fresh pour look shallower, reduce the poured `amount`
   * (see `placeFluidCircle`) rather than this scale.
   */
  worldUnitsPerStep?: number;
  /** cellType id -> visual definition. Ids outside [1, 15] are not representable in the palette. */
  fluidDefs: Record<number, FluidDef>;
  opacity?: number;
  fogColor?: THREE.ColorRepresentation;
  fogNear?: number;
  fogFar?: number;
}

export interface FluidSurfaceHandle {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  /** Recomputes vertex height/depth/type from the field's current state. Call once per frame after `stepFluid`. */
  sync(): void;
  /** Removes the mesh from the scene and disposes its geometry/material. */
  remove(): void;
}

/** Grid-relative (dx, dz) offsets for the 4-neighborhood, matching fluid.ts's own order. */
const NEIGHBOR_DX = [0, 0, -1, 1];
const NEIGHBOR_DZ = [-1, 1, 0, 0];

/**
 * A cell's 4 neighbor indices (N, S, W, E order, matching NEIGHBOR_DX/DZ),
 * -1 for solid/off-grid. Every open cell gets exactly 4 wall-quad slots
 * (one per direction, always allocated — see file header); their vertex
 * Y values are computed from these at sync() time, corner-aware (see there).
 */
interface CellNeighbors {
  cellIndex: number;
  n: number;
  s: number;
  w: number;
  e: number;
}

/**
 * Adds a fluid-surface mesh to `renderer.scene`: one flat top quad per
 * non-solid cell, world-positioned to exactly cover that cell's footprint
 * (`[x*tileSize, (x+1)*tileSize] x [z*tileSize, (z+1)*tileSize]`, matching
 * the dungeon's own `(cx+0.5)*tileSize` cell-center convention), plus a
 * vertical wall quad on every edge, rendered only where the surface actually
 * drops off across it (see the file header).
 */
export function createFluidSurface(
  renderer: DungeonRenderer,
  field: FluidField,
  options: FluidSurfaceOptions,
): FluidSurfaceHandle {
  const { width, height } = field;
  const { tileSize, fluidDefs } = options;
  const worldUnitsPerStep = options.worldUnitsPerStep ?? tileSize * 0.5;
  // Below this, a wall collapses to invisible rather than rendering a
  // sliver. The damped pass intentionally stops nudging mass between two
  // cells once the transfer would drop below fluid.ts's own MIN_FLOW
  // (0.01), so any two connected same-type cells can rest with a small
  // residual imbalance forever — without this floor, that ordinary settling
  // noise renders as a wall on nearly every internal cell boundary in an
  // unsettled pool, turning what should read as one smooth surface into a
  // field of tiny visible cracks/boxes. Comfortably above that noise floor,
  // comfortably below a real edge (a full elevation step is ~1 unit).
  const MIN_WALL_HEIGHT = worldUnitsPerStep * 0.08;

  const cellIndices: number[] = [];
  for (let i = 0; i < width * height; i++) {
    if (!field.isSolid[i]) cellIndices.push(i);
  }
  const quadCount = cellIndices.length;

  // One CellNeighbors record per open cell (parallel to cellIndices), and
  // exactly 4 wall-quad slots per cell (fixed N/S/W/E order) — always
  // allocated regardless of current elevation/wetness. A slot is needed
  // wherever two open cells hold *different* fluid types too, not just at
  // structural elevation drops: different types never level with each other
  // (the CA's compatible-neighbor check only flows same-type-or-empty), so
  // their surfaces can differ persistently even on flat ground. sync()'s
  // corner-aware height clamp (see there) degenerates a slot to invisible
  // whenever there's nothing to show, so allocating it unconditionally costs
  // nothing when unused.
  const cellNeighbors: CellNeighbors[] = new Array(quadCount);
  for (let q = 0; q < quadCount; q++) {
    const i = cellIndices[q]!;
    const x = i % width;
    const z = (i - x) / width;
    const n4: number[] = [];
    for (let n = 0; n < 4; n++) {
      const nx = x + NEIGHBOR_DX[n]!;
      const nz = z + NEIGHBOR_DZ[n]!;
      const outOfBounds = nx < 0 || nx >= width || nz < 0 || nz >= height;
      const j = outOfBounds ? -1 : nz * width + nx;
      n4.push(outOfBounds || field.isSolid[j] === 1 ? -1 : j);
    }
    cellNeighbors[q] = { cellIndex: i, n: n4[0]!, s: n4[1]!, w: n4[2]!, e: n4[3]! };
  }
  const sideCount = quadCount * 4;
  const totalQuads = quadCount + sideCount;

  const positions = new Float32Array(totalQuads * 4 * 3);
  const depths = new Float32Array(totalQuads * 4);
  const types = new Float32Array(totalQuads * 4);
  const indices = new Uint32Array(totalQuads * 6);

  function writeQuadIndices(q: number): void {
    const vBase = q * 4;
    const iBase = q * 6;
    indices[iBase + 0] = vBase;
    indices[iBase + 1] = vBase + 1;
    indices[iBase + 2] = vBase + 2;
    indices[iBase + 3] = vBase;
    indices[iBase + 4] = vBase + 2;
    indices[iBase + 5] = vBase + 3;
  }

  for (let q = 0; q < quadCount; q++) {
    const i = cellIndices[q]!;
    const x = i % width;
    const z = (i - x) / width;
    const x0 = x * tileSize;
    const x1 = x0 + tileSize;
    const z0 = z * tileSize;
    const z1 = z0 + tileSize;

    const pBase = q * 4 * 3;
    positions[pBase + 0] = x0;
    positions[pBase + 1] = 0;
    positions[pBase + 2] = z0;
    positions[pBase + 3] = x1;
    positions[pBase + 4] = 0;
    positions[pBase + 5] = z0;
    positions[pBase + 6] = x1;
    positions[pBase + 7] = 0;
    positions[pBase + 8] = z1;
    positions[pBase + 9] = x0;
    positions[pBase + 10] = 0;
    positions[pBase + 11] = z1;

    writeQuadIndices(q);
  }

  // Side-wall quads: vertices 0/1 are the top edge (Y filled in by sync()),
  // vertices 2/3 are the bottom edge, sharing the same X/Z as 1/0 respectively
  // so the quad is a simple vertical rectangle along the cell edge. Laid out
  // as 4 consecutive quads per cell (N,S,W,E, matching cellNeighbors' field
  // order) at quadCount + q*4 + n, so sync() can address them directly.
  for (let q = 0; q < quadCount; q++) {
    const i = cellNeighbors[q]!.cellIndex;
    const x = i % width;
    const z = (i - x) / width;
    const x0 = x * tileSize;
    const x1 = x0 + tileSize;
    const z0 = z * tileSize;
    const z1 = z0 + tileSize;

    // Edge line per direction: N/S run along X at a fixed Z, E/W run along Z at a fixed X.
    const edges: [number, number, number, number][] = [
      [x0, z0, x1, z0], // north
      [x0, z1, x1, z1], // south
      [x0, z0, x0, z1], // west
      [x1, z0, x1, z1], // east
    ];

    for (let n = 0; n < 4; n++) {
      const [ex0, ez0, ex1, ez1] = edges[n]!;
      const sq = quadCount + q * 4 + n;
      const pBase = sq * 4 * 3;
      positions[pBase + 0] = ex0;
      positions[pBase + 1] = 0;
      positions[pBase + 2] = ez0;
      positions[pBase + 3] = ex1;
      positions[pBase + 4] = 0;
      positions[pBase + 5] = ez1;
      positions[pBase + 6] = ex1;
      positions[pBase + 7] = 0;
      positions[pBase + 8] = ez1;
      positions[pBase + 9] = ex0;
      positions[pBase + 10] = 0;
      positions[pBase + 11] = ez0;

      writeQuadIndices(sq);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
  geometry.setAttribute("aType", new THREE.BufferAttribute(types, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  const palette = new Float32Array(MAX_PALETTE_SIZE * 3);
  for (const [idStr, def] of Object.entries(fluidDefs)) {
    const id = Number(idStr);
    if (id <= 0 || id >= MAX_PALETTE_SIZE) continue;
    palette[id * 3] = def.color[0];
    palette[id * 3 + 1] = def.color[1];
    palette[id * 3 + 2] = def.color[2];
  }

  const fogColor = new THREE.Color(options.fogColor ?? 0x000000);

  const material = new THREE.ShaderMaterial({
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_FRAG,
    uniforms: {
      uPalette: { value: palette },
      uOpacity: { value: options.opacity ?? 0.85 },
      uFogColor: { value: fogColor },
      uFogNear: { value: options.fogNear ?? tileSize * 6 },
      uFogFar: { value: options.fogFar ?? tileSize * 16 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  renderer.scene.add(mesh);

  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  const depthAttr = geometry.getAttribute("aDepth") as THREE.BufferAttribute;
  const typeAttr = geometry.getAttribute("aType") as THREE.BufferAttribute;

  function surfaceY(i: number): number {
    return (field.floorElevation[i]! + field.mass[i]!) * worldUnitsPerStep;
  }

  function sync(): void {
    for (let q = 0; q < quadCount; q++) {
      const i = cellIndices[q]!;
      const mass = field.mass[i]!;
      const y = surfaceY(i);
      const depth = Math.max(0, Math.min(1, mass / MAX_MASS));
      const type = mass > FLUID_VISIBLE_THRESHOLD ? field.cellType[i]! : 0;

      const vBase = q * 4;
      for (let c = 0; c < 4; c++) {
        posAttr.setY(vBase + c, y);
        depthAttr.setX(vBase + c, depth);
        typeAttr.setX(vBase + c, type);
      }
    }

    for (let q = 0; q < quadCount; q++) {
      const cn = cellNeighbors[q]!;
      const i = cn.cellIndex;
      const mass = field.mass[i]!;
      const top = surfaceY(i);
      // Solid/off-grid neighbor: wall goes down to this cell's own bare
      // floor. Open neighbor: down to its current surface, so a dry pit
      // wall shows its bare floor and a partly-filled one shows the real
      // step between the two water levels.
      const floorY = field.floorElevation[i]! * worldUnitsPerStep;
      const rawBottom = (nb: number): number => (nb < 0 ? floorY : surfaceY(nb));
      const bN = rawBottom(cn.n);
      const bS = rawBottom(cn.s);
      const bW = rawBottom(cn.w);
      const bE = rawBottom(cn.e);

      // Each of a cell's 4 corners is shared by the two walls that meet
      // there (e.g. NW is shared by the north and west walls) — computing
      // it once here, from both of that corner's contributing neighbors,
      // and reusing the same value for both walls' vertex at that point is
      // what keeps them meeting exactly instead of leaving a crack where
      // two independently-computed bottoms disagree. Take the lower of the
      // two contributing neighbors so the corner extends down far enough to
      // close the gap against both.
      const clampCorner = (v: number): number => (top - v < MIN_WALL_HEIGHT ? top : v);
      const nw = clampCorner(Math.min(bN, bW));
      const ne = clampCorner(Math.min(bN, bE));
      const sw = clampCorner(Math.min(bS, bW));
      const se = clampCorner(Math.min(bS, bE));

      const depth = Math.max(0, Math.min(1, mass / MAX_MASS));
      const type = mass > FLUID_VISIBLE_THRESHOLD ? field.cellType[i]! : 0;

      // [leftBottom, rightBottom] per direction, matching the edge/vertex
      // layout above (vertex0/3 at the edge's first point, vertex1/2 at its second).
      const wallBottoms: [number, number][] = [
        [nw, ne], // north
        [sw, se], // south
        [nw, sw], // west
        [ne, se], // east
      ];

      for (let n = 0; n < 4; n++) {
        const [leftBottom, rightBottom] = wallBottoms[n]!;
        const vBase = (quadCount + q * 4 + n) * 4;
        posAttr.setY(vBase + 0, top);
        posAttr.setY(vBase + 1, top);
        posAttr.setY(vBase + 2, rightBottom);
        posAttr.setY(vBase + 3, leftBottom);
        for (let c = 0; c < 4; c++) {
          depthAttr.setX(vBase + c, depth);
          typeAttr.setX(vBase + c, type);
        }
      }
    }

    posAttr.needsUpdate = true;
    depthAttr.needsUpdate = true;
    typeAttr.needsUpdate = true;
  }
  sync();

  return {
    mesh,
    material,
    sync,
    remove() {
      renderer.scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
