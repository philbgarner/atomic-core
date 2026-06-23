[atomic-core](../README.md) / FactionRegistry

# Type Alias: FactionRegistry

> **FactionRegistry** = `object`

Defined in: [combat/factions.ts:13](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/combat/factions.ts#L13)

## Methods

### getStance()

> **getStance**(`from`, `to`): [`FactionStance`](FactionStance.md)

Defined in: [combat/factions.ts:22](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/combat/factions.ts#L22)

Returns the stance of `from` toward `to`. Default: "neutral".

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `from` | `string` |
| `to` | `string` |

#### Returns

[`FactionStance`](FactionStance.md)

***

### isHostile()

> **isHostile**(`from`, `to`): `boolean`

Defined in: [combat/factions.ts:25](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/combat/factions.ts#L25)

Returns true if `from` treats `to` as hostile.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `from` | `string` |
| `to` | `string` |

#### Returns

`boolean`

***

### setStance()

> **setStance**(`from`, `to`, `stance`): `void`

Defined in: [combat/factions.ts:19](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/combat/factions.ts#L19)

Register a relationship. Relationships are directional:
setStance("orc", "player", "hostile") does not automatically
set player→orc. Call symmetrically if needed.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `from` | `string` |
| `to` | `string` |
| `stance` | [`FactionStance`](FactionStance.md) |

#### Returns

`void`
