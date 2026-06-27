// effects-map — the §6 layer that maps printed cards onto engine primitives.
//
// As of the campaign rewrite, the per-card mechanical interpretation lives in
// src/data/cards.json (the card canon the Admin editor owns; seeded into the
// DynamoDB card DB). This module DERIVES the lookup tables the engine expects
// from that JSON, so engine code keeps importing the same names unchanged.
//
// The one thing that stays hand-written here is KAETHLAAN_AFFILS — it is a
// cross-cutting RULE constant (a set of affiliation strings), not per-card data.
//
// To change a card's flags / transform cost / item effect, edit cards.json (or
// the live card DB) — not this file. Regenerate the seed via `npm run migrate-cards`.

import type { ChainDef, EquipEff, ItemCost, TransformCost, TutorSpec } from "../engine/types";
import rawDb from "./cards.json";

interface RawCard {
  Name: string;
  flags?: string[];
  entry?: string;
  transformCost?: TransformCost;
  playPermissionMin?: number;
  playGate?: { lab?: boolean; plague?: boolean };
  equip?: EquipEff;
  fuel?: EquipEff;
  onplay?: EquipEff;
  persist?: boolean;
  bearerInclude?: string;
  bearerAffil?: string;
  bearerElem?: string;
  itemTransformCost?: ItemCost;
  anyTier?: boolean;
  requiresWar?: boolean;
  fuelGrantedChain?: ChainDef;
  tutor?: TutorSpec;
  disillusionSource?: boolean;
}
interface CardDb {
  version: number;
  characters: RawCard[];
  items: RawCard[];
  events: RawCard[];
}

const db = rawDb as unknown as CardDb;
const nm = (c: RawCard) => c.Name.trim();
const itemsAndEvents = [...db.items, ...db.events];

// ---- helpers to build a Record / Set from a per-card field ----
function record<T>(cards: RawCard[], pick: (c: RawCard) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  for (const c of cards) {
    const v = pick(c);
    if (v !== undefined) out[nm(c)] = v;
  }
  return out;
}
function nameSet(cards: RawCard[], pick: (c: RawCard) => boolean): Set<string> {
  const out = new Set<string>();
  for (const c of cards) if (pick(c)) out.add(nm(c));
  return out;
}

/** Kaethlaan-sphere affiliations — membership for Banner / Close the Gates / Reinforce.
 *  RULE constant (about affiliations, not a single card), so it stays hand-written. */
export const KAETHLAAN_AFFILS: Set<string> = new Set([
  "Kaethlaan",
  "Royal Army",
  "Mages Guild",
  "Divine Channel",
  "Kaethlaan Knights",
  "King's Court (Kaethlaan)",
  "King's Court",
]);

// ----- character mechanical layer (derived from cards.json) -----
export const CHAR_FLAGS: Record<string, string[]> = record(db.characters, (c) =>
  c.flags && c.flags.length ? c.flags : undefined,
);
export const CHAR_ENTRY: Record<string, string> = record(db.characters, (c) => c.entry);
export const TRANSFORM_COST: Record<string, TransformCost> = record(db.characters, (c) => c.transformCost);
export const CHAR_PLAY: Record<string, number> = record(db.characters, (c) => c.playPermissionMin);
export const CHAR_PLAY_GATE: Record<string, { lab?: boolean; plague?: boolean }> = record(
  db.characters,
  (c) => c.playGate,
);

// ----- item / event mechanical layer (derived from cards.json) -----
// EQUIP / FUEL / ONPLAY / TUTOR / persist etc. may live on either an item or an
// event row, so build these from the combined list.
export const EQUIP: Record<string, EquipEff> = record(itemsAndEvents, (c) => c.equip);
export const FUEL: Record<string, EquipEff> = record(itemsAndEvents, (c) => c.fuel);
export const ONPLAY: Record<string, EquipEff> = record(itemsAndEvents, (c) => c.onplay);
export const ITEM_TRANSFORM_COST: Record<string, ItemCost> = record(itemsAndEvents, (c) => c.itemTransformCost);
export const ITEM_BEARER_INCLUDES: Record<string, string> = record(itemsAndEvents, (c) => c.bearerInclude);
export const ITEM_BEARER_AFFIL: Record<string, string> = record(itemsAndEvents, (c) => c.bearerAffil);
export const ITEM_BEARER_ELEM: Record<string, string> = record(itemsAndEvents, (c) => c.bearerElem);
export const FUEL_GRANTED_CHAIN: Record<string, ChainDef> = record(itemsAndEvents, (c) => c.fuelGrantedChain);
export const TUTOR: Record<string, TutorSpec> = record(itemsAndEvents, (c) => c.tutor);

export const PERSIST: Set<string> = nameSet(itemsAndEvents, (c) => c.persist === true);
export const EQUIP_REQUIRES_WAR: Set<string> = nameSet(itemsAndEvents, (c) => c.requiresWar === true);
export const ITEM_ANY_TIER: Set<string> = nameSet(itemsAndEvents, (c) => c.anyTier === true);
export const DISILLUSION_SOURCES: Set<string> = nameSet(itemsAndEvents, (c) => c.disillusionSource === true);

/** Every equip + fuel item name (the §6 item universe). Derived, as before. */
export const T2ITEMS: Set<string> = new Set([...Object.keys(EQUIP), ...Object.keys(FUEL)]);
