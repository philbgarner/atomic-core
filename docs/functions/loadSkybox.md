[atomic-core](../README.md) / loadSkybox

# Function: loadSkybox()

> **loadSkybox**(`opts`): `Promise`\<`CubeTexture`\>

Defined in: [rendering/skybox.ts:40](https://github.com/philbgarner/atomic-core/blob/0f897612d0f33dd03c22bc22a0b5b59095b003c6/src/lib/rendering/skybox.ts#L40)

Load a `THREE.CubeTexture` from 6 face image URLs and apply an optional
Y-axis rotation. The returned texture is ready to assign to `scene.background`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `opts` | [`SkyboxOptions`](../type-aliases/SkyboxOptions.md) |

## Returns

`Promise`\<`CubeTexture`\>
