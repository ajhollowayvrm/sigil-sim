import { getCard } from "../src/data/loadCards";
import { mulberry32 } from "../src/engine/rng";
import { makeUnit } from "../src/engine/stats";
import type { Player, Unit } from "../src/engine/types";

/** A blank player for unit-level scenario tests. */
export function P(name = "A"): Player {
  return {
    name,
    deck: [],
    hand: [],
    active: [],
    passive: [],
    pcards: [],
    events: new Set(),
    war_turns: {},
    leader: null,
    lockout: false,
    lose: false,
    dark_ignore_used: false,
    rnd: mulberry32(1),
  };
}

export function unit(name: string, turn = 1): Unit {
  const c = getCard(name);
  if (!c) throw new Error(`unknown card in test: ${name}`);
  return makeUnit(c, turn);
}
