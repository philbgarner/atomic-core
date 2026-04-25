import * as THREE from "three";

/**
 * basicLighting.ts
 *
 * GLSL shader chunks for the dungeon atlas renderer. Two lighting passes run
 * in sequence in the fragment shader, both always active when an atlas is used:
 *
 *   1. Ambient occlusion (AO) — baked per-face corner values darken geometry
 *      where walls, floors, and ceilings meet. Intensity is controlled by the
 *      uAoIntensity uniform (0 = disabled, 1 = maximum darkening). Set via
 *      ambientOcclusion option on createDungeonRenderer.
 *
 *   2. Directional surface lighting — a per-surface brightness multiplier that
 *      makes depth and orientation readable without dynamic lights:
 *        - Walls: 0.9–1.1, scaled by abs(dot(face_normal, camera_forward)).
 *          Walls you face head-on are brighter (1.1); side walls are darker (0.9).
 *        - Floor: fixed 0.85
 *        - Ceiling: fixed 0.95
 *      This is always on; there is no runtime toggle.
 *
 * WebGL attribute slot budget: 16 total.
 *   Built-ins used by Three.js InstancedMesh:
 *     position (1) + uv (1) + instanceMatrix/mat4 (4) = 6
 *   Custom attributes below = 10 → total 16, exactly at the limit.
 *   Do not add more attributes without removing or repacking existing ones.
 */

/**
 * Atlas vertex shader.
 *
 * Responsibilities (in order):
 *   1. Clip UV height for partial-height skirt panels (aUvHeightScale).
 *   2. Select the AO corner value for this vertex from aAoCorners.
 *   3. Rotate the tile UV in 90° steps (aUvRotation).
 *   4. Map local UV into the atlas rect (aUvX/Y/W/H).
 *   5. Compute cell-relative overlay UV (aCell / uDungeonSize).
 *   6. Apply height offset in world space (aHeightOffset).
 *   7. Compute vFacingLight: fixed for floors/ceilings, dot-product for walls.
 *   8. Output fog distance as eye-space length.
 */
export const BASIC_ATLAS_VERT = /* glsl */ `
// ── Per-instance atlas UV rect ────────────────────────────────────────────────
// The atlas is divided into tiles; these four floats define the UV-space rect
// [aUvX, aUvY] + [aUvW, aUvH] of the tile assigned to this instance.
attribute float aUvX;
attribute float aUvY;
attribute float aUvW;
attribute float aUvH;

// ── Per-instance geometry offsets ────────────────────────────────────────────
// World-space Y offset applied after the instance matrix transform.
// Used to shift floors and ceilings to their height-offset positions.
attribute float aHeightOffset;

// UV rotation index: 0=0°, 1=90°CCW, 2=180°, 3=270°CCW.
// Applied after height-scale clipping so rotation never fights the clip axis.
attribute float aUvRotation;

// Fraction of the tile height to show, top-aligned (1.0 = full tile).
// Skirt panels at step edges show only the top portion so brick rows stay
// correctly sized rather than stretching to fill a partial panel.
attribute float aUvHeightScale;

// ── Per-instance overlay / lighting data ─────────────────────────────────────
// Grid cell (column, row) for this instance. Used to compute the UV into
// uOverlayLookup so the surface-painter overlay is sampled at the right cell.
// Packed as vec2 to stay within the 16-attribute WebGL slot limit.
attribute vec2 aCell;

// Pre-baked ambient-occlusion corner values in face-local UV order:
//   .x = top-left (uv 0,1), .y = top-right (uv 1,1)
//   .z = bot-left (uv 0,0), .w = bot-right (uv 1,0)
// Each component in [0,1]: 1 = fully lit, 0 = fully occluded.
// Computed once at dungeon-build time from the solid map; see computeFaceAO().
// Floors/ceilings use 8-neighbour sampling; walls use the two horizontal
// neighbours on each side. Skirt faces default to 1.0 (always fully lit).
attribute vec4 aAoCorners;

// XZ components of this face's outward unit normal, world space.
// Non-zero only for wall faces (set in buildInstancedMesh):
//   North wall (faces +Z): (0,  1)   South wall (faces -Z): ( 0, -1)
//   West  wall (faces +X): (1,  0)   East  wall (faces -X): (-1,  0)
// Floor/ceiling instances carry (0,0) — they use uSurfaceLight directly.
// Packed as vec2 to stay within the 16-attribute WebGL slot limit.
attribute vec2 aFaceN;

// ── Uniforms ──────────────────────────────────────────────────────────────────
// Width and height of the dungeon grid in cells. Used to normalise aCell
// into [0,1] UV space for the overlay lookup texture.
uniform vec2 uDungeonSize;

// Camera forward direction projected onto the XZ plane, updated every RAF tick.
// Computed in dungeonRenderer.ts as (-sin(curYaw), -cos(curYaw)).
// Only read by the directional-lighting branch (uSurfaceLight < 0).
uniform vec2 uCamDir;

// Directional surface lighting mode per material:
//   >= 0 : fixed brightness multiplier applied to all pixels on this surface
//           (floor = 0.85, ceiling = 0.95)
//    < 0 : use the camera-angle formula for walls/skirts:
//           brightness = 0.9 + abs(dot(aFaceN, uCamDir)) * 0.2
//           → wall facing camera: ~1.1   side wall: ~0.9
uniform float uSurfaceLight;

// ── Varyings ──────────────────────────────────────────────────────────────────
varying vec2  vAtlasUv;     // Final atlas UV after rect mapping + rotation
varying vec2  vTileOrigin;  // Top-left corner of the atlas tile rect (for clamping)
varying vec2  vTileSize;    // Width/height of the atlas tile rect (for clamping)
varying vec2  vLocalUv;     // Local UV within the tile [0,1]² after rotation
varying vec2  vOverlayUv;   // UV into the overlay lookup texture
varying float vFogDist;     // Eye-space distance used for linear fog
varying float vAo;          // Interpolated AO value for this fragment [0,1]
varying float vFacingLight; // Directional surface brightness multiplier

void main() {
  // ── 1. Clip UV height for partial skirt panels ─────────────────────────────
  // Scale the Y axis of the UV BEFORE any rotation so the clip always acts on
  // the physical vertical axis of the face, regardless of rotation.
  float hs = clamp(aUvHeightScale, 0.0, 1.0);
  vec2 localUv = vec2(uv.x, uv.y * hs);

  // ── 2. Select per-corner AO value for this vertex ─────────────────────────
  // aAoCorners stores one float per corner in face-local UV space.
  // We select by raw (pre-rotation) UV quadrant so corners stay consistent
  // across all rotation modes. The GPU then interpolates vAo between vertices.
  if      (uv.x < 0.5 && uv.y >= 0.5) vAo = aAoCorners.x; // top-left
  else if (uv.x >= 0.5 && uv.y >= 0.5) vAo = aAoCorners.y; // top-right
  else if (uv.x < 0.5 && uv.y <  0.5) vAo = aAoCorners.z; // bottom-left
  else                                  vAo = aAoCorners.w; // bottom-right

  // ── 3. Rotate UV within the tile (0=0°, 1=90°CCW, 2=180°, 3=270°CCW) ──────
  int iRot = int(floor(aUvRotation + 0.5));
  if (iRot == 1)      localUv = vec2(localUv.y, 1.0 - localUv.x);
  else if (iRot == 2) localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);
  else if (iRot == 3) localUv = vec2(1.0 - localUv.y, localUv.x);

  vLocalUv = localUv;

  // ── 4. Map local UV into the atlas rect ────────────────────────────────────
  vTileOrigin = vec2(aUvX, aUvY);
  vTileSize   = vec2(aUvW, aUvH);
  vAtlasUv    = vTileOrigin + localUv * vTileSize;

  // ── 5. Overlay UV: cell-centre in normalised dungeon-grid space ────────────
  // Adding 0.5 moves from corner to centre of the cell so the lookup texture
  // is sampled at the right texel for this grid cell.
  vOverlayUv = (aCell + 0.5) / uDungeonSize;

  // ── 6. World position + height offset ─────────────────────────────────────
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  worldPos.y   += aHeightOffset;

  // ── 7. Fog distance (eye-space length) ────────────────────────────────────
  vec4 eyePos = viewMatrix * worldPos;
  vFogDist    = length(eyePos.xyz);

  // ── 8. Directional surface lighting ───────────────────────────────────────
  // For walls (uSurfaceLight < 0): brightness depends on how directly the wall
  // faces the camera. abs() makes back-facing walls identical to front-facing.
  //   dot = ±1 → wall is perpendicular to view → 0.9 + 0.2 = 1.1 (bright)
  //   dot =  0 → wall is parallel to view      → 0.9 + 0.0 = 0.9 (dim)
  // For flat surfaces: uSurfaceLight is the constant multiplier (floor=0.85,
  // ceiling=0.95) set at material creation time in dungeonRenderer.ts.
  if (uSurfaceLight < 0.0) {
    vFacingLight = 0.9 + abs(dot(aFaceN, uCamDir)) * 0.2;
  } else {
    vFacingLight = uSurfaceLight;
  }

  gl_Position = projectionMatrix * eyePos;
}
`;

/**
 * Atlas fragment shader.
 *
 * Rendering pipeline (in order):
 *   1. Base tile sample    — atlas texture at the rect mapped by the vertex shader.
 *   2. Surface-painter overlays — up to 4 overlay tile IDs blended over the base
 *      (walls, floors, ceilings separately via uOverlayLookup).
 *   3. Skirt overlays      — up to 4 additional overlay IDs for skirt/edge panels
 *      (uSkirtLookup, same RGBA encoding as the surface-painter lookup).
 *   4. Ambient occlusion   — corner-darkening via vAo × uAoIntensity.
 *   5. Directional lighting — surface-orientation brightness via vFacingLight.
 *   6. Fog                 — linear blend to uFogColor over [uFogNear, uFogFar].
 */
export const BASIC_ATLAS_FRAG = /* glsl */ `
// ── Uniforms ──────────────────────────────────────────────────────────────────
uniform sampler2D uAtlas;
// Half-texel size of the atlas texture, used to inset UV clamp bounds and
// prevent sampling the adjacent tile across a texel boundary.
uniform vec2  uTexelSize;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;

// Ambient occlusion intensity in [0,1].
//   0   = AO disabled (mix term is always 1.0; zero cost).
//   0.75 = default when ambientOcclusion: true.
//   1   = fully-occluded corners go black.
// Applied as: color *= mix(1 - uAoIntensity, 1.0, vAo)
uniform float uAoIntensity;

// ── Surface-painter overlay system ───────────────────────────────────────────
// Each grid cell can have up to 4 atlas tile IDs composited over the base tile.
// uOverlayLookup: W×H Uint8 RGBA DataTexture — one texel per dungeon cell.
//   Each RGBA channel encodes one overlay tile ID (0 = empty slot).
//   Separate textures exist for floor, wall, and ceiling surfaces.
// uTileUvLookup:  1D Float RGBA DataTexture — one texel per tile ID.
//   Each texel stores (uvX, uvY, uvW, uvH) for that tile in atlas UV space.
//   Indexed by tile ID; enables the overlay system to look up any tile's UV.
// uTileUvCount:   width of uTileUvLookup (= max tile ID + 1).
uniform sampler2D uOverlayLookup;
uniform sampler2D uTileUvLookup;
uniform float     uTileUvCount;

// Per-cell skirt overlay slots — same RGBA encoding as uOverlayLookup.
// Applied only to skirt/edge panel meshes via a separate lookup texture.
// Defaults to a 1×1 zero texture (no-op) when skirt overrides are not in use.
uniform sampler2D uSkirtLookup;

// ── Varyings (from vertex shader) ─────────────────────────────────────────────
varying vec2  vAtlasUv;     // Final atlas UV after rect mapping + rotation
varying vec2  vTileOrigin;  // Top-left of the atlas tile rect (for clamping)
varying vec2  vTileSize;    // Width/height of the atlas tile rect (for clamping)
varying vec2  vLocalUv;     // Local UV within the tile [0,1]² after rotation
varying vec2  vOverlayUv;   // UV into the overlay / skirt lookup textures
varying float vFogDist;     // Eye-space distance for fog
varying float vAo;          // Interpolated AO corner value [0,1]
varying float vFacingLight; // Directional surface brightness multiplier

// Look up tile ID's UV rect from the 1D tileUvLookup, then sample the atlas
// at vLocalUv within that rect. Used by the overlay composite passes.
vec4 sampleOverlayTile(float id) {
  // Centre-sample the 1D texture to avoid filtering artifacts on the boundary.
  vec2 luv = vec2((id + 0.5) / uTileUvCount, 0.5);
  vec4 tr  = texture2D(uTileUvLookup, luv); // (uvX, uvY, uvW, uvH)
  // Inset by half a texel on each edge to prevent bleeding from adjacent tiles.
  vec2 ov  = clamp(
    tr.xy + vLocalUv * tr.zw,
    tr.xy + uTexelSize * 0.5,
    tr.xy + tr.zw    - uTexelSize * 0.5
  );
  return texture2D(uAtlas, ov);
}

void main() {
  // ── 1. Base tile sample ────────────────────────────────────────────────────
  // Clamp to the tile's texel-inset bounds to prevent bleed from adjacent tiles.
  vec2 uvMin   = vTileOrigin + uTexelSize * 0.5;
  vec2 uvMax   = vTileOrigin + vTileSize  - uTexelSize * 0.5;
  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);

  vec4 color = texture2D(uAtlas, atlasUv);
  if (color.a < 0.01) discard;

  // ── 2. Surface-painter overlays (4 slots, RGBA-packed) ────────────────────
  // Each channel of the lookup texel is a tile ID (0 = no overlay for that slot).
  // IDs are stored as uint8 [0,255] in the texture and recovered via *255+0.5.
  vec4 slots = texture2D(uOverlayLookup, vOverlayUv);

  float id0 = floor(slots.r * 255.0 + 0.5);
  if (id0 > 0.5) { vec4 oc = sampleOverlayTile(id0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id1 = floor(slots.g * 255.0 + 0.5);
  if (id1 > 0.5) { vec4 oc = sampleOverlayTile(id1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id2 = floor(slots.b * 255.0 + 0.5);
  if (id2 > 0.5) { vec4 oc = sampleOverlayTile(id2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  float id3 = floor(slots.a * 255.0 + 0.5);
  if (id3 > 0.5) { vec4 oc = sampleOverlayTile(id3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  // ── 3. Skirt overlays (4 slots, same RGBA encoding) ───────────────────────
  // A separate lookup texture targets skirt/edge panels independently from
  // the main wall/floor/ceiling overlay, so skirt tile overrides don't bleed
  // onto the base surface.
  vec4 skirtSlots = texture2D(uSkirtLookup, vOverlayUv);
  float sk0 = floor(skirtSlots.r * 255.0 + 0.5);
  if (sk0 > 0.5) { vec4 oc = sampleOverlayTile(sk0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk1 = floor(skirtSlots.g * 255.0 + 0.5);
  if (sk1 > 0.5) { vec4 oc = sampleOverlayTile(sk1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk2 = floor(skirtSlots.b * 255.0 + 0.5);
  if (sk2 > 0.5) { vec4 oc = sampleOverlayTile(sk2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }
  float sk3 = floor(skirtSlots.a * 255.0 + 0.5);
  if (sk3 > 0.5) { vec4 oc = sampleOverlayTile(sk3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }

  // ── 4. Ambient occlusion ──────────────────────────────────────────────────
  // vAo=1 (open corner) → multiplier = 1.0 (no change).
  // vAo=0 (fully boxed corner) → multiplier = (1 - uAoIntensity).
  // At uAoIntensity=0 the term is always 1.0; the pass costs a single multiply.
  color.rgb *= mix(1.0 - uAoIntensity, 1.0, vAo);

  // ── 5. Directional surface lighting ───────────────────────────────────────
  // vFacingLight is computed per-vertex and interpolated:
  //   Floor:   0.85  (fixed, set by uSurfaceLight in floorMat)
  //   Ceiling: 0.95  (fixed, set by uSurfaceLight in ceilMat)
  //   Walls:   0.9 + abs(dot(face_normal, camera_forward)) * 0.2
  //              → perpendicular to camera: 1.1   side walls: 0.9
  color.rgb *= vFacingLight;

  // ── 6. Fog ────────────────────────────────────────────────────────────────
  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);
  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);
}
`;

/**
 * Vertex shader for textured 3-D objects (GLB/FBX models).
 * Outputs vUv and vFogDist for use with BASIC_OBJECT_FRAG.
 */
export const BASIC_OBJECT_VERT = /* glsl */ `
varying vec2  vUv;
varying float vFogDist;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 eyePos   = viewMatrix * worldPos;
  vFogDist      = length(eyePos.xyz);
  gl_Position   = projectionMatrix * eyePos;
}
`;

/**
 * Fragment shader for textured 3-D objects (GLB/FBX models).
 * Samples uMap and applies linear fog.
 */
export const BASIC_OBJECT_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec2  vUv;
varying float vFogDist;

void main() {
  vec4 color = texture2D(uMap, vUv);
  if (color.a < 0.01) discard;

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);
  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);
}
`;

/**
 * Build the Three.js uniform map for `BASIC_ATLAS_VERT` / `BASIC_ATLAS_FRAG`.
 *
 * All overlay and skirt params are optional; when omitted a 1×1 zero-filled
 * DataTexture is substituted so the overlay pass is a no-op at zero cost.
 *
 * The `surfaceLight` and `camDir` params drive the directional surface lighting
 * pass. Pass `surfaceLight >= 0` for flat surfaces (floor = 0.85, ceil = 0.95)
 * or `surfaceLight < 0` for wall/skirt materials that need the camera-angle
 * formula. `camDir` must be updated every frame for the wall formula to track
 * player rotation; it has no effect on flat-surface materials.
 */
export function makeBasicAtlasUniforms(params: {
  atlas: THREE.Texture;
  texelSize: THREE.Vector2;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  /** 1D Float RGBA DataTexture: index = tile ID, value = (uvX, uvY, uvW, uvH). */
  tileUvLookup?: THREE.Texture;
  /** Width of tileUvLookup (= max tile ID + 1). */
  tileUvCount?: number;
  /** W×H Uint8 RGBA DataTexture: each channel = overlay slot tile ID (0 = none). */
  overlayLookup?: THREE.Texture;
  /** W×H Uint8 RGBA DataTexture for per-cell skirt tile overrides. */
  skirtLookup?: THREE.Texture;
  /** Dungeon grid dimensions (width, height) in cells. */
  dungeonSize?: THREE.Vector2;
  /** AO darkening strength in [0,1]. 0 (default) = disabled. */
  aoIntensity?: number;
  /**
   * Camera forward direction projected onto the XZ plane.
   * Set to (-sin(yaw), -cos(yaw)) and updated every RAF tick.
   * Only consumed by wall/skirt materials (surfaceLight < 0).
   */
  camDir?: THREE.Vector2;
  /**
   * Directional surface lighting mode for this material:
   *   >= 0 : fixed brightness multiplier (floor = 0.85, ceiling = 0.95).
   *    < 0 : use the camera-angle formula → walls facing camera are brighter.
   * Default: 1.0 (no effect — useful for layer/custom materials).
   */
  surfaceLight?: number;
}): Record<string, { value: unknown }> {
  const defaultTex = makeSinglePixelTex();
  return {
    uAtlas:          { value: params.atlas },
    uTexelSize:      { value: params.texelSize },
    uFogColor:       { value: params.fogColor },
    uFogNear:        { value: params.fogNear },
    uFogFar:         { value: params.fogFar },
    uAoIntensity:    { value: params.aoIntensity ?? 0 },
    uCamDir:         { value: params.camDir ?? new THREE.Vector2(0, -1) },
    uSurfaceLight:   { value: params.surfaceLight ?? 1.0 },
    uTileUvLookup:   { value: params.tileUvLookup ?? defaultTex },
    uTileUvCount:    { value: params.tileUvCount ?? 1 },
    uOverlayLookup:  { value: params.overlayLookup ?? defaultTex },
    uSkirtLookup:    { value: params.skirtLookup ?? defaultTex },
    uDungeonSize:    { value: params.dungeonSize ?? new THREE.Vector2(1, 1) },
  };
}

/** Returns a 1×1 transparent black DataTexture used as a no-op default. */
function makeSinglePixelTex(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
