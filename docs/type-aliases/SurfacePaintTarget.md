[atomic-core](../README.md) / SurfacePaintTarget

# Type Alias: SurfacePaintTarget

> **SurfacePaintTarget** = `object`

Defined in: [api/createGame.ts:646](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L646)

Per-surface overlay tile names for a single cell. Each key is optional.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="ceil"></a> `ceil?` | `string`[] | Tile names to overlay on the ceiling face of this cell. Up to 4. | [api/createGame.ts:652](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L652) |
| <a id="ceilingpanels"></a> `ceilingPanels?` | (`string` \| `null`)[] | Tile names for ceiling panels hanging below the ceiling. Index 0 = immediately below the ceiling. Null entries use default. | [api/createGame.ts:660](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L660) |
| <a id="ceilskirtbase"></a> `ceilSkirtBase?` | (`string` \| `null`)[] | Base tile name per ceiling-skirt row. Index 0 = row closest to the wall top. Null entries inherit the default base. | [api/createGame.ts:654](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L654) |
| <a id="floor"></a> `floor?` | `string`[] | Tile names to overlay on the floor face of this cell. Up to 4. | [api/createGame.ts:648](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L648) |
| <a id="floorskirtbase"></a> `floorSkirtBase?` | (`string` \| `null`)[] | Base tile name per floor-skirt row. Index 0 = row closest to the wall bottom. Null entries inherit the default base. | [api/createGame.ts:656](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L656) |
| <a id="skypanels"></a> `skyPanels?` | (`string` \| `null`)[] | Tile names for sky panels above the wall (open-sky cells). Index 0 = immediately above the wall top. Null entries use default. | [api/createGame.ts:658](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L658) |
| <a id="wall"></a> `wall?` | `string`[] | Tile names to overlay on wall faces of this cell. Up to 4. | [api/createGame.ts:650](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L650) |
