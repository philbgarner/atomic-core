// lighting.js — atomic-core dynamic lighting example
// Demonstrates THREE.PointLight integration:
//   - Player torch attached to the camera (follows automatically)
//   - Per-frame intensity flicker via requestAnimationFrame
//   - Wall sconces placed at dungeon cells adjacent to solid walls

const {
  createGame,
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
});

// ---------------------------------------------------------------------------
// 3D renderer + lighting setup
// ---------------------------------------------------------------------------

let renderer = null;
let playerTorch = null; // warm PointLight parented to camera
let sconced = false; // sconces placed once after first generate

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

  // Dim the renderer's built-in AmbientLight so torch range is visible.
  // Full-bright ambient would wash out the point light falloff entirely.
  const defaultAmbient = renderer.scene.children.find(
    (c) => c.type === "AmbientLight",
  );
  if (defaultAmbient) defaultAmbient.intensity = 0.06;

  // ── Player torch ──────────────────────────────────────────────────────────
  // Attach to renderer.camera so it moves with the player automatically.
  // position.set(x, y, z) is camera-local: slightly forward (-z) and below eye.
  playerTorch = renderer.addLight(new THREE.PointLight(0xfadaa4, 3.5, 18, 2));
  playerTorch.position.set(0, -0.4, -0.8);
  renderer.camera.add(playerTorch);

  // ── Flicker loop ──────────────────────────────────────────────────────────
  // Runs every frame independently of the turn system.
  requestAnimationFrame(flickerTick);

  game.generate();
}

// 1D noise buffer for torch flicker — smoothed random values cycled over time.
const NOISE_LEN = 256;
const torchNoise = (() => {
  const buf = new Float32Array(NOISE_LEN);
  for (let i = 0; i < NOISE_LEN; i++) buf[i] = Math.random();
  // Three box-blur passes to smooth the raw noise into organic-looking variation.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < NOISE_LEN; i++) {
      buf[i] = (buf[(i - 1 + NOISE_LEN) % NOISE_LEN] + buf[i] + buf[(i + 1) % NOISE_LEN]) / 3;
    }
  }
  // Normalize to [0, 1].
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < NOISE_LEN; i++) { lo = Math.min(lo, buf[i]); hi = Math.max(hi, buf[i]); }
  const range = hi - lo || 1;
  for (let i = 0; i < NOISE_LEN; i++) buf[i] = (buf[i] - lo) / range;
  return buf;
})();

// Advance through the noise buffer at SPEED samples/sec, linearly interpolating
// between adjacent samples. Intensity maps [0,1] noise to [2.5, 4.0].
const FLICKER_SPEED = 24; // samples per second — higher = more agitated
function flickerTick(t) {
  requestAnimationFrame(flickerTick);
  if (!playerTorch) return;
  const pos = (t * 0.001 * FLICKER_SPEED) % NOISE_LEN;
  const i0  = Math.floor(pos) % NOISE_LEN;
  const i1  = (i0 + 1) % NOISE_LEN;
  const f   = pos - Math.floor(pos);
  const sample = torchNoise[i0] * (1 - f) + torchNoise[i1] * f;
  playerTorch.intensity = 2.5 + sample * 1.5;
}

// ---------------------------------------------------------------------------
// Sconce placement — runs once after the dungeon is first generated
// ---------------------------------------------------------------------------

function placeSconces() {
  const outputs = game.dungeon.outputs;
  if (!outputs) return;

  const { width, height } = outputs;
  const solid = outputs.textures.solid.image.data;
  const TILE = 3; // default tileSize in createDungeonRenderer
  const EYE_Y = 2.2; // mount sconces near the top of the wall

  for (let cz = 1; cz < height - 1; cz++) {
    for (let cx = 1; cx < width - 1; cx++) {
      if (solid[cz * width + cx]) continue; // skip solid cells

      const wallN = solid[(cz - 1) * width + cx];
      const wallS = solid[(cz + 1) * width + cx];
      const wallW = solid[cz * width + (cx - 1)];
      const wallE = solid[cz * width + (cx + 1)];
      if (!wallN && !wallS && !wallW && !wallE) continue; // only near walls

      if (Math.random() > 0.07) continue; // sparse — ~7% of eligible cells

      const sconce = renderer.addLight(
        new THREE.PointLight(0xff6622, 2.0, 11, 2),
      );
      sconce.position.set((cx + 0.5) * TILE, EYE_Y, (cz + 0.5) * TILE);
    }
  }
}

// ---------------------------------------------------------------------------
// Turn events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();

  if (!sconced && renderer) {
    placeSconces();
    sconced = true;
  }
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
    if (!game.player.alive) return;

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

init();
