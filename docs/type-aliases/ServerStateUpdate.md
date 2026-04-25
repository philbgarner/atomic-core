[atomic-core](../README.md) / ServerStateUpdate

# Type Alias: ServerStateUpdate

> **ServerStateUpdate** = `object`

Defined in: [transport/types.ts:56](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/transport/types.ts#L56)

Broadcast by the server after every accepted action.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="monsters"></a> `monsters?` | `MonsterNetState`[] | Current monster positions/state, supplied by the host. | [transport/types.ts:61](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/transport/types.ts#L61) |
| <a id="players"></a> `players` | `Record`\<`string`, [`PlayerNetState`](PlayerNetState.md)\> | Canonical state for every connected player. | [transport/types.ts:58](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/transport/types.ts#L58) |
| <a id="turn"></a> `turn` | `number` | - | [transport/types.ts:59](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/transport/types.ts#L59) |
