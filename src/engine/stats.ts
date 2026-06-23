// Stat math (effAtk/effDef/effMaxhp), auras, the Leader tier bonus, and the
// low-level entity helpers. Pure — no React/DOM.

import { comps } from "./elements";
import type { Card, Equip, Player, Unit } from "./types";
import { EQUIP, getItemTier, itemAnyTier, itemBearerInclude } from "../data/loadCards";
import { ITEM_BEARER_AFFIL, KAETHLAAN_AFFILS } from "../data/effects-map";

/** True if a unit belongs to the Kaethlaan sphere (Royal Army / Mages Guild / Divine
 *  Channel / King's Court / Kaethlaan…). Used by Banner, Close the Gates, Reinforce. */
export function isKaethlaan(u: Unit): boolean {
  return u.t.affils.some((a) => KAETHLAAN_AFFILS.has(a));
}

/** Leader tier bonus (Ruleset: Leader System) — applied to ALL stats by current tier. */
export const LB: Record<number, number> = { 1: 10, 2: 30, 3: 50, 4: 70 };

export function isEquipObj(e: Equip | string): e is Equip {
  return typeof e === "object" && e !== null && "eff" in e;
}

export function chars(p: Player): Unit[] {
  return p.active.concat(p.passive, p.leader ? [p.leader] : []);
}

export function boardChars(p: Player): Unit[] {
  return p.active.concat(p.passive);
}

export function activeSlotsUsed(p: Player): number {
  return p.active.length + p.pcards.filter((e) => isEquipObj(e) && e.zone === "active").length;
}

export function passiveSlotsUsed(p: Player): number {
  return p.passive.length + p.pcards.filter((e) => !(isEquipObj(e) && e.zone === "active")).length;
}

export function hasWar(p: Player): boolean {
  return p.events.has("War") || p.events.has("Holy War") || p.events.has("Goblin War");
}

export function linkedEquips(p: Player, u: Unit): Equip[] {
  return p.pcards.filter((e): e is Equip => isEquipObj(e) && e.zone === "passive" && e.link === u);
}

const has = (arr: string[], x: string) => arr.includes(x);

export function effAtk(p: Player, u: Unit): number {
  let a = u.t.atk;
  if (u.leader) a += LB[u.tier];
  const aura = !has(u.t.abil, "no_aura");
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_honathan")) && has(u.t.affils, "Royal Army")) a += 10;
  if (has(u.t.abil, "honathan_buff") && chars(p).some((x) => has(x.t.abil, "aura_honathan"))) a += 10;
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_mages")) && has(u.t.affils, "Mages Guild")) a += 10;
  if (aura && chars(p).some((x) => has(x.t.abil, "aura_goblin") && x !== u) && has(u.t.affils, "Goblin")) a += 10;
  if (has(u.t.abil, "blood_money")) a += 10 * u.kills;
  if (has(u.t.abil, "war_atk") && hasWar(p)) a += 10;
  if (has(u.t.abil, "forged_in_chains") && u.wartorn) a += 20;
  if (p.events.has("Rally to War") && u.zone === "active" && hasWar(p)) a += 10;
  if (p.events.has("Crusade") && p.events.has("Holy War") && comps(u.t.elem).includes("Light")) a += 10;
  if (p.events.has("Horde Frenzy") && p.events.has("Goblin War") && has(u.t.affils, "Goblin")) a += 10;
  // Kaethlaan Banner: a borne standard rallies the whole Kaethlaan army (+10 ATK).
  if (aura && isKaethlaan(u) && p.pcards.some((e) => isEquipObj(e) && e.name === "Kaethlaan Banner")) a += 10;
  for (const e of linkedEquips(p, u)) {
    a += e.eff.atk || 0;
    if (e.eff.water_atk && comps(u.t.elem).includes("Water")) a += e.eff.water_atk;
    if (e.eff.war_atk && hasWar(p)) a += e.eff.war_atk;
  }
  return Math.max(0, a);
}

export function effDef(p: Player, u: Unit): number {
  let d = u.t.deff;
  if (u.leader) d += LB[u.tier];
  if (chars(p).some((x) => has(x.t.abil, "aura_honathan")) && has(u.t.affils, "Royal Army") && !has(u.t.abil, "no_aura")) d += 10;
  if (has(u.t.abil, "honathan_buff") && chars(p).some((x) => has(x.t.abil, "aura_honathan"))) d += 10;
  if (has(u.t.abil, "forged_in_chains") && u.wartorn) d += 20;
  if (p.events.has("Crusade") && p.events.has("Holy War") && comps(u.t.elem).includes("Light")) d += 10;
  for (const e of linkedEquips(p, u)) d += e.eff.deff || 0;
  return Math.max(0, d);
}

export function effMaxhp(p: Player, u: Unit): number {
  let h = u.t.hp + (u.leader ? LB[u.tier] : 0);
  for (const e of linkedEquips(p, u)) h += e.eff.maxhp || 0;
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
  if (itemAnyTier(item) || has(bearer.t.abil, "bears_any_tier")) return true;
  return getItemTier(item) <= bearer.tier;
}

// ----- entity constructors / mutations -----

export function makeUnit(t: Card, turn: number): Unit {
  return { t, tier: t.tier, maxhp: t.hp, hp: t.hp, kills: 0, wartorn: false, leader: false, zone: "active", entered: turn };
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

/** Draw one card; deck-out sets the loss flag (resolved by the turn loop). */
export function draw(p: Player): void {
  if (p.deck.length === 0) {
    p.lose = true;
    return;
  }
  p.hand.push(p.deck.pop()!);
}
