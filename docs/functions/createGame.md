[atomic-core](../README.md) / createGame

# Function: createGame()

> **createGame**(`canvas`, `options`): `GameHandle`

Defined in: [api/createGame.ts:1243](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L1243)

Create a game handle. Does not generate the dungeon — call `game.generate()`
after attaching callbacks.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `canvas` | `HTMLElement` |
| `options` | `GameOptions` |

## Returns

`GameHandle`
