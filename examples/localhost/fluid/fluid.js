// fluid.js — atomic-core fluid pooling example
//
// Demonstrates the fluid simulation (src/lib/fluid/fluid.ts) pooling on a
// dungeon floor plan with real elevation: one room gets a stepped bowl-
// shaped depression (via floorHeightOffset, same mechanism as the layering
// example) so poured fluid rushes into the deep center (the fast/steep-drop
// pass) and then settles to one flat surface across the steps (the damped
// leveling pass).
//
// Controls: WASD/arrows to move, Q/E to turn, 1 pours water at the
// player's feet, 2 pours lava.

const {
  createGame,
  attachKeybindings,
  createDungeonRenderer,
  loadTextureAtlas,
  packedAtlasResolver,
  fluidFieldFromDungeon,
  stepFluid,
  createFluidSurface,
  placeFluidCircle,
} = AtomicCore;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById("viewport");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");

// ---------------------------------------------------------------------------
// Create game
// ---------------------------------------------------------------------------

const TILE_SIZE = 3;

const game = createGame(document.body, {
  dungeon: {
    width: 36,
    height: 36,
    seed: 0xf1a1d,
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
});

// ---------------------------------------------------------------------------
// Carve a stepped bowl-shaped depression into the first large room, build
// the fluid field from the (now-stepped) dungeon outputs, and seed it —
// all in one 'turn' listener registered before the renderer is created.
//
// Registration order matters (not event timing): the renderer registers
// its own 'turn' listener during construction to rebuild geometry from
// floorHeightOffset, so this listener — which edits floorHeightOffset —
// has to be registered first, exactly like the layering example. Reading
// `renderer` inside the callback is still safe even though it's registered
// before `const renderer = ...` runs, since the callback only executes once
// `game.generate()` fires 'turn' (below), by which point `renderer` has
// long since been assigned.
// ---------------------------------------------------------------------------

let renderer;
let fluidField = null;
let fluidSurface = null;
let prepared = false;

game.events.on("turn", () => {
  if (prepared) return;
  const outputs = game.dungeon.outputs;
  if (!outputs) return;
  prepared = true;

  const { width, textures } = outputs;
  const floorOff = textures.floorHeightOffset.image.data;

  // Prefer the room the player actually spawns in, so the pit is right
  // there to see rather than somewhere the player has to go hunting for it.
  const rooms = Object.values(game.dungeon.rooms);
  const spawnRoom = rooms.find(
    (r) =>
      r.type === "room" &&
      game.player.x >= r.x &&
      game.player.x < r.x + r.w &&
      game.player.z >= r.z &&
      game.player.z < r.z + r.h &&
      r.w >= 5 &&
      r.h >= 5,
  );
  const room = spawnRoom ?? rooms.find((r) => r.type === "room" && r.w >= 7 && r.h >= 7);

  let pitCenter = null;
  let pitRadius = 0;
  if (room) {
    pitCenter = { x: room.cx, z: room.cz };
    pitRadius = Math.min(3, Math.floor(Math.min(room.w, room.h) / 2) - 1);
    for (let z = room.z + 1; z < room.z + room.h - 1; z++) {
      for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
        const dx = x - room.cx;
        const dz = z - room.cz;
        const ring = Math.max(Math.abs(dx), Math.abs(dz));
        if (ring > pitRadius) continue;
        // Ring 0 (center) drops deepest; each ring out is one step shallower,
        // so the rim itself is always a full one-step drop (the fast pass's
        // steep-drop threshold) away from the surrounding flat floor.
        const stepsDown = pitRadius - ring + 1;
        floorOff[z * width + x] = Math.max(1, 128 - stepsDown);
      }
    }
    textures.floorHeightOffset.needsUpdate = true;
  }

  fluidField = fluidFieldFromDungeon(outputs);
  fluidSurface = createFluidSurface(renderer, fluidField, {
    tileSize: TILE_SIZE,
    fluidDefs: {
      1: { name: "Water", color: [0.2, 0.45, 0.9], density: 2 },
      2: { name: "Lava", color: [0.95, 0.35, 0.08], density: 3 },
    },
  });

  // Seed a splash just outside the pit's rim (one cell past pitRadius, still
  // flat floor) so it's visible rushing downhill into the bowl on the very
  // next fast tick rather than starting pre-settled inside it.
  if (pitCenter) {
    placeFluidCircle(fluidField, pitCenter.x - (pitRadius + 1), pitCenter.z, 1, 1);
  }

  // placeFluidCircle happens outside the turn cycle (the fluid surface's own
  // construction already synced once, before this seed), so sync explicitly
  // rather than waiting for the next turn to make the seed visible.
  fluidSurface.sync();
});

// ---------------------------------------------------------------------------
// 3D renderer — baked texture atlas with named tiles (same atlas as the
// basic example; see loadTextureAtlas's docs for the packed-atlas flow).
// ---------------------------------------------------------------------------

async function init() {
  const atlasJson = await fetch("../textureAtlas.json").then((r) => r.json());
  const packed = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: false,
  });
  const resolver = packedAtlasResolver(packed);

  renderer = createDungeonRenderer(viewportEl, game, {
    tileSize: TILE_SIZE,
    packedAtlas: packed,
    tileNameResolver: resolver,
    floorTile: "flagstone_floor_stone.png",
    ceilTile: "plaster_ceiling.png",
    wallTile: "brick_wall_stone.png",
  });

  game.generate();
}

init();

// ---------------------------------------------------------------------------
// Fluid step — once per game turn, not on a continuous RAF loop. atomic-core
// is turn-based (state only actually advances on game.turns.commit()), so
// ticking the CA every rendered frame regardless of player input doesn't
// match that model. A fixed simulated-seconds-per-turn constant (rather than
// real wall-clock time) keeps the result deterministic regardless of how
// fast the player presses keys.
// ---------------------------------------------------------------------------

const FLUID_DT_PER_TURN = 1.0;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
  if (fluidField) {
    stepFluid(fluidField, FLUID_DT_PER_TURN);
    fluidSurface.sync();
  }
});

// ---------------------------------------------------------------------------
// Keyboard input — movement plus fluid pouring (1 = water, 2 = lava)
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
    function relativeMove(forward, strafe) {
      const yaw = game.player.facing;
      const fx = Math.round(-Math.sin(yaw));
      const fz = Math.round(-Math.cos(yaw));
      const sx = Math.round(Math.cos(yaw));
      const sz = Math.round(-Math.sin(yaw));
      return game.player.move(
        forward * fx + strafe * sx,
        forward * fz + strafe * sz,
      );
    }
    let a;
    switch (action) {
      case "moveForward":
        a = relativeMove(1, 0);
        break;
      case "moveBackward":
        a = relativeMove(-1, 0);
        break;
      case "moveLeft":
        a = relativeMove(0, -1);
        break;
      case "moveRight":
        a = relativeMove(0, 1);
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
    if (a && !renderer.isAnimating()) game.turns.commit(a);
  },
});

// A shallow splash amount, not a full cell (MAX_MASS): one mass unit rises
// a full floor-height step in this demo's render scale (see fluid.ts's
// STEEP_DROP_THRESHOLD comment), so a "pour" action reads as a puddle
// rather than an instant slab.
const POUR_AMOUNT = 0.3;

window.addEventListener("keydown", (event) => {
  if (!fluidField) return;
  if (event.key === "1") {
    placeFluidCircle(fluidField, game.player.x, game.player.z, 2, 1, POUR_AMOUNT);
    addLog("Poured water", "turn");
  } else if (event.key === "2") {
    placeFluidCircle(fluidField, game.player.x, game.player.z, 2, 2, POUR_AMOUNT);
    addLog("Poured lava", "turn");
  } else {
    return;
  }
  // Pouring happens outside the turn cycle, so sync immediately rather than
  // waiting for the next turn to make the splash visible.
  fluidSurface.sync();
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

function updateStats() {
  hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}
