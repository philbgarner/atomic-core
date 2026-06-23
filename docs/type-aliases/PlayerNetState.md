[atomic-core](../README.md) / PlayerNetState

# Type Alias: PlayerNetState

> **PlayerNetState** = `object`

Defined in: [transport/types.ts:28](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L28)

Network state snapshot for a single player, broadcast in every `ServerStateUpdate`.

The server is authoritative for `x`, `y`, `hp`, `maxHp`, `alive`, and `facing`.
All other fields are relayed verbatim from the client's entity object, so peers
can access developer-defined attributes (e.g. `mp`, `stamina`, `spriteName`)
directly on the entity without any extra unwrapping.

## Indexable

> \[`key`: `string`\]: `unknown`

Developer-defined entity fields relayed from the client.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="alive"></a> `alive` | `boolean` | - | [transport/types.ts:35](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L35) |
| <a id="facing"></a> `facing?` | `number` | Yaw in radians. Optional — omit when server doesn't track facing. | [transport/types.ts:37](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L37) |
| <a id="hp"></a> `hp` | `number` | - | [transport/types.ts:33](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L33) |
| <a id="maxhp"></a> `maxHp` | `number` | - | [transport/types.ts:34](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L34) |
| <a id="x"></a> `x` | `number` | Grid X position. | [transport/types.ts:30](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L30) |
| <a id="y"></a> `y` | `number` | Grid Y position (row — maps to entity.z on the client). | [transport/types.ts:32](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L32) |
