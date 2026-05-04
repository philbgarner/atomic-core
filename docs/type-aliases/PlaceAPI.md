[atomic-core](../README.md) / PlaceAPI

# Type Alias: PlaceAPI

> **PlaceAPI** = `object`

Defined in: [api/createGame.ts:157](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L157)

## Methods

### billboard()

> **billboard**(`x`, `z`, `type`, `spriteMap`, `opts?`): `void`

Defined in: [api/createGame.ts:164](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L164)

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

Defined in: [api/createGame.ts:173](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L173)

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

Defined in: [api/createGame.ts:172](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L172)

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

Defined in: [api/createGame.ts:171](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L171)

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

Defined in: [api/createGame.ts:158](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L158)

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

Defined in: [api/createGame.ts:174](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L174)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `layers` | [`SurfacePaintTarget`](SurfacePaintTarget.md) |

#### Returns

`void`
