[atomic-core](../README.md) / createGame

# Function: createGame()

> **createGame**(`canvas`, `options`): `GameHandle`

Defined in: [api/createGame.ts:1967](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/api/createGame.ts#L1967)

Create a game handle. Does not generate the dungeon — call `game.generate()`
after attaching callbacks.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `canvas` | `HTMLElement` |
| `options` | `GameOptions` |

## Returns

`GameHandle`
