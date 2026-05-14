[atomic-core](../README.md) / loadSkybox

# Function: loadSkybox()

> **loadSkybox**(`opts`): `Promise`\<`CubeTexture`\>

Defined in: [rendering/skybox.ts:40](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/rendering/skybox.ts#L40)

Load a `THREE.CubeTexture` from 6 face image URLs and apply an optional
Y-axis rotation. The returned texture is ready to assign to `scene.background`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `opts` | [`SkyboxOptions`](../type-aliases/SkyboxOptions.md) |

## Returns

`Promise`\<`CubeTexture`\>
