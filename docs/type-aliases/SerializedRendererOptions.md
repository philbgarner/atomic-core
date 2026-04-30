[atomic-core](../README.md) / SerializedRendererOptions

# Type Alias: SerializedRendererOptions

> **SerializedRendererOptions** = `Omit`\<[`DungeonRendererOptions`](DungeonRendererOptions.md), `"packedAtlas"` \| `"tileNameResolver"` \| `"onCellClick"` \| `"onCellHover"`\>

Defined in: [dungeon/mapFile.ts:30](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/dungeon/mapFile.ts#L30)

Subset of DungeonRendererOptions that is JSON-safe.
Excludes packedAtlas, tileNameResolver, and event callbacks —
re-supply those at load time when creating the renderer.
