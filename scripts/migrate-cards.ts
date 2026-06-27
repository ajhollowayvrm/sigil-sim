// migrate-cards — one-time (re-runnable) generator of src/data/cards.json.
//
// Phase-1 of the campaign rewrite: the card canon moves out of the CSVs +
// hand-written effects-map.ts and into a single structured JSON file (which in
// turn seeds the DynamoDB card DB the Admin editor owns). This script is the
// bridge: it reads the *current* sources (the embedded CSVs for printed stats /
// text, and effects-map.ts for the mechanical interpretation) and emits the
// merged superset.
//
// Parity contract: each card stores its RAW CSV columns verbatim (so loadCards
// re-parses them exactly as before) PLUS the per-card mechanical objects. After
// this runs, effects-map.ts and loadCards.ts both read cards.json instead.
//
// Run: tsx scripts/migrate-cards.ts   (or `npm run migrate-cards`)

import Papa from "papaparse";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { charactersCsv, eventsCsv, itemsCsv } from "../src/data/csv-data";
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
  ITEM_TRANSFORM_COST,
  ITEM_BEARER_INCLUDES,
  ITEM_BEARER_AFFIL,
  ITEM_BEARER_ELEM,
  ITEM_ANY_TIER,
  FUEL_GRANTED_CHAIN,
  TUTOR,
  DISILLUSION_SOURCES,
} from "../src/data/effects-map";

type Row = Record<string, string>;

function parseRows(csv: string): Row[] {
  const out = Papa.parse<Row>(csv, { header: true, skipEmptyLines: true });
  return out.data.filter((r) => r && (r.Name ?? "").trim().length > 0);
}

/** Drop undefined/empty mechanical keys so the JSON stays clean & diffable. */
function compact<T extends Record<string, unknown>>(o: T): Partial<T> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    r[k] = v;
  }
  return r as Partial<T>;
}

const charRows = parseRows(charactersCsv);
const itemRows = parseRows(itemsCsv);
const eventRows = parseRows(eventsCsv);

const characters = charRows.map((row) => {
  const name = row.Name.trim();
  return {
    ...row,
    ...compact({
      flags: CHAR_FLAGS[name] ?? [],
      entry: CHAR_ENTRY[name],
      transformCost: TRANSFORM_COST[name],
      playPermissionMin: CHAR_PLAY[name],
      playGate: CHAR_PLAY_GATE[name],
    }),
  };
});

const items = itemRows.map((row) => {
  const name = row.Name.trim();
  return {
    ...row,
    ...compact({
      equip: EQUIP[name],
      fuel: FUEL[name],
      onplay: ONPLAY[name],
      persist: PERSIST.has(name) ? true : undefined,
      bearerInclude: ITEM_BEARER_INCLUDES[name],
      bearerAffil: ITEM_BEARER_AFFIL[name],
      bearerElem: ITEM_BEARER_ELEM[name],
      itemTransformCost: ITEM_TRANSFORM_COST[name],
      anyTier: ITEM_ANY_TIER.has(name) ? true : undefined,
      requiresWar: EQUIP_REQUIRES_WAR.has(name) ? true : undefined,
      fuelGrantedChain: FUEL_GRANTED_CHAIN[name],
      tutor: TUTOR[name],
      disillusionSource: DISILLUSION_SOURCES.has(name) ? true : undefined,
    }),
  };
});

const events = eventRows.map((row) => {
  const name = row.Name.trim();
  return {
    ...row,
    ...compact({
      equip: EQUIP[name],
      fuel: FUEL[name],
      onplay: ONPLAY[name],
      persist: PERSIST.has(name) ? true : undefined,
      itemTransformCost: ITEM_TRANSFORM_COST[name],
      fuelGrantedChain: FUEL_GRANTED_CHAIN[name],
      tutor: TUTOR[name],
      disillusionSource: DISILLUSION_SOURCES.has(name) ? true : undefined,
    }),
  };
});

const db = { version: 1, characters, items, events };

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, "..", "src", "data", "cards.json");
writeFileSync(dest, JSON.stringify(db, null, 2) + "\n");
console.log(
  `Wrote ${dest}\n  characters: ${characters.length}  items: ${items.length}  events: ${events.length}`,
);
