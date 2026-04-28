[atomic-core](../README.md) / createDungeonRenderer

# Function: createDungeonRenderer()

> **createDungeonRenderer**(`element`, `game`, `options?`): [`DungeonRenderer`](../type-aliases/DungeonRenderer.md)

Defined in: [rendering/dungeonRenderer.ts:573](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/rendering/dungeonRenderer.ts#L573)

Mount a Three.js first-person dungeon renderer into `element`.

Call after `game.generate()` is wired up. The renderer reads dungeon geometry
from the game handle and re-renders whenever the player moves. Pass an
`options.packedAtlas` + `options.tileNameResolver` pair to enable textured
walls/floors/ceilings; omit them for flat-colour geometry.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `element` | `HTMLElement` | Container element — the renderer fills it entirely. |
| `game` | `GameHandle` | Live `GameHandle` returned by `createGame()`. |
| `options` | [`DungeonRendererOptions`](../type-aliases/DungeonRendererOptions.md) | Optional renderer configuration (fog, atlas, skirt tiles, etc.). |

## Returns

[`DungeonRenderer`](../type-aliases/DungeonRenderer.md)

A `DungeonRenderer` handle with `setEntities`, `addLayer`, etc.

## Example

```ts
const packed = await loadTextureAtlas('sprites.png', atlasJson);
const renderer = createDungeonRenderer(document.getElementById('viewport'), game, {
  packedAtlas: packed,
  tileNameResolver: packedAtlasResolver(packed),
  floorTile: 'stone_floor',
  wallTile:  'brick_wall',
  ceilTile:  'ceiling_stone',
});
game.events.on('turn', () => renderer.setEntities([...enemies]));
```
