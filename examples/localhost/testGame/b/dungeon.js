import { tutPlacement } from "../tutorial.js";
import { handleCellHover, handleCellClick, globs } from "./shared.js";
import { showLevelTitle } from "./modal.js";

import {
  createDungeonRenderer,
  attachDecorator,
  createEntity,
  setSkyPanelCount,
  attachSurfacePainter,
} from "atomic-core";

// ---------------------------------------------------------------------------
// Dungeon config (same seed → same dungeon on every client)
// ---------------------------------------------------------------------------
export const DUNGEON_CONFIG = {
  width: 64,
  height: 64,
  seed: 0xdeadcafe,
  roomMinSize: 5,
  roomMaxSize: 14,
  roomCount: 16,

  // onPlace runs after BSP generation with access to all rooms, startRoom,
  // endRoom, a seeded rng, and a place API for objects/enemies/decorations.
  onPlace({ rooms, startRoom, endRoom, rng, place }) {
    tutPlacement(rooms, startRoom, endRoom, rng, place);
    //place.object(endRoom.cx, endRoom.cz, 'exit');
    //rooms.forEach(function (room) {
    //	if (rng.chance(0.4)) place.object(room.cx, room.cz, 'chest')
    //	if (rng.chance(0.3)) place.npc(room.cx, room.cz, 'villager')
    //	if (rng.chance(0.2)) place.enemy(room.cx, room.cz, 'goblin')
    //	if (rng.chance(0.3)) place.decoration(room.cx - 1, room.cz, 'barrel')
    // Paint atlas layers in sequence over the generated tile
    //	place.surface(room.cx, room.cz, ['flagstone-floor', 'crack-overlay'])
    //});
  },

  passages: {
    traversalFactor: 2, // movement cost multiplier while inside a passage
    onToggle: function ({ passage, enabled }) {},
    onTraverse: function ({ passage, progress }) {},
  },
};

const FLOOR_TILE = "natural/floor_moss";
const CEIL_TILE = null; // "fantasy/flagstone_floor_stone";
const WALL_TILE = "natural/wall_forest1";
const FLOOR_SKIRT_TILES = null; // none configured
const CEIL_SKIRT_TILES = null; // none configured

// Horizon colour also used as fogColor so the sky fades seamlessly into fog.
const ZENITH = "#020810"; // near-black zenith
const HORIZON = "#0a1e3a"; // dark navy horizon — must match fogColor below

export function makeDungeon() {
  // ---------------------------------------------------------------------------
  // 3D renderer — with tile atlas
  // ---------------------------------------------------------------------------
  //
  // atlas.png: 512×1024 px, 64 px tiles → 8 columns.
  // Tile ID = (pixelY / 64) * 8 + (pixelX / 64)  (row-major, top-left origin).
  //
  // atlas.json entries used (uv = [pixelX, pixelY]):
  //   Floor   – Flagstone   uv [256, 128] → id 20
  //   Ceiling – Cobblestone uv [192, 128] → id 19
  //   Wall    – Brick       uv [0,   128] → id 16

  let renderer;
  renderer = createDungeonRenderer(globs.viewportEl, window.game, {
    packedAtlas: globs.packed,
    tileNameResolver: globs.resolver,
    floorTile: FLOOR_TILE,
    /*floorSkirtTiles: {
			north: { tile: "fantasy/cobble_wall_stone", rotation: 0 },
			south: { tile: "fantasy/cobble_wall_stone", rotation: 0 },
			east: { tile: "fantasy/cobble_wall_stone", rotation: 0 },
			west: { tile: "fantasy/cobble_wall_stone", rotation: 0 },
		},*/
    ceilTile: CEIL_TILE,
    /*
		ceilSkirtTiles: {
			north: { tile: "fantasy/flagstone_floor_stone", rotation: 0 },
			south: { tile: "fantasy/flagstone_floor_stone", rotation: 0 },
			east: { tile: "fantasy/flagstone_floor_stone", rotation: 1 },
			west: { tile: "fantasy/flagstone_floor_stone", rotation: 3 },
		},*/
    wallTile: WALL_TILE, // corridor base; room walls use brick via a layer

    ceilingHeight: 3,
    offsetFactor: 1 / 12,
    snapCameraToFloor: true,

    // Fog colour matches the skybox horizon so far geometry fades into the sky.
    fogColor: HORIZON,
    fogNear: 3,
    fogFar: 33,
    // AO darkens corners; openSkyLighting lightens floors below sky holes.
    ambientOcclusion: 1,
    openSkyLighting: 0.1,
    skybox: { faces: globs.skyboxFaces },
    /*
		// ── Skybox ────────────────────────────────────────────────────────────────
		// Replaces the flat fog-colour background with a 6-texture cube map.
		// Fog still applies to dungeon geometry. See "Skybox" section for details.
		skybox: {
			faces: {
			px: 'sky/right.png',   // +X (right)
			nx: 'sky/left.png',    // -X (left)
			py: 'sky/top.png',     // +Y (top)
			ny: 'sky/bottom.png',  // -Y (bottom)
			pz: 'sky/front.png',   // +Z (front)
			nz: 'sky/back.png',    // -Z (back)
			},
			rotationY: 0,             // radians — aligns front face to dungeon north
		},*/
    surfaceLighting: {
      floor: 1.0,
      ceiling: 0.9,
      wallMin: 0.85,
      wallMax: 0.95,
    },
    entityAppearances: {
      health_potion: {
        color: 0x4488ee,
        widthFactor: 0.18,
        heightFactor: 0.22,
        depthFactor: 0.18,
      },
      item: {
        color: 0x4488ee,
        widthFactor: 0.18,
        heightFactor: 0.22,
        depthFactor: 0.18,
      },
    },

    // ── Hover: blue tint on the hovered cell + cursor tooltip ────────────
    onCellHover(info) {
      handleCellHover(info);
    },

    // ── Click: yellow region highlight + texture mapping panel ───────────
    onCellClick(info) {
      handleCellClick(info);
    },
  });

  // ── Layers ────────────────────────────────────────────────────────────────
  //
  // textures.regionId: 0 = corridor cell, >0 = room cell.
  //
  // Base wallTile (cobble) covers all walls.  Three layers refine this:
  //   1. Room walls → brick_wall_stone.png
  //   2. Room walls, odd coords → alt_brick_wall_stone.png overlay
  //   3. Corridor walls → concrete_stone.png overlay
  //
  // For N/S walls the face runs along X, so oddness is checked on cx.
  // For E/W walls the face runs along Z, so oddness is checked on cz.

  function isRoom(cx, cz) {
    const outputs = window.game.dungeon.outputs;
    if (!outputs) return false;
    const { width, textures } = outputs;
    const regionId = textures.regionId.image.data;
    return regionId[cz * width + cx] < 3;
  }

  function isOdd(cx, cz, direction) {
    return direction === "north" || direction === "south"
      ? cx % 2 !== 0
      : cz % 2 !== 0;
  }

  // renderer.addLayer adds temp images for eg. blood that doesn't serialize. it's not stored as part of the map data.
  // it is per-face called
  renderer.addLayer({
    target: "wall",
    material: renderer.createAtlasMaterial(),
    filter: (cx, cz, direction) =>
      isOdd(cx, cz, direction) ? { tile: "natural/wall_forest2" } : null,
  });

  // attachSurfacePainter handles map data changes, it is per-tile called
  attachSurfacePainter(window.game, {
    onPaint: function ({ dungeon, roomId, x, y }) {
      let room = dungeon.rooms[roomId];
      if (!room) return null;

      // Puddle near room centre
      if (Math.abs(x - room.cx) + Math.abs(y - room.cz) <= 1) {
		return { floor: ['natural/fx_burning'], wall: ['natural/fx_burning'] };
	}

      return null;
    },
  });

  /* these modify individual rooms from the base standard
	// Layer 1 — room base: brick over all room wall faces.
	renderer.addLayer({
		target: "wall",
		material: renderer.createAtlasMaterial(),
		filter: (cx, cz) =>
			isRoom(cx, cz) ? { tile: "fantasy/brick_wall_stone" } : null,
	});

	// Layer 2 — room overlay: alternate brick on odd-coordinate room wall faces.

	// Layer 3 — corridor overlay: concrete on corridor wall faces.
	renderer.addLayer({
		target: "wall",
		material: renderer.createAtlasMaterial(),
		filter: (cx, cz) =>
			!isRoom(cx, cz) ? { tile: "fantasy/jacobean_panel_wall_wood" } : null,
	});

	// Layer 4 — corridor ceiling: concrete.
	renderer.addLayer({
		target: "ceil",
		material: renderer.createAtlasMaterial(),
		filter: (cx, cz) =>
			!isRoom(cx, cz) ? { tile: "plaster_ceiling" } : null,
	});

	// Layer 5 — corridor floor: wood planks.
	renderer.addLayer({
		target: "floor",
		material: renderer.createAtlasMaterial(),
		filter: (cx, cz) =>
			!isRoom(cx, cz) ? { tile: "fantasy/plank_floor_wood" } : null,
	});*/

  window.renderer = renderer;

  attachDecorator(window.game, {
	onDecorate({ dungeon, roomId, x, y }) {
		let room = dungeon.rooms[roomId];
		if (!room) return null;

		if (Math.random() < 0.25) {
			const e = createEntity({	
				id: `decor${x}${y}`,
				type: "decor",
				kind: 'decoration', faction: 'none',
				spriteMap: {frameSize: { w: 64, h: 64 },layers: [{ tile: "natural/rose", opacity: 1.0 },],},
				x: x,
				z: y,
				blocksMove: false,
				yaw: 1,       // rotation in radians
				scale: 2,       // uniform scale multiplier
			});
			globs.entities.push(e);
			return e;
		}

		return null;
	},
});
}

function makeFaceUrl(w, h, stops, starCount = 0) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    stops.forEach(([t, c]) => grad.addColorStop(t, c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() < 0.12 ? 1.2 : 0.65;
      const alpha = (0.45 + Math.random() * 0.55).toFixed(2);
      ctx.fillStyle = `rgba(195,215,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)));
  });
}

export async function buildSkyboxFaces() {
  const side = () =>
    makeFaceUrl(
      512,
      512,
      [
        [0, ZENITH],
        [0.5, HORIZON],
        [1, "#000000"],
      ],
      999,
    );
  const [px, nx, pz, nz] = await Promise.all([side(), side(), side(), side()]);

  // Top face: starfield.
  const py = await makeFaceUrl(
    512,
    512,
    [
      [0, ZENITH],
      [1, ZENITH],
    ],
    999,
  );

  // Bottom face: dark stone ground (rarely visible through pits).
  const ny = await makeFaceUrl(512, 512, [
    [0, "#0c0906"],
    [1, "#050402"],
  ]);

  return { px, nx, py, ny, pz, nz };
}

const IS_WALKABLE = 0x01;	// 	Normal volitional movement (walk/run) is permitted
const IS_BLOCKED = 0x02;	// 	No entity may enter by any means — forced or voluntary
const IS_LIGHT_PASSABLE = 0x04; // 	Light and line-of - sight rays pass through
const VOID = 0;		// solid	
const FLOOR = 1;	// not-solid
const WALL = 2;		// solid
const DOOR = 3;		// solid
const DECOR = 5;	// not-solid
const colliderflags=[IS_BLOCKED, IS_WALKABLE|IS_LIGHT_PASSABLE, IS_BLOCKED, IS_BLOCKED, null, IS_WALKABLE|IS_LIGHT_PASSABLE];

// ---------------------------------------------------------------------------
// Sky panel pass — run once after generate()
// ---------------------------------------------------------------------------
export function applySkyPanels() {
	const outputs = window.game.dungeon.outputs;
	if (!outputs) return;
	const { width, height, textures } = outputs;
	const solid = textures.solid.image.data;
	const dist = textures.distanceToWall.image.data;
	const floorOff = textures.floorHeightOffset.image.data;
	const ceilOff = textures.ceilingHeightOffset.image.data;

	for (let cz = 0; cz < DUNGEON_CONFIG.height; cz++) {
		for (let cx = 0; cx < DUNGEON_CONFIG.width; cx++) {
			const i = cz * DUNGEON_CONFIG.width + cx;
			// set the walls based on some other procgen function
			const r = (Math.random()<0.25) ? WALL : FLOOR;

			/* options we can set
			applyTextureTo=['floor','wall','ceiling']
			floorSkirt
			ceilingSkirt
			skyPanelCount
			ceilingPanelCount
			floorHeightOffset
			ceilingHeightOffset
			solid
			colliderFlags
			*/
			const d = dist[i]; // distance to nearest wall (BFS steps)
			const opts = {
				solid: (colliderflags[r]&IS_BLOCKED) ? 1 : 0,
				colliderFlags: colliderflags[r],
				skyPanelCount: 2,
				ceilingHeightOffset: 0,	// open sky
				applyTextureTo: ['floor', 'wall'],
			};
			if (d > 1) opts.floorHeightOffset = 129 - (Math.random() * 4);
			else opts.floorHeightOffset = 129 - (Math.random() * 2);

			window.game.dungeon.set(cx, cz, "fantasy/flagstone_floor_stone", opts);
		}
	}
}
