// src/lib/rendering/billboardSprites.ts
//
// Camera-facing billboard sprite system for mobile entities.
// Supports layered sprite rendering with multi-angle variants.

import * as THREE from "three";
import type { EntityBase } from "../entities/types";
import { resolveTile } from "./tileAtlas";
import type { PackedAtlas } from "./textureLoader";
import { spriteToUvRect } from "./textureLoader";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AngleKey = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface SpriteBob {
	/** Peak horizontal displacement left/right of offsetX, in world units. Default 0. */
	amplitudeX?: number;
	/** Peak vertical displacement above/below offsetY, in world units. Default 0. */
	amplitudeY?: number;
	/** Oscillation speed in radians per second. Default 2. */
	speed?: number;
	/** Phase offset in radians, useful for staggering multiple layers. Default 0. */
	phase?: number;
}

export interface SpriteLayer {
	/** Atlas tile: string name (resolved via resolver) or numeric tile index. */
	tile: string | number;
	/** Horizontal offset from billboard center, in world units. Default 0. */
	offsetX?: number;
	/** Vertical offset from billboard center, in world units. Default 0. */
	offsetY?: number;
	/** other offset from billboard center, in world units. Default 0. */
	offsetZ?: number;
	/** Uniform scale multiplier. Default 1. */
	scale?: number;
	/** Alpha multiplier [0,1]. Default 1. */
	opacity?: number;
	/** Sinusoidal vertical bobbing animation applied on top of offsetY. */
	bob?: SpriteBob;
}

export interface AngleOverride {
	/** Which layer index this override targets. */
	layerIndex: number;
	/** Replacement tile for this angle: string name or numeric tile index. */
	tile: string | number;
	/** Replacement opacity (optional). */
	opacity?: number;
}

/**
 * Describes how to render an entity as a camera-facing billboard.
 * Presence of this field on an EntityBase switches the renderer from
 * box geometry to billboard quads.
 */
export interface SpriteMap {
	/** Pixel dimensions of a single sprite cell in the atlas. */
	frameSize: { w: number; h: number };
	/** Ordered layers composited back-to-front (index 0 = bottommost). */
	layers: SpriteLayer[];
	/**
	 * Per-angle layer overrides. Key is a cardinal/intercardinal direction.
	 * When the viewer's bearing falls within 45° of a key, that override
	 * takes precedence over the base layer for the targeted layer index.
	 */
	angles?: Partial<Record<AngleKey, AngleOverride[]>>;
	/**
	 * `'paletteBands'` lighting only: always draw this sprite with its
	 * brightest (level 0) variant regardless of the cell's light level —
	 * e.g. a flame or other light source. Ignored in `'shaded'` mode.
	 */
	emissive?: boolean;
	/**
	 * `'paletteBands'` lighting only: makes the entity/object a light source.
	 * Band thresholds in cells (ascending, inclusive), same meaning as
	 * `PaletteBandsOptions.bands` — e.g. `[0, 1, 2]` lights its own cell at
	 * level 0, adjacent cells at level 1 and so on. Ignored in `'shaded'` mode.
	 */
	lightBands?: number[];
}

/**
 * Palette-band hooks supplied by the dungeon renderer so billboards can swap
 * their tiles for light-level variants. See paletteBands.ts.
 */
export interface BillboardPalette {
	/** Light level at a cell (0 = brightest), or `null` when `'paletteBands'` is off. */
	levelAt(x: number, z: number): number | null;
	/** Number of lit levels; a level equal to this is dark. */
	levelCount(): number;
	/** Swap a tile ID for its variant at `level`. */
	variant(id: number, level: number): number;
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const BILLBOARD_VERT = /* glsl */ `
varying vec2 vUv;
varying float vFogDist;
varying vec3 vViewPos;

void main() {
  vUv = uv;
  vec4 eyePos = modelViewMatrix * vec4(position, 1.0);
  vFogDist = length(eyePos.xyz);
  vViewPos = eyePos.xyz;
  gl_Position = projectionMatrix * eyePos;
}
`;

const BILLBOARD_FRAG = /* glsl */ `
#include <common>
#include <lights_pars_begin>

uniform sampler2D uAtlas;
uniform float uUvX;
uniform float uUvY;
uniform float uUvW;
uniform float uUvH;
uniform float uOpacity;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
// 'paletteBands' lighting: 1 = skip all shading, binary alpha, opaque output.
uniform float uPaletteMode;
// 'paletteBands' lighting: 1 = sprite stands in a dark cell → flat uFogColor silhouette.
uniform float uDark;

varying vec2 vUv;
varying float vFogDist;
varying vec3 vViewPos;

void main() {
  vec2 atlasUv = vec2(uUvX + vUv.x * uUvW, uUvY + vUv.y * uUvH);
  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;

  if (uPaletteMode > 0.5) {
    // Tile was already swapped for its light-level variant on the CPU.
    if (color.a < 0.5 || uOpacity < 0.5) discard;
    gl_FragColor = vec4(uDark > 0.5 ? uFogColor : color.rgb, 1.0);
    return;
  }

  vec3 lightAccum = ambientLightColor;
  #if NUM_POINT_LIGHTS > 0
    for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
      vec3 lVec = pointLights[i].position - vViewPos;
      float atten = getDistanceAttenuation(
        length(lVec), pointLights[i].distance, pointLights[i].decay);
      lightAccum += pointLights[i].color * atten;
    }
  #endif
  color.rgb *= lightAccum;

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);
  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a * uOpacity);
}
`;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * Per-placement adjustments applied on top of a billboard's sprite layers
 * (see `ObjectPlacement.offsetX/offsetY/offsetZ/scale`).
 */
export interface BillboardPlacementOffset {
	/** World-space shift from the cell centre along X, in cell units. */
	offsetX?: number;
	/** Vertical shift, in cell units (+ = up). */
	offsetY?: number;
	/** World-space shift from the cell centre along Z, in cell units. */
	offsetZ?: number;
	/** Uniform scale multiplier on every layer; the sprite stays floor-anchored. */
	scale?: number;
}

export interface BillboardHandle {
	/**
	 * Update position, orientation, and angle-variant uniforms each frame.
	 * `placement` (object billboards) shifts and scales the whole sprite.
	 */
	update(
		entity: EntityBase,
		cameraYaw: number,
		tileSize: number,
		ceilingH: number,
		floorY: number,
		placement?: BillboardPlacementOffset,
	): void;
	/** Show or hide all meshes in this billboard without disposing GPU resources. */
	setVisible(visible: boolean): void;
	/** Remove meshes from scene and dispose GPU resources. */
	dispose(): void;
	getPickObject(): THREE.Mesh;
	setLayerTile(tileSize: number, layerIndex: number, tile: string): void;
}

interface LayerMeshEntry {
	mesh: THREE.Mesh;
	uniforms: {
		uUvX: { value: number };
		uUvY: { value: number };
		uUvW: { value: number };
		uUvH: { value: number };
		uOpacity: { value: number };
		uPaletteMode: { value: number };
		uDark: { value: number };
	};
	baseLayer: SpriteLayer;
	layerIndex: number;
}

// ---------------------------------------------------------------------------
// Angle selection
// ---------------------------------------------------------------------------

const ANGLE_KEYS: AngleKey[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function selectAngleKey(entityFacing: number, cameraYaw: number): AngleKey {
	const rel =
		(((entityFacing - cameraYaw) % (Math.PI * 2)) + Math.PI * 2) %
		(Math.PI * 2);
	const sector = Math.round(rel / (Math.PI / 4)) % 8;
	return ANGLE_KEYS[sector] ?? "N";
}

// ---------------------------------------------------------------------------
// Billboard factory
// ---------------------------------------------------------------------------

export interface BillboardFog {
	color?: THREE.Color;
	near?: number;
	far?: number;
}

/**
 * Create a per-entity billboard handle. Call `handle.update()` each RAF frame.
 * The atlas texture should already be created and cached by the caller.
 *
 * Pass `palette` to support `'paletteBands'` lighting: each frame the sprite's
 * tiles are swapped for the variant matching the light level of the entity's
 * cell (level 0 when `spriteMap.emissive`), shading is skipped, and sprites in
 * dark cells draw as flat fog-colour silhouettes.
 */
let sharedAtlasTex: THREE.Texture;
export function createBillboard(
	tileSize: number,
	entity: EntityBase & { spriteMap: SpriteMap },
	packedAtlas: PackedAtlas,
	scene: THREE.Scene,
	resolver?: (name: string) => number,
	expectedFrameSize: number = 64, // Expected tile size is 64 pixels by default.
	fog: BillboardFog = {},
	palette?: BillboardPalette,
): BillboardHandle {
	const { spriteMap } = entity;
	const group = new THREE.Group();
	scene.add(group);

	// handle clicking on billboards
	const pickMesh = new THREE.Mesh(
		new THREE.PlaneGeometry(1, 1),
		new THREE.MeshBasicMaterial()
	);
	pickMesh.visible = false;
	pickMesh.userData.entity = entity;
	group.add(pickMesh);

	// attempt to speed up creation here - we were making multiple GPU texture objects before
	if (!sharedAtlasTex) {
		sharedAtlasTex = new THREE.Texture(packedAtlas.texture as HTMLCanvasElement);
		sharedAtlasTex.magFilter = THREE.NearestFilter;
		sharedAtlasTex.minFilter = THREE.NearestFilter;
	}
	sharedAtlasTex.needsUpdate = true;
	/*const atlasTex = new THREE.Texture(packedAtlas.texture as HTMLCanvasElement);
	atlasTex.magFilter = THREE.NearestFilter;
	atlasTex.minFilter = THREE.NearestFilter;
	atlasTex.needsUpdate = true;*/

	let opaqueBounds = computeOpaqueBounds(tileSize, spriteMap, packedAtlas, resolver);

	function getRect(tile: string | number) {
		const id = resolveTile(tile, resolver);
		const sprite = packedAtlas.getById(id);
		return sprite ? spriteToUvRect(sprite) : { x: 0, y: 0, w: 0, h: 0 };
	}

	function getPivot(tile: string | number) {
		const id = resolveTile(tile, resolver);
		const sprite = packedAtlas.getById(id);
		const piv = { x: sprite?.pivot?.x ?? 0.5, y: sprite?.pivot?.y ?? 0 };
		return piv;
	}

	function computeOpaqueBounds(tileSize: number, spriteMap: SpriteMap, packedAtlas: PackedAtlas, resolver?: (name: string) => number) {
		let left = Infinity;
		let right = -Infinity;
		let top = -Infinity;
		let bottom = Infinity;

		const atlasCanvas = packedAtlas.texture as HTMLCanvasElement;
		const ctx = atlasCanvas.getContext("2d")!;
		const atlasData = ctx.getImageData(
			0,
			0,
			atlasCanvas.width,
			atlasCanvas.height
		).data;

		for (const layer of spriteMap.layers) {
			const id = resolveTile(layer.tile, resolver);
			const sprite = packedAtlas.getById(id);
			if (!sprite) continue;

			const atlasW = atlasCanvas.width;
			const atlasH = atlasCanvas.height;

			const sx = Math.floor(sprite.uvX * atlasW);
			const sy = Math.floor(sprite.uvY * atlasH);
			const ex = Math.ceil((sprite.uvX + sprite.uvW) * atlasW);
			const ey = Math.ceil((sprite.uvY + sprite.uvH) * atlasH);
			const sw = ex - sx;
			const sh = ey - sy;

			if (sw === 0 || sh === 0) continue;
			let minX = Infinity;
			let minY = Infinity;
			let maxX = -Infinity;
			let maxY = -Infinity;

			for (let y = 0; y < sh; y++) {
				for (let x = 0; x < sw; x++) {
					const idx = ((sy + y) * atlasCanvas.width + (sx + x)) * 4 + 3;
					const alpha = atlasData[idx] ?? 0;
					if (alpha > 0) {
						minX = Math.min(minX, x / sw);
						minY = Math.min(minY, y / sh);
						maxX = Math.max(maxX, (x + 1) / sw);
						maxY = Math.max(maxY, (y + 1) / sh);
					}
				}
			}

			if (minX === Infinity) continue;

			const scale = layer.scale ?? 1;
			const ox = (layer.offsetX ?? 0) / tileSize;
			const oy = (layer.offsetY ?? 0) / tileSize;

			// convert UV-space bounds into billboard-local plane coordinates
			const layerLeft = ox + (minX - 0.5) * scale;
			const layerRight = ox + (maxX - 0.5) * scale;

			const layerTop = oy + (0.5 - minY) * scale;
			const layerBottom = oy + (0.5 - maxY) * scale;

			left = Math.min(left, layerLeft);
			right = Math.max(right, layerRight);
			top = Math.max(top, layerTop);
			bottom = Math.min(bottom, layerBottom);
		}

		if (left === Infinity) {
			return {
				left: -0.5,
				right: 0.5,
				top: -0.5,
				bottom: 0.5,
			};
		}

		return {
			left,
			right,
			top,
			bottom,
		};
	}

	const layerEntries: LayerMeshEntry[] = spriteMap.layers.map(
		(layer, layerIndex) => {
			const rect = getRect(layer.tile);
			const appUniforms = {
				uAtlas: { value: sharedAtlasTex },
				uUvX: { value: rect.x },
				uUvY: { value: rect.y },
				uUvW: { value: rect.w },
				uUvH: { value: rect.h },
				uOpacity: { value: layer.opacity ?? 1 },
				uFogColor: { value: fog.color ?? new THREE.Color(0, 0, 0) },
				uFogNear: { value: fog.near ?? 5 },
				uFogFar: { value: fog.far ?? 24 },
				uPaletteMode: { value: 0 },
				uDark: { value: 0 },
			};
			const uniforms = THREE.UniformsUtils.merge([
				THREE.UniformsLib.lights,
				appUniforms,
			]);

			const mat = new THREE.ShaderMaterial({
				vertexShader: BILLBOARD_VERT,
				fragmentShader: BILLBOARD_FRAG,
				uniforms,
				transparent: true,
				depthWrite: false,
				side: THREE.DoubleSide,
				lights: true,
			});

			const geo = new THREE.PlaneGeometry(1, 1);
			const mesh = new THREE.Mesh(geo, mat);
			mesh.renderOrder = 1;

			const s = layer.scale ?? 1;
			mesh.position.set(
				layer.offsetX ?? 0,
				layer.offsetY ?? 0,
				(layer.offsetX ?? 0) + layerIndex * 0.03,
			);
			mesh.scale.set(s, s, 1);

			group.add(mesh);
			return { mesh, uniforms: appUniforms, baseLayer: layer, layerIndex };
		},
	);

	return {
		update(ent, cameraYaw, tileSize, ceilingH, floorY, placement) {
			const useYaw = (ent.forcedYaw as number) ?? cameraYaw;	// support facades with fixed angle
			const placeScale = placement?.scale ?? 1;

			// Position group at entity world coordinates (plus any placement offset, in cells).
			const wx = (ent.x + 0.5 + (placement?.offsetX ?? 0)) * tileSize;
			const wz = (ent.z + 0.5 + (placement?.offsetZ ?? 0)) * tileSize;
			const basePivot = spriteMap.layers[0] ? getPivot(spriteMap.layers[0].tile) : { x: 0.5, y: 0 };
			const wy = (1 - basePivot.y + (placement?.offsetY ?? 0)) * tileSize + floorY;
			group.position.set(wx, wy, wz);

			// Rotate the group to always face the camera (Y-axis billboard). unless it's a facade with fixed angle
			group.rotation.set(0, useYaw, 0, "YXZ");

			// Scale layers to world-unit sprite size, preserving frameSize aspect ratio.
			// no longer do this. the artist decides the scaling, which by default should be tilesize if it's a full-size monster
			// we should probably use the actual sprite sizes, but we'll use the passed frameSize and thus allow tiny and large-sized monsters
			// to exist. Expected tile size is 64 pixels (anything less just looks bad)
			// added a simple flip timer here for fire and other basic animating effects
			const flipx = ent.flipTimer ? (Math.floor((performance.now() / 1000) / (ent.flipTimer as number)) % 2 === 0 ? 1 : -1) : 1;
			const sprW = flipx * tileSize * (spriteMap.frameSize.w / expectedFrameSize);
			const sprH = tileSize * (spriteMap.frameSize.h / expectedFrameSize);

			const widthFrac = opaqueBounds.right - opaqueBounds.left;
			const heightFrac = opaqueBounds.bottom - opaqueBounds.top;
			pickMesh.scale.set(sprW * widthFrac, sprH * heightFrac, 1);
			const centerX = (opaqueBounds.left + opaqueBounds.right) * 0.5;
			const centerY = (opaqueBounds.top + opaqueBounds.bottom) * 0.5;
			// minor inconvenience, pickmesh assumes scale constant across all layers
			const l1 = layerEntries[0]?.baseLayer, sc = (l1?.scale ?? 1) * placeScale;
			pickMesh.position.set(
				centerX * sprW + sc * (l1?.offsetX ?? 0),
				centerY * sprH + (sprH * (sc - 1) * 0.5),	// do not offsetY here because the object itself has already taken this into account
				(l1?.offsetZ ?? 0));

			const facing = (ent as { facing?: number }).facing ?? 0;
			const angleKey = selectAngleKey(facing, cameraYaw);
			const overrides = spriteMap.angles?.[angleKey];

			// Palette bands: light level of the cell the sprite is (visually) in.
			const rawLevel = palette?.levelAt(Math.round(ent.x), Math.round(ent.z)) ?? null;
			const level = rawLevel === null ? null : spriteMap.emissive ? 0 : rawLevel;
			const levelCount = palette?.levelCount() ?? 1;

			for (const entry of layerEntries) {
				const override = overrides?.find((o) => o.layerIndex === entry.layerIndex);
				const rawTile = override?.tile ?? entry.baseLayer.tile;
				const rect =
					level === null
						? getRect(rawTile)
						: getRect(palette!.variant(resolveTile(rawTile, resolver), Math.min(level, levelCount - 1)));
				const layerMat = entry.mesh.material as THREE.ShaderMaterial;
				layerMat.uniforms.uPaletteMode!.value = level === null ? 0 : 1;
				layerMat.uniforms.uDark!.value = level !== null && level >= levelCount ? 1 : 0;
				layerMat.uniforms.uUvX!.value = rect.x;
				layerMat.uniforms.uUvY!.value = rect.y;
				layerMat.uniforms.uUvW!.value = rect.w;
				layerMat.uniforms.uUvH!.value = rect.h;
				layerMat.uniforms.uOpacity!.value = override?.opacity ?? entry.baseLayer.opacity ?? 1;

				const s = (entry.baseLayer.scale ?? 1) * placeScale;
				entry.mesh.scale.set(sprW * s, sprH * s, 1);

				const bob = entry.baseLayer.bob;
				const bobTheta = bob ? (performance.now() / 1000) * (bob.speed ?? 2) + (bob.phase ?? 0) : 0;
				const bobX = bob ? (bob.amplitudeX ?? 0) * Math.sin(bobTheta) : 0;
				const bobY = bob ? (bob.amplitudeY ?? 0) * (1 + Math.sin(bobTheta)) : 0;

				entry.mesh.position.set(
					(entry.baseLayer.offsetX ?? 0) + bobX,
					(entry.baseLayer.offsetY ?? 0) + bobY + (sprH * (s - 1) * 0.5),
					(entry.baseLayer.offsetZ ?? 0) + entry.layerIndex * 0.03,	// was 0.001 but occasionally order was observed to be wrong
					// 0.03 is the smallest number observed to correctly work. no idea why.
				);
			}
		},

		getPickObject() {
			return pickMesh;
		},

		setVisible(visible: boolean) {
			group.visible = visible;
		},

		setLayerTile(tileSize: number, layerIndex: number, tile: string) {
			const entry = layerEntries[layerIndex];
			if (!entry) return;

			entry.baseLayer.tile = tile;
			const rect = getRect(tile);
			const mat = entry.mesh.material as THREE.ShaderMaterial;
			mat.uniforms.uUvX!.value = rect.x;
			mat.uniforms.uUvY!.value = rect.y;
			mat.uniforms.uUvW!.value = rect.w;
			mat.uniforms.uUvH!.value = rect.h;
			opaqueBounds = computeOpaqueBounds(tileSize, spriteMap, packedAtlas, resolver);
		},

		dispose() {
			scene.remove(group);
			for (const entry of layerEntries) {
				entry.mesh.geometry.dispose();
				(entry.mesh.material as THREE.Material).dispose();
			}
		},
	};
}
