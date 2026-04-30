[atomic-core](../README.md) / importDungeonMap

# Function: importDungeonMap()

> **importDungeonMap**(`data`): [`ImportResult`](../type-aliases/ImportResult.md)

Defined in: [dungeon/mapFile.ts:168](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/dungeon/mapFile.ts#L168)

Reconstruct a dungeon from a DungeonMapFile.

The returned `dungeon` is ready to pass to buildDungeon / syncEntities.
If the file contained surface-painter overlays they are returned in `result.paintMap`
as plain strings — re-apply them via `game.dungeon.paint(x, z, target)` after
`game.generate()`. Re-supply `packedAtlas` and `tileNameResolver` when creating
the renderer.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | [`DungeonMapFile`](../type-aliases/DungeonMapFile.md) |

## Returns

[`ImportResult`](../type-aliases/ImportResult.md)
