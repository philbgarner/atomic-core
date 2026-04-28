[atomic-core](../README.md) / colliderFlagsFromSolid

# Function: colliderFlagsFromSolid()

> **colliderFlagsFromSolid**(`solid`): `number`

Defined in: [dungeon/colliderFlags.ts:27](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/dungeon/colliderFlags.ts#L27)

Derive a collider-flags byte from a legacy `solid` mask value.
  solid === 0  →  floor:  IS_WALKABLE | IS_LIGHT_PASSABLE  (0x05)
  solid  > 0  →  wall:   IS_BLOCKED                        (0x02)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `solid` | `number` |

## Returns

`number`
