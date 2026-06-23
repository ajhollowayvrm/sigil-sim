// The AI's evaluation function — the single shared "brain" that scores how good a
// position is. Every smart decision in sim/ai.ts (which transform to take, where
// to play a body, whom to equip, whom to elevate) and the combat target planner
// reduce to: enumerate the legal options, ask evalState() which resulting position
// is best, take that one. Keeping the heuristic in one place means the policy is
// *consistent* — it values a board the same way whether it's deciding a transform
// or a swing. Pure — no React/DOM, no RNG.

import { canAttack, chars, effAtk, effDef } from "../engine/stats";
import type { Player, Unit } from "../engine/types";

const has = (arr: string[], x: string) => arr.includes(x);

// Tunable weights. These are deliberately HP-denominated (1 point ≈ 1 HP) so the
// numbers stay legible against card stats (bodies are 10-60 HP, ATK 10-50).
const W = {
  def: 0.5, // DEF is worth half an HP point of offense (it only matters on defense)
  offPassive: 0.3, // a body that can't swing keeps ~30% of its ATK value (shelter / future)
  tier: 12, // each tier of investment is sticky and hard to replace
  leader: 70, // a Leader is the win condition — losing one ends the game
  kill: 4, // banked kills fuel transforms / Blood Money
  handCard: 6, // a card in hand is an option
  deckCard: 1.5, // a card in the deck is a (discounted) future option
  leaderless: 80, // having no Leader is dangerous (lose by turn 6, no transforms)
  lockout: 30, // a leaderless lockout also blocks transforms right now
};

/** How much a single unit is worth to its controller, in the current position.
 *  Used both for whole-board material and as the base of combat target priority. */
export function unitValue(p: Player, u: Unit): number {
  const atk = effAtk(p, u);
  const def = effDef(p, u);
  const hp = Math.max(0, u.hp);
  // Only active, attack-capable bodies realise their full ATK; passive / War-Torn
  // bodies are sheltered value, not pressure.
  const canSwing = u.zone !== "passive" && canAttack(p, u);
  const off = canSwing ? atk : atk * W.offPassive;
  let v = hp + def * W.def + off + u.tier * W.tier + u.kills * W.kill;
  if (u.leader) v += W.leader;
  return v;
}

/** Combat priority of a defender: its material worth, but a Leader is worth a kingdom
 *  because removing it wins outright — so attackers always focus a reachable Leader. */
export function targetValue(controller: Player, u: Unit): number {
  let v = unitValue(controller, u);
  if (u.leader) v += 1000;
  // High-ATK threats are worth removing first even below lethal: they hurt us next turn.
  v += effAtk(controller, u) * 0.4;
  // A body that can't fight back (War-Torn, no enabler) is a low-priority kill.
  if (!canAttack(controller, u) && !u.leader) v *= 0.6;
  return v;
}

/** Card economy: options in hand, future cards in deck, with a deck-out cliff. */
function economy(p: Player): number {
  let v = p.hand.length * W.handCard;
  v += Math.min(p.deck.length, 20) * W.deckCard;
  if (p.deck.length <= 3) v -= (4 - p.deck.length) * 15; // running out of deck is lethal
  return v;
}

/** Score the whole position from `me`'s perspective (higher = better for `me`).
 *  Symmetric: it credits my material/economy and debits the opponent's. */
export function evalState(me: Player, opp: Player): number {
  let s = 0;
  for (const u of chars(me)) s += unitValue(me, u);
  for (const u of chars(opp)) s -= unitValue(opp, u);
  s += economy(me) - economy(opp);
  if (!me.leader) s -= W.leaderless;
  if (!opp.leader) s += W.leaderless;
  if (me.lockout) s -= W.lockout;
  if (opp.lockout) s += W.lockout;
  return s;
}

export { has as _has };
