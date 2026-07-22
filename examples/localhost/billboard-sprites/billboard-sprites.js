// billboard-sprites.js — atomic-core billboard sprite demo
//
// Demonstrates the spriteMap API: camera-facing billboard quads rendered
// using named sprites from a packed texture atlas.
//
// Three enemy types are placed in the dungeon:
//   Goblin   — goblin_placeholder1.png
//   Skeleton — skel_placeholder1.png
//   Orc      — troll_placeholder1.png
//
// Each actor's `spriteMap` field activates billboard rendering automatically;
// no spriteMap = box geometry fallback.
//
// Entity move glide: every spawned enemy gets `danger: 1`, which is enough
// for the engine's default chase AI (ai/monsterAI.ts) to path toward the
// player once they're within range and actually take a step each turn. The
// renderer glides an entity's billboard/mesh to its new cell over
// `moveAnimMs` instead of snapping there instantly — walk near an enemy and
// watch it approach smoothly rather than jumping tile-to-tile. This is
// driven internally by the same `game.animations` 'move' event used by the
// tutorial example's floating-text effects (see examples/localhost/tutorial).

const {
  createGame,
  createEntity,
  attachSpawner,
  attachKeybindings,
  createDungeonRenderer,
  loadTextureAtlas,
  packedAtlasResolver,
} = AtomicCore;

const viewportEl = document.getElementById("viewport");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");

// ---------------------------------------------------------------------------
// spriteMap definitions
// ---------------------------------------------------------------------------

function goblinSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_goblin_base.png", opacity: 1.0 },
      {
        tile: "mob_goblin_happy_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

function skeletonSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_skel_base.png", opacity: 1.0 },
      {
        tile: "mob_skel_happy_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

function trollSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_troll_base.png", opacity: 1.0 },
      {
        tile: "mob_troll_happy_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Entity pool
// ---------------------------------------------------------------------------

const entities = [];
let spawned = 0;
const MAX_ENTITIES = 8;

const TYPES = [
  { type: "goblin", spriteMap: goblinSpriteMap },
  { type: "skeleton", spriteMap: skeletonSpriteMap },
  { type: "troll", spriteMap: trollSpriteMap },
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
// 3D renderer — atlas loaded directly from disk (localhost only)
// ---------------------------------------------------------------------------

let renderer;

async function init() {
  const atlasJson = await fetch("../textureAtlas.json").then((r) => r.json());
  const packed = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: false,
  });
  const resolver = packedAtlasResolver(packed);

  renderer = createDungeonRenderer(viewportEl, game, {
    packedAtlas: packed,
    tileNameResolver: resolver,
    floorTile: "flagstone_floor_stone.png",
    ceilTile: "plaster_ceiling.png",
    wallTile: "brick_wall_stone.png",
    // Entity move glide: enemies (and the player, on remote peers) ease into
    // their new cell over 220ms instead of snapping — longer than the 130ms
    // default so the effect reads clearly in a still screenshot or a slow
    // walk-cycle demo. Set moveAnimMs: 0 to go back to instant snapping.
    moveAnimMs: 220,
    moveAnimEasing: "easeOutQuad",
  });
  game.generate();
}

init();

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

    const e = createEntity({
      kind: "enemy",
      faction: "enemy",
      type: def.type,
      spriteName: def.type,
      x,
      z: y,
      hp: 8,
      maxHp: 8,
      attack: 2,
      defense: 0,
      speed: 5,
      danger: 1,
      xp: 10,
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
  hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
  if (renderer) renderer.setEntities(entities);
});

// Fires for every actor's step, including the player's — filtered to enemies
// here since the player moves on every keypress and would flood the log.
// Chase AI moves one cell per turn an enemy acts; the renderer subscribes to
// this same event internally to drive the visual glide, so this handler just
// surfaces it so the connection between "enemy took a turn" and "billboard
// eased to the new tile" is visible.
game.animations.on("move", ({ entity, from, to }) => {
  if (entity.kind !== "enemy") return;
  addLog(`${entity.type} steps from (${from.x},${from.z}) to (${to.x},${to.z})`, "turn");
});

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveForward: ["KeyW", "ArrowUp"],
    moveBackward: ["KeyS", "ArrowDown"],
    moveLeft: ["KeyA", "ArrowLeft"],
    moveRight: ["KeyD", "ArrowRight"],
    turnLeft: ["KeyQ"],
    turnRight: ["KeyE"],
    wait: ["Space"],
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
      const sx = Math.round(Math.cos(yaw));
      const sz = Math.round(-Math.sin(yaw));
      return game.player.move(fwd * fx + strafe * sx, fwd * fz + strafe * sz);
    }
    let a;
    switch (action) {
      case "moveForward":
        a = relMove(1, 0);
        break;
      case "moveBackward":
        a = relMove(-1, 0);
        break;
      case "moveLeft":
        a = relMove(0, -1);
        break;
      case "moveRight":
        a = relMove(0, 1);
        break;
      case "turnLeft":
        a = game.player.rotate(Math.PI / 2);
        break;
      case "turnRight":
        a = game.player.rotate(-Math.PI / 2);
        break;
      case "wait":
        a = game.player.wait();
        break;
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
