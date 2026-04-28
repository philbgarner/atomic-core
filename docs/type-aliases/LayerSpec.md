[atomic-core](../README.md) / LayerSpec

# Type Alias: LayerSpec

> **LayerSpec** = `object`

Defined in: [rendering/dungeonRenderer.ts:200](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/rendering/dungeonRenderer.ts#L200)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="filter"></a> `filter?` | (`cx`, `cz`, `direction?`) => [`LayerFaceResult`](LayerFaceResult.md) | Called for each candidate face. Return an object to include the face (optionally overriding `tile` and `rotation`), or a falsy value to skip. `direction` is provided for 'wall', 'floorSkirt', and 'ceilSkirt' targets. Default: include every face with tileId 0, rotation 0. | [rendering/dungeonRenderer.ts:211](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/rendering/dungeonRenderer.ts#L211) |
| <a id="material"></a> `material` | `THREE.Material` | Three.js material for this layer's instanced mesh. | [rendering/dungeonRenderer.ts:204](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/rendering/dungeonRenderer.ts#L204) |
| <a id="polygonoffset"></a> `polygonOffset?` | `boolean` | Enable `THREE.Material.polygonOffset` on the layer material so it renders on top of the base geometry without z-fighting. Default: `true`. | [rendering/dungeonRenderer.ts:226](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/rendering/dungeonRenderer.ts#L226) |
| <a id="target"></a> `target` | [`LayerTarget`](LayerTarget.md) | Which geometry class to add the layer on top of. | [rendering/dungeonRenderer.ts:202](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/rendering/dungeonRenderer.ts#L202) |
| <a id="useatlas"></a> `useAtlas?` | `boolean` | Whether to attach atlas shader attributes (aUvRect, aSurface, etc.) to the instanced geometry. Defaults to `true` when an atlas was passed to `createDungeonRenderer`, `false` otherwise. | [rendering/dungeonRenderer.ts:221](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/rendering/dungeonRenderer.ts#L221) |
