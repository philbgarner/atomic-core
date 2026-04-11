// src/lib/combat/combat.ts
//
// Damage resolution — extracted from useGameState.ts combat slice.
// Pure function: no React, no mutation, no hardcoded faction names.
// XP gain and loot drop are NOT handled here — emit 'death' and let the
// developer handle them in game.events.on('death').

import type { EntityBase } from "../entities/types";
import type { EventEmitter } from "../events/eventEmitter";
import type { FactionRegistry } from "./factions";

// --------------------------------
// Damage formula
// --------------------------------

/**
 * A damage formula receives attacker and defender and returns the raw damage
 * amount (before any clamping). Return 0 to signal a miss (the 'miss' event
 * will be emitted instead of 'damage').
 */
export type DamageFormula = (attacker: EntityBase, defender: EntityBase) => number;

/** Default formula: max(1, attacker.attack − defender.defense). Never misses. */
export const defaultDamageFormula: DamageFormula = (attacker, defender) =>
  Math.max(1, attacker.attack - defender.defense);

// --------------------------------
// resolveCombat
// --------------------------------

export type ResolveCombatOptions = {
  attacker: EntityBase;
  defender: EntityBase;
  /** Damage formula. Defaults to defaultDamageFormula. */
  formula?: DamageFormula;
  /** Faction registry used to check hostility. If omitted, the attack always proceeds. */
  factions?: FactionRegistry;
  /** EventEmitter to fire 'damage', 'miss', and 'death' events. */
  emit: EventEmitter;
};

export type CombatResult =
  | { outcome: "blocked" }
  | { outcome: "miss" }
  | { outcome: "hit"; damage: number; defenderDied: boolean };

/**
 * Resolve one attack from `attacker` against `defender`.
 *
 * - If `factions` is provided and attacker is NOT hostile to defender, returns `{ outcome: "blocked" }`.
 * - If the formula returns 0, emits `miss` and returns `{ outcome: "miss" }`.
 * - Otherwise emits `damage` (and `death` if hp drops to 0) and returns `{ outcome: "hit", ... }`.
 *
 * The returned `defenderDied` flag reflects whether hp reached 0; the caller is
 * responsible for updating entity state (this function is pure/side-effect-free
 * aside from the EventEmitter calls).
 */
export function resolveCombat({
  attacker,
  defender,
  formula = defaultDamageFormula,
  factions,
  emit,
}: ResolveCombatOptions): CombatResult {
  // Faction check — skip if no registry supplied
  if (factions && !factions.isHostile(attacker.faction, defender.faction)) {
    return { outcome: "blocked" };
  }

  const damage = formula(attacker, defender);

  if (damage <= 0) {
    emit.emit("miss", { attacker, defender });
    return { outcome: "miss" };
  }

  const defenderDied = defender.hp - damage <= 0;

  emit.emit("damage", { entity: defender, amount: damage });

  if (defenderDied) {
    emit.emit("death", { entity: defender, killer: attacker });
  }

  return { outcome: "hit", damage, defenderDied };
}
