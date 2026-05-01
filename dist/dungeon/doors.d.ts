export type DoorCandidate = {
    x: number;
    z: number;
    dx: number;
    dz: number;
    yaw: number;
    /** Region ID of the room this opening leads into. */
    roomId: number;
    /** All threshold cells in this opening, sorted along the corridor axis. */
    groupCells: {
        x: number;
        z: number;
    }[];
    /** Index into groupCells that is the chosen door position (median). */
    midIdx: number;
};
export type DoorRecord = {
    id: string;
    x: number;
    z: number;
    yaw: number;
    /**
     * Key ID that locks/unlocks this door. -1 means the door is not lockable
     * by a key — only by scripted triggers.
     */
    keyId: number;
    /** Region ID of the room this door guards. */
    roomId: number;
    locked: boolean;
    open: boolean;
};
/**
 * Find door candidate locations — one per corridor-to-room opening, centered
 * on the opening's median threshold cell.
 *
 * Identification convention (caller must match this):
 * - Corridor cell: solid=0 AND regionId=0
 * - Room cell:     solid=0 AND regionId≠0
 *
 * Pass the pre-assignment regionId data where corridors still have value 0.
 * After `generateBspDungeon` the regionId texture has unique non-zero IDs for
 * corridors (baked by `assignCorridorRegions`), so it cannot be used directly here.
 *
 * Grouping: threshold cells (corridor cells adjacent to a room cell) are grouped
 * by their corridor axis and fixed coordinate, so each opening (a contiguous run
 * of threshold cells along one wall) becomes a single candidate. The door is placed
 * at the median cell of each group.
 *
 * `yaw` is 0 for doors facing Z (dx=0) and π/2 for doors facing X.
 */
export declare function findDoorCandidates(regionIdData: Uint8Array, solidData: Uint8Array, W: number, H: number): DoorCandidate[];
/**
 * Narrow a door opening to exactly one cell (the median) by walling off the
 * surrounding cells.
 *
 * Two kinds of cells are walled (solid set to 1, colliderFlags set to IS_BLOCKED):
 * 1. All cells in `candidate.groupCells` except the median at `midIdx`.
 * 2. The two corridor cells flanking the door perpendicularly — i.e., the cells at
 *    (doorX ± dz, doorZ ∓ dx) — if they are floor corridor cells (solid=0, regionId=0).
 *    This prevents diagonal walk-through at the door frame.
 *
 * Modifies `solidData`, `colliderFlagsData`, and `regionIdData` in-place.
 * The caller must set `needsUpdate = true` on the corresponding textures.
 */
export declare function wallOffDoorGroup(candidate: DoorCandidate, solidData: Uint8Array, colliderFlagsData: Uint8Array, regionIdData: Uint8Array, W: number, H: number): void;
//# sourceMappingURL=doors.d.ts.map