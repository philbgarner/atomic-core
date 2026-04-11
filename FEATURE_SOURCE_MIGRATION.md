# Feature Source Migration Plan

Maps each feature from `FEATURE_SOURCE_MAP.md` to its target location in `src/lib`, and documents what must change to turn the old game-specific code into a general-purpose framework that matches the `README.md` API contract.

---

## Guiding principles

| Old code style | New library style |
|---|---|
| React hooks (`useXxx`) for all state | Imperative classes / pure functions; hooks are optional adapters |
| Hardcoded game constants (atlas IDs, tile maps, sprite keys) | Developer-supplied config passed at `createGame()` time |
| `DEFAULT_MONSTER_TEMPLATES` (goblin, orc, etc.) | No built-in entity types; factories accept arbitrary config |
| `useGameState.ts` as a monolithic god-hook | Decomposed modules wired by the core `Game` object |
| Game-specific files (`tea.ts`, `tutorial/`, `makeTeaomaticProto`) | Deleted; not ported |
| `THREE.DataTexture` in dungeon types | Keep (renderer-level detail); document clearly |
| Hard-coupled combat in game state | Extracted, configurable `Combat` module |
| Events via React state dispatch | Standalone `EventEmitter` (`game.events.on`) |

---

## Target directory structure

```
src/lib/
  dungeon/
    bsp.ts
    cellular.ts
    serialize.ts
    tiled.ts
    themes.ts
  turn/
    scheduler.ts
    system.ts
    types.ts
    actionCosts.ts
    events.ts
  entities/
    types.ts
    factory.ts
    inventory.ts
    effects.ts
  ai/
    monsterAI.ts
    astar.ts
    fov.ts
    spatial.ts
  combat/
    combat.ts
    factions.ts
  passages/
    traversal.ts
    mask.ts
  rendering/
    torchLighting.ts
    camera.ts
    tileAtlas.ts
    temperatureMask.ts
  atlas/
    atlas.ts
  events/
    eventEmitter.ts
  utils/
    rng.ts
    geometry.ts
    minimap.ts
  api/
    createGame.ts
    player.ts
    actions.ts
    keybindings.ts
  index.ts
```

---

## Per-feature migration

---

### First-person 3D dungeon rendering with torch lighting and fog

**Target files:** `src/lib/rendering/`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/rendering/torchLighting.ts` | `rendering/torchLighting.ts` | Mostly copy. Move `DEFAULT_TORCH_COLOR`, `DEFAULT_TORCH_INTENSITY`, `DEFAULT_BAND_NEAR` to defaults object; expose them as named exports so the developer can override in `rendering.torch` config. |
| `roguelike-mazetools/src/rendering/useDungeonCamera.ts` | `rendering/camera.ts` | Rewrite as a plain class or factory function (`createCamera(options)`), not a React hook. Wall-collision logic (`tryMove`, `MARGIN`) is pure math — keep as-is. Export `CameraState` type. `moveLerpMs` and `fov` become constructor options. |
| `src/libold/src/hooks/useEotBCamera.ts` | `rendering/camera.ts` | Merge EotB-style movement into the same `camera.ts` module as a secondary export (`createEotBCamera`). Remove React dep. `MoveActions` type becomes part of the keybindings API. |
| `roguelike-mazetools/src/rendering/tileAtlas.ts` | `rendering/tileAtlas.ts` | Copy as-is. Pure functions, no game specifics. |
| `src/libold/src/gameConstants.ts` (rendering slice only) | `rendering/camera.ts` + `api/createGame.ts` | `TILE_SIZE` and `CEILING_H` become `rendering.tileSize` in the config; `TILE_PX`, `ATLAS_SHEET_W/H` become internal constants derived from the loaded atlas JSON. Do **not** port hardcoded UV constant arrays (`FLOOR_TILE_MAP`, etc.) — these depend on a specific atlas file. |

---

### BSP dungeon generator

**Target files:** `src/lib/dungeon/`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/bsp.ts` | `dungeon/bsp.ts` | Copy types and generator. Remove any import of `gameConstants.ts` or game-specific atlas defaults. `DungeonOutputs` and `BspDungeonOutputs` are kept as-is (the `THREE.DataTexture` channels are correct at the framework level). |
| `roguelike-mazetools/src/bspHelpers.ts` | `utils/geometry.ts` | Merge `MinHeap<T>` and `octile()` into the shared geometry utilities file. |
| `roguelike-mazetools/src/cellular.ts` | `dungeon/cellular.ts` | Copy as-is. Shares `DungeonOutputs` shape — compatible out of the box. |
| `roguelike-mazetools/src/serialize.ts` | `dungeon/serialize.ts` | Copy as-is. Pure serialization with no game-specific references. |
| `src/libold/src/themes.ts` | `dungeon/themes.ts` | Keep `ThemeDef` type and `THEMES` defaults as a reference set (dungeon, crypt, catacomb, industrial, ruins). Expose a `registerTheme(name, def)` function so library consumers can add or override themes without editing framework code. The `themes` field in `dungeon` config accepts a string key, array of keys with weights, or a `({ room, rng }) => string` callback — all resolved via the theme registry. |
| `src/libold/src/hooks/useDungeonSetup.ts` | `dungeon/bsp.ts` + `api/createGame.ts` | Extract the BSP setup path into `dungeon/bsp.ts` as a `setupDungeon(options)` function. The React hook wrapper is discarded; `createGame()` calls `setupDungeon()` internally. |

---

### Tiled map import

**Target files:** `src/lib/dungeon/tiled.ts`

| Source | Target | Changes required |
|---|---|---|
| `src/libold/src/hooks/useDungeonSetup.ts` (Tiled path) | `dungeon/tiled.ts` | Extract the Tiled map loading logic into a standalone `loadTiledMap(tiledJson, options)` function returning `DungeonOutputs`. Remove React, remove hardcoded layer-name assumptions — everything comes from the `layers` config map. |
| `roguelike-mazetools/src/content.ts` | `entities/types.ts` | `ObjectPlacement`, `MobilePlacement`, `HiddenPassage` interfaces move here (see Entities section). Tiled parser references them via import. |

The `objectTypes` map (`'NPC_Villager' → 'npc:villager'`) and `tilesetMap` are passed in by the developer; the library has no built-in knowledge of specific type strings.

---

### Turn-based scheduler with priority queue

**Target files:** `src/lib/turn/`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/turn/turnScheduler.ts` | `turn/scheduler.ts` | Copy as-is. Pure class with no game dependencies. |
| `roguelike-mazetools/src/turn/turnSystem.ts` | `turn/system.ts` | Copy `createTurnSystemState`, `tickUntilPlayer`, `commitPlayerAction`. Remove `defaultApplyAction` game-specific logic (door-opening, item pickup, etc.) — move to the configurable `applyAction` callback. Keep `defaultComputeCost` as a sensible default export. |
| `roguelike-mazetools/src/turn/turnTypes.ts` | `turn/types.ts` | Copy. `RpsEffect` moves to `entities/effects.ts` since it is a combat/status concept. |
| `roguelike-mazetools/src/turn/actionCosts.ts` | `turn/actionCosts.ts` | Copy as-is. |
| `roguelike-mazetools/src/turn/turnEvents.ts` | `turn/events.ts` | Copy event types. Extend `TurnEvent` union to include `chest-open`, `item-pickup`, `turn`, `win`, `lose`, `audio` events to match the full README `game.events` API. |
| `roguelike-mazetools/src/actions.ts` | `api/actions.ts` | Copy `createActionPipeline`, `ActionMiddleware`, `ActionContext`. This is the extension point for `turns.commit()`. |

The turn system exposes `game.turns.commit()`, `game.turns.addActor()`, `game.turns.removeActor()`, and the `onAdvance` callback — all defined in the README. These are wired in `api/createGame.ts`.

---

### Entity system: player, NPCs, enemies, items, chests

**Target files:** `src/lib/entities/`

| Source | Target | Changes required |
|---|---|---|
| `src/libold/src/player.ts` | `api/player.ts` | Replace thin `Player` interface with the full reactive player handle from the README: `x`, `z`, `hp`, `facing`, `inventory`, `alive`, plus action methods (`move`, `rotate`, `interact`, `wait`, `pickup`, `useItem`, `dropItem`, `heal`). Implement as a plain class, not a React state shape. |
| `roguelike-mazetools/src/turn/turnTypes.ts` | `entities/types.ts` | Port `ActorBase`, `PlayerActor`, `MonsterActor`. Merge with `MobilePlacement` from `content.ts` to form the unified entity base interface described in the README (`id`, `kind`, `type`, `sprite`, `x`, `z`, `hp`, `maxHp`, `attack`, `defense`, `speed`, `alive`, `blocksMove`, `faction`, `tick`). |
| `roguelike-mazetools/src/turn/createActors.ts` | `entities/factory.ts` | Port `createPlayerActor()` and `createMonsterFromPlacement()` as `createNpc()` and `createEnemy()`. **Remove `DEFAULT_MONSTER_TEMPLATES`** entirely — the framework has no built-in goblin, orc, skeleton, etc. Developers define their own types. Keep `createMonstersFromMobiles()` as an internal helper for the Tiled import path. |
| `roguelike-mazetools/src/content.ts` | `entities/types.ts` | Port `ObjectPlacement` (decorations/chests), `MobilePlacement` (sprite layers), `HiddenPassage`. Add `createDecoration()` factory matching the README signature (with `blocksView`, `interactive`, `onInteract`). |
| `roguelike-mazetools/src/Inventory/inventory.ts` | `entities/inventory.ts` | Port `Item`, `ItemType`, `InventorySlot`. Add `createItem()` factory matching README (`id`, `name`, `kind`, `onUse`, optional `attack`). Inventory is a fixed-length slot array on the player; `pickup/useItem/dropItem` mutate it and emit events. |
| `src/libold/src/hooks/useGameState.ts` | Decomposed across modules | **Do not port as a hook.** Extract: entity registry → `entities/types.ts`; loot/pickup logic → `entities/inventory.ts`; combat → `combat/combat.ts`; spawn dispatch → `entities/factory.ts`; chest interaction → `api/createGame.ts` event wiring. All game-loop orchestration moves to `api/createGame.ts`. |

---

### Three-faction combat model

**Target files:** `src/lib/combat/`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/factions.ts` | `combat/factions.ts` | Copy `FactionRegistry`, `FactionStance`, `createFactionRegistry()`, `createFactionRegistryFromTable()` as-is. The default faction table (`player` hostile to `enemy`, `npc` hostile to `enemy`, `enemy` hostile to `player` and `npc`) becomes the built-in default passed to `createFactionRegistryFromTable()` unless overridden by `combat.factions` in config. |
| `roguelike-mazetools/src/effects.ts` | `entities/effects.ts` | Copy `ActiveEffect`, `applyEffect()`, `tickEffects()`, `StackMode`. Rename and move `RpsEffect` here from `turnTypes.ts`. The `rpsEffect` field on enemies is now just a string tag — the developer defines what `'poison'`, `'bleed'`, etc. actually do via the `effects` system or `combat.onDamage`. |
| `roguelike-mazetools/src/turn/turnEvents.ts` | `turn/events.ts` | `DamageEvent`, `MissEvent`, `DeathEvent`, `XpGainEvent`, `HealEvent` are the internal turn-level events. They map to `game.events.on('damage')`, `('miss')`, `('death')`, `('xp-gain')`, `('heal')` in the public API. |
| `src/libold/src/hooks/useGameState.ts` (combat slice) | `combat/combat.ts` | Extract the attack resolution loop (damage formula call, faction check, death handling, event emission). Expose as `resolveCombat({ attacker, defender, formula, factions, emit })`. The `damageFormula` callback and `onDamage/onDeath/onMiss` hooks from the README config are passed in at construction time. |

---

### Sprite billboard rendering with body/head layers

**Target files:** `src/lib/atlas/atlas.ts`, `src/lib/rendering/`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/atlas.ts` | `atlas/atlas.ts` | Copy `AtlasData`, `AtlasEntry`, `AtlasSpriteEntry`, `AtlasTypedEntry`, `AtlasIndex`, `buildAtlasIndex()`. Remove all references to game-specific atlas category names (the atlas JSON structure is defined by the developer's file, not the framework). |
| `roguelike-mazetools/src/content.ts` (`MobilePlacement`) | `entities/types.ts` | `uvRectBody`, `uvRectHead`, `tileIndex`, `suppressBob` remain on the entity billboard data type. `sprite` string resolves via the character atlas at render time. |
| `src/libold/src/gameConstants.ts` (character atlas) | Removed | `CHAR_SHEET_W/H` are replaced by values read from the loaded `characterAtlasJson` file at runtime. No hardcoded dimensions. |
| `src/libold/src/gameUtils.ts` (`normalizeUvRect`) | `utils/geometry.ts` | Copy `normalizeUvRect()` as a pure utility. |

The `characterAtlas` / `characterAtlasJson` config keys in `rendering` match the README character atlas format. Sprite assignment (`type → sprite`) is developer-defined via entity `type`/`sprite` fields; the framework resolves the atlas lookup and has no built-in sprite names.

---

### Minimap with entity overlays

**Target files:** `src/lib/utils/minimap.ts`

| Source | Target | Changes required |
|---|---|---|
| `src/libold/src/gameUtils.ts` (`buildInitialExploredMask`) | `utils/minimap.ts` | Port `buildInitialExploredMask()`. The explored mask is a `Uint8Array` of `width * height` bytes updated each turn via FOV output. |
| `roguelike-mazetools/src/fov.ts` | `ai/fov.ts` | Copy `computeFov()`, `createVisibilityMask()`. Used by both the minimap reveal system and AI line-of-sight. |
| (game state) | `utils/minimap.ts` | Expose `createMinimapState(dungeon)` that holds the explored mask and `updateExplored(fovResult)`. `CrawlLib.attachMinimap(game, canvas, opts)` reads from this state and renders to the 2D canvas. `showEntities` and `size` options from the README come from `opts`. |

---

### Chest drops and item pickups

**Target files:** `src/lib/entities/inventory.ts`, `src/lib/api/createGame.ts`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/Inventory/inventory.ts` | `entities/inventory.ts` | Port `Item`, `ItemType`, `InventorySlot`. Add `rollLoot(lootTable, rng)` for chest drop resolution. |
| `roguelike-mazetools/src/turn/createActors.ts` (`MonsterTemplate.drop`) | `entities/types.ts` | Keep `drop: { id, name, chance }` as an optional field on enemy entities. Death handling in `combat/combat.ts` calls `rollLoot` and emits a `death` event with the loot list. |
| `src/libold/src/hooks/useGameState.ts` (loot/chest slice) | `api/createGame.ts` | Chest open → roll loot → emit `chest-open` event → developer's `game.events.on('chest-open')` handler calls `game.player.pickup(itemId)`. The framework provides the event; the developer decides what to do with it. |

---

### Hidden passage traversal

**Target files:** `src/lib/passages/`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/turn/passageTraversal.ts` | `passages/traversal.ts` | Copy `startPassageTraversal()`, `consumePassageStep()`, `cancelPassageTraversal()`, `PassageTraversalState` as-is. |
| `roguelike-mazetools/src/rendering/hiddenPassagesMask.ts` | `passages/mask.ts` | Copy `buildPassageMask()`, `enablePassageInMask()`, `disablePassageInMask()`, `stampPassageToMask()` as-is. |
| `roguelike-mazetools/src/content.ts` (`HiddenPassage`) | `entities/types.ts` | Keep `HiddenPassage` interface. `game.dungeon.passages` object wraps the mask and traversal state; `toggle(id)`, `list`, `passageNear(x, z)` are new imperative API methods added in `api/createGame.ts`. |
| `src/libold/src/hooks/useGameState.ts` (passage slice) | `passages/traversal.ts` + `api/createGame.ts` | `traversalFactor`, `onToggle`, `onTraverse` callbacks come from `passages` config and are called by `game.dungeon.passages.toggle()` and `consumePassageStep()`. |

---

### Callback-driven enemy spawning

**Target files:** `src/lib/entities/factory.ts`, `src/lib/api/createGame.ts`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/turn/createActors.ts` | `entities/factory.ts` | Port `createMonsterFromPlacement()` and `createMonstersFromMobiles()` as internal helpers. Remove `DEFAULT_MONSTER_TEMPLATES`. `createNpc()` and `createEnemy()` are the public factories. |
| `src/libold/src/hooks/useGameState.ts` (spawn dispatch) | `api/createGame.ts` | `CrawlLib.attachSpawner(game, { onSpawn })` registers the callback. The game loop calls `onSpawn({ dungeon, roomId, x, y })` and adds returned entities via `turns.addActor()`. No built-in spawn logic beyond calling the hook. |

---

### Stationary decoration entities

**Target files:** `src/lib/entities/types.ts`, `src/lib/api/createGame.ts`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/content.ts` (`ObjectPlacement`) | `entities/types.ts` | Port as `Decoration` interface with the README fields (`id`, `kind: 'decoration'`, `type`, `x`, `z`, `sprite`, `blocksMove`, `blocksView`, `interactive`, `onInteract`). Add `createDecoration()` factory that auto-generates `id`. |
| `src/libold/src/hooks/useGameState.ts` (decoration slice) | `api/createGame.ts` | `CrawlLib.attachDecorator(game, { onDecorate })` registers the callback; it is called per tile during dungeon setup. `game.dungeon.decorations.add()`, `.remove()`, `.list` implement the imperative API. |
| `src/libold/src/gameUtils.ts` (`makeDoorProto`) | **Removed** | Game-specific mesh construction. Door behavior is left to the developer via `onInteract`. |

---

### Atlas surface painting (walls, floors, ceilings per-tile)

**Target files:** `src/lib/atlas/atlas.ts`, `src/lib/dungeon/`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/atlas.ts` | `atlas/atlas.ts` | Copy `AtlasData`, `buildAtlasIndex()`, `AtlasIndex`. Remove implicit assumptions about specific category names — all category keys come from the developer's `atlas.json`. |
| `roguelike-mazetools/src/bsp.ts` (`DungeonOutputs` textures) | `dungeon/bsp.ts` | Keep `floorType`, `wallType`, `ceilingType`, `overlays`, `wallOverlays` channels. The `onPaint` callback result (array of atlas tile ID strings) is resolved via `buildAtlasIndex()` and written into these channels. |
| `roguelike-mazetools/src/rendering/tileAtlas.ts` | `rendering/tileAtlas.ts` | Copy as-is. |
| `src/libold/src/themes.ts` | `dungeon/themes.ts` | Keep default `THEMES` record but export `registerTheme()` for user extension. Theme resolution at dungeon-gen time writes initial floor/wall/ceiling type IDs into the `DungeonOutputs` textures. |
| `src/libold/src/gameConstants.ts` (`FLOOR_TILE_MAP`, etc.) | **Removed** | Atlas-to-ID arrays are derived at runtime from `buildAtlasIndex(atlasJson)` using the developer's own atlas file. No hardcoded mappings in the framework. |
| `roguelike-mazetools/src/rendering/temperatureMask.ts` | `rendering/temperatureMask.ts` | Copy as-is. Optional per-region temperature tinting remains an internal rendering detail; exposed via the `rendering.lightingShader.uniforms` override if the developer wants it. |
| `src/libold/src/hooks/useGameState.ts` (paint slice) | `api/createGame.ts` | `CrawlLib.attachSurfacePainter(game, { onPaint })` + `game.dungeon.paint(x, z, layers)` / `unpaint(x, z)` implement the README API. |

---

### Configurable keybindings

**Target file:** `src/lib/api/keybindings.ts`

| Source | Target | Changes required |
|---|---|---|
| `src/libold/src/hooks/useEotBCamera.ts` (`MoveActions`) | `api/keybindings.ts` | Port `MoveActions` type as `KeyBinding` map: `Record<string, string[]>`. Default binding set matches the README table. |
| `src/libold/src/hooks/useGameState.ts` (key handler) | `api/keybindings.ts` | Rewrite as a standalone `attachKeybindings(game, { bindings, onAction })` that adds/removes a `keydown` listener on `document`. `onAction(action, event)` is called by the developer to issue `turns.commit()`. No React dep. |

---

### Audio hooks

**Target file:** `src/lib/events/eventEmitter.ts` (trigger surface)

No source exists in `src/libold`. Implement fresh:

- The `EventEmitter` (see Events section below) emits an `'audio'` event with `{ name, position }` at the appropriate moment inside each game system (footstep on move, `hit` on damage, `death` on death, etc.).
- The developer hooks `game.events.on('audio', handler)` and plays sounds with Howler or any other library.
- Audio event names are string constants exported from `events/eventEmitter.ts` for discoverability but require no Howler dependency in the framework.

---

### Events

**Target file:** `src/lib/events/eventEmitter.ts`

New file. Implement a minimal typed event emitter:

```ts
export type GameEventMap = {
  damage:      { entity: Entity; amount: number; effect?: string }
  death:       { entity: Entity; killer?: Entity }
  'xp-gain':   { amount: number; x: number; z: number }
  heal:        { entity: Entity; amount: number }
  miss:        { attacker: Entity; defender: Entity }
  'chest-open':{ chest: Decoration; loot: Item[] }
  'item-pickup':{ item: Item; entity: Entity }
  turn:        { turn: number }
  win:         {}
  lose:        { reason: string }
  audio:       { name: string; position?: { x: number; z: number } }
}

export interface EventEmitter {
  on<K extends keyof GameEventMap>(event: K, handler: (e: GameEventMap[K]) => void): () => void
  off<K extends keyof GameEventMap>(event: K, handler: (e: GameEventMap[K]) => void): void
  emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void
}

export function createEventEmitter(): EventEmitter { ... }
```

All internal modules (`combat`, `inventory`, `passages`, `turn`) receive the emitter at construction time and call `emit()` rather than dispatching React state.

---

### Supporting utilities

**Target files:** `src/lib/ai/`, `src/lib/utils/`

| Source | Target | Changes required |
|---|---|---|
| `roguelike-mazetools/src/astar.ts` | `ai/astar.ts` | Copy as-is. |
| `roguelike-mazetools/src/fov.ts` | `ai/fov.ts` | Copy as-is. |
| `roguelike-mazetools/src/spatial.ts` | `ai/spatial.ts` | Copy as-is. |
| `roguelike-mazetools/src/turn/monsterAI.ts` | `ai/monsterAI.ts` | Copy `decideChasePlayer()`, `computeChasePathToPlayer()`, `monsterAlertConfig()`. These are the **default** AI behaviours; developers supply their own AI via the `ai: { initial, states, transitions }` state machine on each entity. The framework calls the state machine's active state function each tick. |
| `src/libold/src/gameUtils.ts` (`makeRng`) | `utils/rng.ts` | Port `makeRng(seed)` as the default seeded PRNG. |
| `src/libold/src/gameUtils.ts` (`hasLineOfSight`, `cardinalDir`, `normalizeUvRect`) | `utils/geometry.ts` | Port these three pure functions. |
| `roguelike-mazetools/src/bspHelpers.ts` | `utils/geometry.ts` | Merge `MinHeap<T>` and `octile()` here. |

---

## Files to delete (not ported)

| File | Reason |
|---|---|
| `src/libold/src/tea.ts` | Game-specific mechanic |
| `src/libold/src/tutorial/lessons.ts` | Game-specific tutorial content |
| `src/libold/src/hooks/useDungeonTutorialSetup.ts` | Game-specific tutorial setup |
| `src/libold/src/gameUtils.ts` (`makeDoorProto`, `makeTeaomaticProto`, `loadAtlasTexture`) | Game-specific mesh/texture construction; atlas loading is the developer's responsibility |
| `src/libold/roguelike-mazetools/src/examples/` | Example ECS code, not framework code |
| `src/libold/src/gameConstants.ts` (UV maps, atlas IDs) | All hardcoded atlas lookups replaced by runtime `buildAtlasIndex(atlasJson)` |

---

## New files with no libold source

| File | What to build |
|---|---|
| `src/lib/api/createGame.ts` | Main entry point — `CrawlLib.createGame(canvas, options)`. Instantiates all subsystems, wires them together, returns the `game` handle. |
| `src/lib/events/eventEmitter.ts` | Typed `EventEmitter` (see Events section). |
| `src/lib/api/keybindings.ts` | `CrawlLib.attachKeybindings(game, opts)` — pure DOM keydown listener, no React. |
| `src/lib/index.ts` | Re-exports the public `CrawlLib` namespace: `createGame`, `attachMinimap`, `attachSpawner`, `attachDecorator`, `attachSurfacePainter`, `attachKeybindings`, `createNpc`, `createEnemy`, `createDecoration`, `createItem`, `buildTilesetMap`. |

---

## Migration order (recommended)

1. `utils/` — rng, geometry (no deps)
2. `ai/` — astar, fov, spatial (depend only on utils)
3. `dungeon/` — bsp, cellular, serialize, themes (depend on utils)
4. `dungeon/tiled.ts` (depends on dungeon + entities types)
5. `turn/` — types, actionCosts, scheduler, events (no game deps)
6. `entities/` — types, effects, inventory, factory (depends on turn/types)
7. `combat/` — factions, combat (depends on entities + turn/events)
8. `passages/` — mask, traversal (depends on dungeon types)
9. `atlas/atlas.ts` + `rendering/` — tileAtlas, torchLighting, camera, temperatureMask
10. `events/eventEmitter.ts`
11. `api/` — player, actions, keybindings, createGame (wires everything together)
12. `index.ts` — public surface
