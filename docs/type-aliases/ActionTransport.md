[atomic-core](../README.md) / ActionTransport

# Type Alias: ActionTransport

> **ActionTransport** = `object`

Defined in: [transport/types.ts:121](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L121)

Dependency-injection interface for the optional multiplayer transport layer.

Pass an implementation to `GameOptions.transport` to make the server
authoritative for all player actions. Omit for single-player — zero overhead.

Use `createWebSocketTransport(url)` for a ready-made WebSocket implementation.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="playerid"></a> `playerId` | `readonly` | `string` \| `null` | Server-assigned player ID. Null before connect() resolves. | [transport/types.ts:162](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L162) |

## Methods

### connect()

> **connect**(`meta?`): `Promise`\<\{ `dungeonConfig?`: `Record`\<`string`, `unknown`\>; `isHost`: `boolean`; `playerId`: `string`; \}\>

Defined in: [transport/types.ts:127](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L127)

Connect to the server. Resolves with the server-assigned player ID and
whether this client is the room host (first to join). Non-host clients
also receive the dungeon config so they can generate the same dungeon.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `meta?` | `Record`\<`string`, `unknown`\> |

#### Returns

`Promise`\<\{ `dungeonConfig?`: `Record`\<`string`, `unknown`\>; `isHost`: `boolean`; `playerId`: `string`; \}\>

***

### disconnect()

> **disconnect**(): `void`

Defined in: [transport/types.ts:159](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L159)

#### Returns

`void`

***

### initDungeon()

> **initDungeon**(`payload`): `void`

Defined in: [transport/types.ts:157](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L157)

Send the dungeon solid map and config to the server. Called by the host
client after game.generate() completes so the server can validate moves
and share the config with late-joining clients.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `payload` | [`DungeonInitPayload`](DungeonInitPayload.md) |

#### Returns

`void`

***

### onChat()

> **onChat**(`handler`): `void`

Defined in: [transport/types.ts:179](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L179)

Register a handler that fires whenever a chat message is received.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`msg`) => `void` |

#### Returns

`void`

***

### onDungeonSet()?

> `optional` **onDungeonSet**(`handler`): `void`

Defined in: [transport/types.ts:219](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L219)

Register a handler that fires when the server relays a dungeon cell change
from another client. createGame() wires this internally to apply the change
locally with skipSync: true so it doesn't echo back to the server.

Optional — if absent, remote dungeon.set() changes are never applied locally.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`payload`) => `void` |

#### Returns

`void`

***

### onMissionComplete()?

> `optional` **onMissionComplete**(`handler`): `void`

Defined in: [transport/types.ts:201](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L201)

Register a handler that fires when the server relays a mission completion
from another connected player. `createGame()` wires this internally to
emit the `mission-peer-complete` event on the game event emitter.

Optional — if absent, peer mission events are never emitted.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`msg`) => `void` |

#### Returns

`void`

***

### onStateUpdate()

> **onStateUpdate**(`handler`): `void`

Defined in: [transport/types.ts:150](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L150)

Register a handler that fires whenever the server pushes a state update.
Multiple handlers are supported — each call appends a new subscriber.
createGame() registers one internally for reconciliation; the example can
register another to track other players for rendering.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | (`update`) => `void` |

#### Returns

`void`

***

### send()

> **send**(`action`, `entityState?`): `void`

Defined in: [transport/types.ts:142](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L142)

Send a player action to the authoritative server instead of applying it
locally. Called automatically by game.turns.commit() when a transport is
configured.

`entityState` carries the client's current entity fields (everything except
server-managed position/hp/alive). The server relays these to all peers so
they can read developer-defined attributes directly on the entity object.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `action` | [`TurnAction`](TurnAction.md) |
| `entityState?` | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### sendChat()

> **sendChat**(`text`): `void`

Defined in: [transport/types.ts:167](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L167)

Send a chat message to all players in the room.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

`void`

***

### sendDungeonSet()?

> `optional` **sendDungeonSet**(`payload`): `void`

Defined in: [transport/types.ts:210](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L210)

Send a single-cell dungeon modification to the server so it can update its
authoritative solid map and broadcast the change to all other connected clients.
Called automatically by dungeon.set() when skipSync is not true.

Optional — if absent, dungeon.set() applies changes locally only.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `payload` | [`DungeonSetPayload`](DungeonSetPayload.md) |

#### Returns

`void`

***

### sendMissionComplete()?

> `optional` **sendMissionComplete**(`missionId`, `name`): `void`

Defined in: [transport/types.ts:192](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L192)

Notify the server that this player completed a mission. The server is
expected to broadcast this to all other connected clients so they can
emit a `mission-peer-complete` event locally.

Optional — if absent, mission completions are not broadcast to peers.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `missionId` | `string` |
| `name` | `string` |

#### Returns

`void`

***

### sendMonsterState()

> **sendMonsterState**(`monsters`): `void`

Defined in: [transport/types.ts:174](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/transport/types.ts#L174)

Send the current monster state to the server so it can be broadcast to
all connected clients. Should be called by the host after generate() and
after every turn in which monsters move or change state.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `monsters` | `MonsterNetState`[] |

#### Returns

`void`
