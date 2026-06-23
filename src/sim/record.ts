// The move-by-move recording format for human-played reference games. Each move
// captures the (state, legal options, chosen action) triple — exactly the data a
// later pass needs to see where the AI diverges from good human play and to tune
// the policy toward it. Pure data; serialised to JSON for download.

import type { SideSnap } from "./recorder";

export type Phase = "main" | "transform" | "combat" | "elevate";

export interface MoveRecord {
  ply: number; // half-turn counter (1-based)
  turn: number; // game turn (both players act on a turn)
  actor: "A" | "B";
  phase: Phase;
  action: string; // canonical key, e.g. "play:Pyrnit:active", "attack:Pyrnit>Bogfang"
  label: string; // human-readable label that was shown
  legal: string[]; // every option that WAS available at this decision (the action space)
  hand: string[]; // the acting player's hand at decision time
  state: { A: SideSnap; B: SideSnap }; // board for both sides, before the action
}

export interface GameRecording {
  format: "sigil-play-v1";
  meta: {
    deckA: string;
    deckB: string;
    seed: number;
    startedAt?: string; // ISO timestamp, stamped by the UI at save time
    note?: string;
  };
  moves: MoveRecord[];
  result: { winner: "A" | "B" | "draw"; turn: number; why: string } | null;
}

/** Stable, human-readable filename for a downloaded recording. */
export function recordingFilename(r: GameRecording): string {
  const stamp = (r.meta.startedAt ?? "").replace(/[:.]/g, "-").replace("T", "_").slice(0, 19) || "game";
  return `sigil_${r.meta.deckA}-vs-${r.meta.deckB}_seed${r.meta.seed}_${stamp}.json`;
}
