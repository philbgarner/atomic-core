[atomic-core](../README.md) / SetCellOptions

# Type Alias: SetCellOptions

> **SetCellOptions** = `object`

Defined in: [api/createGame.ts:107](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L107)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="applytextureto"></a> `applyTextureTo?` | [`ApplyTarget`](ApplyTarget.md)[] | Override which surfaces receive the texture. When omitted, defaults to floor+ceiling for open cells and wall for solid cells. | [api/createGame.ts:109](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L109) |
| <a id="ceilingheightoffset"></a> `ceilingHeightOffset?` | `number` | Lower (+) or raise (-) the ceiling surface by this many offset steps. Phase 3. | [api/createGame.ts:117](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L117) |
| <a id="ceilingpanelcount"></a> `ceilingPanelCount?` | `number` | Number of downward ceiling panels hanging below the ceiling. 0–4. | [api/createGame.ts:121](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L121) |
| <a id="ceilingskirt"></a> `ceilingSkirt?` | (`string` \| `null`)[] | Ceiling skirt slot tile names (up to 4). Null entries inherit the default. | [api/createGame.ts:125](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L125) |
| <a id="colliderflags"></a> `colliderFlags?` | [`ColliderFlags`](ColliderFlags.md) | Fine-grained collider flags. Phase 2. | [api/createGame.ts:113](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L113) |
| <a id="floorheightoffset"></a> `floorHeightOffset?` | `number` | Raise (+) or lower (-) the floor surface by this many offset steps. Phase 3. | [api/createGame.ts:115](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L115) |
| <a id="floorskirt"></a> `floorSkirt?` | (`string` \| `null`)[] | Floor skirt slot tile names (up to 4). Null entries inherit the default. | [api/createGame.ts:123](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L123) |
| <a id="hazard"></a> `hazard?` | `number` | Hazard ID to write into the hazards texture (0 = none). Phase 4. | [api/createGame.ts:127](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L127) |
| <a id="skypanelcount"></a> `skyPanelCount?` | `number` | Number of upward sky panels above the wall (open-sky cells). 0–4. | [api/createGame.ts:119](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L119) |
| <a id="solid"></a> `solid?` | `boolean` | Make this cell solid (true) or passable (false). Phase 2. | [api/createGame.ts:111](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L111) |
| <a id="temperature"></a> `temperature?` | `number` | Temperature value (0–255; 127 = neutral). Phase 4. | [api/createGame.ts:129](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L129) |
