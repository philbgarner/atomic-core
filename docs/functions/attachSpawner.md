[atomic-core](../README.md) / attachSpawner

# Function: attachSpawner()

> **attachSpawner**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1594](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L1594)

Register a spawn callback. Called per room during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onSpawn`: `SpawnCallback`; \} |
| `opts.onSpawn` | `SpawnCallback` |

## Returns

`void`
