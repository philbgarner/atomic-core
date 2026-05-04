[atomic-core](../README.md) / setCeilingPanelCount

# Function: setCeilingPanelCount()

> **setCeilingPanelCount**(`outputs`, `cx`, `cz`, `count`): `void`

Defined in: [dungeon/bsp.ts:1314](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/dungeon/bsp.ts#L1314)

Set the number of ceiling panels (downward-facing vertical quads below the ceiling)
for a single cell. Panels are emitted on all wall faces (adjacent to solid neighbours)
hanging down from y = ceilingHeight; row 0 is immediately below the ceiling.

Count is clamped to [0, 4].

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outputs` | [`DungeonOutputs`](../type-aliases/DungeonOutputs.md) |
| `cx` | `number` |
| `cz` | `number` |
| `count` | `number` |

## Returns

`void`
