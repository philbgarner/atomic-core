[atomic-core](../README.md) / LayerSpec

# Type Alias: LayerSpec

> **LayerSpec** = `object`

Defined in: [rendering/dungeonRenderer.ts:216](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/dungeonRenderer.ts#L216)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="filter"></a> `filter?` | (`cx`, `cz`, `direction?`) => [`LayerFaceResult`](LayerFaceResult.md) | Called for each candidate face. Return an object to include the face (optionally overriding `tile` and `rotation`), or a falsy value to skip. `direction` is provided for 'wall', 'floorSkirt', and 'ceilSkirt' targets. Default: include every face with tileId 0, rotation 0. | [rendering/dungeonRenderer.ts:227](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/dungeonRenderer.ts#L227) |
| <a id="material"></a> `material` | `THREE.Material` | Three.js material for this layer's instanced mesh. | [rendering/dungeonRenderer.ts:220](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/dungeonRenderer.ts#L220) |
| <a id="polygonoffset"></a> `polygonOffset?` | `boolean` | Enable `THREE.Material.polygonOffset` on the layer material so it renders on top of the base geometry without z-fighting. Default: `true`. | [rendering/dungeonRenderer.ts:242](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/dungeonRenderer.ts#L242) |
| <a id="target"></a> `target` | [`LayerTarget`](LayerTarget.md) | Which geometry class to add the layer on top of. | [rendering/dungeonRenderer.ts:218](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/dungeonRenderer.ts#L218) |
| <a id="useatlas"></a> `useAtlas?` | `boolean` | Whether to attach atlas shader attributes (aUvRect, aSurface, etc.) to the instanced geometry. Defaults to `true` when an atlas was passed to `createDungeonRenderer`, `false` otherwise. | [rendering/dungeonRenderer.ts:237](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/dungeonRenderer.ts#L237) |
