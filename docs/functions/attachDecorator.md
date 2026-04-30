[atomic-core](../README.md) / attachDecorator

# Function: attachDecorator()

> **attachDecorator**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1531](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/api/createGame.ts#L1531)

Register a decorator callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onDecorate`: `DecoratorCallback`; \} |
| `opts.onDecorate` | `DecoratorCallback` |

## Returns

`void`
