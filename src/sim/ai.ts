// The greedy, deterministic decision policy (§7). Kept separate from the engine
// so alternative policies can be plugged into the same game loop. It calls only
// pure engine primitives + the card database.

import {
  EQUIP,
  EQUIP_REQUIRES_WAR,
  ONPLAY,
  PERSIST,
  getCard,
  isCharacter,
  isHardCastable,
  playPermissionMin,
} from "../data/loadCards";
import { warDamage } from "../engine/effects";
import { fireEntry } from "../engine/effects";
import type { Policy } from "../engine/game";
import { log, logging } from "../engine/log";
import {
  activeSlotsUsed,
  boardChars,
  canAttack,
  canBecomeWarTorn,
  chars,
  effAtk,
  effMaxhp,
  hasWar,
  makeEquip,
  makeUnit,
  moveZone,
  passiveSlotsUsed,
} from "../engine/stats";
import { applyTransform, canAfford, metamorph } from "../engine/transform";
import type { Player, Unit } from "../engine/types";

const has = (arr: string[], x: string) => arr.includes(x);

function tryMetamorphosis(p: Player, opp: Player, turn: number): boolean {
  const cands = boardChars(p).concat(p.leader && p.leader.tier === 1 && has(p.leader.t.affils, "Wild") ? [p.leader] : []);
  const src = cands.find((u) => has(u.t.affils, "Wild") && u.t.tier === 1);
  const dest = p.hand.find((c) => {
    const cc = getCard(c);
    return cc && has(cc.affils, "Wild") && cc.tier === 2;
  });
  if (src && dest) {
    metamorph(p, opp, turn, src, dest);
    return true;
  }
  return false;
}

function tryHardCast(p: Player, opp: Player, turn: number, card: string): boolean {
  if (!isHardCastable(card)) return false;
  const cc = getCard(card)!;
  if (cc.tier > turn) return false;
  const minOthers = playPermissionMin(card);
  if (minOthers != null && boardChars(p).length < minOthers) return false;

  const u = makeUnit(cc, turn);
  // Play to active OR passive (§5.2). Shelter a war-chipped non-attacker (or any
  // opening-phase body) in passive; otherwise take the front line.
  const wantPassive = passiveSlotsUsed(p) < 3 && warDamage(p, u) > 0 && (turn <= 2 || !canAttack(p, u));
  let placed = false;
  if (wantPassive) {
    u.zone = "passive";
    p.passive.push(u);
    placed = true;
  } else if (activeSlotsUsed(p) < 3) {
    p.active.push(u);
    placed = true;
  } else if (passiveSlotsUsed(p) < 3) {
    u.zone = "passive";
    p.passive.push(u);
    placed = true;
  }
  if (!placed) return false;
  p.hand.splice(p.hand.indexOf(card), 1);
  if (logging()) log(`${p.name}: plays ${card} (T${cc.tier}${u.zone === "passive" ? ", to passive" : ""})`);
  fireEntry(p, opp, u);
  return true;
}

function tryEquip(p: Player, card: string): boolean {
  if (EQUIP_REQUIRES_WAR.has(card) && !hasWar(p)) return false; // play-condition not met
  if (passiveSlotsUsed(p) >= 3) return false;
  const cand = boardChars(p).filter((c) => c.zone === "active");
  const pool = cand.length ? cand : boardChars(p);
  if (!pool.length) return false; // equipment can never float — needs a bearer
  const e = makeEquip(card);
  e.zone = "passive";
  e.charged = true; // §5.3: applies immediately on play
  e.link = pool.reduce((a, b) => (effAtk(p, b) > effAtk(p, a) ? b : a));
  p.pcards.push(e);
  e.link.hp = Math.min(effMaxhp(p, e.link), e.link.hp);
  p.hand.splice(p.hand.indexOf(card), 1);
  if (logging()) log(`${p.name}: equips ${card} to ${e.link.t.name}`);
  return true;
}

function tryOnPlay(p: Player, card: string): boolean {
  const cand = boardChars(p).filter((c) => c.hp < effMaxhp(p, c));
  if (cand.length) {
    const tgt = cand.reduce((a, b) => (b.hp < a.hp ? b : a));
    tgt.hp = Math.min(effMaxhp(p, tgt), tgt.hp + (ONPLAY[card].heal || 0));
    if (logging()) log(`${p.name}: ${card} heals ${tgt.t.name}`);
  }
  p.hand.splice(p.hand.indexOf(card), 1);
  return true;
}

function tryPersistent(p: Player, opp: Player, card: string): boolean {
  if (p.events.has(card)) return false;
  if (card === "Crusade" && !p.events.has("Holy War")) return false;
  if (card === "Horde Frenzy" && !p.events.has("Goblin War")) return false;
  if ((card === "Rally to War" || card === "Hardened Veterans") && !hasWar(p)) return false;
  if (passiveSlotsUsed(p) >= 3) return false;
  p.events.add(card);
  p.pcards.push(card);
  if (["War", "Holy War", "Goblin War"].includes(card)) p.war_turns[card] = 0;
  if (card === "Holy War") {
    for (const pl of [p, opp]) {
      if (p.rnd() < 0.5) {
        const v = pl.active.find((u) => canBecomeWarTorn(pl, u));
        if (v) {
          v.wartorn = true;
          if (logging()) log(`${pl.name}: ${v.t.name} captured (War-Torn) by Holy War`);
        }
      }
    }
  }
  p.hand.splice(p.hand.indexOf(card), 1);
  if (logging()) log(`${p.name}: plays ${card}`);
  return true;
}

export const greedyPolicy: Policy = {
  mainPhase(p: Player, opp: Player, turn: number): void {
    let moved = true;
    while (moved) {
      moved = false;
      for (const card of p.hand.slice()) {
        if (card === "Metamorphosis") {
          if (tryMetamorphosis(p, opp, turn)) {
            moved = true;
            break;
          }
          continue;
        }
        if (isCharacter(card)) {
          if (tryHardCast(p, opp, turn, card)) {
            moved = true;
            break;
          }
        } else if (card in EQUIP) {
          if (tryEquip(p, card)) {
            moved = true;
            break;
          }
        } else if (card in ONPLAY) {
          if (tryOnPlay(p, card)) {
            moved = true;
            break;
          }
        } else if (PERSIST.has(card) && card !== "Taken Prisoner") {
          if (tryPersistent(p, opp, card)) {
            moved = true;
            break;
          }
        }
      }
    }
    // Taken Prisoner: capture your own attack-through-War-Torn bodies (or while Broken March is out).
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
  },

  transformAction(p: Player, opp: Player, turn: number): void {
    if (p.lockout) return;
    // Leader is a prioritized candidate: upgrades always; sidegrades only at T1/T2; no downgrade.
    const cands = (p.leader ? [p.leader] : []).concat(boardChars(p));
    for (const u of cands) {
      for (const [dest, cost] of u.t.upg) {
        if (u.leader) {
          const dt = getCard(dest)!.tier;
          if (dt < u.tier) continue;
          if (dt === u.tier && u.tier > 2) continue;
        }
        if (!canAfford(p, u, dest, cost)) continue;
        const nu = applyTransform(p, opp, turn, u, dest, cost);
        // Route the new form: shelter a War-Torn non-attacker; send an attacker to the front.
        if (!nu.leader) {
          if (!canAttack(p, nu) && warDamage(p, nu) > 0 && nu.zone === "active" && passiveSlotsUsed(p) < 3) {
            moveZone(p, nu, "passive");
            if (logging()) log(`${p.name}: ${dest} shelters in the passive zone`);
          } else if (canAttack(p, nu) && nu.zone === "passive" && activeSlotsUsed(p) < 3) {
            moveZone(p, nu, "active");
            if (logging()) log(`${p.name}: ${dest} moves up to the active zone`);
          }
        }
        return;
      }
    }
  },

  elevate(p: Player, turn: number): void {
    const elig = boardChars(p).filter((u) => u.entered <= turn - 1);
    if (elig.length === 0) {
      p.lockout = true;
      return;
    }
    const best = elig.reduce((a, b) => {
      const ka: [number, number] = [a.tier, a.t.atk + a.t.hp];
      const kb: [number, number] = [b.tier, b.t.atk + b.t.hp];
      return kb[0] > ka[0] || (kb[0] === ka[0] && kb[1] > ka[1]) ? b : a;
    });
    for (const lst of [p.active, p.passive]) {
      const i = lst.indexOf(best);
      if (i >= 0) lst.splice(i, 1);
    }
    best.leader = true;
    best.zone = "leader";
    p.leader = best;
    p.lockout = false;
    if (logging()) log(`${p.name}: elevates ${best.t.name} to Leader`);
  },
};

// re-exported for tests/UI that want to reference the unit shape
export type { Unit, Player };
export { chars };
