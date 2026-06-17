[atomic-core](../README.md) / exportDungeonMap

# Function: exportDungeonMap()

> **exportDungeonMap**(`dungeon`, `options`): [`DungeonMapFile`](../type-aliases/DungeonMapFile.md)

Defined in: [dungeon/mapFile.ts:130](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/dungeon/mapFile.ts#L130)

Snapshot a dungeon and all settings needed to reproduce it into a
plain, JSON-safe DungeonMapFile object.

Pass `generatorOptions` with the same values used in generateBspDungeon,
including the resolved numeric seed so the room graph can be reconstructed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dungeon` | [`RoomedDungeonOutputs`](../type-aliases/RoomedDungeonOutputs.md) |
| `options` | [`ExportOptions`](../type-aliases/ExportOptions.md) |

## Returns

[`DungeonMapFile`](../type-aliases/DungeonMapFile.md)
