[atomic-core](../README.md) / attachKeybindings

# Function: attachKeybindings()

> **attachKeybindings**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:2396](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L2396)

Install keyboard bindings. Wraps `createKeybindings` and registers the
handle with the game so it is cleaned up on `destroy()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | `KeybindingsOptions` |

## Returns

`void`
