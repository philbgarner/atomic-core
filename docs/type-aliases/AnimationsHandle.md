[atomic-core](../README.md) / AnimationsHandle

# Type Alias: AnimationsHandle

> **AnimationsHandle** = `object`

Defined in: [animations/types.ts:48](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/animations/types.ts#L48)

Developer-facing handle exposed as game.animations.

## Methods

### clear()

> **clear**(`kind`): `void`

Defined in: [animations/types.ts:51](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/animations/types.ts#L51)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | [`AnimationEventKind`](AnimationEventKind.md) |

#### Returns

`void`

***

### off()

> **off**\<`K`\>(`kind`, `handler`): `void`

Defined in: [animations/types.ts:50](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/animations/types.ts#L50)

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

Defined in: [animations/types.ts:49](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/animations/types.ts#L49)

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
