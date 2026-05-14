[atomic-core](../README.md) / attachKeybindings

# Function: attachKeybindings()

> **attachKeybindings**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1856](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L1856)

Install keyboard bindings. Wraps `createKeybindings` and registers the
handle with the game so it is cleaned up on `destroy()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | `KeybindingsOptions` |

## Returns

`void`
