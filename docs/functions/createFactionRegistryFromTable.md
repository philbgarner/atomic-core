[atomic-core](../README.md) / createFactionRegistryFromTable

# Function: createFactionRegistryFromTable()

> **createFactionRegistryFromTable**(`table`): [`FactionRegistry`](../type-aliases/FactionRegistry.md)

Defined in: [combat/factions.ts:58](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/combat/factions.ts#L58)

Convenience: build a registry from a stance table.

Example:
  createFactionRegistryFromTable([
    ["player", "enemy", "hostile"],
    ["enemy", "player", "hostile"],
  ])

## Parameters

| Parameter | Type |
| ------ | ------ |
| `table` | \[`string`, `string`, [`FactionStance`](../type-aliases/FactionStance.md)\][] |

## Returns

[`FactionRegistry`](../type-aliases/FactionRegistry.md)
