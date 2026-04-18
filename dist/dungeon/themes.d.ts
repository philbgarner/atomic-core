export type ThemeDef = {
    /** Name matching an entry in atlas.json `floorTypes`. */
    floorType: string;
    /** Name matching an entry in atlas.json `wallTypes`. */
    wallType: string;
    /** Name matching an entry in atlas.json `ceilingTypes`. */
    ceilingType: string;
};
/**
 * Theme selector for a dungeon config:
 * - string: a single theme key from the registry
 * - string[]: uniform random pick from the list each time a room is themed
 * - [string, number][]: weighted random pick (pairs of [key, weight])
 * - callback: called per room, receives the room id and an rng function
 */
export type ThemeSelector = string | string[] | [string, number][] | ((ctx: {
    roomId: number;
    rng: () => number;
}) => string);
/** Built-in themes — available without calling registerTheme(). */
export declare const THEMES: Record<string, ThemeDef>;
export declare const THEME_KEYS: string[];
/**
 * Register a custom theme (or override a built-in).
 * The `name` becomes a valid key for `ThemeSelector` string values.
 */
export declare function registerTheme(name: string, def: ThemeDef): void;
/**
 * Retrieve a theme definition by name.
 * Returns `undefined` if the name is not registered.
 */
export declare function getTheme(name: string): ThemeDef | undefined;
/**
 * Resolve a ThemeSelector to a theme name for a given room.
 * Falls back to "dungeon" if the resolved key is not in the registry.
 */
export declare function resolveTheme(selector: ThemeSelector, ctx: {
    roomId: number;
    rng: () => number;
}): ThemeDef;
//# sourceMappingURL=themes.d.ts.map