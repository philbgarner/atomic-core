[atomic-core](../README.md) / LoadingOptions

# Type Alias: LoadingOptions

> **LoadingOptions** = `object`

Defined in: [rendering/textureLoader.ts:67](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/rendering/textureLoader.ts#L67)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="container"></a> `container?` | `HTMLElement` | Element to append the overlay to. Default: document.body. | [rendering/textureLoader.ts:73](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/rendering/textureLoader.ts#L73) |
| <a id="loadingtext"></a> `loadingText?` | `string` | Text shown in the loading overlay. Default: "Loading...". | [rendering/textureLoader.ts:71](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/rendering/textureLoader.ts#L71) |
| <a id="onprogress"></a> `onProgress?` | (`loaded`, `total`) => `void` | Progress callback (loaded steps out of total steps). | [rendering/textureLoader.ts:75](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/rendering/textureLoader.ts#L75) |
| <a id="showloadingscreen"></a> `showLoadingScreen?` | `boolean` | Inject a full-screen loading overlay while fetching. Default: true. | [rendering/textureLoader.ts:69](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/rendering/textureLoader.ts#L69) |
