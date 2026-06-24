// Targeting protection — the defensive half of the negate / immunity abilities.
//
// These abilities REACT to an opponent destroying, manipulating, or equip-targeting one
// of your cards. The Sigil pool prints the shields (Magical Shield, Feliefnir, My Liege,
// Protection of The Divine) but — as of now — prints NO card that destroys, manipulates,
// or targets another card with an equip effect. So these predicates are correct but
// currently INERT: nothing in any deck triggers them. They are not faked (CLAUDE.md §6) —
// they are the real rule, wired through one gate so that the day a destroy/manipulation
// card is designed, it routes through `resolveTargetedEffect` and the shields just work.
// The unit tests exercise this gate with a synthetic source to prove the logic.
//
// Pure — no React/DOM.

import { chars, immuneItemEvent, linkedEquips } from "./stats";
import type { Player, Unit } from "./types";

const has = (arr: string[], x: string) => arr.includes(x);

/** Manipulation-proof: My Liege (Captain Arlia, only while King Honathan is in play) or a
 *  Protection of The Divine bearer (manipulation arrives as an item/event effect). */
export function manipulationImmune(p: Player, u: Unit): boolean {
  if (immuneItemEvent(p, u)) return true;
  return has(u.t.abil, "manip_immune") && chars(p).some((x) => has(x.t.abil, "aura_honathan"));
}

/** Cannot change control — My Liege's companion clause (same condition as manipulation immunity). */
export function controlLocked(p: Player, u: Unit): boolean {
  return manipulationImmune(p, u);
}

/** Shielded from an OPPONENT's equipped-card effect: Feliefnir's bearer, or a Protection
 *  of The Divine bearer (immune to all item effects). */
export function opponentEquipTargetImmune(p: Player, u: Unit): boolean {
  if (immuneItemEvent(p, u)) return true;
  return linkedEquips(p, u).some((e) => e.name === "Feliefnir");
}

/** A Magical Shield source (Arlia, Youngest Archmage) controlled by `p`, if any. It negates
 *  AND destroys a destroying effect aimed at a card `p` controls. */
export function magicalShieldSource(p: Player): Unit | null {
  return chars(p).find((u) => has(u.t.abil, "magical_shield")) ?? null;
}

export type EffectKind = "destroy" | "manipulate" | "equip_effect";

export type EffectOutcome =
  | { result: "applies" }
  | { result: "immune"; by: string }
  | { result: "negated_and_destroyed"; by: Unit };

/** The single gate every opponent-targeting effect should route through. `defP` controls
 *  `target`; `kind` is what the opponent's source is trying to do. Returns whether the
 *  effect applies, is blocked by an immunity, or is negated-and-destroyed by a Magical
 *  Shield (the caller then destroys the source). Pure decision — performs no mutation.
 *  No card invokes this yet; it is the forward hook (and is unit-tested). */
export function resolveTargetedEffect(defP: Player, target: Unit, kind: EffectKind): EffectOutcome {
  if (kind === "destroy") {
    const shield = magicalShieldSource(defP);
    if (shield) return { result: "negated_and_destroyed", by: shield };
  }
  if (kind === "manipulate" && manipulationImmune(defP, target)) return { result: "immune", by: "manipulation immunity" };
  if (kind === "equip_effect" && opponentEquipTargetImmune(defP, target))
    return { result: "immune", by: "equip-target immunity" };
  // Protection of The Divine blocks any remaining item/event-sourced targeted effect.
  if (immuneItemEvent(defP, target)) return { result: "immune", by: "Protection of The Divine" };
  return { result: "applies" };
}
