// sky.js — atomic-core skybox + open-sky ceiling example
//
// Demonstrates:
//   - Procedural night-sky gradient (canvas → blob URL → SkyboxFaces)
//   - Ceiling grading: dist=1 → normal (128), dist=2 → very high (120), dist≥3 → open sky (0).
//   - openSkyLighting brightens pre-baked AO on floor tiles below sky holes.
//   - fogColor matched to the skybox horizon so distant geometry fades cleanly.
//
// Press R to regenerate with a new random seed.

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
const logEl      = document.getElementById("log");
const hpEl       = document.getElementById("hp");
const turnEl     = document.getElementById("turn");
const posEl      = document.getElementById("pos");

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width:       48,
    height:      48,
    seed:        0xc0ffee,
    roomMinSize: 6,
    roomMaxSize: 14,
    roomCount:   12,
  },
  player: { hp: 30, maxHp: 30, attack: 5, defense: 2, speed: 5 },
  combat: {
    onDamage({ attacker, defender, amount }) {
      addLog(`${attacker.type} hits ${defender.type} for ${amount}`, "damage");
    },
    onDeath({ entity }) { addLog(`${entity.type} is slain!`, "death"); },
  },
});

// ---------------------------------------------------------------------------
// Open-sky ceiling pass
//
// distanceToWall === 1 → default 128 (normal ceiling, untouched)
// distanceToWall === 2 → 120 (very high ceiling, ~5× normal)
// distanceToWall  >= 3 → 0   (open-sky sentinel)
//
// Registered BEFORE the renderer is created so the texture data is patched
// before buildDungeon() reads it on the first RAF tick.
// ---------------------------------------------------------------------------

let skyPatched = false;

game.events.on("turn", () => {
  if (skyPatched) return;
  const outputs = game.dungeon.outputs;
  if (!outputs) return;
  skyPatched = true;

  const { width, height, textures } = outputs;
  const solid   = textures.solid.image.data;
  const dist    = textures.distanceToWall.image.data;
  const ceilOff = textures.ceilingHeightOffset.image.data;

  for (let i = 0; i < width * height; i++) {
    if (solid[i] !== 0) continue;        // skip wall cells
    if (dist[i] >= 3)        ceilOff[i] = 0;   // open sky
    else if (dist[i] === 2)  ceilOff[i] = 120; // very high ceiling
    // dist === 1: leave at default 128 (normal ceiling)
  }

  textures.ceilingHeightOffset.needsUpdate = true;
});

// ---------------------------------------------------------------------------
// Procedural skybox
//
// Each face is painted on an off-screen <canvas> and converted to a blob URL.
// Using URLs rather than a pre-built THREE.CubeTexture avoids any THREE
// instance mismatch between the IIFE bundle and the CDN global.
// ---------------------------------------------------------------------------

// Horizon colour also used as fogColor so the sky fades seamlessly into fog.
const ZENITH  = '#020810'; // near-black zenith
const HORIZON = '#0a1e3a'; // dark navy horizon — must match fogColor below

function makeFaceUrl(w, h, stops, starCount = 0) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    stops.forEach(([t, c]) => grad.addColorStop(t, c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < starCount; i++) {
      const x     = Math.random() * w;
      const y     = Math.random() * h;
      const r     = Math.random() < 0.12 ? 1.2 : 0.65;
      const alpha = (0.45 + Math.random() * 0.55).toFixed(2);
      ctx.fillStyle = `rgba(195,215,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)));
  });
}

async function buildSkyboxFaces() {
  const side = () => makeFaceUrl(512, 512, [[0, ZENITH], [1, HORIZON]]);
  const [px, nx, pz, nz] = await Promise.all([side(), side(), side(), side()]);

  // Top face: starfield.
  const py = await makeFaceUrl(512, 512, [[0, ZENITH], [1, ZENITH]], 110);

  // Bottom face: dark stone ground (rarely visible through pits).
  const ny = await makeFaceUrl(512, 512, [[0, "#0c0906"], [1, "#050402"]]);

  return { px, nx, py, ny, pz, nz };
}

// ---------------------------------------------------------------------------
// Renderer + atlas
// ---------------------------------------------------------------------------

let renderer;

async function init() {
  const atlasJson    = await fetch("../textureAtlas.json").then((r) => r.json());
  const packed       = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: false,
  });
  const resolver     = packedAtlasResolver(packed);
  const skyboxFaces  = await buildSkyboxFaces();

  renderer = createDungeonRenderer(viewportEl, game, {
    packedAtlas:      packed,
    tileNameResolver: resolver,
    floorTile: "flagstone_floor_stone.png",
    ceilTile:  "plaster_ceiling.png",
    wallTile:  "brick_wall_stone.png",
    // Fog colour matches the skybox horizon so far geometry fades into the sky.
    fogColor:  HORIZON,
    fogNear:   6,
    fogFar:    20,
    // AO darkens corners; openSkyLighting lightens floors below sky holes.
    ambientOcclusion: 0.7,
    openSkyLighting:  0.85,
    skybox: { faces: skyboxFaces },
  });

  game.generate();
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
    function relativeMove(forward, strafe) {
      const yaw = game.player.facing;
      const fx  = Math.round(-Math.sin(yaw));
      const fz  = Math.round(-Math.cos(yaw));
      const sx  = Math.round( Math.cos(yaw));
      const sz  = Math.round(-Math.sin(yaw));
      return game.player.move(forward * fx + strafe * sx, forward * fz + strafe * sz);
    }
    let a;
    switch (action) {
      case "moveForward":  a = relativeMove( 1,  0); break;
      case "moveBackward": a = relativeMove(-1,  0); break;
      case "moveLeft":     a = relativeMove( 0, -1); break;
      case "moveRight":    a = relativeMove( 0,  1); break;
      case "turnLeft":     a = game.player.rotate( Math.PI / 2); break;
      case "turnRight":    a = game.player.rotate(-Math.PI / 2); break;
      case "wait":         a = game.player.wait();               break;
    }
    if (a) game.turns.commit(a);
  },
});

// Regenerate with a new seed on R.
document.addEventListener("keydown", (e) => {
  if ((e.key === "r" || e.key === "R") && renderer) {
    skyPatched = false;
    game.regenerate();
    renderer.rebuild();
    addLog("Dungeon regenerated.", "turn");
  }
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
