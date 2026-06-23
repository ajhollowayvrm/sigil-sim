import { describe, expect, it } from "vitest";
import { mulberry32, shuffle } from "../src/engine/rng";

describe("seedable RNG", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds diverge", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it("produces values in [0,1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("shuffle is a deterministic permutation for a seed", () => {
    const base = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const s1 = shuffle(base.slice(), mulberry32(99));
    const s2 = shuffle(base.slice(), mulberry32(99));
    expect(s1).toEqual(s2);
    expect([...s1].sort((x, y) => x - y)).toEqual(base); // same multiset
  });
});
