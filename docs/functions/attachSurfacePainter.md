[atomic-core](../README.md) / attachSurfacePainter

# Function: attachSurfacePainter()

> **attachSurfacePainter**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1565](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/api/createGame.ts#L1565)

Register a surface painter callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onPaint`: `SurfacePainterCallback`; \} |
| `opts.onPaint` | `SurfacePainterCallback` |

## Returns

`void`
