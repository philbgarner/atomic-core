[atomic-core](../README.md) / attachKeybindings

# Function: attachKeybindings()

> **attachKeybindings**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:2396](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L2396)

Install keyboard bindings. Wraps `createKeybindings` and registers the
handle with the game so it is cleaned up on `destroy()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | `KeybindingsOptions` |

## Returns

`void`
