[atomic-core](../README.md) / setFloorSkirtTiles

# Function: setFloorSkirtTiles()

> **setFloorSkirtTiles**(`outputs`, `cx`, `cz`, `tiles`): `void`

Defined in: [dungeon/bsp.ts:1254](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/dungeon/bsp.ts#L1254)

Write floor skirt overlay tile IDs for a single cell.
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
