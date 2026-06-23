[atomic-core](../README.md) / RoomedDungeonOutputs

# Type Alias: RoomedDungeonOutputs

> **RoomedDungeonOutputs** = [`DungeonOutputs`](DungeonOutputs.md) & `object`

Defined in: [dungeon/bsp.ts:157](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/dungeon/bsp.ts#L157)

Shared output fields for any dungeon type that has a room graph.
Both BSP and cellular dungeons produce this structure.

## Type Declaration

### endRoomId

> **endRoomId**: `number`

Room ID (matches regionId texture values) chosen as the dungeon exit.

### firstCorridorRegionId

> **firstCorridorRegionId**: `number`

Lowest regionId assigned to a corridor segment. For cellular dungeons, equals numRooms + 1 (no corridor entries).

### fullRegionIds

> **fullRegionIds**: `Uint8Array`

Region-id array with unique IDs for every cell: room cells keep their
original IDs (1..maxRoomId), corridor cells have IDs starting at
`firstCorridorRegionId`, wall cells are 0.
Identical in content to `textures.regionId`.

### rooms

> **rooms**: `Map`\<`number`, `RoomInfo`\>

Map from regionId → RoomInfo for every room (and corridor segment for BSP).
Room entries have `type: "room"` and IDs matching textures.regionId values (1+).
Corridor entries have `type: "corridor"` and IDs starting at `firstCorridorRegionId`.
startRoomId and endRoomId are guaranteed keys.

### startRoomId

> **startRoomId**: `number`

Room ID furthest from endRoomId — used as the default player spawn room.
