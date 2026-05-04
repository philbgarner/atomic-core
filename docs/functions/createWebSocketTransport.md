[atomic-core](../README.md) / createWebSocketTransport

# Function: createWebSocketTransport()

> **createWebSocketTransport**(`url`): [`ActionTransport`](../type-aliases/ActionTransport.md)

Defined in: [transport/websocket.ts:34](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/transport/websocket.ts#L34)

Create a browser-side WebSocket transport for multiplayer.
Pass the returned `ActionTransport` to `createGame()` via `GameOptions.transport`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` | WebSocket server URL (e.g. `"ws://localhost:3001"`). |

## Returns

[`ActionTransport`](../type-aliases/ActionTransport.md)
