[atomic-core](../README.md) / createGame

# Function: createGame()

> **createGame**(`canvas`, `options`): `GameHandle`

Defined in: [api/createGame.ts:1967](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L1967)

Create a game handle. Does not generate the dungeon — call `game.generate()`
after attaching callbacks.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `canvas` | `HTMLElement` |
| `options` | `GameOptions` |

## Returns

`GameHandle`
