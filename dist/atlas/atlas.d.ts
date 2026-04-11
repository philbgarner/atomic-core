/** A tile entry with UV pixel coordinates in the atlas sheet. */
export type AtlasEntry = {
    id: number;
    name: string;
    uv: [number, number];
};
/** Sprite entry - may have a non-square size in pixels. */
export type AtlasSpriteEntry = {
    id: number;
    name: string;
    uv: [number, number];
    /** Pixel dimensions [w, h]. Omitted when the tile is tileSize × tileSize. */
    size?: [number, number];
};
/**
 * Floor/wall "typed" entry. id 0 ("none") has no uv and means "use no tile".
 * All other ids have a uv.
 */
export type AtlasTypedEntry = {
    id: 0;
    name: string;
} | {
    id: number;
    name: string;
    uv: [number, number];
};
export type AtlasData = {
    tileSize: number;
    architecture: AtlasEntry[];
    floorTypes: AtlasTypedEntry[];
    wallTypes: AtlasTypedEntry[];
    ceilingTypes: AtlasTypedEntry[];
    overlays: AtlasEntry[];
    wallOverlays: AtlasEntry[];
    ceilingOverlays: AtlasEntry[];
    water: AtlasEntry[];
    sprites: AtlasSpriteEntry[];
    aoOverlays: AtlasEntry[];
};
export type AtlasLookup<T extends {
    id: number;
    name: string;
}> = {
    /** Returns the full entry or undefined if the name is not found. */
    byName(name: string): T | undefined;
    /**
     * Returns the numeric id for the given tile name.
     * Returns 0 (none/no-tile) if the name is not found.
     */
    idByName(name: string): number;
};
/** Pre-built name→entry lookup tables for every atlas category. */
export type AtlasIndex = {
    data: AtlasData;
    architecture: AtlasLookup<AtlasEntry>;
    floorTypes: AtlasLookup<AtlasTypedEntry>;
    wallTypes: AtlasLookup<AtlasTypedEntry>;
    ceilingTypes: AtlasLookup<AtlasTypedEntry>;
    overlays: AtlasLookup<AtlasEntry>;
    wallOverlays: AtlasLookup<AtlasEntry>;
    ceilingOverlays: AtlasLookup<AtlasEntry>;
    water: AtlasLookup<AtlasEntry>;
    sprites: AtlasLookup<AtlasSpriteEntry>;
    aoOverlays: AtlasLookup<AtlasEntry>;
};
/**
 * Build an AtlasIndex from the raw atlas.json data.
 *
 * @example
 * import atlasJson from "../public/textures/atlas.json";
 * const atlas = buildAtlasIndex(atlasJson as AtlasData);
 * const floorId = atlas.floorTypes.idByName("Cobblestone"); // 1
 */
export declare function buildAtlasIndex(data: AtlasData): AtlasIndex;
//# sourceMappingURL=atlas.d.ts.map