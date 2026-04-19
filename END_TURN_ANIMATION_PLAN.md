# End-of-Turn Animation System — Design Plan

## Problem

`game.turns.commit(action)` is currently synchronous. All monster turns resolve
instantly, then entity state is snapped to final positions. Developers have no
opportunity to animate what happened between the player's action and the next
prompt for input.

---

## Proposed Architecture

### Core idea: async commit + an animation event queue

1. `game.turns.commit(action)` becomes `async` and returns a `Promise<void>`.
2. During `tickUntilPlayer`, game events (damage, death, move, etc.) are collected
   into an ordered **animation queue** alongside the pre/post entity snapshots.
3. After the loop — but **before** entity state is synced to the render layer —
   the engine fires registered animation handlers in order, awaiting each one.
4. Once all animations resolve, entity positions are synced and the player prompt
   resumes as normal.

This keeps the deterministic turn loop untouched. Animations are purely a
post-processing layer.

---

## New API Surface

### `game.animations` handle

```typescript
const game = createGame({ ... });

// Register a handler for a specific event kind
game.animations.on('damage', handler);
game.animations.on('death', handler);
game.animations.on('move', handler);    // new event kind (see below)
game.animations.on('attack', handler);  // new event kind

// Remove a handler
game.animations.off('damage', handler);

// Clear all handlers for an event kind
game.animations.clear('damage');
```

### Handler signature

```typescript
type AnimationEvent<K extends AnimationEventKind> = {
  kind: K;
  entity: EntityBase;       // the entity that acted or was affected
  actor?: EntityBase;       // for damage/death: who caused it
  amount?: number;          // for damage/heal
  from?: { x: number; z: number };  // for move
  to?: { x: number; z: number };    // for move
  effect?: string;          // optional tag from game config
};

type AnimationHandler<K extends AnimationEventKind> = (
  event: AnimationEvent<K>,
) => Promise<void> | void;
```

Handlers may be sync or async. If async, the engine awaits them before
proceeding to the next queued event.

---

## Event Kinds

| Kind       | Fires when…                          | Key fields                       |
|------------|--------------------------------------|----------------------------------|
| `damage`   | An entity takes damage               | `entity`, `actor`, `amount`, `effect` |
| `heal`     | An entity is healed                  | `entity`, `amount`               |
| `death`    | An entity dies                       | `entity`, `actor`                |
| `move`     | An entity moves to a new cell        | `entity`, `from`, `to`           |
| `attack`   | An entity attacks (hit or miss)      | `entity`, `actor`                |
| `miss`     | An attack misses                     | `entity`, `actor`                |
| `xp-gain`  | Player gains XP                      | `entity`, `amount`               |

`move` and `attack` are new events emitted from `applyAction` alongside the
existing combat events.

---

## Sequencing Model

Events are fired **in the order they occurred** during the turn loop. Each
handler for a given event is awaited sequentially within that event. Multiple
handlers on the same event kind run in registration order.

```
Player attacks → orc moves → player takes damage
                    ↓
Animation queue (ordered):
  [attack(player→orc), move(orc, from, to), damage(player, amount)]

Engine fires handlers:
  await all handlers for attack(player→orc)
  await all handlers for move(orc)
  await all handlers for damage(player)
                    ↓
  syncAllEntitiesFromTurnState()
  updateFovAndMinimap()
  resolve commit() promise
```

If the developer registers no handlers, the queue is skipped instantly — zero
overhead on the normal path.

---

## commit() becomes async

```typescript
// Before (current)
game.turns.commit(action);

// After
await game.turns.commit(action);
```

Game loops that don't care about animation can still call it without `await` —
the promise resolves in the background and input is re-enabled once it settles.
For games with animations, the UI should disable input until the promise
resolves.

---

## Sample Developer Code

### Floating damage numbers

```typescript
import { createFloatingText } from './ui/floatingText';

game.animations.on('damage', async ({ entity, amount }) => {
  await createFloatingText({
    text: `-${amount}`,
    color: 'red',
    worldX: entity.x,
    worldZ: entity.z,
    duration: 600,     // ms
  });
});
```

### Flash entity sprite on hit

```typescript
game.animations.on('damage', async ({ entity }) => {
  const billboard = renderer.getBillboard(entity.id);
  if (!billboard) return;

  await billboard.flash({ color: 0xff4444, duration: 200 });
});
```

### Smooth entity movement tween

```typescript
game.animations.on('move', async ({ entity, from, to }) => {
  const billboard = renderer.getBillboard(entity.id);
  if (!billboard) return;

  // Billboard is still at `from` during the animation because entity sync
  // hasn't happened yet — tween it visually to `to`
  await billboard.tweenPosition({
    from: { x: from.x * TILE_SIZE, z: from.z * TILE_SIZE },
    to:   { x: to.x   * TILE_SIZE, z: to.z   * TILE_SIZE },
    duration: 180,
    easing: 'easeOutQuad',
  });
});
```

### Death animation

```typescript
game.animations.on('death', async ({ entity }) => {
  const billboard = renderer.getBillboard(entity.id);
  if (!billboard) return;

  await billboard.playAnimation('death', { duration: 500 });
  // Entity will be removed from the scene after sync resolves
});
```

### Multiple handlers — XP popup after damage resolves

```typescript
// These run in order for the same event
game.animations.on('damage', async ({ entity, amount }) => {
  await createFloatingText({ text: `-${amount}`, ... });
});

game.animations.on('xp-gain', async ({ entity, amount }) => {
  await createFloatingText({ text: `+${amount} XP`, color: 'gold', ... });
});
```

### Disable input during animations (React example)

```typescript
const [accepting, setAccepting] = useState(true);

async function handleKey(e: KeyboardEvent) {
  if (!accepting) return;
  const action = getActionForKey(e.key);
  if (!action) return;

  setAccepting(false);
  await game.turns.commit(action);
  setAccepting(true);
}
```

---

## Implementation Plan

### Step 1 — Add `move` and `attack` event kinds to `TurnEvent`

**File:** `src/lib/turn/events.ts`

Add `TurnEventMove` and `TurnEventAttack` to the `TurnEvent` discriminated union.
Emit them from `applyAction` when an entity moves or initiates an attack.

### Step 2 — Collect events into an animation queue during the turn loop

**File:** `src/lib/turn/system.ts`

In `tickUntilPlayer`, instead of immediately calling `deps.onEvent`, push each
event onto a local `pendingAnimations: AnimationQueueEntry[]` array and return it
alongside the updated state.

### Step 3 — Create `AnimationRegistry`

**File:** `src/lib/animations/animationRegistry.ts` (new)

A typed registry that maps event kinds → ordered handler lists, with `on`, `off`,
`clear`, and `flush(queue)` methods. `flush` iterates the queue in order, awaiting
each matched handler.

### Step 4 — Wire registry into `createGame`

**File:** `src/lib/api/createGame.ts`

- Create an `AnimationRegistry` instance inside `createGame`.
- Expose it as `game.animations`.
- In `turns.commit()`:
  1. Run the synchronous turn loop (unchanged).
  2. Call `await animationRegistry.flush(pendingAnimations)`.
  3. Then call `syncAllEntitiesFromTurnState()` + `updateFovAndMinimap()`.
- Return a `Promise<void>`.

### Step 5 — Expose snapshot data on events

Before running the turn loop, snapshot current entity positions. Attach
`from`/`to` to `move` events using this snapshot vs. post-action positions so
developers can interpolate without needing to track state themselves.

---

## Multiplayer Compatibility

In multiplayer mode `game.turns.commit(action)` just calls
`transport.send(action)` and returns — the local turn loop never runs, so the
animation queue is never populated. The server only broadcasts a
`ServerStateUpdate` with final positions/hp; it does not send an event log.

**The animation queue must have a second source for multiplayer: state diffing.**

### Option A — Reconstruct events from `ServerStateUpdate` diffs (recommended)

The `onStateUpdate` reconciliation handler in `createGame` already holds both
the old local state and the incoming update. Before applying the patch, diff them
to synthesize animation events:

| State change | Synthesized event |
|---|---|
| `actor.hp` decreased | `damage` (amount = old − new) |
| `actor.alive` → false | `death` |
| `actor.x` or `actor.z` changed | `move` (from: old, to: new) |

These synthetic events are pushed onto the same `AnimationQueueEntry[]` array and
flushed through the same `AnimationRegistry`. The developer's handlers are
identical — the event source is transparent.

```typescript
// createGame.ts — onStateUpdate reconciliation (extended)
options.transport.onStateUpdate(async (update) => {
  const pending = diffStateForAnimations(internal.turnState, update);  // new
  await animationRegistry.flush(pending);                               // new
  applyServerStateUpdate(internal, update);   // existing patch logic
  syncAllEntitiesFromTurnState(internal);
  updateFovAndMinimap(internal);
});
```

**Limitation:** events with no state footprint (a melee miss that deals 0 damage,
audio cues, etc.) are invisible to diffing. These are uncommon enough to defer.

### Option B — Server sends an event log (future enhancement)

Add an optional `events` field to `ServerStateUpdate`:

```typescript
export type ServerStateUpdate = {
  players: Record<string, PlayerNetState>;
  turn: number;
  monsters?: MonsterNetState[];
  events?: SerializedTurnEvent[];   // NEW — optional, server opt-in
};
```

When present, use the server log directly instead of diffing. This gives exact
damage numbers, misses, and ordering — but requires a server-side change. It can
be added later as a transparent upgrade; clients that receive it skip diffing,
clients that don't fall back to Option A automatically.

### Summary

| Mode | Animation event source |
|---|---|
| Single-player | Turn loop queue (as described above) |
| Multiplayer (now) | State diff in `onStateUpdate` |
| Multiplayer (future) | Server event log via `ServerStateUpdate.events` |

Developer API is identical in all three cases.

---

## Non-Goals (out of scope for this feature)

- Built-in tween/flash implementations — those live in the developer's rendering
  layer, not in atomic-core.
- Frame-rate synchronization — handlers receive a Promise interface; the
  developer controls timing internally (RAF loops, CSS transitions, etc.).
- Animation callbacks affecting server-side state — all animation handling is
  purely client-side.
