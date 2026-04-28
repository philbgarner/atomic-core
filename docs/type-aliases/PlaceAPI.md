[atomic-core](../README.md) / PlaceAPI

# Type Alias: PlaceAPI

> **PlaceAPI** = `object`

Defined in: [api/createGame.ts:162](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/api/createGame.ts#L162)

## Methods

### billboard()

> **billboard**(`x`, `z`, `type`, `spriteMap`, `opts?`): `void`

Defined in: [api/createGame.ts:169](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/api/createGame.ts#L169)

Place a stationary camera-facing billboard sprite at a grid cell.
The placement is stored in `game.dungeon.objects` and rendered when passed
to `renderer.setObjects(game.dungeon.objects)`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `spriteMap` | [`SpriteMap`](../interfaces/SpriteMap.md) |
| `opts?` | `Pick`\<[`ObjectPlacement`](../interfaces/ObjectPlacement.md), `"meta"` \| `"yaw"` \| `"scale"` \| `"offsetX"` \| `"offsetZ"` \| `"offsetY"`\> |

#### Returns

`void`

***

### decoration()

> **decoration**(`x`, `z`, `type`, `opts?`): `void`

Defined in: [api/createGame.ts:178](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/api/createGame.ts#L178)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `opts?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### enemy()

> **enemy**(`x`, `z`, `type`, `opts?`): `void`

Defined in: [api/createGame.ts:177](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/api/createGame.ts#L177)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `opts?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### npc()

> **npc**(`x`, `z`, `type`, `opts?`): `void`

Defined in: [api/createGame.ts:176](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/api/createGame.ts#L176)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `opts?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### object()

> **object**(`x`, `z`, `type`, `meta?`): `void`

Defined in: [api/createGame.ts:163](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/api/createGame.ts#L163)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `type` | `string` |
| `meta?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### surface()

> **surface**(`x`, `z`, `layers`): `void`

Defined in: [api/createGame.ts:179](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/api/createGame.ts#L179)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `layers` | [`SurfacePaintTarget`](SurfacePaintTarget.md) |

#### Returns

`void`
