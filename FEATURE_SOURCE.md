# Feature Source

Maps each feature to the files in `src/lib` that implement it. Use this as a lookup guide when working on or debugging a specific system.

---

## Directory structure

```
src/lib/
  animations/
    types.ts
    animationRegistry.ts
    easing.ts
  rendering/
    dungeonRenderer.ts
    atlasGeometry.ts
    doorRenderer.ts
    torchLighting.ts
    basicLighting.ts
    camera.ts
    tileAtlas.ts
    temperatureMask.ts
    billboardSprites.ts
    textureLoader.ts
    skybox.ts
  dungeon/
    bsp.ts
    cellular.ts
    colliderFlags.ts
    doors.ts
    serialize.ts
    mapFile.ts
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
    moveAnim.ts
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
  missions/
    types.ts
    missionSystem.ts
  transport/
    types.ts
    websocket.ts
  ui/
    inventoryDialog.ts
    inventoryDialog.css
  index.ts
```

---

## Feature map

---

### Texture Loader / Sprite Packer

Two-phase system: load phase fetches a source image and a TexturePacker-format atlas JSON, unpacks each named sprite (undoing packer `rotated: true` during blit), and shelf-packs sprites into a power-of-two `OffscreenCanvas`. Runtime phase exposes a `PackedAtlas` that maps string names → UV rects, with `getByName()` / `getById()` helpers and a `resolveSprite()` utility that accepts `string | number`. `toFaceRotation()` converts the optional per-frame `rotation` field (0/90/180/270° CW) to the `FaceRotation` index. `packedAtlasResolver()` wraps a `PackedAtlas` as a `(name: string) => number` resolver for `tileNameResolver`. `spriteToUvRect()` converts a `PackedSprite`'s canvas UV to a GL-convention `UvRect` (y=0 at bottom).

**Files:**
- `rendering/textureLoader.ts` — public types (`AtlasFrame`, `TextureAtlasJson`, `PackedSprite`, `PackedAtlas`, `LoadingOptions`, `UvRect`); `computeLayout()` shelf packer (POT, 2px padding, tallest-first sort); `blitSprite()` OffscreenCanvas blit with packer-rotation undo; `loadTextureAtlas()` orchestrates fetch → pack → blit → return; `injectOverlay()` full-screen loading screen; `resolveSprite()` name-or-id lookup helper; `toFaceRotation()` degree → FaceRotation index converter; `packedAtlasResolver()` creates a tile-name resolver; `spriteToUvRect()` converts canvas UV to GL `UvRect`

**Example:**
- `examples/standalone/texture-loader/index.html`
- `examples/standalone/texture-loader/texture-loader.js` — loads `textureAtlas.png` via embedded data URL, displays the baked packed texture, lists first 20 sprite names with UV coords, demonstrates `resolveSprite()` by name and id

---

### Billboarded sprite rendering for mobile entities

Camera-facing billboard quads driven by a multi-layer sprite system. Actors declare a `spriteMap` field; its presence switches the dungeon renderer from box geometry to billboard quads automatically. Supports up to N texture layers per billboard (independent `tile` as string name or numeric index, x/y offset, scale, opacity) and up to 8 viewing angles (N/NE/E/SE/S/SW/W/NW) with per-layer tile overrides. String tile names are resolved via the optional `resolver` parameter. The box fallback remains for entities without `spriteMap`. Billboard sprites receive the same fog and scene light (ambient + point lights) treatment as walls.

**Files:**
- `rendering/billboardSprites.ts` — `SpriteMap`, `SpriteLayer` (`tile: string | number`), `AngleOverride` (`tile: string | number`), `AngleKey`, `BillboardFog` public types; `createBillboard()` accepts optional `resolver`, `expectedFrameSize`, and `fog` params; allocates per-layer `PlaneGeometry` meshes using a custom `ShaderMaterial` with `lights: true` (GLSL UV atlas sampling, fog uniforms, scene light accumulation matching `basicLighting.ts`, alpha discard); `BillboardHandle.update()` rotates the group to face the camera each RAF frame, selects the active angle key, resolves tile names via `resolveTile()`, and pushes uniform updates; `BillboardHandle.dispose()` cleans up geometry and materials
- `rendering/dungeonRenderer.ts` — holds a `Map<string, BillboardHandle>` alongside `entityMeshMap`; `syncEntities()` routes entities with `spriteMap` to `createBillboard()` and others to the box path; `setObjects(objects)` syncs a separate `objectBillboardMap` for stationary `ObjectPlacement` billboards; RAF loop calls `handle.update()` with the current `curYaw` for both entity and object billboards; `destroy()` disposes all billboard handles
- `entities/types.ts` — `spriteMap?: SpriteMap` optional field on `EntityBase`; `spriteMap?: SpriteMap` optional field on `ObjectPlacement` enabling stationary billboard rendering

**Example:**
- `examples/standalone/billboard-sprites/index.html`
- `examples/standalone/billboard-sprites/billboard-sprites.js` — goblin (2-layer body + weapon), skeleton (4-angle variants), slime (single tile)

---

### First-person 3D dungeon rendering with lighting and fog

**Files:**
- `rendering/dungeonRenderer.ts` — main Three.js scene, render loop, shader uniforms; `floorTile`/`ceilTile`/`wallTile` options accept `string | number` resolved via `tileNameResolver`; `LayerFaceResult.tile` is `string | number`; per-direction tile specs via `wallTiles`, `floorSkirtTiles`, `ceilSkirtTiles` options; per-cell skirt type lookup: edge skirts resolve `floorSkirtType`/`ceilSkirtType` at build time (overrides base tile), wall-adjacent skirts composite the override in fragment shader via `uSkirtLookup` + `aSkirtDirChannel`; wall-adjacent floor and ceiling skirts use separate instanced meshes (`floorWallSkirtMesh`, `ceilWallSkirtMesh`) with their own materials so each can carry a distinct skirt lookup texture; `ambientOcclusion` option (`boolean | number`, default false) enables vertex AO — `computeFaceAO()` samples the solid map for each face's 4 corners during `buildDungeon()` and packs the result into a `Float32Array` passed as `aAoCorners` instanced attribute; recomputed on every `rebuild()` so dynamic wall changes stay correct; AO applies to floor, ceiling, and all four wall directions; skirt/edge faces default to aAoCorners=1.0 (fully lit); public `setAmbientOcclusion(intensity)` updates `uAoIntensity` on all atlas materials at runtime (clamped to [0,1], takes effect next frame); `surfaceLighting` option (`{ floor?, ceiling?, wallMin?, wallMax? }`) tunes directional surface lighting multipliers at creation time (defaults: floor=0.85, ceiling=0.95, wallMin=0.9, wallMax=1.1) — values are forwarded to `uSurfaceLight`, `uWallLightMin`, `uWallLightMax` uniforms; public `addLayer(spec)` API for stacking additional instanced meshes on floors, ceilings, walls, or skirts with per-face filtering and deferred application; public `worldToScreen(gridX, gridZ, worldY?)` projects a grid cell to pixel coords relative to the container element (returns `null` when behind the camera or out of bounds); exposes `scene` (THREE.Scene) and `camera` (THREE.PerspectiveCamera) on the public handle — add lights or attach objects directly; atlas materials use `lights: true` so THREE.AmbientLight and THREE.PointLight objects added to the scene are automatically reflected in the shader; uses `basicLighting.ts` shaders; routes entities with `spriteMap` to `billboardSprites.ts` (passing resolver); exports `LayerTarget`, `LayerFaceResult`, `LayerSpec`, `LayerHandle`, `SpriteMap`
- `rendering/billboardSprites.ts` — see "Billboarded sprite rendering" feature entry above
- `rendering/basicLighting.ts` — atlas and object shaders with Three.js native light support; WebGL slot budget: 6 built-ins (position+uv+instanceMatrix) + 4 custom = 10/16 — 6 slots remain; custom attributes: `aUvRect` (vec4) = atlas UV origin+size, `aSurface` (vec3) = heightOffset/uvRotation/uvHeightScale, `aAoCorners` (vec4) = pre-baked AO corners (tl/tr/bl/br, [0,1]), `aCellFace` (vec4) = grid cell xy + XZ face normal zw; vertex shader outputs `vViewPos` (eye-space position) for point light distance calculations; fragment shader includes `<common>` + `<lights_pars_begin>` — Three.js injects `ambientLightColor` and `pointLights[]` (view-space) automatically when `lights: true` on the material; scene lights step (5.5) accumulates `ambientLightColor + pointLight contributions` and multiplies the surface color — backward compatible: default `AmbientLight(white,1)` makes the multiply a no-op; `uSurfaceLight`/`uWallLightMin`/`uWallLightMax` directional shading and `vAo` AO pass are unchanged; `uSkirtLookup` uniform provides 4 overlay slots for skirt meshes; used by `dungeonRenderer.ts`
- `rendering/torchLighting.ts` — torch color, intensity, banding constants, and flickering GLSL chunks; available for custom renderers that want animated torch lighting
- `rendering/camera.ts` — camera state, `tryMove` wall-collision logic, lerp movement, EotB-style movement as secondary export
- `rendering/tileAtlas.ts` — UV coordinate helpers; exports `FaceRotation`, `FaceTileSpec` (`tile: string | number`), `DirectionFaceMap` types for per-face tile and rotation overrides; `resolveTile()` helper resolves string names via an optional resolver function
- `rendering/temperatureMask.ts` — optional per-region temperature tinting, passed as a shader uniform

---

### Skybox (6-texture cube map)

Standard cube-map skybox for the dungeon renderer. When active, replaces the flat fog-colour scene background with a `THREE.CubeTexture` sampled from 6 face images. Fog continues to apply to dungeon geometry. Two integration paths: pass `skybox` in `DungeonRendererOptions` at creation time (fire-and-forget URL loading), or call `renderer.setSkybox(opts)` / `renderer.setSkybox(null)` at runtime to swap or remove the skybox. Both paths accept either 6 URL strings (`SkyboxFaces`) or a pre-loaded `THREE.CubeTexture`. URL-loaded textures are owned and disposed by the renderer; pre-loaded textures are not disposed (caller retains ownership). An optional `rotationY` field on `SkyboxOptions` rotates the cube map around the Y axis to align the front face with the dungeon's north direction; callers needing full control can mutate `renderer.scene.background.rotation` directly.

**Files:**
- `rendering/skybox.ts` — `SkyboxFaces` (6 URL strings), `SkyboxOptions` (`faces: SkyboxFaces | THREE.CubeTexture`, `rotationY?`), `loadSkybox(opts)` async loader using `THREE.CubeTextureLoader`; returns `Promise<THREE.CubeTexture>`
- `rendering/dungeonRenderer.ts` — `skybox?` field on `DungeonRendererOptions`; `setSkybox(opts | null): Promise<void>` on `DungeonRenderer` handle; internal `applySkybox()` / `clearSkybox()` helpers track ownership; owned textures disposed on swap, `setSkybox(null)`, and `destroy()`

---

### Ceiling and floor height offsets

Both encodings use raw value `128` for no offset. Floor encoding: `+(floorVal - 128) * offsetStep` — `0` = pit (floor tile omitted). Ceiling encoding is inverted: `-(ceilVal - 128) * offsetStep` — `0` = open sky (ceiling tile omitted). Both sentinels are `0` because the encodings run in opposite directions so `0` is the maximum raise of each range.

Open-sky cells omit their ceiling face and instead render a thin rim (one `offsetStep` tall) around hole edges for visible depth. Normal ceil-skirt neighbours skip drawing steps toward open-sky cells. The `openSkyLighting` renderer option (`[0,1]`) blends pre-baked AO corner values toward fully lit for floor tiles directly below open-sky cells and their cardinal neighbours, simulating diffuse daylight through the opening.

Sky-panel faces (vertical panels on walls adjacent to open-sky cells) receive additional illumination via the `outsideLight` renderer option: `brightness` sets a flat surface-light multiplier (default `1.3`, making panels visibly brighter than regular walls without a placed scene light), and `color` (`[r,g,b]` in `[0,1]`) applies a multiplicative tint after surface lighting to simulate a sky colour cast (e.g. `[0.6, 0.75, 1.0]` for cool daylight).

Floor tiles (and their wall-skirt/edge geometry) directly under open-sky cells are also tinted with the same `outsideLight.color`. This is driven by the existing `ceilingHeightOffset` DataTexture: cells whose ceiling value is `0` (the open-sky sentinel) receive the tint; cells with a real ceiling value do not. The shader checks `uCeilHeightLookup` (the ceiling texture) at the cell UV and gates the tint accordingly via `uSkyFromLookup=1` on floor/skirt materials. Sky-panel material keeps `uSkyFromLookup=0` (always tinted). All other mesh types (walls, ceiling) leave `uSkyLightColor` at `vec3(1.0)` (no-op).

**Files:**
- `dungeon/bsp.ts` — generates `floorHeightOffset` and `ceilingHeightOffset` R8 DataTextures; encoding and sentinel values described in `DungeonOutputs` JSDoc
- `dungeon/cellular.ts` — generates `floorHeightOffset` (when `vaultedFloor` is enabled) using sub-voronoi region distance fields; always generates `ceilingHeightOffset`
- `rendering/dungeonRenderer.ts` — reads offset textures in `buildDungeon()`; floor tiles with `floorVal === 0` are omitted (pit); ceiling tiles with `ceilVal === 0` are omitted (open sky) and replaced with a rim skirt; `isOpenSkyCeil()` helper predicate used for both rim generation and `openSkyLighting` AO boost; `openSkyLighting` option (`DungeonRendererOptions`) controls AO brightening near sky holes; `outsideLight` option (`{ brightness?, color? }`) controls sky-panel face brightness and tint; `buildLayerMesh()` also guards `ceil` and `ceilSkirt` layer targets against open-sky cells; `addFloorSkirt` / `addWallFloorSkirt` (main build path) and `tryAddFloorSkirtTiled` (layer path) emit partial-height remainder panels with `uvOffset = 1 − scale` (`aSurface.w`) so the texture is top-aligned — the top of the tile always sits flush with the higher floor edge, and the texture tracks correctly as the floor level changes
- `rendering/basicLighting.ts` — `uSkyLightColor` (vec3), `uCeilHeightLookup` (sampler2D), `uSkyFromLookup` (float) uniforms added to `BASIC_ATLAS_FRAG`; step 5.5 applies sky tint unconditionally when `uSkyFromLookup=0` (sky panels) or only to open-sky cells when `uSkyFromLookup=1` (floor/skirt, gated by `uCeilHeightLookup`); `makeBasicAtlasUniforms()` accepts `skyLightColor?`, `ceilHeightLookup?`, `skyFromLookup?`; `makeFullPixelTex()` helper provides the no-op default for `uCeilHeightLookup`; UV offset applied as `uv.y * hs + uvOffset` in vertex shader — `uvOffset = 1 − scale` shifts the sampled window to the top of the tile for partial-height panels
- `rendering/dungeonRenderer.ts` — `buildDungeon()` patches `uCeilHeightLookup` on `floorMat`/`floorEdgeMat`/`floorWallSkirtMat` with the `ceilingHeightOffset` texture after dungeon data is available; `setOutsideLight()` pushes color to all four sky-lit material types

**Example:**
- `examples/localhost/floor-skirt-uv/` — hand-crafted two-room dungeon with a stone button on the wall; pressing it opens a secret door by setting the door cell not-solid, then animating the ceiling from one step above the floor up to full height; `ceilSkirtTiles` uses the wall tile so the rising ceiling looks like a stone portcullis; demonstrates top-aligned ceiling skirt UV on partial-height panels

---

### Floor-height camera tracking (`snapCameraToFloor`)

Opt-in behaviour that makes the camera Y position track the `floorHeightOffset` value at the player's current cell, producing a true first-person "step up / step down" effect as the player moves between height-offset cells. When disabled (default), camera Y is always `tileSize * eyeHeightFactor`. When enabled, the base eye height is offset by `(floorVal - 128) * offsetStep`; pit cells (`floorVal === 0`) are treated as neutral. Transitions are smoothed using the same exponential `lerpFactor` lerp applied to X/Z movement. `offsetStep` is hoisted to the outer `createDungeonRenderer` scope so both the build path and the runtime handler share the same value.

**Files:**
- `rendering/dungeonRenderer.ts` — `snapCameraToFloor?: boolean` on `DungeonRendererOptions`; `tgtY`/`curY` lerp state variables; `snapToFloor` mutable flag; `onTurn` reads `floorHeightOffset` texture and updates `tgtY`; RAF loop lerps `curY` and passes it to `camera.position.set`; `setSnapCameraToFloor(enabled)` runtime toggle on `DungeonRenderer` handle

---

### BSP and cellular dungeon generators

Both generators produce a `RoomedDungeonOutputs` (extends `DungeonOutputs`) with a full room graph: `startRoomId`, `endRoomId`, `rooms: Map<number, RoomInfo>`, `fullRegionIds`, and `firstCorridorRegionId`. The `regionId` texture stores per-cell room IDs that match the `rooms` map keys.

- **BSP**: rooms are explicitly carved rectangles; corridors are separate graph entries (`type: "corridor"`). Start/end chosen by BFS on the room adjacency graph (furthest dead-end pair).
- **Cellular**: Voronoi rooms are derived from local maxima of the `distanceToWall` field — each local maximum seeds a room, and every floor cell is claimed by the nearest seed via multi-source BFS. No explicit corridor entries; `firstCorridorRegionId = numRooms + 1`. Start/end chosen by the same BFS approach. `ceilingHeightOffset` is computed per-cell as `vaultHeightScale × (normalizedDTW × vaultMaxSteps × distanceToWallWeight + noise × noiseSteps × noiseWeight)`; setting `distanceToWallWeight = 0` gives pure-noise ceilings, `noiseWeight = 0` gives pure-DTW vaults, both `0` produces a flat ceiling. `floorHeightOffset` (when `vaultedFloor` is enabled) subdivides each room's voronoi region into `floorSubSeeds` sub-regions via evenly-spaced internal seeds, computes distance-to-sub-region-edge per cell, and applies `floorHeightScale × (normalizedDtse × floorMaxSteps × floorDistanceToEdgeWeight + noise × floorNoiseSteps × floorNoiseWeight)` to depress the floor at sub-region interiors (sub-seeds are the "low points"); floor encoding is `128 - drop` (clamped to `[1, 127]`; 0 is reserved as the pit marker).

**Spawn override**: `DungeonOptions.onChooseSpawn(ctx)` receives `{ rooms, startRoom, endRoom }` and returns a `roomId`; the engine centers the player in that room. Default behaviour (no callback) uses `startRoomId`.

**Fall damage notification**: `DungeonOptions.fallDamageHeight` (steps, same unit as `CellData.floorHeightOffset`; default `0`, disabled) sets a threshold for detecting drops during movement. `customApplyAction`'s move branch (`api/createGame.ts`) compares the mover's pre/post-move `floorHeightOffset` (via the shared `readFloorHeightSteps()` helper, also used by `getCell()`) and emits `'fall-damage'` when the drop (destination lower than source; climbing never fires it) meets or exceeds the threshold. Applies to any actor (player or monster) that moves, not just the player. Silently skipped if either cell is a pit (`null`) or the dungeon has no `floorHeightOffset` texture (`undefined`, e.g. tiled maps). The engine only reports the drop — no damage is applied; the event is a notification for the developer's own damage/hp logic.

**Files:**
- `dungeon/bsp.ts` — BSP tree split, room placement, corridor carving; `DungeonOutputs` and `RoomedDungeonOutputs` base types; `BspDungeonOutputs = RoomedDungeonOutputs`; `RoomInfo` type; produces `floorHeightOffset`, `ceilingHeightOffset`, `colliderFlags`, `floorSkirtType`, `ceilSkirtType`, `skyPanelCount` (R8, per-cell count of sky panels above wall top), and `ceilingPanelCount` (R8, per-cell count of ceiling panels below ceiling) textures; `setFloorSkirtTiles()` / `setCeilSkirtTiles()` per-cell skirt tile helpers; `setSkyPanelCount(outputs, cx, cz, count)` / `setCeilingPanelCount(outputs, cx, cz, count)` per-cell panel count setters (count clamped to [0, 4])
- `api/createGame.ts` — `fallDamageHeight?: number` field on all three `DungeonOptions` union branches; `readFloorHeightSteps(dungeon, x, z)` internal helper decodes a cell's `floorHeightOffset` texture value into signed steps (`null` = pit, `undefined` = texture absent), shared by `getCell()` and the fall-damage check; `customApplyAction`'s move branch emits `'fall-damage'`
- `dungeon/cellular.ts` — cellular automata generator; `buildVoronoiRooms()` detects rooms via distanceToWall local maxima and assigns region IDs via multi-source BFS; `computeDistanceToSubRegionEdge()` subdivides each room's voronoi region into sub-regions using evenly-spaced internal seeds and returns per-cell distance to sub-region boundary; `makePerlin2D(seed)` seeded 2D Perlin noise used for both ceiling and floor perturbation; `CellularDungeonOutputs` extends `RoomedDungeonOutputs` and includes concrete `ceilingHeightOffset` and `floorHeightOffset` textures; zero-fills `skyPanelCount` and `ceilingPanelCount` textures; `CellularOptions` exposes `vaultedCeiling` (default `true`), `vaultMaxSteps` (default `3`), `noiseFrequency` (default `0.08`), `noiseSteps` (default `2`), `vaultHeightScale` (overall ceiling raise multiplier, default `1`), `distanceToWallWeight` (weight of DTW term, default `1`), `noiseWeight` (weight of Perlin term, default `1`); and for floor: `vaultedFloor` (default `false`), `floorSubSeeds` (sub-regions per room, default `2`), `floorMaxSteps` (default `3`), `floorNoiseFrequency` (default `0.08`), `floorNoiseSteps` (default `2`), `floorHeightScale` (default `1`), `floorDistanceToEdgeWeight` (weight of sub-region-edge distance, default `1`), `floorNoiseWeight` (weight of noise term, default `1`); exports `generateCellularDungeon`, `CellularOptions`, `CellularDungeonOutputs`
- `dungeon/colliderFlags.ts` — `IS_WALKABLE`, `IS_BLOCKED`, `IS_LIGHT_PASSABLE` constants; `buildColliderFlags()` deriver; `isWalkableCell()`, `isBlockedCell()`, `isLightPassableCell()` predicates
- `dungeon/serialize.ts` — `SerializedDungeon` type; `serializeDungeon(dungeon: RoomedDungeonOutputs, paintMap?)` accepts both BSP and cellular outputs; `deserializeDungeon()` reconstructs a `BspDungeonOutputs`; `rehydrateDungeon()` full restoration; `dungeonToJson()` / `dungeonFromJson()` JSON string convenience wrappers; optional `skyPanelCount?` and `ceilingPanelCount?` Base64 R8 fields for backwards-compatible serialization of per-index panel count textures
- `dungeon/themes.ts` — `ThemeDef` type with optional `floorSkirtType?` / `ceilSkirtType?` tile name fields; `ThemeSelector` union (string | string[] | weighted array | callback); built-in themes (dungeon, crypt, catacomb, industrial, ruins); public exports `THEMES`, `THEME_KEYS`, `resolveTheme()`, `registerTheme()`, `getTheme()`
- `events/eventEmitter.ts` — `'fall-damage': { entity, height, from, to }` event
- `utils/geometry.ts` — `MinHeap<T>`, `octile()` used internally by BSP helpers

---

### Collider flags (per-cell movement and LOS)

Bitwise flags stored in `DungeonOutputs.textures.colliderFlags` (R8 DataTexture). Default values are derived from the `solid` texture by all generators. Drives `isWalkable` in the turn system, A* pathfinding, monster AI, FOV/LOS, and both camera types. Also the mechanism doors (see "Doors" below) use to toggle locked/open state without touching `solid` or triggering a geometry rebuild.

| Flag | Bit | Meaning |
|---|---|---|
| `IS_WALKABLE` | `0x01` | Normal volitional movement permitted |
| `IS_BLOCKED` | `0x02` | No entry by any means (forced or voluntary) |
| `IS_LIGHT_PASSABLE` | `0x04` | LOS/light rays pass through |

**Files:**
- `dungeon/colliderFlags.ts` — constants, `buildColliderFlags()`, `isWalkableCell()`, `isBlockedCell()`, `isLightPassableCell()`
- `dungeon/bsp.ts` — populates `colliderFlags` in `generateBspDungeon()`
- `dungeon/cellular.ts` — populates `colliderFlags` in `generateCellularDungeon()`
- `dungeon/tiled.ts` — populates `colliderFlags` (from optional layer or derived from solid)
- `dungeon/serialize.ts` — includes `colliderFlags` in `SerializedDungeon`; restored verbatim on both `deserializeDungeon()` and `rehydrateDungeon()`
- `api/createGame.ts` — stores `colliderFlagsData`; drives `isWalkable` and `isOpaque` callbacks
- `rendering/camera.ts` — both `createCamera` and `createEotBCamera` accept optional `colliderFlagsData`; `setColliderFlagsData()` method on each

---

### Tiled map import

**Files:**
- `dungeon/tiled.ts` — `loadTiledMap(tiledJson, options)` returning `DungeonOutputs`; layer-name mapping comes from caller config
- `entities/types.ts` — `ObjectPlacement`, `MobilePlacement`, `HiddenPassage` interfaces consumed by the Tiled parser

---

### Turn-based scheduler with priority queue

Generation (`runGenerate`) advances through `tickUntilPlayer()` (step 11), then immediately calls `syncAllEntitiesFromTurnState()` and `updateFovAndMinimap()` (step 12) so that entity positions and minimap exploration are fully populated before the "generate" and first "turn" events fire. This means turn 0 already shows correct entity placement and explored minimap state — no player action is needed to trigger the first update.

**Files:**
- `turn/scheduler.ts` — `TurnScheduler` class with priority queue; no game dependencies
- `turn/system.ts` — `createTurnSystemState()`, `tickUntilPlayer()`, `commitPlayerAction()`, `defaultComputeCost()`
- `turn/types.ts` — `ActorBase`, `PlayerActor`, `MonsterActor`, shared turn types
- `turn/actionCosts.ts` — default action cost table
- `turn/events.ts` — `TurnEvent` union including `damage`, `death`, `chest-open`, `item-pickup`, `turn`, `win`, `lose`, `audio`
- `api/actions.ts` — `createActionPipeline()`, `ActionMiddleware`, `ActionContext`; extension point for `turns.commit()`
- `api/createGame.ts` — `runGenerate()` step 12 calls `syncAllEntitiesFromTurnState()` + `updateFovAndMinimap()` before the "generate" event

---

### Entity system: player, NPCs, enemies, items, chests

**Files:**
- `api/player.ts` — reactive player handle (`x`, `z`, `hp`, `facing`, `inventory`, `alive`), action methods (`move`, `rotate`, `interact`, `wait`, `pickup`, `useItem`, `dropItem`, `heal`); `hp`/`maxHp` read from entity index signature
- `entities/types.ts` — unified entity base interface (`id`, `kind`, `faction`, `spriteName`, `x`, `z`, `speed`, `alive`, `blocksMove`, `tick`, optional `spriteMap`, plus index signature `[key: string]: unknown` for dev-defined attributes like `hp`, `attack`, `xp`); `ObjectPlacement`, `MobilePlacement`, `HiddenPassage`; re-exports `SpriteMap` from `rendering/billboardSprites.ts`
- `entities/factory.ts` — `createEntity(opts: EntityCoreOpts & Record<string, unknown>): EntityBase`; single factory, no stat defaults; engine fields (`kind`, `faction`, `spriteName`, `x`, `z`, optional `alive`/`blocksMove`/`speed`/`spriteMap`) plus any extra keys spread verbatim onto the entity
- `entities/inventory.ts` — `Item`, `ItemType`, `InventorySlot`, `createItem()`, `rollLoot()`
- `entities/effects.ts` — `ActiveEffect`, `applyEffect()`, `tickEffects()`, `StackMode`, `RpsEffect`

---

### Pluggable combat model

**Files:**
- `combat/factions.ts` — `FactionRegistry`, `FactionStance`, `FactionId`; `createFactionRegistry()` (empty registry, dev defines all stances); `createFactionRegistryFromTable()` convenience builder; no `DEFAULT_FACTION_TABLE` — dev owns all faction relationships; `game.factions` is the top-level handle on the game object
- `combat/combat.ts` — `CombatResolver` function type `(attacker, defender, ctx) => CombatResult`; `CombatResolverContext { emit, factions }`; `CombatResult` union (`blocked` | `miss` | `hit`); `resolveCombat({ attacker, defender, damage, defenderHp, factions, emit })` utility for event emission + faction check when the caller pre-computes damage; no default damage formula — stat field names are dev-defined; `CombatOptions.resolver` replaces the old `damageFormula` option; engine fallback (no resolver) performs stance check only, no damage
- `entities/effects.ts` — `RpsEffect` and status effect application called from combat resolution
- `turn/events.ts` — `DamageEvent`, `MissEvent`, `DeathEvent`, `XpGainEvent`, `HealEvent` emitted by combat

---

### Sprite billboard rendering with body/head layers

**Files:**
- `atlas/atlas.ts` — `AtlasData`, `AtlasEntry`, `AtlasSpriteEntry`, `AtlasTypedEntry`, `AtlasIndex`, `buildAtlasIndex()`
- `entities/types.ts` — `uvRectBody`, `uvRectHead`, `tileIndex`, `suppressBob` fields on entity billboard data
- `utils/geometry.ts` — `normalizeUvRect()` pure utility

---

### Minimap with entity overlays

**Files:**
- `utils/minimap.ts` — `createMinimapState(dungeon)`, dd mask (`Uint8Array`), `updateExplored(fovResult)`; `AtomicCore.attachMinimap(game, canvas, opts)` renders to a 2D canvas
- `ai/fov.ts` — `computeFov()`, `createVisibilityMask()`; used for minimap reveal and AI line-of-sight

---

### Chest drops and item pickups

**Files:**
- `entities/inventory.ts` — `rollLoot(lootTable, rng)` for chest drop resolution; `Item`, `ItemType`, `InventorySlot`
- `entities/types.ts` — optional `drop: { id, name, chance }` field on enemy entities
- `api/createGame.ts` — chest open → roll loot → emit `chest-open` event; developer's handler calls `game.player.pickup(itemId)`

---

### Hidden passage traversal

**Files:**
- `passages/traversal.ts` — `startPassageTraversal()`, `consumePassageStep()`, `cancelPassageTraversal()`, `PassageTraversalState`
- `passages/mask.ts` — `buildPassageMask()`, `enablePassageInMask()`, `disablePassageInMask()`, `stampPassageToMask()`
- `entities/types.ts` — `HiddenPassage` interface
- `api/createGame.ts` — `game.dungeon.passages` object; `toggle(id)`, `.list`, `passageNear(x, z)` API methods

---

### Doors

Lockable, animated doors registered via `game.dungeon.doors`, modeled on the `passages` handle. A door renders as a double-sided "sandwich" of three atlas-shaded planes — frame (side A), a sliding double-sided pane, frame (side B) — built with the exact same wall shader/material as regular wall geometry (`makeAtlasMaterial()`/`makeAtlasMaterialDoubleSide()`), so lighting, baked AO, and fog match adjacent walls exactly; this is a deliberate departure from the billboard shader (`billboardSprites.ts`), which only accumulates ambient/point lights and has no baked AO or facing-angle brightness.

Door state drives per-cell `colliderFlags` only (never `solid`), so state changes need no `renderer.rebuild()`: locked → `IS_BLOCKED`; unlocked+closed → `IS_WALKABLE` (blocks sight, not movement — walking into it auto-opens it, "bump to open"); unlocked+open → `IS_WALKABLE | IS_LIGHT_PASSABLE`. Player and monster movement/pathfinding/FOV all read the same `colliderFlags` bits, so a door's lock state is enforced identically for both without extra code. Entities with `opensDoors === false` are blocked by a closed-but-unlocked door without mutating the shared door state (for "can't open doors" monsters).

Slide animation is driven by a small pure easing/progress model (no THREE.js dependency), advanced each RAF tick alongside billboards; the pane's texture swaps between `paneTile`/`paneTileLocked` based on lock state. A door's pick target is registered into the renderer's raycast pickable list exactly like a billboard's invisible pick-mesh, so `onCellHover`/`onCellClick` work without any dev-side plumbing.

`dungeon/doors.ts` also has dungeon-generation-time placement helpers (`findDoorCandidates`, `wallOffDoorGroup`) for locating a single door cell per corridor-to-room opening and walling off the rest of a multi-cell threshold — used by a dev's `onPlace` callback to decide where to register doors.

**Files:**
- `dungeon/doors.ts` — `DoorCandidate`, `DoorRecord` (extended with `visual: DoorVisual`), `DoorVisual` (`frameTile`, `frameTileBack?`, `paneTile`, `paneTileLocked?`, `axis?`, `slideDistance?`, `duration?`, `easing?`), `DoorAxis`, `DoorState`, `DoorAnimState`; `findDoorCandidates()` / `wallOffDoorGroup()` placement helpers; `computeDoorProgress(anim, now, visual)` pure slide-progress function shared by the renderer
- `animations/easing.ts` — `EasingFn`, `EasingName`, named easing functions (`linear`, `easeInQuad`/`easeOutQuad`/`easeInOutQuad`, `easeInCubic`/`easeOutCubic`/`easeInOutCubic`), `EASINGS` lookup, `resolveEasing()`
- `api/createGame.ts` — `internal.doors: Map<string, DoorRecord>`; `DoorsHandle` (`list`, `add`, `remove`, `get`, `at`, `open`, `close`, `lock`, `unlock`, `toggle`) exposed as `game.dungeon.doors`; `applyDoorColliderFlags()` / `findDoorAt()` / `setDoorOpen()` helpers shared by the handle and the movement path; `customApplyAction`'s move branch bumps open a closed-unlocked door before the walkability check (honoring `entity.opensDoors === false`); the `interact` action's door branch resolves `internal.doors.get(targetId)` and emits `'door-state'` (`locked-attempt` when locked, otherwise toggles); `regenerate()` clears `internal.doors`
- `rendering/atlasGeometry.ts` — `computeFaceAO()`, `computeSkirtFaceAO()`, `makeFaceMatrix()`, `buildInstancedMesh()`, `HALF_PI`; split out of `dungeonRenderer.ts` so both it and `doorRenderer.ts` can share these atlas-shader geometry helpers without a circular import
- `rendering/doorRenderer.ts` — `createDoorMesh(door, deps)` builds the frame (2-instance InstancedMesh, one material) + pane (1-instance, double-sided material) + invisible pick mesh for one door; returns a `DoorHandle` (`update(now)`, `getPickObject()`, `dispose()`); `axisDirs()`/`boundaryFor()` derive the two frame-facing directions and their wall-matching boundary transforms from `door.yaw`
- `rendering/dungeonRenderer.ts` — `doorMap: Map<string, DoorHandle>`; public `setDoors(doors)` method (mirrors `setObjects`) using `makeIsSolid()` for frame AO; RAF `tick()` advances each door's animation; `getCellAtPointer()`'s pickable array includes door pick objects; `destroy()` disposes all door handles
- `events/eventEmitter.ts` — `'door-state': { door: DoorRecord; reason: 'open'|'close'|'lock'|'unlock'|'locked-attempt' }` event
- `dungeon/mapFile.ts` — optional `doors?: DoorRecord[]` on `DungeonMapFile`/`ExportOptions`/`ImportResult`, following the same optional/backwards-compatible pattern as `objectPlacements`
- `index.ts` — exports `findDoorCandidates`, `wallOffDoorGroup`, `computeDoorProgress`, `createDoorMesh`, door/easing types, and the easing functions

**Example:**
- `examples/localhost/doors/` — two rooms separated by a single-cell wall column; the whole column is authored as a corridor-style opening and narrowed to one door cell via `findDoorCandidates()` + `wallOffDoorGroup()`; door starts locked (solid metal gate texture), `U` unlocks it (swaps to a grille pane), walking into it opens it with an eased vertical slide, hovering shows a tooltip via the door's pick object

---

### Callback-driven enemy spawning

**Files:**
- `entities/factory.ts` — `createEntity()` single factory; no built-in monster templates or stat defaults
- `api/createGame.ts` — `AtomicCore.attachSpawner(game, { onSpawn })`; game loop calls `onSpawn({ dungeon, roomId, x, y })` and adds returned entities via `turns.addActor()`; `DungeonOptions.onChooseSpawn(ctx)` callback receives `{ rooms, startRoom, endRoom }` and returns a `roomId` to override the default spawn position (works for both BSP and cellular); `SpawnChooserContext` type exported

---

### Stationary decoration entities

Placements are "stationary" by default but can be relocated at runtime via `game.dungeon.moveObject(id, x, z)` — see "Entity move glide" below for the glide behavior this drives (e.g. a force effect or pushed furniture).

**Files:**
- `entities/types.ts` — `ObjectPlacement` interface with optional `spriteMap?` field enabling billboard rendering via `renderer.setObjects()`; optional `id?: string` field (stable identity independent of position, required for `moveObject()` to find and glide the placement — otherwise the renderer's fallback type+position key changes on every move, which reads as "removed then re-placed" and snaps); decorations are plain `EntityBase` with `kind: 'decoration'`
- `entities/factory.ts` — `createEntity()` with `kind: "decoration"` and `alive: false` for stationary decorations; auto-generated `id`
- `api/createGame.ts` — `AtomicCore.attachDecorator(game, { onDecorate })`; `game.dungeon.decorations.add()`, `.remove()`, `.list` (all `EntityBase`); `place.billboard(x, z, type, spriteMap, opts?)` places a stationary billboard sprite stored in `game.dungeon.objects`, auto-generating `id: billboard_${type}_${x}_${z}` unless `opts.id` overrides it; `game.dungeon.objects` read-only `ObjectPlacement[]` list reset on `regenerate()`; `game.dungeon.moveObject(id, x, z): boolean` looks up the placement by `id`, mutates its `x`/`z`, and emits `'object-move'` on `game.events` (`{ object, from, to }`) — returns `false` if no placement has that `id`
- `events/eventEmitter.ts` — `'object-move': { object: ObjectPlacement; from: {x,z}; to: {x,z} }` event
- `rendering/dungeonRenderer.ts` — `renderer.setObjects(objects)` syncs stationary billboard objects; creates `BillboardHandle` for each `ObjectPlacement` with `spriteMap`; RAF loop calls `handle.update()` each frame so sprites always face the camera; objects are now keyed by `objectKey(obj)` (= `obj.id` when present, else the legacy `type_x_z` string) instead of a raw position string, so a moved object keeps its existing billboard handle rather than being torn down and recreated

**Example:**
- `examples/localhost/billboard-sprites/billboard-sprites.js` — places a pushable chair and sideboard via `dungeon.onPlace`/`place.billboard(..., { id })`; the "push" keybinding (F) calls `game.dungeon.moveObject()` on whatever's directly ahead of the player

---

### Per-cell skirt tile customization

Two RGBA DataTextures (`floorSkirtType`, `ceilSkirtType`) on `DungeonOutputs` provide 4 overlay slots per cell for skirt geometry — same encoding as `overlays`/`wallOverlays`/`ceilingOverlays` (R=slot1, G=slot2, B=slot3, A=slot4, value 0 = empty). All non-zero slots are composited on top of the skirt base tile in the fragment shader via `uSkirtLookup`, identical to how the surface painter works. Applies to all four skirt mesh types: floor edge, ceiling edge, floor wall-adjacent, ceiling wall-adjacent. `ThemeDef` accepts optional `floorSkirtType?` / `ceilSkirtType?` tile name fields.

**Files:**
- `dungeon/bsp.ts` — `floorSkirtType` and `ceilSkirtType` RGBA DataTextures in `DungeonOutputs`; `setFloorSkirtTiles(outputs, cx, cz, tiles[])` / `setCeilSkirtTiles(outputs, cx, cz, tiles[])` per-cell overlay slot write helpers
- `dungeon/cellular.ts` — same channels in `CellularDungeonOutputs`
- `dungeon/tiled.ts` — zero-filled channels to satisfy `DungeonOutputs` shape
- `dungeon/themes.ts` — optional `floorSkirtType?` / `ceilSkirtType?` string fields on `ThemeDef`
- `dungeon/serialize.ts` — optional `floorSkirtType?` / `ceilSkirtType?` Base64 RGBA fields in `SerializedDungeon`; `deserializeDungeon()` zero-fills missing skirt channels for backwards compatibility; `rehydrateDungeon()` applies stored skirt data over freshly generated textures when present
- `rendering/basicLighting.ts` — `uSkirtLookup` uniform; fragment shader composites all 4 non-zero slots from `uSkirtLookup` on top of the base tile (same pattern as `uOverlayLookup`)
- `rendering/dungeonRenderer.ts` — `floorEdgeMesh` gets its own `floorEdgeMat` (separated from `floorMat`) so its `uSkirtLookup` can be set independently; wall-adjacent skirts split into `floorWallSkirtMesh` / `ceilWallSkirtMesh` each with its own material; `syncSkirtLookupUniforms()` wires `floorSkirtType`/`ceilSkirtType` to the four skirt materials after dungeon build
- `index.ts` — exports `setFloorSkirtTiles`, `setCeilSkirtTiles`

---

### Per-index skirt texture assignment

Per-row base tile overrides for wall-adjacent skirt panels, plus two new panel types that appear on wall faces. Sky panels are vertical quads stacked above the wall top on open-sky cells; ceiling panels hang below the ceiling on any cell. Both panel types are populated by calling `setSkyPanelCount(outputs, cx, cz, count)` / `setCeilingPanelCount(outputs, cx, cz, count)` on the dungeon outputs (count 0–4, clamped). Per-row tile names are set via the new `SurfacePaintTarget` fields (`ceilSkirtBase`, `floorSkirtBase`, `skyPanels`, `ceilingPanels`); each is a `(string | null)[]` where index 0 = the row closest to the panel anchor, and null inherits the default base tile. Row index is passed from the renderer to the shader as a per-instance float attribute (`aRowIndex`) and read in the fragment shader to sample the correct channel of the `uBaseOverride` RGBA texture (R=row0, G=row1, B=row2, A=row3).

**Files:**
- `dungeon/bsp.ts` — `skyPanelCount` and `ceilingPanelCount` R8 DataTextures (both zero-filled at init); `setSkyPanelCount()` / `setCeilingPanelCount()` setters
- `dungeon/cellular.ts` — zero-filled `skyPanelCount` and `ceilingPanelCount` textures
- `dungeon/serialize.ts` — optional `skyPanelCount?` / `ceilingPanelCount?` Base64 fields in `SerializedDungeon`; backward-compatible
- `api/createGame.ts` — `SurfacePaintTarget` extended with `ceilSkirtBase?`, `floorSkirtBase?`, `skyPanels?`, `ceilingPanels?` (all `(string | null)[]`); surface painter callback fires when any new field is non-empty; `cell-paint` event includes new fields
- `rendering/basicLighting.ts` — `aRowIndex` (float, 1 slot) vertex attribute and `vRowIndex` varying; `uBaseOverride` (sampler2D) uniform; fragment shader samples `uBaseOverride` at the cell's overlay UV, reads the channel for the current row index, and uses the result as the base tile ID when non-zero (falling back to the atlas base tile)
- `rendering/dungeonRenderer.ts` — `buildInstancedMesh()` writes `aRowIndex` instanced attribute when `useAtlas`; `buildDungeon()` tracks per-panel row index for `ceilWallSkirtEdges`, `floorWallSkirtEdges`, `skyPanelEdges`, `ceilPanelEdges`; builds `skyPanelMesh` / `ceilingPanelMesh` from `skyPanelCount`/`ceilingPanelCount` textures; `syncBaseOverrideUniforms()` wires `overrideCeilSkirt`, `overrideFloorSkirt`, `overrideSkyPanels`, `overrideCeilPanels` OverlaySurface textures to their respective materials; `rebuildOverlayTexture()` and `updateOverlayCell()` handle the new `(string | null)[]` paint fields; `rebuild()` / `destroy()` dispose new meshes and surfaces
- `index.ts` — exports `setSkyPanelCount`, `setCeilingPanelCount`, `setFloorHeightOffset`, `setCeilingHeightOffset`

---

### Atlas surface painting (walls, floors, ceilings per-tile)

Per-cell shader overlay system. Up to 4 overlay tile names can be assigned per cell; the renderer composites them on top of the base tile in the fragment shader with no extra geometry or draw calls.

**Files:**
- `api/createGame.ts` — exports `SurfacePaintTarget = { floor?, wall?, ceil?, ceilSkirtBase?, floorSkirtBase?, skyPanels?, ceilingPanels? }` (up to 4 tile names per surface; `ceilSkirtBase`/`floorSkirtBase`/`skyPanels`/`ceilingPanels` accept `(string | null)[]` for per-row base tile overrides, null = default); `attachSurfacePainter(game, { onPaint })` registers a per-cell callback called during `generate()` returning `SurfacePaintTarget`; `game.dungeon.paint(x, z, target)` / `unpaint(x, z)` update the paintMap and emit a `'cell-paint'` event; `game.dungeon.paintMap` exposes the full map read-only; `game.dungeon.set(x, y, spriteName, options?)` simplified setter — applies the sprite name to floor+ceiling for open cells, wall only for solid cells; `SetCellOptions` supports `applyTextureTo`, `skyPanelCount`, `ceilingPanelCount`, `floorSkirt`, `ceilingSkirt` (Phase 1), `solid`, `colliderFlags` (Phase 2), `floorHeightOffset`, `ceilingHeightOffset` (Phase 3 wired — encoded as `128 + steps` before writing; `set()` performs this encoding automatically); `hazard`, `temperature` defined but not yet wired (Phase 4); `solid` auto-derives walkable/blocked/lightPassable defaults which explicit `colliderFlags` overrides; exports `SetCellOptions`, `ApplyTarget`, `ColliderFlags`; `game.dungeon.getCell(x, z)` returns `CellData | null` — reads all per-cell state from output textures and paintMap: `solid`, `walkable`, `blocked`, `lightPassable`, `regionId`, `floorHeightOffset` (decoded steps, null = pit), `ceilingHeightOffset` (decoded steps, null = open sky), `skyPanelCount`, `ceilingPanelCount`, `hazard`, `temperature`, `floorType`, `wallType`, `ceilingType`, `paint`; exports `CellData`
- `events/eventEmitter.ts` — `'cell-paint': { x, z, floor?, wall?, ceil? }` event; emitted by `paint()`/`unpaint()` for dynamic updates
- `rendering/dungeonRenderer.ts` — builds `uTileUvLookup` (1D float DataTexture: tile ID → atlas UV rect) once from the packed atlas; builds **three** W×H Uint8 RGBA overlay DataTextures (floor, wall, ceil) after each `generate()`; each material receives its own surface's texture (`floorMat`/`floorEdgeMesh` → floor, `wallMat` → wall, `ceilMat`/`ceilEdgeMat` → ceil); listens to `'cell-paint'` to update only the changed surface(s) in-place; adds `aCellX`/`aCellZ` per-instance attributes to all base geometry meshes
- `rendering/basicLighting.ts` — `BASIC_ATLAS_VERT` forwards `aCellX`/`aCellZ` as `vOverlayUv` (cell-normalised UV into `uOverlayLookup`) and exposes `vLocalUv` (rotated face UV used for overlay tile sampling); `BASIC_ATLAS_FRAG` samples all 4 overlay slots and alpha-composites them over the base colour; new uniforms: `uOverlayLookup`, `uTileUvLookup`, `uTileUvCount`, `uDungeonSize`; `makeBasicAtlasUniforms()` accepts optional overlay params with safe 1×1 zero-texture defaults
- `atlas/atlas.ts` — `buildAtlasIndex(atlasJson)` resolves all atlas tile IDs at runtime from the developer's own atlas file
- `dungeon/bsp.ts` — `floorType`, `wallType`, `ceilingType`, `overlays`, `wallOverlays` channels in `DungeonOutputs`; `setSolid()` / `setColliderFlagsCell()` per-cell write helpers; `setFloorHeightOffset()` / `setCeilingHeightOffset()` height-offset write helpers (128 = no offset, clamped to [1,255] for floor and [0,255] for ceiling)
- `dungeon/themes.ts` — theme resolution writes initial floor/wall/ceiling type IDs into `DungeonOutputs` textures

---

### Configurable keybindings

**Files:**
- `api/keybindings.ts` — `KeyBinding` map (`Record<string, string[]>`), default binding set, `attachKeybindings(game, { bindings, onAction })` adds/removes a `keydown` listener on `document`

---

### Audio hooks

**Files:**
- `events/eventEmitter.ts` — emits `'audio'` event with `{ name, position }` at appropriate moments (footstep, hit, death); audio event name constants exported for discoverability
- `api/createGame.ts` — wires `game.events.on('audio', handler)` into the game handle

---

### Event system

**Files:**
- `events/eventEmitter.ts` — typed `EventEmitter` with `on`, `off`, `emit`; `GameEventMap` covering `damage`, `death`, `xp-gain`, `heal`, `miss`, `chest-open`, `item-pickup`, `turn`, `win`, `lose`, `audio`, `mission-complete`, `mission-peer-complete`
- All internal modules (`combat`, `inventory`, `passages`, `turn`) receive the emitter at construction time

---

### Supporting utilities

**Files:**
- `ai/astar.ts` — A* pathfinding
- `ai/fov.ts` — field-of-view computation and visibility mask
- `ai/spatial.ts` — spatial hash / proximity queries
- `ai/monsterAI.ts` — default chase behaviours (`decideChasePlayer`, `computeChasePathToPlayer`, `monsterAlertConfig`); developers supply custom AI via per-entity state machines
- `utils/rng.ts` — `makeRng(seed)` seeded LCG PRNG; exported from public API for use in deterministic generate callbacks
- `utils/geometry.ts` — `hasLineOfSight`, `cardinalDir`, `normalizeUvRect`, `MinHeap<T>`, `octile()`
- `utils/minimap.ts` — explored mask state and minimap canvas rendering

**Build-time scripts (in `utils/`):**
- `utils/imageToBase64Js.sh` — Bash script: converts an image to a Base64 JS data-URL file (`window.ATLAS_DATA_URL = "data:..."`)
- `utils/image.ToBase64Js.ps1` — PowerShell equivalent of the above, for Windows

---

### Mission / quest system

Evaluator-driven mission system that hooks into the turn loop. The developer registers missions with `game.missions.add()`, providing an evaluator callback and an optional `onComplete` callback. The evaluator is called once per turn for every active mission; returning `true` marks the mission complete. Completion emits a `mission-complete` event on the game event emitter and calls `onComplete` synchronously. In multiplayer sessions the completion is broadcast to all peers via the transport, causing each peer to emit a `mission-peer-complete` event. Single-player games are completely unaffected — the transport path is gated behind optional interface methods.

**Files:**
- `missions/types.ts` — `Mission`, `MissionStatus`, `MissionContext`, `MissionEvaluator`, `MissionCompleteCallback`, `MissionDef`, `MissionsHandle`
- `missions/missionSystem.ts` — `createMissionSystem(events, transport)` factory; internal mutable `MissionRecord` map, per-turn `_tick()` evaluator loop, completion sequencing (event → callback → transport broadcast)
- `events/eventEmitter.ts` — `mission-complete` and `mission-peer-complete` entries in `GameEventMap`
- `transport/types.ts` — optional `sendMissionComplete()` and `onMissionComplete()` methods on `ActionTransport`
- `transport/websocket.ts` — sends `{ type: 'mission_complete', missionId, name }` client→server; receives and routes the server broadcast to registered `onMissionComplete` handlers
- `api/createGame.ts` — instantiates mission system, wires `_tick` to the `turn` event, wires `onMissionComplete` to emit `mission-peer-complete`, exposes `game.missions`

---

### Multiplayer action transport (optional middleware)

Dependency-injection layer that makes the server authoritative for all player actions and monster AI. When `GameOptions.transport` is set, `game.turns.commit()` forwards actions to the server instead of applying them locally; the server validates each action, runs monster AI (chase + 4-directional movement + melee combat), updates canonical state, and broadcasts a `ServerStateUpdate` to all connected clients. `createGame` registers a reconciliation handler that patches local turn state, auto-registers monster entities in `entityById` for non-host clients, and re-emits the `"turn"` event. Initial state messages buffered during `connect()` are replayed when the first `onStateUpdate` handler registers so late-joining clients see current monster positions immediately. Single-player code paths are completely unaffected.

Developer-defined entity fields (e.g. `mp`, `stamina`, `spriteName`, `effects`) are automatically synced to all peers on every action: `turns.commit()` bundles all non-server-managed fields into the action message; the server strips protected fields (`x`, `y`, `hp`, `maxHp`, `alive`, `facing`) and relays the rest; the reconciliation handler spreads them back onto the entity so peers can access `entity.mp` etc. directly. The old `sendMeta` / `PlayerNetState.meta` pattern has been removed — `PlayerNetState` now carries an index signature for arbitrary fields.

**Files:**
- `transport/types.ts` — `ActionTransport` interface, `ServerStateUpdate`, `PlayerNetState` (index signature for developer-defined fields; server-authoritative fields explicitly typed), `DungeonInitPayload`, `DungeonSetPayload`, `MonsterNetState` (uses `spriteName`; deprecated `type`/`sprite` kept optional for backward compatibility with older save files); optional `sendDungeonSet()`/`onDungeonSet()` methods for runtime cell sync
- `transport/websocket.ts` — `createWebSocketTransport(url)` browser-side factory; buffers `state` messages before `onStateUpdate` is registered and replays them on first handler registration; `send()` includes `entityState` with each action; `sendDungeonSet()`/`onDungeonSet()` for `dungeon_set` messages
- `api/createGame.ts` — `GameOptions.transport`, `PlayerOptions.id`, commit intercept (collects entity extra fields and passes to `transport.send()`), reconciliation wiring (spreads all server state fields onto entity); auto-registers and syncs monster entities from state updates; `dungeon.set()` sends `dungeon_set` to server unless `skipSync: true`; `onDungeonSet` handler applies remote cell changes locally; `SetCellOptions.skipSync` skips server sync (use for deterministic bulk init)

**Server:**
- `src/server/index.js` — Express + `ws` authoritative server; generates the dungeon server-side for spawn derivation; uses host's provided solid map from `dungeon_init` (post-generation modifications included); handles `dungeon_set` to update `room.solid` and broadcast to other clients; validates player moves (including monster-blocking); resolves player→monster and monster→player melee combat; runs `runMonsterAI()` (4-directional chase, one step per player action) after each accepted action; stores developer-defined entity fields in `player.extra` (server-managed fields stripped); broadcasts `{ ...player.extra, x, y, hp, maxHp, alive, facing }` to all peers
- `src/server/dungeon-entry.ts` — thin build entry that re-exports `generateBspDungeon` for the server build
- `src/server/three-shim.js` — minimal `THREE.DataTexture` shim so `bsp.ts` runs in Node without a real GPU or browser context; only `image.data` is needed server-side
- `vite.config.server.ts` — separate Vite config that compiles the server dungeon module with `three` aliased to the shim; outputs `dist/server/dungeon.js`

**Example:**
- `examples/localhost/multiplayer/` — mirrors the basic example but connects to the server first; `spriteName` passed via both `connect()` meta and `player.spriteName` so it seeds the server's initial state and stays in sync on every action; `network-state` handler spreads the full `ps` object onto each peer entity (y→z remapped) so all custom fields are accessible directly; `spriteMapForKey(ps.spriteName)` replaces the old `ps.meta?.sprite` lookup

---

### Tutorial / mission example

Demonstrates ten core systems through a set of chained and parallel missions. Missions 1 and 2 are chained (mission 2 registered in mission 1's `onComplete`); missions 3–10 are registered upfront so multiple objectives are visible simultaneously.

| # | Mission | System demonstrated |
|---|---------|---------------------|
| 1 | First Steps | `missions.add`, metadata accumulation, position tracking |
| 2 | Into the Dark | BSP room graph, `startRoomId`, corridor detection via `onComplete` chain |
| 3 | Wait and Watch | Per-action flag (`_lastAction`) set before `turns.commit()`, consecutive-turn tracking |
| 4 | Open a Chest | `dungeon.onPlace` for chest placement, `decorations.list` proximity search, `chest-open` event |
| 5 | Pick Up an Item | `createItem`, `item-pickup` event, tutorial-bag flag |
| 6 | Use an Item | Custom `useItem` keybinding, `_hasPotionInBag` flag |
| 7 | First Blood | `combat.onDamage` callback, `defender.faction` check |
| 8 | Enemy Slain | `combat.onDeath` callback, enemy placed via `place.enemy` in `onPlace` |
| 9 | Explorer | `_solidData` cached post-generate, radius-3 FoV approximation via `_visitedCells` Set |
| 10 | Find the Exit | `endRoomId` from BSP output, `_endRoom` captured in `onPlace`, bounding-rect player check |

Also adds: `attachMinimap` on a `<canvas>` overlay; per-mission progress display in `renderMissions()`; F / U keybindings for interact and use-item.

**Files:**
- `examples/tutorial/index.html`
- `examples/tutorial/styles.css`
- `examples/tutorial/tutorial.js`

---

### Inventory dialog UI

RPG-style inventory dialog with a two-column layout: character profile + item grid on the left, equipment paper-doll + indicators + action buttons on the right. Supports drag-and-drop between inventory and equip slots, keyboard navigation, custom backgrounds, and a `customLayout` escape hatch for fully custom DOM.

**Files:**
- `ui/inventoryDialog.ts` — `showInventory(opts)` factory; builds and opens a `<dialog>` with the full default layout or a bare shell for `customLayout: true`; returns an `InventoryHandle`
- `ui/inventoryDialog.css` — all `.inv-*` styles and CSS custom properties; emitted as `dist/atomic-core.css`; consumers import via `atomic-core/style.css` or link the dist file directly

---

### Turn-animation callback system

Async callback layer that fires between turn resolution and entity-position sync. Developers register handlers on `game.animations` for specific event kinds (`damage`, `death`, `move`, `attack`, `miss`, `heal`, `xp-gain`). After each `game.turns.commit()` the engine awaits all queued handlers in turn order before syncing entity positions to the render layer, so motion tweens, floating text, and hit-flash effects see entities at their pre-move positions. Works in both single-player (events collected during the turn loop) and multiplayer (events reconstructed by diffing the `ServerStateUpdate` against the previous actor state).

The dungeon renderer itself now consumes the `move` event internally (in addition to any dev-registered handlers) to smooth out entity rendering: instead of an entity's billboard/mesh snapping instantly to its new grid cell, it glides there over a short, fixed-duration tween — see "Entity move glide" below.

**Files:**
- `animations/types.ts` — `AnimationEventKind`, `AnimationEventMap`, `AnimationQueueEntry`, `AnimationHandler`, `AnimationsHandle` public types
- `animations/animationRegistry.ts` — `createAnimationRegistry()` factory; internal `_enqueue()` / `_flush()` methods used by `createGame`; `on`, `off`, `clear` on the public handle
- `api/createGame.ts` — `makeApplyAction` emits animation events via optional `onAnimEvent` callback; `turns.commit()` is now `async`, flushes registry after the turn loop; `onStateUpdate` diffs old vs. new actor state to synthesize animation events in multiplayer; exposes `game.animations`

---

### Entity move glide

Entities visually glide from their old grid cell to their new one over a short, fixed-duration tween instead of snapping instantly — logic stays fully grid-based/instant; only the rendered x/z position is smoothed. Driven by the existing `AnimationEventMap['move']` event (see "Turn-animation callback system" above), which the renderer subscribes to internally via `game.animations.on('move', ...)`; this event reliably fires with correct `from`/`to` positions before the entity's raw `x`/`z` fields are mutated in both the local-turn and network-sync paths, so the tween never races the logical position update. Modeled directly on the door slide-open animation (`DoorAnimState`/`computeDoorProgress` in `dungeon/doors.ts`): a per-entity `{fromX, fromZ, toX, toZ, startTime}` tween state, advanced with a pure `now`-based progress function, with mid-flight interruption handled by capturing the entity's current interpolated position as the new `from` if another move arrives before the previous glide finishes.

The same tween mechanism also covers `ObjectPlacement`s (stationary billboard objects — furniture, props), for force/push mechanics: `game.dungeon.moveObject(id, x, z)` (see "Stationary decoration entities" above) mutates the placement and emits `'object-move'` on `game.events`; the renderer subscribes to that the same way, using a second, parallel tween map keyed by `objectKey()` instead of entity `id`, since `ObjectPlacement`s aren't part of the turn/animation-event system.

**Files:**
- `entities/moveAnim.ts` — `EntityMoveAnimState` type; pure `computeEntityMovePosition(anim, now, durationMs, easing)` function (no THREE.js dependency), mirroring `computeDoorProgress`; shared by both the entity and object tweens
- `rendering/dungeonRenderer.ts` — `moveAnimMs?` (default `130`, set `0` to disable) and `moveAnimEasing?` options on `DungeonRendererOptions`, shared by entities and objects; `entityMoveAnimMap` / `onEntityMove` (via `game.animations.on('move', ...)`) drive entity gliding as described above; `objectMoveAnimMap: Map<string, EntityMoveAnimState>` / `onObjectMove` (via `game.events.on('object-move', ...)`) drive the equivalent for objects, keyed by `objectKey(obj)`; both handlers capture the current interpolated position as the new `from` on interrupt; in `tick()`, the interpolated `{x, z}` is used instead of the raw position for the billboard update call (via a shallow-copied render-only object) and for the box-mesh `position.setX`/`setZ`; culling distance and floor-offset lookups still use the raw target position; expired tweens are deleted from their map; `destroy()` unsubscribes both listeners and clears both maps
- `animations/easing.ts` — `resolveEasing()` reused by `computeEntityMovePosition`

**Example:**
- `examples/localhost/billboard-sprites/billboard-sprites.js` — sets `moveAnimMs: 220` (exaggerated from the 130ms default) on `createDungeonRenderer` so chase-AI enemies visibly ease between tiles; also logs each enemy step via `game.animations.on('move', ...)` filtered to `entity.kind === "enemy"`; places two pushable furniture `ObjectPlacement`s (`chair-1`, `sideboard-1`) via `dungeon.onPlace`/`place.billboard(..., { id })`, and a "push" keybinding (F) calls `game.dungeon.moveObject(id, x, z)` on whatever's directly ahead — a force/push mechanic that glides via the `'object-move'` event, logged the same way as entity moves

---

### Movement-idle signal (`isAnimating()` / `onIdle()`)

`game.turns.commit()`'s returned promise resolves once queued animation-event handlers finish — it does not wait for the renderer's own visual work (the camera glide/turn lerp toward the player's tile, or entity/object move tweens), since those run independently on a `requestAnimationFrame` loop and `game`/`TurnsHandle` has no reference to the renderer at all. Previously there was no way to know "the previous move has finished drawing, it's safe to accept the next input" — the camera lerp in particular is an unbounded exponential smoothing with no arrival event. `isAnimating()`/`onIdle()` close that gap on the renderer side: the camera lerp is now also considered "arrived" once it's within a small position/yaw epsilon of its target, matching how entity/object tweens already have a hard end time (`moveAnimMs`).

**Files:**
- `rendering/dungeonRenderer.ts` — `cameraMoving` (camera-lerp-in-progress flag, set each `tick()` frame from an epsilon comparison of `curX/curY/curZ/curYaw` against `tgtX/tgtY/tgtZ/tgtYaw`), `wasAnimating`/`idleCallbacks` closure state; public `isAnimating(): boolean` (`cameraMoving || entityMoveAnimMap.size > 0 || objectMoveAnimMap.size > 0`; door slides not included) and `onIdle(callback): () => void` (fires once per `true → false` transition of the above, at the end of each `tick()`; returns an unsubscribe function) on the `DungeonRenderer` handle; `idleCallbacks` cleared in `destroy()`

**Example:**
- `examples/standalone/basic/basic.js`, `examples/standalone/tutorial/tutorial.js`, `examples/localhost/tutorial/tutorial.js` — `onAction` handlers gate `game.turns.commit(a)` behind `!renderer.isAnimating()` so a movement key pressed mid-glide is dropped instead of committing a new turn before the previous one has finished animating

---

### Dungeon map file import/export

Self-contained save/load layer that wraps a `SerializedDungeon` with all settings needed to reproduce the exact dungeon and renderer in a new session. The embedded `version` field matches the atomic-core npm package version at export time (injected via Vite `define`) and is intended for backward-compatibility gating on import. Non-serializable renderer fields (packedAtlas, tileNameResolver, event callbacks) are stripped at export; re-supply them when creating the renderer after load.

**Files:**
- `dungeon/mapFile.ts` — `DungeonMapFile` wrapper type (`version`, `exportedAt`, `meta?`, `generatorOptions`, `rendererOptions`, `dungeon`, `objectPlacements?`); `DungeonMapMeta` optional author metadata type; `SerializedRendererOptions` = `DungeonRendererOptions` minus callbacks/PackedAtlas; `ExportOptions` caller input type (includes optional `paintMap` forwarded to `serializeDungeon`, optional `objectPlacements` array); `ImportResult` return type (includes optional `paintMap` for re-application via `game.dungeon.paint()`, optional `objectPlacements` for re-application via `place.billboard()` or `renderer.setObjects()`); `exportDungeonMap(dungeon, opts)` builds the wrapper; `dungeonMapToJson()` convenience JSON string; `importDungeonMap(data)` reconstructs `BspDungeonOutputs` + all settings including paintMap and objectPlacements; `dungeonMapFromJson(json)` convenience parse wrapper
- `index.ts` — exports `exportDungeonMap`, `dungeonMapToJson`, `importDungeonMap`, `dungeonMapFromJson` and all associated types

---

### Public API surface

**Files:**
- `api/createGame.ts` — `AtomicCore.createGame(canvas, options)`; instantiates all subsystems and returns the `game` handle
- `api/player.ts` — player handle and action methods
- `api/actions.ts` — action pipeline middleware
- `api/keybindings.ts` — DOM keybinding attachment
- `index.ts` — re-exports the public `AtomicCore` namespace: `createGame`, `attachMinimap`, `attachSpawner`, `attachDecorator`, `attachSurfacePainter`, `attachKeybindings`, `createEntity`, `createItem`, `createFactionRegistry`, `createFactionRegistryFromTable`, `createWebSocketTransport`, `packedAtlasResolver`, `loadSkybox`, `generateCellularDungeon`, `setSkyPanelCount`, `setCeilingPanelCount`; types: `EntityCoreOpts`, `CombatResolver`, `CombatResolverContext`, `CombatResult`, `FactionRegistry`, `FactionStance`, `FactionId`, `SkyboxFaces`, `SkyboxOptions`, `RoomedDungeonOutputs`, `CellularOptions`, `CellularDungeonOutputs`, `SpawnChooserContext`
