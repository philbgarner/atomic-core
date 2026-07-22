// src/lib/entities/moveAnim.ts
//
// Pure tween state/logic for smoothing an entity's rendered x/z position
// between logical grid-position changes (see AnimationEventMap['move']).
// Mirrors DoorAnimState/computeDoorProgress in dungeon/doors.ts.

import type { EasingFn, EasingName } from '../animations/easing';
import { resolveEasing } from '../animations/easing';

export type EntityMoveAnimState = {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  /** `performance.now()` timestamp the transition began. */
  startTime: number;
};

export function computeEntityMovePosition(
  anim: EntityMoveAnimState,
  now: number,
  durationMs: number,
  easing: EasingName | EasingFn | undefined,
): { x: number; z: number } {
  if (durationMs <= 0) return { x: anim.toX, z: anim.toZ };
  const t = Math.min(Math.max((now - anim.startTime) / durationMs, 0), 1);
  const k = resolveEasing(easing)(t);
  return {
    x: anim.fromX + (anim.toX - anim.fromX) * k,
    z: anim.fromZ + (anim.toZ - anim.fromZ) * k,
  };
}
