[atomic-core](../README.md) / HiddenPassage

# Interface: HiddenPassage

Defined in: [entities/types.ts:123](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L123)

A hidden passage connecting two dungeon regions through wall cells.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="cells"></a> `cells` | `object`[] | Ordered list of cells from start to end (inclusive of both endpoints). | [entities/types.ts:133](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L133) |
| <a id="enabled"></a> `enabled` | `boolean` | Whether the passage can currently be used. Toggled by lever/button. | [entities/types.ts:135](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L135) |
| <a id="end"></a> `end` | `object` | Exit cell (floor cell at the far end of the tunnel). | [entities/types.ts:129](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L129) |
| `end.x` | `number` | - | [entities/types.ts:129](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L129) |
| `end.y` | `number` | - | [entities/types.ts:129](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L129) |
| <a id="id"></a> `id` | `number` | Unique id within this dungeon floor. | [entities/types.ts:125](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L125) |
| <a id="start"></a> `start` | `object` | Entry cell (floor cell adjacent to the tunnel entrance). | [entities/types.ts:127](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L127) |
| `start.x` | `number` | - | [entities/types.ts:127](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L127) |
| `start.y` | `number` | - | [entities/types.ts:127](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/entities/types.ts#L127) |
