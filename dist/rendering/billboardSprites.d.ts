import { EntityBase } from '../entities/types';
import { PackedAtlas } from './textureLoader';
import * as THREE from "three";
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
    frameSize: {
        w: number;
        h: number;
    };
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
    update(entity: EntityBase, cameraYaw: number, tileSize: number, ceilingH: number, floorY: number, placement?: BillboardPlacementOffset): void;
    /** Show or hide all meshes in this billboard without disposing GPU resources. */
    setVisible(visible: boolean): void;
    /** Remove meshes from scene and dispose GPU resources. */
    dispose(): void;
    getPickObject(): THREE.Mesh;
    setLayerTile(tileSize: number, layerIndex: number, tile: string): void;
}
export interface BillboardFog {
    color?: THREE.Color;
    near?: number;
    far?: number;
}
export declare function createBillboard(tileSize: number, entity: EntityBase & {
    spriteMap: SpriteMap;
}, packedAtlas: PackedAtlas, scene: THREE.Scene, resolver?: (name: string) => number, expectedFrameSize?: number, // Expected tile size is 64 pixels by default.
fog?: BillboardFog, palette?: BillboardPalette): BillboardHandle;
//# sourceMappingURL=billboardSprites.d.ts.map