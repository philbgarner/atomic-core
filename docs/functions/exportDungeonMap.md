[atomic-core](../README.md) / exportDungeonMap

# Function: exportDungeonMap()

> **exportDungeonMap**(`dungeon`, `options`): [`DungeonMapFile`](../type-aliases/DungeonMapFile.md)

Defined in: [dungeon/mapFile.ts:125](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/dungeon/mapFile.ts#L125)

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
