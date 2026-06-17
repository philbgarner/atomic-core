[atomic-core](../README.md) / ServerStateUpdate

# Type Alias: ServerStateUpdate

> **ServerStateUpdate** = `object`

Defined in: [transport/types.ts:67](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L67)

Broadcast by the server after every accepted action.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="monsters"></a> `monsters?` | `MonsterNetState`[] | Current monster positions/state, supplied by the host. | [transport/types.ts:72](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L72) |
| <a id="players"></a> `players` | `Record`\<`string`, [`PlayerNetState`](PlayerNetState.md)\> | Canonical state for every connected player. | [transport/types.ts:69](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L69) |
| <a id="turn"></a> `turn` | `number` | - | [transport/types.ts:70](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/transport/types.ts#L70) |
