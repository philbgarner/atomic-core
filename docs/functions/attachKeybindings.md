[atomic-core](../README.md) / attachKeybindings

# Function: attachKeybindings()

> **attachKeybindings**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1545](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/api/createGame.ts#L1545)

Install keyboard bindings. Wraps `createKeybindings` and registers the
handle with the game so it is cleaned up on `destroy()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | `KeybindingsOptions` |

## Returns

`void`
