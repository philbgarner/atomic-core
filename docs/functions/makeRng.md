[atomic-core](../README.md) / makeRng

# Function: makeRng()

> **makeRng**(`seed`): () => `number`

Defined in: [utils/rng.ts:6](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/utils/rng.ts#L6)

Create a seeded LCG pseudo-random number generator.
Uses Numerical Recipes constants. Returns a function that yields
deterministic values in [0, 1) for a given seed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | `number` |

## Returns

() => `number`
