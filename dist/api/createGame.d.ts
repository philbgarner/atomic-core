import { BspDungeonOptions, DungeonOutputs } from '../dungeon/bsp';
import { CellularOptions } from '../dungeon/cellular';
import { TiledMapOptions } from '../dungeon/tiled';
import { TurnAction } from '../turn/types';
import { EventEmitter } from '../events/eventEmitter';
import { FactionRegistry } from '../combat/factions';
import { CombatResolver } from '../combat/combat';
import { HiddenPassage, ObjectPlacement, EntityBase } from '../entities/types';
import { SpriteMap } from '../rendering/billboardSprites';
import { PlayerHandle } from './player';
import { KeybindingsOptions } from './keybindings';
import { ActionTransport } from '../transport/types';
import { MissionsHandle } from '../missions/types';
import { AnimationsHandle } from '../animations/types';
export type PublicRoom = {
    /** Unique room identifier — pass this to `onChooseSpawn` to spawn the player here. */
    id: number;
    type: "room" | "corridor";
    /** Top-left cell column of the room's bounding rect. */
    x: number;
    /** Top-left cell row of the room's bounding rect. */
    z: number;
    w: number;
    h: number;
    /** Centre cell column (pre-computed as `Math.floor(x + w / 2)`). */
    cx: number;
    /** Centre cell row (pre-computed as `Math.floor(z + h / 2)`). */
    cz: number;
    /** IDs of rooms/corridors directly connected to this one. */
    connections: number[];
};
export type DecorationList = {
    add(decoration: EntityBase): void;
    remove(id: string): void;
    list: EntityBase[];
};
export type PassageList = {
    toggle(id: number): void;
    list: HiddenPassage[];
};
export type ApplyTarget = "floor" | "wall" | "ceiling";
export type ColliderFlags = {
    walkable?: boolean;
    blocked?: boolean;
    lightPassable?: boolean;
};
export type SetCellOptions = {
    /** Override which surfaces receive the texture. When omitted, defaults to floor+ceiling for open cells and wall for solid cells. */
    applyTextureTo?: ApplyTarget[];
    /** Make this cell solid (true) or passable (false). Phase 2. */
    solid?: boolean;
    /** Fine-grained collider flags. Phase 2. */
    colliderFlags?: ColliderFlags;
    /** Raise (+) or lower (-) the floor surface by this many offset steps. Phase 3. */
    floorHeightOffset?: number;
    /** Lower (+) or raise (-) the ceiling surface by this many offset steps. Phase 3. */
    ceilingHeightOffset?: number;
    /** Number of upward sky panels above the wall (open-sky cells). 0–4. */
    skyPanelCount?: number;
    /** Number of downward ceiling panels hanging below the ceiling. 0–4. */
    ceilingPanelCount?: number;
    /** Floor skirt slot tile names (up to 4). Null entries inherit the default. */
    floorSkirt?: (string | null)[];
    /** Ceiling skirt slot tile names (up to 4). Null entries inherit the default. */
    ceilingSkirt?: (string | null)[];
    /** Hazard ID to write into the hazards texture (0 = none). Phase 4. */
    hazard?: number;
    /** Temperature value (0–255; 127 = neutral). Phase 4. */
    temperature?: number;
    /**
     * When true, skip syncing this change to the server. Defaults to false when a
     * transport is configured. Set to true for bulk initialisation (e.g. generate
     * callbacks) where the result is already deterministic across all clients.
     */
    skipSync?: boolean;
};
export type DungeonHandle = {
    readonly width: number;
    readonly height: number;
    /** Available after generate(). */
    readonly rooms: Record<number, PublicRoom>;
    readonly outputs: DungeonOutputs | null;
    decorations: DecorationList;
    /** Read-only list of all stationary object placements (including billboard sprites). */
    readonly objects: readonly ObjectPlacement[];
    passages: PassageList;
    passageNear(x: number, z: number, radius?: number): HiddenPassage | null;
    /** Apply per-surface overlay tile names to a cell. */
    paint(x: number, z: number, layers: SurfacePaintTarget): void;
    unpaint(x: number, z: number): void;
    /** Read-only view of the current per-cell surface paint map. Keys are "x,z" strings. */
    readonly paintMap: ReadonlyMap<string, SurfacePaintTarget>;
    /**
     * Write a sprite name and optional cell-state overrides to the cell at grid
     * coordinates `(x, y)`.  This is the primary high-level API for modifying
     * individual dungeon cells at runtime after `generate()` has been called.
     * It composes several lower-level texture writes into a single call.
     *
     * ---
     *
     * ### Texture / surface selection
     *
     * The `spriteName` is looked up in the tile atlas and written to one or more
     * render surfaces.  Which surfaces are written depends on `options.applyTextureTo`:
     *
     * - **Omitted (default):** the function reads the cell's current `solid` flag.
     *   - Solid cell (wall): writes `spriteName` to the **wall** surface only.
     *   - Open cell (floor): writes `spriteName` to both **floor** and **ceiling**.
     * - **Explicit `applyTextureTo`:** each entry in the array maps to one surface.
     *   Allowed values are `'floor'`, `'wall'`, and `'ceiling'`.  You can write to
     *   any combination in a single call, e.g. `['floor', 'ceiling']` or
     *   `['wall', 'floor']`.  The auto-detection logic above is bypassed entirely
     *   when this option is present.
     *
     * Internally, surface writes go through `dungeon.paint()`, which updates the
     * internal `paintMap` and fires a `'cell-paint'` event so the renderer refreshes
     * only the affected cell.
     *
     * ---
     *
     * ### Skirt tiles (`floorSkirt` / `ceilingSkirt`)
     *
     * Skirt tiles are thin decorative border strips that appear at the base of walls
     * (floor skirt) or at the top of walls near the ceiling (ceiling skirt).  Each
     * array holds up to four sprite-name slots corresponding to the four RGBA
     * channels of the skirt DataTexture.
     *
     * - Pass a sprite name string to set that slot.
     * - Pass `null` to leave the slot at its current/default value.
     * - Arrays shorter than 4 leave trailing slots unchanged.
     *
     * Example — set only the first skirt slot, leave the rest alone:
     * ```ts
     * game.dungeon.set(3, 7, 'stone', { floorSkirt: ['trim', null, null, null] });
     * ```
     *
     * ---
     *
     * ### Panel counts (`skyPanelCount` / `ceilingPanelCount`)
     *
     * These control how many extra vertical panel rows are rendered above or below
     * a cell's geometry edge, using the skirt base-tile system as a source for tile
     * IDs.
     *
     * - `skyPanelCount` (0–4): number of upward-facing panels above the wall top,
     *   intended for open-sky cells where the wall needs to extend visually through
     *   the sky opening.
     * - `ceilingPanelCount` (0–4): number of downward-facing panels hanging below
     *   the ceiling surface.
     *
     * Values are clamped to `[0, 4]` by the underlying helpers.
     *
     * ---
     *
     * ### Solid flag and collider flags (`solid` / `colliderFlags`)
     *
     * `solid` writes the single-byte `solid` DataTexture channel, which the renderer
     * uses to decide whether to build wall geometry for a cell.
     *
     * When `solid` is set, sensible collider flag defaults are automatically derived
     * and written to the `colliderFlags` DataTexture:
     *
     * | `solid` value | Derived `walkable` | Derived `blocked` | Derived `lightPassable` |
     * |---|---|---|---|
     * | `true`  | `false` | `true`  | `false` |
     * | `false` | `true`  | `false` | `true`  |
     *
     * Any `colliderFlags` you provide **override** the derived values on a per-flag
     * basis.  This allows combinations like a see-through wall:
     * ```ts
     * // Solid wall that still lets light pass (e.g. glass)
     * game.dungeon.set(4, 4, 'glass', {
     *   solid: true,
     *   colliderFlags: { lightPassable: true },
     * });
     * ```
     *
     * If you only provide `colliderFlags` without `solid`, only the specified flag
     * bits are merged into the existing byte; `solid` is left untouched.
     *
     * The three flag bit-masks exported from the library are:
     * - `IS_WALKABLE`       (`0x01`) — normal movement permitted
     * - `IS_BLOCKED`        (`0x02`) — movement blocked (wall/obstacle)
     * - `IS_LIGHT_PASSABLE` (`0x04`) — line-of-sight and light passes through
     *
     * ---
     *
     * ### Height offsets (`floorHeightOffset` / `ceilingHeightOffset`)
     *
     * Both values are **signed step counts** relative to the cell's default height.
     * Positive raises the floor / lowers the ceiling; negative does the opposite.
     * The values are encoded as unsigned bytes centred on `128` (= no offset) before
     * being written to the respective R8 DataTexture:
     *
     * - `floorHeightOffset`: stored as `clamp(128 + steps, 1, 255)`.  Raw `0` is
     *   reserved for pit cells (no floor geometry) and is never written by this
     *   function.
     * - `ceilingHeightOffset`: stored as `clamp(128 + steps, 0, 255)`.  The
     *   encoding convention is inverted in the shader — a positive `steps` value
     *   here lowers the ceiling, matching the intuitive idea of "shrinking the room
     *   from the top".
     *
     * Both textures are optional fields on `DungeonOutputs`; if they are absent
     * (e.g. for tiled dungeon outputs that don't generate them) the write is a
     * silent no-op.
     *
     * ```ts
     * // Raise the floor by one step — creates a raised platform effect
     * game.dungeon.set(5, 5, 'stone', { floorHeightOffset: 1 });
     *
     * // Raise the ceiling by two steps — makes a taller room section
     * game.dungeon.set(5, 5, 'stone', { ceilingHeightOffset: -2 });
     * ```
     *
     * ---
     *
     * ### Not-yet-wired options (`hazard` / `temperature`)
     *
     * `hazard` and `temperature` are defined on `SetCellOptions` for forward
     * compatibility but are **not written** by this function in the current version
     * (Phase 4, not yet implemented).  Passing them has no effect.
     *
     * ---
     *
     * ### Prerequisites
     *
     * `generate()` must have been called before `set()`.  If no dungeon has been
     * generated yet, the function returns silently without writing anything.
     *
     * @param x - Cell column index (0-based, left-to-right).
     * @param y - Cell row index (0-based, top-to-bottom).
     * @param spriteName - Name of the sprite as defined in the tile atlas JSON.
     *   Must match an entry in `atlas.json`; unrecognised names are treated as
     *   transparent / empty.
     * @param options - Optional overrides.  All fields are independent; you can
     *   combine any subset in a single call.
     */
    set(x: number, y: number, spriteName: string, options?: SetCellOptions): void;
};
export type TurnsHandle = {
    /** Current turn counter. */
    readonly turn: number;
    /**
     * Commit a player action and run all other actors until the player's next turn.
     * Resolves after all registered animation handlers have completed.
     * In multiplayer mode resolves immediately after the action is forwarded to
     * the server; animation handlers fire from the onStateUpdate reconciliation path.
     */
    commit(action: TurnAction): Promise<void>;
    addActor(entity: EntityBase): void;
    removeActor(id: string): void;
};
export type PlayerOptions = {
    /** Override the auto-generated player ID. Required when using a transport
     *  so the local ID matches the server-assigned one. */
    id?: string;
    x?: number;
    z?: number;
    hp?: number;
    maxHp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    spriteName?: string;
    faction?: string;
    blocksMove?: boolean;
};
export type OnPlaceContext = {
    rooms: PublicRoom[];
    endRoom: PublicRoom;
    startRoom: PublicRoom;
    rng: {
        next(): number;
        chance(p: number): boolean;
    };
    place: PlaceAPI;
};
export type PlaceAPI = {
    object(x: number, z: number, type: string, meta?: Record<string, unknown>): void;
    /**
     * Place a stationary camera-facing billboard sprite at a grid cell.
     * The placement is stored in `game.dungeon.objects` and rendered when passed
     * to `renderer.setObjects(game.dungeon.objects)`.
     */
    billboard(x: number, z: number, type: string, spriteMap: SpriteMap, opts?: Pick<ObjectPlacement, "offsetX" | "offsetZ" | "offsetY" | "yaw" | "scale" | "meta">): void;
    npc(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
    enemy(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
    decoration(x: number, z: number, type: string, opts?: Record<string, unknown>): void;
    surface(x: number, z: number, layers: SurfacePaintTarget): void;
};
/**
 * Passed to `onChooseSpawn` so you can inspect the dungeon layout before
 * committing to a spawn room.
 *
 * `rooms` contains every room and corridor in the dungeon.
 * `startRoom` is the default player-start room (furthest from the exit).
 * `endRoom` is the exit room.
 *
 * Return any `room.id` from the list and the player will be placed at that
 * room's centre cell.
 */
export type SpawnChooserContext = {
    rooms: PublicRoom[];
    startRoom: PublicRoom;
    endRoom: PublicRoom;
};
export type DungeonOptions = (BspDungeonOptions & {
    cellular?: never;
    tiled?: never;
    onPlace?: (ctx: OnPlaceContext) => void;
    /**
     * Override where the player spawns.
     *
     * Called during `game.generate()` **before** the player position is written
     * and before FOV / minimap exploration is computed, so returning a different
     * room here has no side-effects on the explored state.
     *
     * Ignored if `player.x` / `player.z` are set explicitly in `createGame` options.
     *
     * Return the `id` of any room from `ctx.rooms` (only rooms with
     * `type === "room"` are included — corridors are filtered out).
     * The player will be placed at that room's centre cell.
     *
     * @example
     * onChooseSpawn({ rooms }) {
     *   // spawn in the largest room
     *   return rooms.reduce((best, r) =>
     *     r.w * r.h > best.w * best.h ? r : best
     *   ).id;
     * }
     */
    onChooseSpawn?: (ctx: SpawnChooserContext) => number;
}) | (CellularOptions & {
    cellular: true;
    tiled?: never;
    onPlace?: (ctx: OnPlaceContext) => void;
    /**
     * Override where the player spawns.
     *
     * Called during `game.generate()` **before** the player position is written
     * and before FOV / minimap exploration is computed, so returning a different
     * room here has no side-effects on the explored state.
     *
     * Ignored if `player.x` / `player.z` are set explicitly in `createGame` options.
     *
     * Return the `id` of any room from `ctx.rooms`.
     * The player will be placed at that room's centre cell.
     */
    onChooseSpawn?: (ctx: SpawnChooserContext) => number;
}) | {
    tiled: {
        map: unknown;
    } & Omit<TiledMapOptions, "layers"> & {
        layers?: TiledMapOptions["layers"];
    };
    cellular?: never;
    onPlace?: (ctx: OnPlaceContext) => void;
    onChooseSpawn?: never;
};
export type CombatOptions = {
    /**
     * Custom combat resolver. Receives attacker, defender, and engine context;
     * returns a CombatResult. The engine applies hp reduction and alive flag
     * from the result. When omitted, the engine performs a faction-stance check
     * only — non-hostile attacks are blocked, hostile attacks produce no damage.
     */
    resolver?: CombatResolver;
    onDamage?: (args: {
        attacker: EntityBase;
        defender: EntityBase;
        amount: number;
    }) => void;
    onDeath?: (args: {
        entity: EntityBase;
        killer?: EntityBase;
    }) => void;
    onMiss?: (args: {
        attacker: EntityBase;
        defender: EntityBase;
    }) => void;
};
export type PassagesOptions = {
    traversalFactor?: number;
    onToggle?: (args: {
        passage: HiddenPassage;
        enabled: boolean;
    }) => void;
    onTraverse?: (args: {
        passage: HiddenPassage;
        progress: number;
    }) => void;
};
export type TurnsOptions = {
    onAdvance?: (args: {
        turn: number;
        dt: number;
    }) => void;
};
export type RenderingOptions = {
    atlas?: string;
    atlasJson?: string;
    characterAtlas?: string;
    characterAtlasJson?: string;
    tileSize?: number;
    torch?: {
        color?: string;
        intensity?: number;
        fogNear?: number;
        fogFar?: number;
    };
};
export type GameOptions = {
    dungeon: DungeonOptions;
    player?: PlayerOptions;
    combat?: CombatOptions;
    passages?: PassagesOptions;
    turns?: TurnsOptions;
    rendering?: RenderingOptions;
    /**
     * Optional action transport. When set, game.turns.commit() forwards actions
     * to the server instead of applying them locally. The server validates each
     * action and broadcasts a state update; createGame() reconciles that update
     * back into the local turn state automatically.
     *
     * Omit for single-player — no runtime overhead at all.
     */
    transport?: ActionTransport;
};
export type GameHandle = {
    player: PlayerHandle;
    turns: TurnsHandle;
    dungeon: DungeonHandle;
    events: EventEmitter;
    /** Faction registry — set stances at runtime before or after generate(). */
    factions: FactionRegistry;
    /** Mission/quest system. Add evaluator-driven missions that auto-complete each turn. */
    missions: MissionsHandle;
    /**
     * Register async animation handlers that fire after each turn, before entity
     * positions are synced to the render layer. Works in both single-player and
     * multiplayer (multiplayer events are reconstructed from state diffs).
     */
    animations: AnimationsHandle;
    /** Generate the dungeon and start the game. Call after attaching all callbacks. */
    generate(): Promise<void>;
    /**
     * Tear down the current dungeon, reset all spawned actors and decorations,
     * restore the player to full health, and regenerate from the current dungeon
     * config (including any seed change made before calling this).
     */
    regenerate(): Promise<void>;
    /** Unmount and clean up all listeners. */
    destroy(): void;
};
type SpawnCallback = (ctx: {
    dungeon: DungeonHandle;
    roomId: number;
    x: number;
    y: number;
}) => EntityBase | EntityBase[] | null | undefined;
type DecoratorCallback = (ctx: {
    dungeon: DungeonHandle;
    roomId: number;
    x: number;
    y: number;
}) => EntityBase | EntityBase[] | null | undefined;
/** Per-surface overlay tile names for a single cell. Each key is optional. */
export type SurfacePaintTarget = {
    /** Tile names to overlay on the floor face of this cell. Up to 4. */
    floor?: string[];
    /** Tile names to overlay on wall faces of this cell. Up to 4. */
    wall?: string[];
    /** Tile names to overlay on the ceiling face of this cell. Up to 4. */
    ceil?: string[];
    /** Base tile name per ceiling-skirt row. Index 0 = row closest to the wall top. Null entries inherit the default base. */
    ceilSkirtBase?: (string | null)[];
    /** Base tile name per floor-skirt row. Index 0 = row closest to the wall bottom. Null entries inherit the default base. */
    floorSkirtBase?: (string | null)[];
    /** Tile names for sky panels above the wall (open-sky cells). Index 0 = immediately above the wall top. Null entries use default. */
    skyPanels?: (string | null)[];
    /** Tile names for ceiling panels hanging below the ceiling. Index 0 = immediately below the ceiling. Null entries use default. */
    ceilingPanels?: (string | null)[];
};
type SurfacePainterCallback = (ctx: {
    dungeon: DungeonHandle;
    roomId: number;
    x: number;
    y: number;
}) => SurfacePaintTarget | null | undefined;
export type MinimapOptions = {
    /** Canvas size in pixels. Default: 196. */
    size?: number;
    /** Whether to draw entity positions. Default: true. */
    showEntities?: boolean;
    colors?: {
        /** Floor in current LOS. Default: "#aab" */
        floor?: string;
        /** Floor explored but outside LOS. Default: "#445" */
        floorDim?: string;
        /** Wall adjacent to a visible cell. Default: "#777" */
        wall?: string;
        /** Wall adjacent to explored-only cells. Default: "#333" */
        wallDim?: string;
        player?: string;
        npc?: string;
        enemy?: string;
    };
};
/**
 * Create a game handle. Does not generate the dungeon — call `game.generate()`
 * after attaching callbacks.
 */
export declare function createGame(canvas: HTMLElement, options: GameOptions): GameHandle;
/**
 * Wire up a 2D canvas minimap that redraws on every `turn` event.
 */
export declare function attachMinimap(game: GameHandle, canvas: HTMLCanvasElement, opts?: MinimapOptions): void;
/**
 * Register a spawn callback. Called per room during `generate()`.
 */
export declare function attachSpawner(game: GameHandle, opts: {
    onSpawn: SpawnCallback;
}): void;
/**
 * Register a decorator callback. Called per floor tile during `generate()`.
 */
export declare function attachDecorator(game: GameHandle, opts: {
    onDecorate: DecoratorCallback;
}): void;
/**
 * Register a surface painter callback. Called per floor tile during `generate()`.
 */
export declare function attachSurfacePainter(game: GameHandle, opts: {
    onPaint: SurfacePainterCallback;
}): void;
/**
 * Install keyboard bindings. Wraps `createKeybindings` and registers the
 * handle with the game so it is cleaned up on `destroy()`.
 */
export declare function attachKeybindings(game: GameHandle, opts: KeybindingsOptions): void;
export {};
//# sourceMappingURL=createGame.d.ts.map