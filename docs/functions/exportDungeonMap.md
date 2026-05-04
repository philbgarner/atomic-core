[atomic-core](../README.md) / exportDungeonMap

# Function: exportDungeonMap()

> **exportDungeonMap**(`dungeon`, `options`): [`DungeonMapFile`](../type-aliases/DungeonMapFile.md)

Defined in: [dungeon/mapFile.ts:130](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/dungeon/mapFile.ts#L130)

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
