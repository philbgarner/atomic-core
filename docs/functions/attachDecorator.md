[atomic-core](../README.md) / attachDecorator

# Function: attachDecorator()

> **attachDecorator**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1833](https://github.com/philbgarner/atomic-core/blob/1139349d441f04e7debe01470110a1d23e276630/src/lib/api/createGame.ts#L1833)

Register a decorator callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onDecorate`: `DecoratorCallback`; \} |
| `opts.onDecorate` | `DecoratorCallback` |

## Returns

`void`
