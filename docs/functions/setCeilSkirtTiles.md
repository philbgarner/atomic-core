[atomic-core](../README.md) / setCeilSkirtTiles

# Function: setCeilSkirtTiles()

> **setCeilSkirtTiles**(`outputs`, `cx`, `cz`, `map`): `void`

Defined in: [dungeon/bsp.ts:1098](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/dungeon/bsp.ts#L1098)

Write per-cell ceiling skirt tile IDs for one or more directions.
Only directions present in `map` are written; absent directions are unchanged.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outputs` | [`DungeonOutputs`](../type-aliases/DungeonOutputs.md) |
| `cx` | `number` |
| `cz` | `number` |
| `map` | \{ `east?`: `number`; `north?`: `number`; `south?`: `number`; `west?`: `number`; \} |
| `map.east?` | `number` |
| `map.north?` | `number` |
| `map.south?` | `number` |
| `map.west?` | `number` |

## Returns

`void`
