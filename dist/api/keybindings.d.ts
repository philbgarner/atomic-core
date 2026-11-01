/** Maps action name → array of key strings (e.g. KeyboardEvent.key values). */
export type KeyBindings = Record<string, string[]>;
export type KeybindingsOptions = {
    /** Action → key(s) map. Key strings match `KeyboardEvent.code`. */
    bindings: KeyBindings;
    /**
     * Called when a bound key is pressed (turn-based mode) or is held down when
     * a realtime tick fires (realtime mode).
     * @param action  The action name from `bindings`.
     * @param event   The raw KeyboardEvent (in realtime mode, the most recent
     *                keydown event for the held key).
     */
    onAction(action: string, event: KeyboardEvent): void;
    /**
     * Minimum milliseconds between repeated firings when a key is held down.
     * The first press always fires immediately; subsequent auto-repeats are
     * throttled to at most one per `repeatDelayMs`. Defaults to 150 ms.
     * Ignored in realtime mode — the game tick rate governs repeats there.
     */
    repeatDelayMs?: number;
};
/** Handle returned by `createKeybindings`; call `destroy()` to remove the listeners. */
export type KeybindingsHandle = {
    destroy(): void;
    /**
     * Switch realtime dispatch on or off. When enabled, keydown no longer calls
     * `onAction` directly; held keys are dispatched only via `pollHeld()`.
     * `attachKeybindings` / `game.turns.setMode()` call this automatically.
     */
    setRealtime(enabled: boolean): void;
    /**
     * Fire `onAction` for the most recently pressed bound key that is still held
     * down (at most one action per call). Keys pressed and released between
     * polls do nothing. Called by the game once per realtime tick.
     */
    pollHeld(): void;
};
/**
 * Install `keydown` / `keyup` listeners on `document` (plus a window `blur`
 * listener that releases all held keys) mapping key presses to named actions
 * using `options.bindings`.
 *
 * Returns a handle with `destroy()`, `setRealtime()` and `pollHeld()`.
 */
export declare function createKeybindings(options: KeybindingsOptions): KeybindingsHandle;
//# sourceMappingURL=keybindings.d.ts.map