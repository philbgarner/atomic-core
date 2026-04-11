/** Rock-paper-scissors combat modifier carried by enemies in three-faction combat. */
export type RpsEffect = "none" | "bleeding" | "freezing" | "poisoned";
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
/**
 * Advance all effects by one step. Returns updated effects list and
 * an array of deltas to apply (from onTick + onExpire for expired entries).
 * Pure function — does not mutate input.
 */
export declare function tickEffects(effects: ActiveEffect[], stepIndex: number): {
    updatedEffects: ActiveEffect[];
    deltas: EffectDelta[];
};
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
export declare function applyEffect(effects: ActiveEffect[], incoming: ActiveEffect, stackMode?: StackMode): ActiveEffect[];
//# sourceMappingURL=effects.d.ts.map