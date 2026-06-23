/**
 * dungeonRenderer.ts
 *
 * Plain Three.js first-person dungeon renderer — no React or R3F required.
 * Designed for script-tag usage: create it after `game.generate()` is wired
 * up, and it will visualise the dungeon and player/entity positions.
 *
 * Usage (plain colours):
 *   const renderer = createDungeonRenderer(document.getElementById('viewport'), game);
 *
 * Usage (tile atlas):
 *   const packed = await loadTextureAtlas('sprites.png', atlasJson);
 *   const resolver = packedAtlasResolver(packed);
 *   const renderer = createDungeonRenderer(el, game, {
 *     packedAtlas: packed,
 *     tileNameResolver: resolver,
 *     floorTile: 'stone_floor',
 *     ceilTile:  'ceiling_stone',
 *     wallTile:  'brick_wall',
 *   });
 *
 *   // Pass live entity list on every turn:
 *   game.events.on('turn', () => renderer.setEntities(enemies));
 */

import * as THREE from "three";
import type { GameHandle } from "../api/createGame";
import type { EntityBase, ObjectPlacement } from "../entities/types";
import {
	BASIC_ATLAS_VERT,
	BASIC_ATLAS_FRAG,
	makeBasicAtlasUniforms,
} from "./basicLighting";
import type { FaceTileSpec, DirectionFaceMap } from "./tileAtlas";
import { resolveTile } from "./tileAtlas";
export type { FaceTileSpec, DirectionFaceMap } from "./tileAtlas";
import type { PackedAtlas, UvRect } from "./textureLoader";
import { spriteToUvRect } from "./textureLoader";
import { createBillboard } from "./billboardSprites";
import type { BillboardHandle, SpriteMap } from "./billboardSprites";
export type { SpriteMap } from "./billboardSprites";
import { loadSkybox } from "./skybox";
import type { SkyboxOptions } from "./skybox";
export type { SkyboxFaces, SkyboxOptions } from "./skybox";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Information about a dungeon cell returned by mouse interaction callbacks.
 */
export type CellInfo = {
	/** Grid column (0-based). */
	cx: number;
	/** Grid row (0-based). */
	cz: number;
	/** Region/room ID from the dungeon's regionId texture (0 = unassigned). */
	regionId: number;
	/** entity id, if we clicked on one */
	entityId?: string;
};

export type DungeonRendererOptions = {
	/** Camera field of view in degrees. Default: 75. */
	fov?: number;
	/** World units per grid cell. Default: 3. */
	tileSize?: number;
	/** World-unit height of each corridor/room. Default: 3. */
	ceilingHeight?: number;
	/** Distance at which fog begins. Default: 5. */
	fogNear?: number;
	/** Distance at which fog is fully opaque (== background colour). Default: 24. */
	fogFar?: number;
	/** CSS colour string for fog / background. Default: '#000000'. */
	fogColor?: string;
	/** Smoothing factor for camera animation (0 = instant, 1 = never arrives). Default: 0.18. */
	lerpFactor?: number;
	/** When provided the dungeon geometry uses the packed atlas shader instead of plain MeshStandardMaterial. */
	packedAtlas?: PackedAtlas;
	/**
	 * Converts a string tile name to a numeric atlas tile ID.
	 * Required when any tile option is specified as a string name.
	 * Use `packedAtlasResolver(packed)` for baked-texture atlases,
	 * or provide a custom function wrapping AtlasIndex.someCategory.idByName().
	 */
	tileNameResolver?: (name: string) => number;
	/** Floor tile: string name (resolved via tileNameResolver) or numeric tile index. Default: 0. */
	floorTile?: string | number;
	/** Ceiling tile: string name or numeric tile index. Default: 0. */
	ceilTile?: string | number;
	/** Wall tile: string name or numeric tile index. Default: 0. */
	wallTile?: string | number;
	/**
	 * Per-direction tile overrides for wall faces.
	 * Each entry may specify a different tile and/or UV rotation (0–3 × 90°).
	 * Falls back to `wallTile` for any direction not specified.
	 */
	wallTiles?: DirectionFaceMap;
	/**
	 * Per-direction tile overrides for floor skirt (edge) faces.
	 * Falls back to `floorTile` for any direction not specified.
	 */
	floorSkirtTiles?: DirectionFaceMap;
	/**
	 * Per-direction tile overrides for ceiling skirt (edge) faces.
	 * Falls back to `ceilTile` for any direction not specified.
	 */
	ceilSkirtTiles?: DirectionFaceMap;
	/**
	 * Fraction of tileSize used as the height step per offset unit.
	 * Controls how tall each floor/ceiling height level is. Default: 0.5.
	 */
	offsetFactor?: number;
	/**
	 * Camera eye height as a fraction of ceilingHeight.
	 * 0 = floor level, 1 = ceiling level. Default: 0.66 (~5 ft in a 7.5 ft room).
	 */
	eyeHeightFactor?: number;
	/**
	 * When true, the camera Y position tracks the floor height offset at the
	 * player's current cell (in addition to the normal eyeHeightFactor offset).
	 * Transitions are smoothed by the same lerpFactor used for X/Z movement.
	 * Default: false.
	 */
	snapCameraToFloor?: boolean;
	/**
	 * Per-entity-type (or per-kind) visual overrides for the cube renderer.
	 * Keys are matched against `entity.type` first, then `entity.kind`.
	 * Unmatched entities use built-in defaults (0.35×0.55×0.35 tileSize fractions, red).
	 */
	entityAppearances?: Record<string, EntityAppearanceSpec>;
	/**
	 * Called when the user clicks on a floor cell in the dungeon.
	 * The click is resolved by casting a ray from the camera through the
	 * mouse position and intersecting it with the floor plane (y = 0).
	 */
	onCellClick?: (e: MouseEvent, info: CellInfo) => void;
	/**
	 * Called whenever the hovered cell changes (including when the cursor
	 * leaves the dungeon surface, in which case `info` is `null`).
	 * Throttled: only fires when the cell actually changes.
	 */
	onCellHover?: (info: CellInfo | null) => void;
	/**
	 * Vertex ambient occlusion intensity. Darkens where walls, floors, and
	 * ceilings meet by sampling the solid map at each face's four corners at
	 * dungeon-build time and storing the result in the `aAoCorners` attribute.
	 *
	 * Pass `true` for the default intensity of 0.75, a number in [0, 1] for a
	 * custom value, or omit / `false` to disable (default). Has no effect when
	 * no atlas is provided.
	 */
	ambientOcclusion?: boolean | number;
	/**
	 * Tune the directional surface lighting multipliers.
	 * All fields are optional; omit the whole object to use defaults.
	 *
	 * - `floor`   — flat multiplier for floor faces. Default: `0.85`.
	 * - `ceiling` — flat multiplier for ceiling faces. Default: `0.95`.
	 * - `wallMin` — brightness for walls whose normal is perpendicular to the
	 *               camera (side walls, dot product = 0). Default: `0.9`.
	 * - `wallMax` — brightness for walls whose normal is parallel to the camera
	 *               forward vector (facing walls, dot product = ±1). Default: `1.1`.
	 *
	 * Wall brightness at any angle: `wallMin + abs(dot(normal, camFwd)) * (wallMax - wallMin)`.
	 */
	surfaceLighting?: {
		floor?: number;
		ceiling?: number;
		wallMin?: number;
		wallMax?: number;
	};
	/**
	 * Ambient brightness boost for floor tiles directly below open-sky ceiling cells
	 * (`ceilingHeightOffset === 0`) and their immediate neighbours. Blends the
	 * pre-baked AO corner values toward fully lit (`1.0`), simulating diffuse
	 * daylight falling through the opening. The current cell receives the full boost;
	 * cardinal neighbours receive half. Value in `[0, 1]`; default `0` (no effect).
	 * Requires `ambientOcclusion` to be enabled — has no visible effect without AO.
	 */
	openSkyLighting?: number;
	/**
	 * Lighting applied to sky-panel faces — the vertical panels that appear on
	 * walls adjacent to open-sky (no-ceiling) cells, simulating a view of the
	 * outside. Setting this makes sky panels appear naturally brighter (and
	 * optionally tinted) as if they are receiving daylight from above, without
	 * requiring a placed scene light.
	 *
	 * - `brightness` — flat surface-light multiplier for sky-panel faces.
	 *   Values above 1.0 make panels brighter than regular walls.
	 *   Default: `1.3`.
	 * - `color` — RGB light added to sky-panel faces and open-sky floor/skirt
	 *   cells after surface lighting, simulating sky illumination cast onto the
	 *   surface (additive blend). Keep values small — `[0.15, 0.2, 0.35]` for
	 *   a subtle cool daylight, `[0.3, 0.2, 0.1]` for warm torchlight.
	 *   Default: `[0, 0, 0]` (no addition — no visible effect).
	 */
	outsideLight?: {
		brightness?: number;
		color?: [number, number, number];
	};
	/**
	 * Optional 6-texture cube-map skybox. When provided the plain fog-colour
	 * scene background is replaced by the cube map. Fog still applies to dungeon
	 * geometry as normal. Supply either six image URL strings via `faces`, or a
	 * pre-loaded `THREE.CubeTexture`. An optional `rotationY` (radians) aligns
	 * the front face to the dungeon's north axis.
	 *
	 * Can also be attached or swapped at runtime via `renderer.setSkybox()`.
	 */
	skybox?: SkyboxOptions;
};

// ---------------------------------------------------------------------------
// Layer API types
// ---------------------------------------------------------------------------

/** Which class of dungeon geometry a layer targets. */
export type LayerTarget =
	| "floor"
	| "ceil"
	| "wall"
	| "floorSkirt"
	| "ceilSkirt";

/**
 * Return value from a `LayerSpec.filter` callback.
 * Return an object (optionally overriding `tile`/`rotation`) to include the
 * face, or a falsy value to exclude it.
 */
export type LayerFaceResult =
	| { tile?: string | number; rotation?: number }
	| null
	| false
	| undefined;

export type LayerSpec = {
	/** Which geometry class to add the layer on top of. */
	target: LayerTarget;
	/** Three.js material for this layer's instanced mesh. */
	material: THREE.Material;
	/**
	 * Called for each candidate face.  Return an object to include the face
	 * (optionally overriding `tile` and `rotation`), or a falsy value to skip.
	 * `direction` is provided for 'wall', 'floorSkirt', and 'ceilSkirt' targets.
	 * Default: include every face with tileId 0, rotation 0.
	 */
	filter?: (
		cx: number,
		cz: number,
		direction?: "north" | "south" | "east" | "west",
	) => LayerFaceResult;
	/**
	 * Whether to attach atlas shader attributes (aUvRect, aSurface, etc.)
	 * to the instanced geometry.  Defaults to `true` when an atlas was passed
	 * to `createDungeonRenderer`, `false` otherwise.
	 */
	useAtlas?: boolean;
	/**
	 * Enable `THREE.Material.polygonOffset` on the layer material so it
	 * renders on top of the base geometry without z-fighting.  Default: `true`.
	 */
	polygonOffset?: boolean;
};

export type LayerHandle = {
	/** Remove this layer from the scene and release its geometry. */
	remove(): void;
};

/**
 * Visual appearance for a specific entity type or kind used by the cube renderer.
 * Keys in `DungeonRendererOptions.entityAppearances` are matched against
 * `entity.type` first, then `entity.kind` as a fallback.
 */
export type EntityAppearanceSpec = {
	/** Hex colour number or CSS colour string. Default: 0xcc2222. */
	color?: number | string;
	/** Width as a fraction of tileSize. Default: 0.35. */
	widthFactor?: number;
	/** Height as a fraction of ceilingHeight. Default: 0.55. */
	heightFactor?: number;
	/** Depth as a fraction of tileSize. Defaults to widthFactor when omitted. */
	depthFactor?: number;

	/**TODO: Billboarding texture. */
};

export type DungeonRenderer = {
	/**
	 * The Three.js Scene used by the renderer.
	 * Add PointLights, DirectionalLights, or any other Three.js objects directly.
	 * Attach a PointLight to `camera` for a player-locked torch:
	 *   `renderer.camera.add(new THREE.PointLight(0xffaa44, 5, 20))`
	 */
	scene: THREE.Scene;
	/**
	 * The PerspectiveCamera tracking the player.
	 * Attach lights as children for player-relative effects:
	 *   `renderer.camera.add(torch)` — torch follows the player automatically.
	 */
	camera: THREE.PerspectiveCamera;
	/**
	 * Add a Three.js light to the renderer scene.
	 * Returns the same light object so you can modify it at any time —
	 * changes to position, intensity, or color take effect on the next frame.
	 * Lights added here are automatically removed when `destroy()` is called.
	 *
	 * @example
	 * // Player torch — attach to camera so it follows the player:
	 * const torch = renderer.addLight(new THREE.PointLight(0xffaa44, 4, 20, 2));
	 * renderer.camera.add(torch);
	 *
	 * // Fixed wall sconce:
	 * const sconce = renderer.addLight(new THREE.PointLight(0xff6622, 2, 12, 2));
	 * sconce.position.set(wx, wy, wz);
	 */
	addLight<T extends THREE.Light>(light: T): T;
	/**
	 * Remove a light previously added with `addLight`.
	 * Has no effect if the light was not added through this API.
	 */
	removeLight(light: THREE.Light): void;
	/**
	 * Update the renderer's entity list. Call this on every 'turn' event
	 * (or whenever entity positions change) to keep the scene in sync.
	 */
	setEntities(entities: EntityBase[]): void;
	/**
	 * edit a (billboard) entity sprite, for animations
	 */
	editEntity(entity: EntityBase, layerIndex: number, tile: string): void;
	/**
	 * Register stationary billboard objects derived from `ObjectPlacement` records.
	 * Call once after `game.generate()` (or pass `game.dungeon.objects` directly).
	 * Objects with a `spriteMap` are rendered as camera-facing billboard sprites;
	 * objects without one are ignored by the renderer.
	 */
	setObjects(objects: ObjectPlacement[]): void;
	/**
	 * Project a dungeon grid cell to 2D pixel coordinates relative to the
	 * renderer's container element, using the current camera state.
	 *
	 * Returns `{ x, y }` in pixels (suitable for `left`/`top` on an absolutely-
	 * positioned child of the container), or `null` when the point is behind
	 * the camera or outside the viewport.
	 *
	 * `worldY` is the vertical world-space position to project; defaults to
	 * mid-entity height (~40% of ceiling height).
	 */
	worldToScreen(gridX: number, gridZ: number, worldY?: number): { x: number; y: number } | null;
	/**
	 * Add an instanced geometry layer on top of existing walls, ceilings, or
	 * floors.  May be called before or after the dungeon is generated; layers
	 * added before generation are deferred and applied automatically.
	 *
	 * Returns a handle whose `remove()` method tears the layer down.
	 */
	addLayer(spec: LayerSpec): LayerHandle;
	/**
	 * Tear down all existing dungeon geometry and rebuild it from the current
	 * dungeon outputs. Call this after `game.regenerate()` to keep the renderer
	 * in sync when the dungeon layout has changed (e.g. a new seed).
	 */
	rebuild(): void;
	/**
	 * Create a new atlas `ShaderMaterial` using the same texture, fog, and
	 * shader settings as the renderer's own geometry.  Useful when building a
	 * layer material that should display tiles from the configured atlas.
	 * Returns `null` when no atlas was passed to `createDungeonRenderer`.
	 */
	createAtlasMaterial(): THREE.ShaderMaterial | null;
	/**
	 * Overlay coloured floor highlights on a subset of cells.
	 *
	 * The `filter` is called for every non-solid floor cell and should return a
	 * CSS colour string to highlight that cell, or a falsy value to skip it.
	 * The `regionId` argument lets callers colour-code cells by room/corridor
	 * without extra bookkeeping.
	 *
	 * Returns a `LayerHandle` whose `remove()` tears the overlay down.
	 * May be called before or after `game.generate()`.
	 *
	 * Example — highlight all cells in room 3 red, corridor cells yellow:
	 * ```ts
	 * const handle = renderer.highlightCells((cx, cz, regionId) => {
	 *   if (regionId === 3) return 'red';
	 *   if (regionId > 100) return 'rgba(255,255,0,0.3)';
	 *   return null;
	 * });
	 * // later:
	 * handle.remove();
	 * ```
	 */
	highlightCells(
		filter: (cx: number, cz: number, regionId: number) => string | null | false | undefined,
	): LayerHandle;
	/**
	 * Update the ambient occlusion intensity at runtime. `intensity` is clamped
	 * to [0, 1]. Takes effect on the next rendered frame.
	 */
	setAmbientOcclusion(intensity: number): void;
	/**
	 * Update directional surface lighting values at runtime. All fields are
	 * optional — omit any field to leave its current value unchanged.
	 * Takes effect on the next rendered frame; no geometry rebuild required.
	 */
	setSurfaceLighting(opts: {
		floor?: number;
		ceiling?: number;
		wallMin?: number;
		wallMax?: number;
	}): void;
	/**
	 * Update outside / sky-panel lighting at runtime. All fields are optional —
	 * omit any field to leave its current value unchanged.
	 * Takes effect on the next rendered frame; no geometry rebuild required.
	 */
	setOutsideLight(opts: {
		brightness?: number;
		color?: [number, number, number];
	}): void;
	/**
	 * Enable or disable floor-height camera tracking at runtime without
	 * rebuilding the renderer. When enabled, the camera Y lerps to
	 * `tileSize * eyeHeightFactor + floorOffset` at the player's cell.
	 * Takes effect immediately on the next rendered frame.
	 */
	setSnapCameraToFloor(enabled: boolean): void;
	/**
	 * Attach or replace the skybox cube map at runtime.
	 * Pass `null` to remove the skybox and revert to the plain fog colour.
	 * Resolves after all six face images have loaded (instant when a pre-loaded
	 * `THREE.CubeTexture` is supplied or when `null` is passed).
	 *
	 * Note: when a pre-loaded `THREE.CubeTexture` is supplied, ownership stays
	 * with the caller — the renderer will not dispose it on `destroy()` or on a
	 * subsequent `setSkybox()` call.
	 */
	setSkybox(opts: SkyboxOptions | null): Promise<void>;
	/** Unmount the canvas and release all Three.js resources. */
	destroy(): void;
};

// ---------------------------------------------------------------------------
// Tile atlas shaders (imported from basicLighting.ts)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const HALF_PI = Math.PI / 2;
/** Eye height as a fraction of ceiling height (same as PerspectiveDungeonView). */
// using the d&d standard of 7.5ft shrinking cubes, 0.66x gives eye level for a medium creature at about 5ft which is what we expect.
const EYE_HEIGHT_FACTOR = 0.66;

function vertexAO(s1: boolean, s2: boolean, c: boolean): number {
	if (s1 && s2) return 0;
	return 3 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (c ? 1 : 0));
}

/**
 * Compute per-corner AO for one face, returned as [tl, tr, bl, br] in [0,1].
 * Corners map to face-local UV space: tl=UV(0,1), tr=UV(1,1), bl=UV(0,0), br=UV(1,0).
 * For wall faces the top and bottom of each column share the same value.
 * UV orientation per direction is derived from the face rotation used in buildDungeon.
 */
function computeFaceAO(
	isSol: (x: number, z: number) => boolean,
	cx: number,
	cz: number,
	dir: "floor" | "ceil" | "north" | "south" | "east" | "west",
): [number, number, number, number] {
	const n = isSol;
	if (dir === "floor") {
		// R_x(-π/2): UV(0,1)→world(-x,-z), UV(1,1)→(+x,-z), UV(0,0)→(-x,+z), UV(1,0)→(+x,+z)
		return [
			vertexAO(n(cx - 1, cz), n(cx, cz - 1), n(cx - 1, cz - 1)) / 3,
			vertexAO(n(cx + 1, cz), n(cx, cz - 1), n(cx + 1, cz - 1)) / 3,
			vertexAO(n(cx - 1, cz), n(cx, cz + 1), n(cx - 1, cz + 1)) / 3,
			vertexAO(n(cx + 1, cz), n(cx, cz + 1), n(cx + 1, cz + 1)) / 3,
		];
	}
	if (dir === "ceil") {
		// R_x(+π/2): UV(0,1)→world(-x,+z), UV(1,1)→(+x,+z), UV(0,0)→(-x,-z), UV(1,0)→(+x,-z)
		return [
			vertexAO(n(cx - 1, cz), n(cx, cz + 1), n(cx - 1, cz + 1)) / 3,
			vertexAO(n(cx + 1, cz), n(cx, cz + 1), n(cx + 1, cz + 1)) / 3,
			vertexAO(n(cx - 1, cz), n(cx, cz - 1), n(cx - 1, cz - 1)) / 3,
			vertexAO(n(cx + 1, cz), n(cx, cz - 1), n(cx + 1, cz - 1)) / 3,
		];
	}
	// Walls: s2 is always the solid cell behind the wall (always true by definition).
	// Only horizontal neighbors vary; top/bottom of each column share the same AO value.
	if (dir === "north") {
		// ry=0: UV x≈0 → world left (cx side), UV x≈1 → world right ((cx+1) side)
		const aoL = vertexAO(n(cx - 1, cz), true, n(cx - 1, cz - 1)) / 3;
		const aoR = vertexAO(n(cx + 1, cz), true, n(cx + 1, cz - 1)) / 3;
		return [aoL, aoR, aoL, aoR];
	}
	if (dir === "south") {
		// ry=π: UV x≈0 → world right ((cx+1) side), UV x≈1 → world left (cx side)
		const aoR = vertexAO(n(cx + 1, cz), true, n(cx + 1, cz + 1)) / 3;
		const aoL = vertexAO(n(cx - 1, cz), true, n(cx - 1, cz + 1)) / 3;
		return [aoR, aoL, aoR, aoL];
	}
	if (dir === "west") {
		// ry=+π/2: UV x≈0 → world south ((cz+1) side), UV x≈1 → world north (cz side)
		const aoS = vertexAO(n(cx, cz + 1), true, n(cx - 1, cz + 1)) / 3;
		const aoN = vertexAO(n(cx, cz - 1), true, n(cx - 1, cz - 1)) / 3;
		return [aoS, aoN, aoS, aoN];
	}
	if (dir === "east") {
		// ry=-π/2: UV x≈0 → world north (cz side), UV x≈1 → world south ((cz+1) side)
		const aoN = vertexAO(n(cx, cz - 1), true, n(cx + 1, cz - 1)) / 3;
		const aoS = vertexAO(n(cx, cz + 1), true, n(cx + 1, cz + 1)) / 3;
		return [aoN, aoS, aoN, aoS];
	}
	return [1, 1, 1, 1];
}

/**
 * Per-corner AO for a vertical skirt face (floor-step or ceiling-step panel).
 * Skirts face AWAY from the current cell toward the lower/higher neighbour,
 * so their UV x-axis is mirrored relative to the matching wall direction.
 * Returns [tl, tr, bl, br] in [0,1].
 */
function computeSkirtFaceAO(
	isSol: (x: number, z: number) => boolean,
	cx: number,
	cz: number,
	dir: "north" | "south" | "east" | "west",
): [number, number, number, number] {
	const n = isSol;
	if (dir === "north") {
		// ry=π (same UV as south wall): x=0 → east (+X), x=1 → west (-X). Neighbour at cz-1.
		const aoE = vertexAO(n(cx + 1, cz), n(cx, cz - 1), n(cx + 1, cz - 1)) / 3;
		const aoW = vertexAO(n(cx - 1, cz), n(cx, cz - 1), n(cx - 1, cz - 1)) / 3;
		return [aoE, aoW, aoE, aoW];
	}
	if (dir === "south") {
		// ry=0 (same UV as north wall): x=0 → west (-X), x=1 → east (+X). Neighbour at cz+1.
		const aoW = vertexAO(n(cx - 1, cz), n(cx, cz + 1), n(cx - 1, cz + 1)) / 3;
		const aoE = vertexAO(n(cx + 1, cz), n(cx, cz + 1), n(cx + 1, cz + 1)) / 3;
		return [aoW, aoE, aoW, aoE];
	}
	if (dir === "west") {
		// ry=-π/2 (same UV as east wall): x=0 → north (-Z), x=1 → south (+Z). Neighbour at cx-1.
		const aoN = vertexAO(n(cx, cz - 1), n(cx - 1, cz), n(cx - 1, cz - 1)) / 3;
		const aoS = vertexAO(n(cx, cz + 1), n(cx - 1, cz), n(cx - 1, cz + 1)) / 3;
		return [aoN, aoS, aoN, aoS];
	}
	if (dir === "east") {
		// ry=+π/2 (same UV as west wall): x=0 → south (+Z), x=1 → north (-Z). Neighbour at cx+1.
		const aoS = vertexAO(n(cx, cz + 1), n(cx + 1, cz), n(cx + 1, cz + 1)) / 3;
		const aoN = vertexAO(n(cx, cz - 1), n(cx + 1, cz), n(cx + 1, cz - 1)) / 3;
		return [aoS, aoN, aoS, aoN];
	}
	return [1, 1, 1, 1];
}

function makeFaceMatrix(
	x: number,
	y: number,
	z: number,
	rx: number,
	ry: number,
	rz: number,
	w: number,
	h: number,
): THREE.Matrix4 {
	return new THREE.Matrix4().compose(
		new THREE.Vector3(x, y, z),
		new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
		new THREE.Vector3(w, h, 1),
	);
}

/**
 * Build a PlaneGeometry with a pre-allocated aTileId InstancedBufferAttribute,
 * and an InstancedMesh using either a ShaderMaterial (atlas) or a plain material.
 */
function buildInstancedMesh(
	matrices: THREE.Matrix4[],
	uvRects: UvRect[],
	material: THREE.Material,
	useAtlas: boolean,
	heightOffsets?: Float32Array,
	uvRotations?: number[],
	uvHeightScales?: number[],
	cellX?: Float32Array,
	cellZ?: Float32Array,
	aoCorners?: Float32Array,
	faceNormals?: Float32Array,
	rowIndexes?: number[],
	uvOffsets?: number[],
): THREE.InstancedMesh {
	const geo = new THREE.PlaneGeometry(1, 1);

	if (useAtlas) {
		const n = matrices.length;

		// aUvRect (vec4, 1 slot): .xy = atlas UV origin, .zw = atlas UV size.
		const uvRectArr = new Float32Array(n * 4);
		uvRects.forEach((r, i) => {
			uvRectArr[i * 4] = r.x;
			uvRectArr[i * 4 + 1] = r.y;
			uvRectArr[i * 4 + 2] = r.w;
			uvRectArr[i * 4 + 3] = r.h;
		});
		geo.setAttribute("aUvRect", new THREE.InstancedBufferAttribute(uvRectArr, 4));

		// aSurface (vec4, 1 slot): .x=heightOffset, .y=uvRotation, .z=uvHeightScale.
		const surfaceArr = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			surfaceArr[i * 4] = 0;	// was heightOffsets ? (heightOffsets[i] ?? 0) : 0; we now bake offset into the mesh so raycasting works correctly
			surfaceArr[i * 4 + 1] = uvRotations ? (uvRotations[i] ?? 0) : 0;
			surfaceArr[i * 4 + 2] = uvHeightScales ? (uvHeightScales[i] ?? 1.0) : 1.0;
			surfaceArr[i * 4 + 3] = uvOffsets ? (uvOffsets[i] ?? 0.0) : 0.0;
		}
		geo.setAttribute("aSurface", new THREE.InstancedBufferAttribute(surfaceArr, 4));

		// aAoCorners (vec4, 1 slot): [tl, tr, bl, br] in [0,1]; all-ones = fully lit.
		const aoArr = aoCorners ?? new Float32Array(n * 4).fill(1.0);
		geo.setAttribute("aAoCorners", new THREE.InstancedBufferAttribute(aoArr, 4));

		// aCellFace (vec4, 1 slot): .xy=grid cell (col,row), .zw=XZ outward face normal.
		const cellFaceArr = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			cellFaceArr[i * 4] = cellX ? (cellX[i] ?? 0) : 0;
			cellFaceArr[i * 4 + 1] = cellZ ? (cellZ[i] ?? 0) : 0;
			cellFaceArr[i * 4 + 2] = faceNormals ? (faceNormals[i * 2] ?? 0) : 0;
			cellFaceArr[i * 4 + 3] = faceNormals ? (faceNormals[i * 2 + 1] ?? 0) : 0;
		}
		geo.setAttribute("aCellFace", new THREE.InstancedBufferAttribute(cellFaceArr, 4));

		// aRowIndex (float, 1 slot): per-panel row index for uBaseOverride lookup.
		const rowArr = new Float32Array(n);
		if (rowIndexes) {
			for (let i = 0; i < n; i++) rowArr[i] = rowIndexes[i] ?? 0;
		}
		geo.setAttribute("aRowIndex", new THREE.InstancedBufferAttribute(rowArr, 1));
	}

	const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
	matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
	mesh.instanceMatrix.needsUpdate = true;
	return mesh;
}

// ---------------------------------------------------------------------------
// createDungeonRenderer
// ---------------------------------------------------------------------------

/**
 * Mount a Three.js first-person dungeon renderer into `element`.
 *
 * Call after `game.generate()` is wired up. The renderer reads dungeon geometry
 * from the game handle and re-renders whenever the player moves. Pass an
 * `options.packedAtlas` + `options.tileNameResolver` pair to enable textured
 * walls/floors/ceilings; omit them for flat-colour geometry.
 *
 * @param element  Container element — the renderer fills it entirely.
 * @param game     Live `GameHandle` returned by `createGame()`.
 * @param options  Optional renderer configuration (fog, atlas, skirt tiles, etc.).
 * @returns        A `DungeonRenderer` handle with `setEntities`, `addLayer`, etc.
 *
 * @example
 * const packed = await loadTextureAtlas('sprites.png', atlasJson);
 * const renderer = createDungeonRenderer(document.getElementById('viewport'), game, {
 *   packedAtlas: packed,
 *   tileNameResolver: packedAtlasResolver(packed),
 *   floorTile: 'stone_floor',
 *   wallTile:  'brick_wall',
 *   ceilTile:  'ceiling_stone',
 * });
 * game.events.on('turn', () => renderer.setEntities([...enemies]));
 */
export function createDungeonRenderer(
	element: HTMLElement,
	game: GameHandle,
	options: DungeonRendererOptions = {},
): DungeonRenderer {
	const tileSize = options.tileSize ?? 3;
	const ceilingH = options.ceilingHeight ?? 3;
	const eyeHeightFactor = options.eyeHeightFactor ?? EYE_HEIGHT_FACTOR;
	const fov = options.fov ?? 75;
	const fogNear = options.fogNear ?? 5;
	const fogFar = options.fogFar ?? 24;
	const fogHex = options.fogColor ?? "#000000";
	const lerpFactor = options.lerpFactor ?? 0.18;
	const offsetStep = tileSize * (options.offsetFactor ?? 0.5);
	let snapToFloor = options.snapCameraToFloor ?? false;
	const fogColor = new THREE.Color(fogHex);
	const packedAtlas = options.packedAtlas;
	const resolver = options.tileNameResolver;
	let aoIntensity = options.ambientOcclusion === true
		? 0.75
		: typeof options.ambientOcclusion === "number"
			? Math.max(0, Math.min(1, options.ambientOcclusion))
			: 0;
	const aoEnabled = aoIntensity > 0;
	const sl = options.surfaceLighting ?? {};
	const floorLight = sl.floor ?? 0.85;
	const ceilLight = sl.ceiling ?? 0.95;
	const wallLightMin = sl.wallMin ?? 0.9;
	const wallLightMax = sl.wallMax ?? 1.1;
	const outsideLight = options.outsideLight ?? {};
	const skyPanelBrightness = outsideLight.brightness ?? 1.3;
	const skyPanelLightColor = new THREE.Color(...(outsideLight.color ?? [0, 0, 0] as [number, number, number]));
	const atlasMaterials: THREE.ShaderMaterial[] = [];

	function getUvRect(id: number): UvRect {
		const sprite = packedAtlas?.getById(id);
		return sprite ? spriteToUvRect(sprite) : { x: 0, y: 0, w: 0, h: 0 };
	}
	const floorId = resolveTile(options.floorTile ?? 0, resolver);
	const ceilId = resolveTile(options.ceilTile ?? 0, resolver);
	const wallId = resolveTile(options.wallTile ?? 0, resolver);
	const wallTiles = options.wallTiles;
	const floorSkirtTiles = options.floorSkirtTiles;
	const ceilSkirtTiles = options.ceilSkirtTiles;

	// ── WebGL renderer ────────────────────────────────────────────────────────
	const glRenderer = new THREE.WebGLRenderer({ antialias: false });
	glRenderer.setPixelRatio(window.devicePixelRatio);
	glRenderer.setClearColor(fogColor);
	const canvas = glRenderer.domElement;
	canvas.style.cssText = "width:100%;height:100%;display:block;";
	element.appendChild(canvas);

	// ── Scene ─────────────────────────────────────────────────────────────────
	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

	// ── Skybox ────────────────────────────────────────────────────────────────
	// Tracks the active cube texture so we can dispose URL-loaded textures on
	// swap or destroy. Textures supplied as pre-loaded CubeTextures are NOT
	// owned by the renderer and will not be disposed.
	let skyboxTex: THREE.CubeTexture | null = null;
	let skyboxOwned = false; // true when we loaded it from URLs (we own disposal)

	function applySkybox(tex: THREE.CubeTexture, owned: boolean): void {
		if (skyboxTex && skyboxOwned) skyboxTex.dispose();
		skyboxTex = tex;
		skyboxOwned = owned;
		scene.background = tex;
	}

	function clearSkybox(): void {
		if (skyboxTex && skyboxOwned) skyboxTex.dispose();
		skyboxTex = null;
		skyboxOwned = false;
		scene.background = fogColor;
	}

	if (options.skybox) {
		const opts = options.skybox;
		if (opts.faces instanceof THREE.CubeTexture) {
			if (opts.rotationY) opts.faces.rotation = opts.rotationY;
			applySkybox(opts.faces, false);
		} else {
			loadSkybox(opts).then((tex) => applySkybox(tex, true)).catch(console.error);
		}
	}

	// ── Camera ────────────────────────────────────────────────────────────────
	// Added to scene so that children (e.g. a PointLight parented to the camera
	// for a player torch) are included in Three.js's scene-graph light collection.
	const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, fogFar * 2);
	scene.add(camera);

	// ── Lighting ──────────────────────────────────────────────────────────────
	scene.add(new THREE.AmbientLight(0xffffff, 1.0));
	const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
	dirLight.position.set(0.5, 1, 0.75);
	scene.add(dirLight);

	// Shared atlas texture — created once, reused across all materials.
	let sharedAtlasTex: THREE.Texture | null = null;
	if (packedAtlas) {
		sharedAtlasTex = new THREE.Texture(packedAtlas.texture as HTMLCanvasElement);
		sharedAtlasTex.magFilter = THREE.NearestFilter;
		sharedAtlasTex.minFilter = THREE.NearestFilter;
		sharedAtlasTex.needsUpdate = true;
	}

	// ── Overlay / surface-painter textures ───────────────────────────────────
	// 1-D float texture mapping tile ID → (uvX, uvY, uvW, uvH). Built from atlas once.
	let tileUvLookupTex: THREE.DataTexture | null = null;
	let tileUvCount = 1;

	if (packedAtlas) {
		let maxId = 0;
		for (const sp of packedAtlas.sprites.values()) if (sp.id > maxId) maxId = sp.id;
		tileUvCount = maxId + 1;
		const uvData = new Float32Array(tileUvCount * 4);
		for (const sp of packedAtlas.sprites.values()) {
			const uv = spriteToUvRect(sp);
			const i = sp.id * 4;
			uvData[i] = uv.x;
			uvData[i + 1] = uv.y;
			uvData[i + 2] = uv.w;
			uvData[i + 3] = uv.h;
		}
		tileUvLookupTex = new THREE.DataTexture(uvData, tileUvCount, 1, THREE.RGBAFormat, THREE.FloatType);
		tileUvLookupTex.magFilter = THREE.NearestFilter;
		tileUvLookupTex.minFilter = THREE.NearestFilter;
		tileUvLookupTex.needsUpdate = true;
	}

	// Per-surface W×H Uint8 RGBA overlay textures. Rebuilt after each generate().
	// Each channel = one overlay slot tile ID (0 = none). Max 4 slots per surface per cell.
	const _defaultOverlayTex = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
	_defaultOverlayTex.magFilter = THREE.NearestFilter;
	_defaultOverlayTex.minFilter = THREE.NearestFilter;
	_defaultOverlayTex.needsUpdate = true;

	type OverlaySurface = { tex: THREE.DataTexture; data: Uint8Array };
	const defSurf: OverlaySurface = { tex: _defaultOverlayTex, data: new Uint8Array(4) };

	let overlayFloor: OverlaySurface = defSurf;
	let overlayWall: OverlaySurface = defSurf;
	let overlayCeil: OverlaySurface = defSurf;
	let overrideCeilSkirt: OverlaySurface = defSurf;
	let overrideFloorSkirt: OverlaySurface = defSurf;
	let overrideSkyPanels: OverlaySurface = defSurf;
	let overrideCeilPanels: OverlaySurface = defSurf;

	function makeOverlayTex(data: Uint8Array, width: number, height: number): THREE.DataTexture {
		const t = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
		t.magFilter = THREE.NearestFilter;
		t.minFilter = THREE.NearestFilter;
		t.flipY = false;
		t.needsUpdate = true;
		return t;
	}

	/** Rebuild all per-surface overlay and base-override textures from the current paintMap. */
	function rebuildOverlayTexture(width: number, height: number): void {
		if (!resolver) return;
		const n = width * height * 4;
		const fd = new Uint8Array(n);
		const wd = new Uint8Array(n);
		const cd = new Uint8Array(n);
		const csd = new Uint8Array(n);
		const fsd = new Uint8Array(n);
		const spd = new Uint8Array(n);
		const cpd = new Uint8Array(n);

		for (const [key, paint] of game.dungeon.paintMap) {
			const comma = key.indexOf(',');
			const x = parseInt(key.slice(0, comma), 10);
			const z = parseInt(key.slice(comma + 1), 10);
			if (x < 0 || z < 0 || x >= width || z >= height) continue;
			const idx = (z * width + x) * 4;
			const write = (arr: Uint8Array, layers: string[] | undefined) => {
				if (!layers) return;
				for (let i = 0; i < Math.min(layers.length, 4); i++)
					arr[idx + i] = resolver!(layers[i]!) & 0xFF;
			};
			const writeNullable = (arr: Uint8Array, layers: (string | null)[] | undefined) => {
				if (!layers) return;
				for (let i = 0; i < Math.min(layers.length, 4); i++) {
					const name = layers[i];
					arr[idx + i] = (name != null) ? (resolver!(name) & 0xFF) : 0;
				}
			};
			write(fd, paint.floor);
			write(wd, paint.wall);
			write(cd, paint.ceil);
			writeNullable(csd, paint.ceilSkirtBase);
			writeNullable(fsd, paint.floorSkirtBase);
			writeNullable(spd, paint.skyPanels);
			writeNullable(cpd, paint.ceilingPanels);
		}

		if (overlayFloor !== defSurf) overlayFloor.tex.dispose();
		if (overlayWall !== defSurf) overlayWall.tex.dispose();
		if (overlayCeil !== defSurf) overlayCeil.tex.dispose();
		if (overrideCeilSkirt !== defSurf) overrideCeilSkirt.tex.dispose();
		if (overrideFloorSkirt !== defSurf) overrideFloorSkirt.tex.dispose();
		if (overrideSkyPanels !== defSurf) overrideSkyPanels.tex.dispose();
		if (overrideCeilPanels !== defSurf) overrideCeilPanels.tex.dispose();

		overlayFloor = { tex: makeOverlayTex(fd, width, height), data: fd };
		overlayWall = { tex: makeOverlayTex(wd, width, height), data: wd };
		overlayCeil = { tex: makeOverlayTex(cd, width, height), data: cd };
		overrideCeilSkirt = { tex: makeOverlayTex(csd, width, height), data: csd };
		overrideFloorSkirt = { tex: makeOverlayTex(fsd, width, height), data: fsd };
		overrideSkyPanels = { tex: makeOverlayTex(spd, width, height), data: spd };
		overrideCeilPanels = { tex: makeOverlayTex(cpd, width, height), data: cpd };
	}

	/** Update one cell in-place across all overlay and base-override textures. */
	function updateOverlayCell(
		x: number, z: number,
		paint: {
			floor?: string[]; wall?: string[]; ceil?: string[];
			ceilSkirtBase?: (string | null)[]; floorSkirtBase?: (string | null)[];
			skyPanels?: (string | null)[]; ceilingPanels?: (string | null)[];
		},
	): void {
		if (!resolver) return;
		const outputs = game.dungeon.outputs;
		if (!outputs || overlayFloor === defSurf) return;
		const { width, height } = outputs;
		if (x < 0 || z < 0 || x >= width || z >= height) return;
		const idx = (z * width + x) * 4;
		const write = (surf: OverlaySurface, layers: string[] | undefined) => {
			if (layers === undefined) return;
			surf.data[idx] = surf.data[idx + 1] = surf.data[idx + 2] = surf.data[idx + 3] = 0;
			for (let i = 0; i < Math.min(layers.length, 4); i++)
				surf.data[idx + i] = resolver!(layers[i]!) & 0xFF;
			surf.tex.needsUpdate = true;
		};
		const writeNullable = (surf: OverlaySurface, layers: (string | null)[] | undefined) => {
			if (layers === undefined) return;
			surf.data[idx] = surf.data[idx + 1] = surf.data[idx + 2] = surf.data[idx + 3] = 0;
			for (let i = 0; i < Math.min(layers.length, 4); i++) {
				const name = layers[i];
				surf.data[idx + i] = (name != null) ? (resolver!(name) & 0xFF) : 0;
			}
			surf.tex.needsUpdate = true;
		};
		write(overlayFloor, paint.floor);
		write(overlayWall, paint.wall);
		write(overlayCeil, paint.ceil);
		writeNullable(overrideCeilSkirt, paint.ceilSkirtBase);
		writeNullable(overrideFloorSkirt, paint.floorSkirtBase);
		writeNullable(overrideSkyPanels, paint.skyPanels);
		writeNullable(overrideCeilPanels, paint.ceilingPanels);
	}

	function setSkirtLookupUniform(mat: THREE.Material, tex: THREE.DataTexture): void {
		if (!(mat instanceof THREE.ShaderMaterial)) return;
		const u = mat.uniforms;
		if (u['uSkirtLookup']) u['uSkirtLookup'].value = tex;
	}

	function syncSkirtLookupUniforms(): void {
		const outputs = game.dungeon.outputs;
		if (!outputs) return;
		setSkirtLookupUniform(floorEdgeMat, outputs.textures.floorSkirtType);
		setSkirtLookupUniform(ceilEdgeMat, outputs.textures.ceilSkirtType);
		setSkirtLookupUniform(floorWallSkirtMat, outputs.textures.floorSkirtType);
		setSkirtLookupUniform(ceilWallSkirtMat, outputs.textures.ceilSkirtType);
	}

	function syncBaseOverrideUniforms(): void {
		function set(mat: THREE.Material, tex: THREE.DataTexture) {
			if (!(mat instanceof THREE.ShaderMaterial)) return;
			const u = mat.uniforms;
			if (u['uBaseOverride']) u['uBaseOverride'].value = tex;
		}
		set(ceilEdgeMat, overrideCeilSkirt.tex);
		set(ceilWallSkirtMat, overrideCeilSkirt.tex);
		set(floorEdgeMat, overrideFloorSkirt.tex);
		set(floorWallSkirtMat, overrideFloorSkirt.tex);
		set(skyPanelMat, overrideSkyPanels.tex);
		set(ceilingPanelMat, overrideCeilPanels.tex);
	}

	/** Push per-surface overlay textures into their respective atlas materials. */
	function syncOverlayUniforms(width: number, height: number): void {
		const size = new THREE.Vector2(width, height);
		const set = (mat: THREE.Material, overlayTex: THREE.DataTexture) => {
			if (!(mat instanceof THREE.ShaderMaterial)) return;
			const u = mat.uniforms;
			if (u['uOverlayLookup']) u['uOverlayLookup'].value = overlayTex;
			if (u['uTileUvLookup']) u['uTileUvLookup'].value = tileUvLookupTex;
			if (u['uTileUvCount']) u['uTileUvCount'].value = tileUvCount;
			if (u['uDungeonSize']) u['uDungeonSize'].value = size;
		};
		set(floorMat, overlayFloor.tex);
		set(floorEdgeMat, overlayFloor.tex);
		set(wallMat, overlayWall.tex);
		set(ceilMat, overlayCeil.tex);
		set(ceilEdgeMat, overlayCeil.tex);
		set(floorWallSkirtMat, overlayWall.tex);
		set(ceilWallSkirtMat, overlayWall.tex);
		set(skyPanelMat, overlayWall.tex);
		set(ceilingPanelMat, overlayWall.tex);
	}

	function makeAtlasMaterial(surfaceLight = 1.0, skyLightColor?: THREE.Color, skyFromLookup = false): THREE.ShaderMaterial {
		const canvas = packedAtlas!.texture as HTMLCanvasElement;
		const mat = new THREE.ShaderMaterial({
			vertexShader: BASIC_ATLAS_VERT,
			fragmentShader: BASIC_ATLAS_FRAG,
			lights: true,
			uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib.lights,
				makeBasicAtlasUniforms({
					atlas: sharedAtlasTex!,
					texelSize: new THREE.Vector2(1 / canvas.width, 1 / canvas.height),
					fogColor,
					fogNear,
					fogFar,
					...(tileUvLookupTex ? { tileUvLookup: tileUvLookupTex, tileUvCount } : {}),
					overlayLookup: overlayFloor.tex,
					dungeonSize: new THREE.Vector2(1, 1),
					aoIntensity,
					surfaceLight,
					wallLightMin,
					wallLightMax,
					...(skyLightColor ? { skyLightColor } : {}),
					skyFromLookup,
				}),
			]),
			side: THREE.FrontSide,
		});
		atlasMaterials.push(mat);
		return mat;
	}

	function makeAtlasMaterialDoubleSide(surfaceLight = 1.0): THREE.ShaderMaterial {
		const mat = makeAtlasMaterial(surfaceLight);
		mat.side = THREE.DoubleSide;
		return mat;
	}

	// ── Plain (fallback) materials ────────────────────────────────────────────
	// Floor and floor-adjacent skirt/edge materials use skyFromLookup=true so
	// the sky tint is applied only to cells whose ceilingHeightOffset is 0
	// (open-sky sentinel). The uCeilHeightLookup uniform is patched in
	// buildDungeon() once the dungeon data is available.
	const floorMat = packedAtlas
		? makeAtlasMaterial(floorLight, skyPanelLightColor, true)
		: new THREE.MeshStandardMaterial({ color: 0x555566 });
	const ceilMat = packedAtlas
		? makeAtlasMaterial(ceilLight)
		: new THREE.MeshStandardMaterial({ color: 0x222233 });
	const wallMat = packedAtlas
		? makeAtlasMaterial(-1.0)
		: new THREE.MeshStandardMaterial({ color: 0x6b6070 });
	const floorEdgeMat = packedAtlas
		? makeAtlasMaterial(-1.0, skyPanelLightColor, true)
		: new THREE.MeshStandardMaterial({ color: 0x555566 });
	const ceilEdgeMat = packedAtlas
		? makeAtlasMaterialDoubleSide(-1.0)
		: new THREE.MeshStandardMaterial({
			color: 0x222233,
			side: THREE.DoubleSide,
		});
	const floorWallSkirtMat = packedAtlas
		? makeAtlasMaterial(-1.0, skyPanelLightColor, true)
		: new THREE.MeshStandardMaterial({ color: 0x6b6070 });
	const ceilWallSkirtMat = packedAtlas
		? makeAtlasMaterial(-1.0)
		: new THREE.MeshStandardMaterial({ color: 0x6b6070 });
	const skyPanelMat = packedAtlas
		? makeAtlasMaterial(skyPanelBrightness, skyPanelLightColor)
		: new THREE.MeshStandardMaterial({ color: 0x6b6070 });
	const ceilingPanelMat = packedAtlas
		? makeAtlasMaterial(-1.0)
		: new THREE.MeshStandardMaterial({ color: 0x6b6070 });

	// ── Dungeon geometry ──────────────────────────────────────────────────────
	let floorMesh: THREE.InstancedMesh | null = null;
	let ceilMesh: THREE.InstancedMesh | null = null;
	let wallMesh: THREE.InstancedMesh | null = null;
	let floorEdgeMesh: THREE.InstancedMesh | null = null;
	let ceilEdgeMesh: THREE.InstancedMesh | null = null;
	let floorWallSkirtMesh: THREE.InstancedMesh | null = null;
	let ceilWallSkirtMesh: THREE.InstancedMesh | null = null;
	let skyPanelMesh: THREE.InstancedMesh | null = null;
	let ceilingPanelMesh: THREE.InstancedMesh | null = null;
	let dungeonBuilt = false;

	// Parallel cell-index arrays: entry i gives the grid cell for instance i.
	// Rebuilt whenever buildDungeon runs.
	type CellRef = { cx: number; cz: number };
	let floorCellMap: CellRef[] = [];
	let ceilCellMap: CellRef[] = [];
	let wallCellMap: CellRef[] = [];
	let floorEdgeCellMap: CellRef[] = [];
	let ceilEdgeCellMap: CellRef[] = [];
	let floorWallSkirtCellMap: CellRef[] = [];
	let ceilWallSkirtCellMap: CellRef[] = [];
	let skyPanelCellMap: CellRef[] = [];
	let ceilingPanelCellMap: CellRef[] = [];
	// Fast lookup: InstancedMesh → its cell array.
	const meshToCellMap = new Map<THREE.InstancedMesh, CellRef[]>();

	// ── Managed lights ────────────────────────────────────────────────────────
	const managedLights = new Set<THREE.Light>();

	// ── Layer state ───────────────────────────────────────────────────────────
	type LayerEntry = {
		spec: LayerSpec;
		holder: { mesh: THREE.InstancedMesh | null };
	};
	const layerEntries: LayerEntry[] = [];

	/** Build an instanced mesh for a single LayerSpec by scanning the dungeon map. */
	function buildLayerMesh(spec: LayerSpec): THREE.InstancedMesh | null {
		const outputs = game.dungeon.outputs;
		if (!outputs) return null;

		const { width, height } = outputs;
		const solid = outputs.textures.solid.image.data as Uint8Array;
		const floorOffData = outputs.textures.floorHeightOffset?.image.data as
			| Uint8Array
			| undefined;
		const ceilOffData = outputs.textures.ceilingHeightOffset?.image.data as
			| Uint8Array
			| undefined;
		const wallMidY = ceilingH / 2;

		const matrices: THREE.Matrix4[] = [];
		const uvRects: UvRect[] = [];
		const rotations: number[] = [];
		const offsets: number[] = [];
		const heightScales: number[] = [];
		const cellXs: number[] = [];
		const cellZs: number[] = [];
		const aoCornerArr: number[] = [];
		const faceNormals: number[] = [];

		const filter = spec.filter ?? (() => ({ tile: 0 }));

		function isSolid(cx: number, cz: number) {
			if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
			return (solid[cz * width + cx] ?? 0) > 0;
		}
		function openFloorVal(ncx: number, ncz: number): number | null {
			if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
			if (isSolid(ncx, ncz)) return null;
			return floorOffData ? (floorOffData[ncz * width + ncx] ?? 128) : 128;
		}
		function openCeilVal(ncx: number, ncz: number): number | null {
			if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
			if (isSolid(ncx, ncz)) return null;
			return ceilOffData ? (ceilOffData[ncz * width + ncx] ?? 128) : 128;
		}

		function tryAdd(
			result: LayerFaceResult,
			matrix: THREE.Matrix4,
			offset = 0,
			hs = 1.0,
			faceCx = 0,
			faceCz = 0,
			aoDir?: "floor" | "ceil" | "north" | "south" | "east" | "west",
			normalX = 0,
			normalZ = 0,
		) {
			if (!result) return;
			matrices.push(matrix);
			const id = result.tile !== undefined ? resolveTile(result.tile, resolver) : 0;
			uvRects.push(getUvRect(id));
			rotations.push(result.rotation ?? 0);
			//offsets.push(offset);	// NO, mod the geometry instead so raycasting works
			heightScales.push(hs);
			cellXs.push(faceCx);
			cellZs.push(faceCz);
			if (aoEnabled && aoDir) {
				const v = computeFaceAO(isSolid, faceCx, faceCz, aoDir);
				aoCornerArr.push(v[0], v[1], v[2], v[3]);
			} else {
				aoCornerArr.push(1, 1, 1, 1);
			}
			faceNormals.push(normalX, normalZ);
		}

		for (let cz = 0; cz < height; cz++) {
			for (let cx = 0; cx < width; cx++) {
				if (isSolid(cx, cz)) continue;

				const idx = cz * width + cx;
				const wx = (cx + 0.5) * tileSize;
				const wz = (cz + 0.5) * tileSize;
				const floorVal = floorOffData ? (floorOffData[idx] ?? 128) : 128;
				const ceilVal = ceilOffData ? (ceilOffData[idx] ?? 128) : 128;

				if (spec.target === "floor" && floorVal !== 0) {
					tryAdd(
						filter(cx, cz, undefined),
						makeFaceMatrix(wx, (floorVal - 128) * offsetStep, wz, -HALF_PI, 0, 0, tileSize, tileSize),
						undefined,
						1.0, cx, cz, "floor",
					);
				}

				if (spec.target === "ceil" && ceilVal !== 0) {
					tryAdd(
						filter(cx, cz, undefined),
						makeFaceMatrix(wx, -(ceilVal - 128) * offsetStep + ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize),
						undefined,
						1.0, cx, cz, "ceil",
					);
				}

				if (spec.target === "wall") {
					if (isSolid(cx, cz - 1))
						tryAdd(
							filter(cx, cz, "north"),
							makeFaceMatrix(wx, wallMidY, cz * tileSize, 0, 0, 0, tileSize, ceilingH,),
							0, 1.0, cx, cz, "north", 0, 1,
						);
					if (isSolid(cx, cz + 1))
						tryAdd(
							filter(cx, cz, "south"),
							makeFaceMatrix(
								wx,
								wallMidY,
								(cz + 1) * tileSize,
								0,
								Math.PI,
								0,
								tileSize,
								ceilingH,
							),
							0, 1.0, cx, cz, "south", 0, -1,
						);
					if (isSolid(cx - 1, cz))
						tryAdd(
							filter(cx, cz, "west"),
							makeFaceMatrix(
								cx * tileSize,
								wallMidY,
								wz,
								0,
								HALF_PI,
								0,
								tileSize,
								ceilingH,
							),
							0, 1.0, cx, cz, "west", 1, 0,
						);
					if (isSolid(cx + 1, cz))
						tryAdd(
							filter(cx, cz, "east"),
							makeFaceMatrix(
								(cx + 1) * tileSize,
								wallMidY,
								wz,
								0,
								-HALF_PI,
								0,
								tileSize,
								ceilingH,
							),
							0, 1.0, cx, cz, "east", -1, 0,
						);
				}

				if (spec.target === "floorSkirt" && floorVal !== 0) {
					const currentFloorY = (floorVal - 128) * offsetStep;
					function tryAddFloorSkirtTiled(
						nfVal: number,
						mx: number,
						mz: number,
						ry: number,
						dir: "north" | "south" | "east" | "west",
					) {
						const result = filter(cx, cz, dir);
						if (!result) return;
						const neighborFloorY = (nfVal - 128) * offsetStep;
						const stepH = currentFloorY - neighborFloorY;
						const fullPanels = Math.floor(stepH / tileSize);
						const rem = stepH - fullPanels * tileSize;
						for (let i = 0; i < fullPanels; i++) {
							const midY = neighborFloorY + i * tileSize + tileSize / 2;
							tryAdd(result, makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize), 0, 1.0, cx, cz);
						}
						if (rem > 0.001) {
							const midY = neighborFloorY + fullPanels * tileSize + rem / 2;
							tryAdd(result, makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem), 0, rem / tileSize, cx, cz);
						}
					}
					const nfN = openFloorVal(cx, cz - 1);
					if (nfN !== null && nfN < floorVal) tryAddFloorSkirtTiled(nfN, wx, cz * tileSize, Math.PI, "north");
					const nfS = openFloorVal(cx, cz + 1);
					if (nfS !== null && nfS < floorVal) tryAddFloorSkirtTiled(nfS, wx, (cz + 1) * tileSize, 0, "south");
					const nfW = openFloorVal(cx - 1, cz);
					if (nfW !== null && nfW < floorVal) tryAddFloorSkirtTiled(nfW, cx * tileSize, wz, -HALF_PI, "west");
					const nfE = openFloorVal(cx + 1, cz);
					if (nfE !== null && nfE < floorVal) tryAddFloorSkirtTiled(nfE, (cx + 1) * tileSize, wz, HALF_PI, "east");
				}

				if (spec.target === "ceilSkirt") {
					const yCurrent = ceilingH - (ceilVal - 128) * offsetStep;
					const addCS = (
						ncVal: number | null,
						mx: number,
						mz: number,
						ry: number,
						dir: "north" | "south" | "east" | "west",
					) => {
						if (ncVal === null || ncVal === 0 || ncVal <= ceilVal) return;
						const h = (ncVal - ceilVal) * offsetStep;
						const result = filter(cx, cz, dir);
						if (!result) return;
						const fullPanels = Math.floor(h / tileSize);
						const rem = h - fullPanels * tileSize;
						for (let i = 0; i < fullPanels; i++) {
							const midY = yCurrent - i * tileSize - tileSize / 2;
							tryAdd(result, makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize), 0, 1.0, cx, cz);
						}
						if (rem > 0.001) {
							const midY = yCurrent - fullPanels * tileSize - rem / 2;
							tryAdd(result, makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem), 0, rem / tileSize, cx, cz);
						}
					};
					addCS(openCeilVal(cx, cz - 1), wx, cz * tileSize, Math.PI, "north");
					addCS(openCeilVal(cx, cz + 1), wx, (cz + 1) * tileSize, 0, "south");
					addCS(openCeilVal(cx - 1, cz), cx * tileSize, wz, -HALF_PI, "west");
					addCS(openCeilVal(cx + 1, cz), (cx + 1) * tileSize, wz, HALF_PI, "east");
					// addCS already guards ncVal <= ceilVal; additionally skip open-sky neighbours
					// (they render their own rim — see buildDungeon)
				}
			}
		}

		if (matrices.length === 0) return null;

		const useAtlas = spec.useAtlas ?? !!packedAtlas;
		const mesh = buildInstancedMesh(
			matrices,
			uvRects,
			spec.material,
			useAtlas,
			undefined/*new Float32Array(offsets)*/,
			rotations,
			(spec.target === "ceilSkirt" || spec.target === "floorSkirt") ? heightScales : undefined,
			new Float32Array(cellXs),
			new Float32Array(cellZs),
			aoCornerArr.length ? new Float32Array(aoCornerArr) : undefined,
			faceNormals.length ? new Float32Array(faceNormals) : undefined,
		);

		if (spec.polygonOffset !== false) {
			spec.material.polygonOffset = true;
			spec.material.polygonOffsetFactor = -1;
			spec.material.polygonOffsetUnits = -1;
		}

		// Ensure the layer material uses the correct directional surface lighting
		// mode for its target surface. createAtlasMaterial() defaults to
		// surfaceLight=1.0 (flat, no directional effect), which is wrong for wall
		// and skirt layers — those need surfaceLight<0 to activate the camera-angle
		// formula that keeps brightness consistent with the base wall geometry.
		const sm = spec.material as THREE.ShaderMaterial;
		if (sm.uniforms?.['uSurfaceLight']) {
			const isWallLike = spec.target === 'wall' || spec.target === 'floorSkirt' || spec.target === 'ceilSkirt';
			if (isWallLike) {
				(sm.uniforms['uSurfaceLight'] as { value: number }).value = -1.0;
			} else if (spec.target === 'floor') {
				(sm.uniforms['uSurfaceLight'] as { value: number }).value = floorLight;
			} else if (spec.target === 'ceil') {
				(sm.uniforms['uSurfaceLight'] as { value: number }).value = ceilLight;
			}
		}

		mesh.renderOrder = 1;
		return mesh;
	}

	function buildDungeon() {
		if (dungeonBuilt) return;
		const outputs = game.dungeon.outputs;
		if (!outputs) return;
		dungeonBuilt = true;

		// Push the ceilingHeightOffset texture into floor/skirt materials so the
		// shader can gate sky tinting to open-sky cells only (raw byte 0 = sentinel).
		const ceilHeightTex = outputs.textures.ceilingHeightOffset;
		if (ceilHeightTex) {
			for (const mat of [floorMat, floorEdgeMat, floorWallSkirtMat]) {
				if (mat instanceof THREE.ShaderMaterial)
					(mat.uniforms["uCeilHeightLookup"] as { value: THREE.Texture }).value = ceilHeightTex;
			}
		}

		const { width, height } = outputs;
		const solid = outputs.textures.solid.image.data as Uint8Array;
		const wallMidY = ceilingH / 2;

		// Height offset texture data (value 128 = no offset; 0 = pit for floor).
		const floorOffData = outputs.textures.floorHeightOffset?.image.data as
			| Uint8Array
			| undefined;
		const ceilOffData = outputs.textures.ceilingHeightOffset?.image.data as
			| Uint8Array
			| undefined;
		const skyPanelCountData = outputs.textures.skyPanelCount?.image.data as Uint8Array | undefined;
		const ceilingPanelCountData = outputs.textures.ceilingPanelCount?.image.data as Uint8Array | undefined;

		// Helper: resolve a FaceTileSpec from a DirectionFaceMap for a given direction,
		// falling back to a plain tile ID with no rotation.
		function spec(
			map: DirectionFaceMap | undefined,
			dir: "north" | "south" | "east" | "west",
			fallbackId: number,
		): FaceTileSpec {
			return map?.[dir] ?? { tile: fallbackId, rotation: 0 };
		}

		floorCellMap = [];
		ceilCellMap = [];
		wallCellMap = [];
		floorEdgeCellMap = [];
		ceilEdgeCellMap = [];
		floorWallSkirtCellMap = [];
		ceilWallSkirtCellMap = [];
		skyPanelCellMap = [];
		ceilingPanelCellMap = [];

		const floors: THREE.Matrix4[] = [];
		const ceils: THREE.Matrix4[] = [];
		const walls: THREE.Matrix4[] = [];
		const floorEdges: THREE.Matrix4[] = [];
		const ceilEdges: THREE.Matrix4[] = [];
		const floorRects: UvRect[] = [];
		const ceilRects: UvRect[] = [];
		const wallRects: UvRect[] = [];
		const floorEdgeRects: UvRect[] = [];
		const ceilEdgeRects: UvRect[] = [];
		//const floorOffsets: number[] = [];
		//const ceilOffsets: number[] = [];
		// AO corner data packed as [tl, tr, bl, br] per face (4 floats per entry).
		const floorsAo: number[] = [];
		const ceilsAo: number[] = [];
		const wallsAo: number[] = [];
		const floorEdgesAo: number[] = [];
		const ceilEdgesAo: number[] = [];
		// XZ outward normals per wall instance: [nx, nz] pairs.
		const wallNormals: number[] = [];
		const wallRots: number[] = [];
		const floorEdgeRots: number[] = [];
		const ceilEdgeRots: number[] = [];
		const floorEdgeHeightScales: number[] = [];
		const ceilEdgeHeightScales: number[] = [];
		const floorWallSkirtEdges: THREE.Matrix4[] = [];
		const floorWallSkirtRects: UvRect[] = [];
		const floorWallSkirtRots: number[] = [];
		const floorWallSkirtHeightScales: number[] = [];
		const floorWallSkirtUvOffsets: number[] = [];
		const floorWallSkirtRowIndexes: number[] = [];
		const floorWallSkirtAo: number[] = [];
		const ceilWallSkirtEdges: THREE.Matrix4[] = [];
		const ceilWallSkirtRects: UvRect[] = [];
		const ceilWallSkirtRots: number[] = [];
		const ceilWallSkirtHeightScales: number[] = [];
		const ceilWallSkirtAo: number[] = [];
		const ceilWallSkirtRowIndexes: number[] = [];
		const skyPanelEdges: THREE.Matrix4[] = [];
		const skyPanelRects: UvRect[] = [];
		const skyPanelRots: number[] = [];
		const skyPanelHeightScales: number[] = [];
		const skyPanelRowIndexes: number[] = [];
		const ceilPanelEdges: THREE.Matrix4[] = [];
		const ceilPanelRects: UvRect[] = [];
		const ceilPanelRots: number[] = [];
		const ceilPanelHeightScales: number[] = [];
		const ceilPanelRowIndexes: number[] = [];

		function isSolid(cx: number, cz: number) {
			if (cx < 0 || cz < 0 || cx >= width || cz >= height) return true;
			return (solid[cz * width + cx] ?? 0) > 0;
		}

		// Returns the raw offset value for an open cell, or null if solid/out-of-bounds.
		function openFloorVal(ncx: number, ncz: number): number | null {
			if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
			if (isSolid(ncx, ncz)) return null;
			const nidx = ncz * width + ncx;
			return floorOffData ? (floorOffData[nidx] ?? 128) : 128;
		}
		function openCeilVal(ncx: number, ncz: number): number | null {
			if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return null;
			if (isSolid(ncx, ncz)) return null;
			const nidx = ncz * width + ncx;
			return ceilOffData ? (ceilOffData[nidx] ?? 128) : 128;
		}
		function isOpenSkyCeil(ncx: number, ncz: number): boolean {
			if (ncx < 0 || ncz < 0 || ncx >= width || ncz >= height) return false;
			if (isSolid(ncx, ncz)) return false;
			return ceilOffData ? (ceilOffData[ncz * width + ncx] === 0) : false;
		}
		const openSkyLighting = Math.max(0, Math.min(1, options.openSkyLighting ?? 0));

		for (let cz = 0; cz < height; cz++) {
			for (let cx = 0; cx < width; cx++) {
				if (isSolid(cx, cz)) continue;	// the dungeon is inside-out - empty cells emit walls!?

				const idx = cz * width + cx;
				const wx = (cx + 0.5) * tileSize;
				const wz = (cz + 0.5) * tileSize;

				// Read both offset values first so isOpenSky is available to the floor AO pass.
				const floorVal = floorOffData ? (floorOffData[idx] ?? 128) : 128;
				const ceilVal = ceilOffData ? (ceilOffData[idx] ?? 128) : 128;
				const fvo = (floorVal - 128) * offsetStep;
				const cvo = -(ceilVal - 128) * offsetStep;
				// ceilVal === 0: open sky — ceiling tile omitted, thin rim skirt rendered instead.
				const isOpenSky = ceilVal === 0;

				// Floor — skip tile if floorHeightOffset === 0 (pit marker).
				if (floorVal !== 0) {
					floors.push(
						makeFaceMatrix(wx, fvo, wz, -HALF_PI, 0, 0, tileSize, tileSize),
					);
					floorRects.push(getUvRect(floorId));
					//floorOffsets.push(0);//fvo);	we don't need this. why did it exist? we can send fvo with the mesh and then it works with raycasting correctly???
					floorCellMap.push({ cx, cz });
					if (aoEnabled) {
						const v = computeFaceAO(isSolid, cx, cz, "floor");
						if (openSkyLighting > 0) {
							const adj = !isOpenSky && (
								isOpenSkyCeil(cx, cz - 1) || isOpenSkyCeil(cx, cz + 1) ||
								isOpenSkyCeil(cx - 1, cz) || isOpenSkyCeil(cx + 1, cz)
							);
							const boost = isOpenSky ? openSkyLighting : adj ? openSkyLighting * 0.5 : 0;
							if (boost > 0) {
								v[0] += (1 - v[0]) * boost; v[1] += (1 - v[1]) * boost;
								v[2] += (1 - v[2]) * boost; v[3] += (1 - v[3]) * boost;
							}
						}
						floorsAo.push(v[0], v[1], v[2], v[3]);
					}
				}

				// Ceiling — inverted: value < 128 raises ceiling, > 128 lowers it.
				// value === 0 = open sky: face omitted entirely.
				if (!isOpenSky) {
					ceils.push(
						makeFaceMatrix(wx, cvo + ceilingH, wz, HALF_PI, 0, 0, tileSize, tileSize),
					);
					ceilRects.push(getUvRect(ceilId));
					//ceilOffsets.push(cvo); not needed. push cvo thru with the mesh instead so raycasting works
					ceilCellMap.push({ cx, cz });
					if (aoEnabled) { const v = computeFaceAO(isSolid, cx, cz, "ceil"); ceilsAo.push(v[0], v[1], v[2], v[3]); }
				}

				// Walls — north/south/west/east with per-direction tile + rotation.
				if (isSolid(cx, cz - 1)) {
					// if a neighbor wall is lower, align with it so tiling works. otherwise prefer the current cell floor height
					const nfloorVal = floorOffData ? (floorOffData[idx - width] ?? 128) : 128;
					const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);

					const s = spec(wallTiles, "north", wallId);
					walls.push(
						makeFaceMatrix(
							wx,
							nfvo + wallMidY,
							cz * tileSize,
							0,
							0,
							0,
							tileSize,
							ceilingH,
						),
					);
					wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
					wallRots.push(s.rotation ?? 0);
					wallNormals.push(0, 1);   // north wall faces south (+Z)
					wallCellMap.push({ cx, cz });
					if (aoEnabled) { const v = computeFaceAO(isSolid, cx, cz, "north"); wallsAo.push(v[0], v[1], v[2], v[3]); }
				}
				if (isSolid(cx, cz + 1)) {
					const nfloorVal = floorOffData ? (floorOffData[idx + width] ?? 128) : 128;
					const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);

					const s = spec(wallTiles, "south", wallId);
					walls.push(
						makeFaceMatrix(
							wx,
							nfvo + wallMidY,
							(cz + 1) * tileSize,
							0,
							Math.PI,
							0,
							tileSize,
							ceilingH,
						),
					);
					wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
					wallRots.push(s.rotation ?? 0);
					wallNormals.push(0, -1);  // south wall faces north (-Z)
					wallCellMap.push({ cx, cz });
					if (aoEnabled) { const v = computeFaceAO(isSolid, cx, cz, "south"); wallsAo.push(v[0], v[1], v[2], v[3]); }
				}
				if (isSolid(cx - 1, cz)) {
					const nfloorVal = floorOffData ? (floorOffData[idx - 1] ?? 128) : 128;
					const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);

					const s = spec(wallTiles, "west", wallId);
					walls.push(
						makeFaceMatrix(
							cx * tileSize,
							nfvo + wallMidY,
							wz,
							0,
							HALF_PI,
							0,
							tileSize,
							ceilingH,
						),
					);
					wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
					wallRots.push(s.rotation ?? 0);
					wallNormals.push(1, 0);   // west wall faces east (+X)
					wallCellMap.push({ cx, cz });
					if (aoEnabled) { const v = computeFaceAO(isSolid, cx, cz, "west"); wallsAo.push(v[0], v[1], v[2], v[3]); }
				}
				if (isSolid(cx + 1, cz)) {
					const nfloorVal = floorOffData ? (floorOffData[idx + 1] ?? 128) : 128;
					const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);

					const s = spec(wallTiles, "east", wallId);
					walls.push(
						makeFaceMatrix(
							(cx + 1) * tileSize,
							nfvo + wallMidY,
							wz,
							0,
							-HALF_PI,
							0,
							tileSize,
							ceilingH,
						),
					);
					wallRects.push(getUvRect(resolveTile(s.tile, resolver)));
					wallRots.push(s.rotation ?? 0);
					wallNormals.push(-1, 0);  // east wall faces west (-X)
					wallCellMap.push({ cx, cz });
					if (aoEnabled) { const v = computeFaceAO(isSolid, cx, cz, "east"); wallsAo.push(v[0], v[1], v[2], v[3]); }
				}

				// Voxel-style floor edge skirts: tiled panels covering the full step height.
				// Only emit when the open neighbour has a lower floor level.
				if (floorVal !== 0) {
					const currentFloorY = fvo;
					function addFloorSkirt(
						nfVal: number,
						mx: number,
						mz: number,
						ry: number,
						dir: "north" | "south" | "east" | "west",
					) {
						const s = spec(floorSkirtTiles, dir, floorId);
						const neighborFloorY = (nfVal - 128) * offsetStep;
						const stepH = currentFloorY - neighborFloorY;
						const fullPanels = Math.floor(stepH / tileSize);
						const rem = stepH - fullPanels * tileSize;
						const isBlockingFloor = (nx: number, nz: number) =>
							isSolid(nx, nz) || (openFloorVal(nx, nz) ?? 128) > nfVal;
						const ao = aoEnabled ? computeSkirtFaceAO(isBlockingFloor, cx, cz, dir) : null;
						for (let i = 0; i < fullPanels; i++) {
							const midY = neighborFloorY + i * tileSize + tileSize / 2;
							floorEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
							floorEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
							floorEdgeRots.push(s.rotation ?? 0);
							floorEdgeHeightScales.push(1.0);
							floorEdgeCellMap.push({ cx, cz });
							if (ao) floorEdgesAo.push(ao[0], ao[1], ao[2], ao[3]);
						}
						if (rem > 0.001) {
							const midY = neighborFloorY + fullPanels * tileSize + rem / 2;
							floorEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
							floorEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
							floorEdgeRots.push(s.rotation ?? 0);
							floorEdgeHeightScales.push(rem / tileSize);
							floorEdgeCellMap.push({ cx, cz });
							if (ao) floorEdgesAo.push(ao[0], ao[1], ao[2], ao[3]);
						}
					}
					const nfN = openFloorVal(cx, cz - 1);
					if (nfN !== null && nfN < floorVal) addFloorSkirt(nfN, wx, cz * tileSize, Math.PI, "north");
					const nfS = openFloorVal(cx, cz + 1);
					if (nfS !== null && nfS < floorVal) addFloorSkirt(nfS, wx, (cz + 1) * tileSize, 0, "south");
					const nfW = openFloorVal(cx - 1, cz);
					if (nfW !== null && nfW < floorVal) addFloorSkirt(nfW, cx * tileSize, wz, -HALF_PI, "west");
					const nfE = openFloorVal(cx + 1, cz);
					if (nfE !== null && nfE < floorVal) addFloorSkirt(nfE, (cx + 1) * tileSize, wz, HALF_PI, "east");
				}

				// Wall-adjacent floor skirts: when floor is sunken below y=0 and the
				// neighbour is solid, fill the gap between y=0 and the sunken floor
				// using the wall tile repeated downward.	
				// rewritten to handle sunken tiles with any height or adjacency
				if (floorVal !== 0) {
					function addWallFloorSkirt(
						mx: number,
						mz: number,
						ry: number,
						dir: "north" | "south" | "east" | "west",
						gapH: number,
						floor: number,
					) {
						if (gapH <= 0.001) return;
						const s = spec(wallTiles, dir, wallId);
						const fullPanels = Math.floor(gapH / tileSize);
						const rem = gapH - fullPanels * tileSize;
						const ao = aoEnabled ? computeFaceAO(isSolid, cx, cz, dir) : null;
						for (let i = 0; i < fullPanels; i++) {
							const midY = (i * tileSize + tileSize / 2);
							floorWallSkirtEdges.push(makeFaceMatrix(mx, floor + tileSize + midY, mz, 0, ry, 0, tileSize, tileSize));
							floorWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
							floorWallSkirtRots.push(s.rotation ?? 0);
							floorWallSkirtHeightScales.push(1.0);
							floorWallSkirtUvOffsets.push(0);
							floorWallSkirtRowIndexes.push(i);
							floorWallSkirtCellMap.push({ cx, cz });
							if (ao) floorWallSkirtAo.push(ao[0], ao[1], ao[2], ao[3]);
						}
						if (rem > 0.001) {
							const midY = (fullPanels * tileSize + rem / 2);
							floorWallSkirtEdges.push(makeFaceMatrix(mx, floor + tileSize + midY, mz, 0, ry, 0, tileSize, rem));
							floorWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
							floorWallSkirtRots.push(s.rotation ?? 0);
							const scale = rem / tileSize;
							floorWallSkirtHeightScales.push(scale);	// was rem / tileSize);
							floorWallSkirtUvOffsets.push(0);	//1.0 - scale);
							floorWallSkirtRowIndexes.push(fullPanels);
							floorWallSkirtCellMap.push({ cx, cz });
							if (ao) floorWallSkirtAo.push(ao[0], ao[1], ao[2], ao[3]);
						}
					}
					if (isSolid(cx, cz - 1)) {
						// either my ceiling, OR neighbor ceiling OR neighbor floor
						const nfloorVal = floorOffData ? (floorOffData[idx - width] ?? 128) : 128;
						const nceilVal = ceilOffData ? (ceilOffData[idx - width] ?? 128) : 128;
						const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);
						const ncvo = (isOpenSky) ? ((nceilVal) ? -(nceilVal - 128) * offsetStep : nfvo - tileSize) : cvo;
						addWallFloorSkirt(wx, cz * tileSize, 0, "north", ncvo - nfvo, nfvo);
					}
					if (isSolid(cx, cz + 1)) {
						const nfloorVal = floorOffData ? (floorOffData[idx + width] ?? 128) : 128;
						const nceilVal = ceilOffData ? (ceilOffData[idx + width] ?? 128) : 128;
						const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);
						const ncvo = (isOpenSky) ? ((nceilVal) ? -(nceilVal - 128) * offsetStep : nfvo - tileSize) : cvo;
						addWallFloorSkirt(wx, (cz + 1) * tileSize, Math.PI, "south", ncvo - nfvo, nfvo);
					}
					if (isSolid(cx - 1, cz)) {
						const nfloorVal = floorOffData ? (floorOffData[idx - 1] ?? 128) : 128;
						const nceilVal = ceilOffData ? (ceilOffData[idx - 1] ?? 128) : 128;
						const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);
						const ncvo = (isOpenSky) ? ((nceilVal) ? -(nceilVal - 128) * offsetStep : nfvo - tileSize) : cvo;
						addWallFloorSkirt(cx * tileSize, wz, HALF_PI, "west", ncvo - nfvo, nfvo);
					}
					if (isSolid(cx + 1, cz)) {
						const nfloorVal = floorOffData ? (floorOffData[idx + 1] ?? 128) : 128;
						const nceilVal = ceilOffData ? (ceilOffData[idx + 1] ?? 128) : 128;
						const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);
						const ncvo = (isOpenSky) ? ((nceilVal) ? -(nceilVal - 128) * offsetStep : nfvo - tileSize) : cvo;
						addWallFloorSkirt((cx + 1) * tileSize, wz, -HALF_PI, "east", ncvo - nfvo, nfvo);
					}
				}

				// Ceiling skirts and wall-adjacent gap fillers — skipped entirely for open-sky cells.
				if (!isOpenSky) {
					// Normal ceiling: voxel-style step panels toward lower-ceilinged neighbours.
					const yCurrent = ceilingH - (ceilVal - 128) * offsetStep;
					function addCeilSkirt(
						ncVal: number,
						mx: number,
						mz: number,
						ry: number,
						dir: "north" | "south" | "east" | "west",
					) {
						const s = spec(ceilSkirtTiles, dir, ceilId);
						const h = (ncVal - ceilVal) * offsetStep;
						const fullPanels = Math.floor(h / tileSize);
						const rem = h - fullPanels * tileSize;
						const isBlockingCeil = (nx: number, nz: number) =>
							isSolid(nx, nz) || (openCeilVal(nx, nz) ?? 128) < ncVal;
						const ao = aoEnabled ? computeSkirtFaceAO(isBlockingCeil, cx, cz, dir) : null;
						for (let i = 0; i < fullPanels; i++) {
							const midY = yCurrent - i * tileSize - tileSize / 2;
							ceilEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
							ceilEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
							ceilEdgeRots.push(s.rotation ?? 0);
							ceilEdgeHeightScales.push(1.0);
							ceilEdgeCellMap.push({ cx, cz });
							if (ao) ceilEdgesAo.push(ao[0], ao[1], ao[2], ao[3]);
						}
						if (rem > 0.001) {
							const midY = yCurrent - fullPanels * tileSize - rem / 2;
							ceilEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
							ceilEdgeRects.push(getUvRect(resolveTile(s.tile, resolver)));
							ceilEdgeRots.push(s.rotation ?? 0);
							ceilEdgeHeightScales.push(rem / tileSize);
							ceilEdgeCellMap.push({ cx, cz });
							if (ao) ceilEdgesAo.push(ao[0], ao[1], ao[2], ao[3]);
						}
					}
					const ncN = openCeilVal(cx, cz - 1);
					if (ncN !== null && ncN !== 0 && ncN > ceilVal) addCeilSkirt(ncN, wx, cz * tileSize, Math.PI, "north");
					const ncS = openCeilVal(cx, cz + 1);
					if (ncS !== null && ncS !== 0 && ncS > ceilVal) addCeilSkirt(ncS, wx, (cz + 1) * tileSize, 0, "south");
					const ncW = openCeilVal(cx - 1, cz);
					if (ncW !== null && ncW !== 0 && ncW > ceilVal) addCeilSkirt(ncW, cx * tileSize, wz, -HALF_PI, "west");
					const ncE = openCeilVal(cx + 1, cz);
					if (ncE !== null && ncE !== 0 && ncE > ceilVal) addCeilSkirt(ncE, (cx + 1) * tileSize, wz, HALF_PI, "east");

					/* don't think we need this now, but kept it just in case there's a case i overlooked
					// Wall-adjacent ceiling skirts: fill the gap between the wall top and a
					// raised ceiling using the wall tile repeated upward.
					if (ceilVal < 128) {
						const gapH = (128 - ceilVal) * offsetStep;
						function addWallCeilSkirt(
							mx: number,
							mz: number,
							ry: number,
							dir: "north" | "south" | "east" | "west",
						) {
							const s = spec(wallTiles, dir, wallId);
							const fullPanels = Math.floor(gapH / tileSize);
							const rem = gapH - fullPanels * tileSize;
							const ao = aoEnabled ? computeFaceAO(isSolid, cx, cz, dir) : null;
							for (let i = 0; i < fullPanels; i++) {
								const midY = ceilingH + i * tileSize + tileSize / 2;
								ceilWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, tileSize));
								ceilWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
								ceilWallSkirtRots.push(s.rotation ?? 0);
								ceilWallSkirtHeightScales.push(1.0);
								ceilWallSkirtRowIndexes.push(i);
								ceilWallSkirtCellMap.push({ cx, cz });
								if (ao) ceilWallSkirtAo.push(ao[0], ao[1], ao[2], ao[3]);
							}
							if (rem > 0.001) {
								const midY = ceilingH + fullPanels * tileSize + rem / 2;
								ceilWallSkirtEdges.push(makeFaceMatrix(mx, midY, mz, 0, ry, 0, tileSize, rem));
								ceilWallSkirtRects.push(getUvRect(resolveTile(s.tile, resolver)));
								ceilWallSkirtRots.push(s.rotation ?? 0);
								ceilWallSkirtHeightScales.push(rem / tileSize);
								ceilWallSkirtRowIndexes.push(fullPanels);
								ceilWallSkirtCellMap.push({ cx, cz });
								if (ao) ceilWallSkirtAo.push(ao[0], ao[1], ao[2], ao[3]);
							}
						}
						if (isSolid(cx, cz - 1)) addWallCeilSkirt(wx, cz * tileSize, 0, "north");
						if (isSolid(cx, cz + 1)) addWallCeilSkirt(wx, (cz + 1) * tileSize, Math.PI, "south");
						if (isSolid(cx - 1, cz)) addWallCeilSkirt(cx * tileSize, wz, HALF_PI, "west");
						if (isSolid(cx + 1, cz)) addWallCeilSkirt((cx + 1) * tileSize, wz, -HALF_PI, "east");
					}*/
				}

				// Sky panels: open-sky cells emit toward non-sky neighbours; non-sky cells emit toward open-sky neighbours.
				const skyCount = skyPanelCountData ? (skyPanelCountData[idx] ?? 0) : 0;
				if (skyCount > 0) {
					function emitSkyPanels(mx: number, mz: number, ry: number, offs: number) {
						for (let i = 0; i < skyCount; i++) {
							skyPanelEdges.push(makeFaceMatrix(mx, offs + tileSize + i * tileSize + tileSize / 2, mz, 0, ry + Math.PI, 0, tileSize, tileSize));
							skyPanelRects.push(getUvRect(wallId));
							skyPanelRots.push(0);
							skyPanelHeightScales.push(1.0);
							skyPanelRowIndexes.push(i);
							skyPanelCellMap.push({ cx, cz });
						}
					}
					if (isOpenSky) {	// handles skylight to interior
						if (!isOpenSkyCeil(cx, cz - 1)) {
							const nfloorVal = floorOffData ? (floorOffData[idx - width] ?? 128) : 128;
							const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);
							emitSkyPanels(wx, (cz) * tileSize, Math.PI, nfvo);
						}
						if (!isOpenSkyCeil(cx, cz + 1)) {
							const nfloorVal = floorOffData ? (floorOffData[idx + width] ?? 128) : 128;
							const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);
							emitSkyPanels(wx, (cz + 1) * tileSize, 0, nfvo);
						}
						if (!isOpenSkyCeil(cx - 1, cz)) {
							const nfloorVal = floorOffData ? (floorOffData[idx - 1] ?? 128) : 128;
							const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);
							emitSkyPanels((cx) * tileSize, wz, -HALF_PI, nfvo);
						}
						if (!isOpenSkyCeil(cx + 1, cz)) {
							const nfloorVal = floorOffData ? (floorOffData[idx + 1] ?? 128) : 128;
							const nfvo = Math.min((nfloorVal - 128) * offsetStep, fvo);
							emitSkyPanels((cx + 1) * tileSize, wz, HALF_PI, nfvo);
						}
					} else {	// handles interior to skylight
						if (isOpenSkyCeil(cx, cz - 1)) emitSkyPanels(wx, (cz) * tileSize, 0, cvo);
						if (isOpenSkyCeil(cx, cz + 1)) emitSkyPanels(wx, (cz + 1) * tileSize, Math.PI, cvo);
						if (isOpenSkyCeil(cx - 1, cz)) emitSkyPanels((cx) * tileSize, wz, +HALF_PI, cvo);
						if (isOpenSkyCeil(cx + 1, cz)) emitSkyPanels((cx + 1) * tileSize, wz, -HALF_PI, cvo);
					}
				}

				// haven't tested or debugged this one yet. the vertical offset is almost certainly wrong.
				// Ceiling panels — stacked below ceilingH on wall faces of cells with ceilingPanelCount > 0.
				const ceilPanelCount = ceilingPanelCountData ? (ceilingPanelCountData[idx] ?? 0) : 0;
				if (ceilPanelCount > 0) {
					function emitCeilPanels(mx: number, mz: number, ry: number) {
						for (let i = 0; i < ceilPanelCount; i++) {
							ceilPanelEdges.push(makeFaceMatrix(mx, ceilingH - i * tileSize - tileSize / 2, mz, 0, ry, 0, tileSize, tileSize));
							ceilPanelRects.push(getUvRect(wallId));
							ceilPanelRots.push(0);
							ceilPanelHeightScales.push(1.0);
							ceilPanelRowIndexes.push(i);
							ceilingPanelCellMap.push({ cx, cz });
						}
					}
					if (isSolid(cx, cz - 1)) emitCeilPanels(wx, cz * tileSize, 0);
					if (isSolid(cx, cz + 1)) emitCeilPanels(wx, (cz + 1) * tileSize, Math.PI);
					if (isSolid(cx - 1, cz)) emitCeilPanels(cx * tileSize, wz, HALF_PI);
					if (isSolid(cx + 1, cz)) emitCeilPanels((cx + 1) * tileSize, wz, -HALF_PI);
				}
			}
		}

		meshToCellMap.clear();

		// Helper: extract parallel Float32Arrays of cell coords from a CellRef[].
		function cellArrays(map: CellRef[]): [Float32Array, Float32Array] {
			const xs = new Float32Array(map.length);
			const zs = new Float32Array(map.length);
			map.forEach((c, i) => { xs[i] = c.cx; zs[i] = c.cz; });
			return [xs, zs];
		}

		const [floorCX, floorCZ] = cellArrays(floorCellMap);
		const [ceilCX, ceilCZ] = cellArrays(ceilCellMap);
		const [wallCX, wallCZ] = cellArrays(wallCellMap);
		const [fEdgeCX, fEdgeCZ] = cellArrays(floorEdgeCellMap);
		const [cEdgeCX, cEdgeCZ] = cellArrays(ceilEdgeCellMap);

		floorMesh = buildInstancedMesh(
			floors, floorRects, floorMat, !!packedAtlas,
			undefined/*new Float32Array(floorOffsets)*/, undefined, undefined, floorCX, floorCZ,
			aoEnabled && floorsAo.length ? new Float32Array(floorsAo) : undefined,
		);
		scene.add(floorMesh);
		meshToCellMap.set(floorMesh, floorCellMap);

		ceilMesh = buildInstancedMesh(
			ceils, ceilRects, ceilMat, !!packedAtlas,
			undefined/*new Float32Array(ceilOffsets)*/, undefined, undefined, ceilCX, ceilCZ,
			aoEnabled && ceilsAo.length ? new Float32Array(ceilsAo) : undefined,
		);
		scene.add(ceilMesh);
		meshToCellMap.set(ceilMesh, ceilCellMap);

		wallMesh = buildInstancedMesh(
			walls, wallRects, wallMat, !!packedAtlas,
			undefined, wallRots, undefined, wallCX, wallCZ,
			aoEnabled && wallsAo.length ? new Float32Array(wallsAo) : undefined,
			new Float32Array(wallNormals),
		);
		scene.add(wallMesh);
		meshToCellMap.set(wallMesh, wallCellMap);

		floorEdgeMesh = buildInstancedMesh(
			floorEdges, floorEdgeRects, floorEdgeMat, !!packedAtlas,
			undefined, floorEdgeRots, floorEdgeHeightScales, fEdgeCX, fEdgeCZ,
			aoEnabled && floorEdgesAo.length ? new Float32Array(floorEdgesAo) : undefined,
		);
		scene.add(floorEdgeMesh);
		meshToCellMap.set(floorEdgeMesh, floorEdgeCellMap);

		ceilEdgeMesh = buildInstancedMesh(
			ceilEdges, ceilEdgeRects, ceilEdgeMat, !!packedAtlas,
			undefined, ceilEdgeRots, ceilEdgeHeightScales, cEdgeCX, cEdgeCZ,
			aoEnabled && ceilEdgesAo.length ? new Float32Array(ceilEdgesAo) : undefined,
		);
		scene.add(ceilEdgeMesh);
		meshToCellMap.set(ceilEdgeMesh, ceilEdgeCellMap);

		if (floorWallSkirtEdges.length > 0) {
			const [fwsCX, fwsCZ] = cellArrays(floorWallSkirtCellMap);
			floorWallSkirtMesh = buildInstancedMesh(
				floorWallSkirtEdges, floorWallSkirtRects, floorWallSkirtMat, !!packedAtlas,
				undefined, floorWallSkirtRots, floorWallSkirtHeightScales, fwsCX, fwsCZ,
				aoEnabled && floorWallSkirtAo.length ? new Float32Array(floorWallSkirtAo) : undefined,
				undefined, floorWallSkirtRowIndexes, floorWallSkirtUvOffsets,
			);
			scene.add(floorWallSkirtMesh);
			meshToCellMap.set(floorWallSkirtMesh, floorWallSkirtCellMap);
		}
		if (ceilWallSkirtEdges.length > 0) {
			const [cwsCX, cwsCZ] = cellArrays(ceilWallSkirtCellMap);
			ceilWallSkirtMesh = buildInstancedMesh(
				ceilWallSkirtEdges, ceilWallSkirtRects, ceilWallSkirtMat, !!packedAtlas,
				undefined, ceilWallSkirtRots, ceilWallSkirtHeightScales, cwsCX, cwsCZ,
				aoEnabled && ceilWallSkirtAo.length ? new Float32Array(ceilWallSkirtAo) : undefined,
				undefined, ceilWallSkirtRowIndexes,
			);
			scene.add(ceilWallSkirtMesh);
			meshToCellMap.set(ceilWallSkirtMesh, ceilWallSkirtCellMap);
		}
		if (skyPanelEdges.length > 0) {
			const [spCX, spCZ] = cellArrays(skyPanelCellMap);
			skyPanelMesh = buildInstancedMesh(
				skyPanelEdges, skyPanelRects, skyPanelMat, !!packedAtlas,
				undefined, skyPanelRots, skyPanelHeightScales, spCX, spCZ,
				undefined, undefined, skyPanelRowIndexes,
			);
			scene.add(skyPanelMesh);
			meshToCellMap.set(skyPanelMesh, skyPanelCellMap);
		}
		if (ceilPanelEdges.length > 0) {
			const [cpCX, cpCZ] = cellArrays(ceilingPanelCellMap);
			ceilingPanelMesh = buildInstancedMesh(
				ceilPanelEdges, ceilPanelRects, ceilingPanelMat, !!packedAtlas,
				undefined, ceilPanelRots, ceilPanelHeightScales, cpCX, cpCZ,
				undefined, undefined, ceilPanelRowIndexes,
			);
			scene.add(ceilingPanelMesh);
			meshToCellMap.set(ceilingPanelMesh, ceilingPanelCellMap);
		}

		// Build / sync the surface-painter overlay texture now that the dungeon is ready.
		rebuildOverlayTexture(width, height);
		syncOverlayUniforms(width, height);
		syncSkirtLookupUniforms();
		syncBaseOverrideUniforms();

		// Apply any layers registered before the dungeon was generated.
		for (const entry of layerEntries) {
			if (!entry.holder.mesh) {
				entry.holder.mesh = buildLayerMesh(entry.spec);
				if (entry.holder.mesh) scene.add(entry.holder.mesh);
			}
		}
	}

	// ── Entity rendering ──────────────────────────────────────────────────────
	const appearances = options.entityAppearances ?? {};
	const entityGeoCache = new Map<string, THREE.BoxGeometry>();
	const entityMatCache = new Map<string, THREE.MeshStandardMaterial>();

	function resolveAppearanceKey(e: EntityBase): string {
		const type = (e as Record<string, unknown>).type as string | undefined;
		if (type && appearances[type]) return type;
		if (appearances[e.kind]) return e.kind;
		return "__default__";
	}

	function getEntityGeo(key: string): THREE.BoxGeometry {
		if (!entityGeoCache.has(key)) {
			const spec = appearances[key] ?? {};
			const wf = spec.widthFactor ?? 0.35;
			const hf = spec.heightFactor ?? 0.55;
			const df = spec.depthFactor ?? wf;
			entityGeoCache.set(
				key,
				new THREE.BoxGeometry(tileSize * wf, ceilingH * hf, tileSize * df),
			);
		}
		return entityGeoCache.get(key)!;
	}

	function getEntityMat(key: string): THREE.MeshStandardMaterial {
		if (!entityMatCache.has(key)) {
			const spec = appearances[key] ?? {};
			entityMatCache.set(
				key,
				new THREE.MeshStandardMaterial({ color: spec.color ?? 0xcc2222 }),
			);
		}
		return entityMatCache.get(key)!;
	}

	const entityMeshMap = new Map<string, THREE.Mesh>();
	const billboardMap = new Map<string, BillboardHandle>();
	const objectBillboardMap = new Map<string, BillboardHandle>();
	let currentObjects: ObjectPlacement[] = [];

	function syncObjects(objects: ObjectPlacement[]) {
		const activeKeys = new Set(
			objects.filter((o) => o.spriteMap).map((o) => `${o.type}_${o.x}_${o.z}`),
		);
		for (const [id, handle] of objectBillboardMap) {
			if (!activeKeys.has(id)) {
				handle.dispose();
				objectBillboardMap.delete(id);
			}
		}
		for (const obj of objects) {
			if (!obj.spriteMap) continue;
			const key = `${obj.type}_${obj.x}_${obj.z}`;
			if (!objectBillboardMap.has(key) && packedAtlas) {
				const fakeEntity: EntityBase & { spriteMap: SpriteMap } = {
					id: key,
					kind: "decoration",
					spriteName: obj.type,
					faction: "none",
					x: obj.x,
					z: obj.z,
					speed: 0,
					alive: true,
					blocksMove: false,
					tick: 0,
					spriteMap: obj.spriteMap,
					type: obj.type,
				};
				objectBillboardMap.set(key, createBillboard(tileSize, fakeEntity, packedAtlas, scene, resolver, 64, { color: fogColor, near: fogNear, far: fogFar }));
			}
		}
	}

	function syncEntities(entities: EntityBase[]) {
		const aliveIds = new Set(entities.filter((e) => e.alive).map((e) => e.id));

		for (const [id, mesh] of entityMeshMap) {
			if (!aliveIds.has(id)) {
				scene.remove(mesh);
				entityMeshMap.delete(id);
			}
		}
		for (const [id, handle] of billboardMap) {
			if (!aliveIds.has(id)) {
				handle.dispose();
				billboardMap.delete(id);
			}
		}

		for (const e of entities) {
			if (!e.alive) continue;

			if (e.spriteMap) {
				// Billboard path
				if (!billboardMap.has(e.id) && packedAtlas) {
					const handle = createBillboard(
						tileSize,
						e as EntityBase & { spriteMap: SpriteMap },
						packedAtlas,
						scene,
						resolver,
						64,
						{ color: fogColor, near: fogNear, far: fogFar },
					);
					billboardMap.set(e.id, handle);
				}
				// update() is called in the RAF loop using the current camera yaw
			} else {
				// Box geometry path (faster version)
				const key = resolveAppearanceKey(e);
				let mesh = entityMeshMap.get(e.id);
				if (!mesh) {
					mesh = new THREE.Mesh(getEntityGeo(key), getEntityMat(key));
					entityMeshMap.set(e.id, mesh);
					scene.add(mesh);
				}
				const hf = (appearances[key] ?? {}).heightFactor ?? 0.55;
				mesh.position.set((e.x + 0.5) * tileSize, (ceilingH * hf) / 2, (e.z + 0.5) * tileSize,);
			}
		}
	}

	// Kept so the RAF loop can call billboard updates with current camera yaw.
	let currentEntities: EntityBase[] = [];

	// ── Camera lerp state ─────────────────────────────────────────────────────
	let tgtX = 0,
		tgtZ = 0,
		tgtYaw = 0;
	let tgtY = tileSize * eyeHeightFactor;
	let curX = 0,
		curZ = 0,
		curYaw = 0;
	let curY = tileSize * eyeHeightFactor;
	let initialized = false;

	const onTurn = () => {
		buildDungeon();
		tgtX = (game.player.x + 0.5) * tileSize;
		tgtZ = (game.player.z + 0.5) * tileSize;
		tgtYaw = game.player.facing;

		// i can't think of a reason not to snap to floor, it's just added complexity
		// modded this code to snap everything to floor, with the caveat that we'll need to 
		// handle spider webs on the ceiling at some point in the future.
		tgtY = tileSize * eyeHeightFactor + getFloorOffset(game.player.x, game.player.z);

		if (!initialized) {
			curX = tgtX;
			curZ = tgtZ;
			curYaw = tgtYaw;
			curY = tgtY;
			initialized = true;
		}
	};

	game.events.on("turn", onTurn);

	// ── RAF loop ──────────────────────────────────────────────────────────────
	let rafId = 0;
	let lastT = 0;

	function tick(t: number) {
		rafId = requestAnimationFrame(tick);
		const dt = Math.min((t - lastT) / 1000, 0.1);
		lastT = t;

		if (initialized) {
			const k = 1 - Math.pow(1 - lerpFactor, dt * 60);
			curX += (tgtX - curX) * k;
			curY += (tgtY - curY) * k;
			curZ += (tgtZ - curZ) * k;

			let dy = tgtYaw - curYaw;
			while (dy > Math.PI) dy -= 2 * Math.PI;
			while (dy < -Math.PI) dy += 2 * Math.PI;
			curYaw += dy * k;

			// fix camera position to center of tile
			const PULLBACK = 0.5 * tileSize;
			const backX = Math.sin(curYaw) * PULLBACK;
			const backZ = Math.cos(curYaw) * PULLBACK;
			camera.position.set(curX + backX, curY, curZ + backZ);
			camera.rotation.set(-0.1, curYaw, 0, "YXZ");	// look down slightly to see floor!

			// Update camera forward direction for directional surface lighting.
			const cfx = -Math.sin(curYaw);
			const cfz = -Math.cos(curYaw);
			for (const mat of atlasMaterials) {
				const u = mat.uniforms['uCamDir'];
				if (u) (u.value as THREE.Vector2).set(cfx, cfz);
			}

			// Update live entity billboards and box-geometry meshes; cull beyond fogFar.
			const fogFar2 = fogFar * fogFar;
			for (const e of currentEntities) {
				if (!e.alive) continue;
				const dx = (e.x + 0.5) * tileSize - curX;
				const dz = (e.z + 0.5) * tileSize - curZ;
				const floorY = getFloorOffset(e.x, e.z);
				const inRange = dx * dx + dz * dz <= fogFar2;
				if (e.spriteMap) {
					const handle = billboardMap.get(e.id);
					if (handle) {
						handle.setVisible(inRange);
						if (inRange) handle.update(e, curYaw, tileSize, ceilingH, floorY);
					}
				} else {
					const mesh = entityMeshMap.get(e.id);
					if (mesh) mesh.visible = inRange;
				}
			}
			// Update stationary object billboards; cull beyond fogFar.
			for (const obj of currentObjects) {
				if (!obj.spriteMap) continue;
				const dx = (obj.x + 0.5) * tileSize - curX;
				const dz = (obj.z + 0.5) * tileSize - curZ;
				const floorY = getFloorOffset(obj.x, obj.z);

				const inRange = dx * dx + dz * dz <= fogFar2;
				const handle = objectBillboardMap.get(`${obj.type}_${obj.x}_${obj.z}`);
				if (handle) {
					handle.setVisible(inRange);
					if (inRange) handle.update(obj as unknown as EntityBase, curYaw, tileSize, ceilingH, floorY);
				}
			}
		}

		glRenderer.render(scene, camera);
	}

	function getFloorOffset(tx: number, tz: number): number {
		const outputs = game.dungeon.outputs;
		const floorOffData =
			outputs?.textures.floorHeightOffset?.image.data as Uint8Array | undefined;

		if (!floorOffData || !outputs) return 0;

		const idx = tz * outputs.width + tx;
		const floorVal = floorOffData[idx] ?? 128;

		// floorVal === 0 means pit — treat as neutral for camera purposes
		return floorVal !== 0 ? (floorVal - 128) * offsetStep : 0;
	}

	// ── Resize ────────────────────────────────────────────────────────────────
	function resize() {
		const w = element.clientWidth || 1;
		const h = element.clientHeight || 1;
		glRenderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	const ro = new ResizeObserver(resize);
	ro.observe(element);
	resize();

	rafId = requestAnimationFrame(tick);

	// ── Mouse / cell picking ──────────────────────────────────────────────────
	const raycaster = new THREE.Raycaster();
	const _mouseNdc = new THREE.Vector2();

	function getCellAtPointer(clientX: number, clientY: number): CellInfo | null {
		const outputs = game.dungeon.outputs;
		if (!outputs) return null;

		const rect = canvas.getBoundingClientRect();
		_mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
		_mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
		raycaster.setFromCamera(_mouseNdc, camera);

		const pickable = [floorMesh, ceilMesh, wallMesh, floorEdgeMesh, ceilEdgeMesh, floorWallSkirtMesh, ceilWallSkirtMesh, skyPanelMesh, ceilingPanelMesh].filter(
			(m): m is THREE.InstancedMesh => m !== null,
		);
		if (pickable.length === 0) return null;

		const hits = raycaster.intersectObjects([...pickable,
		...Array.from(billboardMap.values(), b => b.getPickObject()),
		...Array.from(objectBillboardMap.values(), b => b.getPickObject()),
		], false);
		const hit = hits[0];
		if (!hit) return null;

		let cx = 0, cz = 0;
		if (hit.object.userData.entity)	// is an entity
		{
			return { cx: hit.object.userData.entity.x, cz: hit.object.userData.entity.z, entityId: hit.object.userData.entity.id, regionId: 0 };
		}
		else {
			const cellArray = meshToCellMap.get(hit.object as THREE.InstancedMesh);
			if (!cellArray || hit.instanceId == null) return null;

			const cell = cellArray[hit.instanceId];
			if (!cell) return null;
			cx = cell.cx; cz = cell.cz;

			const { width } = outputs;
			const regionData = outputs.textures.regionId?.image.data as Uint8Array | undefined;
			const regionId = regionData ? (regionData[cz * width + cx] ?? 0) : 0;

			return { cx, cz, regionId };
		}
	}

	//let _lastHoverKey: string | null = null;
	// was a great idea, but we need to let the dev do this because it's tied to other stuff usually.
	function onCanvasClick(e: MouseEvent) {
		if (!options.onCellClick) return;
		const info = getCellAtPointer(e.clientX, e.clientY);
		if (info) options.onCellClick(e, info);
	}

	function onCanvasPointerMove(e: PointerEvent) {
		if (!options.onCellHover) return;
		const info = getCellAtPointer(e.clientX, e.clientY);
		//const key = info ? `${info.cx},${info.cz},${info.entityId}` : null;
		//if (key === _lastHoverKey) return;
		//_lastHoverKey = key;
		options.onCellHover(info);
	}

	function onCanvasPointerLeave() {
		if (!options.onCellHover) return;
		//if (_lastHoverKey !== null) {
		//	_lastHoverKey = null;
		options.onCellHover(null);
		//}
	}

	if (options.onCellClick) {
		canvas.addEventListener("click", onCanvasClick);
		canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); onCanvasClick(e); });
	}
	if (options.onCellHover) {
		canvas.addEventListener("pointermove", onCanvasPointerMove);
		canvas.addEventListener("pointerleave", onCanvasPointerLeave);
	}

	// ── Surface painter — dynamic cell-paint events ───────────────────────────
	function onCellPaint(e: {
		x: number; z: number;
		floor?: string[]; wall?: string[]; ceil?: string[];
		ceilSkirtBase?: (string | null)[]; floorSkirtBase?: (string | null)[];
		skyPanels?: (string | null)[]; ceilingPanels?: (string | null)[];
	}) {
		updateOverlayCell(e.x, e.z, e);
	}
	game.events.on("cell-paint", onCellPaint);

	// ── Internal addLayer ─────────────────────────────────────────────────────
	function internalAddLayer(spec: LayerSpec): LayerHandle {
		const holder: { mesh: THREE.InstancedMesh | null } = { mesh: null };
		if (dungeonBuilt) {
			holder.mesh = buildLayerMesh(spec);
			if (holder.mesh) scene.add(holder.mesh);
		}
		const entry: LayerEntry = { spec, holder };
		layerEntries.push(entry);
		return {
			remove() {
				if (holder.mesh) {
					scene.remove(holder.mesh);
					holder.mesh.geometry.dispose();
					holder.mesh = null;
				}
				const i = layerEntries.indexOf(entry);
				if (i !== -1) layerEntries.splice(i, 1);
			},
		};
	}

	// ── Public handle ─────────────────────────────────────────────────────────
	return {
		scene,
		camera,
		addLight<T extends THREE.Light>(light: T): T {
			scene.add(light);
			managedLights.add(light);
			return light;
		},
		removeLight(light: THREE.Light): void {
			light.removeFromParent();
			managedLights.delete(light);
		},
		setEntities(entities) {
			currentEntities = entities;
			syncEntities(entities);
		},
		editEntity(entity, layerIndex: number, tile: string) {
			if (billboardMap.has(entity.id)) billboardMap.get(entity.id)?.setLayerTile(tileSize, layerIndex, tile);
			else if (objectBillboardMap.has(entity.id)) objectBillboardMap.get(entity.id)?.setLayerTile(tileSize, layerIndex, tile);
		},
		setObjects(objects) {
			currentObjects = objects;
			syncObjects(objects);
		},
		worldToScreen(gridX, gridZ, worldY) {
			const wx = (gridX + 0.5) * tileSize;
			const wy = worldY ?? ceilingH * 0.4;
			const wz = (gridZ + 0.5) * tileSize;
			const v = new THREE.Vector3(wx, wy, wz).project(camera);
			if (v.z > 1) return null;
			const w = element.clientWidth || 1;
			const h = element.clientHeight || 1;
			const sx = (v.x * 0.5 + 0.5) * w;
			const sy = (-v.y * 0.5 + 0.5) * h;
			if (sx < 0 || sx > w || sy < 0 || sy > h) return null;
			return { x: sx, y: sy };
		},
		createAtlasMaterial() {
			return packedAtlas ? makeAtlasMaterial() : null;
		},
		addLayer(spec: LayerSpec): LayerHandle {
			return internalAddLayer(spec);
		},
		highlightCells(filter) {
			const outputs = game.dungeon.outputs;
			const regionData = outputs?.textures.regionId?.image.data as Uint8Array | undefined;
			const solid = outputs?.textures.solid?.image.data as Uint8Array | undefined;
			const width = outputs?.width ?? 0;
			const height = outputs?.height ?? 0;

			// Group cells by color string.
			const colorGroups = new Map<string, Set<number>>();
			for (let cz = 0; cz < height; cz++) {
				for (let cx = 0; cx < width; cx++) {
					const idx = cz * width + cx;
					if (solid && (solid[idx] ?? 1) > 0) continue;
					const regionId = regionData ? (regionData[idx] ?? 0) : 0;
					const color = filter(cx, cz, regionId);
					if (!color) continue;
					let group = colorGroups.get(color);
					if (!group) { group = new Set(); colorGroups.set(color, group); }
					group.add(idx);
				}
			}

			const subHandles: LayerHandle[] = [];
			const subMaterials: THREE.MeshBasicMaterial[] = [];

			for (const [color, cellIdxSet] of colorGroups) {
				const mat = new THREE.MeshBasicMaterial({
					color: new THREE.Color(color),
					transparent: true,
					opacity: 0.4,
					depthWrite: false,
					side: THREE.DoubleSide,
				});
				subMaterials.push(mat);
				const cellFilter = (cx: number, cz: number) =>
					cellIdxSet.has(cz * width + cx) ? {} : false;
				for (const target of ["floor", "ceil", "wall"] as LayerTarget[]) {
					subHandles.push(internalAddLayer({
						target,
						material: mat,
						useAtlas: false,
						polygonOffset: true,
						filter: cellFilter,
					}));
				}
			}

			return {
				remove() {
					for (const h of subHandles) h.remove();
					for (const m of subMaterials) m.dispose();
				},
			};
		},
		setAmbientOcclusion(intensity: number) {
			aoIntensity = Math.max(0, Math.min(1, intensity));
			for (const mat of atlasMaterials) {
				(mat.uniforms["uAoIntensity"] as { value: number }).value = aoIntensity;
			}
		},
		setSurfaceLighting(opts) {
			if (opts.floor !== undefined && floorMat instanceof THREE.ShaderMaterial)
				(floorMat.uniforms["uSurfaceLight"] as { value: number }).value = opts.floor;
			if (opts.ceiling !== undefined && ceilMat instanceof THREE.ShaderMaterial)
				(ceilMat.uniforms["uSurfaceLight"] as { value: number }).value = opts.ceiling;
			if (opts.wallMin !== undefined || opts.wallMax !== undefined) {
				for (const mat of atlasMaterials) {
					if (opts.wallMin !== undefined)
						(mat.uniforms["uWallLightMin"] as { value: number }).value = opts.wallMin;
					if (opts.wallMax !== undefined)
						(mat.uniforms["uWallLightMax"] as { value: number }).value = opts.wallMax;
				}
			}
		},
		setOutsideLight(opts) {
			if (opts.brightness !== undefined && skyPanelMat instanceof THREE.ShaderMaterial)
				(skyPanelMat.uniforms["uSurfaceLight"] as { value: number }).value = opts.brightness;
			if (opts.color !== undefined) {
				const [r, g, b] = opts.color;
				// Sky panels: always tinted. Floor/skirt: tinted only under open sky (gated by shader).
				for (const mat of [skyPanelMat, floorMat, floorEdgeMat, floorWallSkirtMat]) {
					if (mat instanceof THREE.ShaderMaterial)
						(mat.uniforms["uSkyLightColor"] as { value: THREE.Color }).value.setRGB(r, g, b);
				}
			}
		},
		setSnapCameraToFloor(enabled: boolean) {
			snapToFloor = enabled;
			tgtY = tileSize * eyeHeightFactor;
			if (enabled && initialized) {
				const outputs = game.dungeon.outputs;
				const floorOffData = outputs?.textures.floorHeightOffset?.image.data as Uint8Array | undefined;
				if (floorOffData && outputs) {
					const idx = game.player.z * outputs.width + game.player.x;
					const floorVal = floorOffData[idx] ?? 128;
					const floorOffset = floorVal !== 0 ? (floorVal - 128) * offsetStep : 0;
					tgtY = tileSize * eyeHeightFactor + floorOffset;
				}
			}
		},
		rebuild() {
			// Remove and dispose existing dungeon meshes.
			for (const mesh of [
				floorMesh,
				ceilMesh,
				wallMesh,
				floorEdgeMesh,
				ceilEdgeMesh,
				floorWallSkirtMesh,
				ceilWallSkirtMesh,
				skyPanelMesh,
				ceilingPanelMesh,
			]) {
				if (mesh) {
					scene.remove(mesh);
					mesh.geometry.dispose();
				}
			}
			floorMesh = ceilMesh = wallMesh = floorEdgeMesh = ceilEdgeMesh = floorWallSkirtMesh = ceilWallSkirtMesh = skyPanelMesh = ceilingPanelMesh = null;
			meshToCellMap.clear();
			// Remove and dispose layer meshes — they will be rebuilt by buildDungeon.
			for (const entry of layerEntries) {
				if (entry.holder.mesh) {
					scene.remove(entry.holder.mesh);
					entry.holder.mesh.geometry.dispose();
					entry.holder.mesh = null;
				}
			}
			// Reset overlay and base-override textures so they are rebuilt for the new dungeon dimensions.
			if (overlayFloor !== defSurf) { overlayFloor.tex.dispose(); overlayFloor = defSurf; }
			if (overlayWall !== defSurf) { overlayWall.tex.dispose(); overlayWall = defSurf; }
			if (overlayCeil !== defSurf) { overlayCeil.tex.dispose(); overlayCeil = defSurf; }
			if (overrideCeilSkirt !== defSurf) { overrideCeilSkirt.tex.dispose(); overrideCeilSkirt = defSurf; }
			if (overrideFloorSkirt !== defSurf) { overrideFloorSkirt.tex.dispose(); overrideFloorSkirt = defSurf; }
			if (overrideSkyPanels !== defSurf) { overrideSkyPanels.tex.dispose(); overrideSkyPanels = defSurf; }
			if (overrideCeilPanels !== defSurf) { overrideCeilPanels.tex.dispose(); overrideCeilPanels = defSurf; }
			dungeonBuilt = false;
			buildDungeon();
		},
		setSkybox(opts: SkyboxOptions | null): Promise<void> {
			if (opts === null) {
				clearSkybox();
				return Promise.resolve();
			}
			if (opts.faces instanceof THREE.CubeTexture) {
				if (opts.rotationY) opts.faces.rotation = opts.rotationY;
				applySkybox(opts.faces, false);
				return Promise.resolve();
			}
			return loadSkybox(opts).then((tex) => applySkybox(tex, true));
		},
		destroy() {
			cancelAnimationFrame(rafId);
			ro.disconnect();
			game.events.off("turn", onTurn);
			game.events.off("cell-paint", onCellPaint);
			canvas.removeEventListener("click", onCanvasClick);
			canvas.removeEventListener("pointermove", onCanvasPointerMove);
			canvas.removeEventListener("pointerleave", onCanvasPointerLeave);
			for (const geo of entityGeoCache.values()) geo.dispose();
			for (const mat of entityMatCache.values()) mat.dispose();
			for (const handle of billboardMap.values()) handle.dispose();
			for (const handle of objectBillboardMap.values()) handle.dispose();
			sharedAtlasTex?.dispose();
			tileUvLookupTex?.dispose();
			if (overlayFloor !== defSurf) overlayFloor.tex.dispose();
			if (overlayWall !== defSurf) overlayWall.tex.dispose();
			if (overlayCeil !== defSurf) overlayCeil.tex.dispose();
			if (overrideCeilSkirt !== defSurf) overrideCeilSkirt.tex.dispose();
			if (overrideFloorSkirt !== defSurf) overrideFloorSkirt.tex.dispose();
			if (overrideSkyPanels !== defSurf) overrideSkyPanels.tex.dispose();
			if (overrideCeilPanels !== defSurf) overrideCeilPanels.tex.dispose();
			_defaultOverlayTex.dispose();
			for (const light of managedLights) light.removeFromParent();
			managedLights.clear();
			if (skyboxTex && skyboxOwned) skyboxTex.dispose();
			glRenderer.dispose();
			canvas.remove();
		},
	};
}
