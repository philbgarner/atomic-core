/**
 * A minimal binary min-heap keyed on a numeric priority.
 * Used by A* as the open-set priority queue.
 */
export declare class MinHeap<T> {
    private _heap;
    get size(): number;
    push(priority: number, value: T): void;
    pop(): T | undefined;
    peek(): T | undefined;
    peekPriority(): number;
    private _bubbleUp;
    private _siftDown;
}
/**
 * Octile distance heuristic for 8-directional grids.
 * Scaled to match integer movement costs: orthogonal=10, diagonal=14.
 */
export declare function octile(ax: number, ay: number, bx: number, by: number): number;
/**
 * Returns true if (ax, az) can see (bx, bz) with no blocking tiles in between.
 * Checks all intermediate cells (not the endpoints) via `walkableFn`.
 */
export declare function hasLineOfSight(ax: number, az: number, bx: number, bz: number, walkableFn: (x: number, z: number) => boolean): boolean;
declare const _DIRS: readonly ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export type CardinalDir = typeof _DIRS[number];
/** Maps a yaw angle (radians) to the nearest 8-way compass direction. */
export declare function cardinalDir(yaw: number): CardinalDir;
/**
 * Converts a pixel-space UV rect `{x, y, w, h}` into the normalised
 * `[x, y, w, h]` tuple expected by billboard shaders (y=0 is bottom in GL).
 */
export declare function normalizeUvRect(rect: {
    x: number;
    y: number;
    w: number;
    h: number;
} | undefined | null, sheetW: number, sheetH: number): [number, number, number, number] | undefined;
export {};
//# sourceMappingURL=geometry.d.ts.map