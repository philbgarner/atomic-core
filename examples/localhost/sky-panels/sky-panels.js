// sky-panels.js — atomic-core sky panel example
// Demonstrates sky panels on ceiling cells facing adjacent open-sky cells.
//
// After dungeon generation, distanceToWall (DTW) drives ceiling vs. sky:
//   DTW == 1  →  ceiling cell (ceilingHeightOffset stays at 128)
//   DTW >= 2  →  open-sky cell (ceilingHeightOffset set to 0)
//
// Sky panel count is set on each ceiling cell that borders at least one sky
// cell, so the vertical panel geometry rises above the ceiling and is visible
// when looking from the sky zone toward the covered area.

const {
  createGame,
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

// ---------------------------------------------------------------------------
// Create game
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 30,
    height: 30,
    seed: 0xcafebabe,
    roomMinSize: 7,
    roomMaxSize: 13,
    roomCount: 6,
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
// 3D renderer
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
  });

  // The "generate" event fires after dungeon data is computed but before
  // 3D geometry is built, so this is the correct place to write sky panel
  // counts into the dungeon outputs.
  game.events.on("generate", applySkyPanels);
  game.generate();
}

// ---------------------------------------------------------------------------
// Sky panel pass — run once after generate()
// ---------------------------------------------------------------------------

function applySkyPanels() {
  const outputs = game.dungeon.outputs;
  if (!outputs) return;

  const W = outputs.width;
  const H = outputs.height;
  const solidData = outputs.textures.solid.image.data;
  const dtwData = outputs.textures.distanceToWall.image.data;
  const ceilData = outputs.textures.ceilingHeightOffset?.image.data;
  if (!ceilData) return;

  // Mark cells with DTW >= 2 as open sky.
  for (let cz = 0; cz < H; cz++) {
    for (let cx = 0; cx < W; cx++) {
      const i = cz * W + cx;
      if (solidData[i] === 0 && dtwData[i] >= 2) {
        ceilData[i] = 0;
      }
    }
  }
  outputs.textures.ceilingHeightOffset.needsUpdate = true;

  // Place sky panels on ceiling cells (DTW == 1) that border a sky cell.
  function isSky(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= W || cz >= H) return false;
    const i = cz * W + cx;
    return solidData[i] === 0 && dtwData[i] >= 2;
  }

  for (let cz = 0; cz < H; cz++) {
    for (let cx = 0; cx < W; cx++) {
      const i = cz * W + cx;
      if (solidData[i] !== 0 || dtwData[i] !== 1) continue;
      if (
        isSky(cx, cz - 1) ||
        isSky(cx, cz + 1) ||
        isSky(cx - 1, cz) ||
        isSky(cx + 1, cz)
      ) {
        setSkyPanelCount(outputs, cx, cz, 2);
      }
    }
  }
}

init();

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
});

// ---------------------------------------------------------------------------
// Keyboard input
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveForward: ["w", "W", "ArrowUp"],
    moveBackward: ["s", "S", "ArrowDown"],
    moveLeft: ["a", "A", "ArrowLeft"],
    moveRight: ["d", "D", "ArrowRight"],
    turnLeft: ["q", "Q"],
    turnRight: ["e", "E"],
    wait: [" "],
  },
  onAction(action, event) {
    event.preventDefault();
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

function updateStats() {
  hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}
