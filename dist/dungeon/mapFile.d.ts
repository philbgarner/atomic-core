import { BspDungeonOptions, BspDungeonOutputs } from './bsp';
import { SerializedDungeon } from './serialize';
import { DungeonRendererOptions } from '../rendering/dungeonRenderer';
/** Optional author-supplied metadata embedded in the map file. */
export type DungeonMapMeta = {
    title?: string;
    description?: string;
    author?: string;
    tags?: string[];
};
/**
 * Subset of DungeonRendererOptions that is JSON-safe.
 * Excludes packedAtlas, tileNameResolver, and event callbacks —
 * re-supply those at load time when creating the renderer.
 */
export type SerializedRendererOptions = Omit<DungeonRendererOptions, "packedAtlas" | "tileNameResolver" | "onCellClick" | "onCellHover">;
/**
 * Self-contained dungeon map file. Contains everything needed to reproduce
 * the same dungeon and renderer state exactly, except the packed sprite atlas
 * and any runtime callbacks (re-supply those at load time).
 *
 * The `version` field matches the atomic-core npm package version at export
 * time and can be used to gate backward-compatibility logic on import.
 */
export type DungeonMapFile = {
    /** atomic-core npm package version at export time. */
    version: string;
    /** ISO 8601 timestamp of export. */
    exportedAt: string;
    /** Optional author-supplied metadata. */
    meta?: DungeonMapMeta;
    /** BSP options used to generate this dungeon, including the resolved seed. */
    generatorOptions: BspDungeonOptions;
    /** JSON-safe renderer options (callbacks and PackedAtlas excluded). */
    rendererOptions: SerializedRendererOptions;
    /** Serialized dungeon texture data. */
    dungeon: SerializedDungeon;
};
/** Options passed to exportDungeonMap. */
export type ExportOptions = {
    /** Author-supplied metadata to embed in the file. */
    meta?: DungeonMapMeta;
    /** BSP generation options used to produce this dungeon (must include seed). */
    generatorOptions: BspDungeonOptions;
    /**
     * Renderer options to embed. Callbacks and non-serializable fields
     * (packedAtlas, tileNameResolver, onCellClick, onCellHover) are
     * stripped automatically.
     */
    rendererOptions?: DungeonRendererOptions;
    /**
     * Supply game.dungeon.paintMap here to persist surface-painter overlays.
     * The map is already plain strings so no stripping is needed.
     */
    paintMap?: ReadonlyMap<string, {
        floor?: string[];
        wall?: string[];
        ceil?: string[];
    }>;
};
/** Returned by importDungeonMap / dungeonMapFromJson. */
export type ImportResult = {
    dungeon: BspDungeonOutputs;
    generatorOptions: BspDungeonOptions;
    rendererOptions: SerializedRendererOptions;
    meta: DungeonMapMeta | undefined;
    /** The atomic-core version that produced this file. */
    version: string;
    /**
     * Restored surface-painter overlays, if the file contained them.
     * Re-apply via game.dungeon.paint(x, z, target) after game.generate().
     */
    paintMap?: Record<string, {
        floor?: string[];
        wall?: string[];
        ceil?: string[];
    }>;
};
/**
 * Snapshot a dungeon and all settings needed to reproduce it into a
 * plain, JSON-safe DungeonMapFile object.
 *
 * Pass `generatorOptions` with the same values used in generateBspDungeon,
 * including the resolved numeric seed so the room graph can be reconstructed.
 */
export declare function exportDungeonMap(dungeon: BspDungeonOutputs, options: ExportOptions): DungeonMapFile;
/**
 * Serialize a dungeon and its settings to a JSON string.
 */
export declare function dungeonMapToJson(dungeon: BspDungeonOutputs, options: ExportOptions): string;
/**
 * Reconstruct a dungeon from a DungeonMapFile.
 *
 * The returned `dungeon` is ready to pass to buildDungeon / syncEntities.
 * Note: surface-painter overlays are zeroed on import (not serialized) —
 * call game.dungeon.paint() to reapply them.
 * Re-supply packedAtlas and tileNameResolver when creating the renderer.
 */
export declare function importDungeonMap(data: DungeonMapFile): ImportResult;
/**
 * Parse a JSON string produced by dungeonMapToJson and reconstruct the dungeon.
 */
export declare function dungeonMapFromJson(json: string): ImportResult;
//# sourceMappingURL=mapFile.d.ts.map