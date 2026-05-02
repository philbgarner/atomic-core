[atomic-core](../README.md) / setCeilingPanelCount

# Function: setCeilingPanelCount()

> **setCeilingPanelCount**(`outputs`, `cx`, `cz`, `count`): `void`

Defined in: [dungeon/bsp.ts:1313](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/dungeon/bsp.ts#L1313)

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
