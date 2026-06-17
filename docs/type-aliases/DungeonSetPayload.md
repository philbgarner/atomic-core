[atomic-core](../README.md) / DungeonSetPayload

# Type Alias: DungeonSetPayload

> **DungeonSetPayload** = `object`

Defined in: [transport/types.ts:80](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L80)

Payload for a single-cell dungeon modification sent via dungeon.set().
Mirrors SetCellOptions (minus skipSync) so the transport layer stays
independent of createGame's type definitions.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="options"></a> `options?` | `object` | [transport/types.ts:84](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L84) |
| `options.applyTextureTo?` | `string`[] | [transport/types.ts:85](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L85) |
| `options.ceilingHeightOffset?` | `number` | [transport/types.ts:89](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L89) |
| `options.ceilingPanelCount?` | `number` | [transport/types.ts:91](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L91) |
| `options.ceilingSkirt?` | (`string` \| `null`)[] | [transport/types.ts:93](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L93) |
| `options.colliderFlags?` | `object` | [transport/types.ts:87](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L87) |
| `options.colliderFlags.blocked?` | `boolean` | [transport/types.ts:87](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L87) |
| `options.colliderFlags.lightPassable?` | `boolean` | [transport/types.ts:87](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L87) |
| `options.colliderFlags.walkable?` | `boolean` | [transport/types.ts:87](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L87) |
| `options.floorHeightOffset?` | `number` | [transport/types.ts:88](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L88) |
| `options.floorSkirt?` | (`string` \| `null`)[] | [transport/types.ts:92](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L92) |
| `options.hazard?` | `number` | [transport/types.ts:94](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L94) |
| `options.skyPanelCount?` | `number` | [transport/types.ts:90](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L90) |
| `options.solid?` | `boolean` | [transport/types.ts:86](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L86) |
| `options.temperature?` | `number` | [transport/types.ts:95](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L95) |
| <a id="spritename"></a> `spriteName` | `string` | [transport/types.ts:83](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L83) |
| <a id="x"></a> `x` | `number` | [transport/types.ts:81](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L81) |
| <a id="y"></a> `y` | `number` | [transport/types.ts:82](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L82) |
