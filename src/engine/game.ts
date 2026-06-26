// Turn loop, win/loss, recorder hooks. The decision policy (which cards to play,
// which transform to take, whom to elevate) is injected so it can be swapped;
// combat resolution itself is engine mechanics. Pure — no React/DOM.

import { isCharacter } from "../data/loadCards";
import { combat } from "./combat";
import { cleanup, startOfTurn } from "./effects";
import { log, setLog } from "./log";
import { boardChars, draw } from "./stats";
import type { GameResult, Player, Unit } from "./types";
import { shuffle, type RNG } from "./rng";

/** Per-ply snapshot capture for watch mode (implemented in sim/recorder.ts). */
export interface Recorder {
  log(s: string): void;
  beginPly(t: number, turn: number, actor: string): void;
  endPly(a: Player, b: Player, turn: number): void;
  snapshot(a: Player, b: Player, turn: number, result: { w: string; why: string } | null): void;
}

/** The decision-making layer. Combat is resolved by the engine; everything that
 *  requires a choice goes through the policy so alternatives can be plugged in. */
export interface Policy {
  mainPhase(p: Player, opp: Player, turn: number): void;
  transformAction(p: Player, opp: Player, turn: number): void;
  elevate(p: Player, turn: number): void;
}

export function makePlayer(deck: string[], name: string, rnd: RNG): Player {
  const p: Player = {
    name,
    deck: shuffle(deck.slice(), rnd),
    hand: [],
    active: [],
    passive: [],
    pcards: [],
    events: new Set(),
    eventZones: {},
    war_turns: {},
    leader: null,
    lockout: false,
    lose: false,
    transformedThisTurn: false,
    dark_ignore_used: false,
    rnd,
  };
  for (let i = 0; i < 5; i++) draw(p);
  return p;
}

export function noCharactersLeft(p: Player): boolean {
  if (p.leader || p.active.length || p.passive.length) return false;
  return !p.deck.concat(p.hand).some((c) => isCharacter(c));
}

export function game(
  dA: string[],
  dB: string[],
  rnd: RNG,
  policy: Policy | [Policy, Policy],
  recorder?: Recorder,
): GameResult {
  setLog(recorder ? (s: string) => recorder.log(s) : null);

  const A = makePlayer(dA, "A", rnd);
  const B = makePlayer(dB, "B", rnd);
  const players: Player[] = [A, B];
  // Per-side policies: A may use a different brain than B (deck-specialized AI). A single
  // Policy is shared by both sides (the common case); a [polA, polB] pair specializes each.
  const polFor = (i: number): Policy => (Array.isArray(policy) ? policy[i] : policy);
  let active = 0;

  const finish = (w: string, turn: number, why: GameResult[2]): GameResult => {
    if (recorder) recorder.snapshot(players[0], players[1], turn, { w, why });
    setLog(null);
    return [w, turn, why];
  };

  if (recorder) recorder.snapshot(A, B, 1, null);

  for (let t = 1; t <= 72; t++) {
    const turn = Math.floor((t + 1) / 2);
    const p = players[active];
    const opp = players[1 - active];
    if (recorder) recorder.beginPly(t, turn, p.name);

    startOfTurn(p, opp, turn);
    if (p.leader && p.leader.hp <= 0) return finish(opp.name, turn, "leader");

    if (boardChars(p).length === 0 && p.pcards.length === 0) {
      draw(p);
      draw(p);
      log(`${p.name}: empty board — draws 2`);
    } else {
      draw(p);
    }
    if (p.lose) return finish(opp.name, turn, "deckout");

    const pol = polFor(active);
    pol.mainPhase(p, opp, turn);
    pol.transformAction(p, opp, turn);
    combat(p, opp, turn);

    if (opp.leader && opp.leader.hp <= 0) return finish(p.name, turn, "leader");
    cleanup(opp);
    if (opp.leader && opp.leader.hp <= 0) return finish(p.name, turn, "leader");
    if (noCharactersLeft(opp)) return finish(p.name, turn, "wiped");

    if (p.leader === null && turn >= 2) pol.elevate(p, turn);
    // Optional elevation: you may stay leaderless (no transforms while you do — that's
    // the cost), but you lose if you still have no Leader by the end of turn 5.
    if (turn >= 5 && p.leader === null) return finish(opp.name, turn, "noleader");

    if (recorder) recorder.endPly(A, B, turn);
    active = 1 - active;
  }
  return finish("draw", 36, "timeout");
}

export type { Unit };
