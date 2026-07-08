// src/lib/animations/easing.ts
//
// Named easing functions for continuous (RAF-driven) animations, such as
// door slide progress. Independent of the turn-animation callback system
// in animationRegistry.ts, which only fires once per discrete turn event.

export type EasingFn = (t: number) => number;

export const linear: EasingFn = (t) => t;

export const easeInQuad: EasingFn = (t) => t * t;
export const easeOutQuad: EasingFn = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const EASINGS = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
} satisfies Record<string, EasingFn>;

export type EasingName = keyof typeof EASINGS;

/** Resolve a named easing or pass a custom function through unchanged. */
export function resolveEasing(easing: EasingName | EasingFn | undefined): EasingFn {
  if (typeof easing === "function") return easing;
  return EASINGS[easing ?? "easeInOutQuad"];
}
