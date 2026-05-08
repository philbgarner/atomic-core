[atomic-core](../README.md) / createFactionRegistryFromTable

# Function: createFactionRegistryFromTable()

> **createFactionRegistryFromTable**(`table`): [`FactionRegistry`](../type-aliases/FactionRegistry.md)

Defined in: [combat/factions.ts:58](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/combat/factions.ts#L58)

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
