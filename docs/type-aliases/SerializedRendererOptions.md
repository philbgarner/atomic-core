[atomic-core](../README.md) / SerializedRendererOptions

# Type Alias: SerializedRendererOptions

> **SerializedRendererOptions** = `Omit`\<[`DungeonRendererOptions`](DungeonRendererOptions.md), `"packedAtlas"` \| `"tileNameResolver"` \| `"onCellClick"` \| `"onCellHover"`\>

Defined in: [dungeon/mapFile.ts:30](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/dungeon/mapFile.ts#L30)

Subset of DungeonRendererOptions that is JSON-safe.
Excludes packedAtlas, tileNameResolver, and event callbacks —
re-supply those at load time when creating the renderer.
