[atomic-core](../README.md) / loadSkybox

# Function: loadSkybox()

> **loadSkybox**(`opts`): `Promise`\<`CubeTexture`\>

Defined in: rendering/skybox.ts:40

Load a `THREE.CubeTexture` from 6 face image URLs and apply an optional
Y-axis rotation. The returned texture is ready to assign to `scene.background`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `opts` | [`SkyboxOptions`](../type-aliases/SkyboxOptions.md) |

## Returns

`Promise`\<`CubeTexture`\>
