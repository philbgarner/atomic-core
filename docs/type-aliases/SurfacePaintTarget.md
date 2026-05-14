[atomic-core](../README.md) / SurfacePaintTarget

# Type Alias: SurfacePaintTarget

> **SurfacePaintTarget** = `object`

Defined in: [api/createGame.ts:539](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L539)

Per-surface overlay tile names for a single cell. Each key is optional.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="ceil"></a> `ceil?` | `string`[] | Tile names to overlay on the ceiling face of this cell. Up to 4. | [api/createGame.ts:545](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L545) |
| <a id="ceilingpanels"></a> `ceilingPanels?` | (`string` \| `null`)[] | Tile names for ceiling panels hanging below the ceiling. Index 0 = immediately below the ceiling. Null entries use default. | [api/createGame.ts:553](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L553) |
| <a id="ceilskirtbase"></a> `ceilSkirtBase?` | (`string` \| `null`)[] | Base tile name per ceiling-skirt row. Index 0 = row closest to the wall top. Null entries inherit the default base. | [api/createGame.ts:547](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L547) |
| <a id="floor"></a> `floor?` | `string`[] | Tile names to overlay on the floor face of this cell. Up to 4. | [api/createGame.ts:541](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L541) |
| <a id="floorskirtbase"></a> `floorSkirtBase?` | (`string` \| `null`)[] | Base tile name per floor-skirt row. Index 0 = row closest to the wall bottom. Null entries inherit the default base. | [api/createGame.ts:549](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L549) |
| <a id="skypanels"></a> `skyPanels?` | (`string` \| `null`)[] | Tile names for sky panels above the wall (open-sky cells). Index 0 = immediately above the wall top. Null entries use default. | [api/createGame.ts:551](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L551) |
| <a id="wall"></a> `wall?` | `string`[] | Tile names to overlay on wall faces of this cell. Up to 4. | [api/createGame.ts:543](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/api/createGame.ts#L543) |
