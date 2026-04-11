export type FovOptions = {
    /**
     * Return true if the cell blocks light (usually: solid === "wall").
     * Called with every candidate cell during the octant sweep.
     * Should return true for out-of-bounds coordinates.
     */
    isOpaque: (x: number, y: number) => boolean;
    /**
     * Called once per visible cell, including the origin itself.
     * Use this to write to a visibility mask, reveal map tiles, etc.
     */
    visit: (x: number, y: number) => void;
    /** Chebyshev radius. Cells beyond this distance are never visited. Default: 1024. */
    radius?: number;
};
/**
 * Compute the set of cells visible from (originX, originY) using recursive
 * shadowcasting across all 8 octants.
 *
 * Example:
 *   computeFov(px, py, {
 *     isOpaque: (x, y) => x < 0 || y < 0 || x >= W || y >= H || solidData[y*W+x] !== 0,
 *     visit: (x, y) => visibilityMask[y * W + x] = 1,
 *     radius: 12,
 *   });
 */
export declare function computeFov(originX: number, originY: number, options: FovOptions): void;
/**
 * Allocate a zeroed Uint8Array of size width×height.
 * After calling computeFov with `visit: (x, y) => mask[y * width + x] = 1`,
 * non-zero entries are the visible cells.
 */
export declare function createVisibilityMask(width: number, height: number): Uint8Array;
//# sourceMappingURL=fov.d.ts.map