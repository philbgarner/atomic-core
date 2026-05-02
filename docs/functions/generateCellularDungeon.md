[atomic-core](../README.md) / generateCellularDungeon

# Function: generateCellularDungeon()

> **generateCellularDungeon**(`options`): [`CellularDungeonOutputs`](../type-aliases/CellularDungeonOutputs.md)

Defined in: [dungeon/cellular.ts:459](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/dungeon/cellular.ts#L459)

Generate a cellular-automata cave dungeon and return the full texture set.

Pipeline:
1. Seed the mulberry32 PRNG from `options.seed` (FNV-1a for strings).
2. Fill the grid randomly: each interior cell becomes wall with probability `fillProbability`.
   Outer border is always wall when `keepOuterWalls` is true.
3. Smooth `iterations` times using Moore-neighbourhood rules:
   - Floor cell: becomes wall if wall-neighbour count ≥ `birthThreshold`.
   - Wall cell: stays wall if wall-neighbour count ≥ `survivalThreshold`; otherwise → floor.
4. Identify all 4-connected floor regions via flood fill; keep only the largest and
   re-solidify all others (eliminates disconnected pockets).
5. Compute `distanceToWall` (multi-source BFS from all wall cells), then derive Voronoi
   room IDs from its strict 4-connected local maxima (`buildVoronoiRooms`).
   `startRoomId` / `endRoomId` are chosen via double-BFS on the room adjacency graph.

Output is compatible with `generateContent`, `aStar8`, `computeFov`, and all rendering
APIs. Unlike BSP, corridor entries are not added to `rooms`; `firstCorridorRegionId = N + 1`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`CellularOptions`](../type-aliases/CellularOptions.md) |

## Returns

[`CellularDungeonOutputs`](../type-aliases/CellularDungeonOutputs.md)

## Throws

if width or height ≤ 2.
