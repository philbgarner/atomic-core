// camera-modes.js — atomic-core 3D example
// Demonstrates the renderer's cameraMode API: firstPerson (default),
// thirdPerson (offset + lookAt a target cell), topDown (offset preset),
// and free (mouse orbit/pan/zoom via three.js OrbitControls).

const {
  createGame,
  createEntity,
  attachSpawner,
  attachKeybindings,
  createDungeonRenderer,
  loadTextureAtlas,
  packedAtlasResolver,
} = AtomicCore;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById("viewport");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");
const modeSelect = document.getElementById("cameraMode");
const targetXInput = document.getElementById("targetX");
const targetZInput = document.getElementById("targetZ");
const setTargetBtn = document.getElementById("setTarget");
const followPlayerBtn = document.getElementById("followPlayer");

// ---------------------------------------------------------------------------
// Entity tracking
// ---------------------------------------------------------------------------

const enemies = [];
let spawned = 0;
const MAX_ENEMIES = 0;

// ---------------------------------------------------------------------------
// Create game
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 40,
    height: 40,
    seed: 0xdeadbeef,
    roomMinSize: 5,
    roomMaxSize: 11,
    roomCount: 12,
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
      addLog(
        `${attacker.type} hits ${defender.type} for ${amount} dmg`,
        "damage",
      );
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
// 3D renderer — baked texture atlas with named tiles
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
    // Start in thirdPerson so the new camera modes are visible immediately.
    cameraMode: "thirdPerson",
    cameraOffset: { x: 0, y: 6, z: 6 },
  });
  modeSelect.value = "thirdPerson";

  game.generate();
}

init();

// ---------------------------------------------------------------------------
// Spawn enemies — one per room, capped, skipping early rooms
// ---------------------------------------------------------------------------

attachSpawner(game, {
  onSpawn({ roomId, x, y }) {
    if (spawned >= MAX_ENEMIES) return null;
    if (roomId < 2) return null;
    if (Math.random() > 0.55) return null;
    spawned++;
    const e = createEntity({
      kind: "enemy",
      faction: "enemy",
      type: "goblin",
      spriteName: "g",
      x,
      z: y,
      hp: 8,
      maxHp: 8,
      attack: 2,
      defense: 0,
      speed: 6,
      danger: 1,
      xp: 10,
    });
    enemies.push(e);
    return e;
  },
});

// ---------------------------------------------------------------------------
// Camera mode controls
// ---------------------------------------------------------------------------

modeSelect.addEventListener("change", () => {
  if (!renderer) return;
  renderer.setCameraMode(modeSelect.value);
});

setTargetBtn.addEventListener("click", () => {
  if (!renderer) return;
  const x = parseInt(targetXInput.value, 10);
  const z = parseInt(targetZInput.value, 10);
  if (Number.isNaN(x) || Number.isNaN(z)) return;
  renderer.setCameraTarget(x, z);
  addLog(`Camera target set to (${x}, ${z})`, "turn");
});

followPlayerBtn.addEventListener("click", () => {
  if (!renderer) return;
  renderer.followPlayer();
  addLog("Camera resumed following the player", "turn");
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
  if (renderer) renderer.setEntities(enemies);
});

game.events.on("audio", ({ name }) => {
  addLog(`[sfx] ${name}`, "audio");
});

// ---------------------------------------------------------------------------
// Keyboard input
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

function updateStats() {
  hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}
