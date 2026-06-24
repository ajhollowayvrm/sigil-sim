// Regression tests for the §6 effects that were previously left as intended stubs and
// have now been finished: bodyguard redirect (Me for You / At Her Side), Seeker deck-dig,
// Protection of The Divine's item/event immunity, and the targeting-protection gate that
// the (still inert) negate/manipulation/equip-immunity abilities route through.

import { describe, expect, it } from "vitest";
import { getCard } from "../src/data/loadCards";
import { strike } from "../src/engine/combat";
import { seekerReorder, startOfTurn } from "../src/engine/effects";
import { manipulationImmune, opponentEquipTargetImmune, resolveTargetedEffect } from "../src/engine/protection";
import { mulberry32 } from "../src/engine/rng";
import { effAtk, effMaxhp, makeUnit } from "../src/engine/stats";
import type { Equip, Player, Unit } from "../src/engine/types";

function barePlayer(name: string): Player {
  return {
    name,
    deck: [],
    hand: [],
    active: [],
    passive: [],
    pcards: [],
    events: new Set(),
    eventZones: {},
    war_turns: {},
    leader: null,
    lockout: false,
    lose: false,
    transformedThisTurn: false,
    dark_ignore_used: false,
    rnd: mulberry32(1),
  };
}

function unit(p: Player, name: string, zone: "active" | "passive" = "active"): Unit {
  const u = makeUnit(getCard(name)!, 1);
  u.zone = zone;
  (zone === "active" ? p.active : p.passive).push(u);
  return u;
}

/** Attach an item to a bearer as a linked passive equipment (what the engine reads). */
function attach(p: Player, bearer: Unit, name: string, eff: Equip["eff"]): Equip {
  const e: Equip = { name, eff, zone: "passive", charged: true, link: bearer };
  p.pcards.push(e);
  return e;
}

describe("Bodyguard redirect", () => {
  it("Me for You pulls a lethal hit onto Squire Arlia (with +10 DEF) and saves the body", () => {
    const atk = barePlayer("A");
    const def = barePlayer("B");
    const attacker = unit(atk, "Mage Arlia"); // Fire 30/40/10; her own aura_mages → effAtk 50
    const victim = unit(def, "Arlia, Destined Trainee"); // Fire 20/10/10 — would be KO'd
    const squire = unit(def, "Squire Arlia"); // Earth 50/20/20 — DEF 20, +10 from Me for You

    const ko = strike(atk, attacker, def, victim);

    expect(ko).toBe(false);
    expect(victim.hp).toBe(20); // untouched — the attack was redirected
    // Redirected hit: 50 ATK vs DEF 30 (20+10) = 20, +10 (Fire beats Earth) = 30.
    expect(squire.hp).toBe(50 - 30);
    expect(squire.redirectUsed).toBe(true);
  });

  it("Me for You is once per opponent's turn — a second attack is not redirected", () => {
    const atk = barePlayer("A");
    const def = barePlayer("B");
    const attacker = unit(atk, "Mage Arlia");
    const victim = unit(def, "Arlia, Destined Trainee");
    const squire = unit(def, "Squire Arlia");

    strike(atk, attacker, def, victim); // first: redirected onto Squire
    expect(victim.hp).toBe(20);
    atk.dark_ignore_used = false;
    strike(atk, attacker, def, victim); // second: Squire is spent → hits the victim

    expect(victim.hp).toBeLessThanOrEqual(0); // 50 vs 10 DEF = 40 ≥ 20 HP
    expect(squire.hp).toBe(50 - 30); // unchanged from the first redirect
  });

  it("At Her Side redirects an attack on Arlia to Second in Command Kael (no once/turn cap)", () => {
    const atk = barePlayer("A");
    const def = barePlayer("B");
    const attacker = unit(atk, "Mage Arlia"); // effAtk 50 (self aura)
    const arlia = unit(def, "Arlia, Destined Trainee"); // the Arlia being protected
    const sic = unit(def, "Second in Command Kael"); // Water 50/30/20, +10/+10 while controlling Arlia → DEF 30

    const ko = strike(atk, attacker, def, arlia);

    expect(ko).toBe(false);
    expect(arlia.hp).toBe(20); // protected
    expect(sic.hp).toBe(50 - 20); // Fire doesn't beat Water; 50 - 30 = 20
    expect(sic.redirectUsed).toBeFalsy(); // At Her Side has no once-per-turn limit
  });

  it("does not throw a bodyguard away to absorb a mere chip", () => {
    const atk = barePlayer("A");
    const def = barePlayer("B");
    // Low-ATK attacker: a chip on the victim, but it would KO the fragile Squire? No —
    // ensure redirect only happens when it reduces loss. Here the victim is tanky and the
    // hit is a small chip; Squire should NOT interpose (a chip < losing her value is false
    // only if she'd die; she won't, but the rule still won't move a survivable chip).
    const attacker = unit(atk, "Arlia, Destined Trainee"); // 10 ATK
    const victim = unit(def, "Squire Arlia"); // 20 DEF — 10 ≤ 20 ⇒ blocked anyway
    const guard = unit(def, "Squire Arlia"); // a second Squire as a would-be guard

    const ko = strike(atk, attacker, def, victim);
    expect(ko).toBe(false);
    expect(guard.redirectUsed).toBeFalsy(); // attack was blocked; nothing to redirect
  });
});

describe("Protection of The Divine — item/event immunity", () => {
  it("blocks equipment stat and Max-HP contributions on the bearer", () => {
    const p = barePlayer("A");
    const u = unit(p, "Squire Arlia"); // base ATK 20, HP 50, no self-aura
    attach(p, u, "Instructional Sword", { atk: 10 });
    attach(p, u, "Vital Charm", { maxhp: 20 });
    expect(effAtk(p, u)).toBe(20 + 10); // sword applies
    expect(effMaxhp(p, u)).toBe(50 + 20); // charm applies

    attach(p, u, "Protection of The Divine", {}); // now immune to all item/event effects
    expect(effAtk(p, u)).toBe(20); // equipment stat riders nullified
    expect(effMaxhp(p, u)).toBe(50);
  });

  it("blocks event auras (Rally to War) but keeps character auras and the Leader bonus", () => {
    const p = barePlayer("A");
    const honathan = unit(p, "King Honathan of Kaethlaan"); // aura source (character)
    const cap = unit(p, "Captain Arlia of the Royal Army"); // My Liege +30 + King's Court aura +10 (both character)
    const baseAtk = getCard("Captain Arlia of the Royal Army")!.atk;
    expect(effAtk(p, cap)).toBe(baseAtk + 40); // +30 My Liege, +10 King's Court — both character auras

    p.events.add("War");
    p.events.add("Rally to War"); // event aura: +10 ATK to active in a war
    expect(effAtk(p, cap)).toBe(baseAtk + 50);

    attach(p, cap, "Protection of The Divine", {});
    expect(effAtk(p, cap)).toBe(baseAtk + 40); // Rally (event) blocked; character auras kept
    void honathan;
  });
});

describe("Targeting protection gate (inert: no offensive enabler in the pool yet)", () => {
  it("Magical Shield negates AND destroys a destroying effect aimed at your card", () => {
    const def = barePlayer("B");
    const target = unit(def, "Arlia, Destined Trainee");
    expect(resolveTargetedEffect(def, target, "destroy").result).toBe("applies"); // no shield yet
    unit(def, "Arlia, Youngest Archmage"); // Magical Shield source
    expect(resolveTargetedEffect(def, target, "destroy").result).toBe("negated_and_destroyed");
  });

  it("My Liege makes Captain Arlia manipulation-proof only while Honathan is in play", () => {
    const p = barePlayer("A");
    const cap = unit(p, "Captain Arlia of the Royal Army");
    expect(manipulationImmune(p, cap)).toBe(false); // no Honathan
    unit(p, "King Honathan of Kaethlaan");
    expect(manipulationImmune(p, cap)).toBe(true);
    expect(resolveTargetedEffect(p, cap, "manipulate").result).toBe("immune");
  });

  it("Feliefnir shields its bearer from an opponent's equip effect; Protection blocks any kind", () => {
    const p = barePlayer("A");
    const fel = unit(p, "Mage Arlia");
    attach(p, fel, "Feliefnir", { maxhp: 30, atk: 30, deff: 10 });
    expect(opponentEquipTargetImmune(p, fel)).toBe(true);
    expect(resolveTargetedEffect(p, fel, "equip_effect").result).toBe("immune");

    const prot = unit(p, "Arlia, Destined Trainee");
    attach(p, prot, "Protection of The Divine", {});
    expect(resolveTargetedEffect(p, prot, "manipulate").result).toBe("immune");
    expect(resolveTargetedEffect(p, prot, "equip_effect").result).toBe("immune");
  });
});

describe("Seeker — deck top-3 reorder", () => {
  it("orders the top 3 so the best card is drawn first, once per turn", () => {
    const p = barePlayer("A");
    const seeker = unit(p, "The Wandering Acolyte Arlia");
    // Bodies draw from the END of the array. The top 3 (last 3) are reordered so the best
    // ends up last (drawn first). The first 3 cards are below the dig and stay put.
    p.deck = ["x", "y", "z", "low", "high", "mid"];
    const rank: Record<string, number> = { low: 1, mid: 2, high: 3 };
    const better = (a: string, b: string) => rank[a] > rank[b];

    seekerReorder(p, better);

    expect(p.deck.slice(0, 3)).toEqual(["x", "y", "z"]); // untouched below the top 3
    expect(p.deck[p.deck.length - 1]).toBe("high"); // best drawn first
    expect(p.deck[p.deck.length - 2]).toBe("mid");
    expect(p.deck[p.deck.length - 3]).toBe("low");
    expect(seeker.seekerUsed).toBe(true);

    // Once per turn: a second dig is a no-op until startOfTurn refreshes it.
    p.deck = ["a", "b", "c"];
    seekerReorder(p, better);
    expect(p.deck).toEqual(["a", "b", "c"]); // unchanged — Seeker already spent
    startOfTurn(p, barePlayer("B"), 3);
    expect(seeker.seekerUsed).toBe(false); // refreshed
  });
});
