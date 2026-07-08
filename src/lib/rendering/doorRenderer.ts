// src/lib/rendering/doorRenderer.ts
//
// Renders a DoorRecord as a double-sided frame/pane/frame "sandwich":
//
//   F|G
//   F|G
//   F|G
//
// F = frame facing side A, | = the sliding pane (double-sided), G = frame
// facing side B. Built with the exact atlas shader/material the caller's wall
// geometry uses (via the createFrameMaterial/createPaneMaterial factories
// supplied by dungeonRenderer.ts), so lighting, baked AO, and fog match
// adjacent wall faces exactly — unlike a hand-built billboard, which uses a
// simplified ambient+point-light-only shader.
//
// See dungeon/doors.ts for the DoorRecord/DoorVisual data model and the pure
// slide-progress math (computeDoorProgress).

import * as THREE from "three";
import type { DoorAnimState, DoorRecord } from "../dungeon/doors";
import { computeDoorProgress } from "../dungeon/doors";
import type { PackedAtlas, UvRect } from "./textureLoader";
import { spriteToUvRect } from "./textureLoader";
import { resolveTile } from "./tileAtlas";
import {
  HALF_PI,
  buildInstancedMesh,
  computeFaceAO,
  makeFaceMatrix,
} from "./atlasGeometry";

export interface DoorMeshDeps {
  scene: THREE.Scene;
  tileSize: number;
  ceilingHeight: number;
  packedAtlas: PackedAtlas | undefined;
  resolver: ((name: string) => number) | undefined;
  /** Solid-cell predicate, used to compute AO for the two frame faces. */
  isSolid: (x: number, z: number) => boolean;
  /** Build a single-sided atlas material shared by both frame faces. */
  createFrameMaterial: () => THREE.Material;
  /** Build a double-sided atlas material for the sliding pane. */
  createPaneMaterial: () => THREE.Material;
}

export interface DoorHandle {
  /** Advance the slide animation and re-sync from the live DoorRecord. Call every RAF frame. */
  update(now: number): void;
  /** Invisible pick target for raycasting (hover/click), matching the billboard pick-mesh pattern. */
  getPickObject(): THREE.Mesh;
  /** Remove meshes from the scene and release GPU resources. */
  dispose(): void;
}

type FaceDir = "north" | "south" | "east" | "west";

/**
 * Which two wall-style directions a door's frames face, derived from `yaw`.
 * By convention side A is the lower-coordinate neighbour (north/west) and
 * side B is the higher-coordinate neighbour (south/east) — `DoorVisual`'s
 * `frameTile`/`frameTileBack` map to A/B in that order.
 */
function axisDirs(yaw: number): { a: FaceDir; b: FaceDir } {
  const normalized = (((yaw % Math.PI) + Math.PI) % Math.PI);
  const isZFacing = normalized < Math.PI / 4 || normalized > (Math.PI * 3) / 4;
  return isZFacing ? { a: "north", b: "south" } : { a: "west", b: "east" };
}

/** Position/rotation/outward-normal for the wall-style boundary in `dir`, matching the main wall-emission convention exactly. */
function boundaryFor(
  dir: FaceDir,
  x: number,
  z: number,
  tileSize: number,
): { px: number; pz: number; ry: number; nx: number; nz: number } {
  switch (dir) {
    case "north":
      return { px: (x + 0.5) * tileSize, pz: z * tileSize, ry: 0, nx: 0, nz: 1 };
    case "south":
      return {
        px: (x + 0.5) * tileSize,
        pz: (z + 1) * tileSize,
        ry: Math.PI,
        nx: 0,
        nz: -1,
      };
    case "west":
      return { px: x * tileSize, pz: (z + 0.5) * tileSize, ry: HALF_PI, nx: 1, nz: 0 };
    case "east":
      return {
        px: (x + 1) * tileSize,
        pz: (z + 0.5) * tileSize,
        ry: -HALF_PI,
        nx: -1,
        nz: 0,
      };
  }
}

function tileUvRect(
  tile: string,
  packedAtlas: PackedAtlas | undefined,
  resolver: ((name: string) => number) | undefined,
): UvRect {
  const id = resolveTile(tile, resolver);
  const sprite = packedAtlas?.getById(id);
  return sprite ? spriteToUvRect(sprite) : { x: 0, y: 0, w: 0, h: 0 };
}

/**
 * How far each frame sits in front of the (centred) pane, along its own
 * outward normal — i.e. toward whichever side actually sees that frame.
 * Keeps the frame reliably drawing in front of the pane instead of flush
 * with (or behind) it, without pushing it all the way out to the cell edge.
 */
const FRAME_DEPTH_OFFSET = 0.1;

/** Build the renderable meshes for one door and return its control handle. */
export function createDoorMesh(door: DoorRecord, deps: DoorMeshDeps): DoorHandle {
  const { scene, tileSize, ceilingHeight, packedAtlas, resolver, isSolid } = deps;
  const wallMidY = ceilingHeight / 2;
  const { a: dirA, b: dirB } = axisDirs(door.yaw);
  const boundaryA = boundaryFor(dirA, door.x, door.z, tileSize);
  const boundaryB = boundaryFor(dirB, door.x, door.z, tileSize);
  const centerX = (door.x + 0.5) * tileSize;
  const centerZ = (door.z + 0.5) * tileSize;

  // Frame A + Frame B share one 2-instance InstancedMesh and one material —
  // only aUvRect/aAoCorners/aCellFace differ per-instance. Each frame is
  // centred on the door cell (same x/z as the pane) but nudged along its own
  // outward normal so it sits in front of the pane from its viewing side.
  const frameMatrices = [
    makeFaceMatrix(
      centerX + boundaryA.nx * FRAME_DEPTH_OFFSET,
      wallMidY,
      centerZ + boundaryA.nz * FRAME_DEPTH_OFFSET,
      0,
      boundaryA.ry,
      0,
      tileSize,
      ceilingHeight,
    ),
    makeFaceMatrix(
      centerX + boundaryB.nx * FRAME_DEPTH_OFFSET,
      wallMidY,
      centerZ + boundaryB.nz * FRAME_DEPTH_OFFSET,
      0,
      boundaryB.ry,
      0,
      tileSize,
      ceilingHeight,
    ),
  ];
  const frameUvRects = [
    tileUvRect(door.visual.frameTile, packedAtlas, resolver),
    tileUvRect(door.visual.frameTileBack ?? door.visual.frameTile, packedAtlas, resolver),
  ];
  const frameAo = new Float32Array(8);
  frameAo.set(computeFaceAO(isSolid, door.x, door.z, dirA), 0);
  frameAo.set(computeFaceAO(isSolid, door.x, door.z, dirB), 4);
  const frameCellX = new Float32Array([door.x, door.x]);
  const frameCellZ = new Float32Array([door.z, door.z]);
  const frameNormals = new Float32Array([
    boundaryA.nx,
    boundaryA.nz,
    boundaryB.nx,
    boundaryB.nz,
  ]);

  const frameMat = deps.createFrameMaterial();
  const frameMesh = buildInstancedMesh(
    frameMatrices,
    frameUvRects,
    frameMat,
    true,
    undefined,
    undefined,
    undefined,
    frameCellX,
    frameCellZ,
    frameAo,
    frameNormals,
  );
  scene.add(frameMesh);

  // Pane: single instance, double-sided, centred between the two frames, slides open/closed.
  const paneMat = deps.createPaneMaterial();
  const paneBasePos = new THREE.Vector3(centerX, wallMidY, centerZ);
  const paneQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, boundaryB.ry, 0));
  const paneScale = new THREE.Vector3(tileSize, ceilingHeight, 1);

  const paneMesh = buildInstancedMesh(
    [new THREE.Matrix4().compose(paneBasePos, paneQuat, paneScale)],
    [tileUvRect(currentPaneTile(door), packedAtlas, resolver)],
    paneMat,
    true,
    undefined,
    undefined,
    undefined,
    new Float32Array([door.x]),
    new Float32Array([door.z]),
    undefined,
    new Float32Array([boundaryB.nx, boundaryB.nz]),
  );
  scene.add(paneMesh);

  function currentPaneTile(d: DoorRecord): string {
    return d.locked ? (d.visual.paneTileLocked ?? d.visual.paneTile) : d.visual.paneTile;
  }

  // Slide axis/tangent for the pane's animated offset. Z-facing doors (north/south
  // pair) slide sideways along X when horizontal; X-facing doors slide along Z.
  const axis = door.visual.axis ?? "vertical";
  const slideDistance = door.visual.slideDistance ?? 1;
  const isZFacingAxis = dirA === "north" || dirA === "south";
  const tangentX = isZFacingAxis ? 1 : 0;
  const tangentZ = isZFacingAxis ? 0 : 1;

  let anim: DoorAnimState = {
    fromProgress: door.open ? 1 : 0,
    toOpen: door.open,
    startTime: performance.now(),
  };
  let lastOpen = door.open;
  let lastLocked = door.locked;

  // Invisible pick target — matches the billboard "invisible mask" pattern so
  // hover/click work without any dev-side plumbing.
  const pickMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
  pickMesh.visible = false;
  pickMesh.userData.entity = { id: door.id, x: door.x, z: door.z };
  pickMesh.position.copy(paneBasePos);
  pickMesh.quaternion.copy(paneQuat);
  pickMesh.scale.copy(paneScale);
  scene.add(pickMesh);

  function syncPaneTexture(): void {
    const rect = tileUvRect(currentPaneTile(door), packedAtlas, resolver);
    const attr = paneMesh.geometry.getAttribute("aUvRect") as THREE.InstancedBufferAttribute;
    attr.setXYZW(0, rect.x, rect.y, rect.w, rect.h);
    attr.needsUpdate = true;
  }

  return {
    update(now: number) {
      if (door.open !== lastOpen) {
        const currentProgress = computeDoorProgress(anim, now, door.visual);
        anim = { fromProgress: currentProgress, toOpen: door.open, startTime: now };
        lastOpen = door.open;
      }
      if (door.locked !== lastLocked) {
        lastLocked = door.locked;
        syncPaneTexture();
      }

      const progress = computeDoorProgress(anim, now, door.visual);
      const offset = progress * slideDistance;
      const pos = paneBasePos.clone();
      if (axis === "vertical") {
        pos.y += offset * ceilingHeight;
      } else {
        pos.x += offset * tileSize * tangentX;
        pos.z += offset * tileSize * tangentZ;
      }
      const matrix = new THREE.Matrix4().compose(pos, paneQuat, paneScale);
      paneMesh.setMatrixAt(0, matrix);
      paneMesh.instanceMatrix.needsUpdate = true;
    },

    getPickObject() {
      return pickMesh;
    },

    dispose() {
      scene.remove(frameMesh);
      scene.remove(paneMesh);
      scene.remove(pickMesh);
      frameMesh.geometry.dispose();
      frameMat.dispose();
      paneMesh.geometry.dispose();
      paneMat.dispose();
      pickMesh.geometry.dispose();
      (pickMesh.material as THREE.Material).dispose();
    },
  };
}
