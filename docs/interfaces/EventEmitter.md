[atomic-core](../README.md) / EventEmitter

# Interface: EventEmitter

Defined in: [events/eventEmitter.ts:81](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/events/eventEmitter.ts#L81)

## Methods

### emit()

> **emit**\<`K`\>(...`args`): `Promise`\<`void`\>

Defined in: [events/eventEmitter.ts:84](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/events/eventEmitter.ts#L84)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`GameEventMap`](GameEventMap.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | [`GameEventMap`](GameEventMap.md)\[`K`\] *extends* `void` ? \[`K`\] : \[`K`, [`GameEventMap`](GameEventMap.md)\[`K`\]\] |

#### Returns

`Promise`\<`void`\>

***

### off()

> **off**\<`K`\>(`event`, `handler`): `void`

Defined in: [events/eventEmitter.ts:83](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/events/eventEmitter.ts#L83)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`GameEventMap`](GameEventMap.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `handler` | `Handler`\<[`GameEventMap`](GameEventMap.md)\[`K`\]\> |

#### Returns

`void`

***

### on()

> **on**\<`K`\>(`event`, `handler`): `void`

Defined in: [events/eventEmitter.ts:82](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/events/eventEmitter.ts#L82)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`GameEventMap`](GameEventMap.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `handler` | `Handler`\<[`GameEventMap`](GameEventMap.md)\[`K`\]\> |

#### Returns

`void`
