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
  getItemTier,
  isCharacter,
  isHardCastable,
  playGate,
  playPermissionMin,
} from "../data/loadCards";
import { activeWars, applyTutor, discardWorth, fireEntry, isTutor, seekerReady, seekerReorder, tutorPayable, tutorTargets, warDamageFrom } from "../engine/effects";
import { TUTOR } from "../data/effects-map";
import type { Policy } from "../engine/game";
import { log, logging, suppressLog } from "../engine/log";
import {
  activeSlotsUsed,
  boardChars,
  canBecomeWarTorn,
  canEquip,
  chars,
  crownLeader,
  draw,
  effAtk,
  effDef,
  effMaxhp,
  eventSlot,
  isKaethlaan,
  hasWar,
  makeEquip,
  makeUnit,
  meetsTierGate,
  moveZone,
  passiveSlotsUsed,
  placePersistent,
  removePersistent,
} from "../engine/stats";
import { applyForge, applyTransform, canAfford, forgeOptions, fuse, metamorph } from "../engine/transform";
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
  for (let i = 0; i < (ONPLAY[card].draw || 0); i++) draw(p);
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
    const gate = playGate(card); // Plague bodies: require the O'Donner Research Lab (+ Plague for the doctors)
    if (gate) {
      if (gate.lab && !p.events.has("O'Donner Research Lab")) continue;
      if (gate.plague && (p.plagueField || 0) === 0) continue;
    }
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
    // The Leader is a valid bearer too (matches the forge lane and human action space).
    boardCharsAndLeader(p).forEach((bearer, i) => {
      if (!canEquip(card, bearer)) return; // tier-gate + signature bearer restriction
      out.push({
        label: `equips ${card} to ${bearer.t.name}`,
        // re-resolve the bearer by index inside the clone so the same code path works
        apply: (pp) => applyEquip(pp, card, boardCharsAndLeader(pp)[i]),
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
    if (!meetsTierGate(p, card)) continue; // need a character of >= the card's tier
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
    if (!meetsTierGate(p, card)) continue; // need a character of >= the event's tier
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
    if (!shouldPlayWorldWar(p, opp, war)) continue;
    if (!placePersistent(p, war)) continue; // gates the tier + slot requirement
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
    chars(p).some((u) => has(u.t.affils, "Royal Army")) &&
    placePersistent(p, "Hardened Veterans")
  ) {
    p.hand.splice(p.hand.indexOf("Hardened Veterans"), 1);
    if (logging()) log(`${p.name}: plays Hardened Veterans`);
  }
}

/** Dispel: destroy the opponent's most valuable persistent event — the removal the engine
 *  lacked (categorical; no card is named, per Mathematical Opposition). Priority: Plague (a
 *  both-sides field — strip it and the immune walls lose their whole edge), then the
 *  O'Donner Research Lab, then a War, then the wartime buff-shells. */
function tryRemoval(p: Player, opp: Player): void {
  if (!p.hand.includes("Dispel") || !meetsTierGate(p, "Dispel")) return;
  const priority = [
    "Plague",
    "O'Donner Research Lab",
    "Holy War",
    "War",
    "Goblin War",
    "Hardened Veterans",
    "Crusade",
    "Horde Frenzy",
    "Rally to War",
    "The Broken March",
  ];
  const target = priority.find((n) => opp.events.has(n));
  if (!target) return;
  p.hand.splice(p.hand.indexOf("Dispel"), 1);
  removePersistent(opp, target);
  if (target === "Plague") {
    // Plague is mirrored onto both players; destroying it lifts the field on BOTH sides.
    opp.plagueField = Math.max(0, (opp.plagueField || 0) - 1);
    p.plagueField = Math.max(0, (p.plagueField || 0) - 1);
  }
  for (const pl of [p, opp]) for (const u of chars(pl)) u.hp = Math.min(u.hp, effMaxhp(pl, u)); // cap-only re-clip
  if (logging()) log(`${p.name}: Dispel — destroys ${opp.name}'s ${target}`);
}

/** Plague engine: lay the world-state Plague (a BOTH-SIDES −10 Max HP field, mirrored onto
 *  both players like a war, with a cap-only clip) and the O'Donner Research Lab (+30 Max HP
 *  to your O'Donner Research bodies, which offsets Plague for your own subjects).
 *  PRE-SIM APPROXIMATION — the Plagued-spread, Venner's lock chain, Experiment 2615's
 *  conditional immunity/regen/scaling, and the Plague-duration transforms are NOT modeled. */
function tryPlagueEngine(p: Player, opp: Player): void {
  while (p.hand.includes("Plague") && (p.plagueField || 0) < 2 && eventSlot(p) !== null) {
    if (!placePersistent(p, "Plague")) break; // tier gate (T2) + slot
    p.hand.splice(p.hand.indexOf("Plague"), 1);
    p.plagueField = (p.plagueField || 0) + 1;
    opp.plagueField = (opp.plagueField || 0) + 1; // world-state: mirror onto the opponent
    for (const pl of [p, opp]) for (const u of chars(pl)) u.hp = Math.min(u.hp, effMaxhp(pl, u)); // cap-only clip
    if (logging()) log(`${p.name}: plays Plague`);
  }
  if (
    p.hand.includes("O'Donner Research Lab") &&
    !p.events.has("O'Donner Research Lab") &&
    placePersistent(p, "O'Donner Research Lab")
  ) {
    p.hand.splice(p.hand.indexOf("O'Donner Research Lab"), 1);
    if (logging()) log(`${p.name}: plays O'Donner Research Lab`);
  }
}

/** Kaethlaan support persistents — value not visible to a one-ply score, so they're
 *  handled here: shield the line under an active war, cheapen the Royal Army climb. */
function tryKaethlaanSupport(p: Player, opp: Player): void {
  if (
    p.hand.includes("Close the Gates") &&
    !p.events.has("Close the Gates") &&
    activeWars([p, opp]).size > 0 &&
    chars(p).some(isKaethlaan) &&
    placePersistent(p, "Close the Gates")
  ) {
    p.hand.splice(p.hand.indexOf("Close the Gates"), 1);
    if (logging()) log(`${p.name}: plays Close the Gates`);
  }
  if (
    p.hand.includes("War College") &&
    !p.events.has("War College") &&
    chars(p).some((u) => has(u.t.affils, "Royal Army") && u.t.upg.length > 0) &&
    placePersistent(p, "War College")
  ) {
    p.hand.splice(p.hand.indexOf("War College"), 1);
    if (logging()) log(`${p.name}: plays War College`);
  }
}

/** The Open Channel: a slot-cost persistent tutor that calls a next-form each turn (startOfTurn).
 *  Play-condition: control a Divine Channel character — which locks it to the DC deck, so the
 *  climb-consistency it grants doesn't leak to aggro. Play it early; its value is in the turns. */
function tryOpenChannel(p: Player): void {
  if (
    p.hand.includes("The Open Channel") &&
    !p.events.has("The Open Channel") &&
    chars(p).some((u) => u.t.affils.some((a) => a.includes("Divine Channel"))) && // printed play-condition
    placePersistent(p, "The Open Channel")
  ) {
    p.hand.splice(p.hand.indexOf("The Open Channel"), 1);
    if (logging()) log(`${p.name}: plays The Open Channel`);
  }
}

/** Seeping Doubt: a slot-cost persistent that coin-flips a chosen body toward Disillusioned each
 *  turn. Lay it EARLY (as soon as the tier gate allows) whenever the deck runs a wanderer payoff
 *  that needs disillusion, so the engine is already ticking when the climber arrives. */
function trySeepingDoubt(p: Player): void {
  const wantsDisillusion = ["The Wandering Acolyte Arlia", "The Acolyte Illyego"].some(
    (f) => p.deck.includes(f) || p.hand.includes(f) || boardChars(p).some((u) => u.t.name === f),
  );
  if (
    p.hand.includes("Seeping Doubt") &&
    !p.events.has("Seeping Doubt") &&
    wantsDisillusion &&
    placePersistent(p, "Seeping Doubt")
  ) {
    p.hand.splice(p.hand.indexOf("Seeping Doubt"), 1);
    if (logging()) log(`${p.name}: plays Seeping Doubt`);
  }
}

/** Worth of a card to fetch (characters only — bigger forms first). */
function fetchWorth(name: string): number {
  const c = getCard(name);
  if (!c || !c.simulatable) return 0;
  return c.tier * 20 + c.atk + c.hp + c.deff;
}

/** Tutors: search up the card that best advances the climb — prefer the next form for
 *  a body already on board (so we can transform it this very turn), else the strongest. */
function tryTutors(p: Player): void {
  for (const card of p.hand.slice()) {
    if (!isTutor(card) || !meetsTierGate(p, card) || !tutorPayable(p, card)) continue;
    const targets = tutorTargets(p, card);
    if (!targets.length) continue;
    const enabling = targets.filter(
      (t) => !p.hand.includes(t) && chars(p).some((u) => u.t.upg.some(([d]) => d === t)),
    );
    const pool = enabling.length ? enabling : targets;
    const pick = pool.reduce((a, b) => (fetchWorth(b) > fetchWorth(a) ? b : a));
    // Discard-cost tutors (Call of the Channel): never pay with a card worth more than the
    // fetch — otherwise the AI pitches its own combo pieces (Disillusioned, T3 relics) for a
    // marginal body. Skip the tutor unless the cheapest legal discard is genuinely spare.
    const spec = TUTOR[card] as { discard?: number } | undefined;
    if (spec && spec.discard && !enabling.length) {
      const fodder = p.hand.filter((c) => c !== card).map(discardWorth).sort((a, b) => a - b)[0] ?? Infinity;
      if (fodder >= fetchWorth(pick)) continue; // best pitch costs more than we'd gain — hold
    }
    applyTutor(p, card, pick);
  }
}

/** Seeker (The Wandering Acolyte Arlia): once per turn, reorder the top 3 of the deck so
 *  the most useful card is drawn next. A board-eval loop can't see future-draw value, so
 *  this is an explicit heuristic: a card that lets a body on the table transform next turn
 *  ranks highest, then the strongest body/form, then everything else. Deterministic. */
function trySeeker(p: Player): void {
  if (!seekerReady(p)) return;
  const enables = (c: string) => boardCharsAndLeader(p).some((u) => u.t.upg.some(([d]) => d === c));
  const key = (c: string) => (enables(c) ? 1e6 : 0) + fetchWorth(c);
  seekerReorder(p, (a, b) => (key(a) !== key(b) ? key(a) > key(b) : a < b));
}

/** Reagent Pouch: cycle a card. The board-eval loop can't see card value, so play it
 *  eagerly once we have a body (more cards = more climb pieces / answers). */
function tryDraw(p: Player): void {
  while (p.hand.includes("Reagent Pouch") && meetsTierGate(p, "Reagent Pouch")) {
    p.hand.splice(p.hand.indexOf("Reagent Pouch"), 1);
    draw(p);
    if (logging()) log(`${p.name}: Reagent Pouch — draws a card`);
  }
}

/** Fusion cards (go-wide body payoff), each affiliation-locked: card name -> the affiliation it
 *  may merge. Merge two of that affiliation into one bigger threat + draw — whenever we control
 *  2+ of them, cashing spare bodies into a DEF-punching threat (the draw refills the board). */
const FUSION_CARDS: Record<string, string> = {
  "Primal Fusion": "Wild",
  "Pile On": "Goblin",
};
function tryFusion(p: Player, opp: Player): void {
  for (const [card, affil] of Object.entries(FUSION_CARDS)) {
    while (p.hand.includes(card)) {
      const bodies = boardChars(p).filter((u) => has(u.t.affils, affil));
      if (bodies.length < 2) break;
      p.hand.splice(p.hand.indexOf(card), 1); // tentatively play the fusion card
      // COST: discard a card (the cheapest non-fusion card). If nothing to pitch, abort the fusion.
      const fodder = p.hand.filter((c) => !(c in FUSION_CARDS)).sort((a, b) => discardWorth(a) - discardWorth(b))[0];
      if (fodder === undefined) {
        p.hand.push(card);
        break;
      }
      p.hand.splice(p.hand.indexOf(fodder), 1);
      if (logging()) log(`${p.name}: ${card} — discards ${fodder}`);
      // Build ONE Apex: the most-fused (then strongest) body absorbs the runner-up, so repeated
      // fusions stack onto the same growing predator and climb its reach/leader-strike thresholds.
      bodies.sort((a, b) => (b.fusions ?? 0) - (a.fusions ?? 0) || effAtk(p, b) + b.hp - (effAtk(p, a) + a.hp));
      fuse(p, opp, bodies[0], bodies[1]); // the Apex absorbs the runner-up (+ element effect)
    }
  }
}

/** The Long Road: a heal-over-time; play it while we control a Wandering/Faithless body. */
function tryLongRoad(p: Player): void {
  if (!p.hand.includes("The Long Road")) return;
  if (!boardChars(p).some((u) => ["Wandering", "Faithless"].some((a) => has(u.t.affils, a)))) return;
  if (placePersistent(p, "The Long Road")) {
    p.hand.splice(p.hand.indexOf("The Long Road"), 1);
    if (logging()) log(`${p.name}: plays The Long Road`);
  }
}

/** A Crisis of Faith / Cast Out: confer the Disillusioned state on a body that wants the
 *  wanderer road (a disillusion-gated upgrade whose destination is in hand). (The plain
 *  Disillusioned card keeps its atomic hand-gate path in transform.ts.) */
function tryDisillusion(p: Player): void {
  const src = ["A Crisis of Faith", "Cast Out"].find((c) => p.hand.includes(c));
  if (!src) return;
  const target = boardChars(p).find(
    (u) => !u.disillusioned && u.t.upg.some(([d, c]) => c.disillusion && p.hand.includes(d)),
  );
  if (!target) return;
  p.hand.splice(p.hand.indexOf(src), 1);
  target.disillusioned = true;
  if (src === "A Crisis of Faith") draw(p); // its on-enter draw
  if (logging()) log(`${p.name}: ${src} — ${target.t.name} becomes Disillusioned`);
}

/** Opportunity: a bonus transform action while we control a Disillusioned body and have a
 *  transform to spend it on. */
function tryOpportunity(p: Player): void {
  if (!p.hand.includes("Opportunity")) return;
  if (!boardChars(p).some((u) => u.disillusioned)) return; // printed play condition
  if (!boardCharsAndLeader(p).some((u) => u.t.upg.some(([d, c]) => canAfford(p, u, d, c)))) return;
  p.hand.splice(p.hand.indexOf("Opportunity"), 1);
  p.extraTransforms = (p.extraTransforms || 0) + 1;
  if (logging()) log(`${p.name}: Opportunity — an extra transformation action`);
}

/** Single-target protection (Sanctuary = untargetable, Bulwark = +30 DEF until next turn).
 *  Shield the most valuable body the opponent could KO with its biggest swing next combat —
 *  so a key climber/terminal/Leader survives. Bulwark is preferred when +30 DEF alone saves
 *  the body (cheaper); Sanctuary is reserved for hits DEF can't stop. */
function tryProtect(p: Player, opp: Player, turn: number): void {
  const hasSanc = p.hand.includes("Sanctuary");
  const hasBul = p.hand.includes("Bulwark");
  if ((!hasSanc && !hasBul) || turn < 2 || opp.active.length === 0) return;
  const maxOpp = Math.max(...opp.active.map((o) => effAtk(opp, o)));
  // Bodies we can protect: our active line, plus the Leader if it's currently attackable.
  const mine = p.active.filter((u) => !u.shielded);
  if (p.leader && !p.leader.shielded && p.active.length === 0 && !has(p.leader.t.abil, "leader_protect_royal"))
    mine.push(p.leader);
  const bodyValue = (u: Unit) => u.tier * 20 + effAtk(p, u) + u.hp + (u.leader ? 1000 : 0);
  const killable = (u: Unit, extraDef: number) => maxOpp - (effDef(p, u) + extraDef) >= u.hp;

  // Highest-value body the opponent's biggest hit would KO next combat.
  const threatened = mine.filter((u) => killable(u, 0)).sort((a, b) => bodyValue(b) - bodyValue(a));
  if (!threatened.length) return;
  const target = threatened[0];

  if (hasBul && killable(target, 0) && !killable(target, 30)) {
    p.hand.splice(p.hand.indexOf("Bulwark"), 1);
    target.tempDef = (target.tempDef || 0) + 30;
    if (logging()) log(`${p.name}: Bulwark — ${target.t.name} gains +30 DEF until next turn`);
  } else if (hasSanc) {
    p.hand.splice(p.hand.indexOf("Sanctuary"), 1);
    target.shielded = true;
    if (logging()) log(`${p.name}: Sanctuary — ${target.t.name} cannot be attacked until next turn`);
  }
}

/** Truce: a defensive stall. Play it when the opponent's active board out-pressures
 *  ours so a slower (late-game) deck survives to its terminals. A deck that's ahead on
 *  board never wants it (it forfeits its own attack too) — which is exactly what splits
 *  rush from control. Skips this player's combat this turn AND the opponent's next. */
function tryTruce(p: Player, opp: Player, turn: number): void {
  if (!p.hand.includes("Truce") || turn < 2 || opp.active.length === 0) return;
  const oppAtk = opp.active.reduce((s, u) => s + effAtk(opp, u), 0);
  const myAtk = p.active.reduce((s, u) => s + effAtk(p, u), 0);
  const weakest = p.active.length ? Math.min(...p.active.map((u) => u.hp)) : Infinity;
  const leaderThreatened = p.leader ? oppAtk >= p.leader.hp : false;
  const wouldLoseABody = oppAtk >= weakest; // their swing can finish our frailest body
  // Only stall when we're behind the race AND a real loss is coming.
  if (oppAtk > myAtk && (leaderThreatened || wouldLoseABody)) {
    p.hand.splice(p.hand.indexOf("Truce"), 1);
    p.skipCombat = true;
    opp.skipCombat = true;
    if (logging()) log(`${p.name}: declares a Truce — no attacks until its next turn`);
  }
}

/** Taken Prisoner: deliberately capture our own attack-through-War-Torn bodies (or
 *  any body while The Broken March is out) to switch on their wartime payoff. */
function tryTakenPrisoner(p: Player): void {
  while (p.hand.includes("Taken Prisoner") && hasWar(p) && meetsTierGate(p, "Taken Prisoner")) {
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
    tryOpenChannel(p); // DC consistency engine (slot-cost persistent tutor)
    trySeepingDoubt(p); // repeatable coin-flip Disillusioned source (slot-cost persistent)
    tryRemoval(p, opp); // destroy the opponent's key persistent event (Plague / the Lab / a War)
    tryPlagueEngine(p, opp); // lay Plague (both-sides field) + the O'Donner Research Lab
    tryTutors(p); // assemble the climb before the transform phase
    trySeeker(p); // order the next draws toward the climb (sets up next turn)
    tryDraw(p); // cycle Reagent Pouch so fresh cards feed the eval loop below
    tryTakenPrisoner(p);
    tryLongRoad(p);

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

    // 3) After everything is on the table, duck war-doomed bodies into shelter, and
    //    call a Truce if we're being overrun (buy a turn toward our late-game payoff).
    shelterWarDoomed(p, opp);
    tryFusion(p, opp); // Wild: build an Apex (stats + element effect + reach/leader escalation)
    tryDisillusion(p); // set up a wanderer body before the transform phase
    tryOpportunity(p); // bank a bonus transform action if it'll be used
    tryProtect(p, opp, turn); // surgical: shield a key threatened body first
    tryTruce(p, opp, turn); // board-wide: stall when broadly overrun
  },

  transformAction(p: Player, opp: Player, turn: number): void {
    if (p.leader === null) return; // no transforms while leaderless (the cost of waiting)
    // One action by default, plus any granted by Opportunity this turn.
    let actions = 1 + (p.extraTransforms || 0);
    p.extraTransforms = 0;
    while (actions-- > 0) {
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
      if (bestUIdx < 0) return; // nothing beats holding the (remaining) action(s)

      const u = boardCharsAndLeader(p)[bestUIdx];
      const nu = applyTransform(p, opp, turn, u, bestDest, bestCost);
      // Route the new form to the zone that scores better (shelter a non-attacker from a
      // war, push an attacker to the front).
      if (!nu.leader) routeZone(p, opp, nu);
    }
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

// ---------------------------------------------------------------------------
// Divine Channel specialization — a dedicated brain for the apotheosis combo.
//
// The generic greedy AI is myopic by design: it scores the board one ply out, so it
// never builds The Ascended (whose printed stats are "??" → 0, and whose payoff is a
// combat-phase board-wipe the static eval can't see) and never shelters the fragile
// climbers. This policy delegates everything ordinary to greedy (clergy deploy, tutors,
// protection, combat) but takes over the TRANSFORM step to drive the 4-deep line:
//   Arlia → Mage Arlia → Wandering Acolyte (needs Disillusioned) → The Ascended (needs a
//   T3 item; consumes ALL items in hand ×20), then routes the finished god to the front to
//   fire The Channel. Climbers shelter in the passive zone (untargetable) so they survive.
// ---------------------------------------------------------------------------

const ACOLYTE = "The Wandering Acolyte Arlia";
const ASCENSION_RANK = new Map(
  ["Arlia, Destined Trainee", "Mage Arlia", ACOLYTE, "The Ascended"].map((n, i) => [n, i]),
);

/** The on-board body whose next affordable transform advances the apotheosis the FURTHEST
 *  (closest to The Ascended), pursued only while The Ascended is still reachable (in hand or
 *  deck) so we never climb a dead line. Null if nothing can step up. */
function bestAscensionStep(p: Player): { u: Unit; dest: string; cost: TransformCost } | null {
  if (!p.hand.includes("The Ascended") && !p.deck.includes("The Ascended")) return null;
  let best: { u: Unit; dest: string; cost: TransformCost; rank: number } | null = null;
  for (const u of boardCharsAndLeader(p)) {
    const here = ASCENSION_RANK.get(u.t.name);
    if (here === undefined) continue;
    for (const [dest, cost] of u.t.upg) {
      const rank = ASCENSION_RANK.get(dest);
      if (rank === undefined || rank <= here || !canAfford(p, u, dest, cost)) continue;
      if (!best || rank > best.rank) best = { u, dest, cost, rank };
    }
  }
  return best;
}

/** We hold everything needed to ascend within a turn or two: an Acolyte in play, plus The
 *  Ascended and a T3 item in hand (the entry gate). Only then is it worth protecting the climber. */
function ascensionImminent(p: Player): boolean {
  return (
    p.hand.includes("The Ascended") &&
    p.hand.some((c) => getItemTier(c) === 3) &&
    boardCharsAndLeader(p).some((u) => u.t.name === ACOLYTE)
  );
}

/** Pre-attach a Disillusioned card to a Mage Arlia as a STATE (rather than letting it be
 *  consumed only at transform). This unlocks two things greedy never reaches: it makes the body
 *  a "Disillusioned character" so Opportunity (extra transform) becomes playable, and it pre-pays
 *  the Acolyte gate so the Mage → Acolyte step is affordable the moment the Acolyte card is held. */
function prepDisillusion(p: Player): void {
  if (!p.hand.includes("Disillusioned")) return;
  const target = boardCharsAndLeader(p).find(
    (u) =>
      u.t.name === "Mage Arlia" &&
      !u.disillusioned &&
      u.t.upg.some(([d, c]) => c.disillusion && (p.hand.includes(d) || p.deck.includes(d))),
  );
  if (!target) return;
  p.hand.splice(p.hand.indexOf("Disillusioned"), 1);
  target.disillusioned = true;
  if (logging()) log(`${p.name}: Disillusioned — ${target.t.name} becomes Disillusioned`);
}

/** Tuck the Acolyte into the passive zone (untargetable) the turn before it ascends. */
function shelterAcolyte(p: Player): void {
  for (const u of boardChars(p)) {
    if (u.t.name === ACOLYTE && u.zone === "active" && passiveSlotsUsed(p) < 3) {
      moveZone(p, u, "passive");
      if (logging()) log(`${p.name}: ${u.t.name} shelters in the passive zone to ascend`);
    }
  }
}

export const divineChannelPolicy: Policy = {
  mainPhase(p: Player, opp: Player, turn: number): void {
    prepDisillusion(p); // BEFORE greedy: makes a Disillusioned character so its Opportunity fires
    greedyPolicy.mainPhase(p, opp, turn);
    if (ascensionImminent(p)) shelterAcolyte(p);
  },

  transformAction(p: Player, opp: Player, turn: number): void {
    if (p.leader === null) return; // no transforms while leaderless (greedy's rule)
    // Spend the BASE action driving the apotheosis one step (greedy crawls it — clergy climbs
    // compete, and it flat refuses the final Acolyte → Ascended step whose payoff it can't see).
    // Hand any EXTRA (Opportunity) actions to greedy so the Church develops in parallel.
    const extras = p.extraTransforms || 0;
    p.extraTransforms = 0;
    const step = bestAscensionStep(p);
    if (step) {
      const nu = applyTransform(p, opp, turn, step.u, step.dest, step.cost);
      if (!nu.leader) {
        if (has(nu.t.abil, "ascended_variable")) routeZone(p, opp, nu); // ascended → front it
        else if (nu.t.name === ACOLYTE && ascensionImminent(p) && nu.zone === "active" && passiveSlotsUsed(p) < 3)
          moveZone(p, nu, "passive");
      }
      if (extras > 0) {
        p.extraTransforms = extras - 1; // greedy does 1 + extraTransforms
        greedyPolicy.transformAction(p, opp, turn);
      }
      return;
    }
    p.extraTransforms = extras;
    greedyPolicy.transformAction(p, opp, turn);
  },

  elevate(p: Player, turn: number): void {
    greedyPolicy.elevate(p, turn); // crown the best Church body; the Arlia line climbs alongside
  },
};

// ---------------------------------------------------------------------------
// Per-deck policy registry. Most decks are piloted fine by the generic greedy
// brain; a deck with a hard-to-play engine (e.g. a deep combo) can register its
// own specialized Policy here, and batch/watch will route that deck's side to it.
// ---------------------------------------------------------------------------

export const POLICIES: Record<string, Policy> = {
  DivineChannel: divineChannelPolicy,
};

/** The brain for a deck by name — its specialization if registered, else greedy. */
export function policyFor(deck: string | undefined): Policy {
  return (deck && POLICIES[deck]) || greedyPolicy;
}

// re-exported for tests/UI that want to reference the unit shape
export type { Unit, Player };
export { chars, unitValue };
