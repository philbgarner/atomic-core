[atomic-core](../README.md) / CellData

# Type Alias: CellData

> **CellData** = `object`

Defined in: [api/createGame.ts:171](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L171)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="blocked"></a> `blocked` | `boolean` | True if all movement (including forced) is prevented. | [api/createGame.ts:177](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L177) |
| <a id="ceilingheightoffset"></a> `ceilingHeightOffset` | `number` \| `null` \| `undefined` | Ceiling height offset in steps (positive = lowered, negative = raised, 0 = default). Matches the `ceilingHeightOffset` convention in `SetCellOptions`. `null` means open sky (no ceiling geometry). `undefined` when the texture is absent (tiled dungeon). | [api/createGame.ts:192](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L192) |
| <a id="ceilingpanelcount"></a> `ceilingPanelCount` | `number` \| `undefined` | Number of downward ceiling panels below the ceiling (0–4). `undefined` when the texture is absent. | [api/createGame.ts:196](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L196) |
| <a id="ceilingtype"></a> `ceilingType` | `number` | Ceiling type index from atlas.json ceilingTypes (0 = no ceiling type). | [api/createGame.ts:206](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L206) |
| <a id="floorheightoffset"></a> `floorHeightOffset` | `number` \| `null` \| `undefined` | Floor height offset in steps (positive = raised, negative = lowered, 0 = default). `null` means a pit (no floor geometry). `undefined` when the texture is absent (tiled dungeon). | [api/createGame.ts:186](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L186) |
| <a id="floortype"></a> `floorType` | `number` | Floor type index from atlas.json floorTypes (0 = no floor). | [api/createGame.ts:202](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L202) |
| <a id="hazard"></a> `hazard` | `number` | Hazard ID (0 = none). | [api/createGame.ts:198](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L198) |
| <a id="lightpassable"></a> `lightPassable` | `boolean` | True if light/LOS rays pass through. | [api/createGame.ts:179](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L179) |
| <a id="paint"></a> `paint` | [`SurfacePaintTarget`](SurfacePaintTarget.md) \| `undefined` | Surface overlay tile names applied via paint(). `undefined` if this cell has not been painted. | [api/createGame.ts:208](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L208) |
| <a id="regionid"></a> `regionId` | `number` | Room/region ID (0 = unassigned). | [api/createGame.ts:181](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L181) |
| <a id="skypanelcount"></a> `skyPanelCount` | `number` \| `undefined` | Number of upward sky panels above the wall (0–4). `undefined` when the texture is absent. | [api/createGame.ts:194](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L194) |
| <a id="solid"></a> `solid` | `boolean` | True if this is a solid wall cell. | [api/createGame.ts:173](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L173) |
| <a id="temperature"></a> `temperature` | `number` | Temperature (0–255; 127 = neutral). | [api/createGame.ts:200](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L200) |
| <a id="walkable"></a> `walkable` | `boolean` | True if normal movement is permitted. | [api/createGame.ts:175](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L175) |
| <a id="walltype"></a> `wallType` | `number` | Wall type index from atlas.json wallTypes (0 = no wall). | [api/createGame.ts:204](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L204) |
