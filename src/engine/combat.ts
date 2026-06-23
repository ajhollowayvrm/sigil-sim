// Combat: strike math, solo attacks, chains, and the combat phase.
// Order is faithful to the docs: BLOCK FIRST (ATK<=DEF -> 0), else dmg=ATK-DEF,
// THEN elemental amplification. Dark ignores the first DEF check per turn vs a
// Light target. Pure — no React/DOM.

import { beats, darkVsLight } from "./elements";
import { cleanup } from "./effects";
import { log, logging } from "./log";
import { canAttack, chars, effAtk, effDef } from "./stats";
import type { Player, Unit } from "./types";

const has = (arr: string[], x: string) => arr.includes(x);

/** Resolve one hit (solo or chain). Returns true if the target was KO'd. */
export function strike(
  p: Player,
  u: Unit,
  opp: Player,
  tgt: Unit,
  atkOverride?: number,
  element?: string,
  parts = 1,
): boolean {
  const el = element || u.t.elem;
  const atk = atkOverride != null ? atkOverride : effAtk(p, u);
  const dfn = effDef(opp, tgt);
  let ignored = false;
  if (darkVsLight(el, tgt.t.elem) && !p.dark_ignore_used) {
    ignored = true;
    p.dark_ignore_used = true;
  }
  if (!ignored && atk <= dfn) {
    if (logging()) log(`  ${u.t.name} attacks ${tgt.t.name} — blocked (${atk} ≤ DEF ${dfn})`);
    return false;
  }
  let base = ignored ? atk : atk - dfn;
  let elBonus = 0;
  if (beats(el, tgt.t.elem)) {
    elBonus = 10 * parts;
    base += elBonus;
  }
  if (has(u.t.abil, "high_atk_bonus") && tgt.t.atk >= 50) base += 20; // The Silent: +20 vs ATK 50+
  tgt.hp -= base;
  if (logging())
    log(
      `  ${u.t.name} hits ${tgt.t.name} for ${base}${ignored ? " (Dark pierces)" : ""}${
        elBonus ? ` (+${elBonus} element)` : ""
      } → ${Math.max(0, tgt.hp)} HP`,
    );
  if (tgt.hp <= 0) {
    u.kills += 1;
    if (logging()) log(`  ✗ ${tgt.t.name} is KO'd`);
    if (has(u.t.abil, "draw_on_ko_if_honathan") && chars(p).some((x) => has(x.t.abil, "aura_honathan"))) {
      drawOnKo(p, u);
    }
    return true;
  }
  return false;
}

// King's Blade draws on a kill while Honathan is in play.
function drawOnKo(p: Player, u: Unit): void {
  if (p.deck.length > 0) {
    p.hand.push(p.deck.pop()!);
    if (logging()) log(`  ${u.t.name} draws a card on the kill`);
  } else {
    p.lose = true;
  }
}

/** A single greedy solo attack: KO if possible, else the highest-value reachable target. */
export function dealSolo(p: Player, u: Unit, opp: Player): void {
  let targets = opp.active.slice();
  if (has(u.t.abil, "hit_passive")) targets = targets.concat(opp.passive);
  const leaderOpen = opp.leader && opp.active.length === 0 && !has(opp.leader.t.abil, "leader_protect_royal");
  if (has(u.t.abil, "hit_leader") && opp.leader) targets = targets.concat([opp.leader]);
  else if (leaderOpen && targets.length === 0) targets = [opp.leader!];
  if (targets.length === 0) return;
  let best: Unit | null = null;
  let bs = -1;
  for (const tg of targets) {
    const a = effAtk(p, u);
    const df = effDef(opp, tg);
    const free = darkVsLight(u.t.elem, tg.t.elem) && !p.dark_ignore_used;
    const hit = free || a > df;
    let dmg = free ? a : a - df;
    if (beats(u.t.elem, tg.t.elem)) dmg += 10;
    const sc = hit && dmg >= tg.hp ? 100 : hit ? dmg : -1;
    if (sc > bs) {
      bs = sc;
      best = tg;
    }
  }
  if (best) strike(p, u, opp, best);
}

function chainSizeNeeded(p: Player, ch: { affil: string[]; size: number }): number {
  let n = ch.size;
  if (
    ["Divine Channel", "Ascended"].some((x) => ch.affil.includes(x)) &&
    chars(p).some((x) => has(x.t.abil, "keeper_channel"))
  )
    n = Math.max(1, n - 1);
  return n;
}

/** Resolve all available chains for p. Returns true if the opposing Leader died. */
export function doChains(p: Player, opp: Player, used: Set<Unit>): boolean {
  // The Broken March: a War-Torn swarm chain (sum of ATK to one target) at 2+.
  if (p.events.has("The Broken March")) {
    const wt = p.active.filter((u) => u.wartorn && !used.has(u));
    if (wt.length >= 2 && opp.active.length) {
      const tgt = opp.active.reduce((a, b) => (b.hp > a.hp ? b : a));
      const s = wt.reduce((x, u) => x + effAtk(p, u), 0);
      if (logging()) log(`  ⛓ Broken March chain (${wt.map((x) => x.t.name).join("+")}) vs ${tgt.t.name}`);
      if (strike(p, wt[0], opp, tgt, s, wt[0].t.elem, wt.length)) cleanup(opp);
      for (const x of wt) used.add(x);
      if (opp.leader && opp.leader.hp <= 0) return true;
    }
  }
  for (const u of p.active.concat(p.passive)) {
    const ch = u.t.chain;
    if (!ch || used.has(u)) continue;
    let pool = (ch.active_only ? p.active : p.active.concat(p.passive)).filter((x) => !used.has(x) && x !== u);
    if (p.leader && !ch.active_only) pool.push(p.leader);
    const affilParts = pool.filter((x) => ch.affil.some((a) => x.t.affils.includes(a)));
    const parts = [u].concat(affilParts);
    const need = chainSizeNeeded(p, ch);
    const effCount = affilParts.length + (ch.affil.some((a) => u.t.affils.includes(a)) ? 1 : 0);
    if (effCount < need) continue;
    if (ch.aoe) {
      if (parts.filter((x) => ch.affil.some((a) => x.t.affils.includes(a))).length < need) continue;
      const dmg = parts.reduce((x, u2) => x + effAtk(p, u2), 0) * 2;
      const ps = new Set(parts);
      if (logging()) log(`  ⛓ ${ch.name} AoE for ${dmg} to all non-chained`);
      for (const side of [p, opp]) {
        for (const u2 of side.active.concat(side.passive)) if (!ps.has(u2)) u2.hp -= dmg;
        if (side.leader && !ps.has(side.leader)) side.leader.hp -= dmg;
      }
      for (const x of parts) used.add(x);
      cleanup(p);
      cleanup(opp);
      if (opp.leader && opp.leader.hp <= 0) return true;
      continue;
    }
    const targets = opp.active.length ? opp.active.slice() : opp.leader && opp.active.length === 0 ? [opp.leader] : [];
    if (targets.length === 0) {
      for (const x of parts) used.add(x);
      continue;
    }
    const tgt = targets.reduce((a, b) => (b.hp > a.hp ? b : a));
    const s = parts.reduce((x, u2) => x + effAtk(p, u2), 0) + (ch.mod || 0);
    if (logging()) log(`  ⛓ ${ch.name} (${parts.map((x) => x.t.name).join("+")}) vs ${tgt.t.name} — ${s} ATK`);
    if (strike(p, u, opp, tgt, s, u.t.elem, parts.length)) cleanup(opp);
    for (const x of parts) used.add(x);
    if (opp.leader && opp.leader.hp <= 0) return true;
  }
  return false;
}

/** Combat phase (turn 3+). Chains resolve first, then solo attacks; the Leader attacks too. */
export function combat(p: Player, opp: Player, turn: number): void {
  if (turn < 3) return;
  p.dark_ignore_used = false;
  const used = new Set<Unit>();
  if (doChains(p, opp, used)) return;
  for (const u of p.active.slice()) {
    if (used.has(u) || !canAttack(p, u)) continue;
    dealSolo(p, u, opp);
    cleanup(opp);
    if (opp.leader && opp.leader.hp <= 0) return;
  }
  // The Leader may attack from the slot. Without this a board of lone Leaders never
  // trades damage and games stall to the turn cap (§9.2).
  if (p.leader && !used.has(p.leader) && canAttack(p, p.leader)) {
    dealSolo(p, p.leader, opp);
    cleanup(opp);
    if (opp.leader && opp.leader.hp <= 0) return;
  }
}
