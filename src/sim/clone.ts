// Deep-clone a player's game state so the AI can try a candidate move on a copy,
// score the result with evalState(), and discard it — without touching the live
// game. This is what makes the policy "look-ahead" rather than first-legal-move:
// it can actually play out "what if I equip THIS bearer / take THAT transform"
// and compare the resulting positions.
//
// Two invariants make this safe:
//   * Object identity is preserved *within* a player — equipment's `link`, the
//     Leader pointer, and the active/passive arrays all point at the SAME cloned
//     Unit objects, exactly as the engine expects (transform/cleanup rewrite these).
//   * The clone gets an INERT RNG, so a trial that happens to consume randomness
//     (a Holy War capture roll, say) can never perturb the real game's seeded
//     stream. Determinism of the actual game is untouched.
// Pure — no React/DOM.

import { mulberry32 } from "../engine/rng";
import { isEquipObj } from "../engine/stats";
import type { Equip, Player, Unit } from "../engine/types";

export function clonePlayer(p: Player): Player {
  const map = new Map<Unit, Unit>();
  const cu = (u: Unit): Unit => {
    const nu: Unit = { ...u, mods: { ...u.mods } };
    map.set(u, nu);
    return nu;
  };
  const active = p.active.map(cu);
  const passive = p.passive.map(cu);
  const leader = p.leader ? cu(p.leader) : null;
  const pcards = p.pcards.map((e) =>
    isEquipObj(e) ? ({ ...e, link: e.link ? map.get(e.link) ?? e.link : null } as Equip) : e,
  );
  return {
    ...p,
    deck: p.deck.slice(),
    hand: p.hand.slice(),
    active,
    passive,
    leader,
    pcards,
    events: new Set(p.events),
    eventZones: { ...p.eventZones },
    war_turns: { ...p.war_turns },
    rnd: mulberry32(0x51517), // inert: trials must never touch the real seeded stream
  };
}

/** Clone both players together (an entry effect can reach across the table). */
export function cloneBoth(p: Player, opp: Player): [Player, Player] {
  return [clonePlayer(p), clonePlayer(opp)];
}
