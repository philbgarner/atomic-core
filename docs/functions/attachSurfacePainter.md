[atomic-core](../README.md) / attachSurfacePainter

# Function: attachSurfacePainter()

> **attachSurfacePainter**(`game`, `opts`): `void`

Defined in: [api/createGame.ts:1616](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/api/createGame.ts#L1616)

Register a surface painter callback. Called per floor tile during `generate()`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | `GameHandle` |
| `opts` | \{ `onPaint`: `SurfacePainterCallback`; \} |
| `opts.onPaint` | `SurfacePainterCallback` |

## Returns

`void`
