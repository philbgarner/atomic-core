/** Maps action name → array of key strings (e.g. KeyboardEvent.key values). */
export type KeyBindings = Record<string, string[]>;
export type KeybindingsOptions = {
    /** Action → key(s) map. Key strings match `KeyboardEvent.key`. */
    bindings: KeyBindings;
    /**
     * Called when a bound key is pressed.
     * @param action  The action name from `bindings`.
     * @param event   The raw KeyboardEvent.
     */
    onAction(action: string, event: KeyboardEvent): void;
};
/** Handle returned by `createKeybindings`; call `destroy()` to remove the listener. */
export type KeybindingsHandle = {
    destroy(): void;
};
/**
 * Install a `keydown` listener on `document` that maps key presses to
 * named actions using `options.bindings`.
 *
 * Returns a handle with a `destroy()` method that removes the listener.
 */
export declare function createKeybindings(options: KeybindingsOptions): KeybindingsHandle;
//# sourceMappingURL=keybindings.d.ts.map