import { GameHandle } from '../api/createGame';
import { EntityBase } from '../entities/types';
export type DungeonRendererOptions = {
    /** Camera field of view in degrees. Default: 75. */
    fov?: number;
    /** World units per grid cell. Default: 3. */
    tileSize?: number;
    /** World-unit height of each corridor/room. Default: 3. */
    ceilingHeight?: number;
    /** Distance at which fog begins. Default: 5. */
    fogNear?: number;
    /** Distance at which fog is fully opaque (== background colour). Default: 24. */
    fogFar?: number;
    /** CSS colour string for fog / background. Default: '#000000'. */
    fogColor?: string;
    /** Smoothing factor for camera animation (0 = instant, 1 = never arrives). Default: 0.18. */
    lerpFactor?: number;
};
export type DungeonRenderer = {
    /**
     * Update the renderer's entity list. Call this on every 'turn' event
     * (or whenever entity positions change) to keep the scene in sync.
     */
    setEntities(entities: EntityBase[]): void;
    /** Unmount the canvas and release all Three.js resources. */
    destroy(): void;
};
export declare function createDungeonRenderer(element: HTMLElement, game: GameHandle, options?: DungeonRendererOptions): DungeonRenderer;
//# sourceMappingURL=dungeonRenderer.d.ts.map