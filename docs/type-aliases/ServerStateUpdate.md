[atomic-core](../README.md) / ServerStateUpdate

# Type Alias: ServerStateUpdate

> **ServerStateUpdate** = `object`

Defined in: [transport/types.ts:67](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L67)

Broadcast by the server after every accepted action.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="monsters"></a> `monsters?` | `MonsterNetState`[] | Current monster positions/state, supplied by the host. | [transport/types.ts:72](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L72) |
| <a id="players"></a> `players` | `Record`\<`string`, [`PlayerNetState`](PlayerNetState.md)\> | Canonical state for every connected player. | [transport/types.ts:69](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L69) |
| <a id="turn"></a> `turn` | `number` | - | [transport/types.ts:70](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/types.ts#L70) |
