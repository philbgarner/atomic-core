[atomic-core](../README.md) / SerializedRendererOptions

# Type Alias: SerializedRendererOptions

> **SerializedRendererOptions** = `Omit`\<[`DungeonRendererOptions`](DungeonRendererOptions.md), `"packedAtlas"` \| `"tileNameResolver"` \| `"onCellClick"` \| `"onCellHover"`\>

Defined in: [dungeon/mapFile.ts:30](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/dungeon/mapFile.ts#L30)

Subset of DungeonRendererOptions that is JSON-safe.
Excludes packedAtlas, tileNameResolver, and event callbacks —
re-supply those at load time when creating the renderer.
