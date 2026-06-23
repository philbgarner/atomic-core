[atomic-core](../README.md) / SpawnChooserContext

# Type Alias: SpawnChooserContext

> **SpawnChooserContext** = `object`

Defined in: [api/createGame.ts:476](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L476)

Passed to `onChooseSpawn` so you can inspect the dungeon layout before
committing to a spawn room.

`rooms` contains every room and corridor in the dungeon.
`startRoom` is the default player-start room (furthest from the exit).
`endRoom` is the exit room.

Return any `room.id` from the list and the player will be placed at that
room's centre cell.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="endroom"></a> `endRoom` | `PublicRoom` | [api/createGame.ts:479](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L479) |
| <a id="rooms"></a> `rooms` | `PublicRoom`[] | [api/createGame.ts:477](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L477) |
| <a id="startroom"></a> `startRoom` | `PublicRoom` | [api/createGame.ts:478](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L478) |
