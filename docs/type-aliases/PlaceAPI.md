[atomic-core](../README.md) / PlaceAPI

# Type Alias: PlaceAPI

> **PlaceAPI** = `object`

Defined in: [api/createGame.ts:163](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L163)

## Methods

### billboard()

> **billboard**(`x`, `z`, `type`, `spriteMap`, `opts?`): `void`

Defined in: [api/createGame.ts:170](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L170)

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
| `opts?` | `Pick`\<[`ObjectPlacement`](../interfaces/ObjectPlacement.md), `"meta"` \| `"offsetX"` \| `"offsetZ"` \| `"offsetY"` \| `"yaw"` \| `"scale"`\> |

#### Returns

`void`

***

### decoration()

> **decoration**(`x`, `z`, `type`, `opts?`): `void`

Defined in: [api/createGame.ts:179](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L179)

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

Defined in: [api/createGame.ts:178](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L178)

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

Defined in: [api/createGame.ts:177](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L177)

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

Defined in: [api/createGame.ts:164](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L164)

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

Defined in: [api/createGame.ts:180](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L180)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `layers` | [`SurfacePaintTarget`](SurfacePaintTarget.md) |

#### Returns

`void`
