// Transformation + Metamorphosis mechanics (the swap itself). WHICH transform to
// take is a policy decision (sim/ai.ts); this module only applies a chosen one.
// Pure — no React/DOM.

import { getCard, T2ITEMS } from "../data/loadCards";
import { fireEntry } from "./effects";
import { log, logging } from "./log";
import { isEquipObj, LB, makeUnit } from "./stats";
import type { Player, TransformCost, Unit } from "./types";

const has = (arr: string[], x: string) => arr.includes(x);

/** True if `u` can transform into `dest` paying `cost` from `p`'s hand right now. */
export function canAfford(p: Player, u: Unit, dest: string, cost: TransformCost): boolean {
  if (!p.hand.includes(dest)) return false;
  const items = p.hand.filter((c) => T2ITEMS.has(c));
  if (cost.named && !p.hand.includes(cost.named)) return false;
  if ((cost.items || 0) > items.length) return false;
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
  if (cost.named) p.hand.splice(p.hand.indexOf(cost.named), 1);
  for (let i = 0; i < (cost.items || 0); i++) {
    const idx = p.hand.findIndex((c) => T2ITEMS.has(c));
    if (idx >= 0) p.hand.splice(idx, 1);
  }
  if (cost.disillusion) p.hand.splice(p.hand.indexOf("Disillusioned"), 1);
  p.hand.splice(p.hand.indexOf(dest), 1);

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
  if (logging())
    log(`${p.name}: transforms ${u.t.name} → ${dest}${u.leader ? ` (Leader — tier bonus now +${LB[nu.tier]})` : ""}`);
  fireEntry(p, opp, nu);
  return nu;
}

/** Metamorphosis (§5.5): morph a T1 Wild into any T2 Wild in hand. Does NOT use
 *  the transformation action. Keeps banked kills; element becomes the new form's. */
export function metamorph(p: Player, opp: Player, turn: number, src: Unit, dest: string): Unit {
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
  p.hand.splice(p.hand.indexOf(dest), 1);
  const mi = p.hand.indexOf("Metamorphosis");
  if (mi >= 0) p.hand.splice(mi, 1);
  if (logging()) log(`${p.name}: Metamorphosis — ${src.t.name} becomes ${dest} (T2 Wild)`);
  fireEntry(p, opp, nu);
  return nu;
}
