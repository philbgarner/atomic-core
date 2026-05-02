[atomic-core](../README.md) / attachKeybindings

# Function: attachKeybindings()

> **attachKeybindings**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1577](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L1577)

Install keyboard bindings. Wraps `createKeybindings` and registers the
handle with the game so it is cleaned up on `destroy()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | `KeybindingsOptions` |

## Returns

`void`
