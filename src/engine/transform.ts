// Transformation + Metamorphosis mechanics (the swap itself). WHICH transform to
// take is a policy decision (sim/ai.ts); this module only applies a chosen one.
// Pure — no React/DOM.

import { EQUIP, getCard, getItemTier, itemAnyTier, itemBearerInclude, itemUpgrades, T2ITEMS } from "../data/loadCards";
import { fireEntry } from "./effects";
import { log, logging } from "./log";
import { effMaxhp, isEquipObj, LB, linkedEquips, makeUnit } from "./stats";
import type { Equip, ItemCost, Player, TransformCost, Unit } from "./types";

const has = (arr: string[], x: string) => arr.includes(x);

/** War College reduces the item cost of a Royal Army transform by one. */
function itemsNeeded(p: Player, u: Unit, cost: TransformCost): number {
  let n = cost.items || 0;
  if (n > 0 && p.events.has("War College") && u.t.affils.includes("Royal Army")) n -= 1;
  return Math.max(0, n);
}

/** True if `u` can transform into `dest` paying `cost` from `p`'s hand right now. */
export function canAfford(p: Player, u: Unit, dest: string, cost: TransformCost): boolean {
  if (!p.hand.includes(dest)) return false;
  const items = p.hand.filter((c) => T2ITEMS.has(c));
  // Royal Warrant is a wild stand-in for any required NAMED item (Kael/Arlia gates).
  if (cost.named && !p.hand.includes(cost.named) && !p.hand.includes("Royal Warrant")) return false;
  if (itemsNeeded(p, u, cost) > items.length) return false;
  if ((cost.kills || 0) > u.kills) return false;
  if (cost.need_war && !hasWarLocal(p)) return false;
  if (cost.disillusion && !p.hand.includes("Disillusioned")) return false;
  if (cost.taken_prisoner && !hasWarLocal(p)) return false;
  if (cost.requires_arlia && !p.active.concat(p.passive, p.leader ? [p.leader] : []).some((x) => x.t.name.includes("Arlia")))
    return false;
  return true;
}

function hasWarLocal(p: Player): boolean {
  return p.events.has("War") || p.events.has("Holy War") || p.events.has("Goblin War");
}

/** Apply a (validated) transformation: consume costs, swap the form, fire entry. */
export function applyTransform(p: Player, opp: Player, turn: number, u: Unit, dest: string, cost: TransformCost): Unit {
  if (cost.named) {
    // pay with the printed item if held, otherwise spend a Royal Warrant for it.
    const named = p.hand.includes(cost.named) ? cost.named : "Royal Warrant";
    const ni = p.hand.indexOf(named);
    if (ni >= 0) p.hand.splice(ni, 1);
  }
  for (let i = 0, need = itemsNeeded(p, u, cost); i < need; i++) {
    const idx = p.hand.findIndex((c) => T2ITEMS.has(c));
    if (idx >= 0) p.hand.splice(idx, 1);
  }
  if (cost.disillusion) p.hand.splice(p.hand.indexOf("Disillusioned"), 1);
  p.hand.splice(p.hand.indexOf(dest), 1);

  // Carry over the WOUNDS, not the absolute HP: the gain in Max HP also applies to
  // current HP, so a full-health body stays full after transforming (a damaged one
  // keeps the same deficit).
  const deficit = Math.max(0, effMaxhp(p, u) - u.hp);
  const nu = makeUnit(getCard(dest)!, turn);
  nu.kills = u.kills;
  nu.leader = u.leader;
  nu.zone = u.zone;
  nu.entered = u.entered;
  if (has(nu.t.affils, "War-Torn")) nu.wartorn = true;
  for (const lst of [p.active, p.passive]) {
    const i = lst.indexOf(u);
    if (i >= 0) lst[i] = nu;
  }
  for (const e of p.pcards) if (isEquipObj(e) && e.link === u) e.link = nu;
  if (u.leader) p.leader = nu;
  nu.hp = effMaxhp(p, nu) - deficit; // new full max, minus the wounds carried in
  if (logging())
    log(`${p.name}: transforms ${u.t.name} → ${dest}${u.leader ? ` (Leader — tier bonus now +${LB[nu.tier]})` : ""}`);
  fireEntry(p, opp, nu);
  return nu;
}

// ----- item forging (item transformation) -----
// A separate action lane from character transformation: UNLIMITED per turn, but every
// forge ALWAYS pays a cost, and the resulting item must fit the bearer's tier (you can
// only forge a weapon up to a grade its wielder can hold). The attached item upgrades
// in place — same bearer, same slot, stronger gear.

export interface ForgeOption {
  origin: Equip; // the attached item being upgraded
  dest: string; // the item it becomes
  cost: ItemCost;
}

function canAffordItem(p: Player, cost: ItemCost): boolean {
  const items = p.hand.filter((c) => T2ITEMS.has(c));
  if (cost.named && !p.hand.includes(cost.named)) return false;
  if ((cost.items || 0) > items.length) return false;
  return true;
}

/** Every legal forge available on `bearer` right now (tier-gated to the bearer). */
export function forgeOptions(p: Player, bearer: Unit): ForgeOption[] {
  const out: ForgeOption[] = [];
  for (const e of linkedEquips(p, bearer)) {
    for (const [dest, cost] of itemUpgrades(e.name)) {
      if (getItemTier(dest) > bearer.tier && !itemAnyTier(dest)) continue; // result must fit the wielder
      const inc = itemBearerInclude(dest);
      if (inc && !bearer.t.name.includes(inc)) continue;
      if (!canAffordItem(p, cost)) continue;
      out.push({ origin: e, dest, cost });
    }
  }
  return out;
}

/** Apply a (validated) forge: pay the cost, upgrade the attached item in place. */
export function applyForge(p: Player, bearer: Unit, origin: Equip, dest: string, cost: ItemCost): void {
  if (cost.named) p.hand.splice(p.hand.indexOf(cost.named), 1);
  for (let i = 0; i < (cost.items || 0); i++) {
    const idx = p.hand.findIndex((c) => T2ITEMS.has(c));
    if (idx >= 0) p.hand.splice(idx, 1);
  }
  const from = origin.name;
  origin.name = dest;
  origin.eff = EQUIP[dest];
  bearer.hp = Math.min(effMaxhp(p, bearer), bearer.hp); // a Max-HP change can clip current
  if (logging()) log(`${p.name}: forges ${from} → ${dest} on ${bearer.t.name}`);
}

/** Metamorphosis (§5.5): morph a T1 Wild into any T2 Wild in hand. Does NOT use
 *  the transformation action. Keeps banked kills; element becomes the new form's. */
export function metamorph(p: Player, opp: Player, turn: number, src: Unit, dest: string): Unit {
  const deficit = Math.max(0, effMaxhp(p, src) - src.hp); // wounds carry over the morph
  const nu = makeUnit(getCard(dest)!, turn);
  nu.kills = src.kills;
  nu.leader = src.leader;
  nu.zone = src.zone;
  nu.entered = src.entered;
  for (const lst of [p.active, p.passive]) {
    const i = lst.indexOf(src);
    if (i >= 0) lst[i] = nu;
  }
  for (const e of p.pcards) if (isEquipObj(e) && e.link === src) e.link = nu;
  if (src.leader) p.leader = nu;
  nu.hp = effMaxhp(p, nu) - deficit;
  p.hand.splice(p.hand.indexOf(dest), 1);
  const mi = p.hand.indexOf("Metamorphosis");
  if (mi >= 0) p.hand.splice(mi, 1);
  if (logging()) log(`${p.name}: Metamorphosis — ${src.t.name} becomes ${dest} (T2 Wild)`);
  fireEntry(p, opp, nu);
  return nu;
}
