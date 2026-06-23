// Seedable RNG so a (seed, decks) pair reproduces a game frame-for-frame (§9.9).
// mulberry32 — small, fast, deterministic. Ported from the prototype.

export type RNG = () => number;

export function mulberry32(a: number): RNG {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// In-place Fisher–Yates using the supplied RNG.
export function shuffle<T>(arr: T[], rnd: RNG): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
