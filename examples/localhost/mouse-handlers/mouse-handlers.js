// mouse-handlers.js — atomic-core mouse interaction example
// Demonstrates onCellClick / onCellHover via geometry raycasting against all
// dungeon surfaces (floors, walls, ceilings) and highlightCells for selection
// and debug region-colour overlays.

const {
  createGame,
  attachSpawner,
  attachKeybindings,
  createDungeonRenderer,
  loadTextureAtlas,
  packedAtlasResolver,
} = AtomicCore;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl  = document.getElementById("viewport");
const logEl       = document.getElementById("log");
const hpEl        = document.getElementById("hp");
const turnEl      = document.getElementById("turn");
const posEl       = document.getElementById("pos");
const hoverInfoEl = document.getElementById("hover-info");
const clickInfoEl = document.getElementById("click-info");
const btnRegion   = document.getElementById("btn-region-colors");
const tooltipEl   = document.getElementById("cell-tooltip");

// Track raw pointer position inside the canvas-wrap so the tooltip follows.
const canvasWrap = document.getElementById("canvas-wrap");
canvasWrap.addEventListener("pointermove", (e) => {
  const rect = canvasWrap.getBoundingClientRect();
  tooltipEl.style.left = `${e.clientX - rect.left}px`;
  tooltipEl.style.top  = `${e.clientY - rect.top}px`;
});
canvasWrap.addEventListener("pointerleave", () => {
  tooltipEl.classList.add("hidden");
});

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
  player: { hp: 30, maxHp: 30, attack: 5, defense: 2, speed: 5 },
  combat: {
    onDamage({ attacker, defender, amount }) {
      addLog(`${attacker.type} hits ${defender.type} for ${amount} dmg`, "damage");
    },
    onDeath({ entity }) {
      addLog(`${entity.type} is slain!`, "death");
    },
  },
});

// ---------------------------------------------------------------------------
// Highlight state
// ---------------------------------------------------------------------------

let hoverHandle   = null;  // single-cell hover tint
let selectHandle  = null;  // whole-region selection highlight
let regionHandle  = null;  // debug region-colour overlay
let regionColorsOn = false;

// Distinct hues cycling across region IDs (HSL: spread evenly, medium sat/light)
function regionColor(regionId) {
  const hue = (regionId * 47) % 360;
  return `hsla(${hue}, 70%, 55%, 0.35)`;
}

// ---------------------------------------------------------------------------
// Renderer — created after atlas loads
// ---------------------------------------------------------------------------

let renderer;

// Tile names used by the renderer — referenced in the click handler.
const FLOOR_TILE        = "flagstone_floor_stone.png";
const CEIL_TILE         = "plaster_ceiling.png";
const WALL_TILE         = "brick_wall_stone.png";
const FLOOR_SKIRT_TILES = null; // none configured
const CEIL_SKIRT_TILES  = null; // none configured

function shortTile(v) {
  if (!v) return "—";
  return typeof v === "string" ? v.replace(/\.png$/i, "") : `#${v}`;
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
    floorTile: FLOOR_TILE,
    ceilTile:  CEIL_TILE,
    wallTile:  WALL_TILE,

    // ── Hover: blue tint on the hovered cell + cursor tooltip ────────────
    onCellHover(info) {
      if (hoverHandle) { hoverHandle.remove(); hoverHandle = null; }

      if (!info) {
        hoverInfoEl.textContent = "none";
        hoverInfoEl.classList.add("muted");
        tooltipEl.classList.add("hidden");
        return;
      }

      const label = `(${info.cx}, ${info.cz})  region ${info.regionId}`;
      hoverInfoEl.textContent = label;
      hoverInfoEl.classList.remove("muted");

      tooltipEl.textContent = label;
      tooltipEl.classList.remove("hidden");

      hoverHandle = renderer.highlightCells((cx, cz) =>
        cx === info.cx && cz === info.cz ? "rgba(20, 80, 255, 0.55)" : null,
      );
    },

    // ── Click: yellow region highlight + texture mapping panel ───────────
    onCellClick(info) {
      if (selectHandle) { selectHandle.remove(); selectHandle = null; }

      const room = Object.values(game.dungeon.rooms).find((r) => r.id === info.regionId);
      const roomLabel = room
        ? `${room.type} #${room.id}  ${room.w}×${room.h}`
        : `region ${info.regionId}`;

      let html =
        `<div class="ci-coord">(${info.cx}, ${info.cz}) · ${roomLabel}</div>` +
        `<div class="ci-tex"><span class="ci-k">floor</span>${shortTile(FLOOR_TILE)}</div>` +
        `<div class="ci-tex"><span class="ci-k">wall </span>${shortTile(WALL_TILE)}</div>` +
        `<div class="ci-tex"><span class="ci-k">ceil </span>${shortTile(CEIL_TILE)}</div>`;
      if (FLOOR_SKIRT_TILES)
        html += `<div class="ci-tex"><span class="ci-k">f.skirt</span>${shortTile(FLOOR_SKIRT_TILES)}</div>`;
      if (CEIL_SKIRT_TILES)
        html += `<div class="ci-tex"><span class="ci-k">c.skirt</span>${shortTile(CEIL_SKIRT_TILES)}</div>`;

      clickInfoEl.classList.remove("muted");
      clickInfoEl.innerHTML = html;

      selectHandle = renderer.highlightCells((cx, cz) =>
        cx === info.cx && cz === info.cz ? "rgba(255, 230, 20, 0.5)" : null,
      );
    },
  });

  game.generate();
}

init();

// ---------------------------------------------------------------------------
// Debug: toggle region-colour overlay (press button or R key)
// ---------------------------------------------------------------------------

function toggleRegionColors() {
  regionColorsOn = !regionColorsOn;
  btnRegion.textContent = `Region Colors: ${regionColorsOn ? "ON" : "OFF"}`;
  btnRegion.classList.toggle("active", regionColorsOn);

  if (regionHandle) { regionHandle.remove(); regionHandle = null; }

  if (regionColorsOn && renderer) {
    regionHandle = renderer.highlightCells((_cx, _cz, regionId) =>
      regionId > 0 ? regionColor(regionId) : null,
    );
  }
}

btnRegion.addEventListener("click", toggleRegionColors);

document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") toggleRegionColors();
});

// ---------------------------------------------------------------------------
// Spawner (no enemies needed for this demo)
// ---------------------------------------------------------------------------

attachSpawner(game, { onSpawn: () => null });

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on("turn", ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
});

// ---------------------------------------------------------------------------
// Keyboard movement
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
    if (!game.player.alive) return;
    function relativeMove(forward, strafe) {
      const yaw = game.player.facing;
      const fx = Math.round(-Math.sin(yaw));
      const fz = Math.round(-Math.cos(yaw));
      const sx = Math.round( Math.cos(yaw));
      const sz = Math.round(-Math.sin(yaw));
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
      case "wait":         a = game.player.wait(); break;
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
  while (logEl.children.length > 20) logEl.lastElementChild.remove();
}

function updateStats() {
  hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}
