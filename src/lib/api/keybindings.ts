// src/lib/api/keybindings.ts
//
// Keybindings helper — maps key strings to named action tokens and dispatches
// to a developer-supplied onAction callback.
//
// Migrated from libold/src/hooks/useEotBCamera.ts (MoveActions) and the
// key-handler in useGameState.ts.  No React dependency — pure DOM events.
//
// Two dispatch modes:
//   - turn-based (default): onAction fires on keydown (auto-repeat throttled).
//   - realtime: keydown only records the key as held; the game's tick loop
//     calls pollHeld() once per tick, which fires onAction for the most
//     recently pressed key that is still held down.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Install `keydown` / `keyup` listeners on `document` (plus a window `blur`
 * listener that releases all held keys) mapping key presses to named actions
 * using `options.bindings`.
 *
 * Returns a handle with `destroy()`, `setRealtime()` and `pollHeld()`.
 */
export function createKeybindings(options: KeybindingsOptions): KeybindingsHandle {
  // Invert bindings: key string → action name
  const keyToAction = new Map<string, string>();
  for (const [action, keys] of Object.entries(options.bindings)) {
    for (const key of keys) {
      keyToAction.set(key, action);
    }
  }

  const repeatDelayMs = options.repeatDelayMs ?? 150;
  // Tracks the timestamp of the last fired event per key (for repeat throttling).
  const lastFired = new Map<string, number>();
  // Bound keys currently held down → latest keydown event. Map insertion order
  // tracks press order (re-inserted on each fresh press).
  const held = new Map<string, KeyboardEvent>();
  let realtime = false;

  function handleKeydown(event: KeyboardEvent): void {
	// keyboard handler should use .code not .key so we support AZERTY
    const action = keyToAction.get(event.code);
    if (action === undefined) return;

    if (!event.repeat) held.delete(event.code);
    held.set(event.code, event);

    if (realtime) {
      // Consume the key so the page doesn't scroll etc.; the tick dispatches it.
      event.preventDefault();
      return;
    }

    if (event.repeat && repeatDelayMs > 0) {
      const last = lastFired.get(event.code) ?? 0;
      if (event.timeStamp - last < repeatDelayMs) return;
    }

    lastFired.set(event.code, event.timeStamp);
    options.onAction(action, event);
  }

  function handleKeyup(event: KeyboardEvent): void {
    held.delete(event.code);
  }

  function handleBlur(): void {
    held.clear();
  }

  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("keyup", handleKeyup);
  window.addEventListener("blur", handleBlur);

  return {
    destroy() {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("keyup", handleKeyup);
      window.removeEventListener("blur", handleBlur);
      held.clear();
    },

    setRealtime(enabled: boolean) {
      realtime = enabled;
    },

    pollHeld() {
      let latest: [string, KeyboardEvent] | undefined;
      for (const entry of held) latest = entry;
      if (!latest) return;
      const action = keyToAction.get(latest[0]);
      if (action !== undefined) options.onAction(action, latest[1]);
    },
  };
}
