[atomic-core](../README.md) / FactionRegistry

# Type Alias: FactionRegistry

> **FactionRegistry** = `object`

Defined in: [combat/factions.ts:13](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/combat/factions.ts#L13)

## Methods

### getStance()

> **getStance**(`from`, `to`): [`FactionStance`](FactionStance.md)

Defined in: [combat/factions.ts:22](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/combat/factions.ts#L22)

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

Defined in: [combat/factions.ts:25](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/combat/factions.ts#L25)

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

Defined in: [combat/factions.ts:19](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/combat/factions.ts#L19)

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
