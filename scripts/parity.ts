// Parity harness — the optimization target for deck balancing.
//
// Plays the FULL round-robin (all 6 pairings, not the batch's 4) across several
// seeds, then reports each deck's aggregate win-rate and the spread (max-min).
// Parity = every deck near 50% overall and the spread small.
//
//   npm run parity            # default n=500/pairing/seed, 4 seeds
//   npm run parity -- 800 6   # n=800, 6 seeds

import { DECK_NAMES } from "../src/data/decks";
import { runMatch } from "../src/sim/batch";

const n = Number(process.argv[2]) || 500;
const seeds = Number(process.argv[3]) || 4;

const decks = DECK_NAMES;
const pairs: [string, string][] = [];
for (let i = 0; i < decks.length; i++)
  for (let j = i + 1; j < decks.length; j++) pairs.push([decks[i], decks[j]]);

// wins[a][b] = games a won vs b, summed over seeds; played[a][b] = games played
const wins: Record<string, Record<string, number>> = {};
const games: Record<string, Record<string, number>> = {};
for (const a of decks) {
  wins[a] = {};
  games[a] = {};
  for (const b of decks) {
    wins[a][b] = 0;
    games[a][b] = 0;
  }
}

let lenSum = 0;
let lenWeight = 0;
for (const [a, b] of pairs) {
  for (let s = 0; s < seeds; s++) {
    const seed = 7 + s * 1000;
    const r = runMatch(a, b, n, seed);
    const aw = r.wins[a] || 0;
    const bw = r.wins[b] || 0;
    const dr = r.wins.draw || 0;
    wins[a][b] += aw;
    wins[b][a] += bw;
    games[a][b] += aw + bw + dr;
    games[b][a] += aw + bw + dr;
    lenSum += r.avg * r.n;
    lenWeight += r.n;
  }
}

const pct = (a: string, b: string) => (games[a][b] ? (100 * wins[a][b]) / games[a][b] : 0);

// Per-deck overall WR = total wins / total games over all opponents.
const overall: Record<string, number> = {};
for (const a of decks) {
  let w = 0;
  let g = 0;
  for (const b of decks) if (b !== a) {
    w += wins[a][b];
    g += games[a][b];
  }
  overall[a] = (100 * w) / g;
}

const totalGames = n * seeds;
console.log(`Parity — round-robin, ${n} games/pairing/seed × ${seeds} seeds = ${totalGames}/pairing`);
console.log(`(±~${(100 * Math.sqrt(0.25 / totalGames)).toFixed(1)} pts noise per pairing cell)\n`);

// matrix: row a's win% vs column b
const w0 = 10;
process.stdout.write("row vs col".padEnd(w0));
for (const b of decks) process.stdout.write(b.slice(0, 8).padStart(9));
process.stdout.write("   overall\n");
for (const a of decks) {
  process.stdout.write(a.padEnd(w0));
  for (const b of decks) {
    if (a === b) process.stdout.write("       — ");
    else process.stdout.write(`${pct(a, b).toFixed(1)}%`.padStart(9));
  }
  process.stdout.write(`   ${overall[a].toFixed(1)}%\n`);
}

const vals = decks.map((d) => overall[d]);
const spread = Math.max(...vals) - Math.min(...vals);
// Worst single matchup deviation from 50.
let worst = 0;
let worstPair = "";
for (const [a, b] of pairs) {
  const dev = Math.abs(pct(a, b) - 50);
  if (dev > worst) {
    worst = dev;
    worstPair = `${a} vs ${b} (${pct(a, b).toFixed(1)}%)`;
  }
}
console.log(`\nSPREAD (max-min overall): ${spread.toFixed(1)} pts`);
console.log(`WORST matchup: ${worstPair} — ${worst.toFixed(1)} pts off 50`);
console.log(`AVG game length: ${(lenSum / lenWeight).toFixed(2)} turns`);
