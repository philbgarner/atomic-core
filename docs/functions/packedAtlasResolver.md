[atomic-core](../README.md) / packedAtlasResolver

# Function: packedAtlasResolver()

> **packedAtlasResolver**(`atlas`): (`name`) => `number`

Defined in: [rendering/textureLoader.ts:121](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/rendering/textureLoader.ts#L121)

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
