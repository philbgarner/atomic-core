import { DungeonOutputs, RoomedDungeonOutputs } from './bsp';
import * as THREE from "three";
export type { DungeonOutputs, RoomedDungeonOutputs };
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
    /**
     * Depress the floor toward the interior of each room's sub-voronoi regions,
     * creating organic cave-floor depressions. Each room is split into `floorSubSeeds`
     * sub-regions; the floor dips deepest at sub-region centers and rises to neutral at
     * room/sub-region boundaries. Mixed with Perlin noise for organic variation.
     * Default: false
     */
    vaultedFloor?: boolean;
    /**
     * Number of sub-seed points used to subdivide each room's voronoi region.
     * More seeds create more distinct depressions per room.
     * Default: 2
     */
    floorSubSeeds?: number;
    /**
     * Maximum floor depression (in offset steps) at the deepest sub-region center.
     * One step = mapCellGeometrySize * offsetFactor (default: tileSize * 0.5).
     * Default: 3
     */
    floorMaxSteps?: number;
    /**
     * Perlin noise spatial frequency for floor perturbation.
     * Default: 0.08
     */
    floorNoiseFrequency?: number;
    /**
     * Amplitude of the Perlin noise floor perturbation in offset steps.
     * Default: 2
     */
    floorNoiseSteps?: number;
    /**
     * Overall multiplier applied to the combined floor depression (distance + noise).
     * Values > 1 produce deeper depressions; values < 1 produce shallower floors.
     * Default: 1
     */
    floorHeightScale?: number;
    /**
     * Weight of the sub-region distance term in the floor depression formula.
     * 0 = no distance contribution; 1 = full contribution.
     * Default: 1
     */
    floorDistanceToEdgeWeight?: number;
    /**
     * Weight of the Perlin noise term in the floor depression formula.
     * 0 = no noise contribution; 1 = full contribution.
     * Default: 1
     */
    floorNoiseWeight?: number;
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
        /**
         * Per-cell floor height offset (R8). Encoding: 128 = no offset, >128 = floor raised,
         * <128 = floor lowered, 0 = pit marker.
         * When `vaultedFloor` is enabled, each room's voronoi region is subdivided by
         * `floorSubSeeds` internal points; the floor is depressed toward those centers
         * (using sub-region distance-to-edge), mixed with Perlin noise.
         */
        floorHeightOffset: THREE.DataTexture;
        colliderFlags: THREE.DataTexture;
        floorSkirtType: THREE.DataTexture;
        ceilSkirtType: THREE.DataTexture;
    };
};
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
export declare function generateCellularDungeon(options: CellularOptions): CellularDungeonOutputs;
//# sourceMappingURL=cellular.d.ts.map