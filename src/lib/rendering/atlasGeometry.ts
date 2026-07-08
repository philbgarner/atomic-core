// src/lib/rendering/atlasGeometry.ts
//
// Shared atlas-shader geometry helpers used by both the main dungeon renderer
// (walls/floors/ceilings) and any renderer extension that needs to build
// geometry lit identically to walls (e.g. doorRenderer.ts). Split out from
// dungeonRenderer.ts so both can import it without a circular dependency.

import * as THREE from "three";
import type { UvRect } from "./textureLoader";

export const HALF_PI = Math.PI / 2;

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
export function computeFaceAO(
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
  // Walls: s2 is the solid cell behind the wall. For a real wall face this is
  // always true by construction (the face only exists because that neighbour
  // is solid), so checking it explicitly is a no-op there — but it must be a
  // real check (not a hardcoded `true`) so this same function stays correct
  // for faces with no solid neighbour in that direction, e.g. a door frame
  // spanning an opening, where s2 is genuinely false.
  // Only horizontal neighbors vary; top/bottom of each column share the same AO value.
  if (dir === "north") {
    // ry=0: UV x≈0 → world left (cx side), UV x≈1 → world right ((cx+1) side)
    const s2 = n(cx, cz - 1);
    const aoL = vertexAO(n(cx - 1, cz), s2, n(cx - 1, cz - 1)) / 3;
    const aoR = vertexAO(n(cx + 1, cz), s2, n(cx + 1, cz - 1)) / 3;
    return [aoL, aoR, aoL, aoR];
  }
  if (dir === "south") {
    // ry=π: UV x≈0 → world right ((cx+1) side), UV x≈1 → world left (cx side)
    const s2 = n(cx, cz + 1);
    const aoR = vertexAO(n(cx + 1, cz), s2, n(cx + 1, cz + 1)) / 3;
    const aoL = vertexAO(n(cx - 1, cz), s2, n(cx - 1, cz + 1)) / 3;
    return [aoR, aoL, aoR, aoL];
  }
  if (dir === "west") {
    // ry=+π/2: UV x≈0 → world south ((cz+1) side), UV x≈1 → world north (cz side)
    const s2 = n(cx - 1, cz);
    const aoS = vertexAO(n(cx, cz + 1), s2, n(cx - 1, cz + 1)) / 3;
    const aoN = vertexAO(n(cx, cz - 1), s2, n(cx - 1, cz - 1)) / 3;
    return [aoS, aoN, aoS, aoN];
  }
  if (dir === "east") {
    // ry=-π/2: UV x≈0 → world north (cz side), UV x≈1 → world south ((cz+1) side)
    const s2 = n(cx + 1, cz);
    const aoN = vertexAO(n(cx, cz - 1), s2, n(cx + 1, cz - 1)) / 3;
    const aoS = vertexAO(n(cx, cz + 1), s2, n(cx + 1, cz + 1)) / 3;
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
export function computeSkirtFaceAO(
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

export function makeFaceMatrix(
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
export function buildInstancedMesh(
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
    geo.setAttribute(
      "aUvRect",
      new THREE.InstancedBufferAttribute(uvRectArr, 4),
    );

    // aSurface (vec4, 1 slot): .x=heightOffset, .y=uvRotation, .z=uvHeightScale.
    const surfaceArr = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      surfaceArr[i * 4] = 0; // was heightOffsets ? (heightOffsets[i] ?? 0) : 0; we now bake offset into the mesh so raycasting works correctly
      surfaceArr[i * 4 + 1] = uvRotations ? (uvRotations[i] ?? 0) : 0;
      surfaceArr[i * 4 + 2] = uvHeightScales ? (uvHeightScales[i] ?? 1.0) : 1.0;
      surfaceArr[i * 4 + 3] = uvOffsets ? (uvOffsets[i] ?? 0.0) : 0.0;
    }
    geo.setAttribute(
      "aSurface",
      new THREE.InstancedBufferAttribute(surfaceArr, 4),
    );

    // aAoCorners (vec4, 1 slot): [tl, tr, bl, br] in [0,1]; all-ones = fully lit.
    const aoArr = aoCorners ?? new Float32Array(n * 4).fill(1.0);
    geo.setAttribute(
      "aAoCorners",
      new THREE.InstancedBufferAttribute(aoArr, 4),
    );

    // aCellFace (vec4, 1 slot): .xy=grid cell (col,row), .zw=XZ outward face normal.
    const cellFaceArr = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      cellFaceArr[i * 4] = cellX ? (cellX[i] ?? 0) : 0;
      cellFaceArr[i * 4 + 1] = cellZ ? (cellZ[i] ?? 0) : 0;
      cellFaceArr[i * 4 + 2] = faceNormals ? (faceNormals[i * 2] ?? 0) : 0;
      cellFaceArr[i * 4 + 3] = faceNormals ? (faceNormals[i * 2 + 1] ?? 0) : 0;
    }
    geo.setAttribute(
      "aCellFace",
      new THREE.InstancedBufferAttribute(cellFaceArr, 4),
    );

    // aRowIndex (float, 1 slot): per-panel row index for uBaseOverride lookup.
    const rowArr = new Float32Array(n);
    if (rowIndexes) {
      for (let i = 0; i < n; i++) rowArr[i] = rowIndexes[i] ?? 0;
    }
    geo.setAttribute(
      "aRowIndex",
      new THREE.InstancedBufferAttribute(rowArr, 1),
    );
  }

  const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
