[atomic-core](../README.md) / DungeonHandle

# Type Alias: DungeonHandle

> **DungeonHandle** = `object`

Defined in: [api/createGame.ts:211](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L211)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="decorations"></a> `decorations` | `public` | `DecorationList` | - | [api/createGame.ts:217](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L217) |
| <a id="height"></a> `height` | `readonly` | `number` | - | [api/createGame.ts:213](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L213) |
| <a id="objects"></a> `objects` | `readonly` | readonly [`ObjectPlacement`](../interfaces/ObjectPlacement.md)[] | Read-only list of all stationary object placements (including billboard sprites). | [api/createGame.ts:219](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L219) |
| <a id="outputs"></a> `outputs` | `readonly` | [`DungeonOutputs`](DungeonOutputs.md) \| `null` | - | [api/createGame.ts:216](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L216) |
| <a id="paintmap"></a> `paintMap` | `readonly` | `ReadonlyMap`\<`string`, [`SurfacePaintTarget`](SurfacePaintTarget.md)\> | Read-only view of the current per-cell surface paint map. Keys are "x,z" strings. | [api/createGame.ts:231](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L231) |
| <a id="passages"></a> `passages` | `public` | `PassageList` | - | [api/createGame.ts:220](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L220) |
| <a id="rooms"></a> `rooms` | `readonly` | `Record`\<`number`, `PublicRoom`\> | Available after generate(). | [api/createGame.ts:215](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L215) |
| <a id="width"></a> `width` | `readonly` | `number` | - | [api/createGame.ts:212](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L212) |

## Methods

### getCell()

> **getCell**(`x`, `z`): [`CellData`](CellData.md) \| `null`

Defined in: [api/createGame.ts:226](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L226)

Read all available per-cell state for the cell at grid coordinates `(x, z)`.
Returns `null` if the dungeon has not been generated yet or the coordinates are out of bounds.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |

#### Returns

[`CellData`](CellData.md) \| `null`

***

### paint()

> **paint**(`x`, `z`, `layers`): `void`

Defined in: [api/createGame.ts:228](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L228)

Apply per-surface overlay tile names to a cell.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `layers` | [`SurfacePaintTarget`](SurfacePaintTarget.md) |

#### Returns

`void`

***

### passageNear()

> **passageNear**(`x`, `z`, `radius?`): [`HiddenPassage`](../interfaces/HiddenPassage.md) \| `null`

Defined in: [api/createGame.ts:221](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L221)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `radius?` | `number` |

#### Returns

[`HiddenPassage`](../interfaces/HiddenPassage.md) \| `null`

***

### set()

> **set**(`x`, `y`, `spriteName`, `options?`): `void`

Defined in: [api/createGame.ts:377](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L377)

Write a sprite name and optional cell-state overrides to the cell at grid
coordinates `(x, y)`.  This is the primary high-level API for modifying
individual dungeon cells at runtime after `generate()` has been called.
It composes several lower-level texture writes into a single call.

---

### Texture / surface selection

The `spriteName` is looked up in the tile atlas and written to one or more
render surfaces.  Which surfaces are written depends on `options.applyTextureTo`:

- **Omitted (default):** the function reads the cell's current `solid` flag.
  - Solid cell (wall): writes `spriteName` to the **wall** surface only.
  - Open cell (floor): writes `spriteName` to both **floor** and **ceiling**.
- **Explicit `applyTextureTo`:** each entry in the array maps to one surface.
  Allowed values are `'floor'`, `'wall'`, and `'ceiling'`.  You can write to
  any combination in a single call, e.g. `['floor', 'ceiling']` or
  `['wall', 'floor']`.  The auto-detection logic above is bypassed entirely
  when this option is present.

Internally, surface writes go through `dungeon.paint()`, which updates the
internal `paintMap` and fires a `'cell-paint'` event so the renderer refreshes
only the affected cell.

---

### Skirt tiles (`floorSkirt` / `ceilingSkirt`)

Skirt tiles are thin decorative border strips that appear at the base of walls
(floor skirt) or at the top of walls near the ceiling (ceiling skirt).  Each
array holds up to four sprite-name slots corresponding to the four RGBA
channels of the skirt DataTexture.

- Pass a sprite name string to set that slot.
- Pass `null` to leave the slot at its current/default value.
- Arrays shorter than 4 leave trailing slots unchanged.

Example — set only the first skirt slot, leave the rest alone:
```ts
game.dungeon.set(3, 7, 'stone', { floorSkirt: ['trim', null, null, null] });
```

---

### Panel counts (`skyPanelCount` / `ceilingPanelCount`)

These control how many extra vertical panel rows are rendered above or below
a cell's geometry edge, using the skirt base-tile system as a source for tile
IDs.

- `skyPanelCount` (0–4): number of upward-facing panels above the wall top,
  intended for open-sky cells where the wall needs to extend visually through
  the sky opening.
- `ceilingPanelCount` (0–4): number of downward-facing panels hanging below
  the ceiling surface.

Values are clamped to `[0, 4]` by the underlying helpers.

---

### Solid flag and collider flags (`solid` / `colliderFlags`)

`solid` writes the single-byte `solid` DataTexture channel, which the renderer
uses to decide whether to build wall geometry for a cell.

When `solid` is set, sensible collider flag defaults are automatically derived
and written to the `colliderFlags` DataTexture:

| `solid` value | Derived `walkable` | Derived `blocked` | Derived `lightPassable` |
|---|---|---|---|
| `true`  | `false` | `true`  | `false` |
| `false` | `true`  | `false` | `true`  |

Any `colliderFlags` you provide **override** the derived values on a per-flag
basis.  This allows combinations like a see-through wall:
```ts
// Solid wall that still lets light pass (e.g. glass)
game.dungeon.set(4, 4, 'glass', {
  solid: true,
  colliderFlags: { lightPassable: true },
});
```

If you only provide `colliderFlags` without `solid`, only the specified flag
bits are merged into the existing byte; `solid` is left untouched.

The three flag bit-masks exported from the library are:
- `IS_WALKABLE`       (`0x01`) — normal movement permitted
- `IS_BLOCKED`        (`0x02`) — movement blocked (wall/obstacle)
- `IS_LIGHT_PASSABLE` (`0x04`) — line-of-sight and light passes through

---

### Height offsets (`floorHeightOffset` / `ceilingHeightOffset`)

Both values are **signed step counts** relative to the cell's default height.
Positive raises the floor / lowers the ceiling; negative does the opposite.
The values are encoded as unsigned bytes centred on `128` (= no offset) before
being written to the respective R8 DataTexture:

- `floorHeightOffset`: stored as `clamp(128 + steps, 1, 255)`.  Raw `0` is
  reserved for pit cells (no floor geometry) and is never written by this
  function.
- `ceilingHeightOffset`: stored as `clamp(128 + steps, 0, 255)`.  The
  encoding convention is inverted in the shader — a positive `steps` value
  here lowers the ceiling, matching the intuitive idea of "shrinking the room
  from the top".

Both textures are optional fields on `DungeonOutputs`; if they are absent
(e.g. for tiled dungeon outputs that don't generate them) the write is a
silent no-op.

```ts
// Raise the floor by one step — creates a raised platform effect
game.dungeon.set(5, 5, 'stone', { floorHeightOffset: 1 });

// Raise the ceiling by two steps — makes a taller room section
game.dungeon.set(5, 5, 'stone', { ceilingHeightOffset: -2 });
```

---

### Not-yet-wired options (`hazard` / `temperature`)

`hazard` and `temperature` are defined on `SetCellOptions` for forward
compatibility but are **not written** by this function in the current version
(Phase 4, not yet implemented).  Passing them has no effect.

---

### Prerequisites

`generate()` must have been called before `set()`.  If no dungeon has been
generated yet, the function returns silently without writing anything.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `x` | `number` | Cell column index (0-based, left-to-right). |
| `y` | `number` | Cell row index (0-based, top-to-bottom). |
| `spriteName` | `string` | Name of the sprite as defined in the tile atlas JSON. Must match an entry in `atlas.json`; unrecognised names are treated as transparent / empty. |
| `options?` | [`SetCellOptions`](SetCellOptions.md) | Optional overrides. All fields are independent; you can combine any subset in a single call. |

#### Returns

`void`

***

### unpaint()

> **unpaint**(`x`, `z`): `void`

Defined in: [api/createGame.ts:229](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L229)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |

#### Returns

`void`
