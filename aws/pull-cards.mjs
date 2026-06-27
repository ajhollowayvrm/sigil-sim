// Pull the live card DB out of DynamoDB into src/data/cards.json, so admin Card
// Editor changes can be baked into the engine bundle and shipped via a redeploy.
//
// Run locally (needs AWS creds): node aws/pull-cards.mjs
// Then commit src/data/cards.json and push (Pages rebuilds the engine bundle).

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const TABLE = process.env.TABLE_NAME || "sigil";
const region = process.env.AWS_REGION || "us-west-2";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: "CARDS", sk: "DB" } }));
if (!r.Item?.db) {
  console.error("No CARDS#DB found — seed it first (node aws/seed.mjs).");
  process.exit(1);
}
const { version, characters, items, events } = r.Item.db;
const out = { version: version ?? 1, characters, items, events };
const dest = join(here, "..", "src", "data", "cards.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(
  `Wrote ${dest}\n  characters: ${characters.length}  items: ${items.length}  events: ${events.length}\nCommit + push to apply to gameplay.`,
);
