import { UvRect } from './textureLoader';
import * as THREE from "three";
export declare const HALF_PI: number;
/**
 * Compute per-corner AO for one face, returned as [tl, tr, bl, br] in [0,1].
 * Corners map to face-local UV space: tl=UV(0,1), tr=UV(1,1), bl=UV(0,0), br=UV(1,0).
 * For wall faces the top and bottom of each column share the same value.
 * UV orientation per direction is derived from the face rotation used in buildDungeon.
 */
export declare function computeFaceAO(isSol: (x: number, z: number) => boolean, cx: number, cz: number, dir: "floor" | "ceil" | "north" | "south" | "east" | "west"): [number, number, number, number];
/**
 * Per-corner AO for a vertical skirt face (floor-step or ceiling-step panel).
 * Skirts face AWAY from the current cell toward the lower/higher neighbour,
 * so their UV x-axis is mirrored relative to the matching wall direction.
 * Returns [tl, tr, bl, br] in [0,1].
 */
export declare function computeSkirtFaceAO(isSol: (x: number, z: number) => boolean, cx: number, cz: number, dir: "north" | "south" | "east" | "west"): [number, number, number, number];
export declare function makeFaceMatrix(x: number, y: number, z: number, rx: number, ry: number, rz: number, w: number, h: number): THREE.Matrix4;
/**
 * Build a PlaneGeometry with a pre-allocated aTileId InstancedBufferAttribute,
 * and an InstancedMesh using either a ShaderMaterial (atlas) or a plain material.
 */
export declare function buildInstancedMesh(matrices: THREE.Matrix4[], uvRects: UvRect[], material: THREE.Material, useAtlas: boolean, heightOffsets?: Float32Array, uvRotations?: number[], uvHeightScales?: number[], cellX?: Float32Array, cellZ?: Float32Array, aoCorners?: Float32Array, faceNormals?: Float32Array, rowIndexes?: number[], uvOffsets?: number[]): THREE.InstancedMesh;
//# sourceMappingURL=atlasGeometry.d.ts.map