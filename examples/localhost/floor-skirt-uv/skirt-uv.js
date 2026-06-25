// skirt-uv.js — secret door demo
//
// Two hand-crafted rooms separated by a wall. A stone button on the wall,
// when pressed (Space / F while facing it), opens the door beside it.
//
// Door mechanism:
//   1. Door cell turns not-solid immediately.
//   2. Ceiling height of the door cell is set to one step above the floor
//      (nearly closed, val = CEIL_CLOSED).
//   3. The ceiling animates upward step-by-step using a small offsetFactor
//      so each increment is visually smooth.
//   4. ceilSkirtTiles is set to the wall texture so the region below the
//      rising ceiling looks like a stone door panel.

const {
  createGame,
  attachKeybindings,
  createDungeonRenderer,
  loadTextureAtlas,
  packedAtlasResolver,
  IS_WALKABLE,
  IS_BLOCKED,
  IS_LIGHT_PASSABLE,
} = AtomicCore;

// ---------------------------------------------------------------------------
// Map layout constants
// ---------------------------------------------------------------------------
//
//  col:  0  1..7  8  9..18  19
//  row 0: solid border
//  row 1-8: Room A (cols 1-7) | wall (col 8) | Room B (cols 9-18)
//  row 9: solid border
//
//  Wall column 8 cells:
//    row 3 → button (solid wall, button overlay painted on it)
//    row 4 → door   (solid initially → animates open when button pressed)
//    rows 1-2, 5-8 → plain wall

const DW = 20;
const DH = 10;
const BTN_X = 8,
  BTN_Z = 3; // button wall cell (stays solid, has overlay)
const DOOR_X = 8,
  DOOR_Z = 4; // door cell (solid → not-solid on press)

// ---------------------------------------------------------------------------
// Ceiling animation parameters
//
// offsetFactor = 1/12 → offsetStep = tileSize(3) / 12 = 0.25 world units
// ceilingH     = tileSize(3) × ceilingHeightFactor(2) = 6 world units
//
// Ceiling position = ceilingH − (ceilVal − 128) × offsetStep
//   ceilVal = 128 → ceiling at 6.0 (fully open)
//   ceilVal = 128 + 23 = 151 → ceiling at 6.0 − 5.75 = 0.25 (one step above floor)
// ---------------------------------------------------------------------------

const OFFSET_FACTOR = 1 / 12;
const OFFSET_STEP = 3 * OFFSET_FACTOR; // 0.25 world units
const CEILING_H = 6;
const CEIL_OPEN = 128;
const CEIL_CLOSED = 128 + Math.round((CEILING_H - OFFSET_STEP) / OFFSET_STEP); // 151
const ANIM_MS = 40; // ms per step (23 steps × 40 ms ≈ 920 ms total)

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById("viewport");
const btnStateEl = document.getElementById("btn-state");
const doorStateEl = document.getElementById("door-state");
const playerPosEl = document.getElementById("player-pos");
const btnPosEl = document.getElementById("btn-pos");

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

let renderer;
let doorTriggered = false;

function updatePlayerPos() {
  if (playerPosEl)
    playerPosEl.textContent = `(${game.player.x}, ${game.player.z})`;
}

// ---------------------------------------------------------------------------
// Game — dungeon layout is hand-crafted inside onPlace
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: DW,
    height: DH,
    seed: 12345678,
    roomMinSize: 3,
    roomMaxSize: 5,
    roomCount: 2,

    onPlace() {
      // Retrieve the outputs that BSP just created and overwrite the solid /
      // collider / height textures with our hand-crafted two-room layout.
      const outputs = game.dungeon.outputs;
      if (!outputs) return;
      const { width, height, textures } = outputs;

      const solidData = textures.solid.image.data;
      const cfData = textures.colliderFlags.image.data;
      const floorData = textures.floorHeightOffset.image.data;
      const ceilData = textures.ceilingHeightOffset.image.data;

      // Start: every cell solid and impassable.
      for (let i = 0; i < width * height; i++) {
        solidData[i] = 1;
        cfData[i] = IS_BLOCKED;
        floorData[i] = 128;
        ceilData[i] = 128;
      }

      // Helper: carve an open, walkable rectangle.
      function carve(x0, z0, x1, z1) {
        for (let cz = z0; cz <= z1; cz++) {
          for (let cx = x0; cx <= x1; cx++) {
            const i = cz * width + cx;
            solidData[i] = 0;
            cfData[i] = IS_WALKABLE | IS_LIGHT_PASSABLE;
          }
        }
      }

      carve(1, 1, 7, 8); // Room A
      carve(9, 1, 18, 8); // Room B
      // col 8 (the wall between rooms) stays solid — door + button are in it.

      textures.solid.needsUpdate = true;
      textures.colliderFlags.needsUpdate = true;
      textures.floorHeightOffset.needsUpdate = true;
      textures.ceilingHeightOffset.needsUpdate = true;

      // Paint button overlay onto the button wall cell.
      game.dungeon.paint(BTN_X, BTN_Z, {
        wall: ["overlay_button_notPressed_stone.png"],
      });
    },
  },

  player: {
    hp: 10,
    maxHp: 10,
    attack: 1,
    defense: 0,
    speed: 5,
    x: 7, // right next to the button wall
    z: BTN_Z, // same row as the button
    facing: -Math.PI / 2, // facing east (toward the button)
  },
});

// ---------------------------------------------------------------------------
// Door trigger
// ---------------------------------------------------------------------------

function triggerDoor(openDown) {
  if (openDown === undefined) openDown = false;

  if (doorTriggered) return;
  doorTriggered = true;

  // 1. Update button overlay to pressed state.
  game.dungeon.paint(BTN_X, BTN_Z, {
    wall: ["overlay_button_pressed_stone.png"],
  });
  if (btnStateEl) btnStateEl.textContent = "pressed";

  // 2. Open door cell: mark not-solid so the player can walk through.
  const outputs = game.dungeon.outputs;
  const solidData = outputs.textures.solid.image.data;
  const cfData = outputs.textures.colliderFlags.image.data;

  const dIdx = DOOR_Z * DW + DOOR_X;
  solidData[dIdx] = 0;
  cfData[dIdx] = IS_WALKABLE | IS_LIGHT_PASSABLE;
  outputs.textures.solid.needsUpdate = true;
  outputs.textures.colliderFlags.needsUpdate = true;

  // 3. Pick the height texture to animate and set the door to its closed position.
  //    openUp  (default): ceiling starts low (CEIL_CLOSED) and rises to CEIL_OPEN.
  //      ceilSkirtTiles fills the gap below with wall texture → panel slides up.
  //    openDown: floor starts raised (CEIL_CLOSED) and drops to 128 (normal).
  //      floorSkirtTiles fills the gap above with wall texture → panel slides down.
  //    Both directions animate from 151 → 128 (same delta, different texture).
  const heightTex = openDown
    ? outputs.textures.floorHeightOffset
    : outputs.textures.ceilingHeightOffset;
  const heightData = heightTex.image.data;

  heightData[dIdx] = CEIL_CLOSED;
  heightTex.needsUpdate = true;

  renderer?.rebuild();
  if (doorStateEl) doorStateEl.textContent = "opening…";

  // 4. Animate the height down from CEIL_CLOSED (151) to CEIL_OPEN (128).
  let heightVal = CEIL_CLOSED;
  const interval = setInterval(() => {
    heightVal -= 1;
    heightData[dIdx] = heightVal;
    heightTex.needsUpdate = true;
    renderer?.rebuild();

    if (heightVal <= CEIL_OPEN) {
      clearInterval(interval);
      if (doorStateEl) doorStateEl.textContent = "open";
    }
  }, ANIM_MS);
}

// ---------------------------------------------------------------------------
// 3D renderer
// ---------------------------------------------------------------------------

async function init() {
  const atlasJson = await fetch("../textureAtlas.json").then((r) => r.json());
  const packed = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: false,
  });
  const resolver = packedAtlasResolver(packed);

  renderer = createDungeonRenderer(viewportEl, game, {
    packedAtlas: packed,
    tileNameResolver: resolver,
    offsetFactor: OFFSET_FACTOR,
    floorTile: "flagstone_floor_stone.png",
    ceilTile: "plaster_ceiling.png",
    wallTile: "cobble_wall_stone.png",
    // Ceiling skirt: used when the door opens upward. The gap between the door
    // cell's low ceiling and the neighbouring room's ceiling renders as a stone
    // panel sliding up.
    ceilSkirtTiles: {
      north: { tile: "cobble_wall_stone.png" },
      south: { tile: "cobble_wall_stone.png" },
      east: { tile: "cobble_wall_stone.png" },
      west: { tile: "cobble_wall_stone.png" },
    },
    // Floor skirt: used when the door opens downward. The gap between the door
    // cell's raised floor and the neighbouring room's floor renders as a stone
    // panel sliding down.
    floorSkirtTiles: {
      north: { tile: "cobble_wall_stone.png" },
      south: { tile: "cobble_wall_stone.png" },
      east: { tile: "cobble_wall_stone.png" },
      west: { tile: "cobble_wall_stone.png" },
    },
    ambientOcclusion: 0.7,
  });

  game.generate();

  if (btnPosEl) btnPosEl.textContent = `(${BTN_X}, ${BTN_Z})`;
  updatePlayerPos();
}

init();

// ---------------------------------------------------------------------------
// Keybindings
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveForward: ["KeyW", "ArrowUp"],
    moveBackward: ["KeyS", "ArrowDown"],
    moveLeft: ["KeyA", "ArrowLeft"],
    moveRight: ["KeyD", "ArrowRight"],
    turnLeft: ["KeyQ"],
    turnRight: ["KeyE"],
    use: ["Space", "KeyF"],
  },
  onAction(action, event) {
    event.preventDefault();

    if (action === "use") {
      // Fire the door if the cell directly ahead is the button.
      const yaw = game.player.facing;
      const fx = Math.round(-Math.sin(yaw));
      const fz = Math.round(-Math.cos(yaw));
      if (game.player.x + fx === BTN_X && game.player.z + fz === BTN_Z) {
        triggerDoor(true);
      }
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
    }
    if (a) {
      game.turns.commit(a);
      updatePlayerPos();
    }
  },
});
