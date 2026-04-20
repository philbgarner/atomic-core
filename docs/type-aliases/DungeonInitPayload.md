[atomic-core](../README.md) / DungeonInitPayload

# Type Alias: DungeonInitPayload

> **DungeonInitPayload** = `object`

Defined in: [transport/types.ts:64](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/transport/types.ts#L64)

Sent by the host client after generate() so the server can validate moves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="config"></a> `config` | `Record`\<`string`, `unknown`\> | Original dungeon config so the server can share it with late-joiners. | [transport/types.ts:70](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/transport/types.ts#L70) |
| <a id="height"></a> `height` | `number` | - | [transport/types.ts:68](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/transport/types.ts#L68) |
| <a id="solid"></a> `solid` | `number`[] | Flat Uint8Array contents: 0 = walkable, >0 = solid. | [transport/types.ts:66](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/transport/types.ts#L66) |
| <a id="width"></a> `width` | `number` | - | [transport/types.ts:67](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/transport/types.ts#L67) |
