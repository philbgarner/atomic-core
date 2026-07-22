# Atomic-Core

A dungeon crawler library.

---

A composable JavaScript library built on [Three.js](https://threejs.org/) for building first-person 3D dungeon crawl games in the browser.

Game logic lives entirely in your JS layer - the library provides the rendering engine, turn system, entity model, and dungeon tools. You wire them together however you like. No React, no JSX, no build step required.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [`<script>` tag (no build step)](#script-tag-no-build-step)
  - [npm run (localhost dev server)](#npm-run-localhost-dev-server)
- [Examples](#examples)
  - [localhost examples](#localhost-examples)
  - [standalone examples](#standalone-examples)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)

---

## Features

- First-person 3D tile-based dungeon rendering with linear fog and per-cell lighting (plain Three.js - no React/R3F required)
- BSP dungeon generator or cellular automata generator or **Tiled map import** (`.tmj` / `.tsj` JSON exports)
- Built-in dungeon themes (`dungeon`, `crypt`, `catacomb`, `industrial`, `ruins`) with `registerTheme()` for custom themes
- Ceiling and floor height offsets; pit markers that omit floor tiles
- Fall damage notification — `fallDamageHeight` dungeon option (floor-height steps, default `0`/disabled) emits a `'fall-damage'` event when a player or entity drops between cells by at least that many steps; the engine only reports the drop, you apply the damage
- Dungeon serialization - save and restore `DungeonOutputs` to/from JSON
- Renderer layer system - stack additional instanced meshes on floors, ceilings, walls, or skirts with per-face filtering
- Per-direction tile specs for walls, floor skirts, and ceiling skirts
- Turn-based scheduler with priority queue
- Entity system: player, NPCs, enemies, items, chests
- **Billboard sprite rendering** — `spriteMap` field on any entity activates camera-facing billboard quads with layered atlas tiles, x/y offsets, per-layer opacity, and up to 8 viewing angles (N/NE/E/SE/S/SW/W/NW) with per-layer tile overrides; box geometry fallback when `spriteMap` is absent
- Active status effects with configurable stacking modes
- Three-faction combat model: `player`, `npc`, `enemy`
- Minimap with entity overlays
- Chest drops and item pickups
- Hidden passage traversal
- **Doors** — `game.dungeon.doors` registers lockable, animated doors rendered as a double-sided frame/pane/frame sandwich using the exact wall shader (matching lighting, AO, and fog); `open()`/`close()`/`lock()`/`unlock()`/`toggle()` drive per-cell collider flags so movement and line-of-sight update automatically for player and monsters alike; walking into a closed-but-unlocked door opens it ("bump to open"); configurable slide axis, distance, duration, and easing
- Callback-driven enemy spawning
- Stationary decoration entities (props, furniture, fixtures)
- Atlas surface painting - apply tile layers to walls, floors, and ceilings per-tile; per-row base-tile overrides for skirt rows, sky panels, and ceiling panels via `SurfacePaintTarget`
- Sky panels and ceiling panels — `setSkyPanelCount()` / `setCeilingPanelCount()` emit stacked vertical quads above walls on open-sky cells or below the ceiling; up to 4 rows per cell, each row independently tiled
- Configurable keybindings
- **Inventory dialog UI** - `showInventory()` renders a two-column RPG inventory screen (character profile, item grid, equipment paper-doll, stat bars, indicators, action buttons) with full drag-and-drop support; pass `customLayout: true` for a bare `<dialog>` you control
- Mission / quest system — `game.missions.add()` registers evaluator-driven missions that auto-complete each turn, emit `mission-complete` events, and optionally broadcast completions to multiplayer peers
- Turn-animation callback system — register async handlers on `game.animations` for `damage`, `death`, `move`, `attack`, `miss`, `heal`, and `xp-gain`; engine awaits all handlers between turn resolution and entity-position sync
- Entity move glide — entities visually glide to their new grid cell over a short tween instead of snapping instantly; tunable via `moveAnimMs` (default `130`, `0` disables) and `moveAnimEasing` on `createDungeonRenderer`
- Audio hooks (Howler.js compatible)
- Optional multiplayer transport layer (WebSocket-based, server-authoritative)
- **6-texture skybox** — `skybox` option on `createDungeonRenderer` or `renderer.setSkybox()` at runtime; accepts 6 image URL strings or a pre-loaded `THREE.CubeTexture`; optional `rotationY` aligns the front face to the dungeon's north axis
- **Texture Loader / Sprite Packer** — `loadTextureAtlas()` fetches a TexturePacker-format atlas, shelf-packs sprites into a power-of-two `OffscreenCanvas`, and returns a `PackedAtlas` with UV data accessible by name or id
- Script tag API - no build step required
- localhost friendly - if you want to serve it with Node.

---

## Installation

### `<script>` tag (no build step)

Load Three.js, then the library IIFE bundle. All exports are available on `window.AtomicCore`.

```html
<!-- Three.js (required) -->
<script type="module">
  import * as THREE from '/node_modules/three/build/three.module.js';
  window.THREE = THREE;
</script>

<!-- atomic-core IIFE bundle -->
<script src="/dist/atomic-core.iife.js" defer></script>
```

Once loaded, `window.AtomicCore` exposes the full imperative API you can use from any HTML page without JSX or a build toolchain.

### `npm run` (localhost dev server)

If you have the repo checked out, you can serve all examples locally with a single command:

```bash
npm install
npm run examples
```

This starts a static file server at `http://localhost:3000` (or the next available port). Navigate to `examples/localhost/` to browse the example index. Because files are served over HTTP, images load without the Base64 workaround — see [localhost examples](#localhost-examples) below.

---

## Examples

The `examples/` directory contains two sets of identical demos organized by how you intend to open them.

### localhost examples

**`examples/localhost/`** — designed for use with a local HTTP server (e.g. `npm run examples`). Atlas images are loaded as ordinary `<img>` tags pointing directly to `.png` files on disk. This is the **recommended starting point for development** because:

- No Base64 conversion step required.
- You can swap out atlas images instantly without regenerating an embedded data file.
- Editing the JS and refreshing the browser is the full workflow.

### standalone examples

**`examples/standalone/`** — designed to open directly from the filesystem (`file://`) without any server. Atlas images are pre-embedded as Base64 data URLs to work around the WebGL cross-origin restriction that blocks local image files under `file://`. Use these when you want to share a zero-setup demo or drop files into an environment where running a server is not an option.

Available standalone examples:

| Directory | What it shows |
|---|---|
| `basic/` | Core rendering, movement, combat events |
| `billboard-sprites/` | `spriteMap` billboard rendering — goblin (2-layer body + weapon), skeleton (4-angle variants), slime (single tile) |
| `layering/` | `renderer.addLayer()` instanced mesh overlays |
| `minimap/` | `attachMinimap()` canvas overlay |
| `themes/` | Built-in dungeon theme presets |
| `inventory/` | `showInventory()` dialog UI |

---

## Quick Start

`AtomicCore.createGame()` sets up game logic and returns a `game` handle. Call `AtomicCore.createDungeonRenderer()` separately to mount the 3D viewport - this lets you attach event callbacks and a spawner before generating the dungeon.

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #viewport { width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
  <div id="viewport"></div>

  <script type="module">
    import * as THREE from '/node_modules/three/build/three.module.js';
    window.THREE = THREE;
  </script>
  <script src="/dist/atomic-core.iife.js" defer></script>
  <script defer>
    const { createGame, createEntity, attachSpawner, attachKeybindings, createDungeonRenderer } = AtomicCore

    const game = createGame(document.body, {
      dungeon: {
        seed:        0xdeadbeef,
        width:       40,
        height:      40,
        minRoomSize: 5,
        maxRoomSize: 11,
      },
      player: { hp: 30, maxHp: 30, attack: 5, defense: 2, speed: 5 },
      combat: {
        onDamage({ attacker, defender, amount }) {
          console.log(`${attacker.spriteName} hits ${defender.spriteName} for ${amount}`)
        },
        onDeath({ entity }) {
          console.log(`${entity.spriteName} is slain!`)
        },
      },
    })

    // Load the tile atlas image, then create the 3D renderer
    const atlasImg = new Image()
    atlasImg.onload = () => {
      const renderer = createDungeonRenderer(
        document.getElementById('viewport'),
        game,
        {
          atlas: {
            image:       atlasImg,
            tileWidth:   64,
            tileHeight:  64,
            sheetWidth:  512,
            sheetHeight: 1024,
            columns:     8,
          },
          floorTileId: 20,  // row-major tile index into the atlas sheet
          ceilTileId:  19,
          wallTileId:  16,
        },
      )

      // Generate the dungeon - must be called after attaching all callbacks
      game.generate()
    }
    atlasImg.src = './atlas.png'

    // Keyboard input
    attachKeybindings(game, {
      bindings: {
        moveForward:  ['w', 'ArrowUp'],
        moveBackward: ['s', 'ArrowDown'],
        moveLeft:     ['a', 'ArrowLeft'],
        moveRight:    ['d', 'ArrowRight'],
        turnLeft:     ['q', 'Q'],
        turnRight:    ['e', 'E'],
        wait:         [' '],
      },
      onAction(action, event) {
        event.preventDefault()
        if (!game.player.alive) return
        const yaw = game.player.facing
        const fx = Math.round(-Math.sin(yaw))
        const fz = Math.round(-Math.cos(yaw))
        const sx = Math.round( Math.cos(yaw))
        const sz = Math.round(-Math.sin(yaw))
        let a
        switch (action) {
          case 'moveForward':  a = game.player.move( fx,  fz); break
          case 'moveBackward': a = game.player.move(-fx, -fz); break
          case 'moveLeft':     a = game.player.move(-sx, -sz); break
          case 'moveRight':    a = game.player.move( sx,  sz); break
          case 'turnLeft':     a = game.player.rotate( Math.PI / 2); break
          case 'turnRight':    a = game.player.rotate(-Math.PI / 2); break
          case 'wait':         a = game.player.wait(); break
        }
        if (a) game.turns.commit(a)
      },
    })
  </script>
</body>
</html>
```

---

## API Documentation

Full API reference — types, functions, and options — is in the [`/docs`](./docs/README.md) folder.
