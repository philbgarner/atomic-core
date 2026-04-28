[atomic-core](../README.md) / AnimationsHandle

# Type Alias: AnimationsHandle

> **AnimationsHandle** = `object`

Defined in: [animations/types.ts:48](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/animations/types.ts#L48)

Developer-facing handle exposed as game.animations.

## Methods

### clear()

> **clear**(`kind`): `void`

Defined in: [animations/types.ts:51](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/animations/types.ts#L51)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | [`AnimationEventKind`](AnimationEventKind.md) |

#### Returns

`void`

***

### off()

> **off**\<`K`\>(`kind`, `handler`): `void`

Defined in: [animations/types.ts:50](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/animations/types.ts#L50)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* [`AnimationEventKind`](AnimationEventKind.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | `K` |
| `handler` | [`AnimationHandler`](AnimationHandler.md)\<`K`\> |

#### Returns

`void`

***

### on()

> **on**\<`K`\>(`kind`, `handler`): `void`

Defined in: [animations/types.ts:49](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/animations/types.ts#L49)

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* [`AnimationEventKind`](AnimationEventKind.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | `K` |
| `handler` | [`AnimationHandler`](AnimationHandler.md)\<`K`\> |

#### Returns

`void`
