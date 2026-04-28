[atomic-core](../README.md) / SkyboxOptions

# Type Alias: SkyboxOptions

> **SkyboxOptions** = `object`

Defined in: rendering/skybox.ts:19

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="faces"></a> `faces` | [`SkyboxFaces`](SkyboxFaces.md) \| `THREE.CubeTexture` | Six face images — either URL strings or a pre-loaded `THREE.CubeTexture`. When URLs are supplied the textures are fetched asynchronously; when a `CubeTexture` is supplied it is used directly (ownership remains with the caller — the renderer will NOT dispose it on `destroy()` or `setSkybox()`). | rendering/skybox.ts:26 |
| <a id="rotationy"></a> `rotationY?` | `number` | Y-axis rotation applied to the skybox in radians. Useful for aligning the "front" face with the dungeon's north direction. Default: `0`. Callers needing full Euler control can access `renderer.scene.background` directly after the skybox is attached. | rendering/skybox.ts:33 |
