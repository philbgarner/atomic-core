// ao.js — atomic-core ambient occlusion example
// Demonstrates ambient occlusion, surface lighting, and outside light on sky panels.
//
// After dungeon generation, distanceToWall (DTW) drives ceiling vs. open sky:
//   DTW == 1  →  ceiling cell (ceilingHeightOffset stays at 128)
//   DTW >= 2  →  open-sky cell (ceilingHeightOffset set to 0)
//
// Sky panels (outsideLight) are placed on ceiling cells that border sky cells,
// making those wall faces appear brighter as if lit by daylight from above.

const {
  createGame,
  createEntity,
  attachSpawner,
  attachKeybindings,
  createDungeonRenderer,
  loadTextureAtlas,
  packedAtlasResolver,
  setSkyPanelCount,
} = AtomicCore;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById("viewport");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");
const aoSliderEl           = document.getElementById("ao-slider");
const aoValueEl            = document.getElementById("ao-value");
const floorSliderEl        = document.getElementById("floor-slider");
const floorValueEl         = document.getElementById("floor-value");
const ceilSliderEl         = document.getElementById("ceil-slider");
const ceilValueEl          = document.getElementById("ceil-value");
const wallMinSliderEl      = document.getElementById("wall-min-slider");
const wallMinValueEl       = document.getElementById("wall-min-value");
const wallMaxSliderEl      = document.getElementById("wall-max-slider");
const wallMaxValueEl       = document.getElementById("wall-max-value");
const skyBrightSliderEl    = document.getElementById("sky-bright-slider");
const skyBrightValueEl     = document.getElementById("sky-bright-value");
const skyColorPickerEl     = document.getElementById("sky-color-picker");

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
// Sky panel pass — run once after generate()
// ---------------------------------------------------------------------------

function applySkyPanels() {
  const outputs = game.dungeon.outputs;
  if (!outputs) return;

  const W = outputs.width;
  const H = outputs.height;
  const solidData = outputs.textures.solid.image.data;
  const dtwData   = outputs.textures.distanceToWall.image.data;
  const ceilData  = outputs.textures.ceilingHeightOffset?.image.data;
  if (!ceilData) return;

  // Cells three or more steps from any wall become open sky, leaving a wider
  // ring of covered ceiling around each room's perimeter.
  const SKY_DTW = 3;

  for (let cz = 0; cz < H; cz++) {
    for (let cx = 0; cx < W; cx++) {
      const i = cz * W + cx;
      if (solidData[i] === 0 && dtwData[i] >= SKY_DTW) {
        ceilData[i] = 0; // open-sky sentinel
      }
    }
  }
  outputs.textures.ceilingHeightOffset.needsUpdate = true;

  // Sky panel helper: a cell counts as "sky" if it's open and at or beyond the threshold.
  function isSky(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= W || cz >= H) return false;
    const i = cz * W + cx;
    return solidData[i] === 0 && dtwData[i] >= SKY_DTW;
  }

  // Place sky panels on any non-sky floor cell adjacent to a sky cell.
  // This covers DTW 1 and DTW 2 cells so the panel band widens with the threshold.
  for (let cz = 0; cz < H; cz++) {
    for (let cx = 0; cx < W; cx++) {
      const i = cz * W + cx;
      if (solidData[i] !== 0 || dtwData[i] >= SKY_DTW) continue;
      if (isSky(cx, cz - 1) || isSky(cx, cz + 1) || isSky(cx - 1, cz) || isSky(cx + 1, cz)) {
        setSkyPanelCount(outputs, cx, cz, 2);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3D renderer — baked texture atlas with named tiles
// ---------------------------------------------------------------------------

let renderer;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

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
    ambientOcclusion: 0.75,
    openSkyLighting: 0.6,
    surfaceLighting: {
      floor:   parseFloat(floorSliderEl.value),
      ceiling: parseFloat(ceilSliderEl.value),
      wallMin: parseFloat(wallMinSliderEl.value),
      wallMax: parseFloat(wallMaxSliderEl.value),
    },
    outsideLight: {
      brightness: parseFloat(skyBrightSliderEl.value),
      color: hexToRgb(skyColorPickerEl.value), // additive: keep values small
    },
  });

  game.events.on("generate", applySkyPanels);
  game.generate();

  // Ambient occlusion
  aoSliderEl.addEventListener("input", () => {
    const v = parseFloat(aoSliderEl.value);
    aoValueEl.textContent = v.toFixed(2);
    renderer.setAmbientOcclusion(v);
  });

  // Surface lighting
  floorSliderEl.addEventListener("input", () => {
    const v = parseFloat(floorSliderEl.value);
    floorValueEl.textContent = v.toFixed(2);
    renderer.setSurfaceLighting({ floor: v });
  });

  ceilSliderEl.addEventListener("input", () => {
    const v = parseFloat(ceilSliderEl.value);
    ceilValueEl.textContent = v.toFixed(2);
    renderer.setSurfaceLighting({ ceiling: v });
  });

  wallMinSliderEl.addEventListener("input", () => {
    const v = parseFloat(wallMinSliderEl.value);
    wallMinValueEl.textContent = v.toFixed(2);
    renderer.setSurfaceLighting({ wallMin: v });
  });

  wallMaxSliderEl.addEventListener("input", () => {
    const v = parseFloat(wallMaxSliderEl.value);
    wallMaxValueEl.textContent = v.toFixed(2);
    renderer.setSurfaceLighting({ wallMax: v });
  });

  // Outside light (sky panels)
  skyBrightSliderEl.addEventListener("input", () => {
    const v = parseFloat(skyBrightSliderEl.value);
    skyBrightValueEl.textContent = v.toFixed(2);
    renderer.setOutsideLight({ brightness: v });
  });

  skyColorPickerEl.addEventListener("input", () => {
    renderer.setOutsideLight({ color: hexToRgb(skyColorPickerEl.value) });
  });
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
    moveForward:  ["KeyW", "ArrowUp"],
    moveBackward: ["KeyS", "ArrowDown"],
    moveLeft:     ["KeyA", "ArrowLeft"],
    moveRight:    ["KeyD", "ArrowRight"],
    turnLeft:     ["KeyQ"],
    turnRight:    ["KeyE"],
    wait:         ["Space"],
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
      case "moveForward":  a = relativeMove(1, 0);  break;
      case "moveBackward": a = relativeMove(-1, 0); break;
      case "moveLeft":     a = relativeMove(0, -1); break;
      case "moveRight":    a = relativeMove(0, 1);  break;
      case "turnLeft":     a = game.player.rotate(Math.PI / 2);  break;
      case "turnRight":    a = game.player.rotate(-Math.PI / 2); break;
      case "wait":         a = game.player.wait();  break;
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
