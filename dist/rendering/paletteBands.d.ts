import { PackedAtlas } from './textureLoader';
import * as THREE from "three";
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
export declare const DEFAULT_VARIANT_PATTERN = "light{n}/{name}";
export declare const DEFAULT_PALETTE_LEVELS = 4;
/**
 * Derive evenly spaced band thresholds (in cells) from world-unit fog
 * distances. The first band ends at `fogNear / tileSize` and the last at
 * `fogFar / tileSize`, both rounded to whole cells.
 */
export declare function bandsFromFog(fogNear: number, fogFar: number, tileSize: number, levels?: number): number[];
/** Apply defaults to a {@link PaletteBandsOptions} object. */
export declare function resolvePaletteBands(opts: PaletteBandsOptions | undefined, fogNear: number, fogFar: number, tileSize: number): ResolvedPaletteBands;
/**
 * Build the brush lookup table: for each atlas tile ID and each level, the
 * tile ID to draw instead. Returned as a flat array indexed
 * `level * tileCount + id`, storing `variantId + 1` (0 = "no remap — draw the
 * tile as-is"), ready to upload as a `tileCount × levels` float texture.
 *
 * Brush members missing a level fall back to the nearest brighter level that
 * exists (or the tile itself).
 */
export declare function buildVariantTable(atlas: PackedAtlas, tileCount: number, levels: number, settings: Pick<ResolvedPaletteBands, "variantPattern" | "brushes">, resolver?: (name: string) => number): Float32Array;
/** Remap a tile ID through a variant table built by {@link buildVariantTable}. */
export declare function variantFor(table: Float32Array, tileCount: number, id: number, level: number): number;
/**
 * Fill `out` (length `width * height`) with the light level of every cell:
 * `0` = brightest variant, `levelCount` = dark (drawn in the fog colour).
 * Each cell takes the brightest level from any source.
 *
 * @param isOpaque When provided, light is shadowcast and blocked by cells for
 *                 which this returns `true` (out-of-bounds must return `true`).
 */
export declare function computeLightLevels(out: Uint8Array, width: number, height: number, sources: LightSource[], bands: number[], metric: LightDistanceMetric, isOpaque?: (x: number, z: number) => boolean): void;
/**
 * W×H RGBA Uint8 DataTexture holding one light level per cell in the R
 * channel (shader reads `floor(r * 255 + 0.5)`).
 */
export declare function makeLightLevelTexture(width: number, height: number): {
    tex: THREE.DataTexture;
    levels: Uint8Array;
    rgba: Uint8Array;
};
/** Copy a per-cell level array into the R channel of a light-level texture. */
export declare function uploadLightLevels(levels: Uint8Array, rgba: Uint8Array, tex: THREE.DataTexture): void;
/** Upload a variant table as a `tileCount × levels` float DataTexture. */
export declare function makeVariantTexture(table: Float32Array, tileCount: number, levels: number): THREE.DataTexture;
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
export declare function findOffPaletteColors(pixels: Uint8Array | Uint8ClampedArray, palette: (string | number)[]): PaletteCheckResult;
//# sourceMappingURL=paletteBands.d.ts.map