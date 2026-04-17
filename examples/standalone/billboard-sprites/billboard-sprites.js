// billboard-sprites.js — atomic-core billboard sprite demo
//
// Demonstrates the spriteMap API: camera-facing billboard quads with layered
// sprite rendering and multi-angle tile variants.
//
// Three enemy types are placed in the dungeon:
//   Goblin   — 2-layer body + weapon overlay
//   Skeleton — 4-angle variants (front/back/left/right tiles differ)
//   Slime    — single tile, no angle variants
//
// Each actor's `spriteMap` field activates billboard rendering automatically;
// no spriteMap = box geometry fallback (same as before).
//
// Atlas layout (atlas.png): 512×1024 px, 64 px tiles → 8 columns.
// Tile ID = row * 8 + col  (row-major, top-left origin).
//
// Tiles used for billboard sprites are drawn from the atlas at their tileId.
// In a real project you would use tiles from your own sprite sheet.

const {
  createGame,
  createEnemy,
  attachSpawner,
  attachKeybindings,
  createDungeonRenderer,
} = AtomicCore;

const viewportEl = document.getElementById("viewport");
const logEl      = document.getElementById("log");
const hpEl       = document.getElementById("hp");
const turnEl     = document.getElementById("turn");
const posEl      = document.getElementById("pos");

// ---------------------------------------------------------------------------
// spriteMap definitions
// ---------------------------------------------------------------------------

// Goblin: two layers — body (tile 20) + weapon overlay (tile 21).
// When viewed from behind (camera behind entity) the "S" angle kicks in and
// swaps both tiles to back-facing variants.
function goblinSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      // Layer 0: body — always visible, full opacity.
      { tileId: 20, opacity: 1.0 },
      // Layer 1: weapon overlay — slightly above center, slightly transparent.
      { tileId: 21, offsetY: 0.15, opacity: 0.85 },
    ],
    angles: {
      // Rear view — use back-facing tiles.
      S:  [{ layerIndex: 0, tileId: 28 }, { layerIndex: 1, tileId: 29 }],
      SW: [{ layerIndex: 0, tileId: 27 }],
      SE: [{ layerIndex: 0, tileId: 27 }],
    },
  };
}

// Skeleton: single body layer with four distinct angle tiles.
// N = front, S = back, W/E = left/right profiles.
function skeletonSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tileId: 16, opacity: 1.0 },
    ],
    angles: {
      N:  [{ layerIndex: 0, tileId: 16 }],  // front
      NE: [{ layerIndex: 0, tileId: 17 }],
      E:  [{ layerIndex: 0, tileId: 17 }],  // right profile
      SE: [{ layerIndex: 0, tileId: 24 }],
      S:  [{ layerIndex: 0, tileId: 24 }],  // back
      SW: [{ layerIndex: 0, tileId: 25 }],
      W:  [{ layerIndex: 0, tileId: 25 }],  // left profile
      NW: [{ layerIndex: 0, tileId: 16 }],
    },
  };
}

// Slime: one tile, no angle variants — simplest possible spriteMap.
function slimeSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tileId: 19, opacity: 0.9 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Entity pool
// ---------------------------------------------------------------------------

const entities = [];
let spawned = 0;
const MAX_ENTITIES = 6;

const TYPES = [
  { type: "goblin",   spriteMap: goblinSpriteMap   },
  { type: "skeleton", spriteMap: skeletonSpriteMap  },
  { type: "slime",    spriteMap: slimeSpriteMap     },
];

// ---------------------------------------------------------------------------
// Game setup
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 36,
    height: 36,
    seed: 0xcafe1234,
    roomMinSize: 6,
    roomMaxSize: 12,
    roomCount: 10,
  },
  player: {
    hp: 30,
    maxHp: 30,
    attack: 5,
    defense: 2,
    speed: 5,
  },
  combat: {
    onDamage({ attacker, defender, amount }) {
      addLog(`${attacker.type} hits ${defender.type} for ${amount}`, "damage");
    },
    onDeath({ entity }) {
      addLog(`${entity.type} is slain!`, "death");
    },
    onMiss({ attacker, defender }) {
      addLog(`${attacker.type} misses ${defender.type}`, "turn");
    },
  },
});

// ---------------------------------------------------------------------------
// 3D renderer
// ---------------------------------------------------------------------------

let renderer;

const atlasImg = new Image();
atlasImg.onload = () => {
  renderer = createDungeonRenderer(viewportEl, game, {
    atlas: {
      image: atlasImg,
      tileWidth:   64,
      tileHeight:  64,
      sheetWidth:  512,
      sheetHeight: 1024,
      columns:     8,
    },
    floorTileId: 20,
    ceilTileId:  19,
    wallTileId:  16,
  });
  game.generate();
};
atlasImg.src = window.ATLAS_DATA_URL;

// ---------------------------------------------------------------------------
// Spawner — places up to MAX_ENTITIES billboard-sprite enemies
// ---------------------------------------------------------------------------

attachSpawner(game, {
  onSpawn({ roomId, x, y }) {
    if (spawned >= MAX_ENTITIES) return null;
    if (roomId < 2) return null;
    if (Math.random() > 0.6) return null;

    const def = TYPES[spawned % TYPES.length];
    spawned++;

    const e = createEnemy({
      type: def.type,
      sprite: def.type,
      x,
      z: y,
      hp: 8,
      maxHp: 8,
      attack: 2,
      defense: 0,
      speed: 5,
      danger: 1,
      xp: 10,
      // spriteMap activates billboard rendering for this entity.
      spriteMap: def.spriteMap(),
    });
    entities.push(e);
    return e;
  },
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  hpEl.textContent   = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent  = `${game.player.x}, ${game.player.z}`;
  if (renderer) renderer.setEntities(entities);
});

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveForward:  ["w", "W", "ArrowUp"],
    moveBackward: ["s", "S", "ArrowDown"],
    moveLeft:     ["a", "A", "ArrowLeft"],
    moveRight:    ["d", "D", "ArrowRight"],
    turnLeft:     ["q", "Q"],
    turnRight:    ["e", "E"],
    wait:         [" "],
  },
  onAction(action, event) {
    event.preventDefault();
    if (!game.player.alive) {
      addLog("You are dead. Refresh to restart.", "death");
      return;
    }
    function relMove(fwd, strafe) {
      const yaw = game.player.facing;
      const fx = Math.round(-Math.sin(yaw));
      const fz = Math.round(-Math.cos(yaw));
      const sx = Math.round( Math.cos(yaw));
      const sz = Math.round(-Math.sin(yaw));
      return game.player.move(fwd * fx + strafe * sx, fwd * fz + strafe * sz);
    }
    let a;
    switch (action) {
      case "moveForward":  a = relMove( 1,  0); break;
      case "moveBackward": a = relMove(-1,  0); break;
      case "moveLeft":     a = relMove( 0, -1); break;
      case "moveRight":    a = relMove( 0,  1); break;
      case "turnLeft":     a = game.player.rotate( Math.PI / 2); break;
      case "turnRight":    a = game.player.rotate(-Math.PI / 2); break;
      case "wait":         a = game.player.wait();               break;
    }
    if (a) game.turns.commit(a);
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addLog(text, cls) {
  const div = document.createElement("div");
  div.className = "entry" + (cls ? " " + cls : "");
  div.textContent = text;
  logEl.prepend(div);
  while (logEl.children.length > 40) logEl.lastElementChild.remove();
}
