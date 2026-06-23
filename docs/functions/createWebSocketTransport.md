[atomic-core](../README.md) / createWebSocketTransport

# Function: createWebSocketTransport()

> **createWebSocketTransport**(`url`): [`ActionTransport`](../type-aliases/ActionTransport.md)

Defined in: [transport/websocket.ts:35](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/transport/websocket.ts#L35)

Create a browser-side WebSocket transport for multiplayer.
Pass the returned `ActionTransport` to `createGame()` via `GameOptions.transport`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` | WebSocket server URL (e.g. `"ws://localhost:3001"`). |

## Returns

[`ActionTransport`](../type-aliases/ActionTransport.md)
