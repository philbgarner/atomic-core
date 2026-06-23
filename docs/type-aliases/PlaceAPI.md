[atomic-core](../README.md) / PlaceAPI

# Type Alias: PlaceAPI

> **PlaceAPI** = `object`

Defined in: [api/createGame.ts:427](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L427)

## Methods

### billboard()

> **billboard**(`x`, `z`, `type`, `spriteMap`, `opts?`): `void`

Defined in: [api/createGame.ts:439](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L439)

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

Defined in: [api/createGame.ts:456](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L456)

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

Defined in: [api/createGame.ts:450](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L450)

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

Defined in: [api/createGame.ts:449](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L449)

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

Defined in: [api/createGame.ts:428](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L428)

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

Defined in: [api/createGame.ts:462](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L462)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `layers` | [`SurfacePaintTarget`](SurfacePaintTarget.md) |

#### Returns

`void`
