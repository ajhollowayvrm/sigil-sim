// Elemental wheel + Light/Dark interactions (Ruleset §Synergies/Element).
//   Fire > Earth > Wind > Water > Fire  (+10 on attack when the matchup favors)
//   Light +10 vs Dark
//   Dark ignores the first DEF check per turn vs a Light target
// Hybrid elements ("Dark & Light") count as ALL their components.

export const PHYS: Record<string, string> = {
  Fire: "Earth",
  Earth: "Wind",
  Wind: "Water",
  Water: "Fire",
};

/** Split a (possibly hybrid) element into its component elements. */
export function comps(e: string): string[] {
  return e.split(" & ");
}

/** True if the attacking element beats the defending element (physical wheel or Light>Dark). */
export function beats(att: string, deff: string): boolean {
  for (const ae of comps(att)) {
    for (const de of comps(deff)) {
      if (PHYS[ae] === de) return true;
      if (ae === "Light" && de === "Dark") return true;
    }
  }
  return false;
}

/** True if attacker is (or includes) Dark and defender is (or includes) Light. */
export function darkVsLight(att: string, deff: string): boolean {
  return comps(att).includes("Dark") && comps(deff).includes("Light");
}
