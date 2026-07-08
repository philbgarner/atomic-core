// doors-demo.js — portcullis door demo
//
// Two hand-crafted rooms separated by a single-cell-wide wall column. One
// column cell is left open as the door threshold; findDoorCandidates() +
// wallOffDoorGroup() (previously-unused dungeon-generation helpers) narrow it
// to exactly one door cell, which is then registered with
// game.dungeon.doors.add() and rendered by the new doors renderer as a
// double-sided frame/pane/frame sandwich (see rendering/doorRenderer.ts).
//
// The door starts locked. Press U to unlock it (simulating a lever/key),
// then walk into it to open it ("bump to open"), or use Space/F while facing
// it to toggle it explicitly. Hovering the door pane shows a tooltip using
// the same pick-object mechanism billboards use — no manual invisible mesh
// required.

const {
  createGame,
  attachKeybindings,
  createDungeonRenderer,
  loadTextureAtlas,
  packedAtlasResolver,
  findDoorCandidates,
  wallOffDoorGroup,
  IS_WALKABLE,
  IS_BLOCKED,
  IS_LIGHT_PASSABLE,
} = AtomicCore;

const DW = 19;
const DH = 9;
// Room A: cols 1-8, wall column: 9, Room B: cols 10-17. Rows 1-7 interior.
// Both rooms sit directly against the wall column — no gap — so the wall
// column's threshold cells have a real room neighbour on each side.
const ROOM_A = { x0: 1, z0: 1, x1: 8, z1: 7 };
const ROOM_B = { x0: 10, z0: 1, x1: 17, z1: 7 };
const WALL_COL = 9;
const DOOR_ROW = 4; // the single open threshold row in the wall column

const doorStateEl = document.getElementById("door-open-state");
const lockStateEl = document.getElementById("door-lock-state");
const tooltipEl = document.getElementById("tooltip");

let renderer;
const DOOR_ID = "door_1";

const game = createGame(document.body, {
  dungeon: {
    width: DW,
    height: DH,
    seed: 42,
    roomMinSize: 3,
    roomMaxSize: 5,
    roomCount: 2,

    onPlace() {
      const outputs = game.dungeon.outputs;
      if (!outputs) return;
      const { width, height, textures } = outputs;
      const solidData = textures.solid.image.data;
      const cfData = textures.colliderFlags.image.data;
      const regionData = textures.regionId.image.data;

      // Start: everything solid/blocked, regionId 0.
      for (let i = 0; i < width * height; i++) {
        solidData[i] = 1;
        cfData[i] = IS_BLOCKED;
        regionData[i] = 0;
      }

      function carve(rect, regionId) {
        for (let cz = rect.z0; cz <= rect.z1; cz++) {
          for (let cx = rect.x0; cx <= rect.x1; cx++) {
            const i = cz * width + cx;
            solidData[i] = 0;
            cfData[i] = IS_WALKABLE | IS_LIGHT_PASSABLE;
            regionData[i] = regionId;
          }
        }
      }
      carve(ROOM_A, 1);
      carve(ROOM_B, 2);

      // Wall column: open every cell (regionId 0 = "corridor" per
      // findDoorCandidates' convention) so the whole column is a candidate
      // opening; wallOffDoorGroup() then narrows it to a single door cell.
      for (let cz = ROOM_A.z0; cz <= ROOM_A.z1; cz++) {
        const i = cz * width + WALL_COL;
        solidData[i] = 0;
        cfData[i] = IS_WALKABLE | IS_LIGHT_PASSABLE;
        regionData[i] = 0;
      }

      const candidates = findDoorCandidates(
        regionData,
        solidData,
        width,
        height,
      );
      const candidate =
        candidates.find((c) => c.x === WALL_COL) ?? candidates[0];
      if (candidate) {
        wallOffDoorGroup(
          candidate,
          solidData,
          cfData,
          regionData,
          width,
          height,
        );

        const door = game.dungeon.doors.add({
          id: DOOR_ID,
          x: candidate.x,
          z: candidate.z,
          yaw: candidate.yaw,
          keyId: -1,
          roomId: candidate.roomId,
          locked: true,
          open: false,
          visual: {
            frameTile: "arch_stone_brick.png",
            frameTileBack: "arch_stone_brick.png",
            paneTile: "grille_metal.png",
            paneTileLocked: "gate_solid_metal.png",
            axis: "vertical",
            slideDistance: 1,
            duration: 600,
            easing: "easeInOutCubic",
          },
        });
        updateStatus(door);
      }

      textures.solid.needsUpdate = true;
      textures.colliderFlags.needsUpdate = true;
      textures.regionId.needsUpdate = true;
    },
  },

  player: {
    hp: 10,
    maxHp: 10,
    attack: 1,
    defense: 0,
    speed: 5,
    x: 8,
    z: DOOR_ROW,
    facing: -Math.PI / 2, // facing east, toward the door — one step away
  },
});

function updateStatus(door) {
  const d = door ?? game.dungeon.doors.get(DOOR_ID);
  if (!d) return;
  if (doorStateEl) doorStateEl.textContent = d.open ? "open" : "closed";
  if (lockStateEl) lockStateEl.textContent = d.locked ? "locked" : "unlocked";
}

game.events.on("door-state", ({ door }) => updateStatus(door));

// ---------------------------------------------------------------------------
// 3D renderer
// ---------------------------------------------------------------------------

async function init() {
  const atlasJson = await fetch("../textureAtlas.json").then((r) => r.json());
  const packed = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: false,
  });
  const resolver = packedAtlasResolver(packed);

  renderer = createDungeonRenderer(document.getElementById("viewport"), game, {
    packedAtlas: packed,
    tileNameResolver: resolver,
    floorTile: "flagstone_floor_stone.png",
    ceilTile: "plaster_ceiling.png",
    wallTile: "cobble_wall_stone.png",
    ambientOcclusion: 0.7,
    onCellHover(info) {
      if (info && info.entityId === DOOR_ID) {
        const d = game.dungeon.doors.get(DOOR_ID);
        tooltipEl.style.display = "block";
        tooltipEl.textContent = d.locked
          ? "Gate (locked)"
          : d.open
            ? "Gate (open)"
            : "Gate";
      } else {
        tooltipEl.style.display = "none";
      }
    },
    onCellClick(_e, info) {
      if (info && info.entityId === DOOR_ID) {
        game.turns.commit(game.player.interact(DOOR_ID));
      }
    },
  });

  game.generate();
  renderer.setDoors(game.dungeon.doors.list);
  game.events.on("generate", () => renderer.setDoors(game.dungeon.doors.list));

  document.addEventListener("pointermove", (e) => {
    tooltipEl.style.left = `${e.clientX + 12}px`;
    tooltipEl.style.top = `${e.clientY + 12}px`;
  });
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
    unlock: ["KeyU"],
  },
  onAction(action, event) {
    event.preventDefault();

    if (action === "unlock") {
      game.dungeon.doors.unlock(DOOR_ID);
      return;
    }

    if (action === "use") {
      game.turns.commit(game.player.interact(DOOR_ID));
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
    if (a) game.turns.commit(a);
  },
});
