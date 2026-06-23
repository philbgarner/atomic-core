[atomic-core](../README.md) / attachSurfacePainter

# Function: attachSurfacePainter()

> **attachSurfacePainter**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:2384](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/api/createGame.ts#L2384)

Register a surface painter callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onPaint`: `SurfacePainterCallback`; \} |
| `opts.onPaint` | `SurfacePainterCallback` |

## Returns

`void`
