import * as THREE from "three";
/**
 * basicLighting.ts
 *
 * Minimal Three.js shader chunks for atlas and object rendering.
 * No torch flicker, no tint bands — just texture sampling + linear fog.
 */
/**
 * Atlas vertex shader.
 * Handles aTileId UV lookup, aHeightOffset, and fog distance.
 */
export declare const BASIC_ATLAS_VERT = "\nattribute float aUvX;\nattribute float aUvY;\nattribute float aUvW;\nattribute float aUvH;\nattribute float aHeightOffset;\nattribute float aUvRotation;\n// 1.0 = full tile; < 1.0 = show only that fraction of the tile, top-aligned.\n// Used for partial-height skirt panels so bricks keep their aspect ratio.\nattribute float aUvHeightScale;\n// Per-instance grid cell coordinates \u2014 used to look up the overlay texture.\nattribute float aCellX;\nattribute float aCellZ;\n\nuniform vec2 uDungeonSize;\n\nvarying vec2  vAtlasUv;\nvarying vec2  vTileOrigin;\nvarying vec2  vTileSize;\nvarying vec2  vLocalUv;\nvarying vec2  vOverlayUv;\nvarying float vFogDist;\n\nvoid main() {\n  // Scale face height dimension BEFORE rotation so it always affects the\n  // physical height axis of the face, regardless of UV rotation.\n  float hs = clamp(aUvHeightScale, 0.0, 1.0);\n  vec2 localUv = vec2(uv.x, uv.y * hs);\n\n  // Rotate UV within tile bounds (0=0\u00B0, 1=90\u00B0CCW, 2=180\u00B0, 3=270\u00B0CCW).\n  int iRot = int(floor(aUvRotation + 0.5));\n  if (iRot == 1)      localUv = vec2(localUv.y, 1.0 - localUv.x);\n  else if (iRot == 2) localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);\n  else if (iRot == 3) localUv = vec2(1.0 - localUv.y, localUv.x);\n\n  vLocalUv   = localUv;\n  vOverlayUv = (vec2(aCellX, aCellZ) + 0.5) / uDungeonSize;\n\n  vTileOrigin = vec2(aUvX, aUvY);\n  vTileSize   = vec2(aUvW, aUvH);\n  vAtlasUv    = vTileOrigin + localUv * vTileSize;\n\n  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);\n  worldPos.y   += aHeightOffset;\n\n  vec4 eyePos = viewMatrix * worldPos;\n  vFogDist    = length(eyePos.xyz);\n\n  gl_Position = projectionMatrix * eyePos;\n}\n";
/**
 * Atlas fragment shader.
 * Samples the tile atlas and applies linear fog. No torch effects.
 */
export declare const BASIC_ATLAS_FRAG = "\nuniform sampler2D uAtlas;\nuniform vec2  uTexelSize;\nuniform vec3  uFogColor;\nuniform float uFogNear;\nuniform float uFogFar;\n\n// Surface painter overlay system.\n// uOverlayLookup: W\u00D7H Uint8 RGBA texture \u2014 each channel holds one overlay tile ID (0 = none).\n// uTileUvLookup:  1D float RGBA texture  \u2014 index = tile ID, value = (uvX, uvY, uvW, uvH).\nuniform sampler2D uOverlayLookup;\nuniform sampler2D uTileUvLookup;\nuniform float     uTileUvCount;\n// Per-cell skirt overlay slots (RGBA: 4 tile IDs, same encoding as uOverlayLookup). 1\u00D71 zero by default (no-op).\nuniform sampler2D uSkirtLookup;\n\nvarying vec2  vAtlasUv;\nvarying vec2  vTileOrigin;\nvarying vec2  vTileSize;\nvarying vec2  vLocalUv;\nvarying vec2  vOverlayUv;\nvarying float vFogDist;\n\nvec4 sampleOverlayTile(float id) {\n  vec2 luv = vec2((id + 0.5) / uTileUvCount, 0.5);\n  vec4 tr  = texture2D(uTileUvLookup, luv);\n  vec2 ov  = clamp(\n    tr.xy + vLocalUv * tr.zw,\n    tr.xy + uTexelSize * 0.5,\n    tr.xy + tr.zw    - uTexelSize * 0.5\n  );\n  return texture2D(uAtlas, ov);\n}\n\nvoid main() {\n  vec2 uvMin   = vTileOrigin + uTexelSize * 0.5;\n  vec2 uvMax   = vTileOrigin + vTileSize  - uTexelSize * 0.5;\n  vec2 atlasUv = clamp(vAtlasUv, uvMin, uvMax);\n\n  vec4 color = texture2D(uAtlas, atlasUv);\n  if (color.a < 0.01) discard;\n\n  // Sample the per-cell overlay slot texture (4 slots packed into RGBA).\n  vec4 slots = texture2D(uOverlayLookup, vOverlayUv);\n\n  float id0 = floor(slots.r * 255.0 + 0.5);\n  if (id0 > 0.5) { vec4 oc = sampleOverlayTile(id0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  float id1 = floor(slots.g * 255.0 + 0.5);\n  if (id1 > 0.5) { vec4 oc = sampleOverlayTile(id1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  float id2 = floor(slots.b * 255.0 + 0.5);\n  if (id2 > 0.5) { vec4 oc = sampleOverlayTile(id2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  float id3 = floor(slots.a * 255.0 + 0.5);\n  if (id3 > 0.5) { vec4 oc = sampleOverlayTile(id3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  // Per-cell skirt overlay slots (4 slots, same encoding as surface painter overlays).\n  vec4 skirtSlots = texture2D(uSkirtLookup, vOverlayUv);\n  float sk0 = floor(skirtSlots.r * 255.0 + 0.5);\n  if (sk0 > 0.5) { vec4 oc = sampleOverlayTile(sk0); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n  float sk1 = floor(skirtSlots.g * 255.0 + 0.5);\n  if (sk1 > 0.5) { vec4 oc = sampleOverlayTile(sk1); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n  float sk2 = floor(skirtSlots.b * 255.0 + 0.5);\n  if (sk2 > 0.5) { vec4 oc = sampleOverlayTile(sk2); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n  float sk3 = floor(skirtSlots.a * 255.0 + 0.5);\n  if (sk3 > 0.5) { vec4 oc = sampleOverlayTile(sk3); color.rgb = mix(color.rgb, oc.rgb, oc.a); }\n\n  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);\n  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);\n}\n";
/**
 * Vertex shader for textured 3-D objects (GLB/FBX models).
 * Outputs vUv and vFogDist for use with BASIC_OBJECT_FRAG.
 */
export declare const BASIC_OBJECT_VERT = "\nvarying vec2  vUv;\nvarying float vFogDist;\n\nvoid main() {\n  vUv = uv;\n  vec4 worldPos = modelMatrix * vec4(position, 1.0);\n  vec4 eyePos   = viewMatrix * worldPos;\n  vFogDist      = length(eyePos.xyz);\n  gl_Position   = projectionMatrix * eyePos;\n}\n";
/**
 * Fragment shader for textured 3-D objects (GLB/FBX models).
 * Samples uMap and applies linear fog.
 */
export declare const BASIC_OBJECT_FRAG = "\nuniform sampler2D uMap;\nuniform vec3  uFogColor;\nuniform float uFogNear;\nuniform float uFogFar;\n\nvarying vec2  vUv;\nvarying float vFogDist;\n\nvoid main() {\n  vec4 color = texture2D(uMap, vUv);\n  if (color.a < 0.01) discard;\n\n  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);\n  gl_FragColor = vec4(mix(color.rgb, uFogColor, fogFactor), color.a);\n}\n";
/**
 * Build Three.js uniform objects for the basic atlas ShaderMaterial.
 * Overlay uniforms are optional — when omitted a 1×1 zero-filled default
 * texture is used, which disables the overlay pass at zero cost.
 */
export declare function makeBasicAtlasUniforms(params: {
    atlas: THREE.Texture;
    texelSize: THREE.Vector2;
    fogColor: THREE.Color;
    fogNear: number;
    fogFar: number;
    /** 1D float DataTexture mapping tile ID → (uvX, uvY, uvW, uvH). */
    tileUvLookup?: THREE.Texture;
    /** Number of tiles in tileUvLookup (width of the 1D texture). */
    tileUvCount?: number;
    /** W×H Uint8 RGBA DataTexture: each channel = overlay slot tile ID (0 = none). */
    overlayLookup?: THREE.Texture;
    /** W×H Uint8 RGBA DataTexture for per-cell skirt tile overrides (R=N,G=S,B=E,A=W). */
    skirtLookup?: THREE.Texture;
    /** Dungeon grid dimensions (width, height). Used by vertex shader. */
    dungeonSize?: THREE.Vector2;
}): Record<string, {
    value: unknown;
}>;
//# sourceMappingURL=basicLighting.d.ts.map