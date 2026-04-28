[atomic-core](../README.md) / exportDungeonMap

# Function: exportDungeonMap()

> **exportDungeonMap**(`dungeon`, `options`): [`DungeonMapFile`](../type-aliases/DungeonMapFile.md)

Defined in: [dungeon/mapFile.ts:125](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/dungeon/mapFile.ts#L125)

Snapshot a dungeon and all settings needed to reproduce it into a
plain, JSON-safe DungeonMapFile object.

Pass `generatorOptions` with the same values used in generateBspDungeon,
including the resolved numeric seed so the room graph can be reconstructed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dungeon` | [`BspDungeonOutputs`](../type-aliases/BspDungeonOutputs.md) |
| `options` | [`ExportOptions`](../type-aliases/ExportOptions.md) |

## Returns

[`DungeonMapFile`](../type-aliases/DungeonMapFile.md)
