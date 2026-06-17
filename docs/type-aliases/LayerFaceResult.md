[atomic-core](../README.md) / LayerFaceResult

# Type Alias: LayerFaceResult

> **LayerFaceResult** = \{ `rotation?`: `number`; `tile?`: `string` \| `number`; \} \| `null` \| `false` \| `undefined`

Defined in: [rendering/dungeonRenderer.ts:232](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/rendering/dungeonRenderer.ts#L232)

Return value from a `LayerSpec.filter` callback.
Return an object (optionally overriding `tile`/`rotation`) to include the
face, or a falsy value to exclude it.
