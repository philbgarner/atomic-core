[atomic-core](../README.md) / spriteToUvRect

# Function: spriteToUvRect()

> **spriteToUvRect**(`sprite`): [`UvRect`](../type-aliases/UvRect.md)

Defined in: [rendering/textureLoader.ts:103](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/rendering/textureLoader.ts#L103)

Convert a PackedSprite's canvas UV coordinates to a GL-convention UV rect.
Three.js textures use flipY=true by default, so canvas y=0 (top) becomes
GL y=1 (top). The returned rect's y is the GL bottom-left corner of the sprite.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `sprite` | [`PackedSprite`](../type-aliases/PackedSprite.md) |

## Returns

[`UvRect`](../type-aliases/UvRect.md)
