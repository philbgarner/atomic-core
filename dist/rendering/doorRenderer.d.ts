import { DoorRecord } from '../dungeon/doors';
import { PackedAtlas } from './textureLoader';
import * as THREE from "three";
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
/** Build the renderable meshes for one door and return its control handle. */
export declare function createDoorMesh(door: DoorRecord, deps: DoorMeshDeps): DoorHandle;
//# sourceMappingURL=doorRenderer.d.ts.map