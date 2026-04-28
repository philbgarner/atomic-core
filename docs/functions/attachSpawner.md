[atomic-core](../README.md) / attachSpawner

# Function: attachSpawner()

> **attachSpawner**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1527](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/api/createGame.ts#L1527)

Register a spawn callback. Called per room during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onSpawn`: `SpawnCallback`; \} |
| `opts.onSpawn` | `SpawnCallback` |

## Returns

`void`
