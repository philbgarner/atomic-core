[atomic-core](../README.md) / LayerFaceResult

# Type Alias: LayerFaceResult

> **LayerFaceResult** = \{ `rotation?`: `number`; `tile?`: `string` \| `number`; \} \| `null` \| `false` \| `undefined`

Defined in: [rendering/dungeonRenderer.ts:210](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/rendering/dungeonRenderer.ts#L210)

Return value from a `LayerSpec.filter` callback.
Return an object (optionally overriding `tile`/`rotation`) to include the
face, or a falsy value to exclude it.
