[atomic-core](../README.md) / setSkyPanelCount

# Function: setSkyPanelCount()

> **setSkyPanelCount**(`outputs`, `cx`, `cz`, `count`): `void`

Defined in: [dungeon/bsp.ts:1294](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/dungeon/bsp.ts#L1294)

Set the number of sky panels (upward-facing vertical quads above the wall) for
a single cell. Panels are emitted on all wall faces (adjacent to solid neighbours)
going up from y = ceilingHeight; row 0 is immediately above the wall.

Intended for open-sky cells (ceilingHeightOffset === 0) so the panels extend
visibly through the sky opening. Count is clamped to [0, 4].

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outputs` | [`DungeonOutputs`](../type-aliases/DungeonOutputs.md) |
| `cx` | `number` |
| `cz` | `number` |
| `count` | `number` |

## Returns

`void`
