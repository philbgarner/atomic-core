import * as THREE from "three";
export type Point = {
    x: number;
    y: number;
};
export type Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
};
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
/**
 * Builds a combined region-id array where corridor floor cells (regionId === 0
 * in the original texture) are flood-filled into unique IDs.
 *
 * Useful when working with a plain `DungeonOutputs` that lacks the
 * pre-computed `fullRegionIds` field (e.g. after deserialization).
 */
export declare function buildFullRegionIds(regionIdData: Uint8Array, solidData: Uint8Array, W: number, H: number, firstId: number): {
    fullRegionIds: Uint8Array;
    corridorRegionIds: number[];
};
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
export declare function generateBspDungeon(options: BspDungeonOptions): BspDungeonOutputs;
/**
 * Write floor skirt overlay tile IDs for a single cell.
 * `tiles` is an array of up to 4 numeric tile IDs corresponding to RGBA slots 1–4.
 * Missing entries are left unchanged; pass 0 to clear a slot.
 */
export declare function setFloorSkirtTiles(outputs: DungeonOutputs, cx: number, cz: number, tiles: number[]): void;
/**
 * Write ceiling skirt overlay tile IDs for a single cell.
 * `tiles` is an array of up to 4 numeric tile IDs corresponding to RGBA slots 1–4.
 * Missing entries are left unchanged; pass 0 to clear a slot.
 */
export declare function setCeilSkirtTiles(outputs: DungeonOutputs, cx: number, cz: number, tiles: number[]): void;
/**
 * Set the number of sky panels (upward-facing vertical quads above the wall) for
 * a single cell. Panels are emitted on all wall faces (adjacent to solid neighbours)
 * going up from y = ceilingHeight; row 0 is immediately above the wall.
 *
 * Intended for open-sky cells (ceilingHeightOffset === 0) so the panels extend
 * visibly through the sky opening. Count is clamped to [0, 4].
 */
export declare function setSkyPanelCount(outputs: DungeonOutputs, cx: number, cz: number, count: number): void;
/**
 * Set the number of ceiling panels (downward-facing vertical quads below the ceiling)
 * for a single cell. Panels are emitted on all wall faces (adjacent to solid neighbours)
 * hanging down from y = ceilingHeight; row 0 is immediately below the ceiling.
 *
 * Count is clamped to [0, 4].
 */
export declare function setCeilingPanelCount(outputs: DungeonOutputs, cx: number, cz: number, count: number): void;
export declare function setSolid(outputs: DungeonOutputs, cx: number, cz: number, solid: boolean): void;
export declare function setColliderFlagsCell(outputs: DungeonOutputs, cx: number, cz: number, flags: {
    walkable?: boolean;
    blocked?: boolean;
    lightPassable?: boolean;
}): void;
export declare function setFloorHeightOffset(outputs: DungeonOutputs, cx: number, cz: number, steps: number): void;
export declare function setCeilingHeightOffset(outputs: DungeonOutputs, cx: number, cz: number, steps: number): void;
//# sourceMappingURL=bsp.d.ts.map