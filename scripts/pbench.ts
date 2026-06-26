// Per-deck win-rate vs a FIXED greedy opponent, seat-neutralized (X plays both seats). Measures how
// well a deck's PILOT plays it vs a standard brain — non-zero-sum, so every pilot can improve. ~50%
// = pilot equals greedy; >50% = pilot beats greedy at the deck. A/B before/after each tune.
import { DECK_NAMES, DECKS } from "../src/data/decks";
import { game } from "../src/engine/game";
import { mulberry32 } from "../src/engine/rng";
import { policyFor, greedyPolicy } from "../src/sim/ai";
const only = process.argv[2];
const n = Number(process.argv[3]) || 200;
for (const deck of (only ? [only] : DECK_NAMES)) {
  let W = 0, G = 0; const row: string[] = [];
  for (const opp of DECK_NAMES) {
    if (opp === deck) continue;
    let w = 0, g = 0;
    for (let s = 0; s < 3; s++) {
      let sd = (7 + s * 1000) >>> 0;
      for (let i = 0; i < n; i++) {
        const r1 = mulberry32((sd = (sd + 0x9e3779b9) >>> 0));
        const [a] = game(DECKS[deck](), DECKS[opp](), r1, [policyFor(deck), greedyPolicy]);
        if (a === "A") w++; if (a !== "draw") g++;
        const r2 = mulberry32((sd = (sd + 0x9e3779b9) >>> 0));
        const [b] = game(DECKS[opp](), DECKS[deck](), r2, [greedyPolicy, policyFor(deck)]);
        if (b === "B") w++; if (b !== "draw") g++;
      }
    }
    W += w; G += g; row.push(`${opp.slice(0, 5)} ${(100 * w / g).toFixed(0)}`);
  }
  console.log(`${deck.padEnd(14)} ${(100 * W / G).toFixed(1)}%  vs greedy [${row.join(" · ")}]`);
}
