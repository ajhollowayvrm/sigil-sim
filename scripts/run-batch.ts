// CLI batch runner — prints win-rates, end-reason breakdown, and game length for
// the canonical matchups. Run with: npm run batch  (optionally: npm run batch -- 800 7)
//
// Reproduces the prototype's batch output. Numbers use a seeded RNG, so they are
// reproducible but will differ slightly from sigil_sim.py (different RNG stream).

import { DECK_NAMES } from "../src/data/decks";
import { runMatch, type MatchStats } from "../src/sim/batch";

const WHY: Record<string, string> = {
  leader: "Leader defeated",
  deckout: "deck-out",
  noleader: "no Leader by turn 6",
  wiped: "wiped",
  timeout: "turn-cap draw",
};

const n = Number(process.argv[2]) || 400;
const seed = Number(process.argv[3]) || 7;

function report(a: string, b: string, r: MatchStats): void {
  const tot = Object.values(r.wins).reduce((x, y) => x + y, 0) || 1;
  const line = (k: string) => `${k.padEnd(10)} ${(((r.wins[k] || 0) / tot) * 100).toFixed(1)}%`;
  const ends = Object.entries(r.ends)
    .sort((x, y) => y[1] - x[1])
    .map(([k, v]) => `${WHY[k] || k} ${((v / tot) * 100).toFixed(0)}%`)
    .join(", ");
  console.log(`\n=== ${a} vs ${b} (n=${n}) ===`);
  console.log("  " + line(a));
  console.log("  " + line(b));
  if (r.wins.draw) console.log("  " + line("draw"));
  console.log(`  len avg ${r.avg.toFixed(1)} · median ${r.median} · decided by — ${ends}`);
}

// The three canonical matchups from the prototype, plus the Wild archetype.
const matchups: [string, string][] = [
  ["War", "Loyalist"],
  ["War", "Goblin"],
  ["Loyalist", "Goblin"],
  ["Wild", "Loyalist"],
];

console.log(`Sigil batch — ${n} games/matchup, seed ${seed}. Decks: ${DECK_NAMES.join(", ")}`);
for (const [a, b] of matchups) report(a, b, runMatch(a, b, n, seed));
