// Campaign deck-construction rules. Smaller floor than the 40-card sim decks so
// a new player can build from a starter collection; max 3 copies/card per the
// single-archetype deck-format direction.

export const MIN_DECK = 20;
export const MAX_DECK = 40;
export const MAX_COPIES = 3;

export function countCopies(cards: string[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const name of cards) c[name] = (c[name] || 0) + 1;
  return c;
}

/** Human-readable problems with a deck; empty array == legal. */
export function deckProblems(cards: string[], owned: Record<string, number>): string[] {
  const errs: string[] = [];
  if (cards.length < MIN_DECK) errs.push(`Need ${MIN_DECK}+ cards (have ${cards.length}).`);
  if (cards.length > MAX_DECK) errs.push(`Max ${MAX_DECK} cards (have ${cards.length}).`);
  const counts = countCopies(cards);
  for (const [name, n] of Object.entries(counts)) {
    if (n > MAX_COPIES) errs.push(`${name}: ${n} copies (max ${MAX_COPIES}).`);
    if (n > (owned[name] ?? 0)) errs.push(`${name}: ${n} in deck but only ${owned[name] ?? 0} owned.`);
  }
  return errs;
}

export function isLegalDeck(cards: string[], owned: Record<string, number>): boolean {
  return deckProblems(cards, owned).length === 0;
}
