[atomic-core](../README.md) / PlaceAPI

# Type Alias: PlaceAPI

> **PlaceAPI** = `object`

Defined in: [api/createGame.ts:342](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L342)

## Methods

### billboard()

> **billboard**(`x`, `z`, `type`, `spriteMap`, `opts?`): `void`

Defined in: [api/createGame.ts:349](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L349)

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

Defined in: [api/createGame.ts:358](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L358)

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

Defined in: [api/createGame.ts:357](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L357)

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

Defined in: [api/createGame.ts:356](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L356)

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

Defined in: [api/createGame.ts:343](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L343)

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

Defined in: [api/createGame.ts:359](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L359)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `x` | `number` |
| `z` | `number` |
| `layers` | [`SurfacePaintTarget`](SurfacePaintTarget.md) |

#### Returns

`void`
