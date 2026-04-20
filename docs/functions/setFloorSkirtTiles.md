[atomic-core](../README.md) / setFloorSkirtTiles

# Function: setFloorSkirtTiles()

> **setFloorSkirtTiles**(`outputs`, `cx`, `cz`, `map`): `void`

Defined in: [dungeon/bsp.ts:1079](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/dungeon/bsp.ts#L1079)

Write per-cell floor skirt tile IDs for one or more directions.
Only directions present in `map` are written; absent directions are unchanged.
Call after modifying to trigger a renderer refresh (texture.needsUpdate is set automatically).

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
