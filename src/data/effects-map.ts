// effects-map — the §6 layer that maps printed cards onto engine primitives.
//
// The CSVs are the source of truth for STATS, elements, tiers, affiliations,
// chains, and printed text. They do NOT encode the mechanical interpretation:
// which ability flags a character carries, the structured cost of each
// transformation, or the numeric effect of each item. That interpretation lives
// here, keyed by the card's canonical CSV name. This is mapping, not
// re-transcription — stats never appear in this file.
//
// TODO(v0.8): when Box ships v0.8, re-derive any of these that get printed onto
// the cards (e.g. machine-readable ability tags / transform costs).

import type { EquipEff, TransformCost } from "../engine/types";

// Engine flags per character (canonical CSV names). Cards absent here have none.
export const CHAR_FLAGS: Record<string, string[]> = {
  "Mage Arlia": ["aura_mages"],
  "Captain Arlia of the Royal Army": ["my_liege"],
  "King Honathan of Kaethlaan": ["aura_honathan", "leader_protect_royal"],
  "Kael the Shadow": ["honathan_buff", "hit_passive"],
  "The King's Blade": ["honathan_buff", "hit_leader", "draw_on_ko_if_honathan"],
  "Kael the Runaway": ["no_aura"],
  "Kael the Killer": ["blood_money", "no_aura"],
  "The Silent": ["hit_passive", "must_attack", "no_aura", "high_atk_bonus"],
  "Illyego, the Orphan": ["war_child", "no_aura"],
  "Illyego, the Soldier": ["war_child", "no_aura"],
  "Illyego, the Conqueror": ["war_child", "war_atk", "no_aura"],
  "Goblin Captain": ["aura_goblin"],
  "Old Maid Hresheeba": ["keeper_channel"],
  "A Man Bred for War": ["forged_in_chains"],
  "Murlifect": ["regrow"],
  "Craghide": ["regrow"],
  "The Acolyte Illyego": ["cannot_become_wartorn"],
  "Second in Command Kael": ["redirect_arlia"], // §6: approximated (no destroy/redirect cards exist)
};

// Entry trigger key per character (resolved in engine/effects.ts).
export const CHAR_ENTRY: Record<string, string> = {
  "Mage Arlia": "dmg_mages", // Unstable Resonance: 10 to each other Mages Guild char
  "Embermaw": "dmg_opp_active", // Searing Entry: 10 to one opposing active
  "Lumenkit": "heal_lowest",
  "Hollowed Stag": "heal_lowest",
};

// Structured transformation cost keyed by DESTINATION form. The graph topology
// (origin -> dest) is parsed from each destination's printed TransformIn in the
// CSV; this map supplies the cost that prose can't express precisely.
export const TRANSFORM_COST: Record<string, TransformCost> = {
  "Mage Arlia": { named: "Instructional Tome" },
  "Squire Arlia": { named: "Instructional Sword" },
  "Arlia, Youngest Archmage": { items: 2 },
  "Captain Arlia of the Royal Army": { items: 2 },
  "The Wandering Acolyte Arlia": { disillusion: true },
  "The Ascended": { items: 1 },
  "Swiftblade Kael": { named: "Back-Alley Blade" },
  "Kael the Shadow": {},
  "The King's Blade": {},
  "Kael the Captured": { taken_prisoner: true },
  "Kael the Runaway": {},
  "Kael the Killer": {},
  "The Silent": {},
  "Illyego, the Soldier": { need_war: true },
  "Illyego, the Conqueror": { kills: 3 },
  "The Acolyte Illyego": { disillusion: true },
  "Goblin Lieutenant": {},
  "Goblin Captain": {},
  "Lor'oak Goblin Commander": {},
  "Old Maid Hresheeba": {},
  "Second in Command Kael": { requires_arlia: true },
};

// Play-permission for non-T1 standalones: minimum OTHER board characters required
// (§5.1; King Honathan's "control 2+ other Kaethlaan characters", approximated).
export const CHAR_PLAY: Record<string, number> = {
  "King Honathan of Kaethlaan": 2,
};

// ----- item mechanical effects (the printed Text -> numeric primitive) -----

export const EQUIP: Record<string, EquipEff> = {
  "Instructional Tome": { atk: 10 },
  "Instructional Sword": { atk: 10 },
  "Back-Alley Blade": { atk: 10 },
  "Twin Daggers": { atk: 10, deff: 10 },
  "Tidecaller's Pearl": { atk: 20, water_atk: 10 },
  "Tower Shield": { deff: 20, atk: -10 },
  "Vital Charm": { maxhp: 20, atk: -10 },
  "Berserker's Brand": { atk: 30, deff: -20 },
  "Aegis Plate": { deff: 40, maxhp: 20, atk: -20, cannot_attack: true },
  "Warmonger's Resolve": { war_atk: 20 },
  "Unbroken Will": { immune_wartorn: true },
};

export const FUEL: Record<string, EquipEff> = {
  Whetstone: { atk: 10 },
  Buckler: { deff: 10 },
  "Warlord's Spoils": { all: 10 },
};

export const ONPLAY: Record<string, EquipEff> = {
  "Field Rations": { heal: 10 },
};

// Persistent events that occupy a passive slot.
export const PERSIST: Set<string> = new Set([
  "War",
  "Holy War",
  "Goblin War",
  "Taken Prisoner",
  "Disillusioned",
  "Rally to War",
  "Crusade",
  "Horde Frenzy",
  "Hardened Veterans",
  "The Broken March",
]);

// Printed play-conditions on equipment (e.g. Warmonger's Resolve needs a War).
export const EQUIP_REQUIRES_WAR: Set<string> = new Set(["Warmonger's Resolve"]);

export const T2ITEMS: Set<string> = new Set([...Object.keys(EQUIP), ...Object.keys(FUEL)]);
