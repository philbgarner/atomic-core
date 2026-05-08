[atomic-core](../README.md) / createWebSocketTransport

# Function: createWebSocketTransport()

> **createWebSocketTransport**(`url`): [`ActionTransport`](../type-aliases/ActionTransport.md)

Defined in: [transport/websocket.ts:34](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/transport/websocket.ts#L34)

Create a browser-side WebSocket transport for multiplayer.
Pass the returned `ActionTransport` to `createGame()` via `GameOptions.transport`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` | WebSocket server URL (e.g. `"ws://localhost:3001"`). |

## Returns

[`ActionTransport`](../type-aliases/ActionTransport.md)
