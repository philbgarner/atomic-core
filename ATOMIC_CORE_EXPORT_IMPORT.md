# atomic-core export/import: missing data

## Root cause

`serializeDungeon()` / `SerializedDungeon` is missing two categories of data:

1. **Floor and ceiling height offsets** — the `floorHeightOffset` and `ceilingHeightOffset`
   DataTextures exist on `BspDungeonOutputs.textures` but are never read by `serializeDungeon`.

2. **Surface paint map** — the per-cell tile-name overlays managed by `game.dungeon.paint()` /
   `game.dungeon.paintMap` are not on `BspDungeonOutputs` at all, so `serializeDungeon` cannot
   see them. The existing doc comment on `importDungeonMap` explicitly notes this as a known gap:
   *"surface-painter overlays are zeroed on import (not serialized)"*.

---

## Required changes

### 1. `SerializedDungeon` — add three optional fields

```ts
export type SerializedDungeon = {
  // ... existing fields unchanged ...

  /** Base64-encoded R8 Uint8Array matching textures.floorHeightOffset. */
  floorHeightOffset?: string;

  /** Base64-encoded R8 Uint8Array matching textures.ceilingHeightOffset. */
  ceilingHeightOffset?: string;

  /**
   * Per-cell surface-painter tile-name overlays, keyed by "x,z".
   * Values match SurfacePaintTarget: { floor?, wall?, ceil? } each an array of tile name strings.
   */
  paintMap?: Record<string, { floor?: string[]; wall?: string[]; ceil?: string[] }>;
};
```

---

### 2. `serializeDungeon(dungeon, paintMap?)` — serialize the new fields

Add an optional second argument for the paint map (heights come directly from the dungeon textures):

```ts
export declare function serializeDungeon(
  dungeon: BspDungeonOutputs,
  paintMap?: ReadonlyMap<string, { floor?: string[]; wall?: string[]; ceil?: string[] }>
): SerializedDungeon;
```

**Implementation:**

```ts
// heights — read directly from optional textures
if (dungeon.textures.floorHeightOffset?.image.data) {
  serialized.floorHeightOffset = toBase64(dungeon.textures.floorHeightOffset.image.data as Uint8Array)
}
if (dungeon.textures.ceilingHeightOffset?.image.data) {
  serialized.ceilingHeightOffset = toBase64(dungeon.textures.ceilingHeightOffset.image.data as Uint8Array)
}

// paint map — caller-supplied (lives on DungeonHandle, not BspDungeonOutputs)
if (paintMap && paintMap.size > 0) {
  serialized.paintMap = Object.fromEntries(paintMap)
}
```

---

### 3. `ExportOptions` — expose paintMap to the export API

```ts
export type ExportOptions = {
  meta?: DungeonMapMeta;
  generatorOptions: BspDungeonOptions;
  rendererOptions?: DungeonRendererOptions;

  /**
   * Supply game.dungeon.paintMap here.
   * Stripped of non-serializable fields automatically (there are none — it's already plain strings).
   */
  paintMap?: ReadonlyMap<string, { floor?: string[]; wall?: string[]; ceil?: string[] }>;
};
```

`exportDungeonMap` and `dungeonMapToJson` should forward `options.paintMap` to `serializeDungeon`.

---

### 4. `deserializeDungeon` / `rehydrateDungeon` — restore height textures

Both functions should restore the optional height DataTextures when the fields are present in the
snapshot. Use the same DataTexture construction used for `solid`, `regionId`, etc. (R8, width×height).

After construction mark `needsUpdate = true` so Three.js uploads the data.

The `paintMap` field does **not** need to be applied here — it is returned to the caller via
`ImportResult` (below) so they can re-apply it through `game.dungeon.paint()` after the game is
initialized.

---

### 5. `ImportResult` — add paintMap

```ts
export type ImportResult = {
  dungeon: BspDungeonOutputs;
  generatorOptions: BspDungeonOptions;
  rendererOptions: SerializedRendererOptions;
  meta: DungeonMapMeta | undefined;
  version: string;

  /** Restored paint map, if the file contained one. Re-apply via game.dungeon.paint(). */
  paintMap?: Record<string, { floor?: string[]; wall?: string[]; ceil?: string[] }>;
};
```

`importDungeonMap` / `dungeonMapFromJson` should copy `data.dungeon.paintMap` into the result.

---

## What ac-dc-edit will do after these changes

No atomic-core changes are needed in the editor beyond:

1. **Export** (`Toolbar.tsx`): pass `game.dungeon.paintMap` in ExportOptions:
   ```ts
   dungeonMapToJson(game.dungeon.outputs as BspDungeonOutputs, {
     generatorOptions,
     paintMap: game.dungeon.paintMap,
   })
   ```

2. **Import** (`DataContext` + `DungeonView`): store the full `ImportResult` (not just
   `generatorOptions`) so DungeonView can, after `g.generate()`:
   - Copy restored height texture data from `result.dungeon.textures.floorHeightOffset/ceilingHeightOffset`
     into the live dungeon textures and call `renderer.rebuild()`.
   - For each entry in `result.paintMap`, call `g.dungeon.paint(x, z, target)`.
   - Sync `cellHeights` and `cellPaints` in DataContext from the restored data so the editor UI
     reflects the imported state.

---

## Summary of files to touch in atomic-core

| File | Change |
|------|--------|
| `dungeon/serialize.ts` | Add fields to `SerializedDungeon`; update `serializeDungeon` to write heights + paintMap; update `deserializeDungeon` / `rehydrateDungeon` to restore height textures |
| `dungeon/mapFile.ts` | Thread `ExportOptions.paintMap` through to `serializeDungeon`; populate `ImportResult.paintMap` from deserialized data |
| `dungeon/mapFile.d.ts` | Add `paintMap` to `ExportOptions` and `ImportResult` |
| `dungeon/serialize.d.ts` | Add `floorHeightOffset?`, `ceilingHeightOffset?`, `paintMap?` to `SerializedDungeon`; update `serializeDungeon` signature |
