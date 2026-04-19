// src/lib/animations/animationRegistry.ts
//
// Typed registry for turn-animation callbacks.
//
// _enqueue() is called by the turn loop (single-player) or the state-diff
// path (multiplayer) to collect events during a commit cycle.
// _flush() is awaited after all actors have resolved but before entity
// positions are synced to the render layer.

import type {
  AnimationEventKind,
  AnimationEventMap,
  AnimationQueueEntry,
  AnimationHandler,
  AnimationsHandle,
} from './types';

export type AnimationRegistry = AnimationsHandle & {
  _enqueue(entry: AnimationQueueEntry): void;
  _flush(): Promise<void>;
};

export function createAnimationRegistry(): AnimationRegistry {
  const handlers = new Map<AnimationEventKind, AnimationHandler<AnimationEventKind>[]>();
  const queue: AnimationQueueEntry[] = [];

  return {
    on<K extends AnimationEventKind>(kind: K, handler: AnimationHandler<K>) {
      if (!handlers.has(kind)) handlers.set(kind, []);
      handlers.get(kind)!.push(handler as AnimationHandler<AnimationEventKind>);
    },

    off<K extends AnimationEventKind>(kind: K, handler: AnimationHandler<K>) {
      const list = handlers.get(kind);
      if (!list) return;
      const idx = list.indexOf(handler as AnimationHandler<AnimationEventKind>);
      if (idx !== -1) list.splice(idx, 1);
    },

    clear(kind: AnimationEventKind) {
      handlers.delete(kind);
    },

    _enqueue(entry: AnimationQueueEntry) {
      queue.push(entry);
    },

    async _flush() {
      const pending = queue.splice(0);
      for (const entry of pending) {
        const list = handlers.get(entry.kind);
        if (!list || list.length === 0) continue;
        for (const handler of list) {
          await (handler as (e: AnimationEventMap[AnimationEventKind]) => Promise<void> | void)(entry);
        }
      }
    },
  };
}
