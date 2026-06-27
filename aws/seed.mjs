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

// Five broad themed packs. Each pulls its FACTION cards (by affiliation / name
// keyword) PLUS a shared pool of NEUTRAL staples (generic gear & events that
// belong to no faction) at a lower weight — so every pack is sizeable, faction
// identity still dominates the pulls, and no card is unobtainable.
const FACTIONS = [
  {
    id: "kaethlaan",
    name: "The Kingdom of Kaethlaan",
    price: 100,
    kw: ["kaethlaan", "royal army", "mages guild", "kaethlaan knights", "king's court", "destined", "trainee",
      "honathan", "arlia", "kael", "thomas", "strango", "knight", "recruit", "mage", "swiftblade", "squire",
      "banner of the realm", "reinforce", "war college", "close the gates", "conscription", "shield wall"],
  },
  {
    id: "divine-channel",
    name: "The Divine Channel",
    price: 100,
    kw: ["divine channel", "ascended", "wandering", "channelian church", "hierophant", "channel", "faechious",
      "acolyte", "disillusion", "crisis of faith", "cast out", "long road", "open channel", "seeping doubt", "calyx"],
  },
  {
    id: "war",
    name: "The Crucible of War",
    price: 100,
    kw: ["faithless", "illyego", "war", "soldier", "conqueror", "prisoner", "captured", "warmonger", "berserker",
      "reaver", "warlord", "veteran", "broken march", "rally", "crusade", "truce", "silent", "bred for war", "killer", "runaway", "shadow"],
  },
  {
    id: "plague",
    name: "Plague & the Research Lab",
    price: 100,
    kw: ["plagued", "o'donner", "plague", "experiment", "seremin", "venner", "poultrain", "sick", "medical",
      "research", "patient", "stage 2", "grant proposal", "craghide"],
  },
  {
    id: "wild",
    name: "The Wild & the Warren",
    price: 100,
    kw: ["wild", "primal", "fusion", "goblin", "horde", "warband", "warren", "krakos", "crator", "bogfang",
      "murlifect", "embermaw", "skirrl", "tidewretch", "gravecreep", "metamorphosis", "stoneback", "thestral",
      "barangrang", "tidewhisk", "glimmermoth", "pyrnit", "sootcrawler", "galewing", "cinderpel", "lor'oak"],
  },
];

const tierNum = (t) => parseInt(String(t || "").replace(/[^0-9]/g, ""), 10) || 1;
const factionWeight = (t) => ({ 1: 8, 2: 4, 3: 2, 4: 1 }[tierNum(t)] || 1);
const neutralWeight = (t) => ({ 1: 3, 2: 2, 3: 1, 4: 1 }[tierNum(t)] || 1);

const allCards = [
  ...cardsDb.characters.map((c) => ({ id: c.Name, hay: `${c.Name} ${c.Affiliations || ""}`.toLowerCase(), tier: c.Tier })),
  ...cardsDb.items.map((c) => ({ id: c.Name, hay: `${c.Name} ${c.Type || ""}`.toLowerCase(), tier: c.Tier })),
  ...cardsDb.events.map((c) => ({ id: c.Name, hay: `${c.Name} ${c.Type || ""}`.toLowerCase(), tier: c.Tier })),
];

const matches = (c, f) => f.kw.some((k) => c.hay.includes(k));
// Neutral = any card that belongs to no faction (generic gear & events).
const neutral = allCards.filter((c) => !FACTIONS.some((f) => matches(c, f)));

const packs = FACTIONS.map((f) => {
  const faction = allCards.filter((c) => matches(c, f));
  const cardPool = [
    ...faction.map((c) => ({ cardId: c.id, weight: factionWeight(c.tier) })),
    ...neutral.map((c) => ({ cardId: c.id, weight: neutralWeight(c.tier) })),
  ];
  return { id: f.id, name: f.name, theme: f.id, price: f.price, cardsPerPack: 5, cardPool, _faction: faction.length };
});

async function main() {
  if (only !== "packs") {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: { pk: "CARDS", sk: "DB", db: { ...cardsDb, updatedAt: 0 } } }));
    console.log(`seeded CARDS#DB — ${cardsDb.characters.length} chars / ${cardsDb.items.length} items / ${cardsDb.events.length} events`);
  }
  if (only !== "cards") {
    // strip the _faction debug field before storing
    const stored = packs.map(({ _faction, ...p }) => p); // eslint-disable-line no-unused-vars
    await ddb.send(new PutCommand({ TableName: TABLE, Item: { pk: "PACKS", sk: "DB", db: { packs: stored, updatedAt: 0 } } }));
    console.log(`seeded PACKS#DB — ${packs.length} packs (${neutral.length} shared neutral staples):`);
    for (const p of packs) console.log(`  ${p.id.padEnd(16)} ${String(p.cardPool.length).padStart(3)} cards (${p._faction} faction + ${neutral.length} neutral)  ${p.price}c`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
