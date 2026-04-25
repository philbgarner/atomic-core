[atomic-core](../README.md) / setCeilSkirtTiles

# Function: setCeilSkirtTiles()

> **setCeilSkirtTiles**(`outputs`, `cx`, `cz`, `tiles`): `void`

Defined in: [dungeon/bsp.ts:1095](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/dungeon/bsp.ts#L1095)

Write ceiling skirt overlay tile IDs for a single cell.
`tiles` is an array of up to 4 numeric tile IDs corresponding to RGBA slots 1–4.
Missing entries are left unchanged; pass 0 to clear a slot.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outputs` | [`DungeonOutputs`](../type-aliases/DungeonOutputs.md) |
| `cx` | `number` |
| `cz` | `number` |
| `tiles` | `number`[] |

## Returns

`void`
