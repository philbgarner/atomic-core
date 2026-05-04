[atomic-core](../README.md) / DungeonInitPayload

# Type Alias: DungeonInitPayload

> **DungeonInitPayload** = `object`

Defined in: [transport/types.ts:76](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L76)

Sent by the host client after generate() so the server can validate moves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="config"></a> `config` | `Record`\<`string`, `unknown`\> | Original dungeon config so the server can share it with late-joiners. | [transport/types.ts:82](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L82) |
| <a id="height"></a> `height` | `number` | - | [transport/types.ts:80](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L80) |
| <a id="solid"></a> `solid` | `number`[] | Flat Uint8Array contents: 0 = walkable, >0 = solid. | [transport/types.ts:78](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L78) |
| <a id="width"></a> `width` | `number` | - | [transport/types.ts:79](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L79) |
