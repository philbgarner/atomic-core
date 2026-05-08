[atomic-core](../README.md) / SurfacePaintTarget

# Type Alias: SurfacePaintTarget

> **SurfacePaintTarget** = `object`

Defined in: [api/createGame.ts:360](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L360)

Per-surface overlay tile names for a single cell. Each key is optional.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="ceil"></a> `ceil?` | `string`[] | Tile names to overlay on the ceiling face of this cell. Up to 4. | [api/createGame.ts:366](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L366) |
| <a id="ceilingpanels"></a> `ceilingPanels?` | (`string` \| `null`)[] | Tile names for ceiling panels hanging below the ceiling. Index 0 = immediately below the ceiling. Null entries use default. | [api/createGame.ts:374](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L374) |
| <a id="ceilskirtbase"></a> `ceilSkirtBase?` | (`string` \| `null`)[] | Base tile name per ceiling-skirt row. Index 0 = row closest to the wall top. Null entries inherit the default base. | [api/createGame.ts:368](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L368) |
| <a id="floor"></a> `floor?` | `string`[] | Tile names to overlay on the floor face of this cell. Up to 4. | [api/createGame.ts:362](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L362) |
| <a id="floorskirtbase"></a> `floorSkirtBase?` | (`string` \| `null`)[] | Base tile name per floor-skirt row. Index 0 = row closest to the wall bottom. Null entries inherit the default base. | [api/createGame.ts:370](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L370) |
| <a id="skypanels"></a> `skyPanels?` | (`string` \| `null`)[] | Tile names for sky panels above the wall (open-sky cells). Index 0 = immediately above the wall top. Null entries use default. | [api/createGame.ts:372](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L372) |
| <a id="wall"></a> `wall?` | `string`[] | Tile names to overlay on wall faces of this cell. Up to 4. | [api/createGame.ts:364](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L364) |
