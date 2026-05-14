[atomic-core](../README.md) / SpawnChooserContext

# Type Alias: SpawnChooserContext

> **SpawnChooserContext** = `object`

Defined in: [api/createGame.ts:373](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L373)

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
| <a id="endroom"></a> `endRoom` | `PublicRoom` | [api/createGame.ts:376](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L376) |
| <a id="rooms"></a> `rooms` | `PublicRoom`[] | [api/createGame.ts:374](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L374) |
| <a id="startroom"></a> `startRoom` | `PublicRoom` | [api/createGame.ts:375](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L375) |
