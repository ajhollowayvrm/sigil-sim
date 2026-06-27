// loadCards — parse the canonical Box CSVs into typed engine cards.
//
// Stats / elements / tiers / affiliations / chains / printed text come straight
// from the CSV (never hand-transcribed). Mechanical interpretation (flags,
// transform costs, item effects) is layered in from effects-map.ts.

import type { Card, CardInfo, ChainDef, ItemEdge, TransformCost } from "../engine/types";
import {
  CHAR_FLAGS,
  CHAR_ENTRY,
  TRANSFORM_COST,
  CHAR_PLAY,
  CHAR_PLAY_GATE,
  EQUIP,
  FUEL,
  ONPLAY,
  PERSIST,
  EQUIP_REQUIRES_WAR,
  T2ITEMS,
  ITEM_TRANSFORM_COST,
  ITEM_BEARER_INCLUDES,
  ITEM_ANY_TIER,
} from "./effects-map";

// Card canon now lives in src/data/cards.json (the editable card DB seed). Each
// entry stores its raw CSV columns verbatim, so the row-parsing below is exactly
// as it was against the CSVs. Regenerate the seed via `npm run migrate-cards`.
import rawDb from "./cards.json";

type Row = Record<string, string>;
const cardDb = rawDb as unknown as { characters: Row[]; items: Row[]; events: Row[] };

export { EQUIP, FUEL, ONPLAY, PERSIST, EQUIP_REQUIRES_WAR, T2ITEMS };

const UNKNOWN = new Set(["", "??", "TBD", "tbd", "N/A"]);

/** CSV affiliations are inconsistent about a leading "The " — normalize it away
 *  so synergies (auras, chains, keeper reduction) match across cards. */
function normAffil(s: string): string {
  const t = s.trim();
  return t.startsWith("The ") ? t.slice(4) : t;
}

function splitAffils(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => normAffil(x))
    .filter((x) => x.length > 0);
}

function num(s: string | undefined): number {
  if (s == null || UNKNOWN.has(s.trim())) return NaN;
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : NaN;
}

function parseChain(row: Record<string, string>): ChainDef | null {
  const hasChain = (row.HasChain ?? "").trim() === "Y" || (row.ChainName ?? "").trim().length > 0;
  if (!hasChain) return null;
  const size = parseInt((row.ChainSize ?? "1").trim(), 10) || 1;
  const formula = row.ChainFormula ?? "";
  const extras = row.ChainExtras ?? "";
  const modMatch = formula.match(/\+\s*(\d+)/);
  const aoe = /all characters/i.test(formula) && /(x|×)\s*2/i.test(formula);
  return {
    name: (row.ChainName ?? "").trim(),
    affil: splitAffils(row.ChainAffiliation),
    size,
    mod: modMatch ? parseInt(modMatch[1], 10) : 0,
    active_only: /active zone only/i.test(extras),
    aoe,
  };
}

// ---- character DB ----

const characterRows = cardDb.characters;

const CHARS = new Map<string, Card>();
for (const row of characterRows) {
  const name = row.Name.trim();
  const tier = num(row.Tier);
  const hp = num(row.HP);
  const atk = num(row.ATK);
  const deff = num(row.DEF);
  const simulatable = [tier, hp, atk, deff].every((x) => Number.isFinite(x));
  const card: Card = {
    name,
    elem: (row.Element ?? "").trim(),
    tier,
    hp,
    atk,
    deff,
    affils: splitAffils(row.Affiliations),
    abil: [...(CHAR_FLAGS[name] ?? [])],
    upg: [],
    chain: parseChain(row),
    terminal: (row.Terminal ?? "").trim() === "Y",
    entry: CHAR_ENTRY[name],
    simulatable,
    abilityName: (row["Ability Name"] ?? "").trim() || undefined,
    abilityText: (row["Ability Text"] ?? "").trim() || undefined,
    transformIn: (row.TransformIn ?? "").trim() || undefined,
    flavor: (row.Flavor ?? "").trim() || undefined,
  };
  // The Ascended (§6): printed stats are variable (= T3 items consumed ×20), so the
  // CSV carries `??`. Model it as a base-0 body whose stats are filled in at transform
  // time (engine/transform.ts reads the `ascended_variable` flag). Now simulatable.
  if (name === "The Ascended") {
    card.hp = 0;
    card.atk = 0;
    card.deff = 0;
    card.simulatable = true;
    card.abil.push("ascended_variable");
  }
  CHARS.set(name, card);
}

// Build the transform graph: each destination's printed TransformIn names its
// origin; attach origin -> dest edges with the structured cost from effects-map.
const names = [...CHARS.keys()].sort((a, b) => b.length - a.length);
const transformOnly = new Set<string>(); // forms with a printed TransformIn (never hard-cast, §5.1)
for (const dest of CHARS.values()) {
  const ti = dest.transformIn;
  if (!ti || ti === "TBD") continue;
  transformOnly.add(dest.name);
  const origin = names.find((n) => ti.startsWith(n));
  if (!origin) continue;
  const o = CHARS.get(origin)!;
  if (!o.simulatable || !dest.simulatable) continue; // never instantiate TBD forms
  const cost: TransformCost = TRANSFORM_COST[dest.name] ?? {};
  o.upg.push([dest.name, cost]);
}

// Reverse of the transform graph: each destination's origin form(s) + the same
// printed cost — so a card can show where it transforms FROM, symmetric to climbSteps.
const REVERSE = new Map<string, [string, TransformCost][]>();
for (const o of CHARS.values()) {
  for (const [dest, cost] of o.upg) {
    const arr = REVERSE.get(dest) ?? [];
    arr.push([o.name, cost]);
    REVERSE.set(dest, arr);
  }
}

/** §5.1 — only T1 bases or standalones printing a play permission may be hard-cast. */
export function isHardCastable(name: string): boolean {
  const c = CHARS.get(name);
  if (!c || !c.simulatable) return false;
  if (transformOnly.has(name)) return false;
  return c.tier === 1 || name in CHAR_PLAY || name in CHAR_PLAY_GATE;
}

/** Minimum OTHER board characters required to hard-cast a permitted standalone. */
export function playPermissionMin(name: string): number | undefined {
  return CHAR_PLAY[name];
}

/** Play-gate (requires the O'Donner Research Lab and/or Plague in play) for a Plague body
 *  that has no T1 base, or undefined. The real deploy condition — not a free hard-cast. */
export function playGate(name: string): { lab?: boolean; plague?: boolean } | undefined {
  return CHAR_PLAY_GATE[name];
}

export function getCard(name: string): Card | undefined {
  return CHARS.get(name);
}

/** A character's next-step climb: the form and the (printed) conditions to reach it.
 *  Items are never a requirement (natural transforms); only real conditions appear. */
export interface ClimbStep {
  dest: string;
  needs: string[];
}

function describeCost(cost: TransformCost): string[] {
  const r: string[] = [];
  if (cost.need_war) r.push("a War in play");
  if (cost.kills) r.push(`${cost.kills} banked kill${cost.kills > 1 ? "s" : ""}`);
  if (cost.disillusion) r.push("a Disillusioned character");
  if (cost.taken_prisoner) r.push("captured during a War (Taken Prisoner)");
  if (cost.requires_arlia) r.push("you control an Arlia");
  return r;
}

/** What this character can transform into and what each step needs. */
export function climbSteps(name: string): ClimbStep[] {
  const c = CHARS.get(name);
  if (!c) return [];
  const steps: ClimbStep[] = c.upg.map(([dest, cost]) => ({ dest, needs: describeCost(cost) }));
  if (c.affils.includes("Wild") && c.tier === 1)
    steps.push({ dest: "any T2 Wild", needs: ["a Metamorphosis card (free — doesn't use your transformation)"] });
  return steps;
}

/** Where this character transforms FROM: its origin form(s) and the conditions
 *  printed on this card's transform path. The mirror image of climbSteps — T1
 *  bases return nothing, terminals return their lineage, middle forms return both. */
export interface FromStep {
  src: string;
  needs: string[];
}

export function transformsFrom(name: string): FromStep[] {
  const c = CHARS.get(name);
  if (!c) return [];
  const steps: FromStep[] = (REVERSE.get(name) ?? []).map(([src, cost]) => ({ src, needs: describeCost(cost) }));
  // Wilds carry no fixed lineage — a T2 Wild is reached from any T1 Wild via Metamorphosis.
  if (c.affils.includes("Wild") && c.tier === 2)
    steps.push({ src: "any T1 Wild", needs: ["a Metamorphosis card (free — doesn't use your transformation)"] });
  return steps;
}

export function isCharacter(name: string): boolean {
  return CHARS.has(name);
}

export function isItem(name: string): boolean {
  return name in EQUIP || name in FUEL || name in ONPLAY;
}

export { CHARS };

// ---- item / event browse info ----

const itemRows = cardDb.items;
const eventRows = cardDb.events;

// ---- item tier + forge graph (the item-transformation system) ----
// Tier is canon (CSV `Tier`); the forge topology is parsed from each item's printed
// `TransformIn` (origin item), with the cost supplied by effects-map — exactly the
// pattern used for character transforms.

const ITEM_TIER = new Map<string, number>();
const ITEM_UPGRADES = new Map<string, ItemEdge[]>(); // origin item -> [dest, cost][]

function tierNum(s: string | undefined): number {
  const n = parseInt((s ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

for (const row of itemRows) {
  const name = (row.Name ?? "").trim();
  if (name) ITEM_TIER.set(name, tierNum(row.Tier));
}
for (const row of itemRows) {
  const dest = (row.Name ?? "").trim();
  const origin = (row.TransformIn ?? "").trim();
  if (!dest || !origin) continue;
  if (!(dest in EQUIP) || !(origin in EQUIP)) continue; // only forge between real equips
  const cost = ITEM_TRANSFORM_COST[dest] ?? { items: 1 };
  const edges = ITEM_UPGRADES.get(origin) ?? [];
  edges.push([dest, cost]);
  ITEM_UPGRADES.set(origin, edges);
}

/** Tier of an item (defaults to 1 for anything unlisted). */
export function getItemTier(name: string): number {
  return ITEM_TIER.get(name) ?? 1;
}

/** Forge edges out of an attached item: which items it can be upgraded into, + cost. */
export function itemUpgrades(name: string): ItemEdge[] {
  return ITEM_UPGRADES.get(name) ?? [];
}

/** A signature item's required bearer name substring (e.g. "Kael"), or undefined. */
export function itemBearerInclude(name: string): string | undefined {
  return ITEM_BEARER_INCLUDES[name];
}

// ---- event tiers (for the character-tier gate on non-character cards) ----
const EVENT_TIER = new Map<string, number>();
for (const row of eventRows) {
  const name = (row.Name ?? "").trim();
  if (name) EVENT_TIER.set(name, tierNum(row.Tier));
}

/** Tier of an event or on-play card (defaults to 1). Used to gate it behind a
 *  controlled character of at least that tier. */
export function getEventTier(name: string): number {
  return EVENT_TIER.get(name) ?? ITEM_TIER.get(name) ?? 1;
}

/** True if the item ignores the tier gate (item tier ≤ bearer tier). */
export function itemAnyTier(name: string): boolean {
  return ITEM_ANY_TIER.has(name);
}

const CARD_INFO = new Map<string, CardInfo>();

for (const c of CHARS.values()) {
  CARD_INFO.set(c.name, {
    name: c.name,
    kind: "character",
    tier: Number.isFinite(c.tier) ? `T${c.tier}` : "TBD",
    elem: c.elem,
    affils: c.affils.join(", "),
    text: [c.abilityName ? `${c.abilityName} — ${c.abilityText ?? ""}` : c.abilityText, c.chain ? `Chain: ${c.chain.name}` : ""]
      .filter(Boolean)
      .join("\n"),
    flavor: c.flavor,
  });
}
for (const row of itemRows) {
  CARD_INFO.set(row.Name.trim(), {
    name: row.Name.trim(),
    kind: "item",
    tier: (row.Tier ?? "").trim() || undefined,
    type: (row.Type ?? "").trim() || undefined,
    text: (row.Text ?? "").trim() || undefined,
    flavor: (row.Flavor ?? "").trim() || undefined,
  });
}
for (const row of eventRows) {
  CARD_INFO.set(row.Name.trim(), {
    name: row.Name.trim(),
    kind: "event",
    tier: (row.Tier ?? "").trim() || undefined,
    type: (row.Type ?? "").trim() || undefined,
    text: (row.Text ?? "").trim() || undefined,
    flavor: (row.Flavor ?? "").trim() || undefined,
  });
}

export function getCardInfo(name: string): CardInfo | undefined {
  return CARD_INFO.get(name);
}

export function allCardInfos(): CardInfo[] {
  return [...CARD_INFO.values()];
}
