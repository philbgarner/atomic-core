// src/lib/entities/effects.ts
//
// Status effect data types and tick/stack logic. Pure functions, no engine deps.
// The consuming game holds ActiveEffect[] on each entity and calls tickEffects
// from the turn scheduler's onTimeAdvanced hook.
//
// RpsEffect (rock-paper-scissors combat modifier) is defined here and
// re-exported from turn/types.ts for backwards compatibility.

// --------------------------------
// RPS combat modifier
// --------------------------------

/** Rock-paper-scissors combat modifier carried by enemies in three-faction combat. */
export type RpsEffect = "none" | "bleeding" | "freezing" | "poisoned";

// --------------------------------
// Status effect types
// --------------------------------

export type EffectId = string;

export type EffectDelta = Record<string, number>;

export type EffectTick = {
  /**
   * Called at the start of each affected entity's turn (or on each world tick).
   * Return a partial update to apply to the host, or undefined for no change.
   * The engine does not interpret the returned delta — the game applies it.
   */
  onTick?: (effect: ActiveEffect, stepIndex: number) => EffectDelta | undefined;
  /** Called when stepsRemaining reaches 0. */
  onExpire?: (effect: ActiveEffect) => EffectDelta | undefined;
};

export type ActiveEffect = {
  id: EffectId;
  /** Display name. */
  name: string;
  stepsRemaining: number;
  /** Arbitrary key-value payload (damage per tick, stat bonuses, etc.). */
  data: Record<string, number>;
  ticks: EffectTick;
};

// --------------------------------
// tickEffects
// --------------------------------

/**
 * Advance all effects by one step. Returns updated effects list and
 * an array of deltas to apply (from onTick + onExpire for expired entries).
 * Pure function — does not mutate input.
 */
export function tickEffects(
  effects: ActiveEffect[],
  stepIndex: number,
): {
  updatedEffects: ActiveEffect[];
  deltas: EffectDelta[];
} {
  const updatedEffects: ActiveEffect[] = [];
  const deltas: EffectDelta[] = [];

  for (const effect of effects) {
    const tickDelta = effect.ticks.onTick?.(effect, stepIndex);
    if (tickDelta !== undefined) deltas.push(tickDelta);

    const remaining = effect.stepsRemaining - 1;
    if (remaining <= 0) {
      const expireDelta = effect.ticks.onExpire?.(effect);
      if (expireDelta !== undefined) deltas.push(expireDelta);
    } else {
      updatedEffects.push({ ...effect, stepsRemaining: remaining });
    }
  }

  return { updatedEffects, deltas };
}

// --------------------------------
// applyEffect
// --------------------------------

/**
 * How to handle applying an effect whose id already exists in the list.
 * - "refresh"  Replace stepsRemaining with the incoming value.
 * - "extend"   Add incoming stepsRemaining to the current value.
 * - "ignore"   Leave the existing effect unchanged.
 * - "stack"    Add as an independent instance regardless of existing entries.
 */
export type StackMode = "refresh" | "extend" | "ignore" | "stack";

/**
 * Apply a new effect to a list, merging stacks if an effect with the same id
 * already exists. Stacking behaviour is controlled by StackMode.
 * Pure function — does not mutate input.
 */
export function applyEffect(
  effects: ActiveEffect[],
  incoming: ActiveEffect,
  stackMode: StackMode = "refresh",
): ActiveEffect[] {
  const existingIdx = effects.findIndex((e) => e.id === incoming.id);

  if (existingIdx === -1) {
    return [...effects, incoming];
  }

  if (stackMode === "ignore") {
    return effects;
  }

  if (stackMode === "stack") {
    return [...effects, { ...incoming }];
  }

  // existingIdx !== -1 is guaranteed above, but TypeScript needs the assertion.
  const existing = effects[existingIdx] as ActiveEffect;
  let updated: ActiveEffect;

  if (stackMode === "refresh") {
    updated = { id: existing.id, name: existing.name, data: existing.data, ticks: existing.ticks, stepsRemaining: incoming.stepsRemaining };
  } else {
    // "extend"
    updated = { id: existing.id, name: existing.name, data: existing.data, ticks: existing.ticks, stepsRemaining: existing.stepsRemaining + incoming.stepsRemaining };
  }

  return [
    ...effects.slice(0, existingIdx),
    updated,
    ...effects.slice(existingIdx + 1),
  ];
}
