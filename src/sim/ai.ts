// The decision policy (§7), rebuilt as an evaluation-driven agent instead of a
// fixed "play the first legal card" script. The shape is the same (it only calls
// pure engine primitives + the card DB, and lives apart from the engine so it can
// be swapped), but every choice now goes through the same machine:
//
//     enumerate the legal options  →  simulate each on a cloned board (clone.ts)
//     →  score the result with evalState (evaluate.ts)  →  keep the best.
//
// So the AI compares *which* transform yields the stronger board, *which* bearer
// most wants the equipment, *which* zone a body belongs in, and *whom* to crown —
// rather than taking whatever comes first in hand order. Strategic, cross-turn
// decisions that a one-ply score can't see (committing a world War, hoarding
// transform fuel) stay as explicit heuristics. Determinism is preserved: trials run
// on clones with an inert RNG, so the real seeded stream only advances on real moves.

import {
  EQUIP,
  EQUIP_REQUIRES_WAR,
  ONPLAY,
  getCard,
  isCharacter,
  isHardCastable,
  playPermissionMin,
} from "../data/loadCards";
import { activeWars, fireEntry, warDamageFrom } from "../engine/effects";
import type { Policy } from "../engine/game";
import { log, logging, suppressLog } from "../engine/log";
import {
  activeSlotsUsed,
  boardChars,
  canBecomeWarTorn,
  canEquip,
  chars,
  crownLeader,
  effMaxhp,
  eventSlot,
  isKaethlaan,
  hasWar,
  makeEquip,
  makeUnit,
  moveZone,
  passiveSlotsUsed,
  placePersistent,
} from "../engine/stats";
import { applyForge, applyTransform, canAfford, forgeOptions, metamorph } from "../engine/transform";
import { cloneBoth } from "./clone";
import { evalState, unitValue } from "./evaluate";
import type { Player, TransformCost, Unit } from "../engine/types";

const has = (arr: string[], x: string) => arr.includes(x);

// World Wars are handled by a dedicated heuristic (their value is cross-turn and
// hits both sides); everything else persistent is either fuel we hoard or a special.
const WORLD_WARS = ["War", "Holy War", "Goblin War"];
// Support persistents the eval loop is allowed to play (they buff our own board, so
// a one-ply score sees their value), each behind its printed precondition.
const SUPPORT_PERSIST = ["Rally to War", "Crusade", "Horde Frenzy", "The Broken March"];

// ---------------------------------------------------------------------------
// Look-ahead scaffolding: try an action on a cloned board, return the score.
// ---------------------------------------------------------------------------

/** Score the position after running `act` on a clone — never touches the real game. */
function scoreAfter(p: Player, opp: Player, act: (cp: Player, co: Player) => void): number {
  return suppressLog(() => {
    const [cp, co] = cloneBoth(p, opp);
    act(cp, co);
    return evalState(cp, co);
  });
}

// ---------------------------------------------------------------------------
// Primitive "apply" helpers — each mutates the players passed in, so the SAME code
// drives both the real move and the cloned trial (no duplicated logic to drift).
// ---------------------------------------------------------------------------

function placeUnit(p: Player, u: Unit, zone: "active" | "passive"): void {
  u.zone = zone;
  (zone === "active" ? p.active : p.passive).push(u);
}

function applyHardCast(p: Player, opp: Player, turn: number, card: string, zone: "active" | "passive"): void {
  const u = makeUnit(getCard(card)!, turn);
  placeUnit(p, u, zone);
  p.hand.splice(p.hand.indexOf(card), 1);
  fireEntry(p, opp, u);
}

function applyEquip(p: Player, card: string, bearer: Unit): void {
  const e = makeEquip(card);
  e.zone = "passive";
  e.charged = true; // §5.3: applies immediately on play
  e.link = bearer;
  p.pcards.push(e);
  bearer.hp = Math.min(effMaxhp(p, bearer), bearer.hp); // a Max-HP cut (Tower Shield etc.) can clip current
  p.hand.splice(p.hand.indexOf(card), 1);
}

function applyOnPlay(p: Player, card: string, bearer: Unit | null): void {
  if (bearer) bearer.hp = Math.min(effMaxhp(p, bearer), bearer.hp + (ONPLAY[card].heal || 0));
  p.hand.splice(p.hand.indexOf(card), 1);
}

function applySupportPersist(p: Player, card: string): void {
  if (placePersistent(p, card)) p.hand.splice(p.hand.indexOf(card), 1);
}

// ---------------------------------------------------------------------------
// Candidate enumeration for the main-phase eval loop.
// ---------------------------------------------------------------------------

interface Candidate {
  label: string;
  apply: (p: Player, opp: Player, turn: number) => void;
}

/** Where can a freshly-played body go right now (slot availability)? */
function openZones(p: Player): ("active" | "passive")[] {
  const z: ("active" | "passive")[] = [];
  if (activeSlotsUsed(p) < 3) z.push("active");
  if (passiveSlotsUsed(p) < 3) z.push("passive");
  return z;
}

function hardCastCandidates(p: Player, turn: number): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const card of p.hand) {
    if (seen.has(card) || !isCharacter(card) || !isHardCastable(card)) continue;
    seen.add(card);
    const cc = getCard(card)!;
    if (cc.tier > turn) continue;
    const minOthers = playPermissionMin(card);
    if (minOthers != null && boardChars(p).length < minOthers) continue;
    for (const zone of openZones(p))
      out.push({
        label: `plays ${card} (T${cc.tier}${zone === "passive" ? ", to passive" : ""})`,
        apply: (pp, oo, tn) => applyHardCast(pp, oo, tn, card, zone),
      });
  }
  return out;
}

function equipCandidates(p: Player): Candidate[] {
  const out: Candidate[] = [];
  if (passiveSlotsUsed(p) >= 3) return out;
  const seen = new Set<string>();
  for (const card of p.hand) {
    if (seen.has(card) || !(card in EQUIP)) continue;
    seen.add(card);
    if (EQUIP_REQUIRES_WAR.has(card) && !hasWar(p)) continue; // printed play-condition
    boardChars(p).forEach((bearer, i) => {
      if (!canEquip(card, bearer)) return; // tier-gate + signature bearer restriction
      out.push({
        label: `equips ${card} to ${bearer.t.name}`,
        // re-resolve the bearer by index inside the clone so the same code path works
        apply: (pp) => applyEquip(pp, card, boardChars(pp)[i]),
      });
    });
  }
  return out;
}

// Item forging: a separate, UNLIMITED-per-turn action lane, surfaced as candidates in
// the same eval loop so the AI forges whenever the upgraded gear improves the board.
function forgeCandidates(p: Player): Candidate[] {
  const out: Candidate[] = [];
  boardCharsAndLeader(p).forEach((bearer, bidx) => {
    for (const opt of forgeOptions(p, bearer)) {
      const dest = opt.dest;
      out.push({
        label: `forges ${opt.origin.name} → ${dest} on ${bearer.t.name}`,
        apply: (pp) => {
          const b = boardCharsAndLeader(pp)[bidx];
          const o = forgeOptions(pp, b).find((x) => x.dest === dest);
          if (o) applyForge(pp, b, o.origin, o.dest, o.cost);
        },
      });
    }
  });
  return out;
}

function onPlayCandidates(p: Player): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const card of p.hand) {
    if (seen.has(card) || !(card in ONPLAY)) continue;
    seen.add(card);
    out.push({
      label: `plays ${card}`,
      apply: (pp) => applyOnPlay(pp, card, lowestRatioWounded(pp)),
    });
  }
  return out;
}

function metamorphCandidates(p: Player): Candidate[] {
  const out: Candidate[] = [];
  const srcIdx = boardCharsAndLeader(p).findIndex((u) => has(u.t.affils, "Wild") && u.t.tier === 1);
  if (srcIdx < 0) return out;
  const seen = new Set<string>();
  for (const card of p.hand) {
    if (seen.has(card) || card === "Metamorphosis") continue;
    const cc = getCard(card);
    if (!cc || !has(cc.affils, "Wild") || cc.tier !== 2) continue;
    seen.add(card);
    out.push({
      label: `Metamorphosis → ${card}`,
      apply: (pp, oo, tn) => metamorph(pp, oo, tn, boardCharsAndLeader(pp)[srcIdx], card),
    });
  }
  return out;
}

function supportPersistCandidates(p: Player): Candidate[] {
  const out: Candidate[] = [];
  if (eventSlot(p) === null) return out;
  for (const card of SUPPORT_PERSIST) {
    if (!p.hand.includes(card) || p.events.has(card)) continue;
    if (card === "Crusade" && !p.events.has("Holy War")) continue;
    if (card === "Horde Frenzy" && !p.events.has("Goblin War")) continue;
    if (card === "Rally to War" && !hasWar(p)) continue;
    out.push({ label: `plays ${card}`, apply: (pp) => applySupportPersist(pp, card) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Small board helpers.
// ---------------------------------------------------------------------------

function boardCharsAndLeader(p: Player): Unit[] {
  return p.leader ? [p.leader, ...boardChars(p)] : boardChars(p);
}

function lowestRatioWounded(p: Player): Unit | null {
  const cand = chars(p).filter((c) => c.hp < effMaxhp(p, c));
  if (!cand.length) return null;
  return cand.reduce((a, b) => (b.hp / effMaxhp(p, b) < a.hp / effMaxhp(p, a) ? b : a));
}

// ---------------------------------------------------------------------------
// Strategic heuristics the one-ply score can't see.
// ---------------------------------------------------------------------------

/** Commit a world War only when it's a net win: either we run war-payoff cards, or
 *  the attrition costs the opponent's active line more than ours (it hits both). */
function shouldPlayWorldWar(p: Player, opp: Player, war: string): boolean {
  const payoff =
    chars(p).some((u) => ["forged_in_chains", "war_child", "war_atk"].some((a) => has(u.t.abil, a))) ||
    p.events.has("Rally to War") ||
    p.hand.some((c) => ["Rally to War", "Warmonger's Resolve", "The Broken March"].includes(c)) ||
    (war === "Holy War" && p.hand.includes("Crusade")) ||
    (war === "Goblin War" && (p.events.has("Horde Frenzy") || p.hand.includes("Horde Frenzy")));
  const set = new Set([war]);
  const myLoss = p.active.reduce((s, u) => s + Math.min(u.hp, warDamageFrom(p, u, set)), 0);
  const oppLoss = opp.active.reduce((s, u) => s + Math.min(u.hp, warDamageFrom(opp, u, set)), 0);
  return payoff || oppLoss > myLoss * 1.15;
}

function tryWorldWars(p: Player, opp: Player): void {
  for (const war of WORLD_WARS) {
    if (hasWar(p)) break; // one world-state war per side
    if (!p.hand.includes(war) || p.events.has(war)) continue;
    if (eventSlot(p) === null) return;
    if (!shouldPlayWorldWar(p, opp, war)) continue;
    placePersistent(p, war);
    p.war_turns[war] = 0;
    if (war === "Holy War") {
      for (const pl of [p, opp])
        if (p.rnd() < 0.5) {
          const v = pl.active.find((u) => canBecomeWarTorn(pl, u));
          if (v) {
            v.wartorn = true;
            if (logging()) log(`${pl.name}: ${v.t.name} captured (War-Torn) by Holy War`);
          }
        }
    }
    p.hand.splice(p.hand.indexOf(war), 1);
    if (logging()) log(`${p.name}: plays ${war}`);
  }
  // Hardened Veterans: only worth a slot to shield our Royal Army under an active War.
  if (
    p.hand.includes("Hardened Veterans") &&
    !p.events.has("Hardened Veterans") &&
    hasWar(p) &&
    eventSlot(p) !== null &&
    chars(p).some((u) => has(u.t.affils, "Royal Army"))
  ) {
    placePersistent(p, "Hardened Veterans");
    p.hand.splice(p.hand.indexOf("Hardened Veterans"), 1);
    if (logging()) log(`${p.name}: plays Hardened Veterans`);
  }
}

/** Kaethlaan support persistents — value not visible to a one-ply score, so they're
 *  handled here: shield the line under an active war, cheapen the Royal Army climb. */
function tryKaethlaanSupport(p: Player, opp: Player): void {
  if (
    p.hand.includes("Close the Gates") &&
    !p.events.has("Close the Gates") &&
    eventSlot(p) !== null &&
    activeWars([p, opp]).size > 0 &&
    chars(p).some(isKaethlaan)
  ) {
    placePersistent(p, "Close the Gates");
    p.hand.splice(p.hand.indexOf("Close the Gates"), 1);
    if (logging()) log(`${p.name}: plays Close the Gates`);
  }
  if (
    p.hand.includes("War College") &&
    !p.events.has("War College") &&
    eventSlot(p) !== null &&
    chars(p).some((u) => has(u.t.affils, "Royal Army") && u.t.upg.length > 0)
  ) {
    placePersistent(p, "War College");
    p.hand.splice(p.hand.indexOf("War College"), 1);
    if (logging()) log(`${p.name}: plays War College`);
  }
}

/** Taken Prisoner: deliberately capture our own attack-through-War-Torn bodies (or
 *  any body while The Broken March is out) to switch on their wartime payoff. */
function tryTakenPrisoner(p: Player): void {
  while (p.hand.includes("Taken Prisoner") && hasWar(p)) {
    const tgt = boardChars(p).find(
      (u) =>
        !u.wartorn &&
        canBecomeWarTorn(p, u) &&
        (["forged_in_chains", "war_child"].some((a) => has(u.t.abil, a)) || p.events.has("The Broken March")),
    );
    if (!tgt) break;
    tgt.wartorn = true;
    p.hand.splice(p.hand.indexOf("Taken Prisoner"), 1);
    if (logging()) log(`${p.name}: Taken Prisoner → ${tgt.t.name} is War-Torn`);
  }
}

/** Pull a body off the front line when a world War would kill it before it swings
 *  again (two ticks: the opponent's upkeep, then ours). War-payoff bodies and
 *  regrowers earn their place in the fire and stay. */
function shelterWarDoomed(p: Player, opp: Player): void {
  const wars = activeWars([p, opp]);
  if (!wars.size) return;
  for (const u of p.active.slice()) {
    if (passiveSlotsUsed(p) >= 3) break;
    if (["forged_in_chains", "war_child"].some((a) => has(u.t.abil, a))) continue;
    if (has(u.t.abil, "regrow")) continue;
    const d = warDamageFrom(p, u, wars);
    if (d <= 0 || u.hp - 2 * d > 0) continue;
    moveZone(p, u, "passive");
    if (logging()) log(`${p.name}: ${u.t.name} shelters from the war in the passive zone`);
  }
}

// ---------------------------------------------------------------------------
// The policy.
// ---------------------------------------------------------------------------

export const greedyPolicy: Policy = {
  mainPhase(p: Player, opp: Player, turn: number): void {
    // 1) Strategic, cross-turn commitments first (their value isn't visible to a
    //    one-ply score): world Wars, war shells, deliberate captures.
    tryWorldWars(p, opp);
    tryKaethlaanSupport(p, opp);
    tryTakenPrisoner(p);

    // 2) Greedily take the single best eval-improving play, repeat until nothing
    //    in hand makes the board better. Deploys bodies, picks equip bearers, chooses
    //    zones, fires Metamorphosis at the strongest destination — all by comparison.
    for (;;) {
      const cands: Candidate[] = [
        ...metamorphCandidates(p),
        ...hardCastCandidates(p, turn),
        ...equipCandidates(p),
        ...forgeCandidates(p),
        ...onPlayCandidates(p),
        ...supportPersistCandidates(p),
      ];
      if (cands.length === 0) break;
      const base = evalState(p, opp);
      let best: Candidate | null = null;
      let bestScore = base;
      for (const c of cands) {
        const s = scoreAfter(p, opp, (cp, co) => c.apply(cp, co, turn));
        if (s > bestScore + 1e-6) {
          bestScore = s;
          best = c;
        }
      }
      if (!best) break;
      best.apply(p, opp, turn);
      if (logging()) log(`${p.name}: ${best.label}`);
    }

    // 3) After everything is on the table, duck war-doomed bodies into shelter.
    shelterWarDoomed(p, opp);
  },

  transformAction(p: Player, opp: Player, turn: number): void {
    if (p.leader === null) return; // no transforms while leaderless (the cost of waiting)
    const base = evalState(p, opp);
    // Enumerate every affordable transform (Leader included, with its restrictions)
    // and take the one that yields the strongest resulting board — not the first edge.
    const cands = boardCharsAndLeader(p);
    let bestScore = base + 1e-6; // require a strict improvement to spend the action
    let bestUIdx = -1;
    let bestDest = "";
    let bestCost: TransformCost = {};
    for (let uIdx = 0; uIdx < cands.length; uIdx++) {
      const u = cands[uIdx];
      for (const [dest, cost] of u.t.upg) {
        if (u.leader) {
          const dt = getCard(dest)!.tier;
          if (dt < u.tier) continue; // no Leader downgrade
          if (dt === u.tier && u.tier > 2) continue; // sidegrade only at T1/T2
        }
        if (!canAfford(p, u, dest, cost)) continue;
        const score = scoreAfter(p, opp, (cp, co) =>
          applyTransform(cp, co, turn, boardCharsAndLeader(cp)[uIdx], dest, cost),
        );
        if (score > bestScore) {
          bestScore = score;
          bestUIdx = uIdx;
          bestDest = dest;
          bestCost = cost;
        }
      }
    }
    if (bestUIdx < 0) return; // nothing beats holding the action

    const u = boardCharsAndLeader(p)[bestUIdx];
    const nu = applyTransform(p, opp, turn, u, bestDest, bestCost);
    // Route the new form to the zone that scores better (shelter a non-attacker from a
    // war, push an attacker to the front).
    if (!nu.leader) routeZone(p, opp, nu);
  },

  elevate(p: Player, turn: number): void {
    const bc = boardChars(p);
    const eligIdx = bc.map((_, i) => i).filter((i) => bc[i].entered <= turn - 1);
    if (eligIdx.length === 0) {
      p.lockout = true;
      return;
    }
    // Elevation is optional now, but the AI's myopic score can't see the value of
    // *waiting* for a better body (a future draw), so it commits a Leader rather than
    // gamble on falling behind while leaderless. It does, however, prefer a body that
    // can CLIMB (has a transform path) over dead-end chaff — a T1 Kael/Arlia over a
    // vanilla Bogfang — so it stops crowning bodies that can never grow.
    const climbable = eligIdx.filter((i) => bc[i].t.upg.length > 0);
    const pool = climbable.length ? climbable : eligIdx;
    let bestIdx = pool[0];
    let bestScore = -Infinity;
    for (const i of pool) {
      const score = scoreAfter(p, p, (cp) => crownLeader(cp, boardChars(cp)[i]));
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const best = bc[bestIdx];
    crownLeader(p, best);
    if (logging()) log(`${p.name}: elevates ${best.t.name} to Leader (crowned at full HP)`);
  },
};

// ---------------------------------------------------------------------------
// Transform / elevation mechanics shared by real moves and trials.
// ---------------------------------------------------------------------------

function routeZone(p: Player, opp: Player, nu: Unit): void {
  const here = evalState(p, opp);
  const other = nu.zone === "active" ? "passive" : "active";
  const room = other === "active" ? activeSlotsUsed(p) < 3 : passiveSlotsUsed(p) < 3;
  if (!room) return;
  const idx = boardChars(p).indexOf(nu);
  if (idx < 0) return;
  const moved = scoreAfter(p, opp, (cp) => moveZone(cp, boardChars(cp)[idx], other));
  if (moved > here + 1e-6) {
    moveZone(p, nu, other);
    if (logging()) log(`${p.name}: ${nu.t.name} moves to the ${other} zone`);
  }
}

// re-exported for tests/UI that want to reference the unit shape
export type { Unit, Player };
export { chars, unitValue };
