# Plan: Per-Cell Skirt Tile Textures

## Goal

Allow per-cell customization of floor and ceiling skirt tile types. Currently skirt tiles are only configurable globally (via `floorSkirtTiles` and `ceilSkirtTiles` in `DungeonRendererOptions`). This plan adds per-cell packed texture channels that let each map cell specify which tile to render on each of its four skirt faces.

---

## Background

### Current Skirt System

Skirts are vertical panels that bridge height differences between adjacent cells. Four skirt scenarios exist (in `dungeonRenderer.ts` ~lines 1040–1199):

- **Floor edge skirts** — floor is higher than open neighbor's floor
- **Wall-adjacent floor skirts** — sunken floor meets a wall neighbor (uses wall tile as base, repeated downward)
- **Ceiling edge skirts** — ceiling is lower than open neighbor's ceiling
- **Wall-adjacent ceiling skirts** — raised ceiling meets a wall neighbor (uses wall tile as base, repeated upward)

Currently, the tile used for each skirt is resolved in priority order:
1. `floorSkirtTiles[direction]` / `ceilSkirtTiles[direction]` — global per-direction override in renderer options
2. Fall back to the floor/ceiling/wall tile for the cell

### Current Texture Channels

All cell data is stored as DataTextures (one pixel per cell). Existing channels relevant here:

| Channel | Format | Purpose |
|---|---|---|
| `floorType` | R8 | Tile ID for floor surface (0–255) |
| `ceilingType` | R8 | Tile ID for ceiling surface (0–255) |
| `wallType` | R8 | Tile ID for wall surfaces (0–255) |
| `overlays` | RGBA | Bit-flags for floor overlays (R=IDs 1–8, G=9–16, B=17–24, A=25–32) |
| `floorHeightOffset` | R8 | Floor Y offset (128 = zero, 129+ = raised) |
| `ceilingHeightOffset` | R8 | Ceiling Y offset (127 = zero, inverse encoding) |

---

## Proposed Changes

### 1. New Texture Channels

Add two new RGBA DataTextures to `DungeonOutputs`, following the same pattern as the existing `overlays` / `wallOverlays` / `ceilingOverlays` channels:

```ts
floorSkirtType: DataTexture  // RGBA: R=north, G=south, B=east, A=west skirt tile IDs
ceilSkirtType:  DataTexture  // RGBA: R=north, G=south, B=east, A=west skirt tile IDs
```

The RGBA→direction mapping (R=N, G=S, B=E, A=W) mirrors the `DirectionFaceMap` key order (`north`, `south`, `east`, `west`) and is consistent with how the surface painter reads overlay channels. Each byte stores a tile ID.

**Value convention:**
- `0` = "use renderer fallback" (existing global/cell fallback logic, no change in behavior)
- `1–255` = explicit tile ID to use for that face's skirt

This preserves full backwards compatibility — zero-initialized DataTextures default to `0`, falling through to current logic everywhere.

### 2. Generator Changes (`bsp.ts`, `cellular.ts`)

- Add `floorSkirtType` and `ceilSkirtType` to the `DungeonOutputs` type.
- Initialize both as RGBA DataTextures filled with zeros (`maskToDataTextureRGBA`, same as `overlays`).
- Theme application during generation populates these from `ThemeDef.floorSkirtType` / `ThemeDef.ceilSkirtType` (see §5).

### 3. Serialization Changes (`serialize.ts`)

- Add `floorSkirtType` and `ceilSkirtType` to the serialized dungeon JSON — base64-encoded RGBA arrays, same as existing overlay channels.
- Deserializer reconstructs both DataTextures on load.
- Graceful fallback for older serialized dungeons that lack these fields: treat missing as zero-filled (no skirt overrides).

### 4. Renderer Changes (`dungeonRenderer.ts`)

**Edge skirts (floor edge, ceiling edge):** Replace current tile resolution with:

1. Read `floorSkirtType[cx, cz]` / `ceilSkirtType[cx, cz]` RGBA pixel.
2. Select channel for current direction (R=N, G=S, B=E, A=W).
3. If non-zero → use as tile ID.
4. Otherwise fall through to existing logic (`floorSkirtTiles[direction]` → floor/ceil tile).

**Wall-adjacent skirts (floor wall-adjacent, ceiling wall-adjacent):** Keep the current wall-tile base (repeated panels) as the bottom layer. Then, if the corresponding `floorSkirtType` / `ceilSkirtType` channel for that direction is non-zero, render an additional layer on top of the wall repeat using that tile ID. This allows decorating wall-adjacent skirts without replacing the structural wall tile underneath.

No geometry changes. Only tile ID resolution and layering logic changes.

### 5. Theme Integration (`themes.ts`)

Extend `ThemeDef` with optional skirt tile names:

```ts
export type ThemeDef = {
  floorType: string;
  wallType: string;
  ceilingType: string;
  /** Optional: tile name for floor skirt faces. Omit to use floorType fallback. */
  floorSkirtType?: string;
  /** Optional: tile name for ceiling skirt faces. Omit to use ceilingType fallback. */
  ceilSkirtType?: string;
};
```

During generation, when a theme is applied to a region, if `floorSkirtType` or `ceilSkirtType` is specified, write the resolved tile ID into all four RGBA channels of `floorSkirtType` / `ceilSkirtType` for every cell in that region. Per-direction variation within a region can be done post-generation by the caller.

### 6. Public API (`index.ts`)

- Export `floorSkirtType` and `ceilSkirtType` as part of the public `DungeonOutputs` type.
- Expose helpers that accept a full `DirectionFaceMap` object:
  ```ts
  setFloorSkirtTiles(outputs: DungeonOutputs, cx: number, cz: number, map: DirectionFaceMap): void
  setCeilSkirtTiles(outputs: DungeonOutputs, cx: number, cz: number, map: DirectionFaceMap): void
  ```
  Each writes only the directions present in the map; absent directions leave the existing byte unchanged.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| RGBA vs R8 per channel | RGBA (4 directions per texture) | Fewer textures; all 4 faces in one sample; matches overlay pattern |
| Direction encoding | R=N, G=S, B=E, A=W | Matches `DirectionFaceMap` key order; consistent with surface painter |
| `0` = fallback vs explicit tile | `0` = fallback | Zero-init is free; backwards compat |
| Helper granularity | Full `DirectionFaceMap` | Consistent with existing API; partial updates via map presence check |
| Wall-adjacent skirt override | Layered on top of wall-tile base | Preserves structural appearance; allows decoration without replacing base |
| Theme skirt fields | Optional strings on `ThemeDef` | Additive — all existing themes stay valid without changes |

---

## Files to Change

| File | Change |
|---|---|
| `src/lib/dungeon/bsp.ts` | Add channels to `DungeonOutputs`, initialize in generator, populate from theme |
| `src/lib/dungeon/cellular.ts` | Initialize new channels, populate from theme |
| `src/lib/dungeon/themes.ts` | Add optional `floorSkirtType` / `ceilSkirtType` to `ThemeDef` |
| `src/lib/dungeon/serialize.ts` | Serialize/deserialize new channels |
| `src/lib/rendering/dungeonRenderer.ts` | Read per-cell skirt tile IDs in 4 skirt code blocks; layered wall-adjacent logic |
| `src/lib/index.ts` | Export new fields and helper functions |
