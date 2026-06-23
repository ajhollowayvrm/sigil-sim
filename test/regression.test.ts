// The §9 regression suite — the bugs the prototype shipped, encoded as tests.

import { describe, expect, it } from "vitest";
import { deckLoyalist, deckWar } from "../src/data/decks";
import { isHardCastable } from "../src/data/loadCards";
import { combat, strike } from "../src/engine/combat";
import { cleanup, startOfTurn } from "../src/engine/effects";
import { game } from "../src/engine/game";
import { mulberry32 } from "../src/engine/rng";
import { effAtk, effDef, effMaxhp, LB, makeEquip } from "../src/engine/stats";
import { applyTransform, canAfford, metamorph } from "../src/engine/transform";
import { greedyPolicy } from "../src/sim/ai";
import { P, unit } from "./helpers";

describe("§9.1 Leader tier bonus", () => {
  it("adds +10/+30/+50/+70 to ALL stats by current tier (never NaN)", () => {
    const p = P();
    const u = unit("Bogfang"); // vanilla Wild: 30/20/0, no auras
    p.active.push(u);
    const baseAtk = effAtk(p, u);
    const baseDef = effDef(p, u);
    const baseHp = effMaxhp(p, u);
    expect(baseAtk).toBe(20);

    u.leader = true;
    for (const tier of [1, 2, 3, 4]) {
      u.tier = tier;
      expect(effAtk(p, u)).toBe(baseAtk + LB[tier]);
      expect(effDef(p, u)).toBe(baseDef + LB[tier]);
      expect(effMaxhp(p, u)).toBe(baseHp + LB[tier]);
      expect(Number.isNaN(effAtk(p, u))).toBe(false);
    }
  });

  it("a T2 character crowned Leader has effAtk = base + 30", () => {
    const p = P();
    const u = unit("Swiftblade Kael"); // T2, base ATK 50, no active auras
    p.active.push(u);
    u.leader = true;
    u.tier = 2;
    expect(effAtk(p, u)).toBe(50 + 30);
  });
});

describe("§9.2 Lone Leader can attack", () => {
  it("attacks the opposing Leader when both active zones are empty", () => {
    const a = P("A");
    const b = P("B");
    a.leader = unit("Pyrnit"); // Fire, ATK 30
    a.leader.leader = true;
    a.leader.zone = "leader";
    b.leader = unit("Bogfang"); // Earth, DEF 0, HP 30
    b.leader.leader = true;
    b.leader.zone = "leader";
    combat(a, b, 3);
    expect(b.leader.hp).toBeLessThanOrEqual(0); // 30+10(leader) ATK vs 0+10 DEF, +Fire>Earth
  });

  it("a real game does not stall to the turn cap", () => {
    const [, turn, why] = game(deckWar(), deckLoyalist(), mulberry32(1), greedyPolicy);
    expect(why).not.toBe("timeout");
    expect(turn).toBeLessThan(36);
  });
});

describe("§9.3 World-state wars hit both sides", () => {
  it("one player's War damages the opponent's active characters", () => {
    const a = P("A");
    const b = P("B");
    a.events.add("War");
    a.war_turns["War"] = 0;
    const mine = unit("Bogfang");
    const theirs = unit("Stoneback");
    a.active.push(mine);
    b.active.push(theirs);
    startOfTurn(a, b, 3);
    expect(mine.hp).toBe(20); // 30 - 10
    expect(theirs.hp).toBe(20); // opponent's active char also chipped
  });
});

describe("§9.4 Equipment never floats", () => {
  it("linked equipment is discarded when its bearer is KO'd", () => {
    const p = P();
    const u = unit("Bogfang");
    p.active.push(u);
    const e = makeEquip("Twin Daggers");
    e.zone = "passive";
    e.link = u;
    p.pcards.push(e);
    u.hp = 0;
    cleanup(p);
    expect(p.active.length).toBe(0);
    expect(p.pcards.length).toBe(0); // not orphaned in a slot
  });
});

describe("§9.5 No combat before turn 3", () => {
  it("turns 1 and 2 deal no damage", () => {
    for (const turn of [1, 2]) {
      const a = P("A");
      const b = P("B");
      a.leader = unit("Pyrnit");
      a.leader.leader = true;
      b.leader = unit("Bogfang");
      b.leader.leader = true;
      combat(a, b, turn);
      expect(b.leader.hp).toBe(30); // untouched
    }
  });
});

describe("§9.6 T1-only hard-cast", () => {
  it("T2+ forms with a TransformIn are not hard-castable; T1 bases and permitted standalones are", () => {
    expect(isHardCastable("Arlia, Destined Trainee")).toBe(true); // T1 base
    expect(isHardCastable("Mage Arlia")).toBe(false); // T2, transform-only
    expect(isHardCastable("Embermaw")).toBe(false); // T2 Wild, Metamorphosis-only
    expect(isHardCastable("A Man Bred for War")).toBe(false); // T3, no base, no permission
    expect(isHardCastable("King Honathan of Kaethlaan")).toBe(true); // standalone with play permission
  });

  it("reaching a T2 form via transformation succeeds", () => {
    const p = P();
    const o = P("B");
    const base = unit("Arlia, Destined Trainee");
    p.active.push(base);
    p.hand.push("Mage Arlia", "Instructional Tome");
    expect(canAfford(p, base, "Mage Arlia", { named: "Instructional Tome" })).toBe(true);
    applyTransform(p, o, 3, base, "Mage Arlia", { named: "Instructional Tome" });
    expect(p.active[0].t.name).toBe("Mage Arlia");
    expect(p.hand).not.toContain("Instructional Tome"); // cost consumed
  });
});

describe("§9.7 Transformation gating", () => {
  it("destination must be in hand", () => {
    const p = P();
    const base = unit("Arlia, Destined Trainee");
    p.active.push(base);
    p.hand.push("Instructional Tome"); // dest NOT in hand
    expect(canAfford(p, base, "Mage Arlia", { named: "Instructional Tome" })).toBe(false);
  });

  it("respects the one-transformation-per-turn cap", () => {
    const p = P();
    const o = P("B");
    p.active.push(unit("Arlia, Destined Trainee"), unit("Kael, Destined Trainee"));
    p.hand.push("Mage Arlia", "Instructional Tome", "Swiftblade Kael", "Back-Alley Blade");
    greedyPolicy.transformAction(p, o, 3);
    const names = p.active.map((u) => u.t.name);
    expect(names).toContain("Mage Arlia");
    expect(names).toContain("Kael, Destined Trainee"); // not transformed this turn
    expect(p.hand).toContain("Swiftblade Kael");
  });

  it("Metamorphosis does NOT consume the transformation action", () => {
    const p = P();
    const o = P("B");
    const wild = unit("Bogfang"); // T1 Wild
    const arlia = unit("Arlia, Destined Trainee");
    p.active.push(wild, arlia);
    p.hand.push("Metamorphosis", "Embermaw", "Mage Arlia", "Instructional Tome");
    metamorph(p, o, 3, wild, "Embermaw"); // morph (no action used)
    greedyPolicy.transformAction(p, o, 3); // a real transform the same turn
    const names = p.active.map((u) => u.t.name).sort();
    expect(names).toContain("Embermaw");
    expect(names).toContain("Mage Arlia");
  });
});

describe("§9.8 Elemental math", () => {
  it("Fire vs Earth deals +10", () => {
    const a = P("A");
    const b = P("B");
    const fire = unit("Pyrnit"); // Fire ATK 30
    const earth = unit("Bogfang"); // Earth DEF 0, HP 30
    a.active.push(fire);
    b.active.push(earth);
    strike(a, fire, b, earth);
    expect(earth.hp).toBe(-10); // 30 - (30-0+10)
  });

  it("Light vs Dark deals +10", () => {
    const a = P("A");
    const b = P("B");
    const light = unit("Lumenkit"); // Light ATK 10
    const dark = unit("Sootcrawler"); // Dark DEF 0, HP 20
    a.active.push(light);
    b.active.push(dark);
    strike(a, light, b, dark);
    expect(dark.hp).toBe(0); // 20 - (10-0+10)
  });

  it("Dark ignores the first DEF check per turn vs a Light target, once", () => {
    const a = P("A");
    const b = P("B");
    const dark = unit("Sootcrawler"); // Dark ATK 20
    a.active.push(dark);
    const t1 = unit("Glimmermoth"); // Light DEF 20, HP 10
    const t2 = unit("Glimmermoth");
    b.active.push(t1, t2);
    a.dark_ignore_used = false;
    strike(a, dark, b, t1); // would be blocked (20<=20) but Dark pierces the first check
    expect(t1.hp).toBeLessThanOrEqual(0);
    strike(a, dark, b, t2); // second time this turn: no longer pierces -> blocked
    expect(t2.hp).toBe(10);
  });
});

describe("§9.9 Determinism", () => {
  it("same seed + decks => identical result", () => {
    const r1 = game(deckWar(), deckLoyalist(), mulberry32(123), greedyPolicy);
    const r2 = game(deckWar(), deckLoyalist(), mulberry32(123), greedyPolicy);
    expect(r1).toEqual(r2);
  });
});

describe("§9.10 Batch sanity", () => {
  it("win-rates sum to the game count with no crashes", async () => {
    const { runMatch } = await import("../src/sim/batch");
    const r = runMatch("War", "Loyalist", 60, 7);
    const total = Object.values(r.wins).reduce((x, y) => x + y, 0);
    expect(total).toBe(60);
    expect(r.avg).toBeGreaterThan(0);
  });

  it("all four decks play without throwing", async () => {
    const { DECKS, DECK_NAMES } = await import("../src/data/decks");
    for (const name of DECK_NAMES) {
      expect(() => game(DECKS[name](), DECKS.Wild(), mulberry32(5), greedyPolicy)).not.toThrow();
    }
  });
});
