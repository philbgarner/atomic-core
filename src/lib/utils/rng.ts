/**
 * Create a seeded LCG pseudo-random number generator.
 * Uses Numerical Recipes constants. Returns a function that yields
 * deterministic values in [0, 1) for a given seed.
 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
