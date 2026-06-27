import { describe, it, expect } from "vitest";
import { deckProblems, isLegalDeck, countCopies, MIN_DECK, MAX_DECK, MAX_COPIES } from "../src/game/deckRules";

const repeat = (name: string, n: number) => Array.from({ length: n }, () => name);

describe("deck rules", () => {
  it("counts copies", () => {
    expect(countCopies(["a", "a", "b"])).toEqual({ a: 2, b: 1 });
  });

  it("rejects an undersized deck", () => {
    const owned = { x: 99 };
    const probs = deckProblems(repeat("x", MIN_DECK - 1), owned);
    expect(probs.some((p) => p.includes(`${MIN_DECK}+`))).toBe(true);
  });

  it("rejects an oversized deck", () => {
    const owned = { x: 99 };
    expect(deckProblems(repeat("x", MAX_DECK + 1), owned).some((p) => p.includes(`Max ${MAX_DECK}`))).toBe(true);
  });

  it("enforces the copy cap", () => {
    const owned = { x: 99, y: 99 };
    const deck = [...repeat("x", MAX_COPIES + 1), ...repeat("y", MIN_DECK)];
    expect(deckProblems(deck, owned).some((p) => p.includes("max " + MAX_COPIES))).toBe(true);
  });

  it("rejects more copies than owned", () => {
    const owned = { x: 1 };
    const deck = repeat("x", 2).concat(repeat("y", MIN_DECK));
    expect(deckProblems(deck, { ...owned, y: 99 }).some((p) => p.includes("only 1 owned"))).toBe(true);
  });

  it("accepts a legal deck within all limits", () => {
    // 20 distinct singletons, all owned
    const owned: Record<string, number> = {};
    const deck: string[] = [];
    for (let i = 0; i < MIN_DECK; i++) {
      owned["c" + i] = 1;
      deck.push("c" + i);
    }
    expect(deckProblems(deck, owned)).toEqual([]);
    expect(isLegalDeck(deck, owned)).toBe(true);
  });
});
