[atomic-core](../README.md) / attachSpawner

# Function: attachSpawner()

> **attachSpawner**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1511](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/api/createGame.ts#L1511)

Register a spawn callback. Called per room during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onSpawn`: `SpawnCallback`; \} |
| `opts.onSpawn` | `SpawnCallback` |

## Returns

`void`
