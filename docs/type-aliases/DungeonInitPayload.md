[atomic-core](../README.md) / DungeonInitPayload

# Type Alias: DungeonInitPayload

> **DungeonInitPayload** = `object`

Defined in: [transport/types.ts:100](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L100)

Sent by the host client after generate() so the server can validate moves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="config"></a> `config` | `Record`\<`string`, `unknown`\> | Original dungeon config so the server can share it with late-joiners. | [transport/types.ts:106](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L106) |
| <a id="height"></a> `height` | `number` | - | [transport/types.ts:104](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L104) |
| <a id="solid"></a> `solid` | `number`[] | Flat Uint8Array contents: 0 = walkable, >0 = solid. | [transport/types.ts:102](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L102) |
| <a id="width"></a> `width` | `number` | - | [transport/types.ts:103](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L103) |
