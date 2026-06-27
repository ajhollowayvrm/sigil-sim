// Seed the DynamoDB "sigil" table with the card DB (from src/data/cards.json)
// and a starter set of themed packs (auto-built from card affiliations — the
// Admin PackEditor can tune them later).
//
// Run locally (needs AWS creds, e.g. `aws login`, and the dev SDK deps):
//   npm install          # pulls @aws-sdk/* devDeps
//   node aws/seed.mjs                 # seed cards + packs
//   node aws/seed.mjs --packs-only    # re-seed only the packs
//   node aws/seed.mjs --cards-only    # re-seed only the card DB
//
// Idempotent: each run overwrites CARDS#DB / PACKS#DB.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const TABLE = process.env.TABLE_NAME || "sigil";
const region = process.env.AWS_REGION || "us-west-2";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const args = process.argv.slice(2);
const only = args.includes("--packs-only") ? "packs" : args.includes("--cards-only") ? "cards" : "both";

const cardsDb = JSON.parse(readFileSync(join(here, "..", "src", "data", "cards.json"), "utf8"));

// Theme → which affiliations / name keywords pull a card into the pack pool.
// Pools are auto-derived; weights favor lower tiers (commons fall more often).
const THEMES = [
  { id: "kaethlaan", name: "The Kingdom of Kaethlaan", price: 100, affils: ["Kaethlaan", "Royal Army", "Mages Guild", "Kaethlaan Knights", "King's Court"] },
  { id: "war", name: "War", price: 100, affils: ["Destined", "Faithless"], keywords: ["war", "soldier", "conqueror", "kael", "illyego"] },
  { id: "divine-channel", name: "The Divine Channel", price: 120, affils: ["Divine Channel", "Ascended", "Wandering"] },
  { id: "plague", name: "Plague", price: 120, affils: ["Plagued", "O'Donner Research"], keywords: ["plague", "experiment", "seremin"] },
  { id: "research-lab", name: "Research Lab", price: 120, affils: ["O'Donner Research"], keywords: ["experiment", "venner", "poultrain", "o'donner"] },
  { id: "channelian-church", name: "The Channelian Church", price: 120, affils: ["Channelian Church", "Divine Channel"], keywords: ["hierophant", "church", "faechious"] },
  { id: "goblin", name: "The Goblin Warren", price: 90, affils: ["Goblin"], keywords: ["goblin", "horde", "warband"] },
  { id: "wild", name: "The Untamed Wild", price: 90, affils: ["Wild"], keywords: ["wild", "primal", "fusion"] },
];

const tierNum = (t) => parseInt(String(t || "").replace(/[^0-9]/g, ""), 10) || 1;
const weightForTier = (t) => ({ 1: 8, 2: 4, 3: 2, 4: 1 }[tierNum(t)] || 1);

function buildPool(theme) {
  const all = [
    ...cardsDb.characters.map((c) => ({ id: c.Name, affils: c.Affiliations || "", tier: c.Tier })),
    ...cardsDb.items.map((c) => ({ id: c.Name, affils: "", tier: c.Tier, text: `${c.Name} ${c.Type || ""}` })),
    ...cardsDb.events.map((c) => ({ id: c.Name, affils: "", tier: c.Tier, text: `${c.Name} ${c.Type || ""}` })),
  ];
  const kw = (theme.keywords || []).map((k) => k.toLowerCase());
  const pool = [];
  for (const c of all) {
    const hay = `${c.id} ${c.affils} ${c.text || ""}`.toLowerCase();
    const byAffil = (theme.affils || []).some((a) => (c.affils || "").toLowerCase().includes(a.toLowerCase()));
    const byKw = kw.some((k) => hay.includes(k));
    if (byAffil || byKw) pool.push({ cardId: c.id, weight: weightForTier(c.tier) });
  }
  return pool;
}

const packs = THEMES.map((t) => {
  const cardPool = buildPool(t);
  return { id: t.id, name: t.name, theme: t.id, price: t.price, cardsPerPack: 5, cardPool };
}).filter((p) => p.cardPool.length > 0);

async function main() {
  if (only !== "packs") {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: { pk: "CARDS", sk: "DB", db: { ...cardsDb, updatedAt: 0 } } }));
    console.log(`seeded CARDS#DB — ${cardsDb.characters.length} chars / ${cardsDb.items.length} items / ${cardsDb.events.length} events`);
  }
  if (only !== "cards") {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: { pk: "PACKS", sk: "DB", db: { packs, updatedAt: 0 } } }));
    console.log(`seeded PACKS#DB — ${packs.length} packs:`);
    for (const p of packs) console.log(`  ${p.id.padEnd(18)} ${p.cardPool.length} cards  ${p.price}c`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
