import { FluidDef, FluidField } from '../fluid/fluid';
import { DungeonRenderer } from './dungeonRenderer';
import * as THREE from "three";
export interface FluidMask {
    field: FluidField;
    /** Quantized mass (0-255, 255 = >=MAX_MASS) per cell, row-major. Backs `depthTexture`. */
    depthData: Uint8Array;
    /** RedFormat/UnsignedByteType. */
    depthTexture: THREE.DataTexture;
    /** Fluid type id (0 = dry) per cell, row-major. Backs `typeTexture`. */
    typeData: Uint8Array;
    /** RedFormat/UnsignedByteType. */
    typeTexture: THREE.DataTexture;
    /** field.version as of the last sync. */
    syncedVersion: number;
}
export declare function createFluidMask(field: FluidField): FluidMask;
/** Re-syncs the mask's textures from `mask.field`. No-op if the field hasn't changed. */
export declare function updateFluidMask(mask: FluidMask): void;
export interface FluidSurfaceOptions {
    tileSize: number;
    /**
     * World-space units per unit of `surfaceHeight` (`floorElevation + mass`,
     * both already in the same abstract mass-equivalent scale — see
     * `fluid.ts`'s DEFAULT_STEP_HEIGHT). Must be a single factor applied to
     * the combined sum, not split across elevation and mass separately:
     * two cells the simulation considers at equal water level (equal
     * `surfaceHeight`) only render at the same world Y if both terms share
     * one scale. Splitting it — e.g. a smaller factor for `mass` alone, to
     * make a fresh puddle look shallower — breaks that equivalence and makes
     * the surface visibly non-flat (or clip into the floor) across any
     * stepped pit, which defeats the point of the simulation. Default:
     * `tileSize * 0.5`, matching the renderer's own floor-height step so the
     * dry-cell baseline (mass = 0) lines up with the dungeon's real geometry.
     * To make a single fresh pour look shallower, reduce the poured `amount`
     * (see `placeFluidCircle`) rather than this scale.
     */
    worldUnitsPerStep?: number;
    /** cellType id -> visual definition. Ids outside [1, 15] are not representable in the palette. */
    fluidDefs: Record<number, FluidDef>;
    opacity?: number;
    fogColor?: THREE.ColorRepresentation;
    fogNear?: number;
    fogFar?: number;
}
export interface FluidSurfaceHandle {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    /** Recomputes vertex height/depth/type from the field's current state. Call once per frame after `stepFluid`. */
    sync(): void;
    /** Removes the mesh from the scene and disposes its geometry/material. */
    remove(): void;
}
/**
 * Adds a fluid-surface mesh to `renderer.scene`: one flat top quad per
 * non-solid cell, world-positioned to exactly cover that cell's footprint
 * (`[x*tileSize, (x+1)*tileSize] x [z*tileSize, (z+1)*tileSize]`, matching
 * the dungeon's own `(cx+0.5)*tileSize` cell-center convention), plus a
 * vertical wall quad on every edge, rendered only where the surface actually
 * drops off across it (see the file header).
 */
export declare function createFluidSurface(renderer: DungeonRenderer, field: FluidField, options: FluidSurfaceOptions): FluidSurfaceHandle;
//# sourceMappingURL=fluidMask.d.ts.map