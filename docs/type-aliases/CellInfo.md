[atomic-core](../README.md) / CellInfo

# Type Alias: CellInfo

> **CellInfo** = `object`

Defined in: [rendering/dungeonRenderer.ts:53](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/rendering/dungeonRenderer.ts#L53)

Information about a dungeon cell returned by mouse interaction callbacks.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="cx"></a> `cx` | `number` | Grid column (0-based). | [rendering/dungeonRenderer.ts:55](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/rendering/dungeonRenderer.ts#L55) |
| <a id="cz"></a> `cz` | `number` | Grid row (0-based). | [rendering/dungeonRenderer.ts:57](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/rendering/dungeonRenderer.ts#L57) |
| <a id="entityid"></a> `entityId?` | `string` | entity id, if we clicked on one | [rendering/dungeonRenderer.ts:61](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/rendering/dungeonRenderer.ts#L61) |
| <a id="regionid"></a> `regionId` | `number` | Region/room ID from the dungeon's regionId texture (0 = unassigned). | [rendering/dungeonRenderer.ts:59](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/rendering/dungeonRenderer.ts#L59) |
