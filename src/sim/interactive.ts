// Interactive game driver: plays one full game where a human makes EVERY decision
// for BOTH sides, pausing at each choice for input and recording every move. It
// mirrors the engine's turn loop (engine/game.ts) but, instead of an injected
// Policy, it asks an async `ask` callback at each decision point and pushes the live
// board to `onView` for rendering. All rules go through the real engine primitives,
// so play stays faithful; chains auto-resolve with the engine's optimal targeting
// (flagged in the log) while the human directs solo attacks.

import { makePlayer, noCharactersLeft } from "../engine/game";
import { cleanup, startOfTurn } from "../engine/effects";
import { doChains, reachable, strike } from "../engine/combat";
import { setLog } from "../engine/log";
import { mulberry32 } from "../engine/rng";
import { boardChars, canAttack, draw } from "../engine/stats";
import { snap, type SideSnap } from "./recorder";
import { mainActions, transformActions, type GameAction } from "./actions";
import type { GameRecording, MoveRecord, Phase } from "./record";
import type { Player, Unit } from "../engine/types";

export interface Option {
  key: string;
  label: string;
}

export interface Decision {
  kind: Phase;
  actor: "A" | "B";
  turn: number;
  prompt: string;
  options: Option[];
  terminalKey?: string; // the "done / skip / end" option, if this decision has one
}

export interface View {
  turn: number;
  actor: "A" | "B" | null;
  A: SideSnap;
  B: SideSnap;
  handA: string[];
  handB: string[];
  log: string[];
  result: GameRecording["result"];
}

export type Ask = (d: Decision) => Promise<string>;
export type OnView = (v: View) => void;

const TURN_CAP = 72;

function crown(p: Player, u: Unit): void {
  for (const lst of [p.active, p.passive]) {
    const i = lst.indexOf(u);
    if (i >= 0) lst.splice(i, 1);
  }
  u.leader = true;
  u.zone = "leader";
  p.leader = u;
  p.lockout = false;
}

/** Play a full interactive game. Resolves with the complete recording. */
export async function playInteractive(
  deckA: string[],
  deckB: string[],
  deckAName: string,
  deckBName: string,
  seed: number,
  ask: Ask,
  onView: OnView,
): Promise<GameRecording> {
  const rnd = mulberry32(seed >>> 0);
  const A = makePlayer(deckA, "A", rnd);
  const B = makePlayer(deckB, "B", rnd);
  const players: [Player, Player] = [A, B];

  const lines: string[] = [];
  setLog((s) => lines.push(s));

  const rec: GameRecording = {
    format: "sigil-play-v1",
    meta: { deckA: deckAName, deckB: deckBName, seed },
    moves: [],
    result: null,
  };
  let ply = 0;

  const view = (turn: number, actor: "A" | "B" | null): View => ({
    turn,
    actor,
    A: snap(A),
    B: snap(B),
    handA: A.hand.slice(),
    handB: B.hand.slice(),
    log: lines.slice(),
    result: rec.result,
  });

  // Resolve a decision: render, ask, fall back to the terminal option on anything unrecognised.
  const decide = async (d: Decision, actor: "A" | "B", turn: number): Promise<string> => {
    onView(view(turn, actor));
    const key = await ask(d);
    if (d.options.some((o) => o.key === key)) return key;
    return d.terminalKey ?? d.options[0]?.key ?? "";
  };

  const record = (p: Player, turn: number, phase: Phase, a: GameAction | { key: string; label: string }, legal: Option[]): void => {
    const move: MoveRecord = {
      ply,
      turn,
      actor: p.name as "A" | "B",
      phase,
      action: a.key,
      label: a.label,
      legal: legal.map((o) => o.label),
      hand: p.hand.slice(),
      state: { A: snap(A), B: snap(B) },
    };
    rec.moves.push(move);
  };

  const finish = (winner: "A" | "B" | "draw", turn: number, why: string): GameRecording => {
    rec.result = { winner, turn, why };
    setLog(null);
    onView(view(turn, null));
    return rec;
  };

  onView(view(1, null));

  for (let t = 1; t <= TURN_CAP; t++) {
    const turn = Math.floor((t + 1) / 2);
    ply = t;
    const active = (t - 1) % 2;
    const p = players[active];
    const opp = players[1 - active];

    startOfTurn(p, opp, turn);
    if (p.leader && p.leader.hp <= 0) return finish(opp.name as "A" | "B", turn, "leader");

    if (boardChars(p).length === 0 && p.pcards.length === 0) {
      draw(p);
      draw(p);
      lines.push(`${p.name}: empty board — draws 2`);
    } else {
      draw(p);
    }
    if (p.lose) return finish(opp.name as "A" | "B", turn, "deckout");

    // ---- main phase: take legal plays until the human ends it ----
    for (;;) {
      const acts = mainActions(p, opp, turn);
      if (acts.length === 0) break;
      const options: Option[] = [...acts, { key: "done", label: "End main phase" }];
      const d: Decision = {
        kind: "main",
        actor: p.name as "A" | "B",
        turn,
        prompt: `${p.name} — main phase: play a card or end the phase`,
        options,
        terminalKey: "done",
      };
      const key = await decide(d, p.name as "A" | "B", turn);
      if (key === "done") break;
      const chosen = acts.find((a) => a.key === key);
      if (!chosen) break;
      record(p, turn, "main", chosen, options);
      chosen.apply(p, opp, turn);
    }

    // ---- transform action (one per turn) — blocked while leaderless ----
    if (p.leader !== null) {
      const tacts = transformActions(p, turn);
      if (tacts.length > 0) {
        const options: Option[] = [...tacts, { key: "skip", label: "Skip transformation" }];
        const d: Decision = {
          kind: "transform",
          actor: p.name as "A" | "B",
          turn,
          prompt: `${p.name} — transformation (one per turn): choose one or skip`,
          options,
          terminalKey: "skip",
        };
        const key = await decide(d, p.name as "A" | "B", turn);
        const chosen = tacts.find((a) => a.key === key);
        if (chosen) {
          record(p, turn, "transform", chosen, options);
          chosen.apply(p, opp, turn);
        }
      }
    }

    // ---- combat (turn 3+): chains auto-resolve, human directs solo attacks ----
    if (turn >= 3) {
      p.dark_ignore_used = false;
      const used = new Set<Unit>();
      const leaderDied = doChains(p, opp, used);
      if (leaderDied) return finish(p.name as "A" | "B", turn, "leader");
      const acted = new Set<Unit>(used);
      for (;;) {
        const attackers = p.active.filter((u) => !acted.has(u) && canAttack(p, u));
        if (p.leader && !acted.has(p.leader) && canAttack(p, p.leader)) attackers.push(p.leader);
        const byKey = new Map<string, { a: Unit; t: Unit }>();
        const options: Option[] = [];
        for (const u of attackers)
          for (const tg of reachable(u, opp)) {
            const key = `attack:${u.t.name}#${p.active.indexOf(u)}>${tg.t.name}#${opp.active.indexOf(tg)}`;
            byKey.set(key, { a: u, t: tg });
            options.push({ key, label: `${u.t.name} ⚔ ${tg.t.name} (${Math.max(0, tg.hp)} HP)` });
          }
        if (options.length === 0) break;
        options.push({ key: "end-combat", label: "End combat" });
        const d: Decision = {
          kind: "combat",
          actor: p.name as "A" | "B",
          turn,
          prompt: `${p.name} — combat: choose an attack or end combat`,
          options,
          terminalKey: "end-combat",
        };
        const key = await decide(d, p.name as "A" | "B", turn);
        if (key === "end-combat") break;
        const pr = byKey.get(key);
        if (!pr) break;
        record(p, turn, "combat", { key, label: `${pr.a.t.name} ⚔ ${pr.t.t.name}` }, options);
        strike(p, pr.a, opp, pr.t);
        acted.add(pr.a);
        cleanup(opp);
        if (opp.leader && opp.leader.hp <= 0) return finish(p.name as "A" | "B", turn, "leader");
      }
    }

    if (opp.leader && opp.leader.hp <= 0) return finish(p.name as "A" | "B", turn, "leader");
    cleanup(opp);
    if (opp.leader && opp.leader.hp <= 0) return finish(p.name as "A" | "B", turn, "leader");
    if (noCharactersLeft(opp)) return finish(p.name as "A" | "B", turn, "wiped");

    // ---- elevation: OPTIONAL, from end of turn 2 onward while leaderless ----
    // You may decline and stay leaderless to wait for a better Leader candidate — but
    // you can't transform while leaderless, the opponent's Leader keeps climbing, and
    // you LOSE if you still have no Leader by the end of turn 5.
    if (p.leader === null && turn >= 2) {
      const elig = boardChars(p).filter((u) => u.entered <= turn - 1);
      if (elig.length === 0) {
        p.lockout = true;
      } else {
        const options: Option[] = elig.map((u, i) => ({
          key: `elevate:${u.t.name}#${i}`,
          label: `Elevate ${u.t.name} (T${u.tier}, ${u.hp} HP)`,
        }));
        const deadline = turn >= 5;
        options.push({
          key: "decline",
          label: deadline ? "Stay leaderless (LOSE — no Leader by turn 5)" : "Stay leaderless (no transforms; wait for a better Leader)",
        });
        const d: Decision = {
          kind: "elevate",
          actor: p.name as "A" | "B",
          turn,
          prompt: `${p.name} — elevate a character to Leader, or stay leaderless`,
          options,
          terminalKey: "decline",
        };
        const key = await decide(d, p.name as "A" | "B", turn);
        if (key === "decline") {
          p.lockout = true; // leaderless: flagged for the board, blocks transforms
        } else {
          const idx = Math.max(0, options.findIndex((o) => o.key === key));
          const chosen = elig[idx] ?? elig[0];
          record(p, turn, "elevate", options[idx] ?? options[0], options);
          crown(p, chosen);
        }
      }
    }
    if (turn >= 5 && p.leader === null) return finish(opp.name as "A" | "B", turn, "noleader");
  }

  return finish("draw", Math.floor((TURN_CAP + 1) / 2), "timeout");
}
