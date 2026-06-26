// Core engine types. Pure data — no React/DOM.

export type Kind = "character" | "item" | "event";

export interface ChainDef {
  name: string;
  affil: string[];
  size: number; // minimum participants; for "2+" / "2-3" we store the floor
  mod: number; // flat damage rider (+30, +20, ...)
  active_only?: boolean;
  aoe?: boolean; // The Channel: (sum ATK ×2) to all non-chained, Disgrace on KO
}

export interface TransformCost {
  named?: string; // a specific item that must be in hand and is consumed
  items?: number; // N transform-fuel/equipment items consumed
  kills?: number; // banked kills required on the transforming unit
  need_war?: boolean; // a War must be in play
  disillusion?: boolean; // a Disillusioned card consumed
  taken_prisoner?: boolean; // gated behind an active War (Taken Prisoner road)
  requires_arlia?: boolean; // presence gate (approximated)
  t3_items?: number; // minimum T3 items in hand, ALL consumed on transform (The Ascended)
  plague_turns?: number; // unit must have been Plagued through N of your turns (Experiment climb)
}

export type TransformEdge = [dest: string, cost: TransformCost];

/** A tutor searches your deck for a matching card and adds it to hand. */
export type TutorSpec =
  | { kind: "transform_form" } // a form a character you control can transform into
  | { kind: "affil"; affils: string[]; discard?: number }; // a character sharing one of these affiliations; discard N as a cost

/** Cost to forge one item into a higher one. Always non-empty (forging always
 *  costs): `items` transform-fuel/equipment items consumed from hand. */
export interface ItemCost {
  items?: number;
  named?: string;
}

export type ItemEdge = [dest: string, cost: ItemCost];

/** Equipment / fuel / on-play item mechanical effect (the §6 text->primitive mapping). */
export interface EquipEff {
  atk?: number;
  deff?: number;
  maxhp?: number;
  water_atk?: number; // extra ATK if bearer's element includes Water
  fire_atk?: number; // extra ATK if bearer's element includes Fire
  war_atk?: number; // extra ATK while a War is in play
  goblinwar_atk?: number; // extra ATK while a Goblin War is in play (Goblin War-Banner)
  all?: number; // transform fuel: +N to all stats on the resulting form
  heal?: number; // on-play heal
  draw?: number; // on-play: draw N cards
  cannot_attack?: boolean;
  immune_wartorn?: boolean;
}

/** A character form. Stats come from the CSV; flags/upg/chain from the effects-map. */
export interface Card {
  name: string;
  elem: string;
  tier: number; // numeric tier; TBD tiers become NaN and the card is non-simulatable
  hp: number;
  atk: number;
  deff: number;
  affils: string[];
  abil: string[]; // engine flags (aura_mages, war_child, no_aura, ...)
  upg: TransformEdge[];
  chain: ChainDef | null;
  terminal: boolean;
  /** Entry trigger key (resolved in effects.ts): "dmg_mages","dmg_opp_active","heal_lowest". */
  entry?: string;
  simulatable: boolean; // false when stats are TBD/?? (browsable, not playable)
  // ----- printed/browse metadata (from the CSV) -----
  abilityName?: string;
  abilityText?: string;
  transformIn?: string;
  flavor?: string;
}

/** Printed info for items/events (browse layer). */
export interface CardInfo {
  name: string;
  kind: Kind;
  tier?: string; // printed "T1".."T3" or undefined
  type?: string; // raw Type line for items/events
  elem?: string;
  text?: string;
  flavor?: string;
  affils?: string;
}

// ----- runtime entities -----

export interface Equip {
  name: string;
  eff: EquipEff;
  zone: "active" | "passive";
  charged: boolean;
  link: Unit | null;
}

export interface Unit {
  t: Card;
  tier: number; // exposed on the Unit so Leader tier-bonus math never sees NaN (§9.1)
  maxhp: number;
  hp: number;
  kills: number;
  wartorn: boolean;
  leader: boolean;
  zone: "active" | "passive" | "leader";
  entered: number; // turn the unit (soul) entered play; persists across transforms
  mods: { atk: number; deff: number; hp: number }; // permanent buffs (fuel consumed in this form's transformation)
  movedThisTurn: boolean; // has this character repositioned between zones this turn (once/turn)
  shielded?: boolean; // Sanctuary: cannot be attacked until controller's next turn
  tempDef?: number; // Bulwark: temporary DEF until controller's next turn
  disillusioned?: boolean; // Disillusioned state (denies your auras; gates the wanderer transform)
  grantedChain?: ChainDef; // a chain granted by a consumed fuel item (Banner of the Realm)
  redirectUsed?: boolean; // Me for You: the once-per-opponent's-turn redirect has fired (reset each turn)
  seekerUsed?: boolean; // Seeker: this turn's top-of-deck reorder has been spent (reset each turn)
  plaguedTurns?: number; // count of your turns this body has begun while a Plague field is up (climb gate)
  fusions?: number; // Apex: creatures this body has absorbed via Fusion (grants reach at 2, leader-strike at 3)
}

export type PersistCard = string; // persistent events live in pcards as their name

export interface Player {
  name: string;
  deck: string[];
  hand: string[];
  active: Unit[];
  passive: Unit[];
  pcards: (Equip | PersistCard)[]; // equipment objects + persistent-event names
  events: Set<string>;
  eventZones: Record<string, "active" | "passive">; // which zone-slot each persistent event occupies (default passive)
  war_turns: Record<string, number>;
  leader: Unit | null;
  lockout: boolean;
  lose: boolean;
  transformedThisTurn: boolean; // the one-per-turn transform action has been spent
  extraTransforms?: number; // additional transform actions this turn (Opportunity)
  dark_ignore_used: boolean;
  skipCombat?: boolean; // a Truce is suppressing this player's next combat phase
  plagueField?: number; // count of Plague in play, mirrored onto BOTH players at cast (-10 Max HP each to non-immune)
  rnd: () => number;
}

export type EndReason = "leader" | "deckout" | "wiped" | "noleader" | "timeout";
export type GameResult = [winner: string, turn: number, why: EndReason];
