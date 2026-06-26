// Stat math (effAtk/effDef/effMaxhp), auras, the Leader tier bonus, and the
// low-level entity helpers. Pure — no React/DOM.

import { comps } from "./elements";
import type { Card, Equip, Player, Unit } from "./types";
import { EQUIP, getEventTier, getItemTier, itemAnyTier, itemBearerInclude } from "../data/loadCards";
import { ITEM_BEARER_AFFIL, ITEM_BEARER_ELEM, KAETHLAAN_AFFILS } from "../data/effects-map";

/** True if a unit belongs to the Kaethlaan sphere (Royal Army / Mages Guild / Divine
 *  Channel / King's Court / Kaethlaan…). Used by Banner, Close the Gates, Reinforce. */
export function isKaethlaan(u: Unit): boolean {
  return u.t.affils.some((a) => KAETHLAAN_AFFILS.has(a));
}

/** Leader tier bonus (Ruleset: Leader System) — applied to ALL stats by current tier. */
export const LB: Record<number, number> = { 1: 10, 2: 30, 3: 50, 4: 70 };
/** Divine-Channel durability (EXPERIMENT — make T3 viable for the deck that needs it, without a
 *  global clock change). A global Leader-HP bump made T3 land but was inherently anti-aggro
 *  (slowing the clock helps climb, hurts Wild/Goblin). Scoping the durability to Divine Channel
 *  CARDS only buffs the weak/fragile deck (DC ~44%) so it survives to reach its T3/T4 — and
 *  touches no other deck (no DC affiliation elsewhere), so parity for the rest is untouched.
 *  Applied to the base stats (entry HP in makeUnit + the ceiling in effMaxhp). */
export const DC_DUR_HP = 25;
const isDivineChannel = (t: Card): boolean => t.affils.some((a) => a.includes("Divine Channel"));

export function isEquipObj(e: Equip | string): e is Equip {
  return typeof e === "object" && e !== null && "eff" in e;
}

export function chars(p: Player): Unit[] {
  return p.active.concat(p.passive, p.leader ? [p.leader] : []);
}

export function boardChars(p: Player): Unit[] {
  return p.active.concat(p.passive);
}

/** Highest tier among the characters you control (active + passive + leader), 0 if none.
 *  This is the basis for the tier gate on non-character cards: a tier-N card needs a
 *  character of tier ≥ N in play. */
export function highestCharTier(p: Player): number {
  let t = 0;
  for (const u of chars(p)) if (u.tier > t) t = u.tier;
  return t;
}

/** Can a non-character card (event / on-play) be played, given the tier gate? */
export function meetsTierGate(p: Player, name: string): boolean {
  return getEventTier(name) <= highestCharTier(p);
}

/** Which zone-slot a persistent event occupies (defaults to passive). */
function evZone(p: Player, name: string): "active" | "passive" {
  return p.eventZones[name] ?? "passive";
}

export function activeSlotsUsed(p: Player): number {
  return (
    p.active.length +
    p.pcards.filter((e) => (isEquipObj(e) ? e.zone === "active" : evZone(p, e) === "active")).length
  );
}

export function passiveSlotsUsed(p: Player): number {
  return (
    p.passive.length +
    p.pcards.filter((e) => (isEquipObj(e) ? e.zone === "passive" : evZone(p, e) === "passive")).length
  );
}

/** A persistent event takes a board slot in EITHER zone — prefer passive (keep the
 *  active line free for attackers), spill to active when passive is full. Null = no room. */
export function eventSlot(p: Player): "active" | "passive" | null {
  if (passiveSlotsUsed(p) < 3) return "passive";
  if (activeSlotsUsed(p) < 3) return "active";
  return null;
}

/** Play a persistent event into a free slot (passive-preferred). Returns false if the
 *  board is full in both zones. Records its name (events Set + pcards) and its zone. */
export function placePersistent(p: Player, name: string): boolean {
  if (!meetsTierGate(p, name)) return false; // need a controlled character of >= this event's tier
  const z = eventSlot(p);
  if (!z) return false;
  p.eventZones[name] = z;
  p.events.add(name);
  p.pcards.push(name);
  return true;
}

/** Destroy a persistent event on a player's board (Dispel / removal). Ends its effect by
 *  deleting it from events/pcards/zones — the answer the engine previously lacked. A
 *  mirrored both-sides field (Plague) also lives on the OTHER player; the caller adjusts
 *  that count and re-clips current HP. */
export function removePersistent(p: Player, name: string): void {
  p.events.delete(name);
  p.pcards = p.pcards.filter((e) => isEquipObj(e) || e !== name);
  delete p.eventZones[name];
  delete p.war_turns[name];
}

export function hasWar(p: Player): boolean {
  return p.events.has("War") || p.events.has("Holy War") || p.events.has("Goblin War");
}

export function linkedEquips(p: Player, u: Unit): Equip[] {
  return p.pcards.filter((e): e is Equip => isEquipObj(e) && e.zone === "passive" && e.link === u);
}

const has = (arr: string[], x: string) => arr.includes(x);

/** Protection of The Divine: the bearer "cannot be affected by item or event effects,
 *  whether friendly or hostile." We read that as: NO equipment-stat contribution, NO
 *  persistent-event aura (Rally/Crusade/Horde/Kaethlaan Banner), NO war attrition, and
 *  NO item/event heal or shield reach the bearer. What still applies is everything that
 *  is NOT an item or event: the Leader tier bonus (a rule), this character's OWN printed
 *  ability, and auras sourced from other *characters* (Honathan, Mage Arlia, Goblin
 *  Captain — those are character abilities, not items/events).
 *  TODO(v0.8): confirm the exact scope of "item or event effects" against Box (this card
 *  is RECONSTRUCTED — see its CSV Notes). */
export function immuneItemEvent(p: Player, u: Unit): boolean {
  return linkedEquips(p, u).some((e) => e.name === "Protection of The Divine");
}

export function effAtk(p: Player, u: Unit): number {
  let a = u.t.atk + u.mods.atk;
  if (u.leader) a += LB[u.tier];
  const aura = !has(u.t.abil, "no_aura") && !u.disillusioned; // Disillusioned bodies forsake your auras
  // Honathan's board-wide +10 ATK to Royal Army was Loyalist's runaway early-mid engine.
  // Narrowed to King's Court only (his inner circle); the broad Royal Army buff is gone.
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_honathan")) && has(u.t.affils, "King's Court (Kaethlaan)")) a += 10;
  if (has(u.t.abil, "honathan_buff") && chars(p).some((x) => has(x.t.abil, "aura_honathan"))) a += 10;
  if (has(u.t.abil, "my_liege") && chars(p).some((x) => has(x.t.abil, "aura_honathan"))) a += 30; // Captain Arlia's My Liege

  if (aura && chars(p).some((x) => has(x.t.abil, "aura_mages")) && has(u.t.affils, "Mages Guild")) a += 10;
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_goblin") && x !== u) && has(u.t.affils, "Goblin")) a += 10;
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_channel") && x !== u) && has(u.t.affils, "Divine Channel")) a += 10;
  // St. Faechious unites the Channel: +20 ATK to ALL your Divine Channel (Church + natural).
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_faechious")) && has(u.t.affils, "Divine Channel")) a += 20;
  // Hierophant Ysmene's Hollow Sermon: +10 ATK to your Channelian Church, −10 ATK to your
  // natural (non-Church) Divine Channel — UNLESS St. Faechious is present (he overrides it).
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_church_atk")) && has(u.t.affils, "Channelian Church")) a += 10;
  if (
    aura &&
    chars(p).some((x) => has(x.t.abil, "aura_suppress_natural")) &&
    has(u.t.affils, "Divine Channel") &&
    !has(u.t.affils, "Channelian Church") &&
    !chars(p).some((x) => has(x.t.abil, "aura_faechious"))
  )
    a -= 10;
  // Chris O'Donner: +20 ATK to your O'Donner Research.
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_odonner")) && has(u.t.affils, "O'Donner Research")) a += 20;
  if (has(u.t.abil, "blood_money")) a += 10 * u.kills;
  if (has(u.t.abil, "war_atk") && hasWar(p)) a += 10;
  if (has(u.t.abil, "forged_in_chains") && u.wartorn) a += 20;
  // At Her Side: Second in Command Kael has +10 ATK while you control Arlia (his own ability).
  if (has(u.t.abil, "redirect_atherside") && chars(p).some((x) => x.t.name.includes("Arlia"))) a += 10;
  // Item/event effects (persistent-event auras + equipment) — blocked for a Protection of
  // The Divine bearer. Character auras above are not items/events and still apply.
  if (!immuneItemEvent(p, u)) {
    if (p.events.has("Rally to War") && u.zone === "active" && hasWar(p)) a += 10;
    if (p.events.has("Crusade") && p.events.has("Holy War") && comps(u.t.elem).includes("Light")) a += 10;
    if (p.events.has("Horde Frenzy") && p.events.has("Goblin War") && has(u.t.affils, "Goblin")) a += 10;
    // Kaethlaan Banner: a borne standard rallies the whole Kaethlaan army (+10 ATK).
    if (aura && isKaethlaan(u) && p.pcards.some((e) => isEquipObj(e) && e.name === "Kaethlaan Banner")) a += 10;
    for (const e of linkedEquips(p, u)) {
      a += e.eff.atk || 0;
      if (e.eff.water_atk && comps(u.t.elem).includes("Water")) a += e.eff.water_atk;
      if (e.eff.fire_atk && comps(u.t.elem).includes("Fire")) a += e.eff.fire_atk;
      if (e.eff.war_atk && hasWar(p)) a += e.eff.war_atk;
      if (e.eff.goblinwar_atk && p.events.has("Goblin War")) a += e.eff.goblinwar_atk;
    }
  }
  return Math.max(0, a);
}

export function effDef(p: Player, u: Unit): number {
  const imm = immuneItemEvent(p, u);
  let d = u.t.deff + u.mods.deff;
  if (u.leader) d += LB[u.tier];
  // Honathan's aura is +10 ATK only (balance-log: its +10 DEF half made Loyalist a runaway
  // wall). The ATK half lives in effAtk; no DEF contribution here.
  if (has(u.t.abil, "forged_in_chains") && u.wartorn) d += 20;
  if (has(u.t.abil, "my_liege") && chars(p).some((x) => has(x.t.abil, "aura_honathan"))) d += 30; // Captain Arlia's My Liege
  if (has(u.t.abil, "redirect_atherside") && chars(p).some((x) => x.t.name.includes("Arlia"))) d += 10; // At Her Side
  // Plague-archetype DEF (character abilities, not items/events — so they apply even to a
  // Protection-of-the-Divine bearer). The Seremins are printed Plagued, so "+DEF while Plagued"
  // is always-on; Poultrain auras your Plagued board; Maredd armors the Channelian Church.
  if (has(u.t.abil, "plagued_def_40")) d += 40; // Seremin the Plaguebearer
  if (has(u.t.abil, "plagued_def_60")) d += 60; // Patient Zero Seremin
  if (chars(p).some((x) => has(x.t.abil, "aura_plagued_def")) && has(u.t.affils, "Plagued")) d += 30; // Dr. Mark Poultrain
  if (chars(p).some((x) => has(x.t.abil, "aura_church_def")) && has(u.t.affils, "Channelian Church")) d += 20; // Hierophant Maredd
  // Item/event DEF: Bulwark's tempDef and Crusade's aura are EVENT effects; equip DEF is an
  // ITEM effect. All are blocked for a Protection of The Divine bearer.
  if (!imm) {
    d += u.tempDef || 0; // Bulwark
    if (p.events.has("Crusade") && p.events.has("Holy War") && comps(u.t.elem).includes("Light")) d += 10;
    for (const e of linkedEquips(p, u)) d += e.eff.deff || 0;
  }
  return Math.max(0, d);
}

export function effMaxhp(p: Player, u: Unit): number {
  let h = u.t.hp + u.mods.hp + (u.leader ? LB[u.tier] : 0) + (isDivineChannel(u.t) ? DC_DUR_HP : 0);
  if (!immuneItemEvent(p, u)) for (const e of linkedEquips(p, u)) h += e.eff.maxhp || 0;
  // World-state / kingdom Max-HP fields. Plague is a BOTH-SIDES −10 carried as a mirrored
  // count (ai.tryPlagueEngine sets it on both players at cast, like a war); plague_immune
  // characters (the Seremins, the Experiments' mutated forms, Chris) ignore it.
  if ((p.plagueField || 0) > 0 && !has(u.t.abil, "plague_immune")) h -= 10 * (p.plagueField || 0);
  if (p.events.has("Medical Advancement")) h += 10; // Kaethlaan field, your side (Plague's math-opposite)
  if (p.events.has("O'Donner Research Lab") && has(u.t.affils, "O'Donner Research")) h += 30; // sustains your subjects
  return h;
}

export function canAttack(p: Player, u: Unit): boolean {
  if (linkedEquips(p, u).some((e) => e.eff.cannot_attack)) return false;
  if (!u.wartorn) return true;
  if (["war_child", "immune_wartorn", "forged_in_chains"].some((a) => has(u.t.abil, a))) return true;
  if (linkedEquips(p, u).some((e) => e.eff.immune_wartorn)) return true;
  if (p.events.has("The Broken March")) return true;
  return false;
}

export function canBecomeWarTorn(p: Player, u: Unit): boolean {
  return !has(u.t.abil, "cannot_become_wartorn") && !linkedEquips(p, u).some((e) => e.eff.immune_wartorn);
}

/** Equip legality: an item may only be attached to a character whose tier is ≥ the
 *  item's tier (the locked tier-gate rule), and signature items must match their
 *  bearer. `bears_any_tier` (char) or an any-tier item bypasses the tier check. */
export function canEquip(item: string, bearer: Unit): boolean {
  const inc = itemBearerInclude(item);
  if (inc && !bearer.t.name.includes(inc)) return false;
  const reqAffil = ITEM_BEARER_AFFIL[item];
  if (reqAffil) {
    const ok = reqAffil === "Kaethlaan" ? isKaethlaan(bearer) : has(bearer.t.affils, reqAffil);
    if (!ok) return false;
  }
  const reqElem = ITEM_BEARER_ELEM[item];
  if (reqElem && !comps(bearer.t.elem).includes(reqElem)) return false;
  if (itemAnyTier(item) || has(bearer.t.abil, "bears_any_tier")) return true;
  return getItemTier(item) <= bearer.tier;
}

// ----- entity constructors / mutations -----

export function makeUnit(t: Card, turn: number): Unit {
  const dur = isDivineChannel(t) ? DC_DUR_HP : 0; // DC durability is a base-stat buff (enters filled)
  return {
    t,
    tier: t.tier,
    maxhp: t.hp + dur,
    hp: t.hp + dur,
    kills: 0,
    wartorn: false,
    leader: false,
    zone: "active",
    entered: turn,
    mods: { atk: 0, deff: 0, hp: 0 },
    movedThisTurn: false,
  };
}

export function makeEquip(name: string): Equip {
  return { name, eff: EQUIP[name], zone: "active", charged: false, link: null };
}

export function moveZone(p: Player, u: Unit, z: "active" | "passive"): void {
  const from = u.zone === "active" ? p.active : p.passive;
  const i = from.indexOf(u);
  if (i >= 0) from.splice(i, 1);
  u.zone = z;
  (z === "active" ? p.active : p.passive).push(u);
}

/** Crown `u` as Leader: pull it from its zone into the Leader slot and — the
 *  coronation rule — restore it to FULL HP (its new max, which already includes the
 *  Leader tier bonus). A chosen Leader is empowered, not whatever HP it limped in on. */
export function crownLeader(p: Player, u: Unit): void {
  for (const lst of [p.active, p.passive]) {
    const i = lst.indexOf(u);
    if (i >= 0) lst.splice(i, 1);
  }
  u.leader = true;
  u.zone = "leader";
  p.leader = u;
  p.lockout = false;
  u.hp = effMaxhp(p, u);
}

/** Draw one card; deck-out sets the loss flag (resolved by the turn loop). */
export function draw(p: Player): void {
  if (p.deck.length === 0) {
    p.lose = true;
    return;
  }
  p.hand.push(p.deck.pop()!);
}
