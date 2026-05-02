# Proposal: Per-Index Skirt Texture Assignment

**Decisions locked in:**
- 4-row cap per cell is acceptable
- Per-vertex attribute for row index (not world-position derivation)
- Scenario 1 (sky ceiling) is priority; Scenario 2 (existing skirt rows) ships alongside
- Floor skirt override included for symmetry even without a concrete use case

---

## Background

Two existing systems influence tile appearance above walls:

- **`setCeilSkirtTiles` / `setFloorSkirtTiles`** — up to 4 overlay tile IDs per cell, composited uniformly across *all* skirt rows for that cell. Good for decals/stains.
- **`attachSurfacePainter`** — per-cell callback returning overlay layers for `floor`, `wall`, `ceil` base surfaces. Does not touch skirt rows.

Neither lets you assign a different base texture to each skirt row.

---

## Concepts

### `skyPanels` — panels anchored to wall top, going up

For cells with a sky ceiling, no ceiling skirt geometry exists. `skyPanels` adds N extra vertical quads above the wall tile. Row index 0 is immediately above the wall; rows go upward from there.

```
[sky/open]
─────────── sky panel row 2 (tree-top)
─────────── sky panel row 1 (lower-branches)
─────────── sky panel row 0 (upper-trunk)
─────────── wall tile        (trunk-base) ← existing geometry, unchanged
[floor]
```

### `ceilingPanels` — panels anchored to ceiling base, going down

The symmetric counterpart to `skyPanels`, for cells with a normal ceiling. Emits N extra vertical quads hanging down from the ceiling tile. Row index 0 is immediately below the ceiling; rows go downward from there. These are separate from ceiling skirt tiles (which fill the structural gap from the wall up); ceiling panels are purely additive geometry anchored from above.

```
[ceiling tile]
─────────── ceiling panel row 0 (immediately below ceiling)
─────────── ceiling panel row 1
─────────── ceiling panel row 2
─────────── [skirt tiles / open space]
─────────── wall tile
[floor]
```

Both concepts use a dedicated material each, separate from skirt materials, and share the same per-vertex `rowIndex` attribute + shader uniform pattern.

---

## Scenarios

### Scenario 1 — Sky ceiling (**priority**)

Wall = tree trunk. Ceiling is sky. Use `skyPanels` to add branches and treetop above the wall.

### Scenario 2 — Tall ceiling with skirt rows

Wall = window bottom. Use `ceilSkirtBase` to override textures on existing skirt geometry row-by-row.

```
[ceiling tile]
─────────── ceil skirt row 3+ → default theme skirt
─────────── ceil skirt row 2  → window-top
─────────── ceil skirt row 1  → window-middle
─────────── ceil skirt row 0  → window-middle   ← index 0 = closest to wall top
─────────── wall tile
[floor]
```

---

## Public API

### `SurfacePaintTarget` extension

```typescript
export type SurfacePaintTarget = {
  floor?: string[];                     // overlay layers on floor tile
  wall?: string[];                      // overlay layers on wall tile
  ceil?: string[];                      // overlay layers on ceiling tile
  ceilSkirtBase?: (string | null)[];    // base texture per ceiling skirt row (index 0 = closest to wall top)
  floorSkirtBase?: (string | null)[];   // base texture per floor skirt row (index 0 = closest to wall bottom)
  skyPanels?: (string | null)[];        // textures for sky panels (index 0 = immediately above wall)
  ceilingPanels?: (string | null)[];    // textures for ceiling panels (index 0 = immediately below ceiling)
};
```

- Array index = row index, 0 being the row closest to its anchor point.
- `null` or missing index = default theme texture.
- Rows beyond array length fall back to default.
- Cap: 4 entries per array.

### Setter functions

```typescript
// Emit 3 sky panels above the wall at (cx, cz)
setSkyPanelCount(outputs, cx, cz, 3);

// Emit 2 ceiling panels below the ceiling at (cx, cz)
setCeilingPanelCount(outputs, cx, cz, 2);
```

Both are called during dungeon setup, before `generate()`. The corresponding `SurfacePaintTarget` arrays assign textures; unassigned rows within the panel count use the default.

### Scenario 1 usage — woodland sky ceiling

```typescript
setSkyPanelCount(outputs, treeX, treeZ, 3);

attachSurfacePainter(game, {
  onPaint: ({ x, y }) => {
    if (isTreeCell(x, y)) {
      return {
        skyPanels: [
          'tree-mid',      // row 0: immediately above wall
          'tree-branches', // row 1
          'tree-top',      // row 2
        ]
      };
    }
    return null;
  }
});
```

### Scenario 2 usage — tall window with ceiling panels

```typescript
setCeilingPanelCount(outputs, windowX, windowZ, 1);

attachSurfacePainter(game, {
  onPaint: ({ x, y }) => {
    if (isWindowCell(x, y)) {
      return {
        ceilSkirtBase: [
          'window-middle', // row 0
          'window-middle', // row 1
          'window-top',    // row 2
          null,            // row 3+: default theme skirt
        ],
        ceilingPanels: [
          'window-arch',   // row 0: decorative arch panel below the ceiling
        ]
      };
    }
    return null;
  }
});
```

### Combining with overlays

`ceilSkirtBase` / `skyPanels` / `ceilingPanels` replace the base texture before overlay compositing. The existing `setCeilSkirtTiles` overlay system still runs on top:

```typescript
onPaint: () => ({ ceilSkirtBase: ['window-middle', 'window-top'] })
setCeilSkirtTiles(outputs, cx, cz, [crackTileId, 0, 0, 0]); // overlay on top
```

---

## Implementation Plan

### Phase 1 — Per-vertex row index attribute (shared foundation)

Add a `rowIndex` per-vertex `uint8` attribute to:
- Ceiling skirt mesh (`ceilWallSkirtMat` geometry)
- Floor skirt mesh (`floorWallSkirtMat` geometry)
- Sky panel mesh (new)
- Ceiling panel mesh (new)

Row 0 = the quad closest to the anchor point (wall top for sky panels and skirt, ceiling bottom for ceiling panels). The vertex shader passes it through as `flat varying int vRowIndex`.

### Phase 2 — Skirt base override (Scenario 2)

1. Add `ceilSkirtBase` and `floorSkirtBase` to `SurfacePaintTarget`.
2. Add `skirtBaseOverrideCeil` and `skirtBaseOverrideFloor` `DataTexture`s to `DungeonOutputs` (W×H×RGBA Uint8 — RGBA = row 0–3 tile IDs).
3. Extend `writePaintToOverlayTexture` to write tile IDs into these textures.
4. Add `uSkirtBaseOverride` uniform to skirt materials.
5. Shader: if `uSkirtBaseOverride[cell].rgba[vRowIndex]` is non-zero, use it as the base color before overlay compositing.

### Phase 3 — Sky panels (Scenario 1, priority)

1. Add `skyPanelCount` `DataTexture` (W×H×1 Uint8) to `DungeonOutputs`. Setter: `setSkyPanelCount`.
2. Geometry build: after wall quads, emit N additional upward-facing quads per cell where count > 0. Each quad gets `rowIndex` = its offset above the wall.
3. New `skyPanelMat` material; shares shader logic with skirt material.
4. Add `skyPanelBaseOverride` `DataTexture` (W×H×RGBA Uint8).
5. Add `skyPanels` to `SurfacePaintTarget`; extend `writePaintToOverlayTexture`.
6. Shader: same `uSkyPanelBaseOverride[cell].rgba[vRowIndex]` pattern.

### Phase 4 — Ceiling panels

Symmetric to Phase 3, anchored downward from the ceiling tile instead of upward from the wall.

1. Add `ceilingPanelCount` `DataTexture` (W×H×1 Uint8). Setter: `setCeilingPanelCount`.
2. Geometry build: emit N downward quads below ceiling per cell where count > 0. `rowIndex` = 0 at ceiling base, increasing downward.
3. New `ceilingPanelMat` material.
4. Add `ceilingPanelBaseOverride` `DataTexture` (W×H×RGBA Uint8).
5. Add `ceilingPanels` to `SurfacePaintTarget`; extend `writePaintToOverlayTexture`.
6. Shader: `uCeilingPanelBaseOverride[cell].rgba[vRowIndex]` pattern.

### Phase 5 — Floor skirt override

Symmetric to Phase 2 for `floorSkirtBase` / `skirtBaseOverrideFloor`.

---

## Files Affected

| File | Change |
|---|---|
| `src/lib/api/createGame.ts` | Add new fields to `SurfacePaintTarget`; update `writePaintToOverlayTexture` |
| `src/lib/dungeon/bsp.ts` | Add `skyPanelCount`, `ceilingPanelCount` DataTextures; setters; new override DataTextures |
| `src/lib/dungeon/cellular.ts` | Mirror same DataTexture additions |
| `src/lib/dungeon/serialize.ts` | Serialize/deserialize new textures |
| `src/lib/rendering/dungeonRenderer.ts` | Build sky/ceiling panel geometry; assign new uniforms; `rowIndex` attribute on skirt geometry |
| `src/lib/rendering/basicLighting.ts` | Add `vRowIndex` varying; new base-override uniforms + shader logic |
| `src/lib/index.ts` | Export `setSkyPanelCount`, `setCeilingPanelCount` |
