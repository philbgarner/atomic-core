export type FactionId = string;
export type FactionStance = "hostile" | "neutral" | "friendly";
export type FactionRegistry = {
    /**
     * Register a relationship. Relationships are directional:
     * setStance("orc", "player", "hostile") does not automatically
     * set player→orc. Call symmetrically if needed.
     */
    setStance(from: FactionId, to: FactionId, stance: FactionStance): void;
    /** Returns the stance of `from` toward `to`. Default: "neutral". */
    getStance(from: FactionId, to: FactionId): FactionStance;
    /** Returns true if `from` treats `to` as hostile. */
    isHostile(from: FactionId, to: FactionId): boolean;
};
/** Create a new empty faction registry. */
export declare function createFactionRegistry(): FactionRegistry;
/**
 * Convenience: build a registry from a stance table.
 *
 * Example:
 *   createFactionRegistryFromTable([
 *     ["player", "enemy", "hostile"],
 *     ["enemy", "player", "hostile"],
 *   ])
 */
export declare function createFactionRegistryFromTable(table: Array<[FactionId, FactionId, FactionStance]>): FactionRegistry;
/**
 * Default three-faction combat table:
 *   player  → enemy:   hostile
 *   npc     → enemy:   hostile
 *   enemy   → player:  hostile
 *   enemy   → npc:     hostile
 *
 * All other relationships default to "neutral".
 * Pass this to createFactionRegistryFromTable() or supply your own table
 * via the `combat.factions` option in createGame().
 */
export declare const DEFAULT_FACTION_TABLE: Array<[FactionId, FactionId, FactionStance]>;
//# sourceMappingURL=factions.d.ts.map