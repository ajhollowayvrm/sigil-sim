// Legal-move enumeration for human play. Unlike the AI (which only considers the
// subset its heuristic likes), a human may take ANY legal action, so this lists the
// complete action space for a decision point: every hard-cast + zone, every equip +
// bearer, every event, every metamorphosis, every affordable transform. Each option
// carries an `apply` that mutates the live players — the human path takes the action
// directly (no cloning), so capturing unit references in the closure is safe.
//
// This is also the natural seam for later work: the same enumeration can feed an
// AI that scores options, and the recorded human choices can be checked against it.

import {
  EQUIP,
  EQUIP_REQUIRES_WAR,
  ONPLAY,
  getCard,
  isCharacter,
  isHardCastable,
  playPermissionMin,
} from "../data/loadCards";
import { fireEntry } from "../engine/effects";
import { logging, log } from "../engine/log";
import {
  activeSlotsUsed,
  boardChars,
  canBecomeWarTorn,
  canEquip,
  effMaxhp,
  hasWar,
  makeEquip,
  makeUnit,
  passiveSlotsUsed,
} from "../engine/stats";
import { applyForge, applyTransform, canAfford, forgeOptions, metamorph } from "../engine/transform";
import type { Player, Unit } from "../engine/types";

const has = (arr: string[], x: string) => arr.includes(x);

export interface GameAction {
  key: string; // canonical, stable identifier for the recording
  label: string; // human-readable
  apply: (p: Player, opp: Player, turn: number) => void;
}

// ----- main-phase plays (everything except the one-per-turn transform) -----

function hardCasts(p: Player, turn: number): GameAction[] {
  const out: GameAction[] = [];
  const seen = new Set<string>();
  for (const card of p.hand) {
    if (seen.has(card) || !isCharacter(card) || !isHardCastable(card)) continue;
    seen.add(card);
    const cc = getCard(card)!;
    if (cc.tier > turn) continue;
    const minOthers = playPermissionMin(card);
    if (minOthers != null && boardChars(p).length < minOthers) continue;
    const zones: ("active" | "passive")[] = [];
    if (activeSlotsUsed(p) < 3) zones.push("active");
    if (passiveSlotsUsed(p) < 3) zones.push("passive");
    for (const zone of zones)
      out.push({
        key: `play:${card}:${zone}`,
        label: `Play ${card} (T${cc.tier}) → ${zone}`,
        apply: (pp, oo) => {
          const u = makeUnit(getCard(card)!, turn);
          u.zone = zone;
          (zone === "active" ? pp.active : pp.passive).push(u);
          pp.hand.splice(pp.hand.indexOf(card), 1);
          if (logging()) log(`${pp.name}: plays ${card} (T${cc.tier}${zone === "passive" ? ", to passive" : ""})`);
          fireEntry(pp, oo, u);
        },
      });
  }
  return out;
}

function equips(p: Player): GameAction[] {
  const out: GameAction[] = [];
  if (passiveSlotsUsed(p) >= 3) return out;
  const seen = new Set<string>();
  for (const card of p.hand) {
    if (seen.has(card) || !(card in EQUIP)) continue;
    seen.add(card);
    if (EQUIP_REQUIRES_WAR.has(card) && !hasWar(p)) continue;
    for (const bearer of boardChars(p)) {
      if (!canEquip(card, bearer)) continue; // tier-gate + signature bearer restriction
      out.push({
        key: `equip:${card}>${bearer.t.name}`,
        label: `Equip ${card} → ${bearer.t.name}`,
        apply: (pp) => attachEquip(pp, card, bearer),
      });
    }
  }
  return out;
}

/** Item forging — a separate, unlimited-per-turn action; always pays a cost. */
function forges(p: Player): GameAction[] {
  const out: GameAction[] = [];
  for (const bearer of p.leader ? [p.leader, ...boardChars(p)] : boardChars(p)) {
    for (const opt of forgeOptions(p, bearer)) {
      out.push({
        key: `forge:${opt.origin.name}>${opt.dest}@${bearer.t.name}`,
        label: `Forge ${opt.origin.name} → ${opt.dest} (on ${bearer.t.name})`,
        apply: (pp) => applyForge(pp, bearer, opt.origin, opt.dest, opt.cost),
      });
    }
  }
  return out;
}

function attachEquip(p: Player, card: string, bearer: Unit): void {
  const e = makeEquip(card);
  e.zone = "passive";
  e.charged = true;
  e.link = bearer;
  p.pcards.push(e);
  bearer.hp = Math.min(effMaxhp(p, bearer), bearer.hp);
  p.hand.splice(p.hand.indexOf(card), 1);
  if (logging()) log(`${p.name}: equips ${card} to ${bearer.t.name}`);
}

function onPlays(p: Player): GameAction[] {
  const out: GameAction[] = [];
  const seen = new Set<string>();
  for (const card of p.hand) {
    if (seen.has(card) || !(card in ONPLAY)) continue;
    seen.add(card);
    const wounded = boardChars(p).filter((c) => c.hp < effMaxhp(p, c));
    if (wounded.length === 0) {
      out.push({
        key: `onplay:${card}`,
        label: `Play ${card} (no wounded target)`,
        apply: (pp) => pp.hand.splice(pp.hand.indexOf(card), 1),
      });
    } else {
      for (const tgt of wounded)
        out.push({
          key: `onplay:${card}>${tgt.t.name}`,
          label: `Play ${card} → heal ${tgt.t.name}`,
          apply: (pp) => {
            tgt.hp = Math.min(effMaxhp(pp, tgt), tgt.hp + (ONPLAY[card].heal || 0));
            pp.hand.splice(pp.hand.indexOf(card), 1);
            if (logging()) log(`${pp.name}: ${card} heals ${tgt.t.name}`);
          },
        });
    }
  }
  return out;
}

function metamorphs(p: Player): GameAction[] {
  const out: GameAction[] = [];
  if (!p.hand.includes("Metamorphosis")) return out;
  const srcs = boardChars(p)
    .concat(p.leader && p.leader.tier === 1 && has(p.leader.t.affils, "Wild") ? [p.leader] : [])
    .filter((u) => has(u.t.affils, "Wild") && u.t.tier === 1);
  const dests = new Set(p.hand.filter((c) => {
    const cc = getCard(c);
    return cc && has(cc.affils, "Wild") && cc.tier === 2;
  }));
  for (const src of srcs)
    for (const dest of dests)
      out.push({
        key: `morph:${src.t.name}>${dest}`,
        label: `Metamorphosis: ${src.t.name} → ${dest}`,
        apply: (pp, oo, tn) => metamorph(pp, oo, tn, src, dest),
      });
  return out;
}

function events(p: Player, opp: Player): GameAction[] {
  const out: GameAction[] = [];
  const slot = passiveSlotsUsed(p) < 3;
  const addPersist = (card: string, extra?: (pp: Player) => void): GameAction => ({
    key: `event:${card}`,
    label: `Play ${card}`,
    apply: (pp) => {
      pp.events.add(card);
      pp.pcards.push(card);
      pp.hand.splice(pp.hand.indexOf(card), 1);
      extra?.(pp);
      if (logging()) log(`${pp.name}: plays ${card}`);
    },
  });

  for (const war of ["War", "Holy War", "Goblin War"]) {
    if (slot && p.hand.includes(war) && !p.events.has(war))
      out.push(
        addPersist(war, (pp) => {
          pp.war_turns[war] = 0;
          if (war === "Holy War") {
            for (const pl of [pp, opp])
              if (pp.rnd() < 0.5) {
                const v = pl.active.find((u) => canBecomeWarTorn(pl, u));
                if (v) {
                  v.wartorn = true;
                  if (logging()) log(`${pl.name}: ${v.t.name} captured (War-Torn) by Holy War`);
                }
              }
          }
        }),
      );
  }
  if (slot && p.hand.includes("Crusade") && !p.events.has("Crusade") && p.events.has("Holy War")) out.push(addPersist("Crusade"));
  if (slot && p.hand.includes("Horde Frenzy") && !p.events.has("Horde Frenzy") && p.events.has("Goblin War"))
    out.push(addPersist("Horde Frenzy"));
  if (slot && p.hand.includes("Rally to War") && !p.events.has("Rally to War") && hasWar(p)) out.push(addPersist("Rally to War"));
  if (slot && p.hand.includes("Hardened Veterans") && !p.events.has("Hardened Veterans") && hasWar(p))
    out.push(addPersist("Hardened Veterans"));
  if (slot && p.hand.includes("The Broken March") && !p.events.has("The Broken March")) out.push(addPersist("The Broken March"));
  if (slot && p.hand.includes("Close the Gates") && !p.events.has("Close the Gates")) out.push(addPersist("Close the Gates"));
  if (slot && p.hand.includes("War College") && !p.events.has("War College")) out.push(addPersist("War College"));

  // Taken Prisoner: consumed to make one of your own bodies War-Torn (needs a War).
  if (p.hand.includes("Taken Prisoner") && hasWar(p)) {
    for (const tgt of boardChars(p).filter((u) => !u.wartorn && canBecomeWarTorn(p, u)))
      out.push({
        key: `capture:${tgt.t.name}`,
        label: `Taken Prisoner → War-Torn ${tgt.t.name}`,
        apply: (pp) => {
          tgt.wartorn = true;
          pp.hand.splice(pp.hand.indexOf("Taken Prisoner"), 1);
          if (logging()) log(`${pp.name}: Taken Prisoner → ${tgt.t.name} is War-Torn`);
        },
      });
  }
  return out;
}

/** Every legal main-phase play (excluding the one-per-turn character transform).
 *  Item forging lives here too — it is an unlimited-per-turn action lane. */
export function mainActions(p: Player, opp: Player, turn: number): GameAction[] {
  return [...hardCasts(p, turn), ...metamorphs(p), ...equips(p), ...forges(p), ...onPlays(p), ...events(p, opp)];
}

// ----- the one-per-turn transform action -----

export function transformActions(p: Player, turn: number): GameAction[] {
  void turn;
  const out: GameAction[] = [];
  const cands = p.leader ? [p.leader, ...boardChars(p)] : boardChars(p);
  for (const u of cands) {
    for (const [dest, cost] of u.t.upg) {
      if (u.leader) {
        const dt = getCard(dest)!.tier;
        if (dt < u.tier) continue; // no Leader downgrade
        if (dt === u.tier && u.tier > 2) continue; // sidegrade only at T1/T2
      }
      if (!canAfford(p, u, dest, cost)) continue;
      out.push({
        key: `transform:${u.t.name}>${dest}`,
        label: `Transform ${u.t.name} → ${dest}${u.leader ? " (Leader)" : ""}`,
        apply: (pp, oo, tn) => applyTransform(pp, oo, tn, u, dest, cost),
      });
    }
  }
  return out;
}
