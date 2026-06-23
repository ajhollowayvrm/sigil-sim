// Combat: strike math, the coordinated attack planner, chains, and the combat phase.
//
// Strike math is faithful to the docs: BLOCK FIRST (ATK<=DEF -> 0), else dmg=ATK-DEF,
// THEN elemental amplification; Dark ignores the first DEF check per turn vs a Light
// target. That part is mechanics and never changes.
//
// What got *smart* is target selection. The old engine attacked greedily, one body
// at a time, each picking its own best target in isolation — so three 30-ATK bodies
// would each peck a different blocker and kill nothing. The planner here treats the
// whole attacking side as a unit: it computes a kill-priority order (a reachable
// enemy Leader first — that wins; then the most valuable enemy it can actually
// finish), and FOCUS-FIRES, throwing exactly enough attackers at one target to drop
// it before moving on. It also spends the smallest sufficient hitter on each kill so
// the big swings are saved for the next target. Pure — no React/DOM.

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

/** Predict a strike's damage and whether it KOs, without mutating anything. Reads
 *  the live per-turn Dark-pierce flag, so the planner sees the same first-check
 *  exemption the real strike would apply. */
function predictDamage(
  p: Player,
  u: Unit,
  opp: Player,
  tgt: Unit,
  atkOverride?: number,
  element?: string,
  parts = 1,
): { dmg: number; ko: boolean } {
  const el = element || u.t.elem;
  const atk = atkOverride != null ? atkOverride : effAtk(p, u);
  const dfn = effDef(opp, tgt);
  const ignored = darkVsLight(el, tgt.t.elem) && !p.dark_ignore_used;
  if (!ignored && atk <= dfn) return { dmg: 0, ko: false };
  let base = ignored ? atk : atk - dfn;
  if (beats(el, tgt.t.elem)) base += 10 * parts;
  if (has(u.t.abil, "high_atk_bonus") && tgt.t.atk >= 50) base += 20;
  return { dmg: base, ko: tgt.hp - base <= 0 };
}

/** Kill priority of an enemy defender. A reachable Leader dwarfs everything (it
 *  ends the game); otherwise: bigger bodies and bigger threats first, and a body
 *  that can't fight back is a low-priority kill. */
function defenderValue(opp: Player, t: Unit): number {
  let v = Math.max(0, t.hp) + effDef(opp, t) * 0.5 + effAtk(opp, t) + t.tier * 12;
  if (t.leader) v += 1000;
  if (!canAttack(opp, t) && !t.leader) v *= 0.6;
  return v;
}

/** Which enemies can `u` reach right now (default-target rules + its flags). */
function reachable(u: Unit, opp: Player): Unit[] {
  let ts = opp.active.slice();
  if (has(u.t.abil, "hit_passive")) ts = ts.concat(opp.passive);
  const explicitLeader = has(u.t.abil, "hit_leader") && opp.leader;
  // The Leader is otherwise only exposed when this attacker has nothing else to hit.
  const leaderOpen = opp.leader && ts.length === 0 && !has(opp.leader.t.abil, "leader_protect_royal");
  if (explicitLeader) ts.push(opp.leader!);
  else if (leaderOpen) ts = [opp.leader!];
  return ts;
}

/** Pick the next (attacker, target) for the focus-fire planner, or null if no
 *  attacker can reach anything. Chooses the target the *whole remaining squad* most
 *  wants dead (lethal-now > damageable > value), then the cheapest attacker that
 *  secures it (least overkill), saving heavy hitters for the next kill. */
function chooseAttack(p: Player, opp: Player, rem: Unit[]): { a: Unit; t: Unit } | null {
  const reachers = new Map<Unit, Unit[]>();
  for (const u of rem)
    for (const t of reachable(u, opp)) {
      const list = reachers.get(t);
      if (list) list.push(u);
      else reachers.set(t, [u]);
    }
  if (reachers.size === 0) return null;

  let best: Unit | null = null;
  let bestKey: number[] = [-1, -1, -1, -1];
  for (const [t, rs] of reachers) {
    const total = rs.reduce((s, u) => s + predictDamage(p, u, opp, t).dmg, 0);
    const damageable = rs.some((u) => predictDamage(p, u, opp, t).dmg > 0);
    const key = [total >= t.hp && damageable ? 1 : 0, damageable ? 1 : 0, defenderValue(opp, t), -t.hp];
    if (best === null || lexGt(key, bestKey)) {
      best = t;
      bestKey = key;
    }
  }
  if (!best) return null;

  // Choose the attacker for `best`: a clean killer with the least overkill if one
  // exists; otherwise the hardest hitter (chipping toward a later finish).
  const rs = reachers.get(best)!;
  const koers = rs.filter((u) => predictDamage(p, u, opp, best!).ko);
  let a: Unit;
  if (koers.length) {
    a = koers.reduce((x, y) => (predictDamage(p, y, opp, best!).dmg < predictDamage(p, x, opp, best!).dmg ? y : x));
  } else {
    a = rs.reduce((x, y) => (predictDamage(p, y, opp, best!).dmg > predictDamage(p, x, opp, best!).dmg ? y : x));
  }
  // If the pick would be fully blocked but some other attack is productive, prefer that.
  if (predictDamage(p, a, opp, best).dmg === 0) {
    for (const u of rem)
      for (const t of reachable(u, opp)) if (predictDamage(p, u, opp, t).dmg > 0) return { a: u, t };
  }
  return { a, t: best };
}

/** Lexicographic > on equal-length numeric arrays. */
function lexGt(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
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

/** Pick the best single-target for a chain: a clean KO of the most valuable target
 *  if the chain's damage can finish one, else the highest-value reachable target. */
function pickChainTarget(p: Player, opp: Player, targets: Unit[], sum: number, elem: string, parts: number): Unit {
  let best = targets[0];
  let bestKey: number[] = [-1, -1];
  for (const t of targets) {
    const { ko } = predictDamage(p, best, opp, t, sum, elem, parts); // attacker identity irrelevant to chain dmg
    const key = [ko ? 1 : 0, defenderValue(opp, t)];
    if (lexGt(key, bestKey)) {
      best = t;
      bestKey = key;
    }
  }
  return best;
}

/** Resolve all available chains for p. Returns true if the opposing Leader died. */
export function doChains(p: Player, opp: Player, used: Set<Unit>): boolean {
  // The Broken March: a War-Torn swarm chain (sum of ATK to one target) at 2+.
  if (p.events.has("The Broken March")) {
    const wt = p.active.filter((u) => u.wartorn && !used.has(u));
    if (wt.length >= 2 && opp.active.length) {
      const s = wt.reduce((x, u) => x + effAtk(p, u), 0);
      const tgt = pickChainTarget(p, opp, opp.active.slice(), s, wt[0].t.elem, wt.length);
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
    const s = parts.reduce((x, u2) => x + effAtk(p, u2), 0) + (ch.mod || 0);
    const tgt = pickChainTarget(p, opp, targets, s, u.t.elem, parts.length);
    if (logging()) log(`  ⛓ ${ch.name} (${parts.map((x) => x.t.name).join("+")}) vs ${tgt.t.name} — ${s} ATK`);
    if (strike(p, u, opp, tgt, s, u.t.elem, parts.length)) cleanup(opp);
    for (const x of parts) used.add(x);
    if (opp.leader && opp.leader.hp <= 0) return true;
  }
  return false;
}

/** Combat phase (turn 3+). Chains resolve first, then the coordinated solo planner;
 *  the Leader is part of the attacking squad and focus-fires alongside the others. */
export function combat(p: Player, opp: Player, turn: number): void {
  if (turn < 3) return;
  p.dark_ignore_used = false;
  const used = new Set<Unit>();
  if (doChains(p, opp, used)) return;

  // Focus-fire planner: every attacker (active bodies + the Leader from its slot)
  // gets exactly one swing, but the squad coordinates so swings combine into kills.
  const acted = new Set<Unit>(used);
  for (;;) {
    const rem = p.active.filter((u) => !acted.has(u) && canAttack(p, u));
    if (p.leader && !acted.has(p.leader) && canAttack(p, p.leader)) rem.push(p.leader);
    if (rem.length === 0) break;
    const plan = chooseAttack(p, opp, rem);
    if (!plan) break;
    strike(p, plan.a, opp, plan.t);
    acted.add(plan.a);
    cleanup(opp);
    if (opp.leader && opp.leader.hp <= 0) return;
  }
}
