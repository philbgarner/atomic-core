[atomic-core](../README.md) / MissionsHandle

# Type Alias: MissionsHandle

> **MissionsHandle** = `object`

Defined in: [missions/types.ts:101](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/missions/types.ts#L101)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="active"></a> `active` | `readonly` | [`Mission`](Mission.md)[] | Only missions whose status is 'active'. | [missions/types.ts:116](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/missions/types.ts#L116) |
| <a id="completed"></a> `completed` | `readonly` | [`Mission`](Mission.md)[] | Only missions whose status is 'complete'. | [missions/types.ts:118](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/missions/types.ts#L118) |
| <a id="list"></a> `list` | `readonly` | [`Mission`](Mission.md)[] | All registered missions (active and complete). | [missions/types.ts:114](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/missions/types.ts#L114) |

## Methods

### add()

> **add**(`def`): `void`

Defined in: [missions/types.ts:106](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/missions/types.ts#L106)

Register a new mission. The evaluator is called every turn until the
mission completes or is removed.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `def` | [`MissionDef`](MissionDef.md) |

#### Returns

`void`

***

### get()

> **get**(`id`): [`Mission`](Mission.md) \| `undefined`

Defined in: [missions/types.ts:112](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/missions/types.ts#L112)

Retrieve a mission by ID. Returns undefined if not found.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Mission`](Mission.md) \| `undefined`

***

### remove()

> **remove**(`id`): `void`

Defined in: [missions/types.ts:110](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/missions/types.ts#L110)

Unregister a mission by ID. Has no effect if the mission does not exist.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`void`
