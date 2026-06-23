[atomic-core](../README.md) / HiddenPassage

# Interface: HiddenPassage

Defined in: [entities/types.ts:122](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L122)

A hidden passage connecting two dungeon regions through wall cells.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="cells"></a> `cells` | `object`[] | Ordered list of cells from start to end (inclusive of both endpoints). | [entities/types.ts:132](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L132) |
| <a id="enabled"></a> `enabled` | `boolean` | Whether the passage can currently be used. Toggled by lever/button. | [entities/types.ts:134](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L134) |
| <a id="end"></a> `end` | `object` | Exit cell (floor cell at the far end of the tunnel). | [entities/types.ts:128](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L128) |
| `end.x` | `number` | - | [entities/types.ts:128](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L128) |
| `end.y` | `number` | - | [entities/types.ts:128](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L128) |
| <a id="id"></a> `id` | `number` | Unique id within this dungeon floor. | [entities/types.ts:124](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L124) |
| <a id="start"></a> `start` | `object` | Entry cell (floor cell adjacent to the tunnel entrance). | [entities/types.ts:126](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L126) |
| `start.x` | `number` | - | [entities/types.ts:126](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L126) |
| `start.y` | `number` | - | [entities/types.ts:126](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/entities/types.ts#L126) |
