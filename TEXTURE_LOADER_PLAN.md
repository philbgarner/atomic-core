# Texture Loader / Sprite Packer — Implementation Plan

## Overview

A two-phase system:

1. **Load phase** — fetch a source image and a Texture Atlas JSON, unpack each named sprite (handling rotation), and blit them into a clean, row-ordered output texture using an OffscreenCanvas.
2. **Runtime phase** — expose a `PackedAtlas` that maps string names → UV rects in the baked texture, and allow every existing `tileId: number` API call to also accept a `string` name that resolves through the packed atlas.

---

## Extended Atlas JSON Schema

Based on the existing `textureAtlas.json` format (TexturePacker output), we extend frame entries with two optional fields:

```jsonc
"bat_placeholder1.png": {
  "frame":             { "x": 1,  "y": 1,  "w": 95, "h": 64 },
  "rotated":           false,        // existing: was sprite rotated 90° CW in the source atlas?
  "rotation":          0,            // NEW (optional): additional display rotation to apply
                                     //   0 | 90 | 180 | 270  (degrees CW)
  "trimmed":           true,
  "spriteSourceSize":  { "x": 17, "y": 0, "w": 95, "h": 64 },
  "sourceSize":        { "w": 128, "h": 64 },
  "pivot":             { "x": 0.5, "y": 0.5 }
}
```

`rotated: true` means the packer stored the sprite sideways (rotated 90° CW) to save space — we must undo this when blitting.  
`rotation` is an *additional* intent-level rotation stored as metadata and passed to the shader via the existing `FaceRotation` pathway in `tileAtlas.ts`. It is **not** baked into the texture pixels, preserving pixel-perfect quality.

---

## Type Definitions (`src/lib/rendering/textureLoader.ts`)

```ts
export type AtlasFrameRect = { x: number; y: number; w: number; h: number };

export type AtlasFrame = {
  frame:            AtlasFrameRect;
  rotated:          boolean;
  rotation?:        0 | 90 | 180 | 270;   // display rotation, degrees CW
  trimmed:          boolean;
  spriteSourceSize: AtlasFrameRect;
  sourceSize:       { w: number; h: number };
  pivot:            { x: number; y: number };
};

export type TextureAtlasJson = {
  frames: Record<string, AtlasFrame>;
  meta: {
    image:  string;
    size:   { w: number; h: number };
    scale:  string | number;
  };
};

export type PackedSprite = {
  name:     string;   // original atlas key, e.g. "bat_placeholder1.png"
  uvX:      number;   // normalised left edge in packed texture
  uvY:      number;   // normalised top edge in packed texture (y=0 top)
  uvW:      number;
  uvH:      number;
  pivot:    { x: number; y: number };
  rotation: 0 | 90 | 180 | 270;  // stored for shader use
};

export type PackedAtlas = {
  texture:   HTMLCanvasElement | OffscreenCanvas;  // the baked texture
  sprites:   Map<string, PackedSprite>;            // name → UV data
  getByName(name: string): PackedSprite | undefined;
  getById(id: number): PackedSprite | undefined;   // id = insertion order index
};
```

---

## Loading Pipeline

### Step 1 — Fetch resources

```
loadTextureAtlas(imageUrl: string, atlasJson: TextureAtlasJson, options?) → Promise<PackedAtlas>
```

- Fetch `imageUrl` as an `ImageBitmap` (via `fetch` + `createImageBitmap`).
- Optionally show a loading screen overlay (see Loading UI section).

### Step 2 — Compute packing layout

Iterate `atlasJson.frames` in order. For each frame:

- Determine the **output size** of the sprite in the packed texture:
  - If `rotated: true`, swap `frame.w` and `frame.h` (the packer stored it sideways, we'll blit it right-way-up).
  - The output cell is `max(sourceSize.w, frame.w) × max(sourceSize.h, frame.h)` — or simply `sourceSize.w × sourceSize.h` to keep consistent cell sizes per sprite group.
- Add 2px padding around each sprite cell to prevent UV bleeding at sub-pixel boundaries.
- Bin-pack into a power-of-two output texture (minimum size that fits all sprites, clamped to the next POT — e.g. 512, 1024, 2048, 4096) using a simple shelf algorithm:
  - Sprites are sorted by height descending for better packing.
  - Track `cursorX`, `cursorY`, `shelfHeight`. When a sprite doesn't fit on the current shelf, start a new shelf.
- Record the destination `(destX, destY, destW, destH)` for each sprite.

### Step 3 — Blit onto OffscreenCanvas

For each sprite, draw from source atlas image to output canvas:

```
ctx.save()
ctx.translate(destX + destW/2, destY + destH/2)

// Undo packer rotation only (rotated: true → sprite was stored 90° CW)
if (frame.rotated) ctx.rotate(-Math.PI / 2)

// NOTE: frame.rotation is NOT applied here — it is stored as PackedSprite.rotation
// and forwarded to the shader via the FaceRotation / FaceTileSpec pathway.

ctx.drawImage(
  sourceBitmap,
  frame.x, frame.y, frame.w, frame.h,   // source rect
  -destW/2, -destH/2, destW, destH      // dest rect centred at origin
)
ctx.restore()
```

`frame.rotation` maps to `FaceRotation` (0 = 0°, 1 = 90° CCW, 2 = 180°, 3 = 270° CCW) with a simple `rotation / 90` conversion, then flows through the existing `FaceTileSpec` / billboard shader pathway unchanged.

### Step 4 — Build `PackedAtlas`

- Create `Map<string, PackedSprite>` from sprite names to UV rects in the baked texture.
- Expose `getByName(name)` and `getById(index)`.

---

## String-name Support in Tile-setting APIs

All functions that accept `tileId: number` should gain an overload:

```ts
function setTileId(id: number | string): void {
  const resolved = typeof id === 'string'
    ? packedAtlas.getByName(id)?.id ?? fallbackId
    : id;
  // existing logic
}
```

The `PackedSprite.id` (insertion-order index) maps 1:1 with the numeric tileId used by the shader, so no other changes are needed downstream. Files to update:

- `src/lib/rendering/tileAtlas.ts` — add string overloads to any public tile-set helpers
- `src/lib/api/player.ts`, `actions.ts` — any tile-setting player actions
- `src/lib/dungeon/themes.ts` — theme tile assignments

---

## Loading Screen

```ts
export type LoadingOptions = {
  showLoadingScreen?: boolean;          // default: true
  loadingText?:       string;           // default: "Loading..."
  container?:         HTMLElement;      // default: document.body
};
```

- Before fetching, if `showLoadingScreen: true`, inject a full-screen overlay div with the loading text.
- After `PackedAtlas` resolves, remove the overlay.
- Progress events (optional): expose an `onProgress(loaded, total)` callback option for custom UIs.

---

## File Structure

```
src/lib/rendering/
  textureLoader.ts     ← NEW: loadTextureAtlas(), types, packer algorithm
  tileAtlas.ts         ← EXISTING: add string-name overloads
```

No new directories needed — this belongs in `rendering/`.

---

## Implementation Steps (ordered)

1. Define all types in `textureLoader.ts`.
2. Implement shelf-packing layout algorithm (pure function, easily testable).
3. Implement `blitSprite()` using OffscreenCanvas (handles `rotated` and `rotation`).
4. Implement `loadTextureAtlas(imageUrl, atlasJson, options)` — orchestrates fetch → pack → blit → return `PackedAtlas`.
5. Add loading screen inject/remove helpers.
6. Add `getByName` / `getById` string resolution helpers.
7. Update `tileAtlas.ts` and API call sites to accept `string | number`.
8. Add a usage example to `examples/standalone/` using the existing `textureAtlas.json`.
9. Update `README.md` — add a "Texture Loader / Sprite Packer" section documenting the `loadTextureAtlas` API, the extended atlas JSON schema (`rotation` field), string-name tile resolution, and the loading screen option.

---

## Resolved Decisions

- **Power-of-two output size**: Yes — output canvas is always the smallest POT that fits all packed sprites (512 → 1024 → 2048 → 4096). Required for WebGL/Three.js texture compatibility.
- **Padding**: 2px padding around every sprite cell. UV rects stored in `PackedSprite` point to the inner (non-padded) area, so the padding is invisible to callers.
- **Multiple atlases**: Each `loadTextureAtlas()` call returns an independent `PackedAtlas` with its own baked texture and name map. No shared state. A caching/registry layer can be layered on top later if needed.
- **`rotation` baking vs. shader**: `rotation` is stored as `PackedSprite.rotation` metadata only — never re-sampled into pixels. It is forwarded to the existing `FaceRotation` / `FaceTileSpec` shader pathway in `tileAtlas.ts`.
