// loadCards — parse the canonical Box CSVs into typed engine cards.
//
// Stats / elements / tiers / affiliations / chains / printed text come straight
// from the CSV (never hand-transcribed). Mechanical interpretation (flags,
// transform costs, item effects) is layered in from effects-map.ts.

import Papa from "papaparse";
import type { Card, CardInfo, ChainDef, TransformCost } from "../engine/types";
import {
  CHAR_FLAGS,
  CHAR_ENTRY,
  TRANSFORM_COST,
  CHAR_PLAY,
  EQUIP,
  FUEL,
  ONPLAY,
  PERSIST,
  EQUIP_REQUIRES_WAR,
  T2ITEMS,
} from "./effects-map";

// CSV text is embedded by scripts/embed-csv.ts so both Vite and the tsx CLIs can
// import it. The docs/*.csv files remain the source of truth — run `npm run embed`.
import { charactersCsv, eventsCsv, itemsCsv } from "./csv-data";

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

function parseRows(csv: string): Record<string, string>[] {
  const out = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return out.data.filter((r) => r && (r.Name ?? "").trim().length > 0);
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

const characterRows = parseRows(charactersCsv);

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

/** §5.1 — only T1 bases or standalones printing a play permission may be hard-cast. */
export function isHardCastable(name: string): boolean {
  const c = CHARS.get(name);
  if (!c || !c.simulatable) return false;
  if (transformOnly.has(name)) return false;
  return c.tier === 1 || name in CHAR_PLAY;
}

/** Minimum OTHER board characters required to hard-cast a permitted standalone. */
export function playPermissionMin(name: string): number | undefined {
  return CHAR_PLAY[name];
}

export function getCard(name: string): Card | undefined {
  return CHARS.get(name);
}

export function isCharacter(name: string): boolean {
  return CHARS.has(name);
}

export function isItem(name: string): boolean {
  return name in EQUIP || name in FUEL || name in ONPLAY;
}

export { CHARS };

// ---- item / event browse info ----

const itemRows = parseRows(itemsCsv);
const eventRows = parseRows(eventsCsv);

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
