[atomic-core](../README.md) / attachDecorator

# Function: attachDecorator()

> **attachDecorator**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1554](https://github.com/philbgarner/atomic-core/blob/ef32dae4d7c26fc08c73501d5930c28933411788/src/lib/api/createGame.ts#L1554)

Register a decorator callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onDecorate`: `DecoratorCallback`; \} |
| `opts.onDecorate` | `DecoratorCallback` |

## Returns

`void`
