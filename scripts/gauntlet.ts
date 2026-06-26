// Balance gauntlet: run every balanced archetype against each power-ceiling BENCHMARK deck
// (e.g. "The Crown"). A balancing tool — the benchmark is a fixed strong reference, so the
// field's win-rates against it measure resilience and surface exploits as you tune.
//
//   npm run gauntlet              # default n=1000/matchup, seed 7
//   npm run gauntlet -- 2000 31   # n=2000, seed 31

import { DECK_NAMES, BENCHMARK_NAMES } from "../src/data/decks";
import { runMatch } from "../src/sim/batch";

const n = Number(process.argv[2]) || 1000;
const seed = Number(process.argv[3]) || 7;

console.log(`Gauntlet — each archetype vs each benchmark, ${n} games/matchup, seed ${seed}\n`);

for (const bench of BENCHMARK_NAMES) {
  console.log(`=== vs ${bench} ===`);
  const rows: [string, number, number][] = [];
  for (const deck of DECK_NAMES) {
    const r = runMatch(deck, bench, n, seed);
    const tot = (r.wins[deck] || 0) + (r.wins[bench] || 0) || 1;
    const fieldWr = (100 * (r.wins[deck] || 0)) / tot;
    rows.push([deck, fieldWr, r.avg]);
  }
  rows.sort((a, b) => b[1] - a[1]);
  for (const [deck, wr, len] of rows) {
    const bar = "█".repeat(Math.round(wr / 2.5));
    console.log(`  ${deck.padEnd(14)} ${wr.toFixed(1).padStart(5)}%  ${bar}  (len ${len.toFixed(1)})`);
  }
  const avg = rows.reduce((a, r) => a + r[1], 0) / rows.length;
  const best = rows[0];
  const worst = rows[rows.length - 1];
  console.log(`  field averages ${avg.toFixed(1)}% vs ${bench};  best ${best[0]} ${best[1].toFixed(1)}% · worst ${worst[0]} ${worst[1].toFixed(1)}%\n`);
}
