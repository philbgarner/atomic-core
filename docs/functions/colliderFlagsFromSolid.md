[atomic-core](../README.md) / colliderFlagsFromSolid

# Function: colliderFlagsFromSolid()

> **colliderFlagsFromSolid**(`solid`): `number`

Defined in: [dungeon/colliderFlags.ts:27](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/dungeon/colliderFlags.ts#L27)

Derive a collider-flags byte from a legacy `solid` mask value.
  solid === 0  →  floor:  IS_WALKABLE | IS_LIGHT_PASSABLE  (0x05)
  solid  > 0  →  wall:   IS_BLOCKED                        (0x02)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `solid` | `number` |

## Returns

`number`
