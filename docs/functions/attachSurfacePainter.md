[atomic-core](../README.md) / attachSurfacePainter

# Function: attachSurfacePainter()

> **attachSurfacePainter**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1533](https://github.com/philbgarner/atomic-core/blob/064594a1b398f6ecf2f1112923401d0eaddbea06/src/lib/api/createGame.ts#L1533)

Register a surface painter callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onPaint`: `SurfacePainterCallback`; \} |
| `opts.onPaint` | `SurfacePainterCallback` |

## Returns

`void`
