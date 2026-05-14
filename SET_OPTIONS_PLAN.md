# `set()` Options Implementation Plan

Implements the full `SetCellOptions` type for `game.dungeon.set(x, y, spriteName, options?)`.

**Current state:** Only `applyTextureTo` is wired. All other proposed fields exist on the type  
definition but are ignored at runtime.

**Key files:**
- `src/lib/api/createGame.ts` — `SetCellOptions` type (line 101), `set()` body (line 810)
- `src/lib/dungeon/bsp.ts` — low-level texture-channel helpers (`setFloorSkirtTiles`, etc.)
- `src/lib/dungeon/colliderFlags.ts` — flag constants and `buildColliderFlags`

---

## Phase 1 — Type expansion + panel counts + skirt tiles

**Goal:** Wire the four options that already have backing helpers in `bsp.ts`. No new mutation  
functions required; work is mostly plumbing and sprite-name resolution.

### 1a. Expand `SetCellOptions` and `ColliderFlags`

In `createGame.ts`, replace the current minimal `SetCellOptions` with the full type (all fields  
stubbed out so they compile but are silently ignored until their phase lands):

```typescript
export type ColliderFlags = {
  walkable?: boolean;       // IS_WALKABLE  0x01
  blocked?: boolean;        // IS_BLOCKED   0x02
  lightPassable?: boolean;  // IS_LIGHT_PASSABLE 0x04
};

export type SetCellOptions = {
  applyTextureTo?: ApplyTarget[];
  solid?: boolean;
  colliderFlags?: ColliderFlags;
  floorHeightOffset?: number;
  ceilingHeightOffset?: number;
  skyPanelCount?: number;
  ceilingPanelCount?: number;
  floorSkirt?: (string | null)[];
  ceilingSkirt?: (string | null)[];
  hazard?: number;
  temperature?: number;
};
```

### 1b. Wire `skyPanelCount` and `ceilingPanelCount`

In `set()`, after the `this.paint()` call, add:

```typescript
if (options?.skyPanelCount !== undefined)
  setSkyPanelCount(dungeon, x, y, options.skyPanelCount);
if (options?.ceilingPanelCount !== undefined)
  setCeilingPanelCount(dungeon, x, y, options.ceilingPanelCount);
```

Both functions already exist and are exported from `bsp.ts`.

### 1c. Wire `floorSkirt` and `ceilingSkirt`

`setFloorSkirtTiles` / `setCeilSkirtTiles` take `number[]` (atlas tile IDs), but the public API  
uses sprite names. Resolution steps:

1. Look up how `writePaintToOverlayTexture` resolves sprite names → tile indices (the same  
   sprite atlas is available via `internal`).
2. Add a helper `resolveSkirtNames(names: (string | null)[], atlas) => number[]` that maps each  
   name to its atlas index (0 for null/unknown).
3. Call the existing `setFloorSkirtTiles` / `setCeilSkirtTiles` with the resolved array.

**Acceptance criteria:**
- `set(x, y, 'stone', { skyPanelCount: 2 })` updates the `skyPanelCount` DataTexture.
- `set(x, y, 'stone', { floorSkirt: ['trim', null, 'trim'] })` writes slots 0 and 2 of  
  `floorSkirtType`.
- TypeScript compiles with no errors on the expanded type.

---

## Phase 2 — Solid flag + collider flags

**Goal:** Allow `set()` to change whether a cell blocks movement. These are the most  
safety-sensitive changes because they affect gameplay collision.

### 2a. Add `setSolid()` helper in `bsp.ts`

```typescript
export function setSolid(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  solid: boolean,
): void {
  const data = outputs.textures.solid.image.data as Uint8Array;
  data[cz * outputs.width + cx] = solid ? 1 : 0;
  outputs.textures.solid.needsUpdate = true;
}
```

### 2b. Add `setColliderFlagsCell()` helper in `bsp.ts` (or `colliderFlags.ts`)

Accepts a partial `ColliderFlags` object and merges it into the existing byte:

```typescript
export function setColliderFlagsCell(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  flags: { walkable?: boolean; blocked?: boolean; lightPassable?: boolean },
): void {
  const data = outputs.textures.colliderFlags.image.data as Uint8Array;
  const idx = cz * outputs.width + cx;
  let byte = data[idx]!;
  if (flags.walkable !== undefined)
    byte = flags.walkable ? (byte | IS_WALKABLE) : (byte & ~IS_WALKABLE);
  if (flags.blocked !== undefined)
    byte = flags.blocked ? (byte | IS_BLOCKED) : (byte & ~IS_BLOCKED);
  if (flags.lightPassable !== undefined)
    byte = flags.lightPassable ? (byte | IS_LIGHT_PASSABLE) : (byte & ~IS_LIGHT_PASSABLE);
  data[idx] = byte;
  outputs.textures.colliderFlags.needsUpdate = true;
}
```

### 2c. Wire into `set()`

```typescript
if (options?.solid !== undefined)
  setSolid(dungeon, x, y, options.solid);
if (options?.colliderFlags !== undefined)
  setColliderFlagsCell(dungeon, x, y, options.colliderFlags);
```

Note: when `solid` is set to `true` and `colliderFlags` is absent, auto-derive sensible defaults  
(`walkable: false, blocked: true, lightPassable: false`) so the cell behaves as a wall.  
When `solid` is set to `false`, default to `walkable: true, blocked: false, lightPassable: true`.  
Explicit `colliderFlags` always overrides the derived defaults.

**Acceptance criteria:**
- `set(x, y, 'rock', { solid: true })` makes the cell impassable.
- `set(x, y, 'glass', { solid: true, colliderFlags: { lightPassable: true } })` creates a  
  see-through wall.
- Toggling `solid` on a cell and re-querying `dungeon.paintMap` shows the correct texture.

---

## Phase 3 — Height offsets

**Goal:** Let `set()` raise/lower floor and ceiling surfaces.

### 3a. Add `setFloorHeightOffset()` in `bsp.ts`

```typescript
export function setFloorHeightOffset(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  steps: number,   // signed integer; 0 = no change, positive = raised
): void {
  if (!outputs.textures.floorHeightOffset) return;
  const data = outputs.textures.floorHeightOffset.image.data as Uint8Array;
  // Encode: 128 = no offset; raw 0 reserved for pits
  data[cz * outputs.width + cx] = Math.max(1, Math.min(255, 128 + steps));
  outputs.textures.floorHeightOffset.needsUpdate = true;
}
```

### 3b. Add `setCeilingHeightOffset()` in `bsp.ts`

Same pattern but with the inverted convention (positive steps = lower ceiling):

```typescript
export function setCeilingHeightOffset(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  steps: number,   // positive = lower ceiling
): void {
  if (!outputs.textures.ceilingHeightOffset) return;
  const data = outputs.textures.ceilingHeightOffset.image.data as Uint8Array;
  data[cz * outputs.width + cx] = Math.max(0, Math.min(255, 128 + steps));
  outputs.textures.ceilingHeightOffset.needsUpdate = true;
}
```

### 3c. Wire into `set()`

```typescript
if (options?.floorHeightOffset !== undefined)
  setFloorHeightOffset(dungeon, x, y, options.floorHeightOffset);
if (options?.ceilingHeightOffset !== undefined)
  setCeilingHeightOffset(dungeon, x, y, options.ceilingHeightOffset);
```

**Acceptance criteria:**
- `set(5, 5, 'stone', { floorHeightOffset: 1 })` raises the floor at (5,5) by one step.
- `set(5, 5, 'stone', { ceilingHeightOffset: -2 })` raises the ceiling by two steps (larger room).
- Confirmed visually: the renderer reads the updated DataTexture on the next frame.

---

## Phase 4 — Hazard and temperature

**Goal:** Expose the two remaining per-cell data channels through `set()`. These are pure data  
fields with no rendering implications.

### 4a. Add `setHazard()` in `bsp.ts`

```typescript
export function setHazard(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  hazardId: number,   // 0 = no hazard
): void {
  const data = outputs.textures.hazards.image.data as Uint8Array;
  data[cz * outputs.width + cx] = Math.max(0, Math.min(255, hazardId));
  outputs.textures.hazards.needsUpdate = true;
}
```

### 4b. Add `setTemperature()` in `bsp.ts`

```typescript
export function setTemperature(
  outputs: DungeonOutputs,
  cx: number,
  cz: number,
  value: number,   // 0–255; 127 = neutral
): void {
  const data = outputs.textures.temperature.image.data as Uint8Array;
  data[cz * outputs.width + cx] = Math.max(0, Math.min(255, value));
  outputs.textures.temperature.needsUpdate = true;
}
```

### 4c. Wire into `set()`

```typescript
if (options?.hazard !== undefined)
  setHazard(dungeon, x, y, options.hazard);
if (options?.temperature !== undefined)
  setTemperature(dungeon, x, y, options.temperature);
```

**Acceptance criteria:**
- `set(x, y, 'lava', { hazard: 1 })` writes `1` into the `hazards` DataTexture at that cell.
- `set(x, y, 'ice', { temperature: 20 })` writes `20` into `temperature`.
- `dungeon.paintMap` unchanged when only `hazard`/`temperature` are set (paint layer untouched).

---

## Summary table

| Option             | Phase | New helper needed?               | Backing texture channel   |
|--------------------|-------|----------------------------------|---------------------------|
| `applyTextureTo`   | ✅ done | none                            | `overlays` (via paint)    |
| `skyPanelCount`    | 1     | no — `setSkyPanelCount` exists   | `skyPanelCount`           |
| `ceilingPanelCount`| 1     | no — `setCeilingPanelCount` exists | `ceilingPanelCount`     |
| `floorSkirt`       | 1     | name-resolver helper             | `floorSkirtType`          |
| `ceilingSkirt`     | 1     | name-resolver helper             | `ceilSkirtType`           |
| `solid`            | 2     | `setSolid()`                     | `solid`                   |
| `colliderFlags`    | 2     | `setColliderFlagsCell()`         | `colliderFlags`           |
| `floorHeightOffset`| 3     | `setFloorHeightOffset()`         | `floorHeightOffset`       |
| `ceilingHeightOffset`| 3   | `setCeilingHeightOffset()`       | `ceilingHeightOffset`     |
| `hazard`           | 4     | `setHazard()`                    | `hazards`                 |
| `temperature`      | 4     | `setTemperature()`               | `temperature`             |
