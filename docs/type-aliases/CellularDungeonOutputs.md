[atomic-core](../README.md) / CellularDungeonOutputs

# Type Alias: CellularDungeonOutputs

> **CellularDungeonOutputs** = [`RoomedDungeonOutputs`](RoomedDungeonOutputs.md) & `object`

Defined in: [dungeon/cellular.ts:132](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/dungeon/cellular.ts#L132)

## Type Declaration

### textures

> **textures**: `object`

#### Type Declaration

#### textures.ceilingHeightOffset

> **ceilingHeightOffset**: `THREE.DataTexture`

Per-cell ceiling height offset (R8). Encoding: 128 = no offset, 127 = +1 step up
(ceiling raised), 129 = +1 step down (ceiling lowered), 0 = open sky.
When `vaultedCeiling` is enabled, values are derived from `distanceToWall`
(weighted by `distanceToWallWeight`, scaled to `vaultMaxSteps`) combined with
Perlin noise (weighted by `noiseWeight`, amplitude `noiseSteps`), then scaled
by `vaultHeightScale`. Setting both weights to 0 produces a flat ceiling.

#### textures.ceilingOverlays

> **ceilingOverlays**: `THREE.DataTexture`

#### textures.ceilingType

> **ceilingType**: `THREE.DataTexture`

#### textures.ceilSkirtType

> **ceilSkirtType**: `THREE.DataTexture`

#### textures.colliderFlags

> **colliderFlags**: `THREE.DataTexture`

#### textures.distanceToWall

> **distanceToWall**: `THREE.DataTexture`

#### textures.floorHeightOffset

> **floorHeightOffset**: `THREE.DataTexture`

Per-cell floor height offset (R8). Encoding: 128 = no offset, >128 = floor raised,
<128 = floor lowered, 0 = pit marker.
When `vaultedFloor` is enabled, each room's voronoi region is subdivided by
`floorSubSeeds` internal points; the floor is depressed toward those centers
(using sub-region distance-to-edge), mixed with Perlin noise.

#### textures.floorSkirtType

> **floorSkirtType**: `THREE.DataTexture`

#### textures.floorType

> **floorType**: `THREE.DataTexture`

#### textures.hazards

> **hazards**: `THREE.DataTexture`

#### textures.overlays

> **overlays**: `THREE.DataTexture`

#### textures.regionId

> **regionId**: `THREE.DataTexture`

Voronoi region ID per cell — 0 = wall, 1..N = room IDs assigned by the
local-maxima Voronoi decomposition of the distanceToWall field.
Matches startRoomId / endRoomId and the keys in `rooms`.

#### textures.solid

> **solid**: `THREE.DataTexture`

#### textures.temperature

> **temperature**: `THREE.DataTexture`

Per-cell temperature, 0 = coldest, 255 = hottest. Default: 127 for all floor cells.

#### textures.wallOverlays

> **wallOverlays**: `THREE.DataTexture`

#### textures.wallType

> **wallType**: `THREE.DataTexture`
