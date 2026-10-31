// src/lib/rendering/paletteBands.ts
//
// Palette-safe "distance-banded texture lookup" lighting.
//
// Instead of darkening textures in the shader (AO, fog, point lights — all of
// which produce colours outside a fixed art palette), every texture ships as a
// small "brush" of pre-drawn variants, one per light level:
//
//   light0/stone_wall.png   ← fully lit (standing tile / nearest band)
//   light1/stone_wall.png
//   light2/stone_wall.png
//   light3/stone_wall.png   ← dimmest lit band; anything further is fogColor
//
// Each frame the atlas shader reads a per-cell light level from a W×H lookup
// texture (computed here on the CPU from the player + any light sources) and
// swaps every sampled tile ID for the variant at that level via a second
// lookup texture (base tile ID × level → variant tile ID). Light levels are
// per *grid cell*, so a whole tile always shows a single variant and the
// bands step cleanly from tile to tile.

import * as THREE from "three";
import { computeFov } from "../ai/fov";
import type { PackedAtlas } from "./textureLoader";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Renderer lighting mode.
 * - `'shaded'` (default): AO, directional surface lighting, scene lights and
 *   smooth fog.
 * - `'paletteBands'`: palette-safe distance-banded texture lookup — see
 *   {@link PaletteBandsOptions}. All colour-altering shader effects are
 *   switched off and darkness comes entirely from texture variants.
 */
export type LightingMode = "shaded" | "paletteBands";

/** How cell distance from a light source is measured. */
export type LightDistanceMetric = "euclidean" | "chebyshev" | "manhattan";

/** A light source on the dungeon grid for `'paletteBands'` lighting. */
export type LightSource = {
  /** Grid column. */
  x: number;
  /** Grid row. */
  z: number;
  /**
   * Per-source band thresholds (cell distances, ascending, inclusive) —
   * `bands[i]` is the furthest distance lit at level `i`. Cells beyond the
   * last entry are not lit by this source. Defaults to the global `bands`.
   */
  bands?: number[];
};

/** Configuration for `lightingMode: 'paletteBands'`. */
export type PaletteBandsOptions = {
  /**
   * Band thresholds in grid cells (ascending, inclusive). `bands[i]` is the
   * furthest cell distance drawn with variant level `i`; the array length is
   * the number of lit levels. Anything beyond the last entry is drawn in the
   * fog colour.
   *
   * `[0, 1, 2, 3]` = only the standing tile is level 0, one tile out is
   * level 1, … four tiles out is dark.
   *
   * Default: derived from `fogNear`/`fogFar` ÷ `tileSize`, spread evenly over
   * `levels` steps.
   */
  bands?: number[];
  /**
   * Number of lit levels when `bands` is omitted. Default: 4 (matches the
   * `light0`–`light3` asset convention).
   */
  levels?: number;
  /** Distance metric used for banding. Default: `'euclidean'` (round falloff). */
  metric?: LightDistanceMetric;
  /**
   * Naming pattern that groups atlas sprites into brushes. `{n}` is the light
   * level and `{name}` the shared base name. Every sprite matching the
   * pattern joins the brush for its `{name}`, so referencing *any* variant
   * (usually the level-0 one) in a map or tile option picks up the whole
   * brush. Default: `'light{n}/{name}'`.
   */
  variantPattern?: string;
  /**
   * Explicit brushes, overriding `variantPattern`. Key: any tile name; value:
   * one tile (name or ID) per level, brightest first. Every tile in the list,
   * plus the key itself, maps to this brush. Useful for solid-colour test
   * textures or one-off art that doesn't follow the naming convention.
   */
  brushes?: Record<string, (string | number)[]>;
  /** Whether the player's cell is a light source. Default: `true`. */
  playerLight?: boolean;
  /**
   * When `true`, light is blocked by solid cells (shadowcast via
   * `computeFov`), so it doesn't leak through walls. Default: `false`.
   */
  occlusion?: boolean;
};

/** Fully resolved palette-band settings (all defaults applied). */
export type ResolvedPaletteBands = {
  bands: number[];
  metric: LightDistanceMetric;
  variantPattern: string;
  brushes: Record<string, (string | number)[]>;
  playerLight: boolean;
  occlusion: boolean;
};

export const DEFAULT_VARIANT_PATTERN = "light{n}/{name}";
export const DEFAULT_PALETTE_LEVELS = 4;

// ---------------------------------------------------------------------------
// Option resolution
// ---------------------------------------------------------------------------

/**
 * Derive evenly spaced band thresholds (in cells) from world-unit fog
 * distances. The first band ends at `fogNear / tileSize` and the last at
 * `fogFar / tileSize`, both rounded to whole cells.
 */
export function bandsFromFog(
  fogNear: number,
  fogFar: number,
  tileSize: number,
  levels = DEFAULT_PALETTE_LEVELS,
): number[] {
  const n = Math.max(1, Math.floor(levels));
  const near = Math.max(0, Math.floor(fogNear / tileSize));
  const far = Math.max(near, Math.round(fogFar / tileSize));
  if (n === 1) return [far];
  const out: number[] = [];
  for (let i = 0; i < n; i++)
    out.push(near + Math.round((i * (far - near)) / (n - 1)));
  return out;
}

/** Apply defaults to a {@link PaletteBandsOptions} object. */
export function resolvePaletteBands(
  opts: PaletteBandsOptions | undefined,
  fogNear: number,
  fogFar: number,
  tileSize: number,
): ResolvedPaletteBands {
  const o = opts ?? {};
  const bands =
    o.bands && o.bands.length > 0
      ? [...o.bands]
      : bandsFromFog(fogNear, fogFar, tileSize, o.levels);
  return {
    bands,
    metric: o.metric ?? "euclidean",
    variantPattern: o.variantPattern ?? DEFAULT_VARIANT_PATTERN,
    brushes: o.brushes ?? {},
    playerLight: o.playerLight ?? true,
    occlusion: o.occlusion ?? false,
  };
}

// ---------------------------------------------------------------------------
// Brush / variant table
// ---------------------------------------------------------------------------

function patternToRegex(pattern: string): { re: RegExp; nFirst: boolean } {
  const ni = pattern.indexOf("{n}");
  const mi = pattern.indexOf("{name}");
  if (ni < 0 || mi < 0)
    throw new Error(
      `paletteBands: variantPattern "${pattern}" must contain both {n} and {name}`,
    );
  const escaped = pattern.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const src = escaped.replace("{n}", "(\\d+)").replace("{name}", "(.+)");
  return { re: new RegExp(`^${src}$`), nFirst: ni < mi };
}

/**
 * Build the brush lookup table: for each atlas tile ID and each level, the
 * tile ID to draw instead. Returned as a flat array indexed
 * `level * tileCount + id`, storing `variantId + 1` (0 = "no remap — draw the
 * tile as-is"), ready to upload as a `tileCount × levels` float texture.
 *
 * Brush members missing a level fall back to the nearest brighter level that
 * exists (or the tile itself).
 */
export function buildVariantTable(
  atlas: PackedAtlas,
  tileCount: number,
  levels: number,
  settings: Pick<ResolvedPaletteBands, "variantPattern" | "brushes">,
  resolver?: (name: string) => number,
): Float32Array {
  const table = new Float32Array(tileCount * levels);
  const idOf = (t: string | number): number | undefined =>
    typeof t === "number"
      ? t
      : (atlas.getByName(t)?.id ?? (resolver ? resolver(t) : undefined));

  // brush = level → tile ID; members = every tile ID that belongs to it.
  const assign = (brush: Map<number, number>, members: number[]) => {
    for (const id of members) {
      if (id < 0 || id >= tileCount) continue;
      let fallback = id;
      for (let l = 0; l < levels; l++) {
        const v = brush.get(l);
        if (v !== undefined) fallback = v;
        table[l * tileCount + id] = fallback + 1;
      }
    }
  };

  // 1. Naming-convention brushes.
  const { re, nFirst } = patternToRegex(settings.variantPattern);
  const groups = new Map<string, Map<number, number>>();
  for (const sp of atlas.sprites.values()) {
    const m = re.exec(sp.name);
    if (!m) continue;
    const level = parseInt((nFirst ? m[1] : m[2])!, 10);
    const name = (nFirst ? m[2] : m[1])!;
    let g = groups.get(name);
    if (!g) groups.set(name, (g = new Map()));
    g.set(level, sp.id);
  }
  for (const g of groups.values()) assign(g, [...g.values()]);

  // 2. Explicit brushes (applied last so they win).
  for (const [key, tiles] of Object.entries(settings.brushes)) {
    const brush = new Map<number, number>();
    const members: number[] = [];
    tiles.forEach((t, l) => {
      const id = idOf(t);
      if (id === undefined) return;
      brush.set(l, id);
      members.push(id);
    });
    const keyId = idOf(key);
    if (keyId !== undefined) members.push(keyId);
    assign(brush, members);
  }
  return table;
}

/** Remap a tile ID through a variant table built by {@link buildVariantTable}. */
export function variantFor(
  table: Float32Array,
  tileCount: number,
  id: number,
  level: number,
): number {
  if (id < 0 || id >= tileCount) return id;
  const v = table[level * tileCount + id] ?? 0;
  return v > 0 ? v - 1 : id;
}

// ---------------------------------------------------------------------------
// Light grid
// ---------------------------------------------------------------------------

function cellDistance(dx: number, dz: number, metric: LightDistanceMetric): number {
  const ax = Math.abs(dx);
  const az = Math.abs(dz);
  if (metric === "chebyshev") return Math.max(ax, az);
  if (metric === "manhattan") return ax + az;
  return Math.sqrt(dx * dx + dz * dz);
}

function levelForDistance(d: number, bands: number[]): number {
  for (let i = 0; i < bands.length; i++) if (d <= bands[i]! + 1e-6) return i;
  return -1;
}

/**
 * Fill `out` (length `width * height`) with the light level of every cell:
 * `0` = brightest variant, `levelCount` = dark (drawn in the fog colour).
 * Each cell takes the brightest level from any source.
 *
 * @param isOpaque When provided, light is shadowcast and blocked by cells for
 *                 which this returns `true` (out-of-bounds must return `true`).
 */
export function computeLightLevels(
  out: Uint8Array,
  width: number,
  height: number,
  sources: LightSource[],
  bands: number[],
  metric: LightDistanceMetric,
  isOpaque?: (x: number, z: number) => boolean,
): void {
  const levelCount = bands.length;
  out.fill(levelCount);
  for (const src of sources) {
    const sb = src.bands && src.bands.length > 0 ? src.bands : bands;
    const radius = Math.ceil(sb[sb.length - 1] ?? 0);
    const light = (x: number, z: number) => {
      if (x < 0 || z < 0 || x >= width || z >= height) return;
      const lvl = levelForDistance(cellDistance(x - src.x, z - src.z, metric), sb);
      if (lvl < 0) return;
      const i = z * width + x;
      if (lvl < out[i]!) out[i] = Math.min(lvl, levelCount);
    };
    if (isOpaque) {
      computeFov(src.x, src.z, { isOpaque, visit: light, radius });
    } else {
      for (let z = src.z - radius; z <= src.z + radius; z++)
        for (let x = src.x - radius; x <= src.x + radius; x++) light(x, z);
    }
  }
}

// ---------------------------------------------------------------------------
// GPU textures
// ---------------------------------------------------------------------------

/**
 * W×H RGBA Uint8 DataTexture holding one light level per cell in the R
 * channel (shader reads `floor(r * 255 + 0.5)`).
 */
export function makeLightLevelTexture(
  width: number,
  height: number,
): { tex: THREE.DataTexture; levels: Uint8Array; rgba: Uint8Array } {
  const rgba = new Uint8Array(Math.max(1, width * height) * 4);
  const tex = new THREE.DataTexture(
    rgba,
    Math.max(1, width),
    Math.max(1, height),
    THREE.RGBAFormat,
  );
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
  return { tex, levels: new Uint8Array(Math.max(1, width * height)), rgba };
}

/** Copy a per-cell level array into the R channel of a light-level texture. */
export function uploadLightLevels(
  levels: Uint8Array,
  rgba: Uint8Array,
  tex: THREE.DataTexture,
): void {
  for (let i = 0; i < levels.length; i++) rgba[i * 4] = levels[i]!;
  tex.needsUpdate = true;
}

/** Upload a variant table as a `tileCount × levels` float DataTexture. */
export function makeVariantTexture(
  table: Float32Array,
  tileCount: number,
  levels: number,
): THREE.DataTexture {
  const data = new Float32Array(tileCount * levels * 4);
  for (let i = 0; i < table.length; i++) data[i * 4] = table[i]!;
  const tex = new THREE.DataTexture(
    data,
    tileCount,
    levels,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Palette validation (dev tool)
// ---------------------------------------------------------------------------

/** Result of {@link findOffPaletteColors}. */
export type PaletteCheckResult = {
  /** Number of pixels whose colour is not in the palette. */
  offPalettePixels: number;
  /** Total pixels checked. */
  totalPixels: number;
  /** Up to 32 distinct offending colours as `#rrggbb` strings. */
  samples: string[];
};

/**
 * Count pixels in an RGBA byte buffer whose colour isn't in `palette`.
 * Palette entries are CSS colour strings or `0xRRGGBB` numbers.
 */
export function findOffPaletteColors(
  pixels: Uint8Array | Uint8ClampedArray,
  palette: (string | number)[],
): PaletteCheckResult {
  const allowed = new Set<number>();
  const c = new THREE.Color();
  for (const p of palette) allowed.add(c.set(p).getHex());
  const samples = new Set<string>();
  let off = 0;
  const total = Math.floor(pixels.length / 4);
  for (let i = 0; i < total; i++) {
    const hex =
      (pixels[i * 4]! << 16) | (pixels[i * 4 + 1]! << 8) | pixels[i * 4 + 2]!;
    if (allowed.has(hex)) continue;
    off++;
    if (samples.size < 32)
      samples.add("#" + hex.toString(16).padStart(6, "0"));
  }
  return { offPalettePixels: off, totalPixels: total, samples: [...samples] };
}
