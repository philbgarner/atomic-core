import * as THREE from "three";
/**
 * Shared GLSL torch lighting chunks.
 *
 * Each shader that uses these must also declare:
 *   uniform vec3  uFogColor;
 *   varying float vFogDist;
 *   varying vec2  vWorldPos;
 */
/** Uniform declarations - paste before main(). */
export declare const TORCH_UNIFORMS_GLSL = "\nuniform float uFogNear;\nuniform float uFogFar;\nuniform float uBandNear;   // distance at which brightness falloff begins (\u2265 uFogNear)\nuniform float uTime;\nuniform vec3  uTint0;      // distance band 0 (closest)\nuniform vec3  uTint1;      // distance band 1\nuniform vec3  uTint2;      // distance band 2\nuniform vec3  uTint3;      // distance band 3 (farthest lit)\nuniform vec3  uTorchColor;     // additive torch tint\nuniform float uTorchIntensity; // global scale for the additive torch (0\u20132)\n";
/** Spatial hash helper - required by TORCH_FNS_GLSL. */
export declare const TORCH_HASH_GLSL = "\nfloat hash(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n}\n";
/**
 * Two lighting functions for use in main():
 *
 *   float band = torchBand(flickerRadius);
 *     Quantised distance band: 0 = closest, 4 = fog.
 *
 *   vec3 lit = applyTorchLighting(baseColor, band);
 *     Multiply grayscale distance falloff + additive yellow torch fill.
 *     Does NOT apply fog - caller finishes with:
 *       mix(lit, uFogColor, step(4.0, band))
 *
 * Pass baseColor with any surface shading (e.g. bumpShade) already folded in.
 */
export declare const TORCH_FNS_GLSL = "\nfloat torchBand(float flickerRadius) {\n  float raw = sin(uTime * 7.0)  * 0.45\n            + sin(uTime * 13.7) * 0.35\n            + sin(uTime * 3.1)  * 0.20;\n  float flicker = (floor(raw * 1.5 + 0.5)) / 6.0;\n  float dist = clamp((vFogDist - uBandNear) / (uFogFar - uBandNear), 0.0, 1.0);\n  float flickeredDist = clamp(dist + flicker * flickerRadius, 0.0, 1.0);\n  return floor(pow(flickeredDist, 0.75) * 5.0);\n}\n\nvec3 applyTorchLighting(vec3 baseColor, float band) {\n  float timeSlot = floor(uTime * 1.5);\n  vec2 cell = floor(vWorldPos * 0.5);\n  float spatialNoise = hash(cell + vec2(timeSlot * 7.3, timeSlot * 3.1));\n  float turb = (floor(spatialNoise * 3.0) / 3.0) * 0.18;\n\n  // Multiply: grayscale distance falloff\n  float brightness;\n  vec3  tint;\n  if (band < 1.0) {\n    brightness = 1.00 - turb; tint = uTint0;\n  } else if (band < 2.0) {\n    brightness = 0.55;        tint = uTint1;\n  } else if (band < 3.0) {\n    brightness = 0.22;        tint = uTint2;\n  } else if (band < 4.0) {\n    brightness = 0.10;        tint = uTint3;\n  } else {\n    brightness = 0.00;        tint = vec3(1.0);\n  }\n\n  vec3 lit = baseColor * tint * brightness;\n\n  // Additive torch: nearest two bands only, scaled by intensity\n  float torchAdd = (band < 1.0) ? 0.250 :\n                   (band < 2.0) ? 0.200 : 0.0;\n  lit += uTorchColor * (torchAdd * uTorchIntensity);\n\n  return lit;\n}\n";
/**
 * Vertex shader for textured 3-D objects (GLB/FBX models).
 * Outputs vUv, vFogDist, vWorldPos for use with TORCH_OBJECT_FRAG.
 */
export declare const TORCH_OBJECT_VERT = "\nvarying vec2  vUv;\nvarying float vFogDist;\nvarying vec2  vWorldPos;\n\nvoid main() {\n  vUv = uv;\n  vec4 worldPos = modelMatrix * vec4(position, 1.0);\n  vWorldPos = worldPos.xz;\n  vec4 eyePos = viewMatrix * worldPos;\n  vFogDist = length(eyePos.xyz);\n  gl_Position = projectionMatrix * eyePos;\n}\n";
/**
 * Fragment shader for textured 3-D objects (GLB/FBX models).
 * Samples uMap, applies torch lighting + fog.
 * Requires uniforms: uMap (sampler2D), uFogColor (vec3), + TORCH_UNIFORMS_GLSL set.
 */
export declare const TORCH_OBJECT_FRAG = "\nuniform sampler2D uMap;\nuniform vec3  uFogColor;\n\nuniform float uFogNear;\nuniform float uFogFar;\nuniform float uBandNear;   // distance at which brightness falloff begins (\u2265 uFogNear)\nuniform float uTime;\nuniform vec3  uTint0;      // distance band 0 (closest)\nuniform vec3  uTint1;      // distance band 1\nuniform vec3  uTint2;      // distance band 2\nuniform vec3  uTint3;      // distance band 3 (farthest lit)\nuniform vec3  uTorchColor;     // additive torch tint\nuniform float uTorchIntensity; // global scale for the additive torch (0\u20132)\n\n\nvarying vec2  vUv;\nvarying float vFogDist;\nvarying vec2  vWorldPos;\n\n\nfloat hash(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n}\n\n\nfloat torchBand(float flickerRadius) {\n  float raw = sin(uTime * 7.0)  * 0.45\n            + sin(uTime * 13.7) * 0.35\n            + sin(uTime * 3.1)  * 0.20;\n  float flicker = (floor(raw * 1.5 + 0.5)) / 6.0;\n  float dist = clamp((vFogDist - uBandNear) / (uFogFar - uBandNear), 0.0, 1.0);\n  float flickeredDist = clamp(dist + flicker * flickerRadius, 0.0, 1.0);\n  return floor(pow(flickeredDist, 0.75) * 5.0);\n}\n\nvec3 applyTorchLighting(vec3 baseColor, float band) {\n  float timeSlot = floor(uTime * 1.5);\n  vec2 cell = floor(vWorldPos * 0.5);\n  float spatialNoise = hash(cell + vec2(timeSlot * 7.3, timeSlot * 3.1));\n  float turb = (floor(spatialNoise * 3.0) / 3.0) * 0.18;\n\n  // Multiply: grayscale distance falloff\n  float brightness;\n  vec3  tint;\n  if (band < 1.0) {\n    brightness = 1.00 - turb; tint = uTint0;\n  } else if (band < 2.0) {\n    brightness = 0.55;        tint = uTint1;\n  } else if (band < 3.0) {\n    brightness = 0.22;        tint = uTint2;\n  } else if (band < 4.0) {\n    brightness = 0.10;        tint = uTint3;\n  } else {\n    brightness = 0.00;        tint = vec3(1.0);\n  }\n\n  vec3 lit = baseColor * tint * brightness;\n\n  // Additive torch: nearest two bands only, scaled by intensity\n  float torchAdd = (band < 1.0) ? 0.250 :\n                   (band < 2.0) ? 0.200 : 0.0;\n  lit += uTorchColor * (torchAdd * uTorchIntensity);\n\n  return lit;\n}\n\n\nvoid main() {\n  vec4 color = texture2D(uMap, vUv);\n  if (color.a < 0.01) discard;\n\n  float band = torchBand(0.03);\n  vec3 lit = applyTorchLighting(color.rgb, band);\n  gl_FragColor = vec4(mix(lit, uFogColor, step(4.0, band)), color.a);\n}\n";
/**
 * Distance (world units) at which brightness falloff begins.
 * Everything closer than this is band 0 (full brightness, uTint0).
 * With tileSize=3 this keeps ~2 cells in front of the player fully lit.
 */
export declare const DEFAULT_BAND_NEAR = 8;
/** Warm yellow additive torch colour. */
export declare const DEFAULT_TORCH_COLOR: THREE.Color;
/** Default torch intensity multiplier. */
export declare const DEFAULT_TORCH_INTENSITY = 0.33;
/** Same colour as a CSS hex string, for localStorage / HTML input[type=color]. */
export declare const DEFAULT_TORCH_HEX: string;
/**
 * Default grayscale distance bands: white → gray → darker gray → ~25% gray.
 * The additive torch layer handles the warm colour; these stay neutral.
 */
export declare const DEFAULT_TINT_COLORS: readonly [
    THREE.Color,
    THREE.Color,
    THREE.Color,
    THREE.Color
];
export type TorchConfig = {
    bandNear: number;
    torchColor: THREE.Color;
    torchIntensity: number;
    torchHex: string;
    tintColors: readonly [THREE.Color, THREE.Color, THREE.Color, THREE.Color];
};
/**
 * Default torch configuration object.
 * All values are overridable via the `rendering.torch` option in `createGame()`.
 */
export declare const defaultTorchConfig: TorchConfig;
/**
 * Build Three.js uniform objects for the torch lighting uniforms.
 * Pass a partial `TorchConfig` to override individual values; falls back to
 * `defaultTorchConfig` for anything not provided.
 */
export declare function makeTorchUniforms(config?: Partial<TorchConfig>): Record<string, {
    value: THREE.Color | number;
}>;
//# sourceMappingURL=torchLighting.d.ts.map