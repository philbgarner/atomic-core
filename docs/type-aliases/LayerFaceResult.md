[atomic-core](../README.md) / LayerFaceResult

# Type Alias: LayerFaceResult

> **LayerFaceResult** = \{ `rotation?`: `number`; `tile?`: `string` \| `number`; \} \| `null` \| `false` \| `undefined`

Defined in: [rendering/dungeonRenderer.ts:210](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/dungeonRenderer.ts#L210)

Return value from a `LayerSpec.filter` callback.
Return an object (optionally overriding `tile`/`rotation`) to include the
face, or a falsy value to exclude it.
