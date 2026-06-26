// Batch runner: runMatch() plays N games of a matchup and aggregates win-rates,
// end-reason breakdown, and game length. Seeded for reproducibility.

import { DECKS } from "../data/decks";
import { game } from "../engine/game";
import { mulberry32 } from "../engine/rng";
import { policyFor } from "./ai";

export interface MatchStats {
  wins: Record<string, number>;
  ends: Record<string, number>;
  avg: number;
  median: number;
  n: number;
}

export function runMatch(nameA: string, nameB: string, n: number, seed: number): MatchStats {
  const fa = DECKS[nameA];
  const fb = DECKS[nameB];
  const polA = policyFor(nameA);
  const polB = policyFor(nameB);
  const wins: Record<string, number> = {};
  const ends: Record<string, number> = {};
  let lenSum = 0;
  const lens: number[] = [];
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    const rnd = mulberry32((s = (s + 0x9e3779b9) >>> 0));
    const first = i % 2; // alternate who goes first to cancel the first-player edge
    // The policy pair follows the seating: side A's brain matches whichever deck is seated A.
    const [w, length, why] =
      first === 0 ? game(fa(), fb(), rnd, [polA, polB]) : game(fb(), fa(), rnd, [polB, polA]);
    let key: string;
    if (w === "draw") key = "draw";
    else key = (w === "A") === (first === 0) ? nameA : nameB;
    wins[key] = (wins[key] || 0) + 1;
    ends[why] = (ends[why] || 0) + 1;
    lenSum += length;
    lens.push(length);
  }
  lens.sort((a, b) => a - b);
  return { wins, ends, avg: lenSum / n, median: lens[Math.floor(n / 2)], n };
}
