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

import type { ChainDef, EquipEff, ItemCost, TransformCost, TutorSpec } from "../engine/types";

// Cards that confer the Disillusioned state (attach to one of your characters). Any of
// them satisfies a chosen-branch / wanderer transform gate (Ruleset: "Disillusioned is a
// STATE; other events that confer it satisfy the same condition").
export const DISILLUSION_SOURCES: Set<string> = new Set(["Disillusioned", "A Crisis of Faith", "Cast Out"]);

// A chain granted to the resulting form when a fuel item is consumed in a transformation.
export const FUEL_GRANTED_CHAIN: Record<string, ChainDef> = {
  "Banner of the Realm": { name: "Rally", affil: ["Kaethlaan Knights"], size: 2, mod: 0 }, // sum of ATK
};

// Tutors: one-shot cards that search your deck for a matching card and add it to
// hand. The War-deck consistency package — they assemble the climb instead of
// hoping the next form is drawn in time.
export const TUTOR: Record<string, TutorSpec> = {
  "Field Promotion": { kind: "transform_form" }, // fetch the next form for a non-Wild body you control (Wilds advance only via Metamorphosis)
  "War Effort": { kind: "affil", affils: ["Destined", "Faithless"] }, // fetch a Kael or Illyego character
  // One affiliation tutor per archetype that lacked one (each parallels War Effort:
  // affiliation-locked, slot cost). Affil strings are post-normAffil ("The " stripped).
  "Warren Muster": { kind: "affil", affils: ["Goblin"] }, // Goblin deck consistency
  "Call of the Wild": { kind: "affil", affils: ["Wild"] }, // Wild deck — assemble the T2 terminal to morph into
  "Conscription Order": { kind: "affil", affils: ["Royal Army"] }, // Loyalist Royal Army climb
  // Already in canon (Sigil Events.csv) but never wired up. Discard 1 is its printed cost.
  "Call of the Channel": { kind: "affil", affils: ["Divine Channel"], discard: 1 },
  "Patient Intake": { kind: "affil", affils: ["O'Donner Research", "Plagued"] }, // Plague character tutor
};

// Engine flags per character (canonical CSV names). Cards absent here have none.
export const CHAR_FLAGS: Record<string, string[]> = {
  "Mage Arlia": ["aura_mages"],
  // my_liege carries both the +30/+30 (with Honathan) AND the manipulation-immunity /
  // can't-change-control clauses (the latter are inert — no manipulation cards exist; see protection.ts).
  "Captain Arlia of the Royal Army": ["my_liege", "manip_immune"],
  // Squire Arlia (Me for You) and Second in Command Kael (At Her Side) — bodyguard redirect (combat.ts).
  "Squire Arlia": ["redirect_meforyou"],
  // Magical Shield: negate-and-destroy a destroying effect aimed at your cards. Inert — no destroy
  // cards exist yet, though the ruleset now permits them (protection.ts honors it when one is added).
  "Arlia, Youngest Archmage": ["magical_shield"],
  // Seeker: once/turn look at top 3 of your deck and reorder (effects.ts seekerReorder; ai.ts trySeeker).
  "The Wandering Acolyte Arlia": ["seeker"],
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
  "Goblin Standard-Bearer": ["aura_warband"], // scaling horde anthem: +10 ATK/DEF per 3 Goblins (stats.ts)
  "Krakos, Goblin Archer": ["hit_passive"], // Goblin ranged body — backline reach, like Kaethlaan Archer
  "Old Maid Hresheeba": ["keeper_channel", "aura_channel"], // +10 ATK to your Divine Channel (DC archetype payoff)
  "A Man Bred for War": ["forged_in_chains"],
  "Murlifect": ["regrow"],
  "Craghide": ["regrow"],
  "The Acolyte Illyego": ["cannot_become_wartorn"],
  "Second in Command Kael": ["redirect_atherside"], // At Her Side: redirect attacks at Arlia to him; +10/+10 while you control Arlia
  // ----- new Kaethlaan roster -----
  "Brutal Fighter Strango": ["forged_in_chains"], // enters War-Torn (affil) but fights through it, +20
  "Kaethlaan Archer": ["hit_passive"],
  "Kaethlaan Sniper": ["hit_passive", "high_atk_bonus"],
  "Thomas the Brave": ["cannot_become_wartorn"], // too brave to be captured
  // ----- Channelian Church (4 named Hierophants replace the retired generic one) -----
  "Hierophant Vossuth": ["keeper_channel"], // ordained chain-keeper (the institution's version of Hresheeba's innate keeping)
  "Hierophant Maredd": ["aura_church_def"], // +20 DEF to your Channelian Church
  "Hierophant Ysmene": ["aura_church_atk", "aura_suppress_natural"], // +10 ATK Church, -10 ATK to natural channelers
  "St. Faechious": ["aura_faechious"], // unites the wings: +20 ATK to ALL your Divine Channel; overrides Ysmene's suppression
  // ----- Plague / O'Donner Research (PRE-SIM approximation; Experiment 2615 conditionals,
  //        Venner's lock chain, Plagued-spread, and Plague-duration transforms are STUBBED) -----
  "Seremin the Sickly": ["plague_immune"],
  "Seremin the Plaguebearer": ["plague_immune", "plagued_def_40"],
  "Patient Zero Seremin": ["plague_immune", "plagued_def_60", "bears_any_tier"],
  "Experiment 2615": ["plague_immune"],
  "Experiment 4432, Stage 2": ["plague_immune", "must_attack"],
  "Experiment 4423A, Stage 2": ["plague_immune", "must_attack"],
  "Chris O'Donner": ["plague_immune", "aura_odonner"], // +20 ATK to your O'Donner Research
  "Dr. Mark Poultrain": ["aura_plagued_def"], // +30 DEF to your Plagued
};

/** Kaethlaan-sphere affiliations — membership for Banner / Close the Gates / Reinforce. */
export const KAETHLAAN_AFFILS: Set<string> = new Set([
  "Kaethlaan",
  "Royal Army",
  "Mages Guild",
  "Divine Channel",
  "Kaethlaan Knights",
  "King's Court (Kaethlaan)",
  "King's Court",
]);

// Entry trigger key per character (resolved in engine/effects.ts).
export const CHAR_ENTRY: Record<string, string> = {
  "Mage Arlia": "dmg_mages", // Unstable Resonance: 10 to each other Mages Guild char
  "Embermaw": "dmg_opp_active", // Searing Entry: 10 to one opposing active
  "Lumenkit": "heal_lowest",
  "Hollowed Stag": "heal_lowest",
  "Channel Adept": "heal_lowest", // Channeled Mending
  "Hierophant Calyx": "heal_lowest", // Anointing Rite (entry heal 10)
  "Seremin the Sickly": "bring_plague", // the carrier plays Plague from hand/deck on entry (turn-1 enabler)
};

// Transformation gates keyed by DESTINATION form. Items are NEVER a gate — every
// character transforms naturally (origin in play + destination in hand); fuel only
// *accelerates* (buffs the result, see transform.ts). The ONLY gates are the
// genuine card conditions: a state, a milestone, a presence. Anything not listed
// here transforms freely along its printed lineage.
export const TRANSFORM_COST: Record<string, TransformCost> = {
  "The Wandering Acolyte Arlia": { disillusion: true }, // must be Disillusioned
  "The Acolyte Illyego": { disillusion: true },
  "Kael the Captured": { taken_prisoner: true }, // captured during a War
  "Illyego, the Soldier": { need_war: true }, // conscripted only during a War
  "Illyego, the Conqueror": { kills: 3 }, // must have banked 3 kills
  "Second in Command Kael": { requires_arlia: true }, // while you control Arlia
  "The Ascended": { t3_items: 1 }, // needs ≥1 T3 item; ALL T3 items consumed → stats = count×20
  // Plague-duration: the experiment can only mutate to its mindless Stage 2 after it has been
  // Plagued through 2 of your turns (plaguedTurns accrues in startOfTurn while Plague is up).
  "Experiment 4432, Stage 2": { plague_turns: 2 },
  "Experiment 4423A, Stage 2": { plague_turns: 2 },
};

// Play-permission for non-T1 standalones: minimum OTHER board characters required
// (§5.1; King Honathan's "control 2+ other Kaethlaan characters", approximated).
export const CHAR_PLAY: Record<string, number> = {
  "King Honathan of Kaethlaan": 2,
  // §5.1 follow-up (balance log Round 1): A Man Bred for War was uncastable (T3, no
  // base form, no permission). Granting a standalone permission — castable as a T3
  // body (turn-3+ via the tier gate). Thematically "bred for war," no presence needed.
  "A Man Bred for War": 0,
};

// Play-gate for the Plague bodies that have no T1 base: they require the O'Donner Research
// Lab in play (the facility deploys its subjects) — the doctors additionally require Plague
// to be in effect (their printed condition). This is the REAL gate, not a free hard-cast; it
// forces the slow setup (climb Sickly -> Plaguebearer T2 -> lay Lab + Plague -> only THEN
// deploy experiments/doctors/Chris), instead of dumping big bodies on turn 2.
export const CHAR_PLAY_GATE: Record<string, { lab?: boolean; plague?: boolean }> = {
  // Experiments are Plague-spawned mutants — they deploy once Plague is in play (no Lab needed).
  "Experiment 4432, Stage 1": { plague: true },
  "Experiment 4423A, Stage 1": { plague: true },
  // The doctors carry the printed full gate; Chris requires the Lab (his printed condition).
  "Dr. Abigail Venner": { lab: true, plague: true },
  "Dr. Mark Poultrain": { lab: true, plague: true },
  "Chris O'Donner": { lab: true },
};

// ----- item mechanical effects (the printed Text -> numeric primitive) -----

export const EQUIP: Record<string, EquipEff> = {
  "Instructional Tome": { atk: 10 },
  "Instructional Sword": { atk: 10 },
  "Back-Alley Blade": { atk: 10 },
  "Twin Daggers": { atk: 10, deff: 10 },
  "Tidecaller's Pearl": { atk: 20, water_atk: 10 },
  "Staff of Aelion": { atk: 20, fire_atk: 10 }, // Fire analog to Tidecaller's Pearl
  "Carrion Blade": { atk: 10 },
  "Feliefnir": { maxhp: 30, atk: 30, deff: 10 }, // stat part; "untargetable by opponent's equip effects" → protection.ts (inert: no opposing equip targets another card)
  "Goblin War-Banner": { atk: 10, goblinwar_atk: 20 }, // +10, or +30 (instead) while a Goblin War is in play
  "Sanctified Blade": { atk: 10 }, // +10; Light-only bearer + Holy-War anti-Dark targeting (see combat.ts / ITEM_BEARER_ELEM)
  "Tower Shield": { deff: 20, atk: -10 },
  "Vital Charm": { maxhp: 20, atk: -10 },
  "Berserker's Brand": { atk: 30, deff: -20 },
  "Aegis Plate": { deff: 40, maxhp: 20, atk: -20, cannot_attack: true },
  "Warmonger's Resolve": { war_atk: 20 },
  "Unbroken Will": { immune_wartorn: true },
  // ----- signature weapons reached by item forging (§ item-transformation) -----
  "Kael's Tarnished Blade": { atk: 10 },
  "Kael's Honed Blade": { atk: 20, deff: 10 },
  "Reaver's Edge": { atk: 40, deff: 10, war_atk: 10 },
  "Arlia's Lance": { atk: 20, deff: 10 },
  "Lance of the Archmage": { atk: 40, deff: 10 },
  "Khaneris Sword": { atk: 20, deff: 10 },
  "The Great Sword of Khaneris": { atk: 40, deff: 20 },
  // generic forge ladders (any bearer): offense + defense
  "Rough Blade": { atk: 10 },
  "Tempered Edge": { atk: 20, deff: 10 },
  "Masterwork Blade": { atk: 40, deff: 10 },
  "Round Shield": { deff: 10 }, // forges into the existing Tower Shield → Aegis Plate ladder
  // Goblin archetype ladder (Goblin bearers)
  "Goblin Shiv": { atk: 10 },
  "Goblin Cleaver": { atk: 20, deff: 10 },
  "Warboss' Maul": { atk: 40, deff: 10 },
  // Kaethlaan equipment
  "Kaethlaan Banner": { deff: 10 }, // + grants an army-wide Kaethlaan aura (see aura_kaethlaan)
  "Kaethlaan Bow": { atk: 20 },
  "Kaethlaan Broadsword": { atk: 20, deff: 10 },
};

/** Items restricted to a bearer of a given affiliation (vs name-substring signatures). */
export const ITEM_BEARER_AFFIL: Record<string, string> = {
  "Kaethlaan Banner": "Kaethlaan", // Kaethlaan-sphere bearers only (matched via KAETHLAAN_AFFILS)
  "Goblin War-Banner": "Goblin", // equip only to a Goblin character
};

/** Items restricted to a bearer whose ELEMENT includes the given component. */
export const ITEM_BEARER_ELEM: Record<string, string> = {
  "Sanctified Blade": "Light", // equip only to a Light character
};

// Item forging cost, keyed by the DESTINATION item (the graph topology — which item
// forges into which — is parsed from each destination's printed `TransformIn` in the
// CSV, exactly like character transforms). Every forge ALWAYS pays a cost (locked
// design rule): `items` = N transform-fuel/equipment items consumed from hand.
export const ITEM_TRANSFORM_COST: Record<string, ItemCost> = {
  "Aegis Plate": { items: 1 }, // forge up from Tower Shield
  "Kael's Honed Blade": { items: 1 },
  "Reaver's Edge": { items: 2 },
  "Lance of the Archmage": { items: 2 },
  "The Great Sword of Khaneris": { items: 2 },
  "Tempered Edge": { items: 1 },
  "Masterwork Blade": { items: 2 },
  "Tower Shield": { items: 1 }, // forge up from Round Shield
  "Goblin Cleaver": { items: 1 },
  "Warboss' Maul": { items: 2 },
};

// Signature items that may only be borne by a matching character (substring match on
// the character's name). Flavour + a soft archetype lock.
export const ITEM_BEARER_INCLUDES: Record<string, string> = {
  "Kael's Tarnished Blade": "Kael",
  "Kael's Honed Blade": "Kael",
  "Reaver's Edge": "Kael",
  "Arlia's Lance": "Arlia",
  "Lance of the Archmage": "Arlia",
  "Goblin Shiv": "Goblin",
  "Goblin Cleaver": "Goblin",
  "Warboss' Maul": "Goblin",
};

// Items that bypass the tier gate (item tier ≤ bearer tier). Empty for now, but the
// hook exists for "special" grandfathered weapons / a War-deck "bears any tier" payoff.
export const ITEM_ANY_TIER: Set<string> = new Set();

export const FUEL: Record<string, EquipEff> = {
  Whetstone: { atk: 10 },
  Buckler: { deff: 10 },
  "Apprentice's Grimoire": { atk: 10 }, // T1 fuel: resulting form enters +10 ATK
  "Squire's Oathblade": { deff: 10 }, // T1 fuel: resulting form enters +10 DEF
  "Archmage's Focus": { atk: 20 }, // T2 fuel: +20 ATK on the resulting form
  "Relic of the Forsaken": { all: 10 }, // T3 fuel: +10 all (also the food The Ascended consumes)
  "Banner of the Realm": { all: 0 }, // T3 fuel; its printed "grants the Rally chain" rider is a TODO (chain-grant on transform not modeled)
  "Warlord's Spoils": { all: 10 },
  "Royal Warrant": {}, // wild transform fuel: substitutes for any required NAMED item (Kael/Arlia gates)
};

export const ONPLAY: Record<string, EquipEff> = {
  "Field Rations": { heal: 10 },
  "Reinforce the Front Lines": { heal: 20 }, // reinforce a Kaethlaan unit
  "Reagent Pouch": { draw: 1 }, // draw a card on play (NOTE: the greedy board-eval AI rarely values pure card draw)
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
  "Close the Gates", // Kaethlaan units immune to War attrition
  "War College", // your Royal Army characters transform for 1 fewer item (NOTE: no-op — transforms are free in this engine; see audit)
  "The Long Road", // HoT on a Disillusioned/Wandering bearer (heals 10/turn in startOfTurn)
  "Plague", // world-state -10 Max HP, both sides (mirrored field; see stats.effMaxhp + ai.tryPlagueEngine)
  "Medical Advancement", // +10 Max HP, your side
  "O'Donner Research Lab", // +30 Max HP to your O'Donner Research (the Plague engine anchor)
  "The Open Channel", // DC-locked persistent tutor: start of turn, call a next-form to hand (effects.ts startOfTurn)
  "Seeping Doubt", // repeatable coin-flip Disillusioned source (effects.ts startOfTurn)
]);

// Printed play-conditions on equipment (e.g. Warmonger's Resolve needs a War).
export const EQUIP_REQUIRES_WAR: Set<string> = new Set(["Warmonger's Resolve"]);

export const T2ITEMS: Set<string> = new Set([...Object.keys(EQUIP), ...Object.keys(FUEL)]);
