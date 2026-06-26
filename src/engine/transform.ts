// Transformation + Metamorphosis mechanics (the swap itself). WHICH transform to
// take is a policy decision (sim/ai.ts); this module only applies a chosen one.
// Pure — no React/DOM.

import { EQUIP, FUEL, getCard, getItemTier, isItem, itemAnyTier, itemBearerInclude, itemUpgrades, T2ITEMS } from "../data/loadCards";
import { FUEL_GRANTED_CHAIN } from "../data/effects-map";
import { cleanup, fireEntry } from "./effects";
import { comps } from "./elements";
import { log, logging } from "./log";
import { chars, draw, effMaxhp, isEquipObj, isKaethlaan, LB, linkedEquips, makeUnit } from "./stats";
import type { Equip, ItemCost, Player, TransformCost, Unit } from "./types";

const has = (arr: string[], x: string) => arr.includes(x);

/** Can `u` transform into `dest` right now? Every character transforms NATURALLY —
 *  items are never required. The only gates are the card's genuine conditions
 *  (a state, a milestone, a presence). Destination must be in hand. */
export function canAfford(p: Player, u: Unit, dest: string, cost: TransformCost): boolean {
  if (!p.hand.includes(dest)) return false;
  if ((cost.kills || 0) > u.kills) return false;
  if (cost.need_war && !hasWarLocal(p)) return false;
  // Wanderer gate: the transforming body is already Disillusioned (state), or you hold a
  // Disillusioned card to consume now (legacy hand-gate).
  if (cost.disillusion && !u.disillusioned && !p.hand.includes("Disillusioned")) return false;
  if (cost.taken_prisoner && !hasWarLocal(p)) return false;
  if (cost.requires_arlia && !p.active.concat(p.passive, p.leader ? [p.leader] : []).some((x) => x.t.name.includes("Arlia")))
    return false;
  if (cost.t3_items && countT3Items(p) < cost.t3_items) return false;
  if (cost.plague_turns && (u.plaguedTurns || 0) < cost.plague_turns) return false; // Plague-duration climb gate
  return true;
}

/** T3 items in hand (the fuel The Ascended consumes). `getItemTier` is CSV-driven and
 *  only returns 3 for cards in the item table, so it alone identifies a T3 item. */
function countT3Items(p: Player): number {
  return p.hand.filter((c) => getItemTier(c) === 3).length;
}

function hasWarLocal(p: Player): boolean {
  return p.events.has("War") || p.events.has("Holy War") || p.events.has("Goblin War");
}

/** Accelerator: consume up to `max` spare fuel items (those that buff) from hand and
 *  return the accumulated buff. Fuel is optional — a transform happens with or without
 *  it; consuming it just makes the new form enter stronger (the fuel cards' printed text). */
function consumeFuelBuff(p: Player, max: number): { atk: number; deff: number; hp: number } {
  const buff = { atk: 0, deff: 0, hp: 0 };
  let n = 0;
  for (let i = 0; i < p.hand.length && n < max; ) {
    const eff = FUEL[p.hand[i]];
    // T3 relics are reserved for The Ascended's apotheosis — ordinary transforms don't burn them.
    if (eff && getItemTier(p.hand[i]) < 3 && (eff.atk || eff.deff || eff.maxhp || eff.all)) {
      buff.atk += (eff.atk || 0) + (eff.all || 0);
      buff.deff += (eff.deff || 0) + (eff.all || 0);
      buff.hp += (eff.maxhp || 0) + (eff.all || 0);
      p.hand.splice(i, 1);
      n++;
    } else i++;
  }
  return buff;
}

/** Apply a (validated) transformation: consume costs, swap the form, fire entry. */
export function applyTransform(p: Player, opp: Player, turn: number, u: Unit, dest: string, cost: TransformCost): Unit {
  // Pay the wanderer gate: consume the body's Disillusioned state if it has it, else the card.
  if (cost.disillusion) {
    if (u.disillusioned) u.disillusioned = false;
    else p.hand.splice(p.hand.indexOf("Disillusioned"), 1);
  }
  p.hand.splice(p.hand.indexOf(dest), 1);
  // The Ascended: its stats ARE the number of items discarded during transformation ×20 —
  // ANY tier (the "1+ T3" is only the entry gate, enforced in canAfford). Stat-modifying
  // riders on the consumed items do NOT apply (you trade the item's printed buff for the
  // ×20). Consume every item in hand; that count drives HP/ATK/DEF.
  // (TODO(v0.8): "ability-grant riders still apply" — e.g. an item that grants a keyword/chain
  //  should pass it to The Ascended; not yet modeled. Stat fix is the load-bearing part.)
  // Otherwise, optional accelerator: spend up to 2 spare fuel items to enter buffed.
  let buff: { atk: number; deff: number; hp: number };
  if (has(getCard(dest)!.abil, "ascended_variable")) {
    let n = 0;
    for (let i = 0; i < p.hand.length; ) {
      if (isItem(p.hand[i])) {
        p.hand.splice(i, 1);
        n++;
      } else i++;
    }
    buff = { atk: n * 20, deff: n * 20, hp: n * 20 };
  } else {
    buff = consumeFuelBuff(p, 2);
  }

  // Carry over the WOUNDS, not the absolute HP: the gain in Max HP also applies to
  // current HP, so a full-health body stays full after transforming (a damaged one
  // keeps the same deficit).
  const deficit = Math.max(0, effMaxhp(p, u) - u.hp);
  const nu = makeUnit(getCard(dest)!, turn);
  nu.kills = u.kills;
  nu.leader = u.leader;
  nu.zone = u.zone;
  nu.entered = u.entered;
  nu.mods = buff; // fuel buff is baked into this form (resets on the next transform)
  if (has(nu.t.affils, "War-Torn")) nu.wartorn = true;
  for (const lst of [p.active, p.passive]) {
    const i = lst.indexOf(u);
    if (i >= 0) lst[i] = nu;
  }
  for (const e of p.pcards) if (isEquipObj(e) && e.link === u) e.link = nu;
  if (u.leader) p.leader = nu;
  // Banner of the Realm: a T3 fuel consumed in a Kaethlaan transformation grants the
  // resulting form the printed Rally chain (Chain 2 Kaethlaan Knights, sum of ATK).
  if (!nu.t.chain && isKaethlaan(nu) && p.hand.includes("Banner of the Realm")) {
    p.hand.splice(p.hand.indexOf("Banner of the Realm"), 1);
    nu.grantedChain = FUEL_GRANTED_CHAIN["Banner of the Realm"];
    if (logging()) log(`${p.name}: Banner of the Realm — ${nu.t.name} gains the Rally chain`);
  }
  nu.hp = effMaxhp(p, nu) - deficit; // new full max (incl. fuel buff), minus the wounds carried in
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

/** Fusion (the Apex mechanic): merge `consume` into `keep`. The keeper (the Apex) gains the other's
 *  BASE stats (template + its own mods, not auras), current HP, and kills; the consumed body (+ its
 *  equipment) leaves play. The Apex's fusion COUNT grows — at 2 it gains reach (hits the passive
 *  zone), at 3 it can strike the opposing Leader (combat.ts reads `fusions`). Each fusion also fires
 *  an ELEMENT EFFECT keyed to the ABSORBED creature's element. Does not use the transform action. */
export function fuse(p: Player, opp: Player, keep: Unit, consume: Unit): void {
  keep.mods.atk += consume.t.atk + consume.mods.atk;
  keep.mods.deff += consume.t.deff + consume.mods.deff;
  keep.mods.hp += consume.t.hp + consume.mods.hp;
  keep.hp += Math.max(0, consume.hp);
  keep.kills += consume.kills;
  keep.fusions = (keep.fusions || 0) + 1;
  for (const lst of [p.active, p.passive]) {
    const i = lst.indexOf(consume);
    if (i >= 0) {
      lst.splice(i, 1);
      break;
    }
  }
  for (let i = p.pcards.length - 1; i >= 0; i--) {
    const e = p.pcards[i];
    if (isEquipObj(e) && e.link === consume) p.pcards.splice(i, 1);
  }
  if (logging()) log(`${p.name}: Fusion — ${consume.t.name} (${consume.t.elem}) merges into ${keep.t.name} [×${keep.fusions}]`);
  // Element effect — what the absorbed beast does as it merges (hybrids fire both components).
  const el = comps(consume.t.elem);
  if (el.includes("Fire")) {
    // a last fire-breath: 10 to the weakest opposing active creature
    const t = opp.active.slice().sort((a, b) => a.hp - b.hp)[0];
    if (t) {
      t.hp -= 10;
      if (logging()) log(`  🔥 Fusion (Fire) — 10 damage to ${t.t.name}`);
    }
  }
  if (el.includes("Water")) keep.hp = Math.min(effMaxhp(p, keep), keep.hp + 20); // regenerate
  if (el.includes("Earth")) keep.mods.deff += 20; // harden (permanent)
  if (el.includes("Wind")) draw(p); // the pack scatters and regroups — an extra card
  if (el.includes("Light")) {
    const ally = chars(p)
      .filter((c) => c.hp < effMaxhp(p, c))
      .sort((a, b) => a.hp / effMaxhp(p, a) - b.hp / effMaxhp(p, b))[0];
    if (ally) ally.hp = Math.min(effMaxhp(p, ally), ally.hp + 20);
  }
  if (el.includes("Dark") && opp.leader) opp.leader.hp -= 10; // drains the life it can reach
  cleanup(opp); // remove anything the Fire/Dark burst killed
  // (No base draw — fusing is a real tempo cost, 2 bodies into 1; only a Wind absorption refills.)
}
