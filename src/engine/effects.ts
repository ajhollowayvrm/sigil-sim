// Persistent effects: start-of-turn ticks (regrow, HoT, world-state war
// attrition, war burnout), KO cleanup (with equipment discard + on-KO draws),
// and on-entry triggers. Pure — no React/DOM.

import { comps } from "./elements";
import { log, logging } from "./log";
import { boardChars, chars, draw, effMaxhp, isEquipObj, isKaethlaan } from "./stats";
import type { Player, Unit } from "./types";

const has = (arr: string[], x: string) => arr.includes(x);

// ----- world-state wars (§5.4: they hit active zones on BOTH sides) -----

export function activeWars(players: Player[]): Set<string> {
  const s = new Set<string>();
  for (const pl of players) for (const w of ["War", "Holy War", "Goblin War"]) if (pl.events.has(w)) s.add(w);
  return s;
}

export function warDamageFrom(pl: Player, u: Unit, wars: Set<string>): number {
  if (pl.events.has("Hardened Veterans") && has(u.t.affils, "Royal Army")) return 0; // controller-side immunity
  if (pl.events.has("Close the Gates") && isKaethlaan(u)) return 0; // Kaethlaan held the wall
  let d = 0;
  if (wars.has("War")) d += 10;
  if (wars.has("Holy War")) d += comps(u.t.elem).includes("Light") ? 0 : u.t.elem === "Dark" ? 20 : 10;
  if (wars.has("Goblin War") && !has(u.t.affils, "Goblin")) d += 10;
  return d;
}

/** Controller-only war damage — used by the AI's shelter heuristics. */
export function warDamage(p: Player, u: Unit): number {
  return warDamageFrom(p, u, activeWars([p]));
}

export function cleanup(pl: Player): void {
  for (const lst of [pl.active, pl.passive]) {
    for (const u of lst.slice()) {
      if (u.hp <= 0) {
        for (const e of pl.pcards.filter((e) => isEquipObj(e) && e.link === u)) {
          pl.pcards.splice(pl.pcards.indexOf(e), 1);
          if (logging() && isEquipObj(e)) log(`${pl.name}: ${e.name} is discarded (bearer KO'd)`);
        }
        lst.splice(lst.indexOf(u), 1);
        if (pl.events.has("Horde Frenzy") && has(u.t.affils, "Goblin")) {
          draw(pl);
          if (logging()) log(`${pl.name}: Horde Frenzy — draws on a Goblin's death`);
        }
      }
    }
  }
  if (pl.leader && pl.leader.hp <= 0) pl.lose = true;
}

// ----- entry triggers (the §6 text->primitive mapping, keyed by name) -----

function healLowest(p: Player, amt: number): void {
  const cand = chars(p).filter((c) => c.hp < effMaxhp(p, c));
  if (!cand.length) return;
  const t = cand.reduce((a, b) => (b.hp / effMaxhp(p, b) < a.hp / effMaxhp(p, a) ? b : a));
  t.hp = Math.min(effMaxhp(p, t), t.hp + amt);
}

const ENTRY: Record<string, (p: Player, opp: Player, u: Unit) => void> = {
  dmg_mages: (p, _opp, u) => {
    for (const x of chars(p)) if (x !== u && has(x.t.affils, "Mages Guild")) x.hp -= 10;
  },
  dmg_opp_active: (_p, opp, _u) => {
    if (opp.active.length) {
      const t = opp.active.reduce((a, b) => (b.hp > a.hp ? b : a));
      t.hp -= 10;
    }
  },
  heal_lowest: (p, _opp, _u) => healLowest(p, 10),
};

/** Fires on hard-cast, transform, and Metamorphosis (§6). */
export function fireEntry(p: Player, opp: Player, u: Unit): void {
  const key = u.t.entry;
  if (!key) return;
  const f = ENTRY[key];
  if (!f) return;
  f(p, opp, u);
  if (logging()) log(`${p.name}: ${u.t.name} — entry effect`);
  cleanup(opp);
  cleanup(p);
}

export function startOfTurn(p: Player, opp: Player, turn: number): void {
  // Regrow heal-over-time.
  for (const u of chars(p)) if (has(u.t.abil, "regrow") && u.hp < effMaxhp(p, u)) u.hp = Math.min(effMaxhp(p, u), u.hp + 10);
  // The Long Road: HoT on a Disillusioned/Wandering bearer (modeled as a passive event flag).
  if (p.events.has("The Long Road"))
    for (const u of boardChars(p))
      if (["Wandering", "Faithless"].some((a) => has(u.t.affils, a)) && u.hp < effMaxhp(p, u)) {
        u.hp = Math.min(effMaxhp(p, u), u.hp + 10);
        break;
      }
  // World-state war attrition — every war in play (EITHER side) hits active zones on BOTH sides.
  const wars = activeWars([p, opp]);
  if (wars.size) {
    for (const pl of [p, opp])
      for (const u of pl.active.slice()) {
        const d = warDamageFrom(pl, u, wars);
        if (d > 0) {
          u.hp -= d;
          if (logging()) log(`${pl.name}: ${u.t.name} suffers ${d} war attrition → ${Math.max(0, u.hp)} HP`);
        }
      }
    cleanup(p);
    cleanup(opp);
  }
  // War burnout coin-flips (seeded RNG so games stay deterministic).
  for (const w of Object.keys(p.war_turns)) {
    p.war_turns[w] += 1;
    if (p.war_turns[w] > (w === "Holy War" ? 4 : 2) && p.rnd() < 0.5) {
      p.events.delete(w);
      delete p.war_turns[w];
      if (logging()) log(`${p.name}: ${w} burns out`);
    }
  }
  // turn is referenced by callers for sequencing; no per-turn use here yet.
  void turn;
}
