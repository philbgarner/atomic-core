[atomic-core](../README.md) / SerializedRendererOptions

# Type Alias: SerializedRendererOptions

> **SerializedRendererOptions** = `Omit`\<[`DungeonRendererOptions`](DungeonRendererOptions.md), `"packedAtlas"` \| `"tileNameResolver"` \| `"onCellClick"` \| `"onCellHover"`\>

Defined in: [dungeon/mapFile.ts:30](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/dungeon/mapFile.ts#L30)

Subset of DungeonRendererOptions that is JSON-safe.
Excludes packedAtlas, tileNameResolver, and event callbacks —
re-supply those at load time when creating the renderer.
