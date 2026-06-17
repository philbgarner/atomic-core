[atomic-core](../README.md) / toFaceRotation

# Function: toFaceRotation()

> **toFaceRotation**(`rotation`): `FaceRotation`

Defined in: [rendering/textureLoader.ts:89](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/rendering/textureLoader.ts#L89)

Convert a PackedSprite rotation (degrees CW) to a FaceRotation index
compatible with the FaceTileSpec / billboard shader pathway.

FaceRotation: 0=0°, 1=90° CCW, 2=180°, 3=270° CCW
PackedSprite.rotation: 0=0°, 90=90° CW, 180=180°, 270=270° CW

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rotation` | `0` \| `90` \| `180` \| `270` |

## Returns

`FaceRotation`
