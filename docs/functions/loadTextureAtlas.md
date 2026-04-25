[atomic-core](../README.md) / loadTextureAtlas

# Function: loadTextureAtlas()

> **loadTextureAtlas**(`imageUrl`, `atlasJson`, `options?`): `Promise`\<[`PackedAtlas`](../type-aliases/PackedAtlas.md)\>

Defined in: [rendering/textureLoader.ts:375](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/rendering/textureLoader.ts#L375)

Load a TexturePacker-format sprite atlas, repack all sprites into a
power-of-two OffscreenCanvas, and return a PackedAtlas with UV data and
name/id lookups.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `imageUrl` | `string` | URL of the source sprite sheet image. |
| `atlasJson` | [`TextureAtlasJson`](../type-aliases/TextureAtlasJson.md) | Parsed TextureAtlasJson (frames + meta). |
| `options` | [`LoadingOptions`](../type-aliases/LoadingOptions.md) | Optional loading screen and progress options. |

## Returns

`Promise`\<[`PackedAtlas`](../type-aliases/PackedAtlas.md)\>
