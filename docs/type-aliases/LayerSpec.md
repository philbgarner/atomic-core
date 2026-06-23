[atomic-core](../README.md) / LayerSpec

# Type Alias: LayerSpec

> **LayerSpec** = `object`

Defined in: [rendering/dungeonRenderer.ts:238](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/rendering/dungeonRenderer.ts#L238)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="filter"></a> `filter?` | (`cx`, `cz`, `direction?`) => [`LayerFaceResult`](LayerFaceResult.md) | Called for each candidate face. Return an object to include the face (optionally overriding `tile` and `rotation`), or a falsy value to skip. `direction` is provided for 'wall', 'floorSkirt', and 'ceilSkirt' targets. Default: include every face with tileId 0, rotation 0. | [rendering/dungeonRenderer.ts:249](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/rendering/dungeonRenderer.ts#L249) |
| <a id="material"></a> `material` | `THREE.Material` | Three.js material for this layer's instanced mesh. | [rendering/dungeonRenderer.ts:242](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/rendering/dungeonRenderer.ts#L242) |
| <a id="polygonoffset"></a> `polygonOffset?` | `boolean` | Enable `THREE.Material.polygonOffset` on the layer material so it renders on top of the base geometry without z-fighting. Default: `true`. | [rendering/dungeonRenderer.ts:264](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/rendering/dungeonRenderer.ts#L264) |
| <a id="target"></a> `target` | [`LayerTarget`](LayerTarget.md) | Which geometry class to add the layer on top of. | [rendering/dungeonRenderer.ts:240](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/rendering/dungeonRenderer.ts#L240) |
| <a id="useatlas"></a> `useAtlas?` | `boolean` | Whether to attach atlas shader attributes (aUvRect, aSurface, etc.) to the instanced geometry. Defaults to `true` when an atlas was passed to `createDungeonRenderer`, `false` otherwise. | [rendering/dungeonRenderer.ts:259](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/rendering/dungeonRenderer.ts#L259) |
