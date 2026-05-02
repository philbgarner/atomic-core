[atomic-core](../README.md) / SurfacePaintTarget

# Type Alias: SurfacePaintTarget

> **SurfacePaintTarget** = `object`

Defined in: [api/createGame.ts:312](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L312)

Per-surface overlay tile names for a single cell. Each key is optional.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="ceil"></a> `ceil?` | `string`[] | Tile names to overlay on the ceiling face of this cell. Up to 4. | [api/createGame.ts:318](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L318) |
| <a id="ceilingpanels"></a> `ceilingPanels?` | (`string` \| `null`)[] | Tile names for ceiling panels hanging below the ceiling. Index 0 = immediately below the ceiling. Null entries use default. | [api/createGame.ts:326](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L326) |
| <a id="ceilskirtbase"></a> `ceilSkirtBase?` | (`string` \| `null`)[] | Base tile name per ceiling-skirt row. Index 0 = row closest to the wall top. Null entries inherit the default base. | [api/createGame.ts:320](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L320) |
| <a id="floor"></a> `floor?` | `string`[] | Tile names to overlay on the floor face of this cell. Up to 4. | [api/createGame.ts:314](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L314) |
| <a id="floorskirtbase"></a> `floorSkirtBase?` | (`string` \| `null`)[] | Base tile name per floor-skirt row. Index 0 = row closest to the wall bottom. Null entries inherit the default base. | [api/createGame.ts:322](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L322) |
| <a id="skypanels"></a> `skyPanels?` | (`string` \| `null`)[] | Tile names for sky panels above the wall (open-sky cells). Index 0 = immediately above the wall top. Null entries use default. | [api/createGame.ts:324](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L324) |
| <a id="wall"></a> `wall?` | `string`[] | Tile names to overlay on wall faces of this cell. Up to 4. | [api/createGame.ts:316](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L316) |
