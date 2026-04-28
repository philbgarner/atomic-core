[atomic-core](../README.md) / ObjectPlacement

# Interface: ObjectPlacement

Defined in: [entities/types.ts:67](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L67)

A static object placed in the world (chest, lever, torch, etc.).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="meta"></a> `meta?` | `Record`\<`string`, `unknown`\> | Arbitrary metadata for game logic. | [entities/types.ts:83](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L83) |
| <a id="offsetx"></a> `offsetX?` | `number` | Fine-grained world-space offset from cell centre (in cell units). | [entities/types.ts:75](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L75) |
| <a id="offsety"></a> `offsetY?` | `number` | - | [entities/types.ts:77](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L77) |
| <a id="offsetz"></a> `offsetZ?` | `number` | - | [entities/types.ts:76](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L76) |
| <a id="scale"></a> `scale?` | `number` | Uniform scale multiplier. | [entities/types.ts:81](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L81) |
| <a id="spritemap"></a> `spriteMap?` | [`SpriteMap`](SpriteMap.md) | When present, renders this placement as a camera-facing billboard sprite via the dungeon renderer's `setObjects()` method. | [entities/types.ts:88](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L88) |
| <a id="type"></a> `type` | `string` | Factory key resolved by the renderer's ObjectRegistry. | [entities/types.ts:73](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L73) |
| <a id="x"></a> `x` | `number` | Grid column (2-D grid X). | [entities/types.ts:69](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L69) |
| <a id="yaw"></a> `yaw?` | `number` | Yaw rotation in radians. | [entities/types.ts:79](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L79) |
| <a id="z"></a> `z` | `number` | Grid row (2-D grid Y → world Z). | [entities/types.ts:71](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L71) |
