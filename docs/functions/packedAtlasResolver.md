[atomic-core](../README.md) / packedAtlasResolver

# Function: packedAtlasResolver()

> **packedAtlasResolver**(`atlas`): (`name`) => `number`

Defined in: [rendering/textureLoader.ts:121](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/textureLoader.ts#L121)

Create a tile-name resolver from a baked PackedAtlas.
Pass the returned function as `tileNameResolver` in DungeonRendererOptions.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `atlas` | [`PackedAtlas`](../type-aliases/PackedAtlas.md) |

## Returns

(`name`) => `number`

## Example

```ts
const packed = await loadTextureAtlas(src, json);
const resolver = packedAtlasResolver(packed);
createDungeonRenderer(el, game, { ..., tileNameResolver: resolver });
```
